import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { checkUserRole } from "@/lib/roleCheck";

// Define allowed roles
const ROLES = {
  VIEW_ASSEMBLY: [Role.ADMIN, Role.ASSEMBLER, Role.RETURN_QC, Role.SERVICE_PERSON],
};

// GET: Fetch batches used in an assembly
export const GET = async (
  request: NextRequest,
  context: { params: { id: string } }
) => {
  try {
    const { userId } = await getAuth(request);
    const isAuthorized = await checkUserRole(userId, ROLES.VIEW_ASSEMBLY);

    if (!isAuthorized) {
      return NextResponse.json(
        { error: "Forbidden: You do not have permission to view assembly details." },
        { status: 403 }
      );
    }

    const assemblyId = context.params.id;

    if (!assemblyId) {
      return NextResponse.json(
        { error: "Assembly ID is required" },
        { status: 400 }
      );
    }

    // Fetch assembly to confirm it exists
    const assembly = await prisma.assembly.findUnique({
      where: { id: assemblyId }
    });

    if (!assembly) {
      return NextResponse.json(
        { error: "Assembly not found" },
        { status: 404 }
      );
    }

    // Get assembly component batch records
    const assemblyBatches = await prisma.assemblyComponentBatch.findMany({
      where: { assemblyId },
      select: {
        componentId: true,
        stockBatchId: true,
        quantityUsed: true
      }
    });

    // Get the component and batch details separately
    const batchDetails = await Promise.all(
      assemblyBatches.map(async (record) => {
        const component = await prisma.component.findUnique({
          where: { id: record.componentId },
          select: {
            id: true,
            name: true,
            sku: true,
            category: true
          }
        });

        const stockBatch = await prisma.stockBatch.findUnique({
          where: { id: record.stockBatchId },
          select: {
            id: true,
            batchNumber: true,
            vendorId: true,
            dateReceived: true
          }
        });

        const vendor = stockBatch?.vendorId
          ? await prisma.vendor.findUnique({
              where: { id: stockBatch.vendorId },
              select: { name: true }
            })
          : null;

        return {
          componentId: record.componentId,
          componentName: component?.name || 'Unknown',
          componentSku: component?.sku || 'Unknown',
          componentCategory: component?.category || 'Unknown',
          batchId: record.stockBatchId,
          batchNumber: stockBatch?.batchNumber || 'Unknown',
          vendorId: stockBatch?.vendorId,
          vendorName: vendor?.name || 'Unknown',
          quantityUsed: record.quantityUsed,
          dateReceived: stockBatch?.dateReceived
        };
      })
    );

    return NextResponse.json(batchDetails);

  } catch (error) {
    console.error("Error fetching assembly batches:", error);
    return NextResponse.json(
      { error: "Failed to fetch assembly batches" },
      { status: 500 }
    );
  }
} 