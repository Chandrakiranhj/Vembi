import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { Prisma, AssemblyStatus, Role, Assembly } from "@prisma/client";
import { checkUserRole } from "@/lib/roleCheck";

// Define allowed roles
const ROLES = {
  VIEW_ASSEMBLIES: [Role.ADMIN, Role.ASSEMBLER, Role.RETURN_QC, Role.SERVICE_PERSON],
  CREATE_ASSEMBLIES: [Role.ADMIN, Role.ASSEMBLER],
  MODIFY_ASSEMBLIES: [Role.ADMIN, Role.ASSEMBLER],
  DELETE_ASSEMBLIES: [Role.ADMIN],
};

// GET: Fetch all assemblies with optional filtering
export async function GET(req: NextRequest) {
  try {
    const { userId } = await getAuth(req);
    const isAuthorized = await checkUserRole(userId, ROLES.VIEW_ASSEMBLIES);
    if (!isAuthorized) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to view assemblies." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") as AssemblyStatus | null;
    const productId = searchParams.get("productId");
    const search = searchParams.get("search");
    
    const whereClause: Prisma.AssemblyWhereInput = {};
    
    if (status) {
      whereClause.status = status;
    }
    
    if (productId) {
      whereClause.productId = productId;
    }
    
    if (search) {
      whereClause.serialNumber = { contains: search, mode: 'insensitive' };
    }
    
    const assemblies = await prisma.assembly.findMany({
      where: whereClause,
      include: {
        product: true,
        assembledBy: {
          select: {
            id: true,
            name: true,
          }
        }
      },
      orderBy: [
        { startTime: "desc" }
      ]
    });
    
    return NextResponse.json(assemblies);
  } catch (error) {
    console.error("Error fetching assemblies:", error);
    return NextResponse.json(
      { error: "Failed to fetch assemblies" },
      { status: 500 }
    );
  }
}

// POST: Create a new assembly batch
interface AssemblyBatchCreateInput {
  productId: string;
  quantity: number;
  startSerialNumber: string;
  funder: string;
  selectedBatches?: SelectedBatchInput[];
}

// New interface for batch selection
interface SelectedBatchInput {
  componentId: string;
  batchId: string;
  quantityUsed: number;
}

// Helper function to generate serial numbers
// Basic implementation: Increments the trailing number part
function generateSerialNumbers(start: string, count: number): string[] {
  const serials: string[] = [];
  const match = start.match(/^(.*?)(\d+)$/); // Split into prefix and number part
  
  if (!match || count <= 0) {
    // If no trailing number or count is invalid, just return the start as a single item if count is 1
    return count === 1 ? [start] : []; 
  }

  const prefix = match[1];
  const numberStr = match[2];
  const numLength = numberStr.length;
  const startNum = parseInt(numberStr, 10); // Use const as it's not reassigned

  for (let i = 0; i < count; i++) {
    const nextNumStr = String(startNum + i).padStart(numLength, '0'); // Use startNum here
    serials.push(`${prefix}${nextNumStr}`);
  }
  
  return serials;
}

export async function POST(req: NextRequest) {
  try {
    const { userId: clerkUserId } = await getAuth(req);
    const isAuthorized = await checkUserRole(clerkUserId, ROLES.CREATE_ASSEMBLIES);
    if (!isAuthorized) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to create assemblies." }, { status: 403 });
    }

    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized: User ID is missing." }, { status: 401 });
    }

    // Get the internal user ID from the database
    const user = await prisma.user.findUnique({
      where: { userId: clerkUserId },
      select: { id: true }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found in database" }, { status: 404 });
    }

    const json: AssemblyBatchCreateInput = await req.json();
    const { 
      productId, 
      quantity, 
      startSerialNumber,
      funder,
      selectedBatches = []
    } = json;
    
    if (!productId || !startSerialNumber || !quantity || quantity <= 0 || !funder) {
      return NextResponse.json(
        { error: "Product ID, starting serial number, funder information, and a positive quantity are required" },
        { status: 400 }
      );
    }
    
    const serialNumbersToCreate = generateSerialNumbers(startSerialNumber, quantity);
    if (serialNumbersToCreate.length !== quantity) {
         return NextResponse.json(
           { error: "Invalid starting serial number format for generating sequence." },
           { status: 400 }
         );
    }
    
    const existingAssemblies = await prisma.assembly.findMany({
      where: { 
        serialNumber: { 
          in: serialNumbersToCreate 
        } 
      },
      select: { serialNumber: true }
    });
    
    if (existingAssemblies.length > 0) {
      const existingSerials = existingAssemblies.map(a => a.serialNumber).join(', ');
      return NextResponse.json(
        { error: `One or more serial numbers already exist: ${existingSerials}` },
        { status: 409 }
      );
    }
    
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        bomComponents: {
          include: {
            component: true
          }
        }
      }
    });
    
    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    if (product.bomComponents.length > 0 && selectedBatches.length === 0) {
      return NextResponse.json({
        error: "This product requires component batch selection, but no batches were provided"
      }, { status: 400 });
    }

    if (selectedBatches.length > 0) {
      const selectedQuantityByComponent: Record<string, number> = {};
      for (const batch of selectedBatches) {
        if (!selectedQuantityByComponent[batch.componentId]) {
          selectedQuantityByComponent[batch.componentId] = 0;
        }
        selectedQuantityByComponent[batch.componentId] += batch.quantityUsed;
      }

      for (const bomComponent of product.bomComponents) {
        const requiredQuantity = bomComponent.quantityRequired * quantity;
        const selectedQuantity = selectedQuantityByComponent[bomComponent.componentId] || 0;
        if (selectedQuantity !== requiredQuantity) {
          return NextResponse.json({
            error: `Incorrect quantity for ${bomComponent.component.name}. Required: ${requiredQuantity}, Selected: ${selectedQuantity}`
          }, { status: 400 });
        }
      }

      for (const componentId in selectedQuantityByComponent) {
        if (!product.bomComponents.some(comp => comp.componentId === componentId)) {
          return NextResponse.json({
            error: `Selected component ID ${componentId} is not part of this product's BOM`
          }, { status: 400 });
        }
      }

      const batchChecks = await Promise.all(selectedBatches.map(batch => 
        prisma.stockBatch.findUnique({
          where: { id: batch.batchId },
          select: { id: true, currentQuantity: true, component: { select: { name: true } } }
        })
      ));
        
      for (let i = 0; i < selectedBatches.length; i++) {
        const batch = selectedBatches[i];
        const stockBatch = batchChecks[i];
        if (!stockBatch) {
          return NextResponse.json({ error: `Stock batch ${batch.batchId} not found` }, { status: 404 });
        }
        if (stockBatch.currentQuantity < batch.quantityUsed) {
          return NextResponse.json({ error: `Insufficient stock for ${stockBatch.component.name} in batch ${batch.batchId}. Available: ${stockBatch.currentQuantity}, Required: ${batch.quantityUsed}` }, { status: 400 });
        }
      }
    }

    // Split the transaction into smaller chunks to prevent timeouts
    let firstAssemblyId: string | null = null;
    let createdAssemblies: Assembly[] = [];

    try {
      // Process in smaller batches for better performance and to prevent timeouts
      const BATCH_SIZE = 5; // Create 5 assemblies at a time
      
      // 1. Create assemblies in batches
      for (let i = 0; i < serialNumbersToCreate.length; i += BATCH_SIZE) {
        const currentBatch = serialNumbersToCreate.slice(i, i + BATCH_SIZE);
        console.log(`Creating assemblies ${i+1}-${Math.min(i+BATCH_SIZE, serialNumbersToCreate.length)} of ${serialNumbersToCreate.length}...`);
        
        // Create assemblies in a transaction
        const assembliesCreated = await prisma.$transaction(async (tx) => {
          const batchAssemblies = [];
          
          for (const serialNumber of currentBatch) {
            const assembly = await tx.assembly.create({
              data: {
          productId,
          serialNumber,
          assembledById: user.id,
          status: AssemblyStatus.IN_PROGRESS,
          startTime: new Date(),
          notes: funder ? `Funder: ${funder}` : undefined
              }
            });
            batchAssemblies.push(assembly);
          }
          
          return batchAssemblies;
        });
        
        createdAssemblies = [...createdAssemblies, ...assembliesCreated];
        
        // Small delay between batches to prevent database contention
        if (i + BATCH_SIZE < serialNumbersToCreate.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      if (createdAssemblies.length > 0) {
        firstAssemblyId = createdAssemblies[0].id;
      }

      // 2. Process batches for assembly components
      if (selectedBatches.length > 0) {
        // Track total quantities used to ensure correct inventory deduction
        const totalQuantityUsedPerBatch: Record<string, number> = {};
        
        // Distribute quantities across assemblies
        for (const batch of selectedBatches) {
          // Initialize tracking for this batch if not exists
          if (!totalQuantityUsedPerBatch[batch.batchId]) {
            totalQuantityUsedPerBatch[batch.batchId] = 0;
          }
          
          // Calculate base quantity per assembly and remainder
          const baseQuantityPerAssembly = Math.floor(batch.quantityUsed / quantity);
          const remainder = batch.quantityUsed % quantity;
          
          // Create batch records with distributed quantities
          for (let i = 0; i < createdAssemblies.length; i += BATCH_SIZE) {
            const assemblyBatch = createdAssemblies.slice(i, i + BATCH_SIZE);
            console.log(`Creating component batch records for assemblies ${i+1}-${Math.min(i+BATCH_SIZE, createdAssemblies.length)}...`);
            
            await prisma.$transaction(async (tx) => {
              for (let j = 0; j < assemblyBatch.length; j++) {
                const assembly = assemblyBatch[j];
                // Add one extra to the first 'remainder' assemblies to distribute remainder
                const adjustedQuantity = (i + j < remainder) ? 
                  baseQuantityPerAssembly + 1 : baseQuantityPerAssembly;
                
                if (adjustedQuantity > 0) {
                  await tx.assemblyComponentBatch.create({
              data: {
                assemblyId: assembly.id,
                      componentId: batch.componentId,
                      stockBatchId: batch.batchId,
                      quantityUsed: adjustedQuantity
                    }
                  });
                  
                  // Track total quantity used for this batch
                  totalQuantityUsedPerBatch[batch.batchId] += adjustedQuantity;
                }
              }
            });
            
            // Small delay between batches to prevent database contention
            if (i + BATCH_SIZE < createdAssemblies.length) {
              await new Promise(resolve => setTimeout(resolve, 500));
            }
          }
        }
        
        // Validate total quantities before updating inventory
        for (const batch of selectedBatches) {
          const actualUsed = totalQuantityUsedPerBatch[batch.batchId] || 0;
          if (actualUsed !== batch.quantityUsed) {
            console.error(`Quantity mismatch for batch ${batch.batchId}: Used ${actualUsed}, Expected ${batch.quantityUsed}`);
          }
        }
        
        // 3. Update stock batch quantities in a separate operation
        console.log("Updating stock batch quantities...");
        
        // Update stock quantities in small batches to prevent timeouts
        const batchIds = Object.keys(totalQuantityUsedPerBatch);
        for (let i = 0; i < batchIds.length; i += BATCH_SIZE) {
          const currentBatchIds = batchIds.slice(i, i + BATCH_SIZE);
          
          await prisma.$transaction(async (tx) => {
            for (const batchId of currentBatchIds) {
              // Fetch current stock quantity to ensure accurate update
              const currentStock = await tx.stockBatch.findUnique({
                where: { id: batchId },
                select: { currentQuantity: true }
              });
              
              if (!currentStock) {
                console.error(`Stock batch ${batchId} not found during inventory update`);
                continue;
              }
              
              const quantityToDeduct = totalQuantityUsedPerBatch[batchId];
              console.log(`Updating batch ${batchId}: Current quantity ${currentStock.currentQuantity}, deducting ${quantityToDeduct}`);
              
              if (currentStock.currentQuantity < quantityToDeduct) {
                console.error(`Warning: Insufficient stock for batch ${batchId}. Available: ${currentStock.currentQuantity}, Required: ${quantityToDeduct}`);
              }
              
              // Perform the update with precise decrement value
              await tx.stockBatch.update({
                where: { id: batchId },
                data: {
                  currentQuantity: { decrement: quantityToDeduct }
                }
              });
            }
          });
        }
      }

    return NextResponse.json({ 
      message: `${quantity} assemblies created successfully!`, 
        firstAssemblyId,
        theme: "premium"
    }, { status: 201 });

    } catch (error) {
      console.error("Error creating assemblies:", error);
      let errorMessage = "Failed to create assemblies";
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        errorMessage = `Database error: ${error.code}`; 
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
  } catch (error) {
    console.error("Error creating assemblies:", error);
    let errorMessage = "Failed to create assemblies";
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      errorMessage = `Database error: ${error.code}`; 
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
} 