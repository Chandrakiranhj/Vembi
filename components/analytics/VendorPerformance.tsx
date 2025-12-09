"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";

interface VendorData {
    id: string;
    name: string;
    totalDefects: number;
    totalBatches: number;
    defectRate: number;
}

interface VendorPerformanceProps {
    vendors: VendorData[];
    loading?: boolean;
    onViewVendor?: (id: string) => void;
}

export function VendorPerformance({ vendors, loading, onViewVendor }: VendorPerformanceProps) {
    if (loading) {
        return (
            <Card className="col-span-4">
                <CardHeader>
                    <CardTitle>Vendor Performance</CardTitle>
                </CardHeader>
                <CardContent className="h-[300px] flex items-center justify-center">
                    <div className="animate-pulse w-full h-full bg-muted/20 rounded-md"></div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="col-span-4">
            <CardHeader>
                <CardTitle>Vendor Performance (Defect Rate)</CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Vendor</TableHead>
                            <TableHead className="text-right">Batches</TableHead>
                            <TableHead className="text-right">Defects</TableHead>
                            <TableHead className="text-right">Defect Rate</TableHead>
                            <TableHead className="text-right">Status</TableHead>
                            <TableHead></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {vendors.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                                    No vendor data available for this period
                                </TableCell>
                            </TableRow>
                        ) : (
                            vendors.map((vendor) => (
                                <TableRow
                                    key={vendor.id}
                                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                                    onClick={() => onViewVendor?.(vendor.id)}
                                >
                                    <TableCell className="font-medium">{vendor.name}</TableCell>
                                    <TableCell className="text-right">{vendor.totalBatches}</TableCell>
                                    <TableCell className="text-right">{vendor.totalDefects}</TableCell>
                                    <TableCell className="text-right">{vendor.defectRate}%</TableCell>
                                    <TableCell className="text-right">
                                        <Badge variant={vendor.defectRate > 5 ? "destructive" : vendor.defectRate > 2 ? "secondary" : "default"} className={vendor.defectRate > 2 && vendor.defectRate <= 5 ? "bg-yellow-500 hover:bg-yellow-600" : ""}>
                                            {vendor.defectRate > 5 ? "Critical" : vendor.defectRate > 2 ? "Warning" : "Good"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                            <ChevronRight className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
