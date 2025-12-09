import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

interface BatchStat {
    id: string;
    batchNumber: string;
    componentName: string;
    vendorName: string;
    totalDefects: number;
    initialQuantity: number;
    defectRate: number;
}

interface TopDefectBatchesProps {
    batches: BatchStat[];
    onViewBatch: (id: string) => void;
}

export function TopDefectBatches({ batches, onViewBatch }: TopDefectBatchesProps) {
    return (
        <Card className="col-span-4">
            <CardHeader>
                <CardTitle>Highest Defect Rate Batches</CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Batch Number</TableHead>
                            <TableHead>Component</TableHead>
                            <TableHead>Vendor</TableHead>
                            <TableHead className="text-right">Defects</TableHead>
                            <TableHead className="text-right">Defect Rate</TableHead>
                            <TableHead></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {batches.map((batch) => (
                            <TableRow key={batch.id}>
                                <TableCell className="font-medium">{batch.batchNumber}</TableCell>
                                <TableCell>{batch.componentName}</TableCell>
                                <TableCell>{batch.vendorName}</TableCell>
                                <TableCell className="text-right">
                                    {batch.totalDefects} / {batch.initialQuantity}
                                </TableCell>
                                <TableCell className="text-right">
                                    <Badge variant={batch.defectRate > 10 ? "destructive" : "secondary"}>
                                        {batch.defectRate}%
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => onViewBatch(batch.id)}
                                    >
                                        View <ArrowRight className="ml-2 h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                        {batches.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                                    No defect data available yet.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
