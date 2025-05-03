import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import UserSync from "@/components/UserSync";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { Settings } from "lucide-react";
import { PrismaClient } from "@prisma/client";

// Define the Role type to match the Prisma schema
type Role = "ADMIN" | "ASSEMBLER" | "RETURN_QC" | "SERVICE_PERSON" | "QC_PERSON" | "PENDING_APPROVAL";

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
  icon: () => React.JSX.Element;
  showBadge?: boolean;
  allowedRoles: Role[]; // Roles that can access this item
}

// This would normally be imported from your icon library
const DashboardIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="7" height="9" x="3" y="3" rx="1" />
    <rect width="7" height="5" x="14" y="3" rx="1" />
    <rect width="7" height="9" x="14" y="12" rx="1" />
    <rect width="7" height="5" x="3" y="16" rx="1" />
  </svg>
);

const InventoryIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 13h4v8H2z" />
    <path d="M10 8h4v13h-4z" />
    <path d="M18 3h4v18h-4z" />
  </svg>
);

const AssemblyIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 8.5v5a2.5 2.5 0 0 1-2.5 2.5h-9.63a2 2 0 0 0-1.74 1 2 2 0 0 1-1.74 1H2" />
    <path d="M22 2 11 13" />
    <path d="M16 8h6" />
    <path d="M19 5v6" />
  </svg>
);

const ReturnsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 14 4 9l5-5" />
    <path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11" />
  </svg>
);

const DefectsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 8v4" />
    <path d="M12 16h.01" />
    <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Z" />
  </svg>
);

const ReportsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 3a2 2 0 0 0-2 2" />
    <path d="M19 3a2 2 0 0 1 2 2" />
    <path d="M21 19a2 2 0 0 1-2 2" />
    <path d="M5 21a2 2 0 0 1-2-2" />
    <path d="M9 3h1" />
    <path d="M9 21h1" />
    <path d="M14 3h1" />
    <path d="M14 21h1" />
    <path d="M3 9v1" />
    <path d="M21 9v1" />
    <path d="M3 14v1" />
    <path d="M21 14v1" />
    <path d="M8 7v10" />
    <path d="M16 7v10" />
    <path d="M12 11v6" />
  </svg>
);

const UsersIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

// Define navigation items with role-based access
const navItems: NavItem[] = [
  { 
    name: "Dashboard", 
    href: "/dashboard", 
    icon: DashboardIcon, 
    allowedRoles: ["ADMIN", "ASSEMBLER", "RETURN_QC", "SERVICE_PERSON", "QC_PERSON"]
  },
  { 
    name: "Inventory", 
    href: "/inventory", 
    icon: InventoryIcon, 
    allowedRoles: ["ADMIN", "QC_PERSON"]
  },
  { 
    name: "Assembly QC", 
    href: "/assembly", 
    icon: AssemblyIcon, 
    allowedRoles: ["ADMIN", "ASSEMBLER"]
  },
  { 
    name: "Returns QC", 
    href: "/returns", 
    icon: ReturnsIcon, 
    allowedRoles: ["ADMIN", "RETURN_QC", "SERVICE_PERSON"]
  },
  { 
    name: "Defects", 
    href: "/defects", 
    icon: DefectsIcon, 
    allowedRoles: ["ADMIN", "QC_PERSON"]
  },
  { 
    name: "Reports", 
    href: "/reports", 
    icon: ReportsIcon, 
    allowedRoles: ["ADMIN"]
  },
  { 
    name: "Users", 
    href: "/users", 
    icon: UsersIcon, 
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
  const userRole = user?.role as Role;
  
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
      <div className="min-h-screen flex bg-gray-50">
        {/* Sidebar */}
        <aside className="w-72 bg-gradient-to-b from-[#6D1A27] to-[#4A1219] text-slate-50 hidden md:flex flex-col shadow-xl z-30">
          <div className="p-6 border-b border-[#8B2131]/30">
            <Link href="/dashboard" className="flex items-center gap-2">
              <span className="text-xl font-bold text-white">Vembi IM & QC</span>
            </Link>
          </div>
          <nav className="flex-1 mt-6 px-4">
            <div className="text-xs uppercase tracking-wider font-semibold text-[#F5F1E4] pl-4 mb-3">
              Main Navigation
            </div>
            <ul className="space-y-1">
              {visibleNavItems.map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className={`flex items-center px-4 py-3 rounded-lg text-sm font-medium text-[#F5F1E4] hover:bg-[#8B2131]/60 hover:text-white transition-colors duration-150 group
                      ${item.name === "Users" && pendingUsersCount > 0 ? "bg-[#8B2131]/40" : ""}`}
                  >
                    <span className="p-1.5 rounded-md bg-[#8B2131]/40 mr-3 group-hover:bg-[#8B2131]/70">
                      <item.icon />
                    </span>
                    <span className="flex-1">{item.name}</span>
                    {item.showBadge && isAdmin && pendingUsersCount > 0 && (
                      <span className="ml-auto inline-flex items-center justify-center w-5 h-5 text-xs font-semibold text-white bg-[#D4BC7D] rounded-full">
                        {pendingUsersCount}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
              {isAdmin && (
                <li>
                  <Link
                    href="/admin"
                    className="flex items-center px-4 py-3 rounded-lg text-sm font-medium text-[#F5F1E4] hover:bg-[#8B2131]/60 hover:text-white transition-colors duration-150 group"
                  >
                    <span className="p-1.5 rounded-md bg-[#8B2131]/40 mr-3 group-hover:bg-[#8B2131]/70">
                      <Settings className="h-5 w-5" />
                    </span>
                    <span className="flex-1">Admin</span>
                  </Link>
                </li>
              )}
            </ul>
          </nav>
        </aside>

        {/* Mobile sidebar backdrop */}
        <div className="md:hidden fixed inset-0 bg-black/20 z-10 hidden" id="sidebar-backdrop"></div>

        {/* Main content */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-20">
            <div className="flex items-center justify-between h-16 px-4 sm:px-6">
              <div className="flex items-center gap-2 md:gap-6">
                {/* Mobile menu button */}
                <button className="md:hidden p-1.5 rounded-md hover:bg-gray-100 text-[#8B2131]" id="mobile-menu-button">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="4" x2="20" y1="12" y2="12" />
                    <line x1="4" x2="20" y1="6" y2="6" />
                    <line x1="4" x2="20" y1="18" y2="18" />
                  </svg>
                </button>
                <h1 className="text-lg sm:text-xl font-semibold text-[#8B2131] md:hidden truncate">
                  Vembi IM & QC
                </h1>
                <div className="hidden md:flex h-9 w-72 bg-[#F5F1E4] rounded-md items-center px-3">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#8B2131]/70">
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.3-4.3" />
                  </svg>
                  <input 
                    type="text" 
                    placeholder="Search..." 
                    className="bg-transparent border-none focus:outline-none focus:ring-0 text-sm ml-2 w-full text-[#5A4C3A]"
                  />
                </div>
              </div>
              
              <div className="flex items-center gap-2 sm:gap-4">
                {/* Notification bell */}
                <Link 
                  href="/users"
                  className="p-1.5 rounded-full hover:bg-[#F5F1E4] relative"
                  style={{ visibility: isAdmin && pendingUsersCount > 0 ? 'visible' : 'hidden' }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#8B2131]">
                    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                  </svg>
                  {isAdmin && pendingUsersCount > 0 && (
                    <span className="absolute top-0 right-0 h-4 w-4 rounded-full bg-[#8B2131] text-white text-xs flex items-center justify-center">
                      {pendingUsersCount}
                    </span>
                  )}
                </Link>
                
                <div className="hidden sm:block h-6 w-px bg-gray-200"></div>
                
                <UserButton 
                  afterSignOutUrl="/"
                  appearance={{
                    elements: {
                      userButtonAvatarBox: "h-8 w-8 sm:h-9 sm:w-9"
                    }
                  }} 
                />
              </div>
            </div>
          </header>

          {/* Main content with premium burgundy and gold theme */}
          <main className="flex-1 p-3 sm:p-4 md:p-6 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
      
      {/* Mobile sidebar */}
      <div className="fixed inset-y-0 left-0 w-72 bg-gradient-to-b from-[#6D1A27] to-[#4A1219] text-slate-50 transform -translate-x-full transition-transform duration-300 ease-in-out z-30 md:hidden" id="mobile-sidebar">
        <div className="p-6 border-b border-[#8B2131]/30 flex justify-between items-center">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="text-xl font-bold text-white">Vembi IM & QC</span>
          </Link>
          <button id="close-sidebar" className="text-[#F5F1E4] hover:text-white">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>
        <nav className="flex-1 mt-6 px-4">
          <div className="text-xs uppercase tracking-wider font-semibold text-[#F5F1E4] pl-4 mb-3">
            Main Navigation
          </div>
          <ul className="space-y-1">
            {visibleNavItems.map((item) => (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className="flex items-center px-4 py-3 rounded-lg text-sm font-medium text-[#F5F1E4] hover:bg-[#8B2131]/60 hover:text-white transition-colors duration-150 group"
                >
                  <span className="p-1.5 rounded-md bg-[#8B2131]/40 mr-3 group-hover:bg-[#8B2131]/70">
                    <item.icon />
                  </span>
                  <span className="flex-1">{item.name}</span>
                  {item.showBadge && isAdmin && pendingUsersCount > 0 && (
                    <span className="ml-auto inline-flex items-center justify-center w-5 h-5 text-xs font-semibold text-white bg-[#D4BC7D] rounded-full">
                      {pendingUsersCount}
                    </span>
                  )}
                </Link>
              </li>
            ))}
            {isAdmin && (
              <li>
                <Link
                  href="/admin"
                  className="flex items-center px-4 py-3 rounded-lg text-sm font-medium text-[#F5F1E4] hover:bg-[#8B2131]/60 hover:text-white transition-colors duration-150 group"
                >
                  <span className="p-1.5 rounded-md bg-[#8B2131]/40 mr-3 group-hover:bg-[#8B2131]/70">
                    <Settings className="h-5 w-5" />
                  </span>
                  <span className="flex-1">Admin</span>
                </Link>
              </li>
            )}
          </ul>
        </nav>
      </div>
      
      <script dangerouslySetInnerHTML={{
        __html: `
          document.addEventListener('DOMContentLoaded', function() {
            const mobileMenuButton = document.getElementById('mobile-menu-button');
            const mobileSidebar = document.getElementById('mobile-sidebar');
            const closeSidebar = document.getElementById('close-sidebar');
            const backdrop = document.getElementById('sidebar-backdrop');
            
            if (mobileMenuButton && mobileSidebar && closeSidebar && backdrop) {
              mobileMenuButton.addEventListener('click', function() {
                mobileSidebar.classList.remove('-translate-x-full');
                backdrop.classList.remove('hidden');
              });
              
              closeSidebar.addEventListener('click', function() {
                mobileSidebar.classList.add('-translate-x-full');
                backdrop.classList.add('hidden');
              });
              
              backdrop.addEventListener('click', function() {
                mobileSidebar.classList.add('-translate-x-full');
                backdrop.classList.add('hidden');
              });
            }
          });
        `
      }} />
      
      <Toaster />
    </>
  );
} 