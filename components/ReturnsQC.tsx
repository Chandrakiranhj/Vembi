'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, AlertCircle } from 'lucide-react';

interface DefectFormData {
  componentId: string;
  batchId: string;
  defectType: string;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

interface ReturnItem {
  id: string;
  serialNumber: string;
  reason: string;
  modelNumber?: string;
  status: ReturnStatus;
  createdAt: string;
  productId?: string;
  qc?: {
    id: string;
    status: string;
  };
  assembly?: {
    id: string;
    serialNumber: string;
    product: {
      id: string;
      name: string;
      modelNumber: string;
    };
  };
}

type ReturnStatus = 'RECEIVED' | 'IN_INSPECTION' | 'REPAIRED' | 'REPLACED' | 'REFUNDED' | 'CLOSED' | 'RETURNED';

interface ComponentItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  stockBatches?: {
    id: string;
    batchNumber: string;
    vendor: {
      id: string;
      name: string;
    };
    currentQuantity: number;
  }[];
  usedBatch?: {
    id: string;
    batchNumber: string;
    vendor: {
      id: string;
      name: string;
    };
  };
}

interface QCFormData {
  returnId: string;
  defects: DefectFormData[];
}

export function ReturnsQC() {
  const [selectedReturn, setSelectedReturn] = useState<ReturnItem | null>(null);
  const [selectedComponent, setSelectedComponent] = useState<ComponentItem | null>(null);
  const [qcDialogOpen, setQCDialogOpen] = useState(false);
  const [defectDialogOpen, setDefectDialogOpen] = useState(false);
  const [defects, setDefects] = useState<DefectFormData[]>([]);
  const [currentDefect, setCurrentDefect] = useState<Partial<DefectFormData>>({
    defectType: '',
    description: '',
    severity: 'MEDIUM'
  });
  const { reset } = useForm<QCFormData>();
  const queryClient = useQueryClient();

  // Fetch returns for the table
  const { data: returns = [], isLoading: returnsLoading } = useQuery<ReturnItem[]>({
    queryKey: ['returns'],
    queryFn: async () => {
      const response = await fetch('/api/returns');
      if (!response.ok) {
        throw new Error('Failed to fetch returns');
      }
      const data = await response.json();
      console.log('Fetched returns data:', data);
      return data.returns || [];
    }
  });

  // Fetch components ACTUALLY used in the assembly of the returned item
  const { data: assemblyComponentsData, isLoading: componentsLoading } = useQuery({
    queryKey: ['assemblyComponents', selectedReturn?.id],
    queryFn: async () => {
      if (!selectedReturn?.id) return { components: [] };
      const response = await fetch(`/api/returns/${selectedReturn.id}/components`);
      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 404 && errorData.error === "No assembly found") {
          // This is a specific case where we know there's no assembly
          return { components: [], noAssembly: true };
        }
        throw new Error('Failed to fetch assembly components');
      }
      return response.json();
    },
    enabled: !!selectedReturn?.id
  });

  // Extract components from the response
  const components = assemblyComponentsData?.components || [];
  const noAssemblyFound = assemblyComponentsData?.noAssembly || false;

  // Mutation for creating QC record
  const createQC = useMutation({
    mutationFn: async (data: QCFormData) => {
      console.log('Submitting QC data:', JSON.stringify(data, null, 2));
      
      try {
        // First check if we have a valid auth session
        const authCheckResponse = await fetch('/api/returns', { 
          method: 'GET',
          headers: { 'Cache-Control': 'no-cache' }
        });
        
        if (authCheckResponse.status === 401) {
          throw new Error("Authentication error - please sign in again");
        }
        
        // Now attempt the actual submission
      const response = await fetch('/api/returns/qc', {
        method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache'
          },
          body: JSON.stringify({
            returnId: data.returnId,
            defects: data.defects.map(defect => ({
              componentId: defect.componentId,
              batchId: defect.batchId || "missing-batch-data",
              defectType: defect.defectType || "Unspecified", 
              description: defect.description || "No details provided",
              severity: defect.severity || "MEDIUM"
            }))
          }),
      });
        
        console.log('Response status:', response.status);
        
        // Try to get response text first, then parse as JSON if possible
        const responseText = await response.text();
        console.log('Response text:', responseText);
        
      if (!response.ok) {
          let errorMessage = 'Failed to create QC record';
          
          // Try to parse as JSON if it looks like JSON
          if (responseText.trim().startsWith('{')) {
            try {
              const errorData = JSON.parse(responseText);
              errorMessage = errorData.message || errorData.error || errorMessage;
            } catch (parseError) {
              console.error('Failed to parse error response as JSON:', parseError);
            }
          }
          
          throw new Error(errorMessage);
        }
        
        // Parse the successful response
        let result;
        try {
          result = JSON.parse(responseText);
        } catch (parseError) {
          console.error('Failed to parse success response as JSON:', parseError);
          throw new Error('Invalid server response format');
      }
        
        console.log('QC submission successful:', result);
        return result;
      } catch (error) {
        console.error('Error in mutation function:', error);
        throw error;
      }
    },
    onSuccess: () => {
      toast.success('QC record created successfully');
      reset();
      setDefects([]);
      setQCDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['returns'] });
    },
    onError: (error: Error) => {
      console.error('Mutation error in createQC:', error);
      toast.error(error.message || 'Failed to create QC record');
    },
  });

  // Add a new mutation for returning an item to a user
  const returnToUser = useMutation({
    mutationFn: async (returnId: string) => {
      console.log('Returning item to user:', returnId);
      
      try {
        const response = await fetch(`/api/returns/${returnId}/status`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ status: 'RETURNED' })
        });
        
        // Get the response text for more detailed error logging
        const responseText = await response.text();
        console.log('Return to user response:', response.status, responseText);
        
        if (!response.ok) {
          let errorMessage = 'Failed to update return status';
          try {
            if (responseText && responseText.trim().startsWith('{')) {
              const errorData = JSON.parse(responseText);
              errorMessage = errorData.message || errorData.error || errorMessage;
            }
          } catch (e) {
            console.error('Failed to parse error response:', e);
          }
          throw new Error(errorMessage);
        }
        
        // Try to parse response as JSON if it looks like JSON
        let result = { success: true };
        try {
          if (responseText && responseText.trim().startsWith('{')) {
            result = JSON.parse(responseText);
          }
        } catch (e) {
          console.error('Failed to parse success response as JSON:', e);
        }
        
        return result;
      } catch (error) {
        console.error('Error in fetch operation:', error);
        throw error;
      } finally {
        // Always dismiss the loading toast to prevent it from getting stuck
        toast.dismiss('return-to-user');
      }
    },
    onSuccess: () => {
      // Toast is already dismissed in finally block
      toast.success('Item marked as returned to user');
      queryClient.invalidateQueries({ queryKey: ['returns'] });
    },
    onError: (error: Error) => {
      // Toast is already dismissed in finally block
      console.error('Error returning item to user:', error);
      toast.error(error.message || 'Failed to update status');
    }
  });

  const startQC = (returnItem: ReturnItem) => {
    setSelectedReturn(returnItem);
    setDefects([]);
    setQCDialogOpen(true);
  };

  const openDefectDialog = (component: ComponentItem) => {
    setSelectedComponent(component);
    setCurrentDefect({
      componentId: component.id,
      batchId: component.usedBatch?.id || 'missing-batch-data',
      defectType: '',
      description: '',
      severity: 'MEDIUM'
    });
    setDefectDialogOpen(true);
  };

  const addDefect = () => {
    if (!currentDefect.componentId || !currentDefect.defectType) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    setDefects([...defects, currentDefect as DefectFormData]);
    setDefectDialogOpen(false);
  };

  const removeDefect = (index: number) => {
    setDefects(defects.filter((_, i) => i !== index));
  };

  const updateCurrentDefect = (field: keyof DefectFormData, value: string) => {
    setCurrentDefect({ ...currentDefect, [field]: value });
  };

  const onSubmit = async () => {
    if (!selectedReturn) {
      toast.error('No return selected');
      return;
    }

    if (defects.length === 0) {
      toast.error('Please add at least one defect');
      return;
    }

    // Show loading toast
    const loadingToastId = toast.loading('Submitting QC record...');

    try {
      // Format the data to send
      const processedDefects = defects.map(defect => ({
        componentId: defect.componentId,
        batchId: defect.batchId || 'missing-batch-data',
        defectType: defect.defectType || 'Unspecified',
        description: defect.description || 'No details provided',
        severity: defect.severity || 'MEDIUM'
      }));

      const dataToSend = {
        returnId: selectedReturn.id,
        defects: processedDefects
      };

      console.log('Submitting data:', JSON.stringify(dataToSend, null, 2));

      // Direct fetch call bypassing the mutation
      const response = await fetch('/api/returns/qc', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dataToSend)
      });

      // Get response text first
      const responseText = await response.text();
      console.log('Response status:', response.status);
      console.log('Response text:', responseText);

      // Check if success
      if (response.ok) {
        console.log('QC created successfully, now completing QC');
        
        // Now complete the QC to set status to COMPLETED
        try {
          const completeResponse = await fetch(`/api/returns/${selectedReturn.id}/complete-qc`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            }
          });
          
          const completeText = await completeResponse.text();
          console.log('Complete QC response:', completeResponse.status, completeText);
          
          if (completeResponse.ok) {
            console.log('QC completion successful');
          } else {
            console.warn('QC completion failed but continuing:', completeText);
          }
        } catch (completeError) {
          console.error('Error completing QC (non-critical):', completeError);
          // Continue anyway since the initial QC was created
        }
        
        toast.dismiss(loadingToastId);
        toast.success('QC record created successfully');
        
        // Clear form and close dialog
        reset();
        setDefects([]);
        setQCDialogOpen(false);
        
        // Refresh data
        queryClient.invalidateQueries({ queryKey: ['returns'] });
      } else {
        // Parse error if possible
        let errorMessage = 'Failed to create QC record';
        try {
          if (responseText && responseText.trim().startsWith('{')) {
            const errorData = JSON.parse(responseText);
            errorMessage = errorData.message || errorData.error || errorMessage;
          }
        } catch (e) {
          console.error('Failed to parse error response:', e);
        }
        
        toast.dismiss(loadingToastId);
        toast.error(`Error: ${errorMessage}`);
      }
    } catch (error) {
      console.error('Error during fetch:', error);
      toast.dismiss(loadingToastId);
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getReturnStatusBadge = (returnItem: ReturnItem) => {
    if (!returnItem.qc) {
      return <Badge variant="outline" className="bg-yellow-50 text-yellow-700">Awaiting QC</Badge>;
    }
    
    if (returnItem.status === 'RETURNED') {
      return <Badge variant="outline" className="bg-purple-50 text-purple-700">Returned to User</Badge>;
    }
    
    if (returnItem.qc.status === 'COMPLETED') {
      return <Badge variant="outline" className="bg-green-50 text-green-700">QC Done</Badge>;
    }
    
    if (returnItem.qc.status === 'FAILED') {
      return <Badge variant="outline" className="bg-red-50 text-red-700">QC Failed</Badge>;
    }
    
    return <Badge variant="outline" className="bg-blue-50 text-blue-700">In Progress</Badge>;
  };

  const handleReturnToUser = async (returnItem: ReturnItem) => {
    console.log('handleReturnToUser called with:', JSON.stringify(returnItem, null, 2));
    
    if (!returnItem?.id) {
      console.error('No return ID found!');
      return;
    }
    
    // Show confirmation dialog
    if (confirm('Are you sure you want to mark this item as returned to the user?')) {
      try {
        toast.loading('Updating status...', { id: 'return-to-user' });
        
        // First check if QC is completed, if not, complete it
        if (returnItem.qc && returnItem.qc.status !== 'COMPLETED') {
          console.log('QC not completed, completing first...');
          try {
            const completeResponse = await fetch(`/api/returns/${returnItem.id}/complete-qc`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              }
            });
            
            console.log('Complete QC response:', completeResponse.status);
            
            if (!completeResponse.ok) {
              toast.dismiss('return-to-user');
              toast.error('Failed to complete QC process');
              return;
            }
          } catch (error) {
            console.error('Error completing QC:', error);
            toast.dismiss('return-to-user');
            toast.error('Error while completing QC');
            return;
          }
        }
        
        // Now mark as returned to user
        console.log('Calling mutation with return ID:', returnItem.id);
        returnToUser.mutate(returnItem.id);
      } catch (error) {
        // Ensure the toast is dismissed if any unexpected error occurs
        toast.dismiss('return-to-user');
        console.error('Unexpected error in handleReturnToUser:', error);
        toast.error('An unexpected error occurred');
      }
    }
  };

  return (
    <div className="space-y-6">
    <Card>
      <CardHeader>
          <CardTitle>Returns Quality Control</CardTitle>
          <CardDescription>
            Review and manage returned items. Perform quality control checks on pending returns.
          </CardDescription>
      </CardHeader>
      <CardContent>
          {returnsLoading ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
            </div>
          ) : returns.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              No returns found in the system
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Serial Number</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Return Reason</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {returns.map((returnItem: ReturnItem) => {
                  // Add debugging for each return item
                  console.log(`Return Item ${returnItem.serialNumber}:`, {
                    id: returnItem.id,
                    status: returnItem.status,
                    hasQc: !!returnItem.qc,
                    qcStatus: returnItem.qc?.status,
                    showReturnButton: returnItem.qc && 
                                      returnItem.qc.status === 'COMPLETED' && 
                                      returnItem.status !== 'RETURNED'
                  });
                  
                  return (
                    <TableRow key={returnItem.id}>
                      <TableCell>
                        {getReturnStatusBadge(returnItem)}
                      </TableCell>
                      <TableCell>{returnItem.serialNumber}</TableCell>
                      <TableCell>{returnItem.modelNumber || 'N/A'}</TableCell>
                      <TableCell>{returnItem.reason}</TableCell>
                      <TableCell>{formatDate(returnItem.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        {/* Show Perform QC button if no QC exists */}
                        {!returnItem.qc && (
                          <Button size="sm" onClick={() => startQC(returnItem)}>
                            Perform QC
                          </Button>
                        )}
                        
                        {/* Show Return to User button if QC exists and item isn't already returned */}
                        {returnItem.qc && returnItem.status !== 'RETURNED' && (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => handleReturnToUser(returnItem)}
                          >
                            Return to User
                          </Button>
                        )}
                        
                        {/* Show badge if already returned */}
                        {returnItem.status === 'RETURNED' && (
                          <Badge variant="outline" className="bg-purple-50 text-purple-700">
                            Returned to User
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Main QC Dialog */}
      <Dialog open={qcDialogOpen} onOpenChange={setQCDialogOpen}>
        <DialogContent className="sm:max-w-[90vw] h-[85vh] w-full flex flex-col p-0 gap-0 border">
          <DialogHeader className="p-6 border-b">
            <DialogTitle className="text-xl font-semibold">
              QC Assessment for Return: {selectedReturn?.serialNumber}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6">
            <h3 className="text-lg font-medium mb-4">Components Used in This Assembly</h3>
            
            {componentsLoading ? (
              <div className="flex justify-center items-center h-40">
                <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
              </div>
            ) : noAssemblyFound ? (
              <div className="text-center py-8 text-gray-500">
                <AlertCircle className="mx-auto h-10 w-10 text-yellow-500 mb-2" />
                <p className="font-medium mb-1">Assembly Information Not Found</p>
                <p className="text-sm">This return is not linked to a specific assembly record.</p>
              </div>
            ) : components.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <AlertCircle className="mx-auto h-10 w-10 text-yellow-500 mb-2" />
                <p className="font-medium mb-1">No components found</p>
                <p className="text-sm">No component records found for this assembly.</p>
          </div>
            ) : (
              <div className="border rounded-md overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Component
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        SKU
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Batch Number
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {components.map((component: ComponentItem) => (
                      <tr key={component.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {component.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {component.sku}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {component.usedBatch?.batchNumber || 'Unknown'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <Button 
                            size="sm" 
                            onClick={() => openDefectDialog(component)}
                            variant="outline"
                            disabled={defects.some(d => d.componentId === component.id)}
                          >
                            {defects.some(d => d.componentId === component.id) ? 'Defect Logged' : 'Report Defect'}
                </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {defects.length > 0 && (
              <div className="mt-8">
                <h3 className="text-lg font-medium mb-4">Reported Defects ({defects.length})</h3>
                
                <div className="space-y-4">
                  {defects.map((defect, index) => {
                    // Find the component and batch information from our components list
                    const component = components.find((c: ComponentItem) => c.id === defect.componentId);
                    
                    return (
                      <div key={index} className="border rounded-md p-4 bg-gray-50">
                        <div className="flex justify-between mb-3">
                          <div>
                            <h4 className="font-medium">{component?.name || 'Unknown Component'}</h4>
                            <p className="text-sm text-gray-500">Defect Type: {defect.defectType} | Severity: {defect.severity}</p>
                          </div>
                    <Button
                      type="button"
                            size="sm" 
                            variant="outline" 
                      onClick={() => removeDefect(index)}
                    >
                      Remove
                    </Button>
                        </div>
                        <p className="text-sm text-gray-700 mt-2">{defect.description}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
                  </div>

          <div className="p-6 border-t grid grid-cols-2 gap-4">
            <Button 
              variant="outline" 
              onClick={() => setQCDialogOpen(false)}
              className="w-full"
            >
              Cancel
            </Button>
            <Button 
              onClick={onSubmit} 
              disabled={defects.length === 0 || createQC.isPending}
              className="w-full"
            >
              {createQC.isPending ? 'Submitting...' : 'Submit QC'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Defect Recording Dialog */}
      <Dialog open={defectDialogOpen} onOpenChange={setDefectDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Report Defect</DialogTitle>
          </DialogHeader>
          
          <div className="py-3 space-y-4">
            <div>
              <p className="text-sm font-medium mb-1">Component</p>
              <p className="font-medium p-2 border rounded bg-gray-50">
                {selectedComponent?.name}
              </p>
            </div>
            
            <div>
              <p className="text-sm font-medium mb-1">Defect Type</p>
              <input
                type="text"
                className="w-full p-2 border rounded"
                value={currentDefect.defectType}
                onChange={(e) => updateCurrentDefect('defectType', e.target.value)}
                placeholder="Enter defect type"
                required
              />
                    </div>

            <div>
              <p className="text-sm font-medium mb-1">Severity</p>
                      <Select
                value={currentDefect.severity}
                onValueChange={(value) => updateCurrentDefect('severity', value)}
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

            <div>
              <p className="text-sm font-medium mb-1">Description</p>
                    <Textarea
                value={currentDefect.description}
                onChange={(e) => updateCurrentDefect('description', e.target.value)}
                placeholder="Enter detailed defect description"
                      className="min-h-[100px]"
                required
                    />
                  </div>
                </div>
          
          <DialogFooter className="flex justify-between sm:justify-between mt-2">
            <Button variant="outline" onClick={() => setDefectDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={addDefect}>
              Add Defect
          </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 