import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: Request,
  { params }: { params: { serialNumber: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();

    if (!authUser) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { serialNumber } = params;

    // Check if the serial number exists in assemblies - use case insensitive search
    const assembly = await prisma.assembly.findFirst({
      where: {
        serialNumber: {
          equals: serialNumber,
          mode: 'insensitive'
        },
      },
      select: {
        id: true,
        serialNumber: true,
        product: {
          select: {
            modelNumber: true,
            name: true,
          },
        },
      },
    });

    if (!assembly) {
      return new NextResponse('Serial number not found', { status: 404 });
    }

    return NextResponse.json({
      id: assembly.id,
      serialNumber: assembly.serialNumber,
      modelNumber: assembly.product.modelNumber,
      productName: assembly.product.name,
    });
  } catch (error) {
    console.error('Error verifying serial number:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}