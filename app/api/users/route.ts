import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { Role, Prisma } from "@prisma/client"; // Import Role and Prisma

// GET: Fetch all users (admin only)
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    const userId = authUser?.id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user from database for role check
    const currentUserData = await prisma.user.findFirst({
      where: { userId }
    });

    if (!currentUserData || currentUserData.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only admins can access user data" },
        { status: 403 }
      );
    }

    // --- Role Filtering --- 
    const { searchParams } = new URL(req.url);
    const filterRole = searchParams.get("role") as Role | null;

    // Use Prisma.UserWhereInput for specific typing
    const whereClause: Prisma.UserWhereInput = {};
    if (filterRole) {
      // Check if the filterRole is a valid member of the Role enum
      if (Object.values(Role).includes(filterRole)) {
        whereClause.role = filterRole;
      } else {
        // Optional: Handle invalid role parameter, e.g., return an error or ignore it
        console.warn(`Invalid role filter provided: ${filterRole}. Ignoring filter.`);
      }
    }
    // --- End Role Filtering ---

    const users = await prisma.user.findMany({
      where: whereClause, // Apply the typed where clause
      orderBy: [
        { role: "asc" }, // Optionally sort by role
        { name: "asc" }
      ],
      select: {
        id: true,
        userId: true,
        name: true,
        email: true,
        role: true,
        image: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            assemblies: true,
            returns: true,
            defectReports: true
          }
        }
      }
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

// POST: Create or update user from Clerk webhook or initial login
export async function POST(req: NextRequest) {
  try {
    // This endpoint can be called by:
    // 1. Webhook (with webhook secret validation)
    // 2. Initial login - user needs to be created in our DB

    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    const userId = authUser?.id;

    const json = await req.json();
    const isWebhook = json.type && json.data;

    // If it's not a webhook, ensure there's a logged-in user
    if (!isWebhook && !userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Extract user data from webhook or current user
    let userData;
    if (isWebhook) {
      // Process webhook data
      // In production, you'd validate the webhook signature!
      const { type, data } = json;

      if (type !== "user.created" && type !== "user.updated") {
        return NextResponse.json({ success: true }); // Ignore other events
      }

      userData = {
        userId: data.id,
        name: `${data.first_name || ''} ${data.last_name || ''}`.trim(),
        email: data.email_addresses[0]?.email_address,
        image: data.image_url
      };
    } else {
      // For manual user creation, get data from the request body
      userData = {
        userId: json.userId || userId,
        name: json.name || 'New User',
        email: json.email,
        image: json.image
      };
    }

    // Make sure we have the required data
    if (!userData.userId || !userData.email) {
      return NextResponse.json(
        { error: "User ID and email are required" },
        { status: 400 }
      );
    }

    // Update or create user in our database
    const user = await prisma.user.upsert({
      where: { userId: userData.userId },
      update: {
        name: userData.name,
        email: userData.email,
        image: userData.image
      },
      create: {
        userId: userData.userId,
        name: userData.name,
        email: userData.email,
        image: userData.image,
        role: "ASSEMBLER" // Default role for new users
      }
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error("Error creating/updating user:", error);
    return NextResponse.json(
      { error: "Failed to create/update user" },
      { status: 500 }
    );
  }
}

// PUT: Update user role (admin only)
export async function PUT(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    const userId = authUser?.id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user from database for role check
    const adminUser = await prisma.user.findFirst({
      where: { userId }
    });

    if (!adminUser || adminUser.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only admins can update user roles" },
        { status: 403 }
      );
    }

    const json = await req.json();
    const { id, role } = json;

    // Validate required fields
    if (!id || !role) {
      return NextResponse.json(
        { error: "User ID and role are required" },
        { status: 400 }
      );
    }

    // Validate role
    const validRoles = ["ADMIN", "ASSEMBLER", "RETURN_QC", "SERVICE_PERSON"];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: `Role must be one of: ${validRoles.join(", ")}` },
        { status: 400 }
      );
    }

    // Check if user exists
    const userToUpdate = await prisma.user.findUnique({
      where: { id }
    });

    if (!userToUpdate) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Update user role
    const updatedUser = await prisma.user.update({
      where: { id },
      data: { role }
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("Error updating user role:", error);
    return NextResponse.json(
      { error: "Failed to update user role" },
      { status: 500 }
    );
  }
} 