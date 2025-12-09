import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const componentId = params.id;
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // 1. Component Details
        const component = await prisma.component.findUnique({
            where: { id: componentId }
        });

        if (!component) {
            return NextResponse.json({ error: "Component not found" }, { status: 404 });
        }

        // 2. Aggregate Batch Stats
        const batches = await prisma.stockBatch.findMany({
            where: { componentId: componentId },
            include: {
                vendor: true
            }
        });

        const totalInitialQuantity = batches.reduce((sum, b) => sum + b.initialQuantity, 0);
        const totalCurrentQuantity = batches.reduce((sum, b) => sum + b.currentQuantity, 0);

        // 3. Aggregate Defect Stats
        const defects = await prisma.returnQCDefect.findMany({
            where: { componentId: componentId }
        });

        const totalDefects = defects.length;
        const globalDefectRate = totalInitialQuantity > 0
            ? (totalDefects / totalInitialQuantity) * 100
            : 0;

        // 4. Worst Performing Batches
        // Group defects by batchId
        const defectCounts: Record<string, number> = {};
        defects.forEach(d => {
            if (d.batchId) {
                defectCounts[d.batchId] = (defectCounts[d.batchId] || 0) + 1;
            }
        });

        const batchPerformance = batches.map(b => {
            const defects = defectCounts[b.id] || 0;
            const rate = b.initialQuantity > 0 ? (defects / b.initialQuantity) * 100 : 0;
            return {
                id: b.id,
                batchNumber: b.batchNumber,
                vendorName: b.vendor.name,
                receivedDate: b.dateReceived,
                defects,
                defectRate: parseFloat(rate.toFixed(2))
            };
        });

        // Sort by defect rate desc
        const worstBatches = batchPerformance
            .filter(b => b.defects > 0)
            .sort((a, b) => b.defectRate - a.defectRate)
            .slice(0, 5);

        return NextResponse.json({
            details: {
                id: component.id,
                name: component.name,
                sku: component.sku,
                category: component.category,
                description: component.description
            },
            inventory: {
                totalBatches: batches.length,
                totalInitial: totalInitialQuantity,
                totalCurrent: totalCurrentQuantity
            },
            quality: {
                totalDefects,
                globalDefectRate: parseFloat(globalDefectRate.toFixed(2))
            },
            worstBatches
        });

    } catch (error) {
        console.error("Error fetching component report:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
