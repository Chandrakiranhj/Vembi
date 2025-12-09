import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const productId = params.id;
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // 1. Product Details
        const product = await prisma.product.findUnique({
            where: { id: productId }
        });

        if (!product) {
            return NextResponse.json({ error: "Product not found" }, { status: 404 });
        }

        // 2. Return Stats
        const returns = await prisma.return.findMany({
            where: { productId: productId },
            include: {
                qc: {
                    include: {
                        defects: {
                            include: {
                                component: true
                            }
                        }
                    }
                }
            }
        });

        const totalReturns = returns.length;

        // 3. Defect Analysis (Top Defective Components)
        const componentDefects: Record<string, { name: string, count: number }> = {};

        returns.forEach(r => {
            if (r.qc && r.qc.defects) {
                r.qc.defects.forEach(d => {
                    const compId = d.componentId;
                    if (!componentDefects[compId]) {
                        componentDefects[compId] = { name: d.component.name, count: 0 };
                    }
                    componentDefects[compId].count++;
                });
            }
        });

        const topDefectiveComponents = Object.values(componentDefects)
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        // 4. Return Reasons
        const reasons: Record<string, number> = {};
        returns.forEach(r => {
            reasons[r.reason] = (reasons[r.reason] || 0) + 1;
        });

        return NextResponse.json({
            details: {
                id: product.id,
                name: product.name,
                modelNumber: product.modelNumber,
                description: product.description
            },
            stats: {
                totalReturns,
                topDefectiveComponents,
                commonReasons: reasons
            }
        });

    } catch (error) {
        console.error("Error fetching product report:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
