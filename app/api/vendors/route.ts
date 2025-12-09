import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { Role } from "@prisma/client";
import { checkUserRole } from "@/lib/roleCheck";

// Define allowed roles
const ROLES = {
  VIEW_VENDORS: [Role.ADMIN, Role.ASSEMBLER, Role.RETURN_QC, Role.SERVICE_PERSON],
  MANAGE_VENDORS: [Role.ADMIN],
};

// GET: Fetch all vendors
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    const userId = authUser?.id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isAuthorized = await checkUserRole(userId, ROLES.VIEW_VENDORS);
    if (!isAuthorized) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to view vendors." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const isActiveOnly = searchParams.get("active") === "true";

    const whereClause = isActiveOnly ? { isActive: true } : {};

    const vendors = await prisma.vendor.findMany({
      where: whereClause,
      orderBy: { name: "asc" }
    });

    return NextResponse.json({ vendors });
  } catch (error) {
    console.error("Error fetching vendors:", error);
    return NextResponse.json(
      { error: "Failed to fetch vendors" },
      { status: 500 }
    );
  }
}

// POST: Create a new vendor
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    const userId = authUser?.id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isAuthorized = await checkUserRole(userId, ROLES.MANAGE_VENDORS);
    if (!isAuthorized) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to create vendors." }, { status: 403 });
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

    // Check if vendor already exists
    const existingVendor = await prisma.vendor.findUnique({
      where: { name }
    });

    if (existingVendor) {
      return NextResponse.json(
        { error: "A vendor with this name already exists" },
        { status: 409 }
      );
    }

    // Create the new vendor
    const vendor = await prisma.vendor.create({
      data: {
        name,
        contactPerson,
        email,
        phone,
        address,
        notes,
        isActive: true
      }
    });

    return NextResponse.json(vendor, { status: 201 });
  } catch (error) {
    console.error("Error creating vendor:", error);
    return NextResponse.json(
      { error: "Failed to create vendor" },
      { status: 500 }
    );
  }
}