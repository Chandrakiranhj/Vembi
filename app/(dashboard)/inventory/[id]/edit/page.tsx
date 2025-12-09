'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import ComponentForm from '@/components/ComponentForm';
import { useComponents } from '@/lib/hooks/useComponents';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from "@/components/ui/skeleton"; // For loading state

// Define the Component type (should match useComponents and ComponentForm)
interface Component {
  id: string;
  name: string;
  sku: string;
  description?: string;
  category: string;
  currentQuantity: number;
  minimumQuantity: number;
  createdAt?: string; // Add optional fields from useComponents if needed
  updatedAt?: string;
  _count?: { batches: number };
}

export default function EditComponentPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string; // Get ID from URL, handle potential null
  const { getComponent, updateComponent } = useComponents();

  const [componentData, setComponentData] = useState<Partial<Component> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch component data on mount
  useEffect(() => {
    const fetchComponent = async () => {
      if (!id) {
        toast.error("Component ID not found in URL.");
        router.push('/inventory');
        return;
      }
      setIsLoading(true);
      try {
        const data = await getComponent(id);
        if (!data) {
          throw new Error("Component data could not be loaded.");
        }
        setComponentData(data);
      } catch (error) { // Use unknown type
        console.error('Failed to fetch component:', error);
        let errorMessage = 'Could not load component details.';
        if (error instanceof Error) {
          errorMessage = error.message;
        }
        toast.error('Failed to load component data', {
          description: errorMessage,
        });
        router.push('/inventory'); // Redirect if component not found or error
      } finally {
        setIsLoading(false);
      }
    };
    fetchComponent();
  }, [id, getComponent, router]);

  const handleSubmit = async (data: Partial<Component>) => {
    if (!id) return;
    setIsSubmitting(true);
    try {
      // Ensure required fields are present before calling updateComponent
      if (!data.name || !data.sku || !data.category || data.currentQuantity === undefined || data.minimumQuantity === undefined) {
        throw new Error("Missing required fields (Name, SKU, Category, Quantities).");
      }

      await updateComponent(id, data);
      toast.success('Component updated successfully!');
      router.push('/inventory'); // Redirect after success
      // Optionally revalidate path
    } catch (error) { // Use unknown type
      console.error('Failed to update component:', error);
      let errorMessage = 'An unknown error occurred.';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      toast.error('Failed to update component', {
        description: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push('/inventory');
  };

  return (
    <div className="container mx-auto py-10">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl">Edit Component</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-6">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-20 w-full" />
              <div className="flex justify-end space-x-3">
                <Skeleton className="h-10 w-20" />
                <Skeleton className="h-10 w-24" />
              </div>
            </div>
          ) : componentData ? (
            <ComponentForm
              initialData={componentData}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              isSubmitting={isSubmitting}
            />
          ) : (
            <p>Could not load component data.</p> // Fallback if data isn't loaded
          )}
        </CardContent>
      </Card>
    </div>
  );
}