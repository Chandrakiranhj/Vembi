import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuth } from "@clerk/nextjs/server";

export async function POST(req: NextRequest) {
  try {
    // Verify the request is authenticated
    const { userId } = getAuth(req);
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Please sign in again" },
        { status: 401 }
      );
    }

    // Parse the request body
    const { returnId, defects } = await req.json();

    // Validate input
    if (!returnId || !defects || !Array.isArray(defects)) {
      return NextResponse.json(
        { error: "Missing required fields", message: "Return ID and defects array are required" },
        { status: 400 }
      );
    }

    // Check if return exists
    const returnRecord = await prisma.return.findUnique({
      where: { id: returnId },
      include: {
        product: {
          include: {
            bomComponents: {
              include: {
                component: true
              }
            }
          }
        }
      }
    });

    if (!returnRecord) {
      return NextResponse.json(
        { error: "Return not found", message: "Invalid return ID" },
        { status: 404 }
      );
    }

    // Get the internal user ID from the Clerk userId
    const user = await prisma.user.findUnique({
      where: { userId },
      select: { id: true }
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found", message: "User not found in database" },
        { status: 404 }
      );
    }

    // Use a transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      // Create the QC record
      const qcRecord = await tx.returnQC.create({
        data: {
          returnId,
          qcById: user.id,
          status: "IN_PROGRESS"
        }
      });

      // Create defect records
      for (const defect of defects) {
        const { componentId, batchId, defectType, description, severity } = defect;

        // Instead of validating against BOM, we'll check if the component exists
        const componentExists = await tx.component.findUnique({
          where: { id: componentId }
        });

        if (!componentExists) {
          throw new Error(`Component ${componentId} not found`);
        }

        // Handle case where batch ID is a placeholder for missing data
        let actualBatchId = batchId;
        if (batchId === 'missing-batch-data') {
          // Try to find an actual batch for this component to use
          const existingBatch = await tx.stockBatch.findFirst({
            where: { componentId }
          });
          
          if (!existingBatch) {
            // Create a placeholder batch if none exists
            const placeholderBatch = await tx.stockBatch.create({
              data: {
                batchNumber: `PLACEHOLDER-${Date.now()}`,
                componentId,
                initialQuantity: 0,
                currentQuantity: 0,
                vendorId: "000000000000000000000000", // Add a default vendor ID (you'll need to create one)
                notes: "Placeholder batch for QC with missing batch data"
              }
            });
            actualBatchId = placeholderBatch.id;
          } else {
            actualBatchId = existingBatch.id;
          }
        }

        await tx.returnQCDefect.create({
          data: {
            qcId: qcRecord.id,
            componentId,
            batchId: actualBatchId,
            defectType,
            description,
            severity
          }
        });
      }

      // Update return status
      await tx.return.update({
        where: { id: returnId },
        data: { status: "IN_INSPECTION" }
      });

      return qcRecord;
    });

    return NextResponse.json({
      success: true,
      qc: result
    });
  } catch (error) {
    console.error("Error creating QC record:", error);
    return NextResponse.json(
      { error: "Internal server error", message: "Failed to create QC record" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    // Verify the request is authenticated
    const { userId } = getAuth(req);
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Please sign in again" },
        { status: 401 }
      );
    }

    // Get all QC records
    const qcRecords = await prisma.returnQC.findMany({
      include: {
        return: {
          include: {
            product: true
          }
        },
        qcBy: true,
        defects: {
          include: {
            component: true,
            batch: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({
      success: true,
      qcRecords
    });
  } catch (error) {
    console.error("Error fetching QC records:", error);
    return NextResponse.json(
      { error: "Internal server error", message: "Failed to fetch QC records" },
      { status: 500 }
    );
  }
} 