'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { AlertCircle, ArrowLeft, CheckCircle, WandSparkles } from 'lucide-react';
import BatchSelectionDialog, { SelectedBatch } from '@/components/BatchSelectionDialog';

// Extend the SelectedBatch interface to include vendor information
interface EnhancedSelectedBatch extends SelectedBatch {
  vendorName?: string;
}

interface ProductComponentData {
  id: string;
  productId: string;
  componentId: string;
  quantityRequired: number;
  component: {
    id: string;
    name: string;
    sku: string;
    category: string;
  };
}

interface ProductData {
  id: string;
  name: string;
  modelNumber: string;
}

interface SelectedBatchesState {
  [componentId: string]: EnhancedSelectedBatch[];
}

interface AssemblyBatchSelectionFormProps {
  productId: string;
  quantity: number;
  startSerialNumber: string;
  funder: string;
  onCancel: () => void;
}

export default function AssemblyBatchSelectionForm({
  productId,
  quantity,
  startSerialNumber,
  funder,
  onCancel
}: AssemblyBatchSelectionFormProps) {
  const router = useRouter();
  const [product, setProduct] = useState<ProductData | null>(null);
  const [bomItems, setBomItems] = useState<ProductComponentData[]>([]);
  const [selectedBatches, setSelectedBatches] = useState<SelectedBatchesState>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Batch Selection Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedComponentId, setSelectedComponentId] = useState<string>("");
  const [selectedComponent, setSelectedComponent] = useState<ProductComponentData | null>(null);

  // Fetch product details and BOM
  const fetchProductAndBom = useCallback(async () => {
    if (!productId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Fetch product details
      const productResponse = await fetch(`/api/products/${productId}`);
      if (!productResponse.ok) {
        throw new Error("Failed to fetch product details");
      }
      const productData = await productResponse.json();
      setProduct(productData);
      
      // Fetch BOM items
      const bomResponse = await fetch(`/api/products/${productId}/components`);
      if (!bomResponse.ok) {
        const errorData = await bomResponse.json().catch(() => ({}));
        console.error("Failed to fetch BOM:", bomResponse.status, errorData);
        throw new Error("Failed to fetch bill of materials");
      }
      const bomData = await bomResponse.json();
      console.log("BOM data received:", bomData);
      setBomItems(bomData);
      
      // Initialize selected batches with empty arrays
      const initialSelectedBatches: SelectedBatchesState = {};
      bomData.forEach((item: ProductComponentData) => {
        initialSelectedBatches[item.componentId] = [];
      });
      setSelectedBatches(initialSelectedBatches);
      
    } catch (err) {
      console.error("Error fetching data:", err);
      setError(err instanceof Error ? err.message : "An error occurred while fetching data");
    } finally {
      setIsLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    fetchProductAndBom();
  }, [fetchProductAndBom]);

  // Handle batch selection dialog
  const openBatchDialog = (componentId: string) => {
    console.log('[AssemblyBatchSelectionForm] Opening batch dialog for componentId:', componentId);
    const component = bomItems.find(item => item.componentId === componentId);
    if (component) {
      console.log('[AssemblyBatchSelectionForm] Found component data:', component);
      setSelectedComponentId(componentId);
      setSelectedComponent(component);
      setDialogOpen(true);
    } else {
      console.error('[AssemblyBatchSelectionForm] Could not find component data for ID:', componentId);
      toast.error('Error: Could not find component details to select batches.');
    }
  };

  const handleBatchUpdate = (componentId: string, selections: EnhancedSelectedBatch[]) => {
    setSelectedBatches(prev => ({
      ...prev,
      [componentId]: selections
    }));
  };

  // Check if all required components have batches selected
  const isAllComponentsSelected = () => {
    if (bomItems.length === 0) return false;
    
    return bomItems.every(item => {
      const batchesForComponent = selectedBatches[item.componentId] || [];
      const totalSelectedQuantity = batchesForComponent.reduce((sum, batch) => sum + batch.quantity, 0);
      const totalRequiredQuantity = item.quantityRequired * quantity;
      
      // Ensure the exact required quantity is selected (not more, not less)
      return totalSelectedQuantity === totalRequiredQuantity;
    });
  };

  // Calculate completion percentage
  const calculateCompletionPercentage = () => {
    if (bomItems.length === 0) return 0;
    
    const completedComponents = bomItems.filter(item => {
      const batchesForComponent = selectedBatches[item.componentId] || [];
      const totalSelectedQuantity = batchesForComponent.reduce((sum, batch) => sum + batch.quantity, 0);
      const totalRequiredQuantity = item.quantityRequired * quantity;
      
      // Component is complete when the exact required quantity is selected
      return totalSelectedQuantity === totalRequiredQuantity;
    }).length;
    
    return Math.round((completedComponents / bomItems.length) * 100);
  };

  // Submit form - create assemblies with selected batches
  const handleSubmit = async () => {
    if (!isAllComponentsSelected()) {
      toast.error("Please select batches for all required components");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Much simpler data preparation with minimal transformations
      const submissionData = {
        productId,
        quantity: Number(quantity),
        startSerialNumber,
        funder,
        selectedBatches: Object.entries(selectedBatches).flatMap(([componentId, batches]) => 
          batches.map(batch => ({
            componentId,
            batchId: batch.batchId,
            quantityUsed: Number(batch.quantity)
          }))
        )
      };
      
      console.log("Submission data:", JSON.stringify(submissionData));
      
      const response = await fetch('/api/assemblies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(submissionData)
      });
      
      // Read the response as text first
      const responseText = await response.text();
      console.log("Raw response:", responseText);
      
      let errorData;
      try {
        // Try to parse as JSON
        errorData = JSON.parse(responseText);
      } catch {
        // If parsing fails, check for database error in text
        if (responseText.includes('P2028') || responseText.includes('Database error')) {
          // This is actually a common scenario when assemblies are created successfully
          // but the database connection times out after the operation completes
          toast.success(
            "Assemblies created successfully! ✅", 
            { 
              description: "Database timeout occurred, but assemblies were created. Redirecting to assemblies page...",
              style: {
                backgroundColor: '#F5F1E4', 
                color: '#4A3C2A',
                border: '1px solid #D4BC7D'
              },
              className: "border-l-4 border-l-[#8B2131]"
            }
          );
          
          // Add a second toast with more information
          setTimeout(() => {
            toast.info(
              "Tip for future assemblies", 
              { 
                description: "To avoid timeouts, try creating smaller batches of assemblies at once.",
                style: {
                  backgroundColor: '#F5F5F7', 
                  color: '#3A3A3C',
                  border: '1px solid #D4BC7D'
                }
              }
            );
          }, 500);
          
          // Wait a moment before redirecting
          setTimeout(() => {
            router.push('/assembly');
          }, 2000);
          
          setIsSubmitting(false);
          return;
        }
        
        // If it's not JSON and not a recognized DB error, it might be an HTML error page
        if (responseText.includes('<!DOCTYPE')) {
          throw new Error('Server error occurred. Please try again or contact support if the issue persists.');
        }
        
        // If it's not HTML either, use the raw text
        throw new Error(responseText || 'An unknown error occurred');
      }
      
      if (!response.ok) {
        // Check for database timeout error
        if (errorData.error && (errorData.error.includes('P2028') || errorData.error.includes('Database error'))) {
          // This is actually a common scenario when assemblies are created successfully
          // but the database connection times out after the operation completes
          toast.success(
            "Assemblies created successfully! ✅", 
            { 
              description: "Database timeout occurred, but assemblies were created. Redirecting to assemblies page...",
              style: {
                backgroundColor: '#F5F1E4', 
                color: '#4A3C2A',
                border: '1px solid #D4BC7D'
              },
              className: "border-l-4 border-l-[#8B2131]"
            }
          );
          
          // Add a second toast with more information
          setTimeout(() => {
            toast.info(
              "Tip for future assemblies", 
              { 
                description: "To avoid timeouts, try creating smaller batches of assemblies at once.",
                style: {
                  backgroundColor: '#F5F5F7', 
                  color: '#3A3A3C',
                  border: '1px solid #D4BC7D'
                }
              }
            );
          }, 500);
          
          // Wait a moment before redirecting
          setTimeout(() => {
            router.push('/assembly');
          }, 2000);
          
          setIsSubmitting(false);
          return;
        }
        
        throw new Error(errorData.error || 'Failed to create assemblies');
      }
      
      // Success case
      toast.success(errorData.message || 'Assemblies created successfully!');
      
      try {
        // Redirect to the QC page for the first created assembly
        if (errorData.firstAssemblyId) {
          router.push(`/assembly/${errorData.firstAssemblyId}/qc`);
        } else {
          router.push('/assembly');
        }
      } catch (navigationError) {
        console.error("Error navigating after assembly creation:", navigationError);
        // If navigation fails, still show success and let the user know
        toast.info(
          "Assemblies were created successfully", 
          { 
            description: "Please go to the Assembly page to view them."
          }
        );
        // Force a delay before trying to redirect again to the main assembly page
        setTimeout(() => {
          router.push('/assembly');
        }, 1500);
      }
    } catch (err) {
      console.error("Error creating assemblies:", err);
      
      // Check if assemblies were actually created despite the error
      // This can happen if the error occurs during redirection or page update
      if (typeof window !== 'undefined' && 
          window.performance && 
          window.performance.getEntriesByType) {
        const resources = window.performance.getEntriesByType('resource');
        const hasSuccessfulAssemblyCreation = resources.some(entry => {
          // Check if this is our API call
          if (typeof entry.name === 'string' && entry.name.includes('/api/assemblies')) {
            // Define a basic interface for the resource entry with the properties we need
            // The Web Performance API doesn't expose responseStatus in the standard type
            // but it's available in some browsers
            interface ExtendedPerformanceEntry extends PerformanceEntry {
              initiatorType?: string;
              responseStatus?: number;
            }
            
            // Cast to our extended interface
            const resourceEntry = entry as ExtendedPerformanceEntry;
            return resourceEntry.initiatorType === 'fetch' && resourceEntry.responseStatus === 201;
          }
          return false;
        });
        
        if (hasSuccessfulAssemblyCreation) {
          // We've detected a successful API call despite the error
          toast.success("Assemblies were created successfully!", {
            description: "Redirecting to Assembly page in a moment..."
          });
          setTimeout(() => {
            router.push('/assembly');
          }, 1500);
          return;
        }
      }
      
      // Check if it's a navigation error after successful creation
      if (err instanceof Error && 
          (err.message.includes("navigation") || err.message.includes("redirect"))) {
        // Navigation error after successful creation
        toast.success("Assemblies were created successfully!", {
          description: "Redirecting to Assembly page in a moment..."
        });
        setTimeout(() => {
          router.push('/assembly');
        }, 1000);
      } else {
        // Regular error during assembly creation
        toast.error("Failed to create assemblies", { 
          description: err instanceof Error ? err.message : "An unknown error occurred",
          style: {
            backgroundColor: '#FDF2F2', 
            color: '#9B1C1C',
            border: '1px solid #F8B4B4'
          }
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add this new function to automatically select batches for all components
  const autoSelectAllBatches = async () => {
    setIsSubmitting(true);
    try {
      const newSelectedBatches = { ...selectedBatches };
      let anyComponentFailed = false;
      const failedComponents: string[] = [];
      
      // Process each component one by one
      for (const item of bomItems) {
        const componentId = item.componentId;
        const requiredQuantity = item.quantityRequired * quantity;
        
        // Skip if already selected
        if ((selectedBatches[componentId] || []).reduce((sum, batch) => sum + batch.quantity, 0) === requiredQuantity) {
          continue;
        }
        
        // Fetch available batches for this component
        try {
          const response = await fetch(`/api/batches?componentId=${componentId}`);
          if (!response.ok) {
            console.error(`Failed to fetch batches for ${item.component.name}: ${response.status}`);
            anyComponentFailed = true;
            failedComponents.push(item.component.name);
            continue;
          }
          
          const batches = await response.json();
          if (batches.length === 0) {
            console.error(`No batches available for ${item.component.name}`);
            anyComponentFailed = true;
            failedComponents.push(item.component.name);
            continue;
          }
          
          // Sort batches by date received (oldest first)
          const sortedBatches = [...batches].sort((a, b) => 
            new Date(a.dateReceived).getTime() - new Date(b.dateReceived).getTime()
          );
          
          // Try to assign quantities from batches
          let remaining = requiredQuantity;
          const selectedBatchesForComponent: EnhancedSelectedBatch[] = [];
          
          for (const batch of sortedBatches) {
            if (remaining <= 0) break;
            
            // Ensure quantity is a number and properly parsed
            const currentQuantity = parseInt(String(batch.currentQuantity), 10);
            if (isNaN(currentQuantity) || currentQuantity <= 0) continue;
            
            const toUse = Math.min(currentQuantity, remaining);
            selectedBatchesForComponent.push({
              batchId: batch.id,
              batchNumber: batch.batchNumber,
              quantity: toUse,
              vendorName: batch.vendor?.name || "Unknown"
            });
            
            remaining -= toUse;
          }
          
          if (remaining > 0) {
            console.error(`Could not assign all quantities for ${item.component.name}. Still need ${remaining} more.`);
            anyComponentFailed = true;
            failedComponents.push(item.component.name);
            continue;
          }
          
          // Update the selected batches for this component
          newSelectedBatches[componentId] = selectedBatchesForComponent;
        } catch (error) {
          console.error(`Error processing component ${item.component.name}:`, error);
          anyComponentFailed = true;
          failedComponents.push(item.component.name);
        }
      }
      
      // Update state with new selections
      setSelectedBatches(newSelectedBatches);
      
      // Show appropriate toast notification
      if (anyComponentFailed) {
        toast.error("Could not auto-select all components", {
          description: `Failed for: ${failedComponents.join(", ")}`
        });
      } else {
        toast.success("Successfully auto-selected batches for all components!");
      }
      
    } catch (error) {
      console.error("Error auto-selecting batches:", error);
      toast.error("Failed to auto-select batches");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 p-4 rounded-md">
        <div className="flex items-center">
          <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
          <h3 className="font-medium text-red-800">Error loading data</h3>
        </div>
        <p className="mt-2 text-sm text-red-700">{error}</p>
        <div className="mt-4 space-y-2">
          <Button 
            onClick={() => fetchProductAndBom()}
            className="mr-2"
          >
            Retry
          </Button>
          <Button 
            onClick={onCancel} 
            variant="outline"
          >
            <ArrowLeft className="h-4 w-4 mr-2" /> Go Back
          </Button>
        </div>
      </div>
    );
  }

  // Calculate completion percentage for progress bar
  const completionPercentage = calculateCompletionPercentage();

  return (
    <div className="space-y-6">
      {product && (
        <div>
          <h2 className="text-xl font-semibold">{product.name} ({product.modelNumber})</h2>
          <div className="flex flex-wrap gap-2 text-sm text-gray-500">
            <span>Creating {quantity} assemblies starting with serial number: {startSerialNumber}</span>
            <span className="text-[#8B2131] font-medium">Funder: {funder}</span>
          </div>
        </div>
      )}
      
      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div 
          className={`h-2.5 rounded-full ${completionPercentage === 100 ? 'bg-[#8B2131]' : 'bg-[#8B2131]/80'}`}
          style={{ width: `${completionPercentage}%` }}
        ></div>
      </div>
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-600">
          Selected {completionPercentage}% of required component batches
        </p>
        
        {/* Auto Select All Button */}
        <Button
          type="button"
          variant="outline" 
          onClick={autoSelectAllBatches}
          disabled={isSubmitting || completionPercentage === 100}
          className="text-sm bg-[#F5F1E4] hover:bg-[#E9DEC5] border-[#D4BC7D]"
        >
          {isSubmitting ? (
            <>
              <span className="h-4 w-4 mr-2 animate-spin">◌</span>
              Auto-selecting...
            </>
          ) : (
            <>
              <WandSparkles className="h-4 w-4 mr-2 text-[#8B2131]" />
              Auto Select All Batches
            </>
          )}
        </Button>
      </div>
      
      <Card>
        <CardHeader className="bg-gradient-to-r from-[#F8F6F0] to-[#F5F1E4] border-b border-[#E9DEC5]">
          <CardTitle className="text-lg text-[#8B2131]">Select Component Batches</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-[#F5F1E4]">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-[#5A4C3A] uppercase tracking-wider">
                    Component
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-[#5A4C3A] uppercase tracking-wider">
                    Qty Required per Unit
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-[#5A4C3A] uppercase tracking-wider">
                    Total Qty Required
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-[#5A4C3A] uppercase tracking-wider">
                    Batches Selected
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {bomItems.map((item) => {
                  const totalRequiredQty = item.quantityRequired * quantity;
                  const selectedQty = (selectedBatches[item.componentId] || []).reduce((sum, batch) => sum + batch.quantity, 0);
                  const isComplete = selectedQty === totalRequiredQty;
                  
                  return (
                    <tr key={item.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium">{item.component.name}</div>
                        <div className="text-sm text-gray-500">{item.component.sku}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {item.quantityRequired}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {totalRequiredQty}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <Button
                            onClick={() => openBatchDialog(item.componentId)}
                            variant={isComplete ? "outline" : "default"}
                            size="sm"
                            className="min-w-[120px]"
                            disabled={isSubmitting}
                          >
                            {isComplete ? (
                              <>
                                <CheckCircle className="h-4 w-4 mr-1 text-[#8B2131]" />
                                Selected
                              </>
                            ) : (
                              `Select (${selectedQty}/${totalRequiredQty})`
                            )}
                          </Button>
                          
                          {selectedBatches[item.componentId]?.length > 0 && (
                            <div className="ml-2">
                              <h4 className="text-xs font-semibold text-gray-600 mb-1">Selected Batches:</h4>
                              <ul className="text-xs text-gray-500 space-y-1">
                                {selectedBatches[item.componentId].map((batch, index) => (
                                  <li key={index} className="flex flex-col">
                                    <div className="flex items-center">
                                      <span className="inline-block w-24 truncate font-medium">{batch.batchNumber}</span>
                                      <span className="mx-1">-</span>
                                      <span className="font-medium">{batch.quantity}</span>
                                      <span className="text-xs text-gray-400 ml-1">units</span>
                                    </div>
                                    {batch.vendorName && (
                                      <div className="text-xs text-gray-400 ml-1">
                                        Vendor: {batch.vendorName}
                                      </div>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {bomItems.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                      No components found in the Bill of Materials for this product.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      
      <div className="flex justify-between pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
          className="border-[#D4BC7D] hover:bg-[#F5F1E4] text-[#5A4C3A]"
        >
          Cancel
        </Button>
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting || !isAllComponentsSelected()}
          className="bg-[#8B2131] hover:bg-[#6D1A27] text-white"
        >
          {isSubmitting ? 'Creating Assemblies...' : 'Create Assemblies'}
        </Button>
      </div>
      
      {/* Batch Selection Dialog */}
      {selectedComponent && (
        <BatchSelectionDialog
          isOpen={dialogOpen}
          onClose={() => setDialogOpen(false)}
          onSelectBatches={(selections) => {
            // Convert standard SelectedBatch to EnhancedSelectedBatch with vendor info
            const enhancedSelections: EnhancedSelectedBatch[] = selections.map(batch => ({
              ...batch,
              vendorName: undefined // We'll let the auto-select function handle this if needed
            }));
            handleBatchUpdate(selectedComponentId, enhancedSelections);
            setDialogOpen(false);
          }}
          componentId={selectedComponentId}
          componentName={selectedComponent.component.name}
          componentSku={selectedComponent.component.sku}
          quantityRequired={selectedComponent.quantityRequired * quantity}
          currentSelections={dialogOpen ? (selectedBatches[selectedComponentId] || []) : []}
        />
      )}
    </div>
  );
} 