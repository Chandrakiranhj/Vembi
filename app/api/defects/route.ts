import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuth } from "@clerk/nextjs/server";
import { Role, Prisma } from "@prisma/client";
import { checkUserRole } from "@/lib/roleCheck";

// Define allowed roles
const ROLES = {
  VIEW_DEFECTS: [Role.ADMIN, Role.ASSEMBLER, Role.RETURN_QC, Role.SERVICE_PERSON],
  CREATE_DEFECTS: [Role.ADMIN, Role.ASSEMBLER, Role.RETURN_QC, Role.SERVICE_PERSON],
  MODIFY_DEFECTS: [Role.ADMIN, Role.SERVICE_PERSON],
  DELETE_DEFECTS: [Role.ADMIN],
};

// GET: Fetch all defects with optional filtering
export async function GET(req: NextRequest) {
  try {
    const { userId } = await getAuth(req);
    const isAuthorized = await checkUserRole(userId, ROLES.VIEW_DEFECTS);
    if (!isAuthorized) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to view defects." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const severity = searchParams.get("severity");
    const componentId = searchParams.get("componentId");
    const search = searchParams.get("search");
    
    const whereClause: Prisma.DefectWhereInput = {};
    
    if (status) {
      whereClause.status = status as Prisma.DefectWhereInput['status'];
    }
    
    if (severity) {
      whereClause.severity = severity as Prisma.DefectWhereInput['severity'];
    }
    
    if (componentId) {
      whereClause.componentId = componentId;
    }
    
    if (search) {
      whereClause.OR = [
        { description: { contains: search, mode: 'insensitive' } },
        { resolution: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    const defects = await prisma.defect.findMany({
      where: whereClause,
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
    
    return NextResponse.json(defects);
  } catch (error) {
    console.error("Error fetching defects:", error);
    return NextResponse.json(
      { error: "Failed to fetch defects" },
      { status: 500 }
    );
  }
}

// POST: Create a new defect
export async function POST(req: NextRequest) {
  try {
    const { userId } = await getAuth(req);
    const isAuthorized = await checkUserRole(userId, ROLES.CREATE_DEFECTS);
    if (!isAuthorized) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to create defects." }, { status: 403 });
    }

    if (!userId) {
       return NextResponse.json({ error: "Unauthorized: User ID is missing." }, { status: 401 });
    }

    const user = await prisma.user.findFirst({
      where: { userId }
    });
    
    if (!user) {
      return NextResponse.json(
        { error: "User not found in database" },
        { status: 404 }
      );
    }
    
    if (user.role === "PENDING_APPROVAL") {
      return NextResponse.json({ error: "Forbidden: Your account is pending approval." }, { status: 403 });
    }

    const json = await req.json();
    const { 
      componentId, 
      severity, 
      description,
      images,
    } = json;
    
    if (!componentId || !description) {
      return NextResponse.json(
        { error: "Component ID and description are required" },
        { status: 400 }
      );
    }
    
    const component = await prisma.component.findUnique({
      where: { id: componentId }
    });
    
    if (!component) {
      return NextResponse.json(
        { error: "Component not found" },
        { status: 404 }
      );
    }
    
    const defect = await prisma.defect.create({
      data: {
        componentId,
        reportedById: user.id,
        severity: severity || "MEDIUM",
        description,
        status: "OPEN",
        images: images || []
      }
    });
    
    return NextResponse.json(defect, { status: 201 });
  } catch (error) {
    console.error("Error creating defect:", error);
    return NextResponse.json(
      { error: "Failed to create defect" },
      { status: 500 }
    );
  }
} 