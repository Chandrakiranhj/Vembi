"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { useMemo } from "react";

interface ActivityItem {
    timestamp: string;
}

interface ActivityChartProps {
    activities: ActivityItem[];
    isLoading: boolean;
}

export function ActivityChart({ activities, isLoading }: ActivityChartProps) {
    const data = useMemo(() => {
        if (!activities.length) return [];

        // Group by day (last 7 days)
        const days = new Map<string, number>();
        const now = new Date();

        // Initialize last 7 days with 0
        for (let i = 6; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(d.getDate() - i);
            const key = d.toLocaleDateString('en-US', { weekday: 'short' });
            days.set(key, 0);
        }

        activities.forEach(activity => {
            const d = new Date(activity.timestamp);
            const key = d.toLocaleDateString('en-US', { weekday: 'short' });
            if (days.has(key)) {
                days.set(key, (days.get(key) || 0) + 1);
            }
        });

        return Array.from(days.entries()).map(([name, total]) => ({
            name,
            total
        }));
    }, [activities]);

    if (isLoading) {
        return (
            <Card className="col-span-4">
                <CardHeader>
                    <CardTitle>Activity Overview</CardTitle>
                    <CardDescription>Daily activity volume over the last 7 days.</CardDescription>
                </CardHeader>
                <CardContent className="pl-2">
                    <div className="h-[200px] w-full bg-muted animate-pulse rounded-md" />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="col-span-4 hover:shadow-md transition-shadow duration-300">
            <CardHeader>
                <CardTitle>Activity Overview</CardTitle>
                <CardDescription>Daily activity volume over the last 7 days.</CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
                <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                        <XAxis
                            dataKey="name"
                            stroke="#888888"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            tick={{ fill: 'hsl(var(--muted-foreground))' }}
                        />
                        <YAxis
                            stroke="#888888"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) => `${value}`}
                            tick={{ fill: 'hsl(var(--muted-foreground))' }}
                        />
                        <Tooltip
                            cursor={{ fill: 'hsl(var(--muted)/0.4)' }}
                            contentStyle={{
                                borderRadius: '8px',
                                border: '1px solid hsl(var(--border))',
                                boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                                backgroundColor: 'hsl(var(--popover))',
                                color: 'hsl(var(--popover-foreground))'
                            }}
                            itemStyle={{ color: 'hsl(var(--primary))', fontWeight: 600 }}
                            labelStyle={{ color: 'hsl(var(--muted-foreground))' }}
                        />
                        <Bar
                            dataKey="total"
                            fill="hsl(var(--primary))"
                            radius={[4, 4, 0, 0]}
                            className="fill-primary hover:opacity-80 transition-opacity"
                        />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}
