"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { navItems, RoleType } from "./nav-config";
import { Settings, Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface MobileSidebarProps {
    userRole: RoleType;
    isAdmin: boolean;
    pendingUsersCount: number;
}

export function MobileSidebar({ userRole, isAdmin, pendingUsersCount }: MobileSidebarProps) {
    const pathname = usePathname() || "";
    const [open, setOpen] = useState(false);

    const visibleNavItems = navItems.filter((item) =>
        item.allowedRoles.includes(userRole)
    );

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 md:hidden text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Toggle navigation menu</span>
                </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex flex-col w-72 p-0 bg-[#0F172A] text-slate-300 border-r-white/10">
                {/* Deep premium gradient background */}
                <div className="absolute inset-0 bg-gradient-to-b from-[#0F172A] via-[#1E293B] to-[#0F172A] pointer-events-none" />

                {/* Subtle noise texture */}
                <div className="absolute inset-0 opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] pointer-events-none mix-blend-overlay" />

                <div className="border-b border-white/5 p-6 relative z-10 backdrop-blur-sm bg-black/20">
                    <div className="flex items-center gap-3">
                        <div className="relative h-8 w-32">
                            <img
                                src="/logo_vembi.svg"
                                alt="Vembi Logo"
                                className="h-full w-full object-contain brightness-0 invert"
                            />
                        </div>
                        <SheetTitle className="sr-only">
                            Vembi QC
                        </SheetTitle>
                    </div>
                    <SheetDescription className="sr-only">Mobile Navigation</SheetDescription>
                </div>

                <nav className="grid gap-2 text-lg font-medium p-4 relative z-10">
                    <div className="px-2 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                        Menu
                    </div>
                    {visibleNavItems.map((item) => {
                        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setOpen(false)}
                                className={cn(
                                    "flex items-center gap-4 rounded-xl px-3 py-3 transition-all duration-300 group relative overflow-hidden",
                                    isActive
                                        ? "text-white font-semibold shadow-lg shadow-black/20"
                                        : "text-slate-400 hover:text-slate-100 hover:bg-white/5"
                                )}
                            >
                                {isActive && (
                                    <div className="absolute inset-0 bg-gradient-to-r from-slate-800 to-slate-800/50 border border-white/5 rounded-xl" />
                                )}
                                <item.icon className={cn("h-5 w-5 relative z-10 transition-colors", isActive ? "text-white" : "text-slate-500 group-hover:text-slate-300")} />
                                <span className="relative z-10">{item.name}</span>
                                {item.showBadge && pendingUsersCount > 0 && (
                                    <span className="ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-700 text-slate-200 text-xs font-bold border border-slate-600 relative z-10">
                                        {pendingUsersCount}
                                    </span>
                                )}
                            </Link>
                        )
                    })}
                    {isAdmin && (
                        <>
                            <div className="my-4 border-t border-white/5 mx-2" />
                            <Link
                                href="/admin"
                                onClick={() => setOpen(false)}
                                className={cn(
                                    "flex items-center gap-4 rounded-xl px-3 py-3 transition-all duration-300 group relative overflow-hidden",
                                    pathname === "/admin"
                                        ? "text-white font-semibold shadow-lg shadow-black/20"
                                        : "text-slate-400 hover:text-slate-100 hover:bg-white/5"
                                )}
                            >
                                {pathname === "/admin" && (
                                    <div className="absolute inset-0 bg-gradient-to-r from-slate-800 to-slate-800/50 border border-white/10 rounded-xl" />
                                )}
                                <Settings className={cn("h-5 w-5 relative z-10 transition-colors", pathname === "/admin" ? "text-white" : "text-slate-500 group-hover:text-slate-300")} />
                                <span className="relative z-10">Admin Settings</span>
                            </Link>
                        </>
                    )}
                </nav>
            </SheetContent>
        </Sheet>
    );
}
