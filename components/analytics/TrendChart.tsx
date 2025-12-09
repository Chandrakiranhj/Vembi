"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface TrendData {
    name: string;
    returns: number;
    defects: number;
}

interface TrendChartProps {
    data: TrendData[];
    loading?: boolean;
}

export function TrendChart({ data, loading }: TrendChartProps) {
    if (loading) {
        return (
            <Card className="col-span-4">
                <CardHeader>
                    <CardTitle>Returns & Defects Trend</CardTitle>
                </CardHeader>
                <CardContent className="h-[300px] flex items-center justify-center">
                    <div className="animate-pulse w-full h-full bg-muted/20 rounded-md"></div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="col-span-4 lg:col-span-5">
            <CardHeader>
                <CardTitle>Returns & Defects Trend</CardTitle>
            </CardHeader>
            <CardContent className="pl-2">
                <ResponsiveContainer width="100%" height={350}>
                    <LineChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                        <XAxis
                            dataKey="name"
                            stroke="#888888"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                        />
                        <YAxis
                            stroke="#888888"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) => `${value}`}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: "hsl(var(--background))",
                                border: "1px solid hsl(var(--border))",
                                borderRadius: "6px"
                            }}
                        />
                        <Legend />
                        <Line
                            type="monotone"
                            dataKey="returns"
                            stroke="hsl(var(--primary))"
                            strokeWidth={2}
                            activeDot={{ r: 6 }}
                            name="Total Returns"
                        />
                        <Line
                            type="monotone"
                            dataKey="defects"
                            stroke="hsl(var(--destructive))"
                            strokeWidth={2}
                            name="Defects Found"
                        />
                    </LineChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}
