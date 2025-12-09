import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { checkUserRole } from "@/lib/roleCheck";

// Define allowed roles
const ROLES = {
    VIEW_ASSEMBLIES: [Role.ADMIN, Role.ASSEMBLER, Role.RETURN_QC, Role.SERVICE_PERSON],
};

// GET: Fetch component details for a specific assembly
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
            return NextResponse.json(
                { error: "Forbidden: You do not have permission to view assembly details." },
                { status: 403 }
            );
        }

        const assemblyId = params.id;

        // Fetch assembly component batches with component and batch details
        const assemblyComponents = await prisma.assemblyComponentBatch.findMany({
            where: {
                assemblyId: assemblyId,
            },
            include: {
                component: true,
                stockBatch: {
                    include: {
                        vendor: true,
                    },
                },
            },
        });

        // Format the response
        const formattedComponents = assemblyComponents.map((item) => ({
            id: item.componentId,
            name: item.component.name,
            sku: item.component.sku,
            category: item.component.category,
            batchNumber: item.stockBatch.batchNumber,
            vendor: item.stockBatch.vendor.name,
            quantityUsed: item.quantityUsed,
        }));

        return NextResponse.json(formattedComponents);
    } catch (error) {
        console.error("Error fetching assembly components:", error);
        return NextResponse.json(
            { error: "Failed to fetch assembly components" },
            { status: 500 }
        );
    }
}