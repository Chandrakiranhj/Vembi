import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuth } from "@clerk/nextjs/server";
import { Role, Prisma } from "@prisma/client";
import { checkUserRole } from "@/lib/roleCheck";

// Define allowed roles
const ROLES = {
  VIEW_PRODUCTS: [Role.ADMIN, Role.ASSEMBLER, Role.RETURN_QC, Role.SERVICE_PERSON],
  MANAGE_PRODUCTS: [Role.ADMIN], // Only ADMIN can create/update/delete
};

// GET: Fetch all products
export async function GET(req: NextRequest) {
  try {
    const { userId } = await getAuth(req);
    const isAuthorized = await checkUserRole(userId, ROLES.VIEW_PRODUCTS);
    if (!isAuthorized) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to view products." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");
    
    const whereClause: Prisma.ProductWhereInput = {};
    
    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { modelNumber: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    const products = await prisma.product.findMany({
      where: whereClause,
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { 
            assemblies: true,
            returns: true
          }
        }
      }
    });
    
    return NextResponse.json(products);
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}

// POST: Create a new product
export async function POST(req: NextRequest) {
  try {
    const { userId } = await getAuth(req);
    const isAuthorized = await checkUserRole(userId, ROLES.MANAGE_PRODUCTS);
    if (!isAuthorized) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to create products." }, { status: 403 });
    }

    const json = await req.json();
    const { modelNumber, name, description, specifications } = json;
    
    if (!modelNumber || !name) {
      return NextResponse.json(
        { error: "Model number and name are required" },
        { status: 400 }
      );
    }
    
    const existingProduct = await prisma.product.findUnique({
      where: { modelNumber }
    });
    
    if (existingProduct) {
      return NextResponse.json(
        { error: "A product with this model number already exists" },
        { status: 409 }
      );
    }
    
    const product = await prisma.product.create({
      data: {
        modelNumber,
        name,
        description,
        specifications: specifications || {}
      }
    });
    
    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error("Error creating product:", error);
    return NextResponse.json(
      { error: "Failed to create product" },
      { status: 500 }
    );
  }
} 