import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const batchId = params.id;
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // 1. Batch Details
        const batch = await prisma.stockBatch.findUnique({
            where: { id: batchId },
            include: {
                component: true,
                vendor: true
            }
        });

        if (!batch) {
            return NextResponse.json({ error: "Batch not found" }, { status: 404 });
        }

        // 2. Defect Stats
        const defects = await prisma.returnQCDefect.findMany({
            where: { batchId: batchId },
            include: {
                qc: {
                    include: {
                        return: true
                    }
                }
            }
        });

        const totalDefects = defects.length;
        const defectRate = batch.initialQuantity > 0
            ? (totalDefects / batch.initialQuantity) * 100
            : 0;

        // Severity Breakdown
        const severityCounts: Record<string, number> = {};
        defects.forEach(d => {
            severityCounts[d.severity] = (severityCounts[d.severity] || 0) + 1;
        });

        // 3. Usage Stats
        const quantityUsed = batch.initialQuantity - batch.currentQuantity;
        const percentUsed = batch.initialQuantity > 0
            ? (quantityUsed / batch.initialQuantity) * 100
            : 0;

        // 4. Associated Returns (where this batch was found defective)
        const associatedReturns = defects.map(d => ({
            id: d.qc.return.id,
            serialNumber: d.qc.return.serialNumber,
            date: d.qc.return.createdAt,
            defectDescription: d.description,
            severity: d.severity,
            resolution: d.resolution
        }));

        return NextResponse.json({
            details: {
                id: batch.id,
                batchNumber: batch.batchNumber,
                componentName: batch.component.name,
                sku: batch.component.sku,
                vendorName: batch.vendor.name,
                receivedDate: batch.dateReceived,
                expiryDate: batch.expiryDate
            },
            inventory: {
                initial: batch.initialQuantity,
                current: batch.currentQuantity,
                used: quantityUsed,
                percentUsed: parseFloat(percentUsed.toFixed(1))
            },
            quality: {
                totalDefects,
                defectRate: parseFloat(defectRate.toFixed(2)),
                severityBreakdown: severityCounts
            },
            returns: associatedReturns
        });

    } catch (error) {
        console.error("Error fetching batch report:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
