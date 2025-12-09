"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, AlertTriangle, DollarSign, Activity } from "lucide-react";

interface InventoryHealthProps {
    data: {
        lowStockItems: number;
        totalInventoryValue: number;
        totalStockItems: number;
    };
    loading?: boolean;
}

export function InventoryHealth({ data, loading }: InventoryHealthProps) {
    if (loading) {
        return (
            <div className="grid gap-4 md:grid-cols-3">
                {[1, 2, 3].map((i) => (
                    <Card key={i}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Loading...</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="h-4 w-24 bg-muted/20 animate-pulse rounded"></div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    return (
        <div className="grid gap-4 md:grid-cols-3">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Stock Items</CardTitle>
                    <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{data?.totalStockItems?.toLocaleString() || 0}</div>
                    <p className="text-xs text-muted-foreground">
                        Units currently in inventory
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Inventory Value</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">
                        ${data?.totalInventoryValue?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0.00"}
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Estimated total value
                    </p>
                </CardContent>
            </Card>

            <Card className={data?.lowStockItems > 0 ? "border-yellow-500/50 bg-yellow-500/10" : ""}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Low Stock Alerts</CardTitle>
                    <AlertTriangle className={`h-4 w-4 ${data?.lowStockItems > 0 ? "text-yellow-600" : "text-muted-foreground"}`} />
                </CardHeader>
                <CardContent>
                    <div className={`text-2xl font-bold ${data?.lowStockItems > 0 ? "text-yellow-600" : ""}`}>
                        {data?.lowStockItems || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Items below minimum quantity
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
