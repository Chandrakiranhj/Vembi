import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { Role } from "@prisma/client";
import { checkUserRole } from "@/lib/roleCheck";

// Define allowed roles
const ROLES = {
    CREATE_ASSEMBLY: [Role.ADMIN, Role.ASSEMBLER],
};

interface BatchSelection {
    batchId: string;
    quantityUsed: number;
}

interface ComponentBatchSelection {
    componentId: string;
    batches: BatchSelection[];
}

interface BulkAssemblyRequest {
    productId: string;
    quantity: number;
    serialNumbers: string[];
    funder: string;
    selectedBatches: ComponentBatchSelection[];
}

export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user: authUser } } = await supabase.auth.getUser();
        const userId = authUser?.id;

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const isAuthorized = await checkUserRole(userId, ROLES.CREATE_ASSEMBLY);
        if (!isAuthorized) {
            return NextResponse.json({ error: "Forbidden: You do not have permission to create assemblies." }, { status: 403 });
        }

        // Get the internal user ID
        const user = await prisma.user.findUnique({
            where: { userId: userId },
        });

        if (!user) {
            return NextResponse.json({ error: "User profile not found" }, { status: 404 });
        }

        const json = await req.json();
        const { productId, quantity, serialNumbers, funder, selectedBatches } = json as BulkAssemblyRequest;

        if (!productId || !quantity || !serialNumbers || !selectedBatches) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        if (serialNumbers.length !== quantity) {
            return NextResponse.json({ error: "Mismatch between quantity and provided serial numbers" }, { status: 400 });
        }

        // 1. Verify Product exists
        const product = await prisma.product.findUnique({
            where: { id: productId },
        });

        if (!product) {
            return NextResponse.json({ error: "Product not found" }, { status: 404 });
        }

        // 2. Check for duplicate serial numbers
        const existingAssemblies = await prisma.assembly.findMany({
            where: {
                serialNumber: { in: serialNumbers }
            }
        });

        if (existingAssemblies.length > 0) {
            return NextResponse.json({
                error: `Duplicate serial numbers found: ${existingAssemblies.map(a => a.serialNumber).join(', ')}`
            }, { status: 400 });
        }

        // 3. Fetch BOM
        const bom = await prisma.productComponent.findMany({
            where: { productId },
            include: { component: true }
        });

        if (bom.length === 0) {
            return NextResponse.json({ error: "Product has no Bill of Materials (BOM)" }, { status: 400 });
        }

        // 4. Execute Transaction
        const transactionResult = await prisma.$transaction(async (tx) => {
            const createdAssemblies = [];

            // Mutable pool of batches to consume from
            const batchPool = new Map<string, { batchId: string; quantityRemaining: number }[]>();

            // Initialize pool and verify we have enough stock selected
            for (const compSelection of selectedBatches) {
                batchPool.set(compSelection.componentId, compSelection.batches.map(b => ({
                    batchId: b.batchId,
                    quantityRemaining: b.quantityUsed
                })));
            }

            // Loop to create each assembly
            for (let i = 0; i < quantity; i++) {
                const currentSerial = serialNumbers[i];

                // Create Assembly
                const assembly = await tx.assembly.create({
                    data: {
                        productId,
                        serialNumber: currentSerial,
                        assembledById: user.id,
                        status: "IN_PROGRESS",
                        notes: `Funder: ${funder}`,
                    },
                });
                createdAssemblies.push(assembly);

                // For each component in BOM, link batches
                for (const bomItem of bom) {
                    const componentId = bomItem.componentId;
                    let qtyNeededForThisAssembly = bomItem.quantityRequired;

                    const availableBatches = batchPool.get(componentId);

                    if (!availableBatches) {
                        throw new Error(`No batches selected for component: ${bomItem.component.name}`);
                    }

                    // Consume batches until requirement is met
                    while (qtyNeededForThisAssembly > 0) {
                        // Find the first batch with remaining quantity
                        const batchIndex = availableBatches.findIndex(b => b.quantityRemaining > 0);

                        if (batchIndex === -1) {
                            throw new Error(`Insufficient selected quantity for component: ${bomItem.component.name} for assembly ${currentSerial}`);
                        }

                        const batch = availableBatches[batchIndex];
                        const takeQty = Math.min(qtyNeededForThisAssembly, batch.quantityRemaining);

                        // Link to Assembly
                        await tx.assemblyComponentBatch.create({
                            data: {
                                assemblyId: assembly.id,
                                componentId: componentId,
                                stockBatchId: batch.batchId,
                                quantityUsed: takeQty
                            }
                        });

                        // Update our local pool tracker
                        batch.quantityRemaining -= takeQty;
                        qtyNeededForThisAssembly -= takeQty;

                        // Update the ACTUAL database stock
                        await tx.stockBatch.update({
                            where: { id: batch.batchId },
                            data: {
                                currentQuantity: { decrement: takeQty }
                            }
                        });
                    }
                }
            }

            return createdAssemblies;
        }, {
            maxWait: 5000, // default: 2000
            timeout: 20000 // default: 5000
        });

        return NextResponse.json({
            message: "Assemblies created successfully",
            count: transactionResult.length,
            firstAssemblyId: transactionResult[0].id
        }, { status: 201 });

    } catch (error) {
        console.error("Error creating bulk assemblies:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to create assemblies" },
            { status: 500 }
        );
    }
}
