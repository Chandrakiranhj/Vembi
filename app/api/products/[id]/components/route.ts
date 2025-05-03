import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { Role } from "@prisma/client";
import { checkUserRole } from "@/lib/roleCheck";

// Define allowed roles
const ROLES = {
  VIEW_BOM: [Role.ADMIN, Role.ASSEMBLER, Role.RETURN_QC, Role.SERVICE_PERSON], // Allow broader view access
  MANAGE_BOM: [Role.ADMIN], // Only Admin can modify
};

// GET: Fetch required components for a specific product
export async function GET(
  req: Request,
  context: { params: { id: string } }
) {
  try {
    // Add role check for viewing
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const canView = await checkUserRole(userId, ROLES.VIEW_BOM);
    if (!canView) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to view product components." }, { status: 403 });
    }

    // Check if batches should be included
    const url = new URL(req.url);
    const includeBatches = url.searchParams.get('includeBatches') === 'true';

    if (includeBatches) {
      // Fetch product components with their associated components
      const productComponents = await prisma.productComponent.findMany({
        where: { productId: context.params.id },
        include: {
          component: true
        }
      });

      // Get component IDs
      const componentIds = productComponents.map(pc => pc.componentId);

      // Fetch components with their stock batches
      const componentsWithBatches = await prisma.component.findMany({
        where: { id: { in: componentIds } },
        include: {
          stockBatches: {
            include: {
              vendor: {
                select: {
                  id: true,
                  name: true
                }
              }
            },
            where: {
              currentQuantity: {
                gt: 0
              }
            },
            orderBy: {
              dateReceived: 'desc'
            }
          }
        },
        orderBy: { name: 'asc' }
      });

      return NextResponse.json(componentsWithBatches);
    } else {
      // Original behavior - just return product components
      const productComponents = await prisma.productComponent.findMany({
        where: { productId: context.params.id },
        include: {
          component: {
            select: {
              id: true,
              name: true,
              sku: true,
              category: true,
            }
          }
        },
        orderBy: { component: { name: 'asc' } }
      });

      return NextResponse.json(productComponents);
    }

  } catch (error) {
    console.error("Error fetching product components:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to fetch product components: ${errorMessage}` },
      { status: 500 }
    );
  }
}

interface BOMItem {
  componentId: string;
  quantityRequired: number;
}

// POST: Add a component requirement to a product (Admin Only)
export async function POST(
  request: Request,
  context: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const canManage = await checkUserRole(userId, ROLES.MANAGE_BOM);
    if (!canManage) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to manage product components." }, { status: 403 });
    }

    const productId = context.params.id;
    const bomItems = await request.json() as BOMItem[];

    // Validate product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Validate all components exist
    const componentIds = bomItems.map((item) => item.componentId);
    const components = await prisma.component.findMany({
      where: { id: { in: componentIds } },
    });

    if (components.length !== componentIds.length) {
      return NextResponse.json({ error: "One or more components not found" }, { status: 404 });
    }

    // Delete existing BOM items for this product
    await prisma.productComponent.deleteMany({
      where: { productId },
    });

    // Create new BOM items
    await prisma.productComponent.createMany({
      data: bomItems.map((item) => ({
        productId,
        componentId: item.componentId,
        quantityRequired: item.quantityRequired,
      })),
    });

    return NextResponse.json({ message: "BOM updated successfully" }, { status: 200 });
  } catch (error) {
    console.error('Error updating BOM:', error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
} 