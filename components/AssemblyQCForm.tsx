"use client";

import { useState, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea'; // Assuming Textarea is available
import { Button } from '@/components/ui/button'; // Assuming Button is available
import { toast } from 'sonner'; // Import toast
import BatchSelectionDialog, { SelectedBatch as BatchSelectionBatch } from "@/components/BatchSelectionDialog";
import { Package, ClipboardList, AlertTriangle } from 'lucide-react';

// Interface for BOM data from props (matches API response)
interface BomItem {
  id: string; // This is ProductComponent ID
  productId: string;
  componentId: string;
  quantityRequired: number;
  component: {
    id: string; // This is Component ID
    name: string;
    sku: string;
    category: string;
    currentQuantity: number;
  };
}

// Interface for selected batch data - use the imported type to ensure compatibility
type SelectedBatch = BatchSelectionBatch;

// Type for the state holding selected batches per component
type SelectedBatchesState = Record<string, SelectedBatch[]>; // Key is componentId

// Define the specific structure expected by the onSubmit prop for now
// This will evolve as batch selection is fully implemented
interface QCSubmitData {
  status: 'IN_PROGRESS' | 'PASSED_QC' | 'FAILED_QC' | 'SHIPPED';
  notes?: string;
  components: { 
    componentId: string; 
    quantityUsed: number; 
    selectedBatches?: { batchId: string; quantity: number }[];
  }[]; 
}

// Interface for form props
interface AssemblyQCFormProps {
  bomItems: BomItem[]; // Changed from components
  status: 'IN_PROGRESS' | 'PASSED_QC' | 'FAILED_QC' | 'SHIPPED';
  notes?: string;
  onSubmit: (data: QCSubmitData) => void; // Use the specific type
  onCancel: () => void;
  isSubmitting: boolean;
}

export default function AssemblyQCForm({
  bomItems, // Changed from components
  status,
  notes = '',
  onSubmit,
  onCancel,
  isSubmitting
}: AssemblyQCFormProps) {
  // State for overall assembly status and notes
  const [formNotes, setFormNotes] = useState(notes);
  const [formStatus, setFormStatus] = useState<'IN_PROGRESS' | 'PASSED_QC' | 'FAILED_QC' | 'SHIPPED'>(status);
  const [errors, setErrors] = useState<Record<string, string>>({});
  // State to manage selected batches for each bomItem (componentId is the key)
  const [selectedBatches, setSelectedBatches] = useState<SelectedBatchesState>({});
  
  // Batch Selection Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedComponentId, setSelectedComponentId] = useState<string>("");
  const [selectedComponent, setSelectedComponent] = useState<BomItem | null>(null);

  // Initialize form state from props
  useEffect(() => {
    setFormNotes(notes || '');
    setFormStatus(status);
    // Reset selected batches when props change (e.g., navigating between assemblies)
    setSelectedBatches({}); 
  }, [notes, status, bomItems]); // Depend on bomItems too for reset

  // Batch selection dialog handlers
  const openBatchDialog = (componentId: string) => {
    const component = bomItems.find(item => item.componentId === componentId);
    if (component) {
      setSelectedComponentId(componentId);
      setSelectedComponent(component);
      setDialogOpen(true);
    }
  };

  const handleBatchUpdate = (componentId: string, selections: SelectedBatch[]) => {
      setSelectedBatches(prev => ({
          ...prev,
          [componentId]: selections
      }));
      if (errors[`batches_${componentId}`]) {
           setErrors(prev => {
               const newErrors = { ...prev };
               delete newErrors[`batches_${componentId}`];
               return newErrors;
           });
      }
  };

  // Validate the form (basic validation for now)
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    // Validation: If status is changing to a completed state, ensure batches are selected for all required components
    if ((formStatus === 'PASSED_QC' || formStatus === 'FAILED_QC')) {
        bomItems.forEach(item => {
            const selections = selectedBatches[item.componentId] || [];
            const totalSelected = selections.reduce((sum, batch) => sum + batch.quantity, 0);
            
            if (totalSelected !== item.quantityRequired) {
                newErrors[`batches_${item.componentId}`] = `Must select batches totaling ${item.quantityRequired} units for ${item.component.name}. Selected: ${totalSelected}.`;
            }
        });
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error("Validation failed. Please check batch selections."); 
      return;
    }
    
    const data: QCSubmitData = {
      status: formStatus,
      notes: formNotes || undefined,
      components: bomItems.map(item => ({
        componentId: item.componentId,
        quantityUsed: item.quantityRequired, 
        selectedBatches: selectedBatches[item.componentId]?.map(b => ({ 
            batchId: b.batchId,
            quantity: b.quantity
        })) || []
      }))
    };
    
    onSubmit(data); // Pass the correctly typed data
  };

  // Calculate overall progress based on batch selection (simple version)
  const requiredComponentsCount = bomItems.length;
  const componentsWithBatchesSelected = Object.keys(selectedBatches).filter(compId => {
       const selections = selectedBatches[compId] || [];
       const bomItem = bomItems.find(item => item.componentId === compId);
       const totalSelected = selections.reduce((sum, batch) => sum + batch.quantity, 0);
       return bomItem && totalSelected === bomItem.quantityRequired;
  }).length;

  const progress = requiredComponentsCount > 0 
    ? Math.round((componentsWithBatchesSelected / requiredComponentsCount) * 100) 
    : 0;

  // Helper function to get status-specific classes
  const getStatusClasses = (status: string) => {
    switch(status) {
      case 'PASSED_QC':
        return { 
          bg: 'bg-gradient-to-r from-emerald-600 to-teal-600',
          text: 'text-emerald-700', 
          option: 'bg-emerald-50 text-emerald-700' 
        };
      case 'FAILED_QC':
        return { 
          bg: 'bg-gradient-to-r from-rose-600 to-red-600',
          text: 'text-rose-700', 
          option: 'bg-rose-50 text-rose-700' 
        };
      case 'SHIPPED':
        return { 
          bg: 'bg-gradient-to-r from-purple-600 to-fuchsia-600',
          text: 'text-purple-700', 
          option: 'bg-purple-50 text-purple-700' 
        };
      default: // IN_PROGRESS
        return { 
          bg: 'bg-gradient-to-r from-blue-600 to-indigo-600',
          text: 'text-blue-700', 
          option: 'bg-blue-50 text-blue-700' 
        };
    }
  };

  return (
    <>
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Progress Bar based on batch selection */}
      <div className="relative pt-1">
        <div className="text-sm font-medium mb-1 flex justify-between items-center">
          <span className="flex items-center text-blue-700">
            <ClipboardList className="h-4 w-4 mr-1 text-blue-500" />
            Component Batches
          </span>
          <span className="text-sm text-gray-600">
            {componentsWithBatchesSelected} of {requiredComponentsCount} assigned ({progress}%)
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
            className={`h-2 rounded-full ${progress === 100 
              ? 'bg-gradient-to-r from-emerald-500 to-teal-500' 
              : 'bg-gradient-to-r from-blue-500 to-indigo-500'}`}
            style={{ width: `${progress}%`, transition: 'width 0.5s ease-in-out' }}
        ></div>
        </div>
      </div>
      
      {/* Display general form errors (optional) */}
      {Object.keys(errors).length > 0 && !Object.keys(errors).some(k => k.startsWith('batches_')) && (
        <div className="bg-gradient-to-r from-red-50 to-rose-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
            <p className="text-sm text-red-700">Please resolve the errors below.</p>
          </div>
        </div>
      )}
      
      {/* Status Selection & Notes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Assembly Status</label>
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-md filter blur-sm opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <select
              value={formStatus}
              onChange={(e) => setFormStatus(e.target.value as 'IN_PROGRESS' | 'PASSED_QC' | 'FAILED_QC' | 'SHIPPED')}
              className="w-full bg-white border border-gray-200 rounded-md py-2 px-3 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
              disabled={isSubmitting}
            >
              <option value="IN_PROGRESS" className="bg-blue-50 text-blue-700">In Progress</option>
              <option value="PASSED_QC" className="bg-emerald-50 text-emerald-700">Passed QC</option>
              <option value="FAILED_QC" className="bg-rose-50 text-rose-700">Failed QC</option>
              <option value="SHIPPED" className="bg-purple-50 text-purple-700">Shipped</option>
            </select>
          </div>
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-md filter blur-sm opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <Textarea
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              disabled={isSubmitting}
              placeholder="Add any notes about this assembly..."
              className="w-full min-h-[80px] bg-white border border-gray-200 rounded-md py-2 px-3 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
            />
          </div>
        </div>
      </div>
      
      {/* Components Table (Now based on BOM) */}
      <div className="overflow-x-auto border rounded-lg border-gray-200 shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gradient-to-r from-blue-50 to-indigo-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-blue-900 uppercase tracking-wider">
                Required Component
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-blue-900 uppercase tracking-wider">
                Qty. Required
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-blue-900 uppercase tracking-wider">
                Stock Available
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-blue-900 uppercase tracking-wider">
                Selected Batches
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {bomItems.map((item) => {
              const componentErrors = errors[`batches_${item.componentId}`];
              const currentSelections = selectedBatches[item.componentId] || [];
              const totalSelectedQuantity = currentSelections.reduce((sum, batch) => sum + batch.quantity, 0);
              const isSelectionComplete = totalSelectedQuantity === item.quantityRequired;

              return (
              <tr key={item.id} className="hover:bg-gradient-to-r hover:from-blue-50/30 hover:to-indigo-50/30 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <Package className="h-4 w-4 text-blue-500 mr-2" />
                    <div>
                      <div className="text-sm font-medium text-gray-900">{item.component.name}</div>
                      <div className="text-xs text-gray-500">{item.component.sku}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs">{item.quantityRequired}</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className={`text-sm font-medium ${item.component.currentQuantity < item.quantityRequired ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {item.component.currentQuantity}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {/* Batch Selection Button/UI */}
                  <div className="flex flex-col space-y-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                      onClick={() => openBatchDialog(item.componentId)}
                    disabled={isSubmitting} 
                      className={`text-sm ${
                        isSelectionComplete 
                          ? 'border-emerald-200 text-emerald-700 hover:bg-emerald-50 bg-emerald-50/50' 
                          : 'border-blue-200 text-blue-700 hover:bg-blue-50'
                      }`}
                  >
                      {currentSelections.length > 0 
                        ? `${totalSelectedQuantity} units from ${currentSelections.length} batch${currentSelections.length !== 1 ? 'es' : ''}` 
                        : 'Select Batches'}
                  </Button>
                    
                    {componentErrors && (
                      <p className="text-xs text-rose-600">{componentErrors}</p>
                    )}
                    
                    {currentSelections.length > 0 && (
                      <div className="text-xs text-gray-500">
                        {currentSelections.map(batch => (
                          <div key={batch.batchId} className="truncate">
                            Batch #{batch.batchNumber}: {batch.quantity} units
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </td>
              </tr>
             ); 
            })}
          </tbody>
        </table>
      </div>
      
      {/* Form Actions */}
      <div className="flex justify-end space-x-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
          className="border-gray-200 text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting || requiredComponentsCount === 0}
          className={`${getStatusClasses(formStatus).bg} text-white transition-all duration-300`}
        >
          {isSubmitting ? 'Updating...' : `Save as ${formStatus.replace('_', ' ')}`}
        </Button>
      </div>
    </form>
    
    {selectedComponent && (
      <BatchSelectionDialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        componentId={selectedComponentId}
        componentName={selectedComponent.component.name}
        componentSku={selectedComponent.component.sku}
        quantityRequired={selectedComponent.quantityRequired}
        onSelectBatches={(selections) => {
          handleBatchUpdate(selectedComponentId, selections);
          setDialogOpen(false);
        }}
        currentSelections={selectedBatches[selectedComponentId] || []}
      />
    )}
    </>
  );
} 