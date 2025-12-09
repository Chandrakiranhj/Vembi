'use client';

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Package, Calendar, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

interface StockBatch {
    id: string;
    batchNumber: string;
    currentQuantity: number;
    dateReceived: string;
    vendor: {
        name: string;
    };
}

interface BatchSelection {
    batchId: string;
    quantityUsed: number;
    batchNumber: string;
}

interface BatchSelectorProps {
    componentName: string;
    batches: StockBatch[];
    requiredQty: number;
    selectedBatches: BatchSelection[];
    onUpdate: (batches: BatchSelection[]) => void;
}

export default function BatchSelector({
    componentName,
    batches,
    requiredQty,
    selectedBatches,
    onUpdate
}: BatchSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    // Local state for editing selections before confirming
    const [tempSelections, setTempSelections] = useState<Map<string, number>>(new Map());

    const handleOpen = () => {
        // Initialize temp selections from props
        const initial = new Map<string, number>();
        selectedBatches.forEach(b => initial.set(b.batchId, b.quantityUsed));
        setTempSelections(initial);
        setIsOpen(true);
    };

    const handleQuantityChange = (batchId: string, value: string, max: number) => {
        const qty = parseInt(value) || 0;
        // Don't allow selecting more than available in batch
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

    const currentTotalSelected = Array.from(tempSelections.values()).reduce((a, b) => a + b, 0);
    const remainingNeeded = requiredQty - currentTotalSelected;

    const handleConfirm = () => {
        const newSelections: BatchSelection[] = [];
        tempSelections.forEach((qty, batchId) => {
            const batch = batches.find(b => b.id === batchId);
            if (batch) {
                newSelections.push({
                    batchId,
                    quantityUsed: qty,
                    batchNumber: batch.batchNumber
                });
            }
        });
        onUpdate(newSelections);
        setIsOpen(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" onClick={handleOpen}>
                    <Package className="mr-2 h-4 w-4" /> Manual Select
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Select Batches for {componentName}</DialogTitle>
                    <DialogDescription>
                        Total Required: <span className="font-bold text-primary">{requiredQty}</span> |
                        Selected: <span className={`font-bold ${remainingNeeded === 0 ? 'text-green-600' : 'text-orange-600'}`}>{currentTotalSelected}</span> |
                        Remaining: <span className="font-bold">{Math.max(0, remainingNeeded)}</span>
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto py-4 space-y-4">
                    {batches.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            No stock batches available for this component.
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
                                            <span>Vendor: {batch.vendor.name}</span>
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
                            <span className="flex items-center text-orange-600">
                                <AlertTriangle className="h-4 w-4 mr-1" />
                                Need {remainingNeeded} more
                            </span>
                        )}
                        {remainingNeeded < 0 && (
                            <span className="flex items-center text-red-600">
                                <AlertTriangle className="h-4 w-4 mr-1" />
                                Over-selected by {Math.abs(remainingNeeded)}
                            </span>
                        )}
                        {remainingNeeded === 0 && (
                            <span className="flex items-center text-green-600">
                                <Package className="h-4 w-4 mr-1" />
                                Perfectly matched
                            </span>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                        <Button onClick={handleConfirm} disabled={remainingNeeded !== 0}>Confirm Selection</Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
