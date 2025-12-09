'use client';

import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { AlertCircle, Calendar, Package } from 'lucide-react';
import { format } from 'date-fns';

export interface SelectedBatch {
    batchId: string;
    quantity: number;
    batchNumber: string;
}

interface BatchSelectionDialogProps {
    isOpen: boolean;
    onClose: () => void;
    componentId: string;
    componentName: string;
    componentSku: string;
    quantityRequired: number;
    currentSelections: SelectedBatch[];
    onSelectBatches: (selections: SelectedBatch[]) => void;
}

interface StockBatch {
    id: string;
    batchNumber: string;
    currentQuantity: number;
    dateReceived: string;
    vendor: {
        name: string;
    };
}

export default function BatchSelectionDialog({
    isOpen,
    onClose,
    componentId,
    componentName,
    componentSku,
    quantityRequired,
    currentSelections,
    onSelectBatches
}: BatchSelectionDialogProps) {
    const [batches, setBatches] = useState<StockBatch[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [tempSelections, setTempSelections] = useState<Map<string, number>>(new Map());

    // Fetch batches when dialog opens
    useEffect(() => {
        if (isOpen && componentId) {
            fetchBatches();
            // Initialize temp selections
            const initial = new Map<string, number>();
            currentSelections.forEach(b => initial.set(b.batchId, b.quantity));
            setTempSelections(initial);
        }
    }, [isOpen, componentId]);

    const fetchBatches = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/batches?componentId=${componentId}`);
            if (!res.ok) throw new Error('Failed to fetch batches');
            const data = await res.json();
            setBatches(data);
        } catch (err) {
            console.error(err);
            setError('Failed to load stock batches');
        } finally {
            setIsLoading(false);
        }
    };

    const handleQuantityChange = (batchId: string, value: string, max: number) => {
        const qty = parseInt(value) || 0;
        const validQty = Math.min(Math.max(0, qty), max);

        setTempSelections(prev => {
            const next = new Map(prev);
            if (validQty === 0) {
                next.delete(batchId);
            } else {
                next.set(batchId, validQty);
            }
            return next;
        });
    };

    const handleConfirm = () => {
        const newSelections: SelectedBatch[] = [];
        tempSelections.forEach((qty, batchId) => {
            const batch = batches.find(b => b.id === batchId);
            if (batch) {
                newSelections.push({
                    batchId,
                    quantity: qty,
                    batchNumber: batch.batchNumber
                });
            }
        });
        onSelectBatches(newSelections);
    };

    const currentTotalSelected = Array.from(tempSelections.values()).reduce((a, b) => a + b, 0);
    const remainingNeeded = quantityRequired - currentTotalSelected;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Select Batches for {componentName}</DialogTitle>
                    <DialogDescription>
                        SKU: {componentSku} | Required: <span className="font-bold text-primary">{quantityRequired}</span>
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto py-4 space-y-4">
                    {isLoading ? (
                        <div className="flex justify-center py-8">
                            <Spinner />
                        </div>
                    ) : error ? (
                        <div className="flex items-center text-red-600 justify-center py-8">
                            <AlertCircle className="mr-2" /> {error}
                        </div>
                    ) : batches.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            No stock batches available.
                        </div>
                    ) : (
                        batches.map(batch => {
                            const selectedQty = tempSelections.get(batch.id) || 0;
                            const isFullyUsed = selectedQty === batch.currentQuantity;

                            return (
                                <div key={batch.id} className={`flex items-center justify-between p-3 rounded-lg border ${selectedQty > 0 ? 'bg-primary/5 border-primary/30' : 'bg-card'}`}>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono font-medium">{batch.batchNumber}</span>
                                            {selectedQty > 0 && <Badge variant="secondary">Selected</Badge>}
                                        </div>
                                        <div className="text-xs text-muted-foreground mt-1 flex items-center gap-3">
                                            <span className="flex items-center"><Calendar className="h-3 w-3 mr-1" /> {format(new Date(batch.dateReceived), 'MMM d, yyyy')}</span>
                                            <span>Vendor: {batch.vendor?.name || 'Unknown'}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <div className="text-right text-sm">
                                            <div className="text-muted-foreground">Available</div>
                                            <div className="font-medium">{batch.currentQuantity}</div>
                                        </div>

                                        <div className="w-24">
                                            <Input
                                                type="number"
                                                min={0}
                                                max={batch.currentQuantity}
                                                value={selectedQty || ''}
                                                placeholder="0"
                                                onChange={(e) => handleQuantityChange(batch.id, e.target.value, batch.currentQuantity)}
                                                className={isFullyUsed ? "border-orange-300" : ""}
                                            />
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                <DialogFooter className="flex justify-between items-center sm:justify-between">
                    <div className="text-sm text-muted-foreground">
                        {remainingNeeded > 0 && (
                            <span className="text-orange-600 font-medium">Need {remainingNeeded} more</span>
                        )}
                        {remainingNeeded < 0 && (
                            <span className="text-red-600 font-medium">Over-selected by {Math.abs(remainingNeeded)}</span>
                        )}
                        {remainingNeeded === 0 && (
                            <span className="text-green-600 font-medium flex items-center"><Package className="h-4 w-4 mr-1" /> Matched</span>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={onClose}>Cancel</Button>
                        <Button onClick={handleConfirm} disabled={remainingNeeded !== 0}>Confirm</Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
