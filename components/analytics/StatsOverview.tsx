import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowDownIcon, ArrowUpIcon, Activity, AlertTriangle, Package, RotateCcw } from "lucide-react";

interface StatsOverviewProps {
    stats: {
        totalReturns: number;
        globalDefectRate: number;
        returnsByStatus: any[];
    } | null;
    loading: boolean;
}

export function StatsOverview({ stats, loading }: StatsOverviewProps) {
    if (loading) {
        return <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="animate-pulse">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <div className="h-4 w-24 bg-muted rounded"></div>
                    </CardHeader>
                    <CardContent>
                        <div className="h-8 w-16 bg-muted rounded"></div>
                    </CardContent>
                </Card>
            ))}
        </div>;
    }

    if (!stats) return null;

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Returns</CardTitle>
                    <RotateCcw className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats.totalReturns}</div>
                    <p className="text-xs text-muted-foreground">
                        All time returns
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Global Defect Rate</CardTitle>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats.globalDefectRate}%</div>
                    <p className="text-xs text-muted-foreground">
                        Of checked components
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Active Issues</CardTitle>
                    <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">
                        {stats.returnsByStatus.find((s: any) => s.status === 'RECEIVED')?._count.id || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Pending QC
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Processed</CardTitle>
                    <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">
                        {stats.returnsByStatus.filter((s: any) => ['REPAIRED', 'REPLACED', 'RETURNED'].includes(s.status))
                            .reduce((acc: number, curr: any) => acc + curr._count.id, 0)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Completed returns
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
