import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { Role } from "@prisma/client";
import { checkUserRole } from "@/lib/roleCheck";

// Define allowed roles (could be imported from a shared config)
const ROLES = {
  VIEW_COMPONENTS: [Role.ADMIN, Role.ASSEMBLER, Role.RETURN_QC, Role.SERVICE_PERSON],
  MODIFY_COMPONENTS: [Role.ADMIN],
  DELETE_COMPONENTS: [Role.ADMIN],
};

// GET: Fetch a single component by ID
export async function GET(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    const userId = authUser?.id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isAuthorized = await checkUserRole(userId, ROLES.VIEW_COMPONENTS);
    if (!isAuthorized) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to view this component." }, { status: 403 });
    }

    const component = await prisma.component.findUnique({
      where: { id: params.id },
    });

    if (!component) {
      return NextResponse.json(
        { error: "Component not found" },
        { status: 404 }
      );
    }

    // Use a separate query to get batches
    const stockBatches = await prisma.stockBatch.findMany({
      where: { componentId: params.id },
      orderBy: { dateReceived: 'desc' },
      include: {
        vendor: true
      }
    });

    // Get assembly usages
    const assemblyUsages = await prisma.assemblyComponentBatch.findMany({
      where: { componentId: params.id },
      include: {
        assembly: {
          select: {
            id: true,
            serialNumber: true,
            status: true,
            createdAt: true
          }
        },
        stockBatch: {
          select: {
            batchNumber: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Get return QC defects
    const returnQCDefects = await prisma.returnQCDefect.findMany({
      where: { componentId: params.id },
      include: {
        qc: {
          include: {
            return: {
              select: {
                id: true,
                serialNumber: true,
                reason: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({
      ...component,
      stockBatches,
      assemblyUsages,
      returnQCDefects
    });
  } catch (error) {
    console.error("Error fetching component:", error);
    return NextResponse.json(
      { error: "Failed to fetch component" },
      { status: 500 }
    );
  }
}

// PUT: Update a component by ID
export async function PUT(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    const userId = authUser?.id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isAuthorized = await checkUserRole(userId, ROLES.MODIFY_COMPONENTS);
    if (!isAuthorized) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to update components." }, { status: 403 });
    }

    const json = await req.json();
    const { name, sku, description, category, minimumQuantity } = json;

    // Validate required fields
    if (!name || !sku || !category) {
      return NextResponse.json(
        { error: "Name, SKU, and category are required" },
        { status: 400 }
      );
    }

    // Check if SKU exists on different component
    const existingComponent = await prisma.component.findFirst({
      where: {
        sku,
        id: { not: params.id },
      },
    });

    if (existingComponent) {
      return NextResponse.json(
        { error: "Another component with this SKU already exists" },
        { status: 409 }
      );
    }

    const component = await prisma.component.update({
      where: { id: params.id },
      data: {
        name,
        sku,
        description,
        category,
        minimumQuantity: minimumQuantity === undefined ? undefined : Number(minimumQuantity),
      },
    });

    return NextResponse.json(component);
  } catch (error) {
    console.error("Error updating component:", error);
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
      return NextResponse.json({ error: "Component not found" }, { status: 404 });
    }
    return NextResponse.json(
      { error: "Failed to update component" },
      { status: 500 }
    );
  }
}

// DELETE: Delete a component by ID
export async function DELETE(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    const userId = authUser?.id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isAuthorized = await checkUserRole(userId, ROLES.DELETE_COMPONENTS);
    if (!isAuthorized) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to delete components." }, { status: 403 });
    }

    // Check if component is used in any Product BOMs
    const bomEntriesCount = await prisma.productComponent.count({
      where: { componentId: params.id }
    });

    // Check if component is used in any returns
    const returnsUsingComponent = await prisma.returnComponent.count({
      where: { componentId: params.id },
    });

    // Check if there are any stock batches (even if 0 quantity)
    const stockBatchesCount = await prisma.stockBatch.count({
      where: { componentId: params.id }
    });

    if (bomEntriesCount > 0 || returnsUsingComponent > 0 || stockBatchesCount > 0) {
      const errors: string[] = [];
      if (bomEntriesCount > 0) errors.push(`used in ${bomEntriesCount} product BOM(s)`);
      if (returnsUsingComponent > 0) errors.push(`used in ${returnsUsingComponent} return(s)`);
      if (stockBatchesCount > 0) errors.push(`has ${stockBatchesCount} associated stock batch(es)`);
      return NextResponse.json(
        {
          error: `Cannot delete component because it is ${errors.join(', ')}. Please remove dependencies first.`
        },
        { status: 409 }
      );
    }

    // If no dependencies, proceed with deletion
    // Delete all defects of this component first (optional - cascade might handle this)
    await prisma.defect.deleteMany({
      where: { componentId: params.id },
    });

    // Delete the component
    await prisma.component.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting component:", error);
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
      return NextResponse.json({ error: "Component not found" }, { status: 404 });
    }
    return NextResponse.json(
      { error: "Failed to delete component" },
      { status: 500 }
    );
  }
}