import React, { ReactNode } from "react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Toaster } from "@/components/ui/sonner";
import { prisma } from "@/lib/prisma";
import { PrismaClient } from "@prisma/client";
import { DashboardSidebar } from "./_components/dashboard-sidebar";
import { DashboardHeader } from "./_components/dashboard-header";
import { RoleType } from "./_components/nav-config";
import { AIChat } from "@/components/ai/AIChat";

// Extend PrismaClient type to include lowercase model access
type PrismaClientWithLowercaseModels = PrismaClient & {
  user: {
    findFirst: (args: Record<string, unknown>) => Promise<Record<string, unknown> | null>;
    findMany: (args: Record<string, unknown>) => Promise<Record<string, unknown>[]>;
    count: (args: Record<string, unknown>) => Promise<number>;
    update: (args: Record<string, unknown>) => Promise<Record<string, unknown>>;
    create: (args: Record<string, unknown>) => Promise<Record<string, unknown>>;
    upsert: (args: Record<string, unknown>) => Promise<Record<string, unknown>>;
  }
};

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  // Cast prisma client to work with lowercase model names
  const prismaWithModels = prisma as PrismaClientWithLowercaseModels;

  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  const userId = authUser?.id;

  if (!userId) {
    redirect('/sign-in');
  }

  // Use upsert to handle race conditions where multiple requests try to create the user simultaneously
  let user = null;

  if (authUser.email) {
    try {
      user = await prismaWithModels.user.upsert({
        where: { userId: userId },
        update: {}, // No changes if user exists
        create: {
          userId: userId,
          email: authUser.email,
          name: authUser.user_metadata?.full_name || authUser.email.split('@')[0],
          role: "PENDING_APPROVAL",
        },
        select: { role: true }
      });
    } catch (error) {
      console.error("Error upserting user:", error);
      // If upsert fails (e.g. email constraint), try to just find the user
      // This is a fallback for edge cases
      user = await prismaWithModels.user.findFirst({
        where: { userId: userId },
        select: { role: true }
      });
    }
  } else {
    // Fallback if no email (shouldn't happen with email auth)
    user = await prismaWithModels.user.findFirst({
      where: { userId: userId },
      select: { role: true }
    });
  }

  // User exists but is pending approval
  if (user?.role === "PENDING_APPROVAL") {
    redirect('/pending-approval');
  }

  // User creation failed or still null for some reason
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/40">
        <div className="text-center bg-background p-8 rounded-lg shadow-sm border">
          <h2 className="text-xl font-semibold text-destructive mb-3">Account Error</h2>
          <p className="text-muted-foreground mb-4">
            We couldn't retrieve or create your account details.
          </p>
          <p className="text-sm text-muted-foreground">
            Please try signing out and signing in again.
          </p>
        </div>
      </div>
    );
  }

  const isAdmin = user?.role === "ADMIN";
  const userRole = user?.role as RoleType;

  // Check if there are pending users (only for admins)
  let pendingUsersCount = 0;
  if (isAdmin) {
    pendingUsersCount = await prismaWithModels.user.count({
      where: { role: "PENDING_APPROVAL" }
    });
  }

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
      <DashboardSidebar
        userRole={userRole}
        isAdmin={isAdmin}
        pendingUsersCount={pendingUsersCount}
      />
      <div className="flex flex-col">
        <DashboardHeader
          userRole={userRole}
          isAdmin={isAdmin}
          pendingUsersCount={pendingUsersCount}
        />
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
          {children}
        </main>
      </div>
      <Toaster />
      <AIChat />
    </div>
  );
}