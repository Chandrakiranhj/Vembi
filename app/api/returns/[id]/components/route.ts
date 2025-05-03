import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuth } from "@clerk/nextjs/server";
import { Role } from "@prisma/client";
import { checkUserRole } from "@/lib/roleCheck";

// Define allowed roles
const ALLOWED_ROLES = [Role.ADMIN, Role.RETURN_QC, Role.SERVICE_PERSON];

// GET: Fetch the components used in the assembly of a returned item
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify the request is authenticated
    const { userId } = getAuth(req);
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Please sign in again" },
        { status: 401 }
      );
    }

    // Check user authorization
    const isAuthorized = await checkUserRole(userId, ALLOWED_ROLES);
    if (!isAuthorized) {
      return NextResponse.json(
        { error: "Forbidden", message: "You do not have permission to view this information" },
        { status: 403 }
      );
    }

    const returnId = params.id;

    // Find the return with its associated assembly
    const returnRecord = await prisma.return.findUnique({
      where: { id: returnId },
      include: {
        assembly: true
      }
    });

    if (!returnRecord) {
      return NextResponse.json(
        { error: "Return not found", message: "Invalid return ID" },
        { status: 404 }
      );
    }

    if (!returnRecord.assembly || !returnRecord.assemblyId) {
      return NextResponse.json(
        { error: "No assembly found", message: "This return is not associated with an assembly" },
        { status: 404 }
      );
    }

    // Get the components, batches, and vendors used in the assembly
    const assemblyComponents = await prisma.assemblyComponentBatch.findMany({
      where: { assemblyId: returnRecord.assemblyId },
      include: {
        component: {
          select: {
            id: true,
            name: true,
            sku: true,
            category: true
          }
        },
        stockBatch: {
          include: {
            vendor: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    });

    // Structure the response
    const componentDetails = assemblyComponents.map(acb => ({
      id: acb.component.id,
      name: acb.component.name,
      sku: acb.component.sku,
      category: acb.component.category,
      usedBatch: {
        id: acb.stockBatchId,
        batchNumber: acb.stockBatch.batchNumber,
        quantityUsed: acb.quantityUsed,
        vendor: acb.stockBatch.vendor
      }
    }));

    return NextResponse.json({
      success: true,
      assemblyId: returnRecord.assemblyId,
      components: componentDetails
    });
  } catch (error) {
    console.error("Error fetching assembly components:", error);
    return NextResponse.json(
      { error: "Internal server error", message: "Failed to fetch assembly components" },
      { status: 500 }
    );
  }
} 