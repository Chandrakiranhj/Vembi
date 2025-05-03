'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ComponentForm from '@/components/ComponentForm';
import { useComponents } from '@/lib/hooks/useComponents';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Use the Component type definition from the form component or a shared types file if available
// For now, re-defining based on ComponentForm's structure
interface Component {
  id?: string;
  name: string;
  sku: string;
  description?: string;
  category: string;
  currentQuantity: number;
  minimumQuantity: number;
  unitPrice?: number;
}

export default function AddComponentPage() {
  const router = useRouter();
  // The addComponent function from useComponents expects a specific type (Omit<Component, 'id' | 'createdAt' | 'updatedAt'>)
  // We need to ensure the data passed matches that expectation.
  const { addComponent } = useComponents(); 
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Change handleSubmit to accept Partial<Component> as expected by the form
  const handleSubmit = async (data: Partial<Component>) => { 
    setIsSubmitting(true);
    try {
      // Ensure required fields are present before calling addComponent
      if (!data.name || !data.sku || !data.category || data.currentQuantity === undefined || data.minimumQuantity === undefined) {
        throw new Error("Missing required fields (Name, SKU, Category, Quantities).");
      }

      // Prepare data for the addComponent hook, omitting fields it doesn't expect
      const componentToAdd = {
        name: data.name,
        sku: data.sku,
        description: data.description,
        category: data.category,
        currentQuantity: data.currentQuantity,
        minimumQuantity: data.minimumQuantity,
        unitPrice: data.unitPrice,
      };

      await addComponent(componentToAdd);
      toast.success('Component added successfully!');
      router.push('/inventory'); // Redirect to inventory list after success
    } catch (error) { // Use 'unknown' and type check
      console.error('Failed to add component:', error);
      let errorMessage = 'An unknown error occurred.';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      toast.error('Failed to add component', {
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
          <CardTitle className="text-2xl">Add New Component</CardTitle>
        </CardHeader>
        <CardContent>
          <ComponentForm 
            onSubmit={handleSubmit} 
            onCancel={handleCancel} 
            isSubmitting={isSubmitting} 
          />
        </CardContent>
      </Card>
    </div>
  );
} 