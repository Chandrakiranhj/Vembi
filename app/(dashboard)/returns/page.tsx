'use client';

import { ReturnsLog } from '@/components/ReturnsLog';
import { ReturnsQC } from '@/components/ReturnsQC';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function ReturnsPage() {
  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Returns Quality Control</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="log" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="log">Log Returns</TabsTrigger>
              <TabsTrigger value="qc">Quality Control</TabsTrigger>
            </TabsList>
            <TabsContent value="log">
              <ReturnsLog />
            </TabsContent>
            <TabsContent value="qc">
              <ReturnsQC />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
} 