"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface DistributionData {
    name: string;
    value: number;
}

interface DefectDistributionChartProps {
    data: DistributionData[];
    title?: string;
    loading?: boolean;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export function DefectDistributionChart({ data, title = "Defect Distribution", loading }: DefectDistributionChartProps) {
    if (loading) {
        return (
            <Card className="col-span-3">
                <CardHeader>
                    <CardTitle>{title}</CardTitle>
                </CardHeader>
                <CardContent className="h-[300px] flex items-center justify-center">
                    <div className="animate-pulse w-full h-full bg-muted/20 rounded-md"></div>
                </CardContent>
            </Card>
        );
    }

    // Filter out zero values to avoid ugly charts
    const activeData = data.filter(d => d.value > 0);

    if (activeData.length === 0) {
        return (
            <Card className="col-span-3">
                <CardHeader>
                    <CardTitle>{title}</CardTitle>
                </CardHeader>
                <CardContent className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No data available
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="col-span-3">
            <CardHeader>
                <CardTitle>{title}</CardTitle>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                        <Pie
                            data={activeData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            fill="#8884d8"
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {activeData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip
                            contentStyle={{
                                backgroundColor: "hsl(var(--background))",
                                border: "1px solid hsl(var(--border))",
                                borderRadius: "6px"
                            }}
                        />
                        <Legend />
                    </PieChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}
