import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuth } from "@clerk/nextjs/server";
import { Role } from "@prisma/client";
import { checkUserRole } from "@/lib/roleCheck";

// Define allowed roles
const ROLES = {
  VIEW_BATCHES: [Role.ADMIN, Role.ASSEMBLER, Role.RETURN_QC, Role.SERVICE_PERSON],
  CREATE_BATCHES: [Role.ADMIN, Role.ASSEMBLER],
};

// GET: Fetch all stock batches with optional filtering
export async function GET(req: NextRequest) {
  try {
    console.log("GET /api/batches - Request received");
    const { userId } = await getAuth(req);
    console.log(`Authenticated user: ${userId}`);
    
    const isAuthorized = await checkUserRole(userId, ROLES.VIEW_BATCHES);
    console.log(`User ${userId} is authorized: ${isAuthorized}`);
    
    if (!isAuthorized) {
      console.log(`Unauthorized attempt to view batches by user: ${userId}`);
      return NextResponse.json({ error: "Forbidden: You do not have permission to view batches." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const componentId = searchParams.get("componentId");
    const vendorName = searchParams.get("vendor"); // Vendor name to search for

    console.log(`Fetching batches for componentId: ${componentId || 'all'}, vendorName: ${vendorName || 'all'}`);

    if (!componentId) {
      console.warn('componentId is required for fetching specific batches for assembly.');
      return NextResponse.json({ error: "componentId is required" }, { status: 400 });
    }
    
    // Check if componentId is a valid ObjectId format (24 character hex string)
    if (!/^[0-9a-fA-F]{24}$/.test(componentId)) {
      console.error(`Invalid componentId format: ${componentId}`);
      return NextResponse.json({ error: "Invalid componentId format" }, { status: 400 });
    }

    let vendorIds: string[] | undefined;

    // If filtering by vendor name, find the vendor ID(s) first
    if (vendorName) {
      console.log(`Searching for vendors with name containing: ${vendorName}`);
      const vendors = await prisma.vendor.findMany({
        where: { name: { contains: vendorName, mode: 'insensitive' } },
        select: { id: true },
      });
      
      console.log(`Found ${vendors.length} vendors matching name: ${vendorName}`);
      
      if (vendors.length === 0) {
        console.log(`No vendors found matching name: ${vendorName}. Returning empty batch list.`);
          return NextResponse.json([]);
      }
      
      vendorIds = vendors.map(v => v.id);
      console.log(`Vendor IDs: ${vendorIds.join(', ')}`);
    }

    // Construct query with detailed logging
    const whereClause = vendorIds 
      ? {
          componentId,
          currentQuantity: { gt: 0 },
          vendorId: { in: vendorIds }
        }
      : {
          componentId,
          currentQuantity: { gt: 0 }
          // We're intentionally not filtering on vendorId now to diagnose the issue
        };
        
    console.log("Prisma Query Where Clause:", JSON.stringify(whereClause));
    
    try {
      console.log("Executing Prisma query to find batches...");
    const batches = await prisma.stockBatch.findMany({
        where: whereClause,
      include: {
        component: {
          select: {
            id: true,
            name: true,
            sku: true,
          },
        },
        vendor: {
          select: {
            id: true,
            name: true,
          },
        },
      },
        orderBy: {
          dateReceived: 'asc' // Fetch oldest batches first for FIFO
        }
      });

      console.log(`Found ${batches.length} available batches for component ${componentId}`);
      
      // Check for batches with null vendorIds
      const batchesWithNullVendor = batches.filter(batch => !batch.vendorId || !batch.vendor);
      if (batchesWithNullVendor.length > 0) {
        console.log(`Warning: Found ${batchesWithNullVendor.length} batches with null vendorId`);
        console.log("Example batch with null vendor:", batchesWithNullVendor[0]);
      }
      
      // Check if no batches were found
      if (batches.length === 0) {
        console.log("No batches found - check if component exists and has batches");
        // Check if component exists
        const component = await prisma.component.findUnique({
          where: { id: componentId }
        });
        console.log(`Component check: ${component ? 'Component exists' : 'Component not found'}`);
        
        // Check if any batches exist for this component regardless of other filters
        const anyBatches = await prisma.stockBatch.findMany({
          where: { componentId },
          take: 1
        });
        console.log(`Any batches for component: ${anyBatches.length > 0 ? 'Yes' : 'No'}`);
      }

    return NextResponse.json(batches);
    } catch (prismaError) {
      console.error("Prisma query error:", prismaError);
      throw prismaError;
    }
  } catch (error) {
    console.error("Error fetching batches:", error);
    return NextResponse.json({ error: "Failed to fetch batches" }, { status: 500 });
  }
}

// POST: Create a new stock batch
export async function POST(req: NextRequest) {
  try {
    const { userId } = await getAuth(req);
    const isAuthorized = await checkUserRole(userId, ROLES.CREATE_BATCHES);
    if (!isAuthorized) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to create batches." }, { status: 403 });
    }

    const json = await req.json();
    const { 
      componentId, 
      initialQuantity,
      vendorId, 
      dateReceived, 
      notes
    } = json;
    
    // Validate required fields
    if (!componentId || !initialQuantity || !vendorId || initialQuantity <= 0) {
      return NextResponse.json(
        { error: "Component ID, vendor ID, and a positive initial quantity are required" },
        { status: 400 }
      );
    }
    
    // Check if component exists
    const component = await prisma.component.findUnique({
      where: { id: componentId }
    });
    
    if (!component) {
      return NextResponse.json(
        { error: "Component not found" },
        { status: 404 }
      );
    }

    // Check if vendor exists
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId }
    });
    
    if (!vendor) {
      return NextResponse.json(
        { error: "Vendor not found" },
        { status: 404 }
      );
    }

    // Generate batch ID based on component and existing batches
    const componentSku = component.sku;
    const componentPrefix = componentSku.length > 1 
      ? componentSku.substring(0, 2).toUpperCase() 
      : (componentSku.substring(0, 1) + '0').toUpperCase();
    
    // Find the latest batch number for this component
    const latestBatch = await prisma.stockBatch.findFirst({
      where: {
        componentId,
        batchNumber: {
          startsWith: componentPrefix,
        },
      },
      orderBy: {
        batchNumber: 'desc',
      },
    });
    
    // Extract current sequence number and increment
    let sequenceNumber = 1;
    if (latestBatch) {
      const match = latestBatch.batchNumber.match(/(\d+)$/);
      if (match && match[1]) {
        sequenceNumber = parseInt(match[1], 10) + 1;
      }
    }
    
    // Create batch number with format: [2 letters]-[3 digit sequence]
    const batchNumber = `${componentPrefix}-${sequenceNumber.toString().padStart(3, '0')}`;
    
    // Create the new batch
    const batch = await prisma.stockBatch.create({
      data: {
        batchNumber,
        componentId,
        initialQuantity: Number(initialQuantity),
        currentQuantity: Number(initialQuantity),
        vendorId,
        dateReceived: dateReceived ? new Date(dateReceived) : new Date(),
        notes,
      }
    });
    
    return NextResponse.json(batch, { status: 201 });
  } catch (error) {
    console.error("Error creating stock batch:", error);
    let errorMessage = "Failed to create stock batch";
    if (error instanceof Error) {
        errorMessage = error.message;
    }
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
} 