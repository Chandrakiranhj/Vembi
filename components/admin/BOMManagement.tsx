'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, Plus, X, Save, Edit, Trash2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogTrigger 
} from "@/components/ui/dialog";

interface Product {
  id: string;
  name: string;
  modelNumber: string;
}

interface Component {
  id: string;
  name: string;
  sku: string;
  category?: string;
}

interface BOMItem {
  id?: string;
  productId?: string;
  componentId: string;
  quantityRequired: number;
  component?: Component;
  isNew?: boolean;
}

export function BOMManagement() {
  const [products, setProducts] = useState<Product[]>([]);
  const [components, setComponents] = useState<Component[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [existingBOM, setExistingBOM] = useState<BOMItem[]>([]);
  const [newComponents, setNewComponents] = useState<BOMItem[]>([]);
  const [selectedComponent, setSelectedComponent] = useState<string>('');
  const [quantityToAdd, setQuantityToAdd] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingBOM, setIsLoadingBOM] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editMode, setEditMode] = useState<{[key: string]: boolean}>({});
  const [dialogOpen, setDialogOpen] = useState(false);

  // Fetch products and components on mount
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

  // Fetch BOM when product is selected
  useEffect(() => {
    if (selectedProduct) {
      fetchProductBOM(selectedProduct);
    } else {
      setExistingBOM([]);
      setNewComponents([]);
    }
  }, [selectedProduct]);

  const fetchProductBOM = async (productId: string) => {
    setIsLoadingBOM(true);
    try {
      const response = await fetch(`/api/products/${productId}/components`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch product BOM');
      }
      
      const data = await response.json();
      setExistingBOM(data);
      setNewComponents([]);
      setEditMode({});
    } catch (error) {
      console.error('Error fetching product BOM:', error);
      toast.error('Failed to load product BOM');
    } finally {
      setIsLoadingBOM(false);
    }
  };

  const handleAddComponent = () => {
    if (!selectedComponent || quantityToAdd < 1) {
      toast.error('Please select a component and valid quantity');
      return;
    }

    // Check if component already exists in existing BOM
    if (existingBOM.some(item => item.componentId === selectedComponent)) {
      toast.error('This component is already in the BOM');
      return;
    }

    // Check if component already exists in new components
    if (newComponents.some(item => item.componentId === selectedComponent)) {
      toast.error('This component is already in the new components list');
      return;
    }

    const componentData = components.find(c => c.id === selectedComponent);
    if (!componentData) {
      toast.error('Component not found');
      return;
    }

    setNewComponents([
      ...newComponents, 
      { 
        componentId: selectedComponent, 
        quantityRequired: quantityToAdd,
        component: componentData,
        isNew: true 
      }
    ]);
    
    setSelectedComponent('');
    setQuantityToAdd(1);
    setDialogOpen(false);
  };

  const handleRemoveNewComponent = (index: number) => {
    setNewComponents(newComponents.filter((_, i) => i !== index));
  };

  const handleQuantityChange = (componentId: string, newQuantity: number, isExisting: boolean) => {
    if (newQuantity < 1) {
      toast.error('Quantity must be at least 1');
      return;
    }

    if (isExisting) {
      setExistingBOM(existingBOM.map(item => 
        item.componentId === componentId 
          ? { ...item, quantityRequired: newQuantity } 
          : item
      ));
    } else {
      setNewComponents(newComponents.map(item => 
        item.componentId === componentId 
          ? { ...item, quantityRequired: newQuantity } 
          : item
      ));
    }
  };

  const toggleEditMode = (componentId: string) => {
    setEditMode({
      ...editMode,
      [componentId]: !editMode[componentId]
    });
  };

  const handleRemoveExistingComponent = (componentId: string) => {
    setExistingBOM(existingBOM.filter(item => item.componentId !== componentId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) {
      toast.error('Please select a product');
      return;
    }

    setIsSubmitting(true);

    try {
      // Combine existing (modified) BOM with new components
      const updatedBOM = [
        ...existingBOM.map(item => ({
          componentId: item.componentId,
          quantityRequired: item.quantityRequired
        })),
        ...newComponents.map(item => ({
          componentId: item.componentId,
          quantityRequired: item.quantityRequired
        }))
      ];

      const response = await fetch(`/api/products/${selectedProduct}/components`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedBOM),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update BOM');
      }

      toast.success('BOM updated successfully');
      
      // Refresh the BOM data
      await fetchProductBOM(selectedProduct);
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
          <CardDescription>
            View and edit the bill of materials for products. Changes will affect assembly and inventory calculations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
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

            {selectedProduct && (
              <>
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">Bill of Materials</h3>
                  <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Plus className="h-4 w-4 mr-1" />
                        Add Component
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Component to BOM</DialogTitle>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                          <Label>Component</Label>
                          <Select value={selectedComponent} onValueChange={setSelectedComponent}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a component" />
                            </SelectTrigger>
                            <SelectContent>
                              {components
                                .filter(component => 
                                  !existingBOM.some(item => item.componentId === component.id) &&
                                  !newComponents.some(item => item.componentId === component.id)
                                )
                                .map((component) => (
                                  <SelectItem key={component.id} value={component.id}>
                                    {component.name} ({component.sku})
                                  </SelectItem>
                                ))
                              }
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Quantity Required</Label>
                          <Input 
                            type="number" 
                            min="1"
                            value={quantityToAdd}
                            onChange={(e) => setQuantityToAdd(parseInt(e.target.value) || 1)}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button onClick={handleAddComponent}>Add to BOM</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>

                {isLoadingBOM ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
                  </div>
                ) : (
                  <div className="border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Component</TableHead>
                          <TableHead>SKU</TableHead>
                          <TableHead className="w-[150px]">Quantity Required</TableHead>
                          <TableHead className="w-[100px] text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {existingBOM.length === 0 && newComponents.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center py-4 text-gray-500">
                              No components in this product&apos;s BOM. Add components using the button above.
                            </TableCell>
                          </TableRow>
                        ) : (
                          <>
                            {existingBOM.map((item) => (
                              <TableRow key={item.componentId}>
                                <TableCell>{item.component?.name}</TableCell>
                                <TableCell>{item.component?.sku}</TableCell>
                                <TableCell>
                                  {editMode[item.componentId] ? (
                                    <Input
                                      type="number"
                                      min="1"
                                      value={item.quantityRequired}
                                      onChange={(e) => handleQuantityChange(
                                        item.componentId, 
                                        parseInt(e.target.value) || 1,
                                        true
                                      )}
                                      className="w-20"
                                    />
                                  ) : (
                                    <span>{item.quantityRequired}</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex justify-end gap-2">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => toggleEditMode(item.componentId)}
                                    >
                                      {editMode[item.componentId] ? (
                                        <Save className="h-4 w-4 text-green-600" />
                                      ) : (
                                        <Edit className="h-4 w-4" />
                                      )}
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleRemoveExistingComponent(item.componentId)}
                                    >
                                      <Trash2 className="h-4 w-4 text-red-500" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                            {newComponents.map((item, index) => (
                              <TableRow key={`new-${index}`} className="bg-green-50">
                                <TableCell>{item.component?.name}</TableCell>
                                <TableCell>{item.component?.sku}</TableCell>
                                <TableCell>
                                  <Input
                                    type="number"
                                    min="1"
                                    value={item.quantityRequired}
                                    onChange={(e) => handleQuantityChange(
                                      item.componentId,
                                      parseInt(e.target.value) || 1,
                                      false
                                    )}
                                    className="w-20"
                                  />
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleRemoveNewComponent(index)}
                                  >
                                    <X className="h-4 w-4 text-red-500" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}

                <Button 
                  onClick={handleSubmit} 
                  disabled={isSubmitting || (existingBOM.length === 0 && newComponents.length === 0)}
                  className="w-full sm:w-auto"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving Changes...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 