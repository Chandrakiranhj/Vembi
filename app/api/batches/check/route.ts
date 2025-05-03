import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuth } from "@clerk/nextjs/server";
import { Role } from "@prisma/client";
import { checkUserRole } from "@/lib/roleCheck";

export async function GET(req: NextRequest) {
  try {
    // Only admins can check for invalid data
    const { userId } = await getAuth(req);
    const isAuthorized = await checkUserRole(userId, [Role.ADMIN]);
    
    if (!isAuthorized) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }
    
    // Use Prisma's raw query capability to find StockBatch entries with invalid data
    const batchesWithNullVendorIds = await prisma.stockBatch.findMany({
      where: {
        vendorId: null
      },
      include: {
        component: {
          select: {
            name: true,
            sku: true
          }
        }
      },
      take: 10
    });
    
    // Check for batches with vendorId that doesn't exist in the Vendor table
    const orphanedBatches = await prisma.stockBatch.findMany({
      where: {
        vendor: null,
        NOT: { vendorId: null }
      },
      include: {
        component: {
          select: {
            name: true,
            sku: true
          }
        }
      },
      take: 10
    });
    
    return NextResponse.json({
      batchesWithNullVendorIds: {
        count: batchesWithNullVendorIds.length,
        examples: batchesWithNullVendorIds.map(b => ({
          id: b.id,
          batchNumber: b.batchNumber,
          componentName: b.component?.name || "Unknown Component",
          dateReceived: b.dateReceived
        }))
      },
      orphanedBatches: {
        count: orphanedBatches.length,
        examples: orphanedBatches.map(b => ({
          id: b.id,
          batchNumber: b.batchNumber,
          vendorId: b.vendorId,
          componentName: b.component?.name || "Unknown Component",
          dateReceived: b.dateReceived
        }))
      }
    });
  } catch (error) {
    console.error("Error checking batches:", error);
    return NextResponse.json({ 
      error: "Failed to check batches",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
} 