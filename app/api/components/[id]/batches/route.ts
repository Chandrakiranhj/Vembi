import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const batches = await prisma.stockBatch.findMany({
            where: {
                componentId: params.id,
                currentQuantity: {
                    gt: 0
                }
            },
            select: {
                id: true,
                batchNumber: true,
                currentQuantity: true,
                currentQuantity: true,
                expiryDate: true,
                invoiceImage: true
            },
            orderBy: {
                createdAt: 'asc' // FIFO
            }
        });

        return NextResponse.json(batches);
    } catch (error) {
        console.error('Error fetching batches:', error);
        return NextResponse.json(
            { error: 'Failed to fetch batches' },
            { status: 500 }
        );
    }
}
