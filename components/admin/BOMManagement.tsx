'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  modelNumber: string;
}

interface Component {
  id: string;
  name: string;
  sku: string;
}

interface BOMItem {
  componentId: string;
  quantityRequired: number;
}

export function BOMManagement() {
  const [products, setProducts] = useState<Product[]>([]);
  const [components, setComponents] = useState<Component[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [bomItems, setBomItems] = useState<BOMItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [productsRes, componentsRes] = await Promise.all([
          fetch('/api/products'),
          fetch('/api/components'),
        ]);

        if (!productsRes.ok || !componentsRes.ok) {
          throw new Error('Failed to fetch data');
        }

        const productsData = await productsRes.json();
        const componentsData = await componentsRes.json();

        setProducts(productsData);
        setComponents(componentsData);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleAddBOMItem = () => {
    setBomItems([...bomItems, { componentId: '', quantityRequired: 1 }]);
  };

  const handleRemoveBOMItem = (index: number) => {
    setBomItems(bomItems.filter((_, i) => i !== index));
  };

  const handleBOMItemChange = (index: number, field: keyof BOMItem, value: string | number) => {
    const newBomItems = [...bomItems];
    newBomItems[index] = {
      ...newBomItems[index],
      [field]: value,
    };
    setBomItems(newBomItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) {
      toast.error('Please select a product');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/products/${selectedProduct}/components`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bomItems),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update BOM');
      }

      toast.success('BOM updated successfully');
      setBomItems([]);
      setSelectedProduct('');
    } catch (error) {
      console.error('Error updating BOM:', error);
      toast.error('Failed to update BOM', {
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Manage Product BOM</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="product">Select Product</Label>
              <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a product" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name} ({product.modelNumber})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4">
              {bomItems.map((item, index) => (
                <div key={index} className="flex items-end gap-4">
                  <div className="flex-1 space-y-2">
                    <Label>Component</Label>
                    <Select
                      value={item.componentId}
                      onValueChange={(value) => handleBOMItemChange(index, 'componentId', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a component" />
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
                  <div className="w-32 space-y-2">
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      min="1"
                      value={item.quantityRequired}
                      onChange={(e) => handleBOMItemChange(index, 'quantityRequired', parseInt(e.target.value))}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleRemoveBOMItem(index)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleAddBOMItem}
              >
                Add Component
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save BOM'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
} 