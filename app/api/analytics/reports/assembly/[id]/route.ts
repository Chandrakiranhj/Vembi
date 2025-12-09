import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;

        const assembly = await prisma.assembly.findUnique({
            where: { id },
            include: {
                product: true,
                assembledBy: true,
                assemblyComponentBatches: {
                    include: {
                        component: true,
                        stockBatch: true
                    }
                },
                returns: true
            }
        });

        if (!assembly) {
            return NextResponse.json({ error: "Assembly not found" }, { status: 404 });
        }

        // Format response
        const componentsUsed = assembly.assemblyComponentBatches.map(acb => ({
            id: acb.id,
            componentName: acb.component.name,
            sku: acb.component.sku,
            batchNumber: acb.stockBatch.batchNumber,
            quantityUsed: acb.quantityUsed,
            batchExpiry: acb.stockBatch.expiryDate
        }));

        // Timeline events (Creation, Completion, Returns)
        const timeline = [
            {
                date: assembly.startTime,
                event: "Assembly Started",
                details: `Started by ${assembly.assembledBy.name}`
            }
        ];

        if (assembly.completionTime) {
            timeline.push({
                date: assembly.completionTime,
                event: "Assembly Completed",
                details: `Status: ${assembly.status}`
            });
        }

        assembly.returns.forEach(r => {
            timeline.push({
                date: r.createdAt,
                event: "Return Initiated",
                details: `Return #${r.serialNumber} - ${r.reason}`
            });
        });

        // Sort timeline
        timeline.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        return NextResponse.json({
            details: {
                id: assembly.id,
                serialNumber: assembly.serialNumber,
                productName: assembly.product.name,
                modelNumber: assembly.product.modelNumber,
                status: assembly.status,
                assembledBy: assembly.assembledBy.name,
                notes: assembly.notes
            },
            components: componentsUsed,
            timeline
        });

    } catch (error) {
        console.error("Error fetching assembly report:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
