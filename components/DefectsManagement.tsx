'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Loader2, AlertTriangle } from 'lucide-react';
import { Label } from '@/components/ui/label';

interface Defect {
  id: string;
  componentId: string;
  component: {
    id: string;
    name: string;
    sku: string;
    category: string;
  };
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  resolution?: string;
  createdAt: string;
  reportedBy: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  source?: string; // Either 'INVENTORY' or 'RETURN'
}

interface Component {
  id: string;
  name: string;
  sku: string;
  category: string;
  stockBatches?: StockBatch[];
}

interface StockBatch {
  id: string;
  batchNumber: string;
  currentQuantity: number;
  vendor: {
    id: string;
    name: string;
  };
}

interface DefectFormData {
  componentId: string;
  batchId: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
}

export default function DefectsManagement() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedComponent, setSelectedComponent] = useState<Component | null>(null);
  const [selectedBatch, setSelectedBatch] = useState<string>('');
  const [formData, setFormData] = useState<DefectFormData>({
    componentId: '',
    batchId: '',
    severity: 'MEDIUM',
    description: '',
  });
  const [searchTerm, setSearchTerm] = useState('');
  const queryClient = useQueryClient();

  // Fetch defects
  const { data: defects = [], isLoading: defectsLoading } = useQuery<Defect[]>({
    queryKey: ['defects'],
    queryFn: async () => {
      try {
        // Use the combined endpoint that fetches both inventory and return defects
        const response = await fetch('/api/defects/test');
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Error fetching defects:', response.status, errorText);
          throw new Error(`Failed to fetch defects: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Fetched defects data:', data);
        
        if (!data.success) {
          throw new Error(data.error || 'Failed to fetch defects');
        }
        
        // Return the defects array from our response
        return data.defects || [];
      } catch (error) {
        console.error('Error in defects query:', error);
        throw error;
      }
    }
  });

  // Fetch components with stock batches for reporting defects
  const { data: components = [] } = useQuery<Component[]>({
    queryKey: ['components'],
    queryFn: async () => {
      const response = await fetch('/api/components?includeStockBatches=true');
      if (!response.ok) {
        throw new Error('Failed to fetch components');
      }
      const data = await response.json();
      console.log('Fetched components with stock batches:', data);
      return data;
    }
  });

  // Mutation for creating a defect from inventory
  const createDefect = useMutation({
    mutationFn: async (data: DefectFormData) => {
      const response = await fetch('/api/defects/inventory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create defect');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast.success('Defect reported successfully');
      setDialogOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['defects'] });
      queryClient.invalidateQueries({ queryKey: ['components'] });
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const handleSubmit = () => {
    if (!formData.componentId || !formData.batchId || !formData.description) {
      toast.error('Please fill in all required fields');
      return;
    }

    createDefect.mutate(formData);
  };

  const handleComponentChange = (componentId: string) => {
    console.log('Selected component ID:', componentId);
    const component = components.find(c => c.id === componentId);
    console.log('Found component:', component);
    console.log('Component has stock batches:', component?.stockBatches?.length || 0);
    
    setSelectedComponent(component || null);
    setFormData(prev => ({ 
      ...prev, 
      componentId,
      batchId: '' // Reset batch when component changes
    }));
    setSelectedBatch('');
  };

  const handleBatchChange = (batchId: string) => {
    console.log('Selected batch ID:', batchId);
    setSelectedBatch(batchId);
    setFormData(prev => ({ ...prev, batchId }));
  };

  const resetForm = () => {
    setFormData({
      componentId: '',
      batchId: '',
      severity: 'MEDIUM',
      description: '',
    });
    setSelectedComponent(null);
    setSelectedBatch('');
  };

  const openDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const filteredDefects = searchTerm 
    ? defects.filter(defect => 
        defect.component.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        defect.component.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        defect.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        defect.reportedBy.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : defects;

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'LOW':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700">Low</Badge>;
      case 'MEDIUM':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700">Medium</Badge>;
      case 'HIGH':
        return <Badge variant="outline" className="bg-orange-50 text-orange-700">High</Badge>;
      case 'CRITICAL':
        return <Badge variant="outline" className="bg-red-50 text-red-700">Critical</Badge>;
      default:
        return <Badge variant="outline">{severity}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700">Open</Badge>;
      case 'IN_PROGRESS':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700">In Progress</Badge>;
      case 'RESOLVED':
        return <Badge variant="outline" className="bg-green-50 text-green-700">Resolved</Badge>;
      case 'CLOSED':
        return <Badge variant="outline" className="bg-gray-50 text-gray-700">Closed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Defects</CardTitle>
            <CardDescription>
              View and manage defects reported from returns and inventory
            </CardDescription>
          </div>
          <Button onClick={openDialog}>Report Defect from Inventory</Button>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Input
              placeholder="Search by component, SKU, description, or reporter..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
          
          {defectsLoading ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
            </div>
          ) : filteredDefects.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              No defects found
            </div>
          ) : (
            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Component</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Reported By</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDefects.map((defect) => (
                    <TableRow key={defect.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{defect.component.name}</p>
                          <p className="text-sm text-gray-500">{defect.component.sku}</p>
                        </div>
                      </TableCell>
                      <TableCell>{getSeverityBadge(defect.severity)}</TableCell>
                      <TableCell>{getStatusBadge(defect.status)}</TableCell>
                      <TableCell className="max-w-xs truncate" title={defect.description}>
                        {defect.description}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p>{defect.reportedBy.name}</p>
                          <p className="text-sm text-gray-500">{defect.reportedBy.role}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {defect.source === 'INVENTORY' ? (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700">Inventory</Badge>
                        ) : (
                          <Badge variant="outline" className="bg-green-50 text-green-700">Return</Badge>
                        )}
                      </TableCell>
                      <TableCell>{formatDate(defect.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Report Defect Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Report Defect from Inventory</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="component">Component</Label>
              <Select
                value={formData.componentId}
                onValueChange={handleComponentChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select component" />
                </SelectTrigger>
                <SelectContent>
                  {components.map((component) => (
                    <SelectItem key={component.id} value={component.id}>
                      {component.name} ({component.sku})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {selectedComponent && (
              <div className="space-y-2">
                <Label htmlFor="batch">Batch</Label>
                <Select
                  value={formData.batchId}
                  onValueChange={handleBatchChange}
                  disabled={!selectedComponent?.stockBatches || selectedComponent.stockBatches.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select batch" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedComponent.stockBatches?.filter(batch => batch.currentQuantity > 0).map((batch) => (
                      <SelectItem 
                        key={batch.id} 
                        value={batch.id}
                      >
                        {batch.batchNumber} - {batch.vendor?.name || 'Unknown vendor'} ({batch.currentQuantity} in stock)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {(!selectedComponent.stockBatches || selectedComponent.stockBatches.length === 0) && (
                  <p className="text-sm text-red-500">No batches available for this component</p>
                )}
                {selectedComponent.stockBatches && 
                  selectedComponent.stockBatches.length > 0 && 
                  selectedComponent.stockBatches.every(batch => batch.currentQuantity <= 0) && (
                  <p className="text-sm text-red-500">No batches with available quantity</p>
                )}
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="severity">Severity</Label>
              <Select
                value={formData.severity}
                onValueChange={(value: string) => setFormData({ ...formData, severity: value as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="CRITICAL">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the defect in detail..."
              />
            </div>

            {selectedBatch && (
              <div className="bg-amber-50 p-3 rounded-md border border-amber-200">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">Inventory Impact</p>
                    <p className="text-xs text-amber-700">
                      Reporting this defect will remove 1 unit from the selected batch in inventory.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleSubmit} 
              disabled={!formData.componentId || !formData.batchId || !formData.description || createDefect.isPending}
            >
              {createDefect.isPending ? 'Submitting...' : 'Report Defect'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 