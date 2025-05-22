'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';

interface ReturnFormData {
  serialNumber: string;
  reason: string;
}

interface VerifyResult {
  id: string;
  serialNumber: string;
  modelNumber: string;
  productName: string;
}

export function ReturnsLog() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [verifiedAssembly, setVerifiedAssembly] = useState<VerifyResult | null>(null);
  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<ReturnFormData>();
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
    onSuccess: () => {
      toast.success('Return logged successfully');
      reset();
      setVerifiedAssembly(null);
      queryClient.invalidateQueries({ queryKey: ['returns'] });
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
          throw new Error('Serial number not found in our records');
        }
        throw new Error('Failed to verify serial number');
      }
      
      return response.json() as Promise<VerifyResult>;
    },
    onSuccess: (data) => {
      setVerifiedAssembly(data);
      toast.success(`Serial number verified: ${data.productName} (${data.modelNumber})`);
    },
    onError: (error: Error) => {
      setVerifiedAssembly(null);
      toast.error(error.message);
    },
  });

  const handleVerify = async () => {
    if (!serialNumber || errors.serialNumber) return;
    
    try {
      await verifySerialNumber.mutateAsync(serialNumber);
    } catch {
      // Error handled by mutation
    }
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
    <Card>
      <CardHeader>
        <CardTitle>Log Return</CardTitle>
        <CardDescription>Log a new return by entering the serial number and providing a reason.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="serialNumber" className="text-sm font-medium">
              Serial Number
            </label>
            <div className="flex gap-2">
              <Input
                id="serialNumber"
                {...register('serialNumber', { 
                  required: 'Serial number is required',
                  pattern: {
                    value: /^[A-Za-z0-9-]+$/,
                    message: 'Serial number should only contain letters, numbers, and hyphens'
                  }
                })}
                placeholder="Enter serial number"
                className={errors.serialNumber ? 'border-red-500' : ''}
                onChange={() => {
                  if (verifiedAssembly) setVerifiedAssembly(null);
                }}
              />
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleVerify}
                disabled={!serialNumber || !!errors.serialNumber || verifySerialNumber.isPending}
              >
                {verifySerialNumber.isPending ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying</>
                ) : 'Verify'}
              </Button>
            </div>
            {errors.serialNumber && (
              <p className="text-sm text-red-500">{errors.serialNumber.message}</p>
            )}
            {verifiedAssembly && (
              <div className="text-sm text-green-600 bg-green-50 p-2 rounded-md mt-2">
                Verified: {verifiedAssembly.productName} (Model: {verifiedAssembly.modelNumber})
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="reason" className="text-sm font-medium">
              Reason for Return
            </label>
            <Textarea
              id="reason"
              {...register('reason', { required: 'Reason is required' })}
              placeholder="Enter the reason for return"
              className={`min-h-[100px] ${errors.reason ? 'border-red-500' : ''}`}
            />
            {errors.reason && (
              <p className="text-sm text-red-500">{errors.reason.message}</p>
            )}
          </div>

          <Button 
            type="submit" 
            disabled={isSubmitting || createReturn.isPending}
            className="w-full"
          >
            {(isSubmitting || createReturn.isPending) ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Logging Return...</>
            ) : 'Log Return'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
} 