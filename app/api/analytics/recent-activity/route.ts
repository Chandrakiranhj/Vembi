import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuth } from "@clerk/nextjs/server";

// Define types for the activity data
interface DefectType {
  id: string;
  severity: string;
  type: string;
  createdAt: Date;
  componentId: string;
  component: {
    name: string;
  };
}

interface ReturnQCItemType {
  id: string;
  status: string;
  processedAt: Date;
  productId: string;
  product: {
    name: string;
  };
  defects: unknown[];
}

interface AssemblyType {
  id: string;
  name: string;
  serialNumber: string;
  status: string;
  createdAt: Date;
}

interface BatchType {
  id: string;
  initialQuantity: number;
  createdAt: Date;
  componentId: string;
  vendorId: string;
  component: {
    name: string;
  };
  vendor: {
    name: string;
  };
}

export async function GET(req: NextRequest) {
  try {
    // Get authenticated user ID
    const auth = getAuth(req);
    const userId = auth.userId;
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Extract query parameters
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    
    // Get user from database using raw query to avoid schema issues
    const users = await prisma.$queryRaw`
      SELECT id FROM "User" WHERE "userId" = ${userId} LIMIT 1
    `;
    
    // Check if user exists
    const userArray = users as { id: string }[];
    if (!userArray || userArray.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userDbId = userArray[0].id;

    // Fetch all user activities through raw queries to avoid schema typing issues
    
    // Defects created by user
    const defects = await prisma.$queryRaw`
      SELECT d.id, d.severity, d.type, d."createdAt", d."componentId", c.name as "componentName"
      FROM "Defect" d
      JOIN "Component" c ON d."componentId" = c.id
      WHERE d."createdById" = ${userDbId}
      ORDER BY d."createdAt" DESC
      LIMIT ${limit}
    `;
    
    // Return QC items processed by user
    const returnQcItems = await prisma.$queryRaw`
      SELECT r.id, r.status, r."processedAt", r."productId", p.name as "productName",
        (SELECT COUNT(*) FROM "ReturnQCDefect" WHERE "returnQCItemId" = r.id) as "defectCount"
      FROM "ReturnQCItem" r
      JOIN "Product" p ON r."productId" = p.id
      WHERE r."processedById" = ${userDbId}
      ORDER BY r."processedAt" DESC
      LIMIT ${limit}
    `;
    
    // Assemblies created by user
    const assemblies = await prisma.$queryRaw`
      SELECT id, name, "serialNumber", status, "createdAt"
      FROM "Assembly"
      WHERE "createdById" = ${userDbId}
      ORDER BY "createdAt" DESC
      LIMIT ${limit}
    `;
    
    // Stock batches added by user
    const batches = await prisma.$queryRaw`
      SELECT b.id, b."initialQuantity", b."createdAt", b."componentId", c.name as "componentName",
        b."vendorId", v.name as "vendorName"
      FROM "StockBatch" b
      JOIN "Component" c ON b."componentId" = c.id
      JOIN "Vendor" v ON b."vendorId" = v.id
      WHERE b."createdById" = ${userDbId}
      ORDER BY b."createdAt" DESC
      LIMIT ${limit}
    `;

    // Format results into activity items
    const defectActivities = (defects as any[]).map((defect) => ({
      id: `defect-${defect.id}`,
      type: 'defect',
      title: `Reported defect in ${defect.componentName}`,
      description: `Severity: ${defect.severity}`,
      timestamp: defect.createdAt,
      metadata: {
        componentId: defect.componentId,
        componentName: defect.componentName,
        severity: defect.severity,
        defectType: defect.type,
      }
    }));

    const returnQcActivities = (returnQcItems as any[]).map((item) => ({
      id: `returnqc-${item.id}`,
      type: 'returnqc',
      title: `Processed return for ${item.productName}`,
      description: `Found ${item.defectCount} defects`,
      timestamp: item.processedAt,
      metadata: {
        productId: item.productId,
        productName: item.productName,
        defectCount: item.defectCount,
        returnStatus: item.status
      }
    }));

    const assemblyActivities = (assemblies as any[]).map((assembly) => ({
      id: `assembly-${assembly.id}`,
      type: 'assembly',
      title: `Created assembly ${assembly.name}`,
      description: `Serial: ${assembly.serialNumber}`,
      timestamp: assembly.createdAt,
      metadata: {
        assemblyId: assembly.id,
        assemblyName: assembly.name,
        serialNumber: assembly.serialNumber,
        status: assembly.status
      }
    }));

    const batchActivities = (batches as any[]).map((batch) => ({
      id: `batch-${batch.id}`,
      type: 'batch',
      title: `Added ${batch.initialQuantity} ${batch.componentName}`,
      description: `From vendor: ${batch.vendorName}`,
      timestamp: batch.createdAt,
      metadata: {
        batchId: batch.id,
        componentId: batch.componentId,
        componentName: batch.componentName,
        vendorId: batch.vendorId,
        vendorName: batch.vendorName,
        quantity: batch.initialQuantity
      }
    }));

    // Combine all activities, sort by timestamp (newest first), and limit to requested count
    const allActivities = [
      ...defectActivities, 
      ...returnQcActivities, 
      ...assemblyActivities,
      ...batchActivities
    ]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);

    // Calculate total counts for stats
    const totalDefects = (defects as any[]).length;
    const totalReturnQcItems = (returnQcItems as any[]).length;
    const totalAssemblies = (assemblies as any[]).length;
    const totalBatches = (batches as any[]).length;

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
    console.error("Error fetching user recent activities:", error);
    return NextResponse.json(
      { error: "Failed to fetch recent activities" },
      { status: 500 }
    );
  }
} 