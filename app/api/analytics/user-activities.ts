import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

// Define the response type
interface ActivityResponse {
  activities: Activity[];
  totalCount: number;
  stats: {
    totalDefects: number;
    totalReturnQcItems: number;
    totalAssemblies: number;
    totalBatches: number;
    totalActivities: number;
  };
}

// Define activity interface
interface Activity {
  id: string;
  type: 'defect' | 'returnqc' | 'assembly' | 'batch';
  title: string;
  description: string;
  timestamp: Date | string;
  metadata: Record<string, unknown>;
}

export async function GET(req: NextRequest): Promise<NextResponse<ActivityResponse | { error: string }>> {
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
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    // Initialize collections for activities and stats
    let defectActivities: Activity[] = [];
    let returnQcActivities: Activity[] = [];
    let assemblyActivities: Activity[] = [];
    let batchActivities: Activity[] = [];

    let totalDefects = 0;
    let totalReturnQcItems = 0;
    let totalAssemblies = 0;
    let totalBatches = 0;

    // Get user from database
    let user = null;
    try {
      user = await prisma.user.findUnique({
        where: {
          userId: userId
        }
      });

      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
    } catch (error) {
      console.error("Error fetching user:", error);
      return NextResponse.json({ error: "Failed to authenticate user" }, { status: 500 });
    }

    // Get activities with try/catch for each query to handle potential errors

    // 1. Get defects reported by user
    try {
      const defects = await prisma.defect.findMany({
        where: {
          reportedById: user.id
        },
        include: {
          component: true
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: limit
      });

      defectActivities = defects.map(defect => ({
        id: `defect-${defect.id}`,
        type: 'defect',
        title: `Reported defect in ${defect.component?.name || 'component'}`,
        description: `Severity: ${defect.severity || 'unknown'}`,
        timestamp: defect.createdAt,
        metadata: {
          componentId: defect.componentId,
          componentName: defect.component?.name || 'Unknown',
          severity: defect.severity
        }
      }));

      // Get total count
      totalDefects = await prisma.defect.count({
        where: {
          reportedById: user.id
        }
      });
    } catch (error) {
      console.error("Error fetching defects:", error);
      // Continue with empty array instead of failing
    }

    // 2. Get return QC items processed by user
    try {
      const returnQCs = await prisma.returnQC.findMany({
        where: {
          qcById: user.id
        },
        include: {
          return: {
            include: {
              product: true
            }
          },
          defects: true
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: limit
      });

      returnQcActivities = returnQCs.map(item => ({
        id: `returnqc-${item.id}`,
        type: 'returnqc',
        title: `Processed return for ${item.return?.product?.name || 'Unknown Product'}`,
        description: `Found ${item.defects?.length || 0} defect(s)`,
        timestamp: item.createdAt,
        metadata: {
          returnId: item.returnId,
          productId: item.return?.productId,
          productName: item.return?.product?.name,
          defectCount: item.defects?.length || 0,
          status: item.status
        }
      }));

      // Get total count
      totalReturnQcItems = await prisma.returnQC.count({
        where: {
          qcById: user.id
        }
      });
    } catch (error) {
      console.error("Error fetching return QC items:", error);
      // Continue with empty array instead of failing
    }

    // 3. Get assemblies created by user
    try {
      const assemblies = await prisma.assembly.findMany({
        where: {
          assembledById: user.id
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: limit
      });

      assemblyActivities = assemblies.map(assembly => ({
        id: `assembly-${assembly.id}`,
        type: 'assembly',
        title: `Created assembly ${assembly.name || 'unnamed'}`,
        description: `Serial: ${assembly.serialNumber || 'N/A'}`,
        timestamp: assembly.createdAt,
        metadata: {
          assemblyId: assembly.id,
          assemblyName: assembly.name || '',
          serialNumber: assembly.serialNumber || '',
          status: assembly.status
        }
      }));

      // Get total count
      totalAssemblies = await prisma.assembly.count({
        where: {
          assembledById: user.id
        }
      });
    } catch (error) {
      console.error("Error fetching assemblies:", error);
      // Continue with empty array instead of failing
    }

    // 4. Get stock batches related to recent activities
    try {
      // Since StockBatch doesn't have a direct user relationship,
      // we'll filter the batches based on related activities performed by this user

      // First get assemblies that used components from batches
      const userAssemblyComponentBatches = await prisma.assemblyComponentBatch.findMany({
        where: {
          assembly: {
            assembledById: user.id
          }
        },
        select: {
          stockBatchId: true
        },
        distinct: ['stockBatchId']
      });

      // Get batch IDs from assemblies
      const batchIdsFromAssemblies = userAssemblyComponentBatches.map(acb => acb.stockBatchId);

      // Get batches from ReturnQCDefect where the user performed QC
      const userReturnQCDefectBatches = await prisma.returnQCDefect.findMany({
        where: {
          qc: {
            qcById: user.id
          }
        },
        select: {
          batchId: true
        },
        distinct: ['batchId']
      });

      // Get batch IDs from return QCs
      const batchIdsFromReturnQCs = userReturnQCDefectBatches.map(rqcd => rqcd.batchId);

      // Combine all batch IDs
      const userRelatedBatchIds = [...new Set([...batchIdsFromAssemblies, ...batchIdsFromReturnQCs])];

      // Query for batches with these IDs
      const stockBatches = await prisma.stockBatch.findMany({
        where: {
          id: {
            in: userRelatedBatchIds
          }
        },
        include: {
          component: true,
          vendor: true
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: limit
      });

      batchActivities = stockBatches.map(batch => ({
        id: `batch-${batch.id}`,
        type: 'batch',
        title: `Added ${batch.initialQuantity || 0} ${batch.component?.name || 'items'}`,
        description: `From vendor: ${batch.vendor?.name || 'unknown'}`,
        timestamp: batch.createdAt,
        metadata: {
          batchId: batch.id,
          componentId: batch.componentId,
          componentName: batch.component?.name || 'Unknown',
          vendorId: batch.vendorId,
          vendorName: batch.vendor?.name || 'Unknown',
          quantity: batch.initialQuantity
        }
      }));

      // Get total count of batches related to this user
      totalBatches = userRelatedBatchIds.length;
    } catch (error) {
      console.error("Error fetching stock batches:", error);
      // Continue with empty array instead of failing
    }

    // Combine all activities
    const allActivities = [
      ...defectActivities,
      ...returnQcActivities,
      ...assemblyActivities,
      ...batchActivities
    ]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);

    // Calculate total number of activities
    const totalActivities = totalDefects + totalReturnQcItems + totalAssemblies + totalBatches;

    return NextResponse.json({
      activities: allActivities,
      totalCount: allActivities.length,
      stats: {
        totalDefects,
        totalReturnQcItems,
        totalAssemblies,
        totalBatches,
        totalActivities
      }
    });

  } catch (error) {
    console.error("Error in user activities endpoint:", error);
    return NextResponse.json(
      { error: "Failed to fetch activities: " + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}