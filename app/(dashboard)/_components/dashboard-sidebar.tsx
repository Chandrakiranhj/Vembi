"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { navItems, RoleType } from "./nav-config";
import { Settings } from "lucide-react";

interface DashboardSidebarProps {
    userRole: RoleType;
    isAdmin: boolean;
    pendingUsersCount: number;
}

export function DashboardSidebar({ userRole, isAdmin, pendingUsersCount }: DashboardSidebarProps) {
    const pathname = usePathname() || "";

    const visibleNavItems = navItems.filter((item) =>
        item.allowedRoles.includes(userRole)
    );

    return (
        <aside className="hidden border-r border-white/5 bg-[#0F172A] text-slate-300 md:block w-64 lg:w-72 h-screen sticky top-0 overflow-y-auto shadow-2xl relative">
            {/* Deep premium gradient background */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#0F172A] via-[#1E293B] to-[#0F172A] pointer-events-none" />

            {/* Subtle noise texture for premium feel */}
            <div className="absolute inset-0 opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] pointer-events-none mix-blend-overlay" />

            {/* Logo Section - Clean, no background box */}
            <div className="flex h-24 items-center px-6 relative z-10 justify-center">
                <Link href="/dashboard" className="flex items-center gap-3 font-semibold group w-full justify-center">
                    <div className="relative h-12 w-full transition-all duration-300 flex items-center justify-center">
                        <img
                            src="/logo_vembi.svg"
                            alt="Vembi Logo"
                            className="h-full object-contain object-center brightness-0 invert"
                        />
                    </div>
                    <span className="sr-only">Vembi QC</span>
                </Link>
            </div>

            <nav className="grid items-start px-4 text-sm font-medium gap-2 relative z-10">
                <div className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-widest">
                    Menu
                </div>
                {visibleNavItems.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 rounded-xl px-4 py-3 transition-all duration-300 group relative overflow-hidden",
                                isActive
                                    ? "text-white font-semibold shadow-lg shadow-black/20 bg-white/10"
                                    : "text-slate-400 hover:text-slate-100 hover:bg-white/5"
                            )}
                        >
                            {isActive && (
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-r-full" />
                            )}

                            <item.icon className={cn("h-5 w-5 relative z-10 transition-colors", isActive ? "text-white" : "text-slate-500 group-hover:text-slate-300")} />
                            <span className="relative z-10">{item.name}</span>

                            {item.showBadge && pendingUsersCount > 0 && (
                                <span className="ml-auto flex h-5 min-w-[20px] px-1.5 items-center justify-center rounded-full bg-blue-600 text-white text-[10px] font-bold shadow-sm relative z-10">
                                    {pendingUsersCount}
                                </span>
                            )}
                        </Link>
                    );
                })}

                {isAdmin && (
                    <>
                        <div className="my-4 border-t border-white/5 mx-4" />
                        <div className="px-4 py-2 text-xs font-bold text-slate-500 uppercase tracking-widest">
                            Settings
                        </div>
                        <Link
                            href="/admin"
                            className={cn(
                                "flex items-center gap-3 rounded-xl px-4 py-3 transition-all duration-300 group relative overflow-hidden",
                                pathname === "/admin"
                                    ? "text-white font-semibold shadow-lg shadow-black/20 bg-white/10"
                                    : "text-slate-400 hover:text-slate-100 hover:bg-white/5"
                            )}
                        >
                            {pathname === "/admin" && (
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-r-full" />
                            )}
                            <Settings className={cn("h-5 w-5 relative z-10 transition-colors", pathname === "/admin" ? "text-white" : "text-slate-500 group-hover:text-slate-300")} />
                            <span className="relative z-10">Admin Settings</span>
                        </Link>
                    </>
                )}
            </nav>

            {/* Bottom user profile or info could go here */}
            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#0F172A] to-transparent">
                <div className="text-[10px] text-slate-600 text-center font-medium tracking-wider">
                    VEMBI QC v2.5.2
                </div>
            </div>
        </aside>
    );
}
