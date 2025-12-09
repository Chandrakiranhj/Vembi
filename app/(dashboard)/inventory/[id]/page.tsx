'use client';

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Package, AlertTriangle, CheckCircle2, History, FileText, ExternalLink } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Image from "next/image";

interface StockBatch {
    id: string;
    batchNumber: string;
    initialQuantity: number;
    currentQuantity: number;
    dateReceived: string;
    expiryDate: string | null;
    vendor: {
        name: string;
    };
    invoiceImage: string | null;
}

interface AssemblyUsage {
    id: string;
    quantityUsed: number;
    createdAt: string;
    assembly: {
        id: string;
        serialNumber: string;
        status: string;
        createdAt: string;
    };
    stockBatch: {
        batchNumber: string;
    };
}

interface ReturnQCDefect {
    id: string;
    description: string;
    createdAt: string;
    qc: {
        return: {
            id: string;
            serialNumber: string;
            reason: string;
        };
    };
}

interface ComponentDetails {
    id: string;
    name: string;
    sku: string;
    description: string;
    category: string;
    minimumQuantity: number;
    stockBatches: StockBatch[];
    assemblyUsages: AssemblyUsage[];
    returnQCDefects: ReturnQCDefect[];
}

export default function ComponentDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const [component, setComponent] = useState<ComponentDetails | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchComponent = async () => {
            try {
                setIsLoading(true);
                const response = await fetch(`/api/components/${params.id}`);
                if (!response.ok) {
                    throw new Error("Failed to fetch component details");
                }
                const data = await response.json();
                setComponent(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : "An error occurred");
            } finally {
                setIsLoading(false);
            }
        };

        if (params.id) {
            fetchComponent();
        }
    }, [params.id]);

    if (isLoading) {
        return (
            <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
                <div className="flex items-center space-x-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2">
                        <Skeleton className="h-8 w-[200px]" />
                        <Skeleton className="h-4 w-[150px]" />
                    </div>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                    <Skeleton className="h-32" />
                    <Skeleton className="h-32" />
                    <Skeleton className="h-32" />
                </div>
                <Skeleton className="h-[400px]" />
            </div>
        );
    }

    if (error || !component) {
        return (
            <div className="flex-1 p-4 md:p-8 pt-6">
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>
                        {error || "Component not found"}
                        <Button variant="outline" size="sm" onClick={() => router.back()} className="ml-2">
                            Go Back
                        </Button>
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    const totalStock = component.stockBatches.reduce((acc, batch) => acc + batch.currentQuantity, 0);
    const totalUtilized = component.assemblyUsages.reduce((acc, usage) => acc + usage.quantityUsed, 0);
    const totalDefects = component.returnQCDefects.length;

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">{component.name}</h2>
                        <div className="flex items-center space-x-2 text-muted-foreground">
                            <Badge variant="outline">{component.sku}</Badge>
                            <Badge variant="secondary">{component.category}</Badge>
                        </div>
                    </div>
                </div>

            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Stock</CardTitle>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalStock}</div>
                        <p className="text-xs text-muted-foreground">
                            Across {component.stockBatches.length} batches
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Utilized</CardTitle>
                        <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalUtilized}</div>
                        <p className="text-xs text-muted-foreground">
                            Used in {component.assemblyUsages.length} assemblies
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Defect Reports</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalDefects}</div>
                        <p className="text-xs text-muted-foreground">
                            Reported in returns
                        </p>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="batches" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="batches">Stock Batches</TabsTrigger>
                    <TabsTrigger value="usage">Usage History</TabsTrigger>
                    <TabsTrigger value="defects">Defects</TabsTrigger>
                </TabsList>

                <TabsContent value="batches">
                    <Card>
                        <CardHeader>
                            <CardTitle>Stock Batches</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Batch #</TableHead>
                                        <TableHead>Vendor</TableHead>
                                        <TableHead>Date Received</TableHead>
                                        <TableHead>Initial Qty</TableHead>
                                        <TableHead>Current Qty</TableHead>
                                        <TableHead>Invoice</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {component.stockBatches.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center text-muted-foreground">
                                                No batches found.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        component.stockBatches.map((batch) => (
                                            <TableRow key={batch.id}>
                                                <TableCell className="font-medium">{batch.batchNumber}</TableCell>
                                                <TableCell>{batch.vendor.name}</TableCell>
                                                <TableCell>{new Date(batch.dateReceived).toLocaleDateString()}</TableCell>
                                                <TableCell>{batch.initialQuantity}</TableCell>
                                                <TableCell>{batch.currentQuantity}</TableCell>
                                                <TableCell>
                                                    {batch.invoiceImage ? (
                                                        batch.invoiceImage.toLowerCase().endsWith('.pdf') ? (
                                                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" asChild>
                                                                <a href={batch.invoiceImage} target="_blank" rel="noopener noreferrer">
                                                                    <FileText className="h-4 w-4 text-red-500" />
                                                                </a>
                                                            </Button>
                                                        ) : (
                                                            <Dialog>
                                                                <DialogTrigger asChild>
                                                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                                        <FileText className="h-4 w-4 text-blue-500" />
                                                                    </Button>
                                                                </DialogTrigger>
                                                                <DialogContent className="max-w-3xl">
                                                                    <DialogHeader>
                                                                        <DialogTitle>Invoice Preview - {batch.batchNumber}</DialogTitle>
                                                                    </DialogHeader>
                                                                    <div className="relative aspect-[3/4] w-full mt-4">
                                                                        <Image
                                                                            src={batch.invoiceImage}
                                                                            alt={`Invoice for batch ${batch.batchNumber}`}
                                                                            fill
                                                                            className="object-contain"
                                                                        />
                                                                    </div>
                                                                    <div className="flex justify-end mt-2">
                                                                        <Button variant="outline" size="sm" asChild>
                                                                            <a href={batch.invoiceImage} target="_blank" rel="noopener noreferrer">
                                                                                Open Original <ExternalLink className="ml-2 h-3 w-3" />
                                                                            </a>
                                                                        </Button>
                                                                    </div>
                                                                </DialogContent>
                                                            </Dialog>
                                                        )
                                                    ) : (
                                                        <span className="text-muted-foreground text-xs">-</span>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    {batch.currentQuantity === 0 ? (
                                                        <Badge variant="outline">Depleted</Badge>
                                                    ) : (
                                                        <Badge variant="secondary">Active</Badge>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="usage">
                    <Card>
                        <CardHeader>
                            <CardTitle>Assembly Usage</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Assembly Serial</TableHead>
                                        <TableHead>Date Used</TableHead>
                                        <TableHead>Batch Used</TableHead>
                                        <TableHead>Quantity</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {component.assemblyUsages.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center text-muted-foreground">
                                                No usage history found.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        component.assemblyUsages.map((usage) => (
                                            <TableRow key={usage.id}>
                                                <TableCell className="font-medium">{usage.assembly.serialNumber}</TableCell>
                                                <TableCell>{new Date(usage.createdAt).toLocaleDateString()}</TableCell>
                                                <TableCell>{usage.stockBatch.batchNumber}</TableCell>
                                                <TableCell>{usage.quantityUsed}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline">{usage.assembly.status}</Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="defects">
                    <Card>
                        <CardHeader>
                            <CardTitle>Defect Reports (Returns)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Return Serial</TableHead>
                                        <TableHead>Date Reported</TableHead>
                                        <TableHead>Description</TableHead>
                                        <TableHead>Return Reason</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {component.returnQCDefects.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center text-muted-foreground">
                                                No defects reported in returns.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        component.returnQCDefects.map((defect) => (
                                            <TableRow key={defect.id}>
                                                <TableCell className="font-medium">{defect.qc.return.serialNumber}</TableCell>
                                                <TableCell>{new Date(defect.createdAt).toLocaleDateString()}</TableCell>
                                                <TableCell>{defect.description}</TableCell>
                                                <TableCell>{defect.qc.return.reason}</TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
