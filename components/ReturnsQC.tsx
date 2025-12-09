'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
    SheetFooter
} from "@/components/ui/sheet";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import {
    Loader2,
    Search,
    CheckCircle2,
    AlertTriangle,
    XCircle,
    Package,
    ArrowRight,
    Filter,
    Wrench,
    RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';

// Types
interface ReturnItem {
    id: string;
    serialNumber: string;
    reason: string;
    status: string;
    createdAt: string;
    assembly: {
        product: {
            name: string;
            modelNumber: string;
        };
    };
}

interface ComponentItem {
    id: string;
    name: string;
    type: string;
    serialNumber?: string;
}

interface StockBatch {
    id: string;
    batchNumber: string;
    currentQuantity: number;
    expiryDate?: string;
}

interface Defect {
    componentId: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    notes: string;
    resolution: 'NONE' | 'FIX' | 'REPLACE';
    replacementBatchId?: string;
}

interface ReturnsQCProps {
    autoOpenReturnId?: string | null;
    onAutoOpenComplete?: () => void;
}

export function ReturnsQC({ autoOpenReturnId, onAutoOpenComplete }: ReturnsQCProps) {
    const [qcSheetOpen, setQCSheetOpen] = useState(false);
    const [selectedReturn, setSelectedReturn] = useState<ReturnItem | null>(null);
    const [defectDialogOpen, setDefectDialogOpen] = useState(false);
    const [selectedComponent, setSelectedComponent] = useState<ComponentItem | null>(null);
    const [defects, setDefects] = useState<Record<string, Defect>>({});

    // Defect Form State
    const [defectForm, setDefectForm] = useState<{
        severity: string;
        notes: string;
        resolution: 'NONE' | 'FIX' | 'REPLACE';
        replacementBatchId?: string;
    }>({
        severity: 'LOW',
        notes: '',
        resolution: 'NONE'
    });

    const [replacementBatches, setReplacementBatches] = useState<StockBatch[]>([]);
    const [loadingBatches, setLoadingBatches] = useState(false);

    const queryClient = useQueryClient();

    // Fetch Returns
    const { data: returns, isLoading: returnsLoading } = useQuery({
        queryKey: ['returns'],
        queryFn: async () => {
            const res = await fetch('/api/returns');
            if (!res.ok) throw new Error('Failed to fetch returns');
            const data = await res.json();
            return data.returns as ReturnItem[];
        }
    });

    // Fetch Components for selected return
    const { data: components, isLoading: componentsLoading } = useQuery({
        queryKey: ['return-components', selectedReturn?.id],
        queryFn: async () => {
            if (!selectedReturn) return [];
            const res = await fetch(`/api/returns/${selectedReturn.id}/components`);
            if (!res.ok) throw new Error('Failed to fetch components');
            const data = await res.json();
            return data.components as ComponentItem[];
        },
        enabled: !!selectedReturn
    });

    // Auto-open effect
    useEffect(() => {
        if (autoOpenReturnId && returns && !qcSheetOpen) {
            const returnItem = returns.find(r => r.id === autoOpenReturnId);
            if (returnItem) {
                handleStartQC(returnItem);
                if (onAutoOpenComplete) {
                    onAutoOpenComplete();
                }
            }
        }
    }, [autoOpenReturnId, returns, qcSheetOpen, onAutoOpenComplete]);

    // Fetch batches when component selected and resolution is REPLACE
    useEffect(() => {
        if (selectedComponent && defectForm.resolution === 'REPLACE') {
            fetchBatches(selectedComponent.id);
        }
    }, [selectedComponent, defectForm.resolution]);

    const fetchBatches = async (componentId: string) => {
        setLoadingBatches(true);
        try {
            const res = await fetch(`/api/components/${componentId}/batches`);
            if (res.ok) {
                const data = await res.json();
                setReplacementBatches(data);
            }
        } catch (error) {
            console.error('Failed to fetch batches', error);
            toast.error('Failed to load replacement batches');
        } finally {
            setLoadingBatches(false);
        }
    };

    // Submit QC Mutation
    const submitQC = useMutation({
        mutationFn: async (data: { returnId: string; defects: Defect[]; passedComponentIds: string[] }) => {
            const res = await fetch(`/api/returns/${data.returnId}/complete-qc`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!res.ok) throw new Error('Failed to submit QC');
            return res.json();
        },
        onSuccess: () => {
            toast.success('QC completed successfully');
            setQCSheetOpen(false);
            setSelectedReturn(null);
            setDefects({});
            queryClient.invalidateQueries({ queryKey: ['returns'] });
        },
        onError: (err) => toast.error(err.message)
    });

    // Return to Customer Mutation
    const returnToCustomer = useMutation({
        mutationFn: async (returnId: string) => {
            const res = await fetch(`/api/returns/${returnId}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'RETURNED' })
            });
            if (!res.ok) throw new Error('Failed to return item');
            return res.json();
        },
        onSuccess: () => {
            toast.success('Item marked as returned to customer');
            queryClient.invalidateQueries({ queryKey: ['returns'] });
        },
        onError: (err) => toast.error(err.message)
    });

    const handleStartQC = (item: ReturnItem) => {
        setSelectedReturn(item);
        setDefects({});
        setQCSheetOpen(true);
    };

    const handleReturnToCustomer = (returnId: string) => {
        returnToCustomer.mutate(returnId);
    };

    const handleOpenDefectDialog = (component: ComponentItem) => {
        setSelectedComponent(component);
        const existingDefect = defects[component.id];

        if (existingDefect) {
            setDefectForm({
                severity: existingDefect.severity,
                notes: existingDefect.notes,
                resolution: existingDefect.resolution,
                replacementBatchId: existingDefect.replacementBatchId
            });
            // If existing defect was REPLACE, fetch batches immediately
            if (existingDefect.resolution === 'REPLACE') {
                fetchBatches(component.id);
            }
        } else {
            setDefectForm({
                severity: 'LOW',
                notes: '',
                resolution: 'NONE'
            });
        }
        setDefectDialogOpen(true);
    };

    const handleSaveDefect = () => {
        if (!selectedComponent) return;

        if (defectForm.resolution === 'REPLACE' && !defectForm.replacementBatchId) {
            toast.error('Please select a replacement batch');
            return;
        }

        setDefects(prev => ({
            ...prev,
            [selectedComponent.id]: {
                componentId: selectedComponent.id,
                severity: defectForm.severity as Defect['severity'],
                notes: defectForm.notes,
                resolution: defectForm.resolution,
                replacementBatchId: defectForm.replacementBatchId
            }
        }));
        setDefectDialogOpen(false);
        toast.success(`Defect reported for ${selectedComponent.name}`);
    };

    const handleClearDefect = (componentId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setDefects(prev => {
            const newDefects = { ...prev };
            delete newDefects[componentId];
            return newDefects;
        });
        toast.info('Defect cleared');
    };

    const handleCompleteQC = () => {
        if (!selectedReturn || !components) return;

        const defectList = Object.values(defects);
        const passedComponentIds = components
            .map(c => c.id)
            .filter(id => !defects[id]);

        submitQC.mutate({
            returnId: selectedReturn.id,
            defects: defectList,
            passedComponentIds
        });
    };

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'LOW': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'MEDIUM': return 'bg-orange-100 text-orange-800 border-orange-200';
            case 'HIGH': return 'bg-red-100 text-red-800 border-red-200';
            case 'CRITICAL': return 'bg-red-600 text-white border-red-600';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="relative w-72">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search returns..." className="pl-8" />
                </div>
                <Button variant="outline">
                    <Filter className="mr-2 h-4 w-4" /> Filter
                </Button>
            </div>

            <div className="rounded-md border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Serial Number</TableHead>
                            <TableHead>Product</TableHead>
                            <TableHead>Reason</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {returnsLoading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">
                                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                                </TableCell>
                            </TableRow>
                        ) : returns?.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                    No returns found
                                </TableCell>
                            </TableRow>
                        ) : (
                            returns?.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell className="font-medium font-mono">{item.serialNumber}</TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span>{item.assembly.product.name}</span>
                                            <span className="text-xs text-muted-foreground">{item.assembly.product.modelNumber}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="max-w-[200px] truncate" title={item.reason}>
                                        {item.reason}
                                    </TableCell>
                                    <TableCell>{format(new Date(item.createdAt), 'MMM d, yyyy')}</TableCell>
                                    <TableCell>
                                        <Badge variant={(item.status === 'PENDING_QC' || item.status === 'RECEIVED' || item.status === 'IN_INSPECTION') ? 'secondary' : 'outline'}>
                                            {item.status.replace('_', ' ')}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {(item.status === 'PENDING_QC' || item.status === 'RECEIVED' || item.status === 'IN_INSPECTION') && (
                                            <Button size="sm" onClick={() => handleStartQC(item)}>
                                                Perform QC
                                            </Button>
                                        )}
                                        {(item.status === 'REPLACED' || item.status === 'REPAIRED') && (
                                            <Button size="sm" variant="outline" onClick={() => handleReturnToCustomer(item.id)}>
                                                Return to Customer
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* QC Sheet */}
            <Sheet open={qcSheetOpen} onOpenChange={setQCSheetOpen}>
                <SheetContent className="sm:max-w-2xl w-full flex flex-col p-0 gap-0" side="right">
                    <SheetHeader className="p-6 border-b bg-muted/10">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="bg-primary/10 p-2 rounded-full">
                                <Package className="h-5 w-5 text-primary" />
                            </div>
                            <SheetTitle className="text-xl">QC Inspection</SheetTitle>
                        </div>
                        <SheetDescription className="flex flex-col gap-1">
                            <span className="text-foreground font-medium text-base">
                                {selectedReturn?.assembly.product.name}
                            </span>
                            <span className="font-mono text-xs bg-muted px-2 py-1 rounded w-fit">
                                SN: {selectedReturn?.serialNumber}
                            </span>
                        </SheetDescription>
                    </SheetHeader>

                    <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                                    Components ({components?.length || 0})
                                </h3>
                                <Badge variant="outline" className="bg-background">
                                    {Object.keys(defects).length} Defects Reported
                                </Badge>
                            </div>

                            {componentsLoading ? (
                                <div className="flex justify-center py-8">
                                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-3">
                                    {components?.map((component) => {
                                        const defect = defects[component.id];
                                        return (
                                            <Card
                                                key={component.id}
                                                className={`transition-all duration-200 border-l-4 ${defect
                                                    ? 'border-l-red-500 border-y-red-100 border-r-red-100 bg-red-50/30'
                                                    : 'border-l-green-500 hover:shadow-md'
                                                    }`}
                                            >
                                                <CardContent className="p-4 flex items-center justify-between gap-4">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="font-medium text-foreground">{component.name}</span>
                                                            {defect ? (
                                                                <Badge variant="destructive" className="text-[10px] h-5 px-1.5">Defect</Badge>
                                                            ) : (
                                                                <Badge variant="outline" className="text-[10px] h-5 px-1.5 text-green-600 border-green-200 bg-green-50">Passed</Badge>
                                                            )}
                                                        </div>
                                                        <p className="text-xs text-muted-foreground font-mono">
                                                            {component.serialNumber || 'No Serial'}
                                                        </p>
                                                        {defect && (
                                                            <div className="mt-2 text-sm bg-white/50 p-2 rounded border border-red-100">
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <Badge className={`text-[10px] h-4 px-1 ${getSeverityColor(defect.severity)}`}>
                                                                        {defect.severity}
                                                                    </Badge>
                                                                    {defect.resolution === 'FIX' && (
                                                                        <Badge variant="outline" className="text-[10px] h-4 px-1 bg-blue-50 text-blue-700 border-blue-200">
                                                                            <Wrench className="h-3 w-3 mr-1" /> Fix
                                                                        </Badge>
                                                                    )}
                                                                    {defect.resolution === 'REPLACE' && (
                                                                        <Badge variant="outline" className="text-[10px] h-4 px-1 bg-purple-50 text-purple-700 border-purple-200">
                                                                            <RefreshCw className="h-3 w-3 mr-1" /> Replace
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                                <p className="text-xs text-red-800 mb-1">{defect.notes}</p>
                                                                {defect.resolution === 'REPLACE' && (
                                                                    <p className="text-[10px] text-muted-foreground">
                                                                        Replacement Batch: <span className="font-mono">{replacementBatches.find(b => b.id === defect.replacementBatchId)?.batchNumber || 'Selected'}</span>
                                                                    </p>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="flex flex-col gap-2">
                                                        {defect ? (
                                                            <>
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    className="h-8 text-xs"
                                                                    onClick={() => handleOpenDefectDialog(component)}
                                                                >
                                                                    Edit
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    className="h-8 text-xs text-muted-foreground hover:text-destructive"
                                                                    onClick={(e) => handleClearDefect(component.id, e)}
                                                                >
                                                                    Clear
                                                                </Button>
                                                            </>
                                                        ) : (
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                className="h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                                                                onClick={() => handleOpenDefectDialog(component)}
                                                            >
                                                                <AlertTriangle className="h-3 w-3 mr-1" />
                                                                Report Issue
                                                            </Button>
                                                        )}
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    <SheetFooter className="p-6 border-t bg-background">
                        <div className="flex items-center justify-between w-full">
                            <div className="text-sm text-muted-foreground">
                                <span className="font-medium text-foreground">
                                    {(components?.length || 0) - Object.keys(defects).length}
                                </span> components passed
                            </div>
                            <Button
                                onClick={handleCompleteQC}
                                disabled={submitQC.isPending}
                                className="w-40"
                            >
                                {submitQC.isPending ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : (
                                    <CheckCircle2 className="h-4 w-4 mr-2" />
                                )}
                                Complete QC
                            </Button>
                        </div>
                    </SheetFooter>
                </SheetContent>
            </Sheet>

            {/* Defect Reporting Dialog */}
            <Dialog open={defectDialogOpen} onOpenChange={setDefectDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Report Defect</DialogTitle>
                        <DialogDescription>
                            Report an issue with <span className="font-medium text-foreground">{selectedComponent?.name}</span>
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Severity</Label>
                                <Select
                                    value={defectForm.severity}
                                    onValueChange={(val) => setDefectForm(prev => ({ ...prev, severity: val }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="LOW">Low - Cosmetic</SelectItem>
                                        <SelectItem value="MEDIUM">Medium - Functional</SelectItem>
                                        <SelectItem value="HIGH">High - Major</SelectItem>
                                        <SelectItem value="CRITICAL">Critical - Safety</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Notes</Label>
                            <Textarea
                                placeholder="Describe the defect..."
                                value={defectForm.notes}
                                onChange={(e) => setDefectForm(prev => ({ ...prev, notes: e.target.value }))}
                                className="min-h-[80px]"
                            />
                        </div>

                        <div className="space-y-3 pt-2 border-t">
                            <Label className="text-base font-medium">Resolution Action</Label>
                            <RadioGroup
                                value={defectForm.resolution}
                                onValueChange={(val: 'NONE' | 'FIX' | 'REPLACE') =>
                                    setDefectForm(prev => ({ ...prev, resolution: val }))
                                }
                                className="grid grid-cols-3 gap-4"
                            >
                                <div>
                                    <RadioGroupItem value="NONE" id="res-none" className="peer sr-only" />
                                    <Label
                                        htmlFor="res-none"
                                        className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                                    >
                                        <XCircle className="mb-2 h-6 w-6 text-muted-foreground" />
                                        No Action
                                    </Label>
                                </div>
                                <div>
                                    <RadioGroupItem value="FIX" id="res-fix" className="peer sr-only" />
                                    <Label
                                        htmlFor="res-fix"
                                        className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                                    >
                                        <Wrench className="mb-2 h-6 w-6 text-blue-500" />
                                        Fix
                                    </Label>
                                </div>
                                <div>
                                    <RadioGroupItem value="REPLACE" id="res-replace" className="peer sr-only" />
                                    <Label
                                        htmlFor="res-replace"
                                        className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                                    >
                                        <RefreshCw className="mb-2 h-6 w-6 text-purple-500" />
                                        Replace
                                    </Label>
                                </div>
                            </RadioGroup>
                        </div>

                        {defectForm.resolution === 'REPLACE' && (
                            <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                <Label>Select Replacement Batch</Label>
                                <Select
                                    value={defectForm.replacementBatchId}
                                    onValueChange={(val) => setDefectForm(prev => ({ ...prev, replacementBatchId: val }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder={loadingBatches ? "Loading batches..." : "Select a batch"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {loadingBatches ? (
                                            <div className="p-2 text-center text-xs text-muted-foreground">Loading...</div>
                                        ) : replacementBatches.length === 0 ? (
                                            <div className="p-2 text-center text-xs text-muted-foreground">No stock available</div>
                                        ) : (
                                            replacementBatches.map(batch => (
                                                <SelectItem key={batch.id} value={batch.id}>
                                                    <span className="font-mono">{batch.batchNumber}</span>
                                                    <span className="ml-2 text-muted-foreground text-xs">
                                                        (Qty: {batch.currentQuantity})
                                                    </span>
                                                </SelectItem>
                                            ))
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDefectDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSaveDefect} variant="destructive">Save Defect</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
