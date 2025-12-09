'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowRight, ArrowLeft, Check, AlertCircle, Package, Layers, Calculator } from 'lucide-react';
import { Spinner } from "@/components/ui/spinner";
import BatchSelector from './BatchSelector';

// Types
interface Product {
    id: string;
    name: string;
    modelNumber: string;
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

interface Component {
    id: string;
    name: string;
    sku: string;
    stockBatches?: StockBatch[];
}

interface ProductComponent {
    id: string;
    componentId: string;
    quantityRequired: number;
    component: Component;
}

interface BatchSelection {
    batchId: string;
    quantityUsed: number;
    batchNumber: string; // For display
}

interface ComponentSelection {
    componentId: string;
    componentName: string;
    requiredPerUnit: number;
    totalRequired: number;
    selectedBatches: BatchSelection[];
}

export default function AssemblyWizard() {
    const router = useRouter();

    // Steps: 0 = Config, 1 = Batch Selection, 2 = Review
    const [step, setStep] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Step 0: Config State
    const [products, setProducts] = useState<Product[]>([]);
    const [selectedProductId, setSelectedProductId] = useState<string>('');
    const [quantity, setQuantity] = useState<number>(1);
    const [startSerialNumber, setStartSerialNumber] = useState<string>('');
    const [funder, setFunder] = useState<string>('');
    const [isLoadingProducts, setIsLoadingProducts] = useState(false);

    // Step 1: BOM & Batches State
    const [bom, setBom] = useState<ProductComponent[]>([]);
    const [isLoadingBom, setIsLoadingBom] = useState(false);
    const [selections, setSelections] = useState<Map<string, ComponentSelection>>(new Map());
    const [generatedSerials, setGeneratedSerials] = useState<string[]>([]);

    // Generate serial numbers when config changes
    useEffect(() => {
        if (startSerialNumber && quantity > 0) {
            const serialMatch = startSerialNumber.match(/^(.*?)(\d+)$/);
            if (serialMatch) {
                const prefix = serialMatch[1];
                const startNumStr = serialMatch[2];
                const startNum = parseInt(startNumStr, 10);
                const numLength = startNumStr.length;

                const serials = Array.from({ length: quantity }, (_, i) => {
                    const currentNum = startNum + i;
                    return `${prefix}${currentNum.toString().padStart(numLength, '0')}`;
                });
                setGeneratedSerials(serials);
            } else {
                // Fallback if no numeric part found
                const serials = Array.from({ length: quantity }, (_, i) => `${startSerialNumber}-${i + 1}`);
                setGeneratedSerials(serials);
            }
        }
    }, [startSerialNumber, quantity]);

    // Fetch Products on Mount
    useEffect(() => {
        const fetchProducts = async () => {
            setIsLoadingProducts(true);
            try {
                const res = await fetch('/api/products');
                if (!res.ok) throw new Error('Failed to fetch products');
                const data = await res.json();
                setProducts(Array.isArray(data) ? data : (data.products || []));
            } catch (error) {
                console.error(error);
                toast.error('Failed to load products');
            } finally {
                setIsLoadingProducts(false);
            }
        };
        fetchProducts();
    }, []);

    // Fetch BOM when Product Selected and moving to Step 1
    const handleConfigSubmit = async () => {
        if (!selectedProductId || quantity < 1 || !startSerialNumber || !funder) {
            toast.error('Please fill in all fields correctly.');
            return;
        }

        setIsLoadingBom(true);
        try {
            const res = await fetch(`/api/products/${selectedProductId}/components?includeBatches=true`);
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to fetch BOM');
            }
            const data: ProductComponent[] = await res.json();

            if (data.length === 0) {
                toast.error('This product has no components defined in BOM.');
                setIsLoadingBom(false);
                return;
            }

            setBom(data);

            // Initialize selections map
            const initialSelections = new Map<string, ComponentSelection>();
            data.forEach(item => {
                initialSelections.set(item.componentId, {
                    componentId: item.componentId,
                    componentName: item.component.name,
                    requiredPerUnit: item.quantityRequired,
                    totalRequired: item.quantityRequired * quantity,
                    selectedBatches: []
                });
            });
            setSelections(initialSelections);

            setStep(1);
        } catch (error) {
            console.error(error);
            toast.error('Failed to load Bill of Materials');
        } finally {
            setIsLoadingBom(false);
        }
    };

    // Auto Select Batches (FIFO)
    const autoSelectBatches = (componentId: string) => {
        const item = bom.find(b => b.componentId === componentId);
        if (!item || !item.component.stockBatches) return;

        const totalRequired = item.quantityRequired * quantity;
        let remainingNeeded = totalRequired;
        const newBatchSelections: BatchSelection[] = [];

        // Batches are already sorted by dateReceived asc (FIFO) from API
        for (const batch of item.component.stockBatches) {
            if (remainingNeeded <= 0) break;
            if (batch.currentQuantity <= 0) continue;

            const take = Math.min(remainingNeeded, batch.currentQuantity);
            newBatchSelections.push({
                batchId: batch.id,
                quantityUsed: take,
                batchNumber: batch.batchNumber
            });
            remainingNeeded -= take;
        }

        if (remainingNeeded > 0) {
            toast.warning(`Insufficient stock for ${item.component.name}. Missing ${remainingNeeded} units.`);
        } else {
            toast.success(`Auto-selected batches for ${item.component.name}`);
        }

        updateSelection(componentId, newBatchSelections);
    };

    const updateSelection = (componentId: string, batches: BatchSelection[]) => {
        setSelections(prev => {
            const next = new Map(prev);
            const current = next.get(componentId);
            if (current) {
                next.set(componentId, { ...current, selectedBatches: batches });
            }
            return next;
        });
    };

    const handleGlobalAutoSelect = () => {
        const newSelections = new Map(selections);
        let successCount = 0;
        let failCount = 0;

        bom.forEach(item => {
            const totalRequired = item.quantityRequired * quantity;
            let remainingNeeded = totalRequired;
            const componentSelections: BatchSelection[] = [];

            if (item.component.stockBatches) {
                for (const batch of item.component.stockBatches) {
                    if (remainingNeeded <= 0) break;
                    if (batch.currentQuantity <= 0) continue;

                    const take = Math.min(remainingNeeded, batch.currentQuantity);
                    componentSelections.push({
                        batchId: batch.id,
                        quantityUsed: take,
                        batchNumber: batch.batchNumber
                    });
                    remainingNeeded -= take;
                }
            }

            const current = newSelections.get(item.componentId);
            if (current) {
                newSelections.set(item.componentId, { ...current, selectedBatches: componentSelections });
            }

            if (remainingNeeded > 0) failCount++;
            else successCount++;
        });

        setSelections(newSelections);

        if (failCount > 0) {
            toast.warning(`Auto-selected batches. ${failCount} components have insufficient stock.`);
        } else {
            toast.success(`Successfully auto-selected batches for all ${successCount} components.`);
        }
    };

    const isSelectionComplete = () => {
        for (const [_, sel] of selections) {
            const totalSelected = sel.selectedBatches.reduce((sum, b) => sum + b.quantityUsed, 0);
            if (totalSelected !== sel.totalRequired) return false;
        }
        return true;
    };

    const handleCreateAssemblies = async () => {
        setIsSubmitting(true);
        try {
            const payload = {
                productId: selectedProductId,
                quantity,
                serialNumbers: generatedSerials,
                funder,
                selectedBatches: Array.from(selections.values()).map(s => ({
                    componentId: s.componentId,
                    batches: s.selectedBatches.map(b => ({
                        batchId: b.batchId,
                        quantityUsed: b.quantityUsed
                    }))
                }))
            };

            const res = await fetch('/api/assemblies/bulk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Failed to create assemblies');

            toast.success(`Successfully created ${data.count} assemblies!`);
            router.push('/assembly');
        } catch (error) {
            console.error(error);
            toast.error(error instanceof Error ? error.message : 'Failed to create assemblies');
        } finally {
            setIsSubmitting(false);
        }
    };

    // RENDER STEPS
    const renderConfigStep = () => (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label className="text-sm font-medium">Product</label>
                    <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a product" />
                        </SelectTrigger>
                        <SelectContent>
                            {products.map(p => (
                                <SelectItem key={p.id} value={p.id}>{p.name} ({p.modelNumber})</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium">Quantity to Build</label>
                    <Input
                        type="number"
                        min={1}
                        value={quantity}
                        onChange={e => setQuantity(parseInt(e.target.value) || 0)}
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium">Start Serial Number</label>
                    <Input
                        placeholder="e.g. SN-1001"
                        value={startSerialNumber}
                        onChange={e => setStartSerialNumber(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">Subsequent serials will be incremented automatically.</p>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium">Funder / Notes</label>
                    <Input
                        placeholder="e.g. Q4 Grant"
                        value={funder}
                        onChange={e => setFunder(e.target.value)}
                    />
                </div>
            </div>

            <div className="flex justify-end pt-4">
                <Button onClick={handleConfigSubmit} disabled={isLoadingBom}>
                    {isLoadingBom ? <Spinner className="mr-2" /> : null}
                    Next: Select Batches <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
            </div>
        </div>
    );

    const renderBatchStep = () => (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-center bg-muted/30 p-4 rounded-lg border">
                <div>
                    <h3 className="font-semibold text-lg">Batch Selection</h3>
                    <p className="text-sm text-muted-foreground">
                        Allocate stock batches for {quantity} units of {products.find(p => p.id === selectedProductId)?.name}
                    </p>
                    <Button variant="secondary" size="sm" className="mt-2" onClick={handleGlobalAutoSelect}>
                        <Layers className="mr-2 h-4 w-4" /> Auto-fill All (FIFO)
                    </Button>
                </div>
                <div className="text-right">
                    <div className="text-sm font-medium">Progress</div>
                    <div className="text-2xl font-bold text-primary">
                        {Array.from(selections.values()).filter(s =>
                            s.selectedBatches.reduce((sum, b) => sum + b.quantityUsed, 0) === s.totalRequired
                        ).length} / {bom.length}
                    </div>
                    <div className="text-xs text-muted-foreground">Components Ready</div>
                </div>
            </div>

            <div className="space-y-4">
                {bom.map(item => {
                    const selection = selections.get(item.componentId);
                    const totalSelected = selection?.selectedBatches.reduce((sum, b) => sum + b.quantityUsed, 0) || 0;
                    const totalRequired = item.quantityRequired * quantity;
                    const isComplete = totalSelected === totalRequired;
                    const isError = totalSelected > totalRequired;

                    return (
                        <Card key={item.id} className={`border-l-4 ${isComplete ? 'border-l-green-500' : isError ? 'border-l-red-500' : 'border-l-yellow-500'}`}>
                            <CardContent className="p-4">
                                <div className="flex flex-col md:flex-row justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-semibold">{item.component.name}</h4>
                                            <Badge variant="outline">{item.component.sku}</Badge>
                                        </div>
                                        <div className="mt-2 text-sm space-y-1">
                                            <div className="flex justify-between w-full max-w-xs">
                                                <span className="text-muted-foreground">Required per unit:</span>
                                                <span>{item.quantityRequired}</span>
                                            </div>
                                            <div className="flex justify-between w-full max-w-xs font-medium">
                                                <span className="text-muted-foreground">Total Required:</span>
                                                <span>{totalRequired}</span>
                                            </div>
                                            <div className={`flex justify-between w-full max-w-xs font-bold ${isComplete ? 'text-green-600' : 'text-orange-600'}`}>
                                                <span>Selected:</span>
                                                <span>{totalSelected}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-2 min-w-[200px]">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => autoSelectBatches(item.componentId)}
                                            disabled={isComplete}
                                        >
                                            <Layers className="mr-2 h-4 w-4" /> Auto Select (FIFO)
                                        </Button>

                                        <BatchSelector
                                            componentName={item.component.name}
                                            batches={item.component.stockBatches || []}
                                            requiredQty={totalRequired}
                                            selectedBatches={selection?.selectedBatches || []}
                                            onUpdate={(batches) => updateSelection(item.componentId, batches)}
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setStep(0)}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <Button onClick={() => setStep(2)} disabled={!isSelectionComplete()}>
                    Review & Create <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
            </div>
        </div>
    );

    const renderReviewStep = () => (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-primary/5 border-primary/20">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Production Run</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{quantity} Units</div>
                        <p className="text-xs text-muted-foreground">{products.find(p => p.id === selectedProductId)?.name}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Funder / Reference</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-semibold">{funder}</div>
                        <p className="text-xs text-muted-foreground">Project Reference</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Components</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-semibold">{bom.length} Types</div>
                        <p className="text-xs text-muted-foreground">All batches allocated</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <Package className="h-5 w-5 text-primary" />
                                Serial Numbers
                            </CardTitle>
                            <CardDescription>Review the serial numbers that will be assigned to these {quantity} units.</CardDescription>
                        </div>
                        <Badge variant="outline" className="ml-auto">
                            {generatedSerials.length} Serials
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="bg-muted/30 p-4 rounded-lg border">
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-60 overflow-y-auto pr-2">
                            {generatedSerials.map((serial, index) => (
                                <div key={index} className="relative">
                                    <span className="absolute left-3 top-2.5 text-xs text-muted-foreground font-mono">#{index + 1}</span>
                                    <Input
                                        value={serial}
                                        onChange={(e) => {
                                            const newSerials = [...generatedSerials];
                                            newSerials[index] = e.target.value;
                                            setGeneratedSerials(newSerials);
                                        }}
                                        className="pl-10 h-9 text-sm font-mono bg-background"
                                    />
                                </div>
                            ))}
                        </div>
                        <p className="text-xs text-muted-foreground mt-2 flex items-center">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            You can edit these serial numbers if needed. Ensure they are unique.
                        </p>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Layers className="h-5 w-5 text-primary" />
                        Component Manifest
                    </CardTitle>
                    <CardDescription>Final verification of stock batches used for this build.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {Array.from(selections.values()).map(sel => {
                        const item = bom.find(b => b.componentId === sel.componentId);
                        return (
                            <div key={sel.componentId} className="group border rounded-lg p-4 hover:bg-muted/5 transition-colors">
                                <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-3">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-semibold text-base">{sel.componentName}</h4>
                                            <Badge variant="secondary" className="text-xs">{item?.component.sku}</Badge>
                                        </div>
                                        <div className="text-sm text-muted-foreground mt-1">
                                            Total Required: <span className="font-medium text-foreground">{sel.totalRequired}</span> units
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <BatchSelector
                                            componentName={sel.componentName}
                                            batches={item?.component.stockBatches || []}
                                            requiredQty={sel.totalRequired}
                                            selectedBatches={sel.selectedBatches}
                                            onUpdate={(batches) => updateSelection(sel.componentId, batches)}
                                        />
                                    </div>
                                </div>

                                <div className="bg-muted/20 rounded-md p-3 space-y-2 text-sm">
                                    <div className="grid grid-cols-12 text-xs font-medium text-muted-foreground mb-2 px-2">
                                        <div className="col-span-4">BATCH NUMBER</div>
                                        <div className="col-span-5">VENDOR</div>
                                        <div className="col-span-3 text-right">QUANTITY</div>
                                    </div>
                                    {sel.selectedBatches.map(batch => {
                                        const stockBatch = item?.component.stockBatches?.find(sb => sb.id === batch.batchId);
                                        const vendorName = stockBatch?.vendor.name || 'Unknown Vendor';

                                        return (
                                            <div key={batch.batchId} className="grid grid-cols-12 items-center px-2 py-1 rounded hover:bg-background border border-transparent hover:border-border transition-colors">
                                                <div className="col-span-4 font-mono font-medium">{batch.batchNumber}</div>
                                                <div className="col-span-5 truncate text-muted-foreground">{vendorName}</div>
                                                <div className="col-span-3 text-right font-medium">{batch.quantityUsed}</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </CardContent>
            </Card>

            <div className="flex justify-between pt-4 sticky bottom-0 bg-background/95 backdrop-blur py-4 border-t mt-8 z-10">
                <Button variant="outline" onClick={() => setStep(1)} disabled={isSubmitting}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Batches
                </Button>
                <Button onClick={handleCreateAssemblies} disabled={isSubmitting} size="lg" className="bg-green-600 hover:bg-green-700 shadow-lg shadow-green-900/20">
                    {isSubmitting ? <Spinner className="mr-2" /> : <Check className="mr-2 h-5 w-5" />}
                    Confirm & Create {quantity} Assemblies
                </Button>
            </div>
        </div>
    );

    return (
        <div className="max-w-4xl mx-auto p-6">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight mb-2">Create Assemblies</h1>
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <span className={step >= 0 ? "text-primary font-medium" : ""}>1. Configuration</span>
                    <ArrowRight className="h-4 w-4" />
                    <span className={step >= 1 ? "text-primary font-medium" : ""}>2. Batch Selection</span>
                    <ArrowRight className="h-4 w-4" />
                    <span className={step >= 2 ? "text-primary font-medium" : ""}>3. Review</span>
                </div>
            </div>

            {step === 0 && renderConfigStep()}
            {step === 1 && renderBatchStep()}
            {step === 2 && renderReviewStep()}
        </div>
    );
}
