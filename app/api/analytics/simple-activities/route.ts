import { NextRequest, NextResponse } from "next/server";
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

// Stats interface
interface ActivityStats {
  // Reported defects directly
  totalDefects: number;
  // Return QC items processed
  totalReturnQcItems: number;
  // Total assemblies created
  totalAssemblies: number;
  // Total batches added
  totalBatches: number;
  // Total of all activities
  totalActivities: number;
  // Total defects including those found in returns
  totalDefectsIncludingReturns: number;
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
    
    // Generate user-specific mock data for this particular user
    const mockActivities: Activity[] = [
      {
        id: `defect-${userId.substring(0, 6)}-1`,
        type: 'defect',
        title: 'Reported defect in Component ABC',
        description: 'Severity: HIGH',
        timestamp: new Date(),
        metadata: {
          componentId: '123',
          componentName: 'Component ABC',
          severity: 'HIGH'
        }
      },
      {
        id: `returnqc-${userId.substring(0, 6)}-1`,
        type: 'returnqc',
        title: 'Processed return for Product XYZ',
        description: 'Found 2 defect(s)',
        timestamp: new Date(Date.now() - 3600000), // 1 hour ago
        metadata: {
          productId: '456',
          productName: 'Product XYZ',
          defectCount: 2,
          returnStatus: 'COMPLETED'
        }
      },
      {
        id: `assembly-${userId.substring(0, 6)}-1`,
        type: 'assembly',
        title: 'Created assembly Assembly-123',
        description: 'Serial: SN12345',
        timestamp: new Date(Date.now() - 7200000), // 2 hours ago
        metadata: {
          assemblyId: '789',
          assemblyName: 'Assembly-123',
          serialNumber: 'SN12345',
          status: 'COMPLETED'
        }
      },
      {
        id: `batch-${userId.substring(0, 6)}-1`,
        type: 'batch',
        title: 'Added 100 Screws',
        description: 'From vendor: Acme Supplies',
        timestamp: new Date(Date.now() - 86400000), // 1 day ago
        metadata: {
          batchId: '101',
          componentId: '202',
          componentName: 'Screws',
          vendorId: '303',
          vendorName: 'Acme Supplies',
          quantity: 100
        }
      }
    ];

    // Limit activities based on query parameter
    const limitedActivities = mockActivities.slice(0, limit);

    // Sample stats - normally would be calculated from database
    // Note: These are user-specific stats, showing only activities by this user
    const totalDefects = 5;
    const totalReturnQcItems = 10;
    const defectsInReturns = 15; // Total defects found in returns
    
    const stats: ActivityStats = {
      totalDefects,
      totalReturnQcItems,
      totalAssemblies: 8,
      totalBatches: 15,
      totalActivities: totalDefects + totalReturnQcItems + 8 + 15,
      totalDefectsIncludingReturns: totalDefects + defectsInReturns
    };

    return NextResponse.json({
      message: "User-specific activities data (mock)",
      userId: userId,
      activities: limitedActivities,
      totalCount: limitedActivities.length,
      stats
    });

  } catch (error) {
    console.error("Error in simple-activities endpoint:", error);
    return NextResponse.json(
      { error: "Failed to fetch activities: " + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
} 