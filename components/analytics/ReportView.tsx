"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, AlertTriangle, Package, CheckCircle, XCircle, Calendar, TrendingUp, User, Mail, Phone, MapPin, Wrench, Clock } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrendChart } from "./TrendChart";
import { DefectDistributionChart } from "./DefectDistributionChart";

interface ReportViewProps {
    type: 'batch' | 'component' | 'product' | 'vendor' | 'assembly';
    id: string;
}

export function ReportView({ type, id }: ReportViewProps) {
    const { data: report, isLoading, error } = useQuery({
        queryKey: ['analytics-report', type, id],
        queryFn: async () => {
            const res = await fetch(`/api/analytics/reports/${type}/${id}`);
            if (!res.ok) throw new Error('Failed to fetch report');
            return res.json();
        }
    });

    if (isLoading) {
        return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
    }

    if (error) {
        return <div className="text-center text-destructive p-12">Failed to load report</div>;
    }

    if (!report) return null;

    // Render Batch Report
    if (type === 'batch') {
        const { details, inventory, quality, returns } = report;

        // Prepare chart data
        const defectTypes = returns.reduce((acc: any, r: any) => {
            const type = r.defectDescription || 'Unspecified';
            acc[type] = (acc[type] || 0) + 1;
            return acc;
        }, {});

        const distributionData = Object.entries(defectTypes).map(([name, value]: [string, any]) => ({ name, value }));

        // Simple timeline data (defects by date)
        const timeline = returns.reduce((acc: any, r: any) => {
            const date = new Date(r.date).toLocaleDateString();
            acc[date] = (acc[date] || 0) + 1;
            return acc;
        }, {});

        const trendData = Object.entries(timeline).map(([name, defects]: [string, any]) => ({ name, defects, returns: 0 }));

        return (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="grid gap-4 md:grid-cols-3">
                    <Card className="md:col-span-1">
                        <CardHeader><CardTitle className="text-sm font-medium">Batch Information</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <div className="text-sm text-muted-foreground">Batch Number</div>
                                <div className="text-2xl font-bold">{details.batchNumber}</div>
                            </div>
                            <Separator />
                            <div>
                                <div className="text-sm text-muted-foreground">Component</div>
                                <div className="font-medium">{details.componentName}</div>
                                <div className="text-xs text-muted-foreground">{details.sku}</div>
                            </div>
                            <div>
                                <div className="text-sm text-muted-foreground">Vendor</div>
                                <div className="font-medium">{details.vendorName}</div>
                            </div>
                            <div>
                                <div className="text-sm text-muted-foreground">Received Date</div>
                                <div className="font-medium">{new Date(details.receivedDate).toLocaleDateString()}</div>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="md:col-span-2 grid gap-4 md:grid-cols-2">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Inventory Health</CardTitle>
                                <Package className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{inventory.current} / {inventory.initial}</div>
                                <p className="text-xs text-muted-foreground mb-4">Units Remaining</p>
                                <div className="w-full bg-secondary h-2 rounded-full">
                                    <div
                                        className="bg-primary h-2 rounded-full transition-all"
                                        style={{ width: `${100 - inventory.percentUsed}%` }}
                                    />
                                </div>
                                <div className="mt-2 text-xs text-right">{100 - inventory.percentUsed}% Remaining</div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Defect Rate</CardTitle>
                                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-destructive">{quality.defectRate}%</div>
                                <p className="text-xs text-muted-foreground mb-4">{quality.totalDefects} defects found</p>
                                <div className="flex gap-2">
                                    {Object.entries(quality.severityBreakdown || {}).map(([severity, count]: [string, any]) => (
                                        <Badge key={severity} variant="outline" className="text-xs">
                                            {severity}: {count}
                                        </Badge>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="col-span-2">
                            <CardHeader><CardTitle className="text-sm font-medium">Defect Analysis</CardTitle></CardHeader>
                            <CardContent className="grid md:grid-cols-2 gap-4">
                                <div className="h-[200px]">
                                    <DefectDistributionChart data={distributionData} title="Defect Types" />
                                </div>
                                <div className="h-[200px]">
                                    {/* Reuse TrendChart but simplified or just show a list if data is sparse */}
                                    {trendData.length > 0 ? (
                                        <TrendChart data={trendData} />
                                    ) : (
                                        <div className="flex items-center justify-center h-full text-muted-foreground">No trend data</div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                <Card>
                    <CardHeader><CardTitle>Defect History</CardTitle></CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Return #</TableHead>
                                    <TableHead>Defect Description</TableHead>
                                    <TableHead>Severity</TableHead>
                                    <TableHead>Resolution</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {returns.map((r: any) => (
                                    <TableRow key={r.id}>
                                        <TableCell>{new Date(r.date).toLocaleDateString()}</TableCell>
                                        <TableCell className="font-medium">{r.serialNumber}</TableCell>
                                        <TableCell>{r.defectDescription}</TableCell>
                                        <TableCell>
                                            <Badge variant={r.severity === 'CRITICAL' ? 'destructive' : r.severity === 'HIGH' ? 'destructive' : 'outline'}>
                                                {r.severity}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{r.resolution}</TableCell>
                                    </TableRow>
                                ))}
                                {returns.length === 0 && (
                                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No defects reported for this batch.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Render Component Report
    if (type === 'component') {
        const { details, inventory, quality, worstBatches } = report;
        return (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="grid gap-4 md:grid-cols-3">
                    <Card className="col-span-2">
                        <CardHeader><CardTitle>Component Overview</CardTitle></CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold mb-2">{details.name}</div>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div><span className="text-muted-foreground">SKU:</span> {details.sku}</div>
                                <div><span className="text-muted-foreground">Category:</span> {details.category}</div>
                                <div className="col-span-2"><span className="text-muted-foreground">Description:</span> {details.description || 'N/A'}</div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader><CardTitle className="text-sm font-medium">Global Stats</CardTitle></CardHeader>
                        <CardContent className="space-y-2">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Total Stock:</span>
                                <span className="font-bold">{inventory.totalCurrent} / {inventory.totalInitial}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Total Defects:</span>
                                <span className="font-bold text-destructive">{quality.totalDefects}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Avg Defect Rate:</span>
                                <span className="font-bold">{quality.globalDefectRate}%</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader><CardTitle>Worst Performing Batches</CardTitle></CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Batch #</TableHead>
                                    <TableHead>Vendor</TableHead>
                                    <TableHead className="text-right">Defects</TableHead>
                                    <TableHead className="text-right">Defect Rate</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {worstBatches.map((b: any) => (
                                    <TableRow key={b.id}>
                                        <TableCell className="font-medium">{b.batchNumber}</TableCell>
                                        <TableCell>{b.vendorName}</TableCell>
                                        <TableCell className="text-right">{b.defects}</TableCell>
                                        <TableCell className="text-right">
                                            <Badge variant="destructive">{b.defectRate}%</Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {worstBatches.length === 0 && (
                                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No problematic batches found.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Render Product Report
    if (type === 'product') {
        const { details, stats } = report;
        return (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="grid gap-4 md:grid-cols-2">
                    <Card>
                        <CardHeader><CardTitle>Product Details</CardTitle></CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold mb-2">{details.name}</div>
                            <div className="text-sm text-muted-foreground mb-4">{details.modelNumber}</div>
                            <div className="text-sm">{details.description}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader><CardTitle>Return Statistics</CardTitle></CardHeader>
                        <CardContent>
                            <div className="text-4xl font-bold mb-2">{stats.totalReturns}</div>
                            <div className="text-sm text-muted-foreground">Total Returns Processed</div>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                    <Card>
                        <CardHeader><CardTitle>Common Return Reasons</CardTitle></CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {Object.entries(stats.commonReasons).map(([reason, count]: [string, any]) => (
                                    <div key={reason} className="flex justify-between items-center">
                                        <span>{reason}</span>
                                        <Badge variant="secondary">{count}</Badge>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader><CardTitle>Top Defective Components</CardTitle></CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {stats.topDefectiveComponents.map((c: any) => (
                                    <div key={c.name} className="flex justify-between items-center">
                                        <span>{c.name}</span>
                                        <Badge variant="destructive">{c.count} defects</Badge>
                                    </div>
                                ))}
                                {stats.topDefectiveComponents.length === 0 && (
                                    <div className="text-center text-muted-foreground">No component defect data available.</div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    // Render Vendor Report
    if (type === 'vendor') {
        const { details, stats, batches } = report;
        return (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="grid gap-4 md:grid-cols-3">
                    <Card className="md:col-span-1">
                        <CardHeader><CardTitle className="text-sm font-medium">Vendor Details</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">{details.name}</span>
                            </div>
                            {details.contactPerson && (
                                <div className="flex items-center gap-2 text-sm">
                                    <User className="h-4 w-4 text-muted-foreground opacity-50" />
                                    <span>{details.contactPerson}</span>
                                </div>
                            )}
                            {details.email && (
                                <div className="flex items-center gap-2 text-sm">
                                    <Mail className="h-4 w-4 text-muted-foreground opacity-50" />
                                    <a href={`mailto:${details.email}`} className="text-primary hover:underline">{details.email}</a>
                                </div>
                            )}
                            {details.phone && (
                                <div className="flex items-center gap-2 text-sm">
                                    <Phone className="h-4 w-4 text-muted-foreground opacity-50" />
                                    <span>{details.phone}</span>
                                </div>
                            )}
                            {details.address && (
                                <div className="flex items-center gap-2 text-sm">
                                    <MapPin className="h-4 w-4 text-muted-foreground opacity-50" />
                                    <span>{details.address}</span>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="md:col-span-2">
                        <CardHeader><CardTitle className="text-sm font-medium">Performance Metrics</CardTitle></CardHeader>
                        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                                <div className="text-sm text-muted-foreground">Total Batches</div>
                                <div className="text-2xl font-bold">{stats.totalBatches}</div>
                            </div>
                            <div>
                                <div className="text-sm text-muted-foreground">Items Supplied</div>
                                <div className="text-2xl font-bold">{stats.totalItemsSupplied}</div>
                            </div>
                            <div>
                                <div className="text-sm text-muted-foreground">Total Defects</div>
                                <div className="text-2xl font-bold text-destructive">{stats.totalDefects}</div>
                            </div>
                            <div>
                                <div className="text-sm text-muted-foreground">Defect Rate</div>
                                <div className="text-2xl font-bold">{stats.globalDefectRate}%</div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader><CardTitle>Batch History</CardTitle></CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date Received</TableHead>
                                    <TableHead>Batch #</TableHead>
                                    <TableHead>Component</TableHead>
                                    <TableHead className="text-right">Qty</TableHead>
                                    <TableHead className="text-right">Defects</TableHead>
                                    <TableHead className="text-right">Rate</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {batches.map((b: any) => (
                                    <TableRow key={b.id}>
                                        <TableCell>{new Date(b.dateReceived).toLocaleDateString()}</TableCell>
                                        <TableCell className="font-medium">{b.batchNumber}</TableCell>
                                        <TableCell>{b.componentName}</TableCell>
                                        <TableCell className="text-right">{b.initialQuantity}</TableCell>
                                        <TableCell className="text-right">{b.defects}</TableCell>
                                        <TableCell className="text-right">
                                            <Badge variant={parseFloat(b.defectRate) > 5 ? "destructive" : "secondary"}>
                                                {b.defectRate}%
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {batches.length === 0 && (
                                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No batches found.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Render Assembly Report
    if (type === 'assembly') {
        const { details, components, timeline } = report;
        return (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="grid gap-4 md:grid-cols-3">
                    <Card className="md:col-span-1">
                        <CardHeader><CardTitle className="text-sm font-medium">Assembly Details</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <div className="text-sm text-muted-foreground">Serial Number</div>
                                <div className="text-2xl font-bold">{details.serialNumber}</div>
                            </div>
                            <Separator />
                            <div>
                                <div className="text-sm text-muted-foreground">Product</div>
                                <div className="font-medium">{details.productName}</div>
                                <div className="text-xs text-muted-foreground">{details.modelNumber}</div>
                            </div>
                            <div>
                                <div className="text-sm text-muted-foreground">Status</div>
                                <Badge variant={details.status === 'PASSED_QC' ? 'default' : details.status === 'FAILED_QC' ? 'destructive' : 'secondary'}>
                                    {details.status}
                                </Badge>
                            </div>
                            <div>
                                <div className="text-sm text-muted-foreground">Assembled By</div>
                                <div className="flex items-center gap-2">
                                    <User className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-medium">{details.assembledBy}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="md:col-span-2">
                        <CardHeader><CardTitle className="text-sm font-medium">Timeline</CardTitle></CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {timeline.map((event: any, index: number) => (
                                    <div key={index} className="flex gap-4 items-start">
                                        <div className="flex flex-col items-center">
                                            <div className="h-2 w-2 rounded-full bg-primary mt-2" />
                                            {index < timeline.length - 1 && <div className="w-0.5 h-full bg-border mt-1" />}
                                        </div>
                                        <div>
                                            <div className="font-medium">{event.event}</div>
                                            <div className="text-sm text-muted-foreground">{event.details}</div>
                                            <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                                <Clock className="h-3 w-3" />
                                                {new Date(event.date).toLocaleString()}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader><CardTitle>Components Used</CardTitle></CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Component</TableHead>
                                    <TableHead>SKU</TableHead>
                                    <TableHead>Batch #</TableHead>
                                    <TableHead className="text-right">Quantity</TableHead>
                                    <TableHead>Expiry</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {components.map((c: any) => (
                                    <TableRow key={c.id}>
                                        <TableCell className="font-medium">{c.componentName}</TableCell>
                                        <TableCell>{c.sku}</TableCell>
                                        <TableCell>{c.batchNumber}</TableCell>
                                        <TableCell className="text-right">{c.quantityUsed}</TableCell>
                                        <TableCell>{c.batchExpiry ? new Date(c.batchExpiry).toLocaleDateString() : 'N/A'}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return null;
}
