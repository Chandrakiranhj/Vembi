import React, { useState } from 'react';
import { useProducts, Product } from '@/lib/hooks/useProducts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle } from 'lucide-react';

// Data structure expected by the parent onSubmit handler
export interface AssemblyFormData {
  productId: string;
  quantity: number;
  startSerialNumber: string;
  funder: string;
}

interface AssemblyFormProps {
  initialData?: Partial<AssemblyFormData>;
  onSubmit: (data: AssemblyFormData) => Promise<void>; // Make onSubmit async
  onCancel: () => void;
  isSubmitting: boolean;
}

export default function AssemblyForm({
  initialData = {},
  onSubmit,
  onCancel,
  isSubmitting
}: AssemblyFormProps) {
  const [formData, setFormData] = useState<Partial<AssemblyFormData>>({
    productId: initialData.productId || '',
    quantity: initialData.quantity || 1,
    startSerialNumber: initialData.startSerialNumber || '',
    funder: initialData.funder || '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch products for the dropdown
  const { products, isLoading: productsLoading, error: productsError } = useProducts();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    const parsedValue = type === 'number' ? parseInt(value, 10) || 1 : value;

    setFormData(prev => ({ ...prev, [name]: parsedValue }));
    // Clear error for the field being changed
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSelectChange = (value: string) => {
    setFormData(prev => ({ ...prev, productId: value }));
    if (errors.productId) {
      setErrors(prev => ({ ...prev, productId: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.productId) {
      newErrors.productId = 'Product selection is required.';
    }
    if (!formData.quantity || formData.quantity <= 0) {
      newErrors.quantity = 'Quantity must be a positive number.';
    }
    if (!formData.startSerialNumber?.trim()) {
      newErrors.startSerialNumber = 'Starting serial number is required.';
    }
    if (!formData.funder?.trim()) {
      newErrors.funder = 'Funder information is required.';
    }
    // Add more validation if needed (e.g., serial number format check)

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }
    // Ensure required fields are present before submitting
    if (formData.productId && formData.quantity && formData.startSerialNumber && formData.funder) {
      await onSubmit({
        productId: formData.productId,
        quantity: formData.quantity,
        startSerialNumber: formData.startSerialNumber,
        funder: formData.funder,
      });
    } else {
        // This case should ideally be caught by validateForm
        console.error('Missing required fields in form submission.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Product Selection */}
      <div>
        <label htmlFor="productId" className="block text-sm font-medium text-gray-700 mb-1">
          Product <span className="text-red-500">*</span>
        </label>
        {productsLoading ? (
          <Skeleton className="h-10 w-full" />
        ) : productsError ? (
           <div className="flex items-center text-sm text-red-600">
              <AlertCircle className="h-4 w-4 mr-1" /> Error loading products: {productsError}
           </div>
        ) : (
          <Select
            value={formData.productId || ''}
            onValueChange={handleSelectChange}
            disabled={isSubmitting}
          >
            <SelectTrigger id="productId" className="w-full">
              <SelectValue placeholder="Select a product..." />
            </SelectTrigger>
            <SelectContent>
              {products.map((product: Product) => (
                <SelectItem key={product.id} value={product.id}>
                  {product.name} ({product.modelNumber})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {errors.productId && <p className="mt-1 text-sm text-red-600">{errors.productId}</p>}
      </div>

      {/* Quantity */}
      <div>
        <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-1">
          Quantity to Assemble <span className="text-red-500">*</span>
        </label>
        <Input
          id="quantity"
          name="quantity"
          type="number"
          min="1"
          value={formData.quantity || 1}
          onChange={handleChange}
          placeholder="e.g., 5"
          className="w-full"
          disabled={isSubmitting}
        />
        {errors.quantity && <p className="mt-1 text-sm text-red-600">{errors.quantity}</p>}
      </div>

      {/* Starting Serial Number */}
      <div>
        <label htmlFor="startSerialNumber" className="block text-sm font-medium text-gray-700 mb-1">
          Starting Serial Number <span className="text-red-500">*</span>
        </label>
        <Input
          id="startSerialNumber"
          name="startSerialNumber"
          type="text"
          value={formData.startSerialNumber || ''}
          onChange={handleChange}
          placeholder="Enter first serial number (e.g., H101)"
          className="w-full"
          disabled={isSubmitting}
        />
        {errors.startSerialNumber && <p className="mt-1 text-sm text-red-600">{errors.startSerialNumber}</p>}
      </div>

      {/* Funder */}
      <div>
        <label htmlFor="funder" className="block text-sm font-medium text-gray-700 mb-1">
          Funder <span className="text-red-500">*</span>
        </label>
        <Input
          id="funder"
          name="funder"
          type="text"
          value={formData.funder || ''}
          onChange={handleChange}
          placeholder="Enter funder information"
          className="w-full"
          disabled={isSubmitting}
        />
        {errors.funder && <p className="mt-1 text-sm text-red-600">{errors.funder}</p>}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting || productsLoading || !!productsError}
        >
          {isSubmitting ? 'Creating Assemblies...' : 'Create Assemblies'}
        </Button>
      </div>
    </form>
  );
} 