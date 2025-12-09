import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { ReturnStatus } from "@prisma/client";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log("=== Status Update API Called ===");
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
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    const userId = authUser?.id;
    console.log("Authenticated user ID:", userId);

    if (!userId) {
      console.log("No authenticated user found");
      return NextResponse.json(
        { error: "Unauthorized", message: "Please sign in again" },
        { status: 401 }
      );
    }

    // Parse request body for the new status
    const body = await req.json();
    const { status } = body;
    console.log("Request body:", body);
    console.log("Status to update to:", status);

    // Validate the status is valid
    const validStatuses = Object.values(ReturnStatus);
    if (!status || !validStatuses.includes(status as ReturnStatus)) {
      console.log("Invalid status provided:", status);
      return NextResponse.json(
        {
          error: "Invalid status",
          message: `Status must be one of: ${validStatuses.join(', ')}`
        },
        { status: 400 }
      );
    }

    console.log(`Attempting to update return ${returnId} to status ${status}`);

    try {
      // Check if the return exists
      const returnRecord = await prisma.return.findUnique({
        where: { id: returnId }
      });
      console.log("Return record found:", !!returnRecord);

      if (!returnRecord) {
        console.log("Return not found with ID:", returnId);
        return NextResponse.json(
          { error: "Return not found", message: "Invalid return ID" },
          { status: 404 }
        );
      }

      console.log("Current return status:", returnRecord.status);

      // Check if the return has completed QC if trying to return to user
      if (status === 'RETURNED') {
        console.log("Checking if QC is completed for return to user operation");
        const qcRecord = await prisma.returnQC.findFirst({
          where: { returnId: returnId, status: "COMPLETED" }
        });
        const qcCompleted = !!qcRecord;
        console.log("QC completion check result:", qcCompleted);

        if (!qcCompleted) {
          console.log("Attempted to mark as returned without completed QC");
          return NextResponse.json(
            {
              error: "Invalid operation",
              message: "Can only mark as returned to user after QC is completed"
            },
            { status: 400 }
          );
        }
      }

      // Update the return status
      console.log("All checks passed. Updating return status...");
      const updatedReturn = await prisma.return.update({
        where: { id: returnId },
        data: { status: status as ReturnStatus }
      });
      console.log("Return updated successfully:", !!updatedReturn);

      return NextResponse.json({
        success: true,
        message: `Status updated to ${status}`,
        return: updatedReturn
      });
    } catch (dbError: Error | unknown) {
      console.error("Database error:", dbError);
      const errorMessage = dbError instanceof Error ? dbError.message : "Error updating status in database";
      return NextResponse.json(
        { error: "Database error", message: errorMessage },
        { status: 500 }
      );
    }
  } catch (error: Error | unknown) {
    console.error("Error updating return status:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to update return status";
    return NextResponse.json(
      { error: "Internal server error", message: errorMessage },
      { status: 500 }
    );
  }
}