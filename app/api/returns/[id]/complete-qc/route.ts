import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

interface DefectPayload {
  componentId: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  notes: string;
  resolution?: 'NONE' | 'FIX' | 'REPLACE';
  replacementBatchId?: string;
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const returnId = params.id;
    const body = await req.json();
    const { defects, passedComponentIds } = body as {
      defects: DefectPayload[],
      passedComponentIds: string[]
    };

    if (!returnId) {
      return NextResponse.json({ error: "Missing ID" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get internal user ID
    const user = await prisma.user.findUnique({
      where: { userId: authUser.id }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Transaction to update everything
    await prisma.$transaction(async (tx) => {
      // 1. Create or Update ReturnQC
      let qc = await tx.returnQC.findUnique({
        where: { returnId }
      });

      if (!qc) {
        qc = await tx.returnQC.create({
          data: {
            returnId,
            qcById: user.id,
            status: 'COMPLETED'
          }
        });
      } else {
        await tx.returnQC.update({
          where: { id: qc.id },
          data: {
            status: 'COMPLETED',
            qcById: user.id
          }
        });
      }

      // 2. Handle Defects
      // First, clear existing defects for this QC to avoid duplicates if re-running
      await tx.returnQCDefect.deleteMany({
        where: { qcId: qc.id }
      });

      for (const defect of defects) {
        // Create defect record with direct field IDs
        await tx.returnQCDefect.create({
          data: {
            qcId: qc.id,
            componentId: defect.componentId,
            description: defect.notes,
            severity: defect.severity,
            resolution: defect.resolution || 'NONE',
            replacementBatchId: defect.replacementBatchId,
            defectType: 'QC_REPORTED',
            batchId: null
          }
        });

        // If replacing, deduct from inventory
        if (defect.resolution === 'REPLACE' && defect.replacementBatchId) {
          await tx.stockBatch.update({
            where: { id: defect.replacementBatchId },
            data: {
              currentQuantity: {
                decrement: 1
              }
            }
          });
        }

        // Update ReturnComponent status
        const returnComponent = await tx.returnComponent.findFirst({
          where: { returnId, componentId: defect.componentId }
        });

        if (returnComponent) {
          await tx.returnComponent.update({
            where: { id: returnComponent.id },
            data: {
              defective: true,
              notes: defect.notes
            }
          });
        } else {
          await tx.returnComponent.create({
            data: {
              returnId,
              componentId: defect.componentId,
              defective: true,
              notes: defect.notes
            }
          });
        }
      }

      // 3. Handle Passed Components
      for (const compId of passedComponentIds) {
        const returnComponent = await tx.returnComponent.findFirst({
          where: { returnId, componentId: compId }
        });

        if (returnComponent) {
          await tx.returnComponent.update({
            where: { id: returnComponent.id },
            data: { defective: false, notes: null }
          });
        } else {
          await tx.returnComponent.create({
            data: {
              returnId,
              componentId: compId,
              defective: false
            }
          });
        }
      }

      // 4. Update Return Status
      const hasReplacements = defects.some(d => d.resolution === 'REPLACE');
      const hasFixes = defects.some(d => d.resolution === 'FIX');

      let newStatus = 'IN_INSPECTION';
      if (defects.length === 0) {
        newStatus = 'RETURNED';
      } else if (hasReplacements) {
        newStatus = 'REPLACED';
      } else if (hasFixes) {
        newStatus = 'REPAIRED';
      }

      await tx.return.update({
        where: { id: returnId },
        data: {
          // @ts-ignore
          status: newStatus
        }
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error completing QC:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}