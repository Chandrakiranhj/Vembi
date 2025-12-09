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

        const vendor = await prisma.vendor.findUnique({
            where: { id },
            include: {
                stockBatches: {
                    include: {
                        returnQCDefects: true,
                        component: true
                    }
                }
            }
        });

        if (!vendor) {
            return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
        }

        // Calculate Stats
        let totalBatches = vendor.stockBatches.length;
        let totalItemsSupplied = 0;
        let totalDefects = 0;
        let totalValueSupplied = 0;

        const batchPerformance = vendor.stockBatches.map(batch => {
            const batchDefects = batch.returnQCDefects.length;
            totalItemsSupplied += batch.initialQuantity;
            totalDefects += batchDefects;
            totalValueSupplied += batch.initialQuantity * (batch.unitCost || 0);

            return {
                id: batch.id,
                batchNumber: batch.batchNumber,
                componentName: batch.component.name,
                dateReceived: batch.dateReceived,
                initialQuantity: batch.initialQuantity,
                defects: batchDefects,
                defectRate: batch.initialQuantity > 0 ? ((batchDefects / batch.initialQuantity) * 100).toFixed(2) : "0.00"
            };
        }).sort((a, b) => new Date(b.dateReceived).getTime() - new Date(a.dateReceived).getTime());

        const globalDefectRate = totalItemsSupplied > 0
            ? ((totalDefects / totalItemsSupplied) * 100).toFixed(2)
            : "0.00";

        return NextResponse.json({
            details: {
                name: vendor.name,
                contactPerson: vendor.contactPerson,
                email: vendor.email,
                phone: vendor.phone,
                address: vendor.address,
                notes: vendor.notes,
                isActive: vendor.isActive
            },
            stats: {
                totalBatches,
                totalItemsSupplied,
                totalDefects,
                globalDefectRate,
                totalValueSupplied
            },
            batches: batchPerformance
        });

    } catch (error) {
        console.error("Error fetching vendor report:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
