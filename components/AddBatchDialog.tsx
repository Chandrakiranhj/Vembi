'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from 'sonner';
import { Component } from "@/lib/hooks/useComponents";
import { Spinner } from "@/components/ui/spinner";
import { createClient } from "@/lib/supabase/client";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { UploadCloud } from 'lucide-react';

// Vendor interface
interface Vendor {
  id: string;
  name: string;
}

interface AddBatchDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onBatchAdded: () => void;
  components: Component[];
}

const batchSchema = z.object({
  componentId: z.string().min(1, "Component is required"),
  initialQuantity: z.coerce.number().min(1, "Quantity must be at least 1"),
  vendorId: z.string().min(1, "Vendor is required"),
  dateReceived: z.string().optional(),
  notes: z.string().optional(),
  invoiceImage: z.string().optional(),
});

type BatchFormValues = z.infer<typeof batchSchema>;

const AddBatchDialog: React.FC<AddBatchDialogProps> = ({
  isOpen,
  onClose,
  onBatchAdded,
  components
}) => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isLoadingVendors, setIsLoadingVendors] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  const form = useForm<BatchFormValues>({
    resolver: zodResolver(batchSchema),
    defaultValues: {
      componentId: '',
      initialQuantity: '' as unknown as number,
      vendorId: '',
      dateReceived: new Date().toISOString().split('T')[0],
      notes: '',
      invoiceImage: '',
    },
  });

  // Fetch vendors when dialog opens
  useEffect(() => {
    if (isOpen) {
      fetchVendors();
      form.reset({
        componentId: '',
        initialQuantity: '' as unknown as number,
        vendorId: '',
        dateReceived: new Date().toISOString().split('T')[0],
        notes: '',
        invoiceImage: '',
      });
      setUploadedFileName(null);
    }
  }, [isOpen, form]);

  // Fetch vendors from API
  const fetchVendors = async () => {
    setIsLoadingVendors(true);
    try {
      const response = await fetch('/api/vendors');
      if (!response.ok) {
        throw new Error('Failed to fetch vendors');
      }
      const data = await response.json();
      setVendors(data.vendors || []);
    } catch (error) {
      console.error('Error fetching vendors:', error);
      toast.error('Failed to load vendors');
      setVendors([]);
    } finally {
      setIsLoadingVendors(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const supabase = createClient();
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
      const filePath = `invoices/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('batch-invoices')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('batch-invoices')
        .getPublicUrl(filePath);

      form.setValue('invoiceImage', publicUrl);
      setUploadedFileName(file.name);
      toast.success('Document uploaded successfully');
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Failed to upload document');
    } finally {
      setIsUploading(false);
    }
  };

  const onSubmit = async (data: BatchFormValues) => {
    try {
      const payload = {
        ...data,
        initialQuantity: Number(data.initialQuantity),
      };

      const response = await fetch('/api/batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add batch');
      }

      toast.success('Stock batch added successfully!');
      onBatchAdded();
    } catch (error) {
      console.error('Failed to add batch:', error);
      toast.error('Failed to add batch', {
        description: error instanceof Error ? error.message : 'An unknown error occurred.',
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Stock Batch</DialogTitle>
          <DialogDescription>
            Enter the details for the received stock batch.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="componentId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Component <span className="text-red-500">*</span></FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select component..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {components.map(comp => (
                        <SelectItem key={comp.id} value={comp.id}>
                          {comp.name} ({comp.sku})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="initialQuantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantity Received <span className="text-red-500">*</span></FormLabel>
                  <FormControl>
                    <Input type="number" min="1" step="1" placeholder="e.g., 100" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="vendorId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vendor <span className="text-red-500">*</span></FormLabel>
                  {isLoadingVendors ? (
                    <div className="flex items-center justify-center p-3 bg-gray-50 rounded-md">
                      <Spinner size="sm" />
                      <span className="ml-2 text-sm">Loading vendors...</span>
                    </div>
                  ) : (
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select vendor..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {vendors.map(vendor => (
                          <SelectItem key={vendor.id} value={vendor.id}>
                            {vendor.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {vendors.length === 0 && !isLoadingVendors && (
                    <p className="mt-1 text-sm text-amber-600">No vendors available. Please add vendors first.</p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="dateReceived"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date Received</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormItem>
              <FormLabel>Invoice / Reference Document</FormLabel>
              <FormControl>
                <div className="flex items-center gap-4">
                  <Input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="invoice-upload"
                    disabled={isUploading}
                  />
                  <label
                    htmlFor="invoice-upload"
                    className={`flex items-center gap-2 px-4 py-2 border rounded-md cursor-pointer hover:bg-muted transition-colors ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {isUploading ? (
                      <>
                        <Spinner size="sm" />
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <>
                        <UploadCloud className="h-4 w-4" />
                        <span>{uploadedFileName ? 'Change Document' : 'Upload Document'}</span>
                      </>
                    )}
                  </label>
                  {uploadedFileName && (
                    <span className="text-sm text-muted-foreground truncate max-w-[150px]">
                      {uploadedFileName}
                    </span>
                  )}
                </div>
              </FormControl>
            </FormItem>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Any additional notes about this batch..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? (
                  <>
                    <Spinner size="sm" className="mr-2" />
                    Adding...
                  </>
                ) : (
                  'Add Batch'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AddBatchDialog;