"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Assembly } from "@/lib/hooks/useAssemblies";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, CalendarClock } from "lucide-react";
import { format } from "date-fns";

// Extend the hook's type to include optional fields from API
export interface ApiAssembly extends Assembly {
    startTime?: string | null;
    assembledBy?: {
        id: string;
        name: string;
    } | null;
}

export const columns: ColumnDef<ApiAssembly>[] = [
    {
        accessorKey: "serialNumber",
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    Serial Number
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            )
        },
        cell: ({ row }) => <div className="font-medium">{row.getValue("serialNumber")}</div>,
    },
    {
        accessorKey: "product",
        header: "Product",
        cell: ({ row }) => {
            const product = row.original.product;
            return (
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                    <Badge variant="secondary" className="font-medium">
                        {product?.modelNumber}
                    </Badge>
                    <span className="text-muted-foreground text-sm">
                        {product?.name}
                    </span>
                </div>
            );
        },
    },
    {
        accessorKey: "assembledBy",
        header: "Assembled By",
        cell: ({ row }) => {
            const assembler = row.original.assembledBy;
            return <div className="text-muted-foreground">{assembler?.name ?? 'Unknown'}</div>;
        },
    },
    {
        accessorKey: "startTime",
        header: "Started At",
        cell: ({ row }) => {
            const date = row.getValue("startTime") as string | null;
            if (!date) return <div className="text-muted-foreground">N/A</div>;

            return (
                <div className="flex items-center text-muted-foreground">
                    <CalendarClock className="h-3.5 w-3.5 mr-2" />
                    {format(new Date(date), 'PPp')}
                </div>
            );
        },
    },
];
