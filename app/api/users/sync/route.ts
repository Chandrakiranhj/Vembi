import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuth } from "@clerk/nextjs/server";
import { Role } from "@prisma/client";

/**
 * POST: Sync a user's Clerk identity to our database
 * This endpoint is called when a user logs in via the UserSync component
 */
export async function POST(req: NextRequest) {
  try {
    // Verify the request is authenticated
    const { userId, sessionId } = getAuth(req);
    if (!userId || !sessionId) {
      console.error('Authentication failed:', { userId, sessionId });
      return NextResponse.json(
        { error: "Unauthorized", message: "Please sign in again" },
        { status: 401 }
      );
    }

    // Parse the request body
    let json;
    try {
      json = await req.json();
    } catch (e) {
      console.error('Failed to parse request body:', e);
      return NextResponse.json(
        { error: "Invalid request body", message: "Please try again" },
        { status: 400 }
      );
    }

    const { name, email, image } = json;
    
    // Validate data from the client
    if (!email) {
      return NextResponse.json(
        { error: "Email is required", message: "Please provide an email address" },
        { status: 400 }
      );
    }

    // Ensure userId from auth matches the one being synced
    // This prevents users from creating records for other users
    const userIdFromAuth = userId;
    const userIdFromRequest = json.userId;

    if (userIdFromAuth !== userIdFromRequest) {
      console.error('User ID mismatch:', { auth: userIdFromAuth, request: userIdFromRequest });
      return NextResponse.json(
        { error: "User ID mismatch", message: "Authentication error" },
        { status: 403 }
      );
    }
    
    // First, check if this email already exists in the database
    const existingUserByEmail = await prisma.user.findUnique({
      where: { email }
    });
    
    // Check if user exists by clerk userId
    const existingUserById = await prisma.user.findUnique({
      where: { userId: userIdFromAuth }
    });
    
    let user;
    
    // Special handling for admin email
    const isAdminEmail = email === 'chandrakiranhj@gmail.com';
    
    try {
    if (existingUserByEmail && existingUserById) {
      // Both exist - make sure they're the same user
      if (existingUserByEmail.id !== existingUserById.id) {
        // This is a conflict - email already exists for a different user
        return NextResponse.json(
            { error: "This email is already registered with another account", message: "Please contact support" },
          { status: 409 }
        );
      }
      
      // Update the existing user
      user = await prisma.user.update({
        where: { id: existingUserById.id },
        data: {
          name: name || existingUserById.name,
          image: image || existingUserById.image,
          // If this is admin email, ensure admin role
          ...(isAdminEmail && { role: Role.ADMIN })
        }
      });
    } else if (existingUserByEmail) {
      // Email exists but userId doesn't - update the userId
      user = await prisma.user.update({
        where: { email },
        data: {
          userId: userIdFromAuth,
          name: name || existingUserByEmail.name,
          image: image || existingUserByEmail.image,
          // If this is admin email, ensure admin role
          ...(isAdminEmail && { role: Role.ADMIN })
        }
      });
    } else if (existingUserById) {
      // UserId exists but with different email - update the email
      user = await prisma.user.update({
        where: { userId: userIdFromAuth },
        data: {
          name: name || existingUserById.name,
          email: email,
          image: image || existingUserById.image,
          // If this is admin email, ensure admin role
          ...(isAdminEmail && { role: Role.ADMIN })
        }
      });
    } else {
      // New user - create from scratch
      user = await prisma.user.create({
        data: {
          userId: userIdFromAuth,
          name: name || "Unknown Name", 
          email: email,
          image: image,
          role: isAdminEmail ? Role.ADMIN : Role.PENDING_APPROVAL
        }
      });
      }
    } catch (error) {
      console.error("Database error during user sync:", error);
      return NextResponse.json(
        { error: "Failed to update user record", message: "Please try again later" },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error("Unexpected error during user sync:", error);
    return NextResponse.json(
      { error: "Internal server error", message: "Please try again later" },
      { status: 500 }
    );
  }
} 