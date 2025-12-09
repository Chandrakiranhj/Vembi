"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { StatsOverview } from "./StatsOverview";
import { TopDefectBatches } from "./TopDefectBatches";
import { GlobalSearch } from "./GlobalSearch";
import { ReportView } from "./ReportView";
import { TrendChart } from "./TrendChart";
import { DefectDistributionChart } from "./DefectDistributionChart";
import { DateRangeSelector } from "./DateRangeSelector";
import { InventoryHealth } from "./InventoryHealth";
import { VendorPerformance } from "./VendorPerformance";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Loader2 } from "lucide-react";
import { DateRange } from "react-day-picker";
import { subMonths } from "date-fns";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface SearchResult {
    id: string;
    type: 'batch' | 'component' | 'product' | 'return' | 'assembly';
    label: string;
    subLabel: string;
}

export function AnalyticsDashboard() {
    const [selectedReport, setSelectedReport] = useState<{ type: 'batch' | 'component' | 'product' | 'vendor' | 'assembly', id: string } | null>(null);
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: subMonths(new Date(), 1), // Default to last 30 days
        to: new Date(),
    });

    const { data: stats, isLoading: statsLoading } = useQuery({
        queryKey: ['analytics-stats', dateRange?.from, dateRange?.to],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (dateRange?.from) params.append('startDate', dateRange.from.toISOString());
            if (dateRange?.to) params.append('endDate', dateRange.to.toISOString());

            const res = await fetch(`/api/analytics/stats?${params.toString()}`);
            if (!res.ok) throw new Error('Failed to fetch stats');
            return res.json();
        }
    });

    const handleSearchSelect = (result: SearchResult) => {
        if (result.type === 'return') {
            return;
        }
        setSelectedReport({ type: result.type as any, id: result.id });
    };

    const handleViewBatch = (id: string) => {
        setSelectedReport({ type: 'batch', id });
    };

    const handleViewVendor = (id: string) => {
        setSelectedReport({ type: 'vendor', id });
    };

    const handleExport = async () => {
        if (!selectedReport) return;

        try {
            toast.loading("Generating report...");
            const res = await fetch(`/api/analytics/export?type=${selectedReport.type}&id=${selectedReport.id}`);

            if (!res.ok) throw new Error('Export failed');

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `report-${selectedReport.type}-${selectedReport.id}.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            toast.dismiss();
            toast.success("Report downloaded successfully");
        } catch (error) {
            toast.dismiss();
            toast.error("Failed to export report");
            console.error(error);
        }
    };

    // Prepare data for Defect Distribution Chart
    const defectDistributionData = stats?.overview?.returnsByStatus?.map((status: any) => ({
        name: status.status,
        value: status._count.id
    })) || [];

    return (
        <div className="space-y-8 p-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Analytics & Reports</h2>
                    <p className="text-muted-foreground">
                        Comprehensive insights into inventory quality and defect trends.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {selectedReport ? (
                        <>
                            <Button variant="outline" onClick={handleExport}>
                                <Download className="mr-2 h-4 w-4" /> Export CSV
                            </Button>
                            <Button variant="ghost" onClick={() => setSelectedReport(null)}>
                                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
                            </Button>
                        </>
                    ) : (
                        <>
                            <DateRangeSelector date={dateRange} setDate={setDateRange} />
                            <GlobalSearch onSelect={handleSearchSelect} />
                        </>
                    )}
                </div>
            </div>

            {selectedReport ? (
                <ReportView type={selectedReport.type} id={selectedReport.id} />
            ) : (
                <Tabs defaultValue="overview" className="space-y-4">
                    <TabsList>
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="inventory">Inventory Health</TabsTrigger>
                        <TabsTrigger value="returns">Returns & Defects</TabsTrigger>
                        <TabsTrigger value="vendors">Vendor Performance</TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="space-y-4">
                        <StatsOverview stats={stats?.overview} loading={statsLoading} />
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                            <TrendChart data={stats?.trends || []} loading={statsLoading} />
                            <DefectDistributionChart data={defectDistributionData} title="Return Status Distribution" loading={statsLoading} />
                        </div>
                    </TabsContent>

                    <TabsContent value="inventory" className="space-y-4">
                        <InventoryHealth data={stats?.overview?.inventoryHealth} loading={statsLoading} />
                        <div className="grid gap-4 md:grid-cols-1">
                            <TopDefectBatches
                                batches={stats?.topDefectBatches || []}
                                onViewBatch={handleViewBatch}
                            />
                        </div>
                    </TabsContent>

                    <TabsContent value="returns" className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                            <TrendChart data={stats?.trends || []} loading={statsLoading} />
                            <DefectDistributionChart data={defectDistributionData} title="Return Status Distribution" loading={statsLoading} />
                        </div>
                        <TopDefectBatches
                            batches={stats?.topDefectBatches || []}
                            onViewBatch={handleViewBatch}
                        />
                    </TabsContent>

                    <TabsContent value="vendors" className="space-y-4">
                        <VendorPerformance
                            vendors={stats?.vendorPerformance || []}
                            loading={statsLoading}
                            onViewVendor={handleViewVendor}
                        />
                    </TabsContent>
                </Tabs>
            )}
        </div>
    );
}
