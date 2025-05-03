'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ComponentManagement } from '@/components/admin/ComponentManagement';
import { BOMManagement } from '@/components/admin/BOMManagement';
import VendorsPage from '@/app/(dashboard)/vendors/page';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { toast } from 'sonner';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('components');
  const { userId } = useAuth();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuthorization = async () => {
      try {
        const response = await fetch('/api/auth/check?role=ADMIN');
        if (response.ok) {
          const data = await response.json();
          setIsAuthorized(data.authorized);
          if (!data.authorized) {
            toast.error('Access Denied', {
              description: 'You do not have permission to access the admin panel.'
            });
            router.push('/dashboard');
          }
        } else {
          setIsAuthorized(false);
          toast.error('Authorization check failed');
          router.push('/dashboard');
        }
      } catch (error) {
        console.error('Authorization check error:', error);
        setIsAuthorized(false);
        toast.error('Error checking authorization');
        router.push('/dashboard');
      }
    };

    if (userId) {
      checkAuthorization();
    }
  }, [userId, router]);

  if (isAuthorized === null) {
    return (
      <div className="container mx-auto py-10 flex justify-center items-center">
        <Card className="w-full max-w-md text-center p-6">
          <p>Checking authorization...</p>
        </Card>
      </div>
    );
  }

  if (!isAuthorized) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="container mx-auto py-10">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Admin Panel</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="components">Component Management</TabsTrigger>
              <TabsTrigger value="bom">BOM Management</TabsTrigger>
              <TabsTrigger value="vendors">Vendor Management</TabsTrigger>
            </TabsList>
            <TabsContent value="components">
              <ComponentManagement />
            </TabsContent>
            <TabsContent value="bom">
              <BOMManagement />
            </TabsContent>
            <TabsContent value="vendors">
              <VendorsPage />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
} 