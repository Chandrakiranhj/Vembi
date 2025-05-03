import { Loader2 } from "lucide-react";
import { redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { PrismaClient } from "@prisma/client";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ReactNode } from "react";

// Extend PrismaClient type to include lowercase model access
type PrismaClientWithLowercaseModels = PrismaClient & {
  user: {
    findFirst: (args: Record<string, unknown>) => Promise<Record<string, unknown> | null>;
    create: (args: Record<string, unknown>) => Promise<Record<string, unknown>>;
  }
};

// This page serves as a transitional screen that will automatically
// redirect users to the appropriate page once their account status is determined
export default async function InitializingPage() {
  // Cast prisma to include lowercase model access
  const prismaWithModels = prisma as PrismaClientWithLowercaseModels;
  
  const { userId } = await auth();
  // We use the currentUser API for more detailed logic in the future if needed
  await currentUser();
  
  // If no user is logged in, redirect to sign-in
  if (!userId) {
    redirect('/sign-in');
  }
  
  let user = null;
  let error: Error | null = null;
  
  try {
    // Try to find the user in our database
    user = await prismaWithModels.user.findFirst({
      where: { userId },
      select: { id: true, role: true }
    });
    
    // If we have the user and know their role, redirect accordingly
    if (user) {
      if (user.role === 'PENDING_APPROVAL') {
        redirect('/pending-approval');
      } else {
        redirect('/dashboard');
      }
    }
    
    // If no user found, don't attempt to create in this page
    // Instead, the force-create or clerk-redirect APIs should handle this
  } catch (err) {
    // Capture any error for display
    error = err instanceof Error ? err : new Error("Unknown error occurred");
    console.error("Error checking user status:", err);
  }
  
  // If we can't find the user, display the loading screen with options
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
        <Loader2 className="mx-auto h-12 w-12 mb-4 animate-spin text-[#8B2131]" />
        <h1 className="text-2xl font-bold mb-2">Initializing Account</h1>
        <p className="text-gray-600 mb-6">
          We&apos;re setting up your account. This process usually takes a few seconds.
        </p>
        
        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 text-sm rounded-md border border-red-200">
            <p className="font-medium">There was an error initializing your account:</p>
            <p className="mt-1">{error.message || "Unknown error"}</p>
          </div>
        )}
        
        <div className="space-y-4">
          <div className="text-left bg-amber-50 p-4 rounded-md border border-amber-200">
            <p className="text-amber-800 text-sm font-medium">If this page doesn&apos;t redirect automatically:</p>
            <ul className="text-amber-700 text-sm list-disc pl-5 space-y-1">
              <li>Make sure your sign-up was completed successfully</li>
              <li>Try one of the options below</li>
              <li>If issues persist, please contact support</li>
            </ul>
          </div>
          
          <div className="grid grid-cols-1 gap-3">
            <Button asChild variant="default" className="w-full">
              <Link href="/api/auth/force-create">
                Create Account & Continue
              </Link>
            </Button>
            
            <Button asChild variant="outline" className="w-full">
              <Link href="/api/auth/clerk-redirect">
                Retry Account Setup
              </Link>
            </Button>
            
            <Button asChild variant="ghost" className="w-full text-gray-600">
              <Link href="/sign-in">
                Go Back to Sign In
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}