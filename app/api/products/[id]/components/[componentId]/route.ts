import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { checkUserRole } from "@/lib/roleCheck";

// Define allowed roles
const ROLES = {
  MANAGE_BOM: [Role.ADMIN],
};

// PUT: Update the required quantity of a component for a product (Admin Only)
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string, componentId: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    const userId = authUser?.id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isAuthorized = await checkUserRole(userId, ROLES.MANAGE_BOM);
    if (!isAuthorized) {
      return NextResponse.json({ error: "Forbidden: Only admins can modify product components." }, { status: 403 });
    }

    const json = await req.json();
    const { quantityRequired } = json;

    if (quantityRequired === undefined || quantityRequired <= 0) {
      return NextResponse.json(
        { error: "A positive quantityRequired is required" },
        { status: 400 }
      );
    }

    // Use updateMany for potentially better performance if the record might not exist,
    // although findUnique + update is also fine.
    const updateResult = await prisma.productComponent.updateMany({
      where: {
        productId: params.id,
        componentId: params.componentId,
      },
      data: {
        quantityRequired: quantityRequired,
      },
    });

    if (updateResult.count === 0) {
      return NextResponse.json(
        { error: "Product component requirement not found" },
        { status: 404 }
      );
    }

    // Fetch the updated record to return it (optional, but good practice)
    const updatedRecord = await prisma.productComponent.findUnique({
      where: {
        productId_componentId: { productId: params.id, componentId: params.componentId }
      },
      include: { component: true }
    });

    return NextResponse.json(updatedRecord);

  } catch (error) {
    console.error("Error updating product component:", error);
    return NextResponse.json(
      { error: "Failed to update component requirement" },
      { status: 500 }
    );
  }
}

// DELETE: Remove a component requirement from a product (Admin Only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string, componentId: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    const userId = authUser?.id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isAuthorized = await checkUserRole(userId, ROLES.MANAGE_BOM);
    if (!isAuthorized) {
      return NextResponse.json({ error: "Forbidden: Only admins can modify product components." }, { status: 403 });
    }

    // Use deleteMany for consistency and potentially better performance
    const deleteResult = await prisma.productComponent.deleteMany({
      where: {
        productId: params.id,
        componentId: params.componentId,
      },
    });

    if (deleteResult.count === 0) {
      return NextResponse.json(
        { error: "Product component requirement not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Error deleting product component:", error);
    return NextResponse.json(
      { error: "Failed to delete component requirement" },
      { status: 500 }
    );
  }
}