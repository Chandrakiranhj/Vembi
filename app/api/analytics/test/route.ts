import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";

// Define stats interface to match other endpoints
interface ActivityStats {
  totalDefects: number;
  totalReturnQcItems: number;
  totalAssemblies: number;
  totalBatches: number;
  totalActivities: number;
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

    // Sample stats with the combined defects count
    const totalDefects = 1;
    const totalReturnQcItems = 1;
    const defectsInReturns = 2; // Defects found in returns
    
    const stats: ActivityStats = {
      totalDefects,
      totalReturnQcItems,
      totalAssemblies: 1,
      totalBatches: 1,
      totalActivities: 4,
      totalDefectsIncludingReturns: totalDefects + defectsInReturns
    };

    // Return mock data for testing
    return NextResponse.json({
      message: "Test endpoint working correctly",
      userId: userId,
      timestamp: new Date().toISOString(),
      activities: [
        {
          id: "test-1",
          type: "defect",
          title: "Test Defect Activity",
          description: "This is a test activity",
          timestamp: new Date(),
          metadata: {
            testField: "test value"
          }
        }
      ],
      stats
    });
  } catch (error) {
    console.error("Test API error:", error);
    return NextResponse.json(
      { error: "Test endpoint error: " + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
} 