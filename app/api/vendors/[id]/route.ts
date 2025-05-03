import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuth } from "@clerk/nextjs/server";
import { Role } from "@prisma/client";
import { checkUserRole } from "@/lib/roleCheck";

// Define allowed roles
const ROLES = {
  VIEW_VENDORS: [Role.ADMIN, Role.ASSEMBLER, Role.RETURN_QC, Role.SERVICE_PERSON],
  MANAGE_VENDORS: [Role.ADMIN],
};

// GET: Fetch a specific vendor by ID
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await getAuth(req);
    const isAuthorized = await checkUserRole(userId, ROLES.VIEW_VENDORS);
    if (!isAuthorized) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to view vendors." }, { status: 403 });
    }

    const vendor = await prisma.vendor.findUnique({
      where: { id: params.id }
    });

    if (!vendor) {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }

    return NextResponse.json(vendor);
  } catch (error) {
    console.error("Error fetching vendor:", error);
    return NextResponse.json(
      { error: "Failed to fetch vendor" },
      { status: 500 }
    );
  }
}

// PUT: Update a vendor
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await getAuth(req);
    const isAuthorized = await checkUserRole(userId, ROLES.MANAGE_VENDORS);
    if (!isAuthorized) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to update vendors." }, { status: 403 });
    }

    const json = await req.json();
    const { name, contactPerson, email, phone, address, notes } = json;

    // Validate required fields
    if (!name?.trim()) {
      return NextResponse.json(
        { error: "Vendor name is required" },
        { status: 400 }
      );
    }

    // Check if vendor exists
    const existingVendor = await prisma.vendor.findUnique({
      where: { id: params.id }
    });

    if (!existingVendor) {
      return NextResponse.json(
        { error: "Vendor not found" },
        { status: 404 }
      );
    }

    // Check if updated name would clash with another vendor
    const vendorWithSameName = await prisma.vendor.findFirst({
      where: { 
        name,
        id: { not: params.id }
      }
    });

    if (vendorWithSameName) {
      return NextResponse.json(
        { error: "Another vendor with this name already exists" },
        { status: 409 }
      );
    }

    // Update the vendor
    const vendor = await prisma.vendor.update({
      where: { id: params.id },
      data: {
        name,
        contactPerson,
        email,
        phone,
        address,
        notes
      }
    });

    return NextResponse.json(vendor);
  } catch (error) {
    console.error("Error updating vendor:", error);
    return NextResponse.json(
      { error: "Failed to update vendor" },
      { status: 500 }
    );
  }
}

// PATCH: Update vendor status (activate/deactivate)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await getAuth(req);
    const isAuthorized = await checkUserRole(userId, ROLES.MANAGE_VENDORS);
    if (!isAuthorized) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to update vendors." }, { status: 403 });
    }

    const json = await req.json();
    const { isActive } = json;

    // Validate required fields
    if (isActive === undefined) {
      return NextResponse.json(
        { error: "Status (isActive) field is required" },
        { status: 400 }
      );
    }

    // Check if vendor exists
    const existingVendor = await prisma.vendor.findUnique({
      where: { id: params.id }
    });

    if (!existingVendor) {
      return NextResponse.json(
        { error: "Vendor not found" },
        { status: 404 }
      );
    }

    // Update the vendor status
    const vendor = await prisma.vendor.update({
      where: { id: params.id },
      data: {
        isActive
      }
    });

    return NextResponse.json(vendor);
  } catch (error) {
    console.error("Error updating vendor status:", error);
    return NextResponse.json(
      { error: "Failed to update vendor status" },
      { status: 500 }
    );
  }
} 