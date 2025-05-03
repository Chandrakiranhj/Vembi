import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import { completeQC, getReturnById } from "@/lib/mongodb";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log("=== Complete QC API Called ===");
  try {
    // Get and validate the returnId
    const returnId = params.id;
    console.log("Return ID from path:", returnId);
    
    if (!returnId) {
      console.log("Missing return ID in request");
      return NextResponse.json(
        { error: "Missing ID", message: "Return ID is required" },
        { status: 400 }
      );
    }

    // Verify the request is authenticated
    const { userId } = getAuth(req);
    console.log("Authenticated user ID:", userId);
    
    if (!userId) {
      console.log("No authenticated user found");
      return NextResponse.json(
        { error: "Unauthorized", message: "Please sign in again" },
        { status: 401 }
      );
    }

    // Check if return exists
    const returnRecord = await getReturnById(returnId);
    console.log("Return record found:", !!returnRecord);
    
    if (!returnRecord) {
      console.log("Return not found with ID:", returnId);
      return NextResponse.json(
        { error: "Return not found", message: "Invalid return ID" },
        { status: 404 }
      );
    }

    console.log("Current return status:", returnRecord.status);

    // Complete the QC
    const success = await completeQC(returnId);
    if (!success) {
      return NextResponse.json(
        { error: "QC completion failed", message: "Failed to update QC status" },
        { status: 500 }
      );
    }
    
    console.log("QC completed successfully");
    
    return NextResponse.json({
      success: true,
      message: "QC completed successfully"
    });
  } catch (error: Error | unknown) {
    console.error("Error completing QC:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to complete QC";
    return NextResponse.json(
      { error: "Internal server error", message: errorMessage },
      { status: 500 }
    );
  }
} 