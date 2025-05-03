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

export function ReturnsLog() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<ReturnFormData>();
  const queryClient = useQueryClient();

  // Mutation for creating a return
  const createReturn = useMutation({
    mutationFn: async (data: ReturnFormData) => {
      const response = await fetch('/api/returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create return');
      }
      return response.json();
    },
    onSuccess: () => {
      toast.success('Return logged successfully');
      reset();
      queryClient.invalidateQueries({ queryKey: ['returns'] });
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to log return');
    },
  });

  const onSubmit = async (data: ReturnFormData) => {
    setIsSubmitting(true);
    try {
      // First verify if the serial number exists in assemblies
      const verifyResponse = await fetch(`/api/assemblies/verify/${data.serialNumber}`);
      if (!verifyResponse.ok) {
        throw new Error('Serial number not found in assemblies');
      }
      
      await createReturn.mutateAsync(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to verify serial number');
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
            />
            {errors.serialNumber && (
              <p className="text-sm text-red-500">{errors.serialNumber.message}</p>
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

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Logging Return...
              </>
            ) : (
              'Log Return'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
} 