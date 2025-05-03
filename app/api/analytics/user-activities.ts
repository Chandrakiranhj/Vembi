import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuth } from "@clerk/nextjs/server";

// Define activity interface
interface Activity {
  id: string;
  type: 'defect' | 'returnqc' | 'assembly' | 'batch';
  title: string;
  description: string;
  timestamp: Date | string;
  metadata: Record<string, unknown>;
}

// Define stats interface
interface ActivityStats {
  totalDefects: number;
  totalReturnQcItems: number;
  totalAssemblies: number;
  totalBatches: number;
  totalActivities: number;
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
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    
    // Define empty collections for activities and statistics
    let defectActivities: Activity[] = [];
    let returnQcActivities: Activity[] = [];
    let assemblyActivities: Activity[] = [];
    let batchActivities: Activity[] = [];
    
    let totalDefects = 0;
    let totalReturnQcItems = 0;
    let totalAssemblies = 0;
    let totalBatches = 0;
    
    try {
      // First, get the user's database ID using generic method
      // We're being careful here since we don't know the exact schema
      const users = await prisma.$queryRaw`
        SELECT id FROM User WHERE userId = ${userId} LIMIT 1
      `;
      
      const userArray = Array.isArray(users) ? users : [];
      if (userArray.length === 0) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
      
      const userDbId = userArray[0].id;
      
      // Use try/catch for each query to handle missing tables

      // 1. Try to get defects
      try {
        // First try to count
        const defectsCount = await prisma.$queryRaw`
          SELECT COUNT(*) as count FROM Defect WHERE reportedById = ${userDbId}
        `;
        
        if (Array.isArray(defectsCount) && defectsCount.length > 0) {
          totalDefects = Number(defectsCount[0].count || 0);
        }
        
        // Then get recent items
        const defects = await prisma.$queryRaw`
          SELECT 
            d.id, 
            d.severity, 
            d.createdAt, 
            d.componentId, 
            c.name as componentName
          FROM Defect d
          JOIN Component c ON d.componentId = c.id
          WHERE d.reportedById = ${userDbId}
          ORDER BY d.createdAt DESC
          LIMIT ${limit}
        `;
        
        if (Array.isArray(defects)) {
          defectActivities = defects.map((defect: any) => ({
            id: `defect-${defect.id}`,
            type: 'defect',
            title: `Reported defect in ${defect.componentName || 'component'}`,
            description: `Severity: ${defect.severity || 'unknown'}`,
            timestamp: defect.createdAt,
            metadata: {
              componentId: defect.componentId,
              componentName: defect.componentName,
              severity: defect.severity
            }
          }));
        }
      } catch (error) {
        console.log("Error fetching defects:", error);
        // Silently continue if this table doesn't exist
      }
      
      // 2. Try to get return QC items
      try {
        // First try to count
        const returnsCount = await prisma.$queryRaw`
          SELECT COUNT(*) as count FROM ReturnQC WHERE qcById = ${userDbId}
        `;
        
        if (Array.isArray(returnsCount) && returnsCount.length > 0) {
          totalReturnQcItems = Number(returnsCount[0].count || 0);
        }
        
        // Then get recent items
        const returns = await prisma.$queryRaw`
          SELECT 
            r.id, 
            r.status, 
            r.createdAt, 
            ret.productId,
            p.name as productName,
            (SELECT COUNT(*) FROM ReturnQCDefect WHERE qcId = r.id) as defectCount
          FROM ReturnQC r
          JOIN Return ret ON r.returnId = ret.id
          LEFT JOIN Product p ON ret.productId = p.id
          WHERE r.qcById = ${userDbId}
          ORDER BY r.createdAt DESC
          LIMIT ${limit}
        `;
        
        if (Array.isArray(returns)) {
          returnQcActivities = returns.map((item: any) => ({
            id: `returnqc-${item.id}`,
            type: 'returnqc',
            title: `Processed return for ${item.productName || 'Unknown Product'}`,
            description: `Found ${item.defectCount || 0} defect(s)`,
            timestamp: item.createdAt,
            metadata: {
              productId: item.productId,
              productName: item.productName,
              defectCount: item.defectCount,
              returnStatus: item.status
            }
          }));
        }
      } catch (error) {
        console.log("Error fetching returns:", error);
        // Silently continue if this table doesn't exist
      }
      
      // 3. Try to get assemblies
      try {
        // First try to count
        const assembliesCount = await prisma.$queryRaw`
          SELECT COUNT(*) as count FROM Assembly WHERE assembledById = ${userDbId}
        `;
        
        if (Array.isArray(assembliesCount) && assembliesCount.length > 0) {
          totalAssemblies = Number(assembliesCount[0].count || 0);
        }
        
        // Then get recent items
        const assemblies = await prisma.$queryRaw`
          SELECT 
            id, 
            name, 
            serialNumber, 
            status, 
            createdAt
          FROM Assembly
          WHERE assembledById = ${userDbId}
          ORDER BY createdAt DESC
          LIMIT ${limit}
        `;
        
        if (Array.isArray(assemblies)) {
          assemblyActivities = assemblies.map((assembly: any) => ({
            id: `assembly-${assembly.id}`,
            type: 'assembly',
            title: `Created assembly ${assembly.name || 'unnamed'}`,
            description: `Serial: ${assembly.serialNumber || 'N/A'}`,
            timestamp: assembly.createdAt,
            metadata: {
              assemblyId: assembly.id,
              assemblyName: assembly.name,
              serialNumber: assembly.serialNumber,
              status: assembly.status
            }
          }));
        }
      } catch (error) {
        console.log("Error fetching assemblies:", error);
        // Silently continue if this table doesn't exist
      }
      
      // 4. Try to get batches - note we don't have createdById in schema, 
      // so just getting all batches as a fallback
      try {
        // First try to count all batches
        const batchesCount = await prisma.$queryRaw`
          SELECT COUNT(*) as count FROM StockBatch
        `;
        
        if (Array.isArray(batchesCount) && batchesCount.length > 0) {
          totalBatches = Number(batchesCount[0].count || 0);
        }
        
        // Then get recent items
        const batches = await prisma.$queryRaw`
          SELECT 
            b.id, 
            b.initialQuantity, 
            b.createdAt, 
            b.componentId, 
            c.name as componentName,
            b.vendorId, 
            v.name as vendorName
          FROM StockBatch b
          JOIN Component c ON b.componentId = c.id
          JOIN Vendor v ON b.vendorId = v.id
          ORDER BY b.createdAt DESC
          LIMIT ${limit}
        `;
        
        if (Array.isArray(batches)) {
          batchActivities = batches.map((batch: any) => ({
            id: `batch-${batch.id}`,
            type: 'batch',
            title: `Added ${batch.initialQuantity || 0} ${batch.componentName || 'items'}`,
            description: `From vendor: ${batch.vendorName || 'unknown'}`,
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
        }
      } catch (error) {
        console.log("Error fetching batches:", error);
        // Silently continue if this table doesn't exist
      }
    } catch (error) {
      console.error("Error querying database:", error);
      // Continue with empty arrays
    }

    // Combine all activities, sort by timestamp (newest first), and limit
    const allActivities = [
      ...defectActivities, 
      ...returnQcActivities, 
      ...assemblyActivities,
      ...batchActivities
    ]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);

    // Calculate total counts for stats
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
    console.error("Error fetching user recent activities:", error);
    return NextResponse.json(
      { error: "Failed to fetch recent activities: " + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
} 