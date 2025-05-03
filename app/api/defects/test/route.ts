import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Define a type for the combined defect format
interface CombinedDefect {
  id: string;
  componentId: string;
  component: {
    id: string;
    name: string;
    sku: string;
    category: string;
  };
  reportedById: string;
  reportedBy: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  severity: string;
  description: string;
  status: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  source: 'INVENTORY' | 'RETURN';
}

// GET: Fetch all defects combining both direct defects and ReturnQC defects
export async function GET(req: NextRequest) {
  try {
    // Use search params for potential filtering in the future
    const url = new URL(req.url);
    const searchParams = url.searchParams;
    const filterParam = searchParams.get('filter');
    
    console.log("Combined defects endpoint called", filterParam ? `with filter: ${filterParam}` : '');
    
    // Fetch defects from the Defect model (inventory defects)
    // @ts-expect-error - Prisma client methods
    const defects = await prisma.defect.findMany({
      include: {
        component: {
          select: {
            id: true,
            name: true,
            sku: true,
            category: true
          }
        },
        reportedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      },
      orderBy: [
        { createdAt: "desc" }
      ]
    });
    
    // Fetch defects from the ReturnQCDefect model (return QC defects)
    // @ts-expect-error - Prisma client methods
    const returnQCDefects = await prisma.returnQCDefect.findMany({
      include: {
        component: {
          select: {
            id: true,
            name: true,
            sku: true,
            category: true
          }
        },
        qc: {
          include: {
            qcBy: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true
              }
            }
          }
        }
      },
      orderBy: [
        { createdAt: "desc" }
      ]
    });
    
    // Transform ReturnQCDefects to match the Defect model format
    const transformedReturnDefects: CombinedDefect[] = returnQCDefects.map((returnDefect: any) => ({
      id: returnDefect.id,
      componentId: returnDefect.componentId,
      component: returnDefect.component,
      reportedById: returnDefect.qc.qcBy.id,
      reportedBy: returnDefect.qc.qcBy,
      severity: returnDefect.severity.toString(), 
      description: returnDefect.description,
      status: "OPEN", // Default status for now
      createdAt: returnDefect.createdAt,
      updatedAt: returnDefect.updatedAt,
      // Add a field to indicate the source
      source: "RETURN"
    }));
    
    // Add source field to inventory defects
    const transformedInventoryDefects: CombinedDefect[] = defects.map((defect: any) => {
      // Check if the description starts with [INVENTORY] and clean it if it does
      let description = defect.description;
      let source: 'INVENTORY' | 'RETURN' = "INVENTORY";
      
      if (description.startsWith("[INVENTORY]")) {
        description = description.replace("[INVENTORY] ", "");
      } else {
        // If it doesn't have the prefix, we'll assume it's a return defect
        source = "RETURN";
      }
      
      return {
        ...defect,
        description,
        source,
        // Ensure severity and status are strings
        severity: defect.severity.toString(),
        status: defect.status.toString()
      };
    });
    
    // Combine both arrays
    const combinedDefects = [...transformedInventoryDefects, ...transformedReturnDefects];
    
    // Sort by createdAt date, newest first
    combinedDefects.sort((a, b) => {
      const dateA = typeof a.createdAt === 'string' ? new Date(a.createdAt) : a.createdAt;
      const dateB = typeof b.createdAt === 'string' ? new Date(b.createdAt) : b.createdAt;
      return dateB.getTime() - dateA.getTime();
    });
    
    console.log(`Found ${combinedDefects.length} total defects (${defects.length} inventory, ${returnQCDefects.length} returns)`);
    
    return NextResponse.json({
      success: true,
      count: combinedDefects.length,
      defects: combinedDefects
    });
  } catch (error) {
    console.error("Error fetching combined defects:", error);
    return NextResponse.json(
      { error: "Failed to fetch defects", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
} 