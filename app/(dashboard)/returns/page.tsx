'use client';

import { useState } from 'react';
import { ReturnsLog } from '@/components/ReturnsLog';
import { ReturnsQC } from '@/components/ReturnsQC';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function ReturnsPage() {
  const [activeTab, setActiveTab] = useState('log');
  const [tabLoading, setTabLoading] = useState(false);
  const [autoOpenReturnId, setAutoOpenReturnId] = useState<string | null>(null);

  // Handle tab change with loading state
  const handleTabChange = (value: string) => {
    setTabLoading(true);
    setActiveTab(value);

    // Simulate loading time (remove this in production and use real loading states)
    setTimeout(() => {
      setTabLoading(false);
    }, 500);
  };

  const handleReturnLogged = (returnId: string) => {
    setAutoOpenReturnId(returnId);
    handleTabChange('qc');
  };

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Returns Quality Control</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger
                value="log"
                isLoading={tabLoading && activeTab === 'log'}
              >
                Log Returns
              </TabsTrigger>
              <TabsTrigger
                value="qc"
                isLoading={tabLoading && activeTab === 'qc'}
              >
                Quality Control
              </TabsTrigger>
            </TabsList>
            <TabsContent value="log">
              <ReturnsLog onReturnLogged={handleReturnLogged} />
            </TabsContent>
            <TabsContent value="qc">
              <ReturnsQC autoOpenReturnId={autoOpenReturnId} onAutoOpenComplete={() => setAutoOpenReturnId(null)} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}