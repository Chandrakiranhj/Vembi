"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface StockBatch {
  id: string;
  batchNumber: string;
  currentQuantity: number;
  dateReceived: string;
  vendor: {
    id: string;
    name: string;
  };
}

// Interface for selected batch data that gets passed back to parent
export interface SelectedBatch {
  batchId: string;
  batchNumber: string;
  quantity: number;
}

interface BatchSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectBatches: (selections: SelectedBatch[]) => void;
  componentId: string;
  componentName: string;
  componentSku: string;
  quantityRequired: number;
  currentSelections: SelectedBatch[];
}

export default function BatchSelectionDialog({
  isOpen,
  onClose,
  onSelectBatches,
  componentId,
  componentName,
  componentSku,
  quantityRequired,
  currentSelections,
}: BatchSelectionDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [batches, setBatches] = useState<StockBatch[]>([]);
  const [filteredBatches, setFilteredBatches] = useState<StockBatch[]>([]);
  const [selections, setSelections] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [filterText, setFilterText] = useState("");

  // Calculate the total quantity selected
  const totalSelected = Object.values(selections).reduce(
    (sum, qty) => sum + qty,
    0
  );

  // Initialize selections from props when dialog opens
  useEffect(() => {
    if (isOpen) {
      console.log('[BatchSelectionDialog] Dialog opened for componentId:', componentId);
      // Convert currentSelections array to Record<batchId, quantity>
      const initialSelections = currentSelections.reduce(
        (acc, { batchId, quantity }) => {
          acc[batchId] = quantity;
          return acc;
        },
        {} as Record<string, number>
      );
      setSelections(initialSelections);
      setFilterText("");
      fetchBatches();
    }
  }, [isOpen, componentId]);

  // Apply filters whenever batches or filter text changes
  useEffect(() => {
    if (filterText.trim() === "") {
      setFilteredBatches(batches);
      return;
    }

    const normalizedFilter = filterText.trim().toLowerCase();
    const filtered = batches.filter(
      batch => 
        batch.batchNumber.toLowerCase().includes(normalizedFilter) || 
        batch.vendor?.name.toLowerCase().includes(normalizedFilter)
    );
    
    setFilteredBatches(filtered);
  }, [batches, filterText]);

  // Fetch available batches for this component
  const fetchBatches = async () => {
    console.log(`[BatchSelectionDialog] Fetching batches for componentId: ${componentId}`);
    setIsLoading(true);
    setError("");
    try {
      // First check database connectivity through the health endpoint
      const healthCheck = await fetch('/api/health');
      if (!healthCheck.ok) {
        const healthData = await healthCheck.json().catch(() => ({}));
        console.error('[BatchSelectionDialog] Database health check failed:', healthData);
        throw new Error('Database connectivity issue. Please try again later.');
      }
      
      // Add timestamp to prevent caching
      const timestamp = new Date().getTime();
      const response = await fetch(
        `/api/batches?componentId=${componentId}&_t=${timestamp}`
      );
      
      console.log(`[BatchSelectionDialog] API response status for ${componentId}: ${response.status}`);
      
      if (!response.ok) {
        let errorMsg = "Failed to fetch batches";
        let errorDetails = "";
        
        try {
          const errorData = await response.json();
          console.error("[BatchSelectionDialog] API error data:", errorData);
          errorMsg = errorData.error || `HTTP error! status: ${response.status}`;
          errorDetails = JSON.stringify(errorData);
        } catch (jsonError) {
          errorMsg = `HTTP error! status: ${response.status}`; // Fallback if JSON parsing fails
          console.error("[BatchSelectionDialog] Failed to parse error JSON:", jsonError);
        }
        
        // Log detailed error information
        console.error(`[BatchSelectionDialog] API error details - Status: ${response.status}, Message: ${errorMsg}, Details: ${errorDetails}`);
        throw new Error(errorMsg);
      }
      
      const data = await response.json();
      console.log(`[BatchSelectionDialog] Received ${data.length} batches for ${componentId}:`, data);
      
      if (data.length === 0) {
        console.log(`[BatchSelectionDialog] No batches available for component ${componentId}`);
        setError("No batches are available for this component. Please add batches to inventory first.");
      }
      
      setBatches(data);
      setFilteredBatches(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred";
      console.error("[BatchSelectionDialog] Error in fetchBatches:", errorMessage, err);
      setError(`Failed to load batches: ${errorMessage}. Please try again.`);
      toast.error("Failed to load batches", { description: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle quantity change for a batch
  const handleQuantityChange = (batchId: string, value: string) => {
    const quantity = parseInt(value, 10) || 0;
    
    // Don't allow negative values
    if (quantity < 0) return;
    
    // Don't allow selecting more than what's available in this batch
    const batch = batches.find((b) => b.id === batchId);
    if (batch && quantity > batch.currentQuantity) return;
    
    setSelections((prev) => {
      // If quantity is 0, remove this batch from selections
      if (quantity === 0) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { [batchId]: removed, ...rest } = prev;
        return rest;
      }
      return { ...prev, [batchId]: quantity };
    });
  };

  // Auto-assign quantities to batches
  const handleAutoAssign = () => {
    if (batches.length === 0) return;
    
    // Reset selections
    const newSelections: Record<string, number> = {};
    let remaining = quantityRequired;
    
    // Sort batches by date (oldest first)
    const sortedBatches = [...batches].sort((a, b) => 
      new Date(a.dateReceived).getTime() - new Date(b.dateReceived).getTime()
    );
    
    // Distribute quantities
    for (const batch of sortedBatches) {
      if (remaining <= 0) break;
      
      const toUse = Math.min(batch.currentQuantity, remaining);
      newSelections[batch.id] = toUse;
      remaining -= toUse;
    }
    
    if (remaining > 0) {
      setError(`Could not assign all quantities. Still need ${remaining} more.`);
    } else {
      setError('');
    }
    
    setSelections(newSelections);
  };

  // Handle save button click
  const handleSave = () => {
    // Validate total quantity matches requirement
    if (totalSelected !== quantityRequired) {
      setError(
        `Total selected quantity (${totalSelected}) must equal required quantity (${quantityRequired})`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      // Format selections for parent component
      const formattedSelections: SelectedBatch[] = Object.entries(selections)
        .filter(([, qty]) => qty > 0)
        .map(([batchId, quantity]) => {
          const batch = batches.find((b) => b.id === batchId);
          return {
            batchId,
            batchNumber: batch?.batchNumber || "Unknown",
            quantity,
          };
        });

      onSelectBatches(formattedSelections);
      onClose();
    } catch (err) {
      console.error("Error saving batch selections:", err);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md md:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            Select Batches for {componentName} ({componentSku})
          </DialogTitle>
        </DialogHeader>

        {error && (
          <div className="bg-red-50 p-3 rounded-md mb-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <div className="space-y-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">
              Required: {quantityRequired}
            </span>
            <span
              className={`text-sm font-medium ${
                totalSelected === quantityRequired
                  ? "text-green-600"
                  : totalSelected > quantityRequired
                  ? "text-red-600"
                  : "text-blue-600"
              }`}
            >
              Selected: {totalSelected}
            </span>
          </div>

          {totalSelected !== quantityRequired && (
            <div className={`p-3 rounded-md mb-4 ${totalSelected > quantityRequired ? 'bg-red-50' : 'bg-blue-50'}`}>
              <p className={`text-sm ${totalSelected > quantityRequired ? 'text-red-800' : 'text-blue-800'}`}>
                {totalSelected > quantityRequired 
                  ? `You have selected ${totalSelected - quantityRequired} more than required.` 
                  : `You need to select ${quantityRequired - totalSelected} more.`}
              </p>
            </div>
          )}

          {!isLoading && batches.length > 0 && (
            <div className="space-y-4 mb-4">
              <div className="flex space-x-2">
                <Input
                  type="text"
                  placeholder="Filter by batch number or vendor..."
                  value={filterText}
                  onChange={(e) => setFilterText(e.target.value)}
                  className="flex-1"
                />
                <Button 
                  type="button" 
                  onClick={() => setFilterText("")}
                  variant="outline"
                  disabled={!filterText}
                >
                  Clear
                </Button>
              </div>
              
              <Button 
                type="button" 
                onClick={handleAutoAssign} 
                disabled={isSubmitting}
                variant="outline"
                className="w-full"
              >
                Auto-Assign Quantities (Oldest First)
              </Button>
            </div>
          )}

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
            </div>
          ) : batches.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="text-lg font-medium mb-2">No batches available for this component</div>
              <p className="text-sm text-gray-500 mb-4">
                There are no stock batches available for {componentName} ({componentSku}).
                Please ensure:
              </p>
              <ul className="text-sm text-left text-gray-600 mx-auto w-fit">
                <li className="mb-1">• Component has been added to inventory</li>
                <li className="mb-1">• Batches have been received and recorded</li>
                <li className="mb-1">• Batches have not been depleted</li>
              </ul>
              <Button 
                onClick={fetchBatches}
                variant="outline"
                size="sm"
                className="mt-4"
              >
                Refresh
              </Button>
            </div>
          ) : filteredBatches.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No batches matching your filter.
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <table className="min-w-full divide-y divide-gray-200 table-fixed">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[150px]"
                    >
                      Batch Number
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[80px]"
                    >
                      Available
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[200px]"
                    >
                      Vendor
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[100px]"
                    >
                      Received
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[100px]"
                    >
                      Quantity
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredBatches.map((batch) => (
                    <tr key={batch.id}>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 truncate">
                        {batch.batchNumber}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        {batch.currentQuantity}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 truncate">
                        {batch.vendor?.name || "Unknown"}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(batch.dateReceived).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        <Input
                          type="number"
                          min="0"
                          max={batch.currentQuantity}
                          value={selections[batch.id] || ""}
                          onChange={(e) =>
                            handleQuantityChange(batch.id, e.target.value)
                          }
                          className="w-24"
                          disabled={isSubmitting}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <DialogFooter className="sm:justify-between">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isSubmitting}
            type="button"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={
              isSubmitting ||
              isLoading ||
              totalSelected !== quantityRequired ||
              batches.length === 0
            }
            type="button"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Selection"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 