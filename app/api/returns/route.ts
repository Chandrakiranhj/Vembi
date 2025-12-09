import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

// Define allowed roles
const ALLOWED_ROLES = [Role.ADMIN, Role.RETURN_QC];

// GET: Fetch all returns with optional filtering
export async function GET(req: NextRequest) {
  try {
    // Verify the request is authenticated
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    const userId = authUser?.id;

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Please sign in again" },
        { status: 401 }
      );
    }

    // Get all returns
    const returns = await prisma.return.findMany({
      include: {
        assembly: {
          include: {
            product: true
          }
        },
        product: true,
        loggedBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        qc: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({
      success: true,
      returns,
    });
  } catch (error) {
    console.error("Error fetching returns:", error);
    return NextResponse.json(
      { error: "Internal server error", message: "Failed to fetch returns" },
      { status: 500 }
    );
  }
}

// POST: Create a new return
export async function POST(req: NextRequest) {
  try {
    // Verify the request is authenticated
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    const userId = authUser?.id;

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Please sign in again" },
        { status: 401 }
      );
    }

    // Parse the request body
    const { serialNumber, reason } = await req.json();

    // Validate input
    if (!serialNumber || !reason) {
      return NextResponse.json(
        { error: "Missing required fields", message: "Serial number and reason are required" },
        { status: 400 }
      );
    }

    // Check if assembly exists
    const assembly = await prisma.assembly.findFirst({
      where: {
        serialNumber: {
          equals: serialNumber,
          mode: 'insensitive'
        }
      },
      include: {
        product: true
      }
    });

    if (!assembly) {
      return NextResponse.json(
        { error: "Assembly not found", message: "Invalid serial number" },
        { status: 404 }
      );
    }

    // Get the internal user ID from the Supabase userId
    const user = await prisma.user.findFirst({
      where: { userId: userId },
      select: { id: true }
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found", message: "User not found in database" },
        { status: 404 }
      );
    }

    // Create the return record
    const returnRecord = await prisma.return.create({
      data: {
        serialNumber: assembly.serialNumber,
        reason,
        modelNumber: assembly.product.modelNumber,
        loggedById: user.id,
        assemblyId: assembly.id,
        productId: assembly.product.id,
      },
      include: {
        assembly: {
          include: {
            product: true
          }
        },
        product: true,
        loggedBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
      },
    });

    return NextResponse.json({
      success: true,
      return: returnRecord,
    });
  } catch (error) {
    console.error("Error creating return:", error);
    return NextResponse.json(
      { error: "Internal server error", message: "Failed to create return" },
      { status: 500 }
    );
  }
}