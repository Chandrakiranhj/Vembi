import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuth } from "@clerk/nextjs/server";
import { Role, Prisma } from "@prisma/client";
import { checkUserRole } from "@/lib/roleCheck";

// Helper function to check authorization (can be moved to a lib file)
// async function checkUserRole(userId: string, allowedRoles: Role[]): Promise<boolean> {
//   if (!userId) return false;
//   const user = await prisma.user.findFirst({
//     where: { userId },
//     select: { role: true }
//   });
//   return user ? allowedRoles.includes(user.role) : false;
// }

// Define allowed roles for different actions
const ROLES = {
  VIEW_COMPONENTS: [Role.ADMIN, Role.ASSEMBLER, Role.RETURN_QC, Role.SERVICE_PERSON],
  CREATE_COMPONENTS: [Role.ADMIN, Role.ASSEMBLER], // Admins and Assemblers can add
  MODIFY_COMPONENTS: [Role.ADMIN], // Only Admins can modify (for now)
};

// GET: Fetch all components with optional filtering and total stock
export async function GET(req: NextRequest) {
  try {
    const { userId } = await getAuth(req);
    // Use checkUserRole utility
    const isAuthorized = await checkUserRole(userId, ROLES.VIEW_COMPONENTS);
    if (!isAuthorized) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to view components." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const search = searchParams.get("search");
    const includeStockBatches = searchParams.get("includeStockBatches") === "true";
    
    // Create where clause for prisma query - use Prisma.ComponentWhereInput type
    const whereClause: Prisma.ComponentWhereInput = {}; 
    
    if (category && category !== "All") {
      whereClause.category = category;
    }
    
    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    if (includeStockBatches) {
      // If stock batches are requested, include them directly in the query
      const componentsWithBatches = await prisma.component.findMany({
        where: whereClause,
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
            orderBy: {
              dateReceived: 'desc'
            }
          }
        },
        orderBy: { name: 'asc' }
      });
      
      return NextResponse.json(componentsWithBatches);
    } else {
      // Standard behavior without stock batches
      // Fetch components without including stockBatches in the main query
      const components = await prisma.component.findMany({
        where: whereClause,
        orderBy: { name: "asc" },
      });

      // Separately fetch stock batches to calculate total stock
      const stockBatches = await prisma.stockBatch.findMany({
        where: {
          componentId: {
            in: components.map(comp => comp.id)
          }
        },
        select: {
          componentId: true,
          currentQuantity: true
        }
      });

      // Calculate total stock for each component
      const stockByComponent = stockBatches.reduce((acc, batch) => {
        if (!acc[batch.componentId]) {
          acc[batch.componentId] = 0;
        }
        acc[batch.componentId] += batch.currentQuantity;
        return acc;
      }, {} as Record<string, number>);
      
      // Add total stock to each component
      const componentsWithTotalStock = components.map(component => {
        return { 
          ...component,
          totalStock: stockByComponent[component.id] || 0
        };
      });
      
      return NextResponse.json(componentsWithTotalStock);
    }
  } catch (error) {
    console.error("Error fetching components:", error);
    return NextResponse.json(
      { error: "Failed to fetch components" },
      { status: 500 }
    );
  }
}

// POST: Create a new component
export async function POST(req: NextRequest) {
  try {
    const { userId } = await getAuth(req);
    // Use checkUserRole utility
    const isAuthorized = await checkUserRole(userId, ROLES.CREATE_COMPONENTS);
     if (!isAuthorized) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to create components." }, { status: 403 });
    }

    const json = await req.json();
    // Remove currentQuantity from destructuring
    const { name, sku, description, category, minimumQuantity, unitPrice } = json; 
    
    // Validate required fields
    if (!name || !sku || !category) {
      return NextResponse.json(
        { error: "Name, SKU, and category are required" },
        { status: 400 }
      );
    }
    
    // Check if SKU already exists
    const existingComponent = await prisma.component.findUnique({
      where: { sku }
    });
    
    if (existingComponent) {
      return NextResponse.json(
        { error: "A component with this SKU already exists" },
        { status: 409 }
      );
    }
    
    const component = await prisma.component.create({
      data: {
        name,
        sku,
        description,
        category,
        // currentQuantity removed
        minimumQuantity: minimumQuantity === undefined ? 10 : Number(minimumQuantity), // Set default or use provided
        unitPrice: unitPrice === undefined ? null : Number(unitPrice) // Set default or use provided
      }
    });
    
    return NextResponse.json(component, { status: 201 });
  } catch (error) {
    console.error("Error creating component:", error);
    return NextResponse.json(
      { error: "Failed to create component" },
      { status: 500 }
    );
  }
} 