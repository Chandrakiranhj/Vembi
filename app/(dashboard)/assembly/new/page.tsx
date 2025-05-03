'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AssemblyForm, { AssemblyFormData } from '@/components/AssemblyForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function NewAssemblyPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle form submission - now redirects to batch selection page
  const handleSubmit = async (data: AssemblyFormData) => { 
    setIsSubmitting(true);
    try {
      // Include funder in the URL params
      router.push(`/assembly/select-batches?productId=${data.productId}&quantity=${data.quantity}&startSerialNumber=${encodeURIComponent(data.startSerialNumber)}&funder=${encodeURIComponent(data.funder)}`);
    } catch (error) { 
      console.error('Error navigating to batch selection:', error);
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push('/assembly');
  };

  return (
    <div className="container mx-auto py-10">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl">Start New Assembly Batch</CardTitle>
        </CardHeader>
        <CardContent>
          <AssemblyForm 
            onSubmit={handleSubmit} 
            onCancel={handleCancel} 
            isSubmitting={isSubmitting} 
          />
        </CardContent>
      </Card>
    </div>
  );
} 