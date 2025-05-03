import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuth } from "@clerk/nextjs/server";

// Define allowed roles
const ALLOWED_ROLES = ["ADMIN", "RETURN_QC", "SERVICE_PERSON"];

// POST: Create a new defect from inventory
export async function POST(req: NextRequest) {
  try {
    // Verify authentication
    const { userId } = await getAuth(req);
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Please sign in again" },
        { status: 401 }
      );
    }

    // Get user from database
    // @ts-expect-error - Prisma client methods
    const user = await prisma.user.findFirst({
      where: { userId }
    });
    
    if (!user) {
      return NextResponse.json(
        { error: "User not found", message: "User not found in database" },
        { status: 404 }
      );
    }

    // Check user role
    if (!ALLOWED_ROLES.includes(user.role)) {
      return NextResponse.json(
        { error: "Forbidden", message: "You do not have permission to create inventory defects" },
        { status: 403 }
      );
    }

    // Parse request data
    const { componentId, batchId, severity, description } = await req.json();
    
    // Validate required fields
    if (!componentId || !batchId || !description) {
      return NextResponse.json(
        { error: "Missing required fields", message: "Component ID, batch ID, and description are required" },
        { status: 400 }
      );
    }

    // Validate component exists
    // @ts-expect-error - Prisma client methods
    const component = await prisma.component.findUnique({
      where: { id: componentId }
    });
    
    if (!component) {
      return NextResponse.json(
        { error: "Component not found", message: "Invalid component ID" },
        { status: 404 }
      );
    }

    // Validate batch exists and belongs to the component
    // @ts-expect-error - Prisma client methods
    const batch = await prisma.stockBatch.findFirst({
      where: { 
        id: batchId,
        componentId: componentId
      }
    });
    
    if (!batch) {
      return NextResponse.json(
        { error: "Batch not found", message: "Invalid batch ID or batch does not belong to this component" },
        { status: 404 }
      );
    }

    // Check batch has enough quantity
    if (batch.currentQuantity < 1) {
      return NextResponse.json(
        { error: "Insufficient quantity", message: "This batch has insufficient quantity" },
        { status: 400 }
      );
    }

    // Use a transaction to ensure data consistency
    // @ts-expect-error - Using Prisma transaction syntax
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the defect record
      const defect = await tx.defect.create({
        data: {
          componentId,
          reportedById: user.id,
          severity: severity || "MEDIUM",
          // Add a prefix to indicate this is an inventory defect
          description: `[INVENTORY] ${description}`,
          status: "OPEN"
        }
      });

      // 2. Deduct the inventory
      const updatedBatch = await tx.stockBatch.update({
        where: { id: batchId },
        data: {
          currentQuantity: {
            decrement: 1
          }
        }
      });

      return { defect, updatedBatch };
    });

    return NextResponse.json({
      success: true,
      message: "Defect reported successfully",
      defect: result.defect,
      updatedBatch: result.updatedBatch
    }, { status: 201 });
  } catch (error) {
    console.error("Error creating inventory defect:", error);
    return NextResponse.json(
      { error: "Internal server error", message: "Failed to create defect" },
      { status: 500 }
    );
  }
} 