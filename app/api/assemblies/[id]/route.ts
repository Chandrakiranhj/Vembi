import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { Role, AssemblyStatus, Component } from "@prisma/client";
import { checkUserRole } from "@/lib/roleCheck";

// Define allowed roles
const ROLES = {
    VIEW_ASSEMBLIES: [Role.ADMIN, Role.QC_PERSON, Role.ASSEMBLER, Role.SERVICE_PERSON, Role.RETURN_QC],
    MODIFY_ASSEMBLIES: [Role.ADMIN, Role.ASSEMBLER],
    DELETE_ASSEMBLIES: [Role.ADMIN],
};

// GET: Fetch a single assembly by ID
export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const supabase = await createClient();
        const { data: { user: authUser } } = await supabase.auth.getUser();
        const userId = authUser?.id;

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const isAuthorized = await checkUserRole(userId, ROLES.VIEW_ASSEMBLIES);
        if (!isAuthorized) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const assembly = await prisma.assembly.findUnique({
            where: { id: params.id },
            include: {
                product: true,
                assembledBy: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        role: true
                    }
                },
                components: {
                    include: {
                        component: true
                    }
                }
            },
        });

        if (!assembly) {
            return NextResponse.json(
                { error: "Assembly not found" },
                { status: 404 }
            );
        }

        return NextResponse.json(assembly);
    } catch (error) {
        console.error("Error fetching assembly:", error);
        return NextResponse.json(
            { error: "Failed to fetch assembly" },
            { status: 500 }
        );
    }
}

// Define the expected input structure for PUT
// Old component structure (removed)
// interface AssemblyComponentUpdateInput {
//   componentId: string;
//   quantityUsed: number;
// }

// New batch selection structure
interface SelectedBatchInput {
    componentId: string;
    batchId: string;
    quantityUsed: number; // Quantity used *from this specific batch*
}

interface AssemblyUpdateInput {
    status?: AssemblyStatus;
    notes?: string;
    completionTime?: string; // Optional completion time from client
    // components?: AssemblyComponentUpdateInput[]; // Old structure
    selectedBatches?: SelectedBatchInput[]; // New structure for batch selection
}

// PUT: Update an assembly status, notes, and potentially link components/decrement stock from batches
export async function PUT(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const supabase = await createClient();
        const { data: { user: authUser } } = await supabase.auth.getUser();
        const userId = authUser?.id;

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized: User ID is missing." }, { status: 401 });
        }

        const isAuthorized = await checkUserRole(userId, ROLES.MODIFY_ASSEMBLIES);
        if (!isAuthorized) {
            return NextResponse.json({ error: "Forbidden: You do not have permission to update assemblies." }, { status: 403 });
        }

        // --- Restore User Record Check ---
        const user = await prisma.user.findUnique({ where: { userId } });
        if (!user) {
            // This case should ideally not happen if Supabase auth passes, but good practice
            return NextResponse.json({ error: "User record not found in database." }, { status: 404 });
        }
        if (user.role === Role.PENDING_APPROVAL) {
            return NextResponse.json({ error: "Forbidden: Your account is pending approval." }, { status: 403 });
        }
        // --- End Restore User Record Check ---

        const json: AssemblyUpdateInput = await req.json();
        const { status, notes, completionTime, selectedBatches } = json;

        // --- Fetch Existing Assembly ---
        const assembly = await prisma.assembly.findUnique({
            where: { id: params.id },
            include: {
                product: {
                    include: {
                        bomComponents: {
                            include: {
                                component: true
                            }
                        }
                    }
                },
                _count: {
                    select: { assemblyComponentBatches: true }
                }
            }
        });

        if (!assembly) {
            return NextResponse.json({ error: "Assembly not found" }, { status: 404 });
        }
        if (!assembly.product || !assembly.product.bomComponents) {
            return NextResponse.json({ error: "Product or Bill of Materials not found for this assembly" }, { status: 404 });
        }

        // Determine if components/batches should be processed
        const isCompleting = (status === AssemblyStatus.PASSED_QC || status === AssemblyStatus.FAILED_QC) && assembly.status === AssemblyStatus.IN_PROGRESS;
        // Check if batches have already been processed using the fetched count
        const batchesAlreadyProcessed = assembly._count.assemblyComponentBatches > 0;
        // Process batches if completing, not already processed, and batches are provided
        const shouldProcessBatches = isCompleting && !batchesAlreadyProcessed && selectedBatches && selectedBatches.length > 0;

        // --- Start Transaction ---
        const updatedAssemblyData = await prisma.$transaction(async (tx) => {

            // 1. Update Assembly Status/Notes/Completion Time
            await tx.assembly.update({
                where: { id: params.id },
                data: {
                    status: status || assembly.status,
                    notes: notes !== undefined ? notes : assembly.notes,
                    completionTime: completionTime ? new Date(completionTime) :
                        (isCompleting ? new Date() : assembly.completionTime)
                },
            });

            // 2. Process Selected Batches (Link AssemblyComponentBatch, Decrement StockBatch) - ONLY IF COMPLETING & NOT ALREADY DONE
            if (shouldProcessBatches) {
                // Get the Product's BOM for quantity validation
                interface BomItem {
                    componentId: string;
                    quantity: number;
                    component: Component | null;
                }
                const bomMap = new Map(assembly.product.bomComponents.map((item: BomItem) => [item.componentId, item.quantity]));

                // Validate selected batches and stock before proceeding
                for (const batchInput of selectedBatches!) {
                    const requiredQuantity = bomMap.get(batchInput.componentId);
                    if (requiredQuantity === undefined) {
                        throw new Error(`Component ${batchInput.componentId} is not part of the BOM for product ${assembly.productId}`);
                    }

                    const stockBatch = await tx.stockBatch.findUnique({
                        where: { id: batchInput.batchId },
                        select: { currentQuantity: true, componentId: true, component: { select: { name: true } } }
                    });

                    if (!stockBatch) {
                        throw new Error(`Stock Batch ${batchInput.batchId} not found.`);
                    }
                    if (stockBatch.componentId !== batchInput.componentId) {
                        const expectedComponent = assembly.product.bomComponents.find((b: BomItem) => b.componentId === batchInput.componentId)?.component;
                        const expectedComponentName: string = expectedComponent?.name ?? batchInput.componentId;
                        throw new Error(`Batch ${batchInput.batchId} (${stockBatch.component?.name ?? 'Unknown Component'}) is for the wrong component. Expected: ${expectedComponentName}`);
                    }
                    // Validate quantity used from THIS batch doesn't exceed batch stock
                    if (stockBatch.currentQuantity < batchInput.quantityUsed) {
                        throw new Error(`Not enough stock in batch ${batchInput.batchId} for component ${stockBatch.component?.name ?? batchInput.componentId}. Required from batch: ${batchInput.quantityUsed}, Available in batch: ${stockBatch.currentQuantity}`);
                    }
                } // End preliminary validation loop

                // Aggregate quantities per component from selected batches
                const quantityUsedPerComponent = selectedBatches!.reduce((acc, batch: SelectedBatchInput) => {
                    acc.set(batch.componentId, (acc.get(batch.componentId) || 0) + batch.quantityUsed);
                    return acc;
                }, new Map<string, number>());

                // Validate aggregated quantities against BOM
                for (const [componentId, bomQuantity] of bomMap.entries()) {
                    const totalUsed = quantityUsedPerComponent.get(String(componentId)) || 0;
                    if (totalUsed !== bomQuantity) {
                        const componentDetails = assembly.product.bomComponents.find((b: BomItem) => b.componentId === componentId)?.component;
                        const componentIdentifier: string = componentDetails?.name ?? String(componentId);
                        throw new Error(`Incorrect total quantity used for component ${componentIdentifier}. BOM requires: ${bomQuantity}, Selected Batches Total: ${totalUsed}`);
                    }
                }

                // Create AssemblyComponentBatch records and update StockBatch stock
                const batchProcessingPromises = selectedBatches!.map(batchInput => [
                    tx.assemblyComponentBatch.create({
                        data: {
                            assemblyId: params.id,
                            componentId: batchInput.componentId,
                            stockBatchId: batchInput.batchId,
                            quantityUsed: batchInput.quantityUsed,
                        }
                    }),
                    tx.stockBatch.update({
                        where: { id: batchInput.batchId },
                        data: {
                            currentQuantity: { decrement: batchInput.quantityUsed }
                        }
                    })
                ]);

                // Flatten the array of promises and execute
                await Promise.all(batchProcessingPromises.flat());

            } // End batch processing block

            // Refetch the updated assembly with assemblyComponentBatches included for the response
            const finalAssemblyData = await tx.assembly.findUnique({
                where: { id: params.id },
                include: {
                    product: true,
                    assembledBy: { select: { id: true, name: true } },
                    assemblyComponentBatches: {
                        include: {
                            stockBatch: { include: { component: true } },
                        }
                    }
                }
            });
            if (!finalAssemblyData) throw new Error("Failed to refetch assembly after update."); // Should not happen
            return finalAssemblyData;

        }); // --- End Transaction ---

        return NextResponse.json(updatedAssemblyData);

    } catch (error) {
        console.error("Error updating assembly:", error);
        const message = error instanceof Error ? error.message : "Failed to update assembly";
        const statusCode = message.includes("stock") || message.includes("BOM") || message.includes("Batch") || message.includes("quantity used") || message.includes("wrong component") || message.includes("pending approval") ? 400 : // Adjusted for pending approval potentially being a 400/403 scenario
            message.includes("Forbidden") ? 403 :
                message.includes("not found") ? 404 : 500;
        return NextResponse.json(
            { error: message },
            { status: statusCode }
        );
    }
}

// DELETE: Delete an assembly
export async function DELETE(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const supabase = await createClient();
        const { data: { user: authUser } } = await supabase.auth.getUser();
        const userId = authUser?.id;

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const isAuthorized = await checkUserRole(userId, ROLES.DELETE_ASSEMBLIES);
        if (!isAuthorized) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const returnsCount = await prisma.return.count({
            where: { assemblyId: params.id }
        });

        if (returnsCount > 0) {
            return NextResponse.json(
                { error: "Cannot delete assembly because it has associated returns" },
                { status: 409 }
            );
        }

        await prisma.$transaction(async (tx) => {
            const assemblyComponents = await tx.assemblyComponent.findMany({
                where: { assemblyId: params.id }
            });

            // Find assembly BEFORE deleting components
            const assembly = await tx.assembly.findUnique({
                where: { id: params.id }
            });

            // Only increment stock if assembly was IN_PROGRESS and components were linked
            if (assembly && assembly.status === AssemblyStatus.IN_PROGRESS && assemblyComponents.length > 0) {
                // Gather component IDs and quantities
                const stockIncrements: Record<string, number> = {};
                for (const ac of assemblyComponents) {
                    stockIncrements[ac.componentId] = (stockIncrements[ac.componentId] || 0) + ac.quantity;
                }
                // Increment stock for each component
                for (const [componentId, quantity] of Object.entries(stockIncrements)) {
                    await tx.component.update({
                        where: { id: componentId },
                        data: { currentQuantity: { increment: quantity } }
                    });
                }
            }

            // Delete linked assembly components first
            await tx.assemblyComponent.deleteMany({
                where: { assemblyId: params.id }
            });

            // Then delete the assembly
            await tx.assembly.delete({
                where: { id: params.id }
            });
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting assembly:", error);
        return NextResponse.json(
            { error: "Failed to delete assembly" },
            { status: 500 }
        );
    }
}