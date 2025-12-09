import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const type = searchParams.get('type');
        const id = searchParams.get('id');

        if (!type || !id) {
            return NextResponse.json({ error: "Missing type or id" }, { status: 400 });
        }

        let csvContent = "";
        let filename = `report-${type}-${id}.csv`;

        if (type === 'batch') {
            const batch = await prisma.stockBatch.findUnique({
                where: { id },
                include: { component: true, vendor: true }
            });

            if (!batch) return NextResponse.json({ error: "Not found" }, { status: 404 });

            const defects = await prisma.returnQCDefect.findMany({
                where: { batchId: id },
                include: { qc: { include: { return: true } } }
            });

            filename = `batch-report-${batch.batchNumber}.csv`;
            csvContent = "Return ID,Date,Defect Description,Severity,Resolution\n";

            defects.forEach(d => {
                csvContent += `${d.qc.return.serialNumber},${d.createdAt.toISOString()},"${d.description}",${d.severity},${d.resolution}\n`;
            });
        } else if (type === 'component') {
            const component = await prisma.component.findUnique({ where: { id } });
            if (!component) return NextResponse.json({ error: "Not found" }, { status: 404 });

            const batches = await prisma.stockBatch.findMany({
                where: { componentId: id },
                include: { vendor: true }
            });

            filename = `component-report-${component.sku}.csv`;
            csvContent = "Batch Number,Vendor,Initial Qty,Current Qty,Received Date\n";

            batches.forEach(b => {
                csvContent += `${b.batchNumber},"${b.vendor.name}",${b.initialQuantity},${b.currentQuantity},${b.dateReceived.toISOString()}\n`;
            });
        } else if (type === 'product') {
            const product = await prisma.product.findUnique({ where: { id } });
            if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });

            const returns = await prisma.return.findMany({
                where: { productId: id }
            });

            filename = `product-report-${product.modelNumber}.csv`;
            csvContent = "Return ID,Date,Status,Reason\n";

            returns.forEach(r => {
                csvContent += `${r.serialNumber},${r.createdAt.toISOString()},${r.status},"${r.reason}"\n`;
            });
        }

        return new NextResponse(csvContent, {
            headers: {
                'Content-Type': 'text/csv',
                'Content-Disposition': `attachment; filename="${filename}"`,
            },
        });

    } catch (error) {
        console.error("Error exporting report:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
