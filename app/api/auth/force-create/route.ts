import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { PrismaClient } from "@prisma/client";

// Extend PrismaClient type to include lowercase model access
type PrismaClientWithLowercaseModels = PrismaClient & {
  user: {
    findFirst: (args: Record<string, unknown>) => Promise<Record<string, unknown> | null>;
    create: (args: Record<string, unknown>) => Promise<Record<string, unknown>>;
  }
};

// This endpoint will force-create a user in the database and redirect to pending-approval
export async function GET(req: NextRequest) {
  // Cast prisma to include lowercase model access
  const prismaWithModels = prisma as PrismaClientWithLowercaseModels;
  
  try {
    // Get current authenticated user from Clerk
    const clerkUser = await currentUser();
    
    if (!clerkUser) {
      console.error("No authenticated user found");
      return NextResponse.redirect(new URL('/sign-in', req.url));
    }
    
    const userId = clerkUser.id;
    const email = clerkUser.emailAddresses[0]?.emailAddress;
    
    if (!email) {
      console.error(`No email found for Clerk user ${userId}`);
      return NextResponse.redirect(new URL('/auth-error?reason=missingEmail', req.url));
    }
    
    console.log(`Force creating or checking user for: ${email} (${userId})`);
    
    try {
      // Check if user already exists in database
      const existingUser = await prismaWithModels.user.findFirst({
        where: { 
          OR: [
            { userId },
            { email }
          ]
        }
      });
      
      if (existingUser) {
        // User already exists, redirect based on role
        console.log(`User already exists with role: ${existingUser.role}`);
        if (existingUser.role === 'PENDING_APPROVAL') {
          return NextResponse.redirect(new URL('/pending-approval', req.url));
        } else {
          return NextResponse.redirect(new URL('/dashboard', req.url));
        }
      }
      
      // Create new user
      const isAdminEmail = email === 'chandrakiranhj@gmail.com';
      
      const newUser = await prismaWithModels.user.create({
        data: {
          userId,
          name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || 'User',
          email,
          image: clerkUser.imageUrl || null,
          role: isAdminEmail ? 'ADMIN' : 'PENDING_APPROVAL'
        }
      });
      
      console.log(`User created successfully: ${newUser.email} (${newUser.role})`);
      
      // Redirect to appropriate page
      return NextResponse.redirect(
        new URL(isAdminEmail ? '/dashboard' : '/pending-approval', req.url)
      );
    } catch (dbError: unknown) {
      console.error('Database error during force-create:', dbError);
      // Return a more specific error for debugging
      const errorMessage = dbError instanceof Error ? dbError.message : 'Unknown DB error';
      return NextResponse.redirect(new URL(`/auth-error?reason=databaseError&detail=${encodeURIComponent(errorMessage)}`, req.url));
    }
  } catch (error) {
    console.error('Error in force-create handler:', error);
    return NextResponse.redirect(new URL('/auth-error?reason=serverError', req.url));
  }
} 