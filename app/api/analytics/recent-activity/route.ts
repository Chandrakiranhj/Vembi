import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    // Get authenticated user ID
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    const userId = authUser?.id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Extract query parameters
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "10", 10);

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { userId: userId }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Fetch activities using Prisma Client (safer than raw SQL)

    // 1. Defects reported by user
    const defects = await prisma.defect.findMany({
      where: { reportedById: user.id },
      include: { component: true },
      orderBy: { createdAt: 'desc' },
      take: limit
    });

    // 2. Return QC items processed by user
    const returnQcItems = await prisma.returnQC.findMany({
      where: { qcById: user.id },
      include: {
        return: { include: { product: true } },
        defects: true
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    });

    // 3. Assemblies created by user
    const assemblies = await prisma.assembly.findMany({
      where: { assembledById: user.id },
      orderBy: { createdAt: 'desc' },
      take: limit
    });

    // 4. Stock batches - Omitted as there is no createdById on StockBatch
    const batches: any[] = [];

    // Format results
    const defectActivities = defects.map((defect) => ({
      id: `defect-${defect.id}`,
      type: 'defect',
      title: `Reported defect in ${defect.component?.name || 'Unknown Component'}`,
      description: `Severity: ${defect.severity}`,
      timestamp: defect.createdAt,
      metadata: {
        componentId: defect.componentId,
        componentName: defect.component?.name,
        severity: defect.severity,
        defectType: defect.status, // mapped from type if available, else status
      }
    }));

    const returnQcActivities = returnQcItems.map((item) => ({
      id: `returnqc-${item.id}`,
      type: 'returnqc',
      title: `Processed return for ${item.return?.product?.name || 'Unknown Product'}`,
      description: `Found ${item.defects.length} defects`,
      timestamp: item.createdAt, // using createdAt as processedAt
      metadata: {
        productId: item.return?.productId,
        productName: item.return?.product?.name,
        defectCount: item.defects.length,
        returnStatus: item.status
      }
    }));

    const assemblyActivities = assemblies.map((assembly) => ({
      id: `assembly-${assembly.id}`,
      type: 'assembly',
      title: `Created assembly ${assembly.name || 'Unnamed'}`,
      description: `Serial: ${assembly.serialNumber}`,
      timestamp: assembly.createdAt,
      metadata: {
        assemblyId: assembly.id,
        assemblyName: assembly.name,
        serialNumber: assembly.serialNumber,
        status: assembly.status
      }
    }));

    const batchActivities = batches.map((batch) => ({
      id: `batch-${batch.id}`,
      type: 'batch',
      title: `Added batch`,
      description: `Quantity: ${batch.initialQuantity}`,
      timestamp: batch.createdAt,
      metadata: {}
    }));

    // Combine and sort
    const allActivities = [
      ...defectActivities,
      ...returnQcActivities,
      ...assemblyActivities,
      ...batchActivities
    ]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);

    // Stats
    const totalDefects = defects.length; // This is just the fetched count, ideally should be count() query
    const totalReturnQcItems = returnQcItems.length;
    const totalAssemblies = assemblies.length;
    const totalBatches = batches.length;

    return NextResponse.json({
      activities: allActivities,
      totalCount: allActivities.length,
      stats: {
        totalDefects,
        totalReturnQcItems,
        totalAssemblies,
        totalBatches,
        totalActivities: totalDefects + totalReturnQcItems + totalAssemblies + totalBatches
      }
    });

  } catch (error) {
    console.error("Error fetching recent activities:", error);
    return NextResponse.json(
      { error: "Failed to fetch recent activities" },
      { status: 500 }
    );
  }
}