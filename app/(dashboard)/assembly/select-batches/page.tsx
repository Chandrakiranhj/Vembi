'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AssemblyBatchSelectionForm from '@/components/AssemblyBatchSelectionForm';
import { toast } from 'sonner';
import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function SelectBatchesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [initialized, setInitialized] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  
  // Get parameters from URL
  const productId = searchParams?.get('productId') || '';
  const quantity = parseInt(searchParams?.get('quantity') || '1', 10);
  const startSerialNumber = searchParams?.get('startSerialNumber') || '';
  const funder = searchParams?.get('funder') || '';
  
  // Check authorization
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/check?role=ASSEMBLER,ADMIN');
        if (response.ok) {
          const data = await response.json();
          setIsAuthorized(data.authorized);
        } else {
          toast.error('Authorization check failed');
          setIsAuthorized(false);
        }
      } catch (error) {
        console.error('Authorization check error:', error);
        setIsAuthorized(false);
      } finally {
        setIsCheckingAuth(false);
      }
    };
    
    checkAuth();
  }, []);
  
  // Validate parameters on client side
  useEffect(() => {
    if (!isCheckingAuth && isAuthorized !== null) {
      // Check if any required field is missing or invalid
      if (!productId || 
          !quantity || 
          quantity <= 0 || 
          !startSerialNumber || 
          !funder) {
        toast.error('Missing or invalid parameters', {
          description: 'Please fill out all required fields in the assembly form.'
        });
        // Redirect back to the new assembly page
        router.push('/assembly/new');
        return;
      }
      
      setInitialized(true);
    }
  }, [productId, quantity, startSerialNumber, funder, router, isCheckingAuth, isAuthorized]);
  
  const handleCancel = () => {
    router.push('/assembly/new');
  };
  
  if (isCheckingAuth) {
    return (
      <div className="container mx-auto py-10 flex justify-center items-center">
        <Card className="w-full max-w-md text-center p-6">
          <p>Checking authorization...</p>
        </Card>
      </div>
    );
  }
  
  if (isAuthorized === false) {
    return (
      <div className="container mx-auto py-10">
        <Card className="mx-auto max-w-md border-red-500">
          <CardHeader>
            <CardTitle className="text-red-700 flex items-center">
              <ShieldAlert className="mr-2 h-5 w-5" /> Access Denied
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 mb-4">
              You do not have permission to access this page. Only administrators and assemblers can select component batches.
            </p>
            <Link href="/assembly">
              <Button variant="outline">
                Return to Assemblies
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (!initialized) {
    return null; // Don't render anything during validation
  }
  
  return (
    <div className="container mx-auto py-10">
      <Card className="mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl">Select Component Batches</CardTitle>
        </CardHeader>
        <CardContent>
          <AssemblyBatchSelectionForm
            productId={productId}
            quantity={quantity}
            startSerialNumber={startSerialNumber}
            funder={funder}
            onCancel={handleCancel}
          />
        </CardContent>
      </Card>
    </div>
  );
} 