import { NextRequest, NextResponse } from "next/server";
import { getAuth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { PrismaClient } from "@prisma/client";

// Extend PrismaClient type to include lowercase model access
type PrismaClientWithLowercaseModels = PrismaClient & {
  user: {
    findFirst: (args: Record<string, unknown>) => Promise<Record<string, unknown> | null>;
    update: (args: Record<string, unknown>) => Promise<Record<string, unknown>>;
    create: (args: Record<string, unknown>) => Promise<Record<string, unknown>>;
    upsert: (args: Record<string, unknown>) => Promise<Record<string, unknown>>;
  }
};

// Define types for Clerk user structure
interface ClerkUserEmail {
  id: string;
  email_address: string;
}

interface ClerkUser {
  id: string;
  first_name?: string;
  last_name?: string;
  email_addresses: ClerkUserEmail[];
  primary_email_address_id?: string;
  image_url?: string;
}

// This endpoint syncs the Clerk user with our database and handles redirects
export async function GET(req: NextRequest) {
  // Cast prisma to include lowercase model access
  const prismaWithModels = prisma as PrismaClientWithLowercaseModels;
  
  try {
    // Get current authenticated user directly from Clerk server functions
    const { userId } = await getAuth(req);
    const clerkUserData = await currentUser();
    
    if (!userId || !clerkUserData) {
      console.error("No authenticated user found");
      return NextResponse.redirect(new URL('/sign-in', req.url));
    }
    
    console.log(`Processing authentication for Clerk user ID: ${userId}`);
    
    // Extract the email directly from the Clerk user data
    const email = clerkUserData.emailAddresses[0]?.emailAddress;
    
    if (!email) {
      console.error(`No email found for Clerk user ${userId}`);
      return NextResponse.redirect(new URL('/auth-error?reason=missingEmail', req.url));
    }
    
    console.log(`Found email for Clerk user: ${email}`);
    
    // Check if this is the admin email
    const isAdminEmail = email === 'chandrakiranhj@gmail.com';
    
    try {
      // Use upsert to either create or update the user in one operation
      const user = await prismaWithModels.user.upsert({
        where: { 
          userId: userId 
        },
        update: {
          // Only update if user exists
          name: `${clerkUserData.firstName || ''} ${clerkUserData.lastName || ''}`.trim() || 'User',
          image: clerkUserData.imageUrl || null,
          role: isAdminEmail ? 'ADMIN' : undefined // Only change role to ADMIN if admin email
        },
        create: {
          userId,
          name: `${clerkUserData.firstName || ''} ${clerkUserData.lastName || ''}`.trim() || 'User',
          email,
          image: clerkUserData.imageUrl || null,
          role: isAdminEmail ? 'ADMIN' : 'PENDING_APPROVAL'
        }
      });
      
      console.log(`User created/updated successfully: ${user.email} (${user.role})`);
      
      // Now check role and redirect accordingly
      switch (user.role) {
        case 'ADMIN':
        case 'ASSEMBLER':
        case 'RETURN_QC':
        case 'SERVICE_PERSON':
        case 'QC_PERSON':
          // User has a valid role, redirect to dashboard
          console.log(`Redirecting user to dashboard with role: ${user.role}`);
          return NextResponse.redirect(new URL('/dashboard', req.url));
          
        case 'PENDING_APPROVAL':
          // User is pending approval, show waiting page
          console.log(`Redirecting user to pending approval with role: ${user.role}`);
          return NextResponse.redirect(new URL('/pending-approval', req.url));
          
        default:
          // Unknown role, show error
          console.error(`Invalid role detected: ${user.role}`);
          return NextResponse.redirect(new URL('/auth-error?reason=invalidRole', req.url));
      }
    } catch (dbError: unknown) {
      console.error('Database error during user upsert:', dbError);
      // Return a more specific error for debugging
      const errorMessage = dbError instanceof Error ? dbError.message : 'Unknown DB error';
      return NextResponse.redirect(new URL(`/auth-error?reason=databaseError&detail=${encodeURIComponent(errorMessage)}`, req.url));
    }
    
  } catch (error) {
    console.error('Error in auth redirect handler:', error);
    return NextResponse.redirect(new URL('/auth-error?reason=serverError', req.url));
  }
}

// Helper function to extract primary email
function findPrimaryEmail(clerkUser: ClerkUser): string | null {
  if (!clerkUser.email_addresses || clerkUser.email_addresses.length === 0) {
    return null;
  }
  
  // Try to find primary email first
  if (clerkUser.primary_email_address_id) {
    const primaryEmail = clerkUser.email_addresses.find(
      (email: ClerkUserEmail) => 
        email.id === clerkUser.primary_email_address_id
    );
    if (primaryEmail) {
      return primaryEmail.email_address;
    }
  }
  
  // Fall back to first email if no primary is set
  return clerkUser.email_addresses[0].email_address;
}

// Helper function to get user name
function getUserName(clerkUser: ClerkUser): string {
  const firstName = clerkUser.first_name || '';
  const lastName = clerkUser.last_name || '';
  const fullName = `${firstName} ${lastName}`.trim();
  
  return fullName || 'User';
}