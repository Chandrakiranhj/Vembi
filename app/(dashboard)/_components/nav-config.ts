import {
    LayoutDashboard,
    Package,
    Wrench,
    ClipboardCheck,
    AlertTriangle,
    FileText,
    Users
} from "lucide-react";

export type RoleType = "ADMIN" | "ASSEMBLER" | "RETURN_QC" | "SERVICE_PERSON" | "QC_PERSON" | "PENDING_APPROVAL";

export interface NavItem {
    name: string;
    href: string;
    icon: any;
    showBadge?: boolean;
    allowedRoles: RoleType[];
}

export const navItems: NavItem[] = [
    {
        name: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
        allowedRoles: ["ADMIN", "ASSEMBLER", "RETURN_QC", "SERVICE_PERSON", "QC_PERSON"]
    },
    {
        name: "Inventory",
        href: "/inventory",
        icon: Package,
        allowedRoles: ["ADMIN", "QC_PERSON"]
    },
    {
        name: "Assembly QC",
        href: "/assembly",
        icon: Wrench,
        allowedRoles: ["ADMIN", "ASSEMBLER"]
    },
    {
        name: "Returns QC",
        href: "/returns",
        icon: ClipboardCheck,
        allowedRoles: ["ADMIN", "RETURN_QC", "SERVICE_PERSON"]
    },
    {
        name: "Defects",
        href: "/defects",
        icon: AlertTriangle,
        allowedRoles: ["ADMIN", "QC_PERSON", "ASSEMBLER"]
    },
    {
        name: "Analytics",
        href: "/analytics",
        icon: FileText,
        allowedRoles: ["ADMIN"]
    },
    {
        name: "Users",
        href: "/users",
        icon: Users,
        showBadge: true,
        allowedRoles: ["ADMIN"]
    },
];
