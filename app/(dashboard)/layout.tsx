import React, { ReactNode } from "react";
import { auth } from "@clerk/nextjs/server";
import { Toaster } from "@/components/ui/sonner";
import UserSync from "@/components/UserSync";
import { prisma } from "@/lib/prisma";
import { PrismaClient } from "@prisma/client";
import NavWrapper from "./nav-wrapper";

// Define the Role type to match the Prisma schema
type RoleType = "ADMIN" | "ASSEMBLER" | "RETURN_QC" | "SERVICE_PERSON" | "QC_PERSON" | "PENDING_APPROVAL";

// Extend PrismaClient type to include lowercase model access
type PrismaClientWithLowercaseModels = PrismaClient & {
  user: {
    findFirst: (args: Record<string, unknown>) => Promise<Record<string, unknown> | null>;
    findMany: (args: Record<string, unknown>) => Promise<Record<string, unknown>[]>;
    count: (args: Record<string, unknown>) => Promise<number>;
    update: (args: Record<string, unknown>) => Promise<Record<string, unknown>>;
  }
};

// Define navigation item structure with role-based access
interface NavItem {
  name: string;
  href: string;
  iconName: string; // Use a string identifier instead of a function
  showBadge?: boolean;
  allowedRoles: RoleType[]; // Roles that can access this item
}

// Define navigation items with role-based access using icon names
const navItems: NavItem[] = [
  { 
    name: "Dashboard", 
    href: "/dashboard", 
    iconName: "dashboard", 
    allowedRoles: ["ADMIN", "ASSEMBLER", "RETURN_QC", "SERVICE_PERSON", "QC_PERSON"]
  },
  { 
    name: "Inventory", 
    href: "/inventory", 
    iconName: "inventory", 
    allowedRoles: ["ADMIN", "QC_PERSON"]
  },
  { 
    name: "Assembly QC", 
    href: "/assembly", 
    iconName: "assembly", 
    allowedRoles: ["ADMIN", "ASSEMBLER"]
  },
  { 
    name: "Returns QC", 
    href: "/returns", 
    iconName: "returns", 
    allowedRoles: ["ADMIN", "RETURN_QC", "SERVICE_PERSON"]
  },
  { 
    name: "Defects", 
    href: "/defects", 
    iconName: "defects", 
    allowedRoles: ["ADMIN", "QC_PERSON"]
  },
  { 
    name: "Reports", 
    href: "/reports", 
    iconName: "reports", 
    allowedRoles: ["ADMIN"]
  },
  { 
    name: "AI Assistant", 
    href: "/ai-assistant", 
    iconName: "ai-assistant", 
    allowedRoles: ["ADMIN"]
  },
  { 
    name: "Users", 
    href: "/users", 
    iconName: "users", 
    showBadge: true, 
    allowedRoles: ["ADMIN"]
  },
];

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  // Cast prisma client to work with lowercase model names
  const prismaWithModels = prisma as PrismaClientWithLowercaseModels;
  
  const authData = await auth();
  const userId = authData.userId;
  
  if (!userId) {
    return <div className="p-6 text-red-600">Authentication Error. Please sign in again.</div>;
  }

  const user = await prismaWithModels.user.findFirst({
    where: { userId: userId },
    select: { role: true }
  });

  // User exists but is pending approval
  if (user?.role === "PENDING_APPROVAL") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-yellow-50">
        <div className="text-center bg-white p-8 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-yellow-800 mb-3">Awaiting Approval</h2>
          <p className="text-gray-600 mb-4">
            Your account registration is complete, but requires administrator approval before you can access the dashboard.
          </p>
          <p className="text-sm text-gray-500">
            An administrator has been notified. Please check back later or contact support if approval takes too long.
          </p>
        </div>
      </div>
    );
  }

  // User doesn't exist in DB at all (should be temporary after login due to UserSync)
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center bg-white p-8 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-gray-800 mb-3">Initializing Account...</h2>
          <p className="text-gray-600 mb-4">
            Please wait while we set up your account.
          </p>
        </div>
      </div>
    );
  }
     
  const isAdmin = user?.role === "ADMIN";
  const userRole = user?.role as RoleType;
  
  // Filter navigation items based on user role
  const visibleNavItems = navItems.filter(item => 
    item.allowedRoles.includes(userRole)
  );
  
  // Check if there are pending users (only for admins)
  let pendingUsersCount = 0;
  if (isAdmin) {
    pendingUsersCount = await prismaWithModels.user.count({
      where: { role: "PENDING_APPROVAL" }
    });
  }
  
  return (
    <>
      <UserSync />
      <NavWrapper 
        visibleNavItems={visibleNavItems} 
        isAdmin={isAdmin} 
        pendingUsersCount={pendingUsersCount}
      >
        {children}
      </NavWrapper>
      <Toaster position="top-right" />
    </>
  );
} 