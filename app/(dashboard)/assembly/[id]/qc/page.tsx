'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAssemblies, Assembly } from '@/lib/hooks/useAssemblies';
import AssemblyQCForm from '@/components/AssemblyQCForm';
import type { ComponentProps } from 'react';
type AssemblyQCOnSubmit = ComponentProps<typeof AssemblyQCForm>['onSubmit'];
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from "@/components/ui/skeleton";
import { format } from 'date-fns';
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertCircle, Calendar } from 'lucide-react';

// Interface for BOM data fetched from API
interface BomItem {
  id: string; // ProductComponent ID
  productId: string;
  componentId: string;
  quantityRequired: number;
  component: {
    id: string; // Component ID
    name: string;
    sku: string;
    category: string;
    // Note: currentQuantity might not be accurate here if fetched once
    // Actual available quantity is in StockBatch
    currentQuantity: number; 
  };
}

export default function AssemblyQCPage() {
  const router = useRouter();
  const params = useParams();
  const assemblyId = params?.id as string;
  const { getAssembly, updateAssembly } = useAssemblies();
  
  const [assembly, setAssembly] = useState<Assembly | null>(null);
  const [bom, setBom] = useState<BomItem[]>([]); // State for BOM
  const [isLoadingAssembly, setIsLoadingAssembly] = useState(true);
  const [isLoadingBom, setIsLoadingBom] = useState(true); // Loading state for BOM
  const [error, setError] = useState<string | null>(null); // Combined error state
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch assembly data
  const fetchAssemblyData = useCallback(async () => {
    if (!assemblyId) return null;
    setIsLoadingAssembly(true);
    setError(null);
    try {
      const data = await getAssembly(assemblyId);
      if (!data) throw new Error("Assembly not found.");
      setAssembly(data);
      return data; // Return data for chaining
    } catch (err) {
      console.error('Failed to fetch assembly:', err);
      setError(err instanceof Error ? err.message : 'Could not load assembly details.');
      setIsLoadingAssembly(false); // Ensure loading stops on error
      router.push('/assembly');
      return null;
    }
  }, [assemblyId, getAssembly, router]);

  // Fetch BOM data based on Product ID from assembly
  const fetchBomData = useCallback(async (productId: string | undefined) => {
    if (!productId) return; // Don't fetch if product ID isn't available
    setIsLoadingBom(true);
    setError(null);
    try {
      const response = await fetch(`/api/products/${productId}/components`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch Bill of Materials');
      }
      const data: BomItem[] = await response.json();
      setBom(data);
    } catch (err) {
      console.error('Failed to fetch BOM:', err);
      setError(err instanceof Error ? err.message : 'Could not load BOM details.');
      setBom([]); // Clear BOM on error
    } finally {
      setIsLoadingBom(false);
    }
  }, []); // No dependencies needed if fetch URL is constructed inside

  // Fetch both assembly and BOM data
  useEffect(() => {
    const loadData = async () => {
      const fetchedAssembly = await fetchAssemblyData();
      if (fetchedAssembly) {
        await fetchBomData(fetchedAssembly.productId);
      }
      setIsLoadingAssembly(false); // Now set assembly loading false here
    };
    loadData();
  }, [fetchAssemblyData, fetchBomData]); // Depend on the callback functions

  // Handle form submission - Infer the data type from the onSubmit prop
  const handleSubmit: AssemblyQCOnSubmit = async (data) => { 
    if (!assemblyId) return;
    setIsSubmitting(true);
    try {
      // Prepare data structure expected by the API endpoint
      const apiUpdateData = {
          status: data.status,
          notes: data.notes,
          // Map form data to API's selectedBatches structure
          // Use the inferred 'data' type which should have 'components'
          selectedBatches: data.components.flatMap((comp) => 
              comp.selectedBatches?.map((batch) => ({ 
                  componentId: comp.componentId,
                  batchId: batch.batchId,
                  quantityUsed: batch.quantity 
              })) ?? []
          )
      };
      
      // Call the updateAssembly hook (which hits the PUT /api/assemblies/[id] endpoint)
      await updateAssembly(assemblyId, apiUpdateData); 
      
      toast.success('Assembly updated successfully!');
      router.push('/assembly');
    } catch (error) { 
      console.error('Failed to update assembly:', error);
      let errorMessage = 'An unknown error occurred.';
        if (error instanceof Error) {
          errorMessage = error.message;
        }
      toast.error('Failed to update assembly', {
        description: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push('/assembly');
  };

  // --- Render Logic ---
  const isLoading = isLoadingAssembly || isLoadingBom;

  if (isLoading) {
    // ... Loading Skeleton ...
    return (
      <div className="container mx-auto py-6 animate-fadeIn">
        <div className="flex items-start mb-6">
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-blue-600 -ml-2" 
            onClick={() => router.push('/assembly')}
          >
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to List
          </Button>
        </div>
        <Card className="border-0 shadow-md overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 to-indigo-600"></div>
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-100">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent className="pt-6">
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    // ... Error Display ...
    return (
      <div className="container mx-auto py-6 animate-fadeIn">
        <div className="flex items-start mb-6">
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-blue-600 -ml-2" 
            onClick={() => router.push('/assembly')}
          >
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to List
          </Button>
        </div>
        <Card className="border-0 shadow-md overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 to-rose-600"></div>
          <CardHeader className="bg-gradient-to-r from-red-50 to-rose-50 border-b border-red-100">
            <CardTitle className="flex items-center text-red-700">
              <AlertCircle className="h-5 w-5 mr-2 text-red-500" />
              Error Loading Assembly Data
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={() => window.location.reload()} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white transition-all duration-300">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!assembly) {
    // ... Assembly Not Found ...
    return (
      <div className="container mx-auto py-6 animate-fadeIn">
        <div className="flex items-start mb-6">
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-blue-600 -ml-2" 
            onClick={() => router.push('/assembly')}
          >
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to List
          </Button>
        </div>
        <Card className="border-0 shadow-md overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-600 to-orange-600"></div>
          <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-100">
            <CardTitle className="text-amber-800">Assembly Not Found</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <p className="text-gray-600 mb-4">The requested assembly could not be loaded.</p>
            <Button 
              onClick={() => router.push('/assembly')} 
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white transition-all duration-300"
            >
              Back to Assembly List
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Render Assembly Details and Form using BOM data
  return (
    <div className="container mx-auto py-6 animate-fadeIn">
      <div className="flex items-start mb-6">
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-blue-600 -ml-2" 
          onClick={() => router.push('/assembly')}
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to List
        </Button>
      </div>
      <Card className="border-0 shadow-md overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 to-indigo-600"></div>
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-100">
          <CardTitle className="text-xl font-bold bg-gradient-to-r from-blue-700 to-indigo-700 bg-clip-text text-transparent">
            Assembly Details: {assembly.serialNumber}
          </CardTitle>
          <CardDescription className="flex items-center text-gray-600">
            <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs font-medium mr-2">
              {assembly.product?.modelNumber}
            </span>
            {assembly.product?.name} 
            <span className="mx-2">•</span>
            <Calendar className="h-3.5 w-3.5 text-blue-500 mr-1" />
            {format(new Date(assembly.createdAt), 'PPp')}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {/* Pass BOM data and ensure form expects it */}
          <AssemblyQCForm
            bomItems={bom} // Pass BOM items to the form
            status={assembly.status}
            notes={assembly.notes}
            onSubmit={handleSubmit} // Pass the correctly typed handler
            onCancel={handleCancel}
            isSubmitting={isSubmitting}
          />
        </CardContent>
      </Card>
    </div>
  );
} 