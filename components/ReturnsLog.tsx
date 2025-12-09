'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Search, CheckCircle2, Package, ArrowRight, AlertCircle } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

interface ReturnFormData {
    serialNumber: string;
    reason: string;
}

interface VerifyResult {
    id: string;
    serialNumber: string;
    modelNumber: string;
    productName: string;
    assemblyDate?: string;
}

interface ReturnsLogProps {
    onReturnLogged?: (returnId: string) => void;
}

export function ReturnsLog({ onReturnLogged }: ReturnsLogProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [verifiedAssembly, setVerifiedAssembly] = useState<VerifyResult | null>(null);
    const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<ReturnFormData>();
    const queryClient = useQueryClient();

    const serialNumber = watch('serialNumber');

    // Mutation for creating a return
    const createReturn = useMutation({
        mutationFn: async (data: ReturnFormData) => {
            const response = await fetch('/api/returns', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to create return');
            }

            return response.json();
        },
        onSuccess: (data) => {
            toast.success('Return logged successfully');
            reset();
            setVerifiedAssembly(null);
            queryClient.invalidateQueries({ queryKey: ['returns'] });
            if (onReturnLogged && data.id) {
                onReturnLogged(data.id);
            }
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to log return');
        },
    });

    // Mutation for verifying serial number
    const verifySerialNumber = useMutation({
        mutationFn: async (serialNum: string) => {
            const response = await fetch(`/api/assemblies/verify/${serialNum}`);

            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error('Serial number not found');
                }
                throw new Error('Failed to verify serial number');
            }

            return response.json() as Promise<VerifyResult>;
        },
        onSuccess: (data) => {
            setVerifiedAssembly(data);
        },
        onError: (error: Error) => {
            setVerifiedAssembly(null);
            toast.error(error.message);
        },
    });

    const handleVerify = async () => {
        if (!serialNumber) return;
        verifySerialNumber.mutate(serialNumber);
    };

    const onSubmit = async (data: ReturnFormData) => {
        setIsSubmitting(true);

        try {
            // If not already verified, verify the serial number first
            if (!verifiedAssembly) {
                try {
                    const verifiedData = await verifySerialNumber.mutateAsync(data.serialNumber);
                    setVerifiedAssembly(verifiedData);
                } catch {
                    setIsSubmitting(false);
                    return; // Stop if verification fails
                }
            }

            // Then create the return
            await createReturn.mutateAsync(data);
        } catch {
            // Error already handled by mutations
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex justify-center py-8">
            <Card className="w-full max-w-2xl shadow-lg border-muted/40">
                <CardHeader className="text-center pb-2">
                    <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit mb-4">
                        <Package className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-2xl">Log New Return</CardTitle>
                    <CardDescription>
                        Enter the product serial number to verify details and initiate a return.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-6 sm:p-8">
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">

                        {/* Serial Number Section */}
                        <div className="space-y-4">
                            <div className="flex flex-col gap-2">
                                <label htmlFor="serialNumber" className="text-sm font-medium flex justify-between">
                                    Serial Number
                                    {verifiedAssembly && (
                                        <span className="text-green-600 text-xs flex items-center gap-1">
                                            <CheckCircle2 className="h-3 w-3" /> Verified
                                        </span>
                                    )}
                                </label>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="serialNumber"
                                            {...register('serialNumber', {
                                                required: 'Serial number is required',
                                                pattern: {
                                                    value: /^[A-Za-z0-9-]+$/,
                                                    message: 'Invalid format'
                                                }
                                            })}
                                            placeholder="e.g. SN-2024-001"
                                            className={`pl-9 font-mono ${errors.serialNumber ? 'border-red-500' : ''} ${verifiedAssembly ? 'border-green-500 bg-green-50/20' : ''}`}
                                            onChange={(e) => {
                                                setValue('serialNumber', e.target.value);
                                                if (verifiedAssembly) setVerifiedAssembly(null);
                                            }}
                                        />
                                    </div>
                                    <Button
                                        type="button"
                                        variant={verifiedAssembly ? "outline" : "secondary"}
                                        onClick={handleVerify}
                                        disabled={!serialNumber || verifySerialNumber.isPending}
                                        className="min-w-[100px]"
                                    >
                                        {verifySerialNumber.isPending ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : verifiedAssembly ? (
                                            'Re-verify'
                                        ) : (
                                            'Verify'
                                        )}
                                    </Button>
                                </div>
                                {errors.serialNumber && (
                                    <p className="text-sm text-red-500 flex items-center gap-1">
                                        <AlertCircle className="h-3 w-3" /> {errors.serialNumber.message}
                                    </p>
                                )}
                            </div>

                            {/* Product Preview Card */}
                            {verifiedAssembly && (
                                <div className="bg-muted/30 border rounded-lg p-4 flex items-start gap-4 animate-in fade-in slide-in-from-top-2">
                                    <div className="bg-background p-3 rounded border shadow-sm">
                                        <Package className="h-8 w-8 text-muted-foreground" />
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h4 className="font-semibold text-foreground">{verifiedAssembly.productName}</h4>
                                                <p className="text-sm text-muted-foreground">Model: {verifiedAssembly.modelNumber}</p>
                                            </div>
                                            <Badge variant="outline" className="bg-background">
                                                {verifiedAssembly.serialNumber}
                                            </Badge>
                                        </div>
                                        {verifiedAssembly.assemblyDate && (
                                            <p className="text-xs text-muted-foreground pt-1">
                                                Assembled: {new Date(verifiedAssembly.assemblyDate).toLocaleDateString()}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <Separator />

                        {/* Reason Section */}
                        <div className="space-y-2">
                            <label htmlFor="reason" className="text-sm font-medium">
                                Reason for Return
                            </label>
                            <Textarea
                                id="reason"
                                {...register('reason', { required: 'Please provide a reason for the return' })}
                                placeholder="Describe the issue or reason for return..."
                                className={`min-h-[120px] resize-none ${errors.reason ? 'border-red-500' : ''}`}
                            />
                            {errors.reason && (
                                <p className="text-sm text-red-500 flex items-center gap-1">
                                    <AlertCircle className="h-3 w-3" /> {errors.reason.message}
                                </p>
                            )}
                        </div>

                        <Button
                            type="submit"
                            disabled={isSubmitting || createReturn.isPending}
                            className="w-full h-11 text-base"
                        >
                            {(isSubmitting || createReturn.isPending) ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing Return...</>
                            ) : (
                                <>Log Return <ArrowRight className="ml-2 h-4 w-4" /></>
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}