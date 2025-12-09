"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Package, CheckCircle2, CircleDollarSign } from "lucide-react";

interface ActivityStats {
    totalDefects: number;
    totalReturnQcItems: number;
    totalAssemblies: number;
    totalBatches: number;
    totalActivities: number;
    totalDefectsIncludingReturns?: number;
    defectsGrowth?: number;
    returnsGrowth?: number;
    assembliesGrowth?: number;
    batchesGrowth?: number;
}

interface StatsCardsProps {
    stats: ActivityStats | null;
    isLoading: boolean;
}

export function StatsCards({ stats, isLoading }: StatsCardsProps) {
    if (isLoading || !stats) {
        return (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {[...Array(4)].map((_, i) => (
                    <Card key={i} className="border-l-4 border-muted">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Loading...</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">--</div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    const totalDefectsCount = stats.totalDefectsIncludingReturns !== undefined
        ? stats.totalDefectsIncludingReturns
        : stats.totalDefects + stats.totalReturnQcItems;

    const formatGrowth = (growth: number | undefined) => {
        if (growth === undefined) return "No data";
        const sign = growth >= 0 ? "+" : "";
        return `${sign}${growth.toFixed(1)}% from last month`;
    };

    const items = [
        {
            title: "Total Defects",
            value: totalDefectsCount,
            icon: AlertCircle,
            color: "text-primary",
            borderColor: "border-secondary",
            bgColor: "bg-secondary/20",
            growth: stats.defectsGrowth
        },
        {
            title: "Returns Processed",
            value: stats.totalReturnQcItems,
            icon: Package,
            color: "text-primary",
            borderColor: "border-secondary",
            bgColor: "bg-secondary/20",
            growth: stats.returnsGrowth
        },
        {
            title: "Assemblies Created",
            value: stats.totalAssemblies,
            icon: CheckCircle2,
            color: "text-primary",
            borderColor: "border-secondary",
            bgColor: "bg-secondary/20",
            growth: stats.assembliesGrowth
        },
        {
            title: "Batches Added",
            value: stats.totalBatches,
            icon: CircleDollarSign,
            color: "text-primary",
            borderColor: "border-secondary",
            bgColor: "bg-secondary/20",
            growth: stats.batchesGrowth
        },
    ];

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 animate-fade-in">
            {items.map((item) => (
                <Card
                    key={item.title}
                    className={`border-l-4 ${item.borderColor} hover:-translate-y-1 hover:shadow-lg transition-all duration-300`}
                >
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            {item.title}
                        </CardTitle>
                        <div className={`p-2 rounded-full ${item.bgColor}`}>
                            <item.icon className={`h-4 w-4 ${item.color}`} />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-foreground">{item.value}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {formatGrowth(item.growth)}
                        </p>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
