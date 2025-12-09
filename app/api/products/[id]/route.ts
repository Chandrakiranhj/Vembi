import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { Role } from "@prisma/client";
import { checkUserRole } from "@/lib/roleCheck";

// Define allowed roles
const ROLES = {
  VIEW_PRODUCTS: [Role.ADMIN, Role.ASSEMBLER, Role.RETURN_QC, Role.SERVICE_PERSON],
  MANAGE_PRODUCTS: [Role.ADMIN],
};

type Params = { params: { id: string } };

// GET: Fetch a single product by ID
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    const userId = authUser?.id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isAuthorized = await checkUserRole(userId, ROLES.VIEW_PRODUCTS);
    if (!isAuthorized) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to view this product." }, { status: 403 });
    }

    const product = await prisma.product.findUnique({
      where: { id: params.id },
    });

    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error("Error fetching product:", error);
    return NextResponse.json(
      { error: "Failed to fetch product" },
      { status: 500 }
    );
  }
}

// PUT: Update a product by ID
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    const userId = authUser?.id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isAuthorized = await checkUserRole(userId, ROLES.MANAGE_PRODUCTS);
    if (!isAuthorized) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to update products." }, { status: 403 });
    }

    const json = await request.json();
    const { modelNumber, name, description, specifications } = json;

    if (!modelNumber || !name) {
      return NextResponse.json(
        { error: "Model number and name are required" },
        { status: 400 }
      );
    }

    const existingProduct = await prisma.product.findFirst({
      where: {
        modelNumber,
        id: { not: params.id },
      },
    });

    if (existingProduct) {
      return NextResponse.json(
        { error: "Another product with this model number already exists" },
        { status: 409 }
      );
    }

    const product = await prisma.product.update({
      where: { id: params.id },
      data: {
        modelNumber,
        name,
        description,
        specifications: specifications || {}
      },
    });

    return NextResponse.json(product);
  } catch (error) {
    console.error("Error updating product:", error);
    return NextResponse.json(
      { error: "Failed to update product" },
      { status: 500 }
    );
  }
}

// DELETE: Delete a product by ID
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    const userId = authUser?.id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isAuthorized = await checkUserRole(userId, ROLES.MANAGE_PRODUCTS);
    if (!isAuthorized) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to delete products." }, { status: 403 });
    }

    const assembliesUsingProduct = await prisma.assembly.count({
      where: { productId: params.id },
    });

    const returnsUsingProduct = await prisma.return.count({
      where: { productId: params.id },
    });

    if (assembliesUsingProduct > 0 || returnsUsingProduct > 0) {
      return NextResponse.json(
        {
          error: "Cannot delete product because it is used in assemblies or returns",
          assembliesCount: assembliesUsingProduct,
          returnsCount: returnsUsingProduct
        },
        { status: 409 }
      );
    }

    await prisma.product.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting product:", error);
    return NextResponse.json(
      { error: "Failed to delete product" },
      { status: 500 }
    );
  }
}