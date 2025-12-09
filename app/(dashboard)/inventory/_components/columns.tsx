"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Component } from "@/lib/hooks/useComponents";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";

export const columns: ColumnDef<Component>[] = [
    {
        accessorKey: "name",
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    Name
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            )
        },
        cell: ({ row }) => {
            return (
                <Link
                    href={`/inventory/${row.original.id}`}
                    className="font-medium text-primary hover:underline"
                >
                    {row.getValue("name")}
                </Link>
            );
        },
    },
    {
        accessorKey: "sku",
        header: "SKU",
    },
    {
        accessorKey: "category",
        header: "Category",
        cell: ({ row }) => {
            return (
                <Badge variant="secondary" className="font-medium">
                    {row.getValue("category")}
                </Badge>
            );
        },
        filterFn: (row, id, value) => {
            return value.includes(row.getValue(id));
        },
    },
    {
        accessorKey: "totalStock",
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    Total Stock
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            )
        },
        cell: ({ row }) => {
            const stock = row.getValue("totalStock") as number;
            const min = row.original.minimumQuantity;

            let variant: "default" | "destructive" | "secondary" | "outline" = "outline";
            if (stock <= min) variant = "destructive";
            else if (stock < min * 1.5) variant = "secondary"; // Warning-ish

            return (
                <Badge variant={variant}>
                    {stock}
                </Badge>
            );
        },
    },
    {
        accessorKey: "minimumQuantity",
        header: "Min. Qty",
    },
];
