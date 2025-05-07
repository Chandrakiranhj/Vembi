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
    // Attempt to get auth user from Clerk with better error handling
    console.log("Force-create: Starting user creation process");
    
    const clerkUser = await currentUser();
    
    if (!clerkUser) {
      console.error("Force-create: No authenticated user found from Clerk");
      const redirectUrl = new URL('/sign-in', req.url);
      return NextResponse.redirect(redirectUrl, {
        status: 302,
        headers: {
          'Cache-Control': 'no-store, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
        },
      });
    }
    
    const userId = clerkUser.id;
    const email = clerkUser.emailAddresses[0]?.emailAddress;
    
    console.log(`Force-create: Processing user ${userId} with email ${email || 'unknown'}`);
    
    if (!email) {
      console.error(`Force-create: No email found for Clerk user ${userId}`);
      const redirectUrl = new URL('/auth-error?reason=missingEmail', req.url);
      return NextResponse.redirect(redirectUrl, {
        status: 302,
        headers: {
          'Cache-Control': 'no-store, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
        },
      });
    }
    
    console.log(`Force-create: Creating or checking user for: ${email} (${userId})`);
    
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
        console.log(`Force-create: User already exists with role: ${existingUser.role}`);
        
        const targetPath = existingUser.role === 'PENDING_APPROVAL' ? '/pending-approval' : '/dashboard';
        console.log(`Force-create: Redirecting existing user to ${targetPath}`);
        
        const redirectUrl = new URL(targetPath, req.url);
        return NextResponse.redirect(redirectUrl, {
          status: 302,
          headers: {
            'Cache-Control': 'no-store, must-revalidate, max-age=0',
            'Pragma': 'no-cache',
          },
        });
      }
      
      // Create new user
      console.log(`Force-create: Creating new user for ${email}`);
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
      
      console.log(`Force-create: User created successfully: ${newUser.email} (${newUser.role})`);
      
      // Send admin notification for new user (done in webhook, but as a backup)
      if (newUser.role === 'PENDING_APPROVAL') {
        try {
          console.log(`Force-create: Attempting to send admin notification`);
          const notificationUrl = new URL('/api/notifications/admin', req.url);
          const notificationResponse = await fetch(notificationUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userId: newUser.id,
              userName: newUser.name,
              userEmail: newUser.email
            }),
          });
          
          if (notificationResponse.ok) {
            console.log('Force-create: Admin notification sent successfully');
          } else {
            console.warn('Force-create: Failed to send admin notification:', await notificationResponse.text());
          }
        } catch (notifyError) {
          console.error('Force-create: Error sending admin notification:', notifyError);
          // Continue with the user creation process even if notification fails
        }
      }
      
      // Redirect to appropriate page with cache control headers to prevent caching
      const targetPath = isAdminEmail ? '/dashboard' : '/pending-approval';
      console.log(`Force-create: Redirecting new user to ${targetPath}`);
      
      const redirectUrl = new URL(targetPath, req.url);
      return NextResponse.redirect(redirectUrl, {
        status: 302,
        headers: {
          'Cache-Control': 'no-store, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
        },
      });
    } catch (dbError: unknown) {
      console.error('Force-create: Database error:', dbError);
      // Return a more specific error for debugging
      const errorMessage = dbError instanceof Error ? dbError.message : 'Unknown DB error';
      const redirectUrl = new URL(`/auth-error?reason=databaseError&detail=${encodeURIComponent(errorMessage)}`, req.url);
      return NextResponse.redirect(redirectUrl, {
        status: 302,
        headers: {
          'Cache-Control': 'no-store, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
        },
      });
    }
  } catch (error) {
    console.error('Force-create: Unexpected error:', error);
    const redirectUrl = new URL('/auth-error?reason=serverError', req.url);
    return NextResponse.redirect(redirectUrl, {
      status: 302,
      headers: {
        'Cache-Control': 'no-store, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
      },
    });
  }
} 