"use client";

import { UserButton } from "@/components/UserButton";
import { MobileSidebar } from "./mobile-sidebar";
import { RoleType } from "./nav-config";
import { Bell } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface DashboardHeaderProps {
    userRole: RoleType;
    isAdmin: boolean;
    pendingUsersCount: number;
}

export function DashboardHeader({ userRole, isAdmin, pendingUsersCount }: DashboardHeaderProps) {
    return (
        <header className="flex h-14 items-center gap-4 px-4 lg:h-[60px] lg:px-6 sticky top-0 z-20 transition-all duration-200">
            <MobileSidebar userRole={userRole} isAdmin={isAdmin} pendingUsersCount={pendingUsersCount} />
            <div className="w-full flex-1">
                {/* Add search or breadcrumbs here if needed */}
                <h1 className="text-lg font-bold text-primary md:hidden">Vembi IM & QC</h1>
            </div>
            <div className="flex items-center gap-4">
                {isAdmin && pendingUsersCount > 0 && (
                    <Button variant="ghost" size="icon" asChild className="relative hover:bg-primary/5 text-primary">
                        <Link href="/users">
                            <Bell className="h-5 w-5" />
                            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive animate-pulse" />
                            <span className="sr-only">Pending users</span>
                        </Link>
                    </Button>
                )}
                <UserButton />
            </div>
        </header>
    );
}
