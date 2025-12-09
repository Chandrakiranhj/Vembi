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
        const query = searchParams.get('q');

        if (!query || query.length < 2) {
            return NextResponse.json([]);
        }

        const searchQuery = {
            contains: query,
            mode: 'insensitive' as const
        };

        // Parallel search across multiple entities
        const [batches, components, products, returns, assemblies] = await Promise.all([
            // 1. Batches
            prisma.stockBatch.findMany({
                where: { batchNumber: searchQuery },
                take: 5,
                include: { component: true }
            }),
            // 2. Components
            prisma.component.findMany({
                where: {
                    OR: [
                        { name: searchQuery },
                        { sku: searchQuery }
                    ]
                },
                take: 5
            }),
            // 3. Products
            prisma.product.findMany({
                where: {
                    OR: [
                        { name: searchQuery },
                        { modelNumber: searchQuery }
                    ]
                },
                take: 5
            }),
            // 4. Returns
            prisma.return.findMany({
                where: {
                    OR: [
                        { serialNumber: searchQuery },
                        { reason: searchQuery }
                    ]
                },
                take: 5
            }),
            // 5. Assemblies
            prisma.assembly.findMany({
                where: { serialNumber: searchQuery },
                take: 5,
                include: { product: true }
            })
        ]);

        // Format results
        const results = [
            ...batches.map(b => ({
                id: b.id,
                type: 'batch',
                label: `Batch ${b.batchNumber}`,
                subLabel: b.component.name,
                metadata: { componentId: b.componentId }
            })),
            ...components.map(c => ({
                id: c.id,
                type: 'component',
                label: c.name,
                subLabel: c.sku
            })),
            ...products.map(p => ({
                id: p.id,
                type: 'product',
                label: p.name,
                subLabel: p.modelNumber
            })),
            ...assemblies.map(a => ({
                id: a.id,
                type: 'assembly',
                label: `Assembly ${a.serialNumber}`,
                subLabel: a.product.name
            })),
            ...returns.map(r => ({
                id: r.id,
                type: 'return',
                label: `Return #${r.serialNumber}`,
                subLabel: r.status
            }))
        ];

        return NextResponse.json(results);

    } catch (error) {
        console.error("Error searching analytics:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
