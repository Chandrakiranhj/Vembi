'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import { AlertCircle, Plus, Trash2, Edit } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  modelNumber: string;
}

interface Component {
  id: string;
  name: string;
  sku: string;
  category: string;
}

interface ProductComponent {
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

interface ComponentFormData {
  name: string;
  sku: string;
  description: string;
  category: string;
  minimumQuantity: number;
}

interface BOMFormData {
  productId: string;
  componentId: string;
  quantityRequired: number;
}

interface AdminBOMManagementClientProps {
  products: Product[];
  components: Component[];
  isAdmin: boolean;
}

export default function AdminBOMManagementClient({
  products,
  components: initialComponents,
  isAdmin
}: AdminBOMManagementClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('bom');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [bomItems, setBomItems] = useState<ProductComponent[]>([]);
  const [isLoadingBOM, setIsLoadingBOM] = useState(false);
  const [bomError, setBomError] = useState('');

  // State for components list (may be updated)
  const [components, setComponents] = useState<Component[]>(initialComponents);

  // State for add component form
  const [componentForm, setComponentForm] = useState<ComponentFormData>({
    name: '',
    sku: '',
    description: '',
    category: 'ELECTRONIC',
    minimumQuantity: 1,
  });
  const [isAddingComponent, setIsAddingComponent] = useState(false);

  // State for add BOM item form
  const [bomForm, setBomForm] = useState<BOMFormData>({
    productId: '',
    componentId: '',
    quantityRequired: 1
  });
  const [isAddingBomItem, setIsAddingBomItem] = useState(false);

  // Fetch BOM for selected product
  useEffect(() => {
    if (selectedProductId) {
      fetchBOM(selectedProductId);
    } else {
      setBomItems([]);
    }
  }, [selectedProductId]);

  const fetchBOM = async (productId: string) => {
    setIsLoadingBOM(true);
    setBomError('');

    try {
      const response = await fetch(`/api/products/${productId}/components`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Failed to fetch BOM:", response.status, errorData);
        throw new Error("Failed to fetch bill of materials");
      }

      const data = await response.json();
      setBomItems(data);
    } catch (error) {
      console.error("Error fetching BOM:", error);
      setBomError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoadingBOM(false);
    }
  };

  // Handle product change
  const handleProductChange = (value: string) => {
    setSelectedProductId(value);
    setBomForm(prev => ({ ...prev, productId: value }));
  };

  // Handle component form changes
  const handleComponentFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    if (name === 'minimumQuantity') {
      // Convert to number or empty string for number fields
      const numValue = value === '' ? '' : Number(value);
      setComponentForm(prev => ({ ...prev, [name]: numValue }));
    } else {
      setComponentForm(prev => ({ ...prev, [name]: value }));
    }
  };

  // Handle BOM form changes
  const handleBomFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    if (name === 'quantityRequired') {
      // Convert to number
      const numValue = Number(value);
      setBomForm(prev => ({ ...prev, [name]: numValue }));
    } else {
      setBomForm(prev => ({ ...prev, [name]: value }));
    }
  };

  // Handle component select change
  const handleComponentSelectChange = (value: string) => {
    setBomForm(prev => ({ ...prev, componentId: value }));
  };

  // Handle category select change
  const handleCategoryChange = (value: string) => {
    setComponentForm(prev => ({ ...prev, category: value }));
  };

  // Add new component
  const handleAddComponent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAddingComponent(true);

    try {
      const response = await fetch('/api/components', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: componentForm.name,
          sku: componentForm.sku,
          description: componentForm.description || undefined,
          category: componentForm.category,
          minimumQuantity: Number(componentForm.minimumQuantity),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add component');
      }

      const newComponent = await response.json();

      // Add to components list
      setComponents(prev => [...prev, newComponent]);

      // Reset form
      setComponentForm({
        name: '',
        sku: '',
        description: '',
        category: 'ELECTRONIC',
        minimumQuantity: 1,
      });

      toast.success('Component added successfully');
    } catch (error) {
      console.error('Error adding component:', error);
      toast.error('Failed to add component', {
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
    } finally {
      setIsAddingComponent(false);
    }
  };

  // Add BOM item
  const handleAddBomItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAddingBomItem(true);

    try {
      const response = await fetch(`/api/products/${bomForm.productId}/components`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          componentId: bomForm.componentId,
          quantityRequired: Number(bomForm.quantityRequired),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add component to BOM');
      }

      const newBomItem = await response.json();

      // Refresh BOM
      fetchBOM(bomForm.productId);

      // Reset form (except productId)
      setBomForm(prev => ({
        ...prev,
        componentId: '',
        quantityRequired: 1
      }));

      toast.success('Component added to BOM successfully');
    } catch (error) {
      console.error('Error adding component to BOM:', error);
      toast.error('Failed to add component to BOM', {
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
    } finally {
      setIsAddingBomItem(false);
    }
  };

  // Delete BOM item
  const handleDeleteBomItem = async (productId: string, componentId: string) => {
    if (!confirm('Are you sure you want to remove this component from the BOM?')) {
      return;
    }

    try {
      const response = await fetch(`/api/products/${productId}/components/${componentId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to remove component from BOM');
      }

      // Refresh BOM
      fetchBOM(productId);

      toast.success('Component removed from BOM successfully');
    } catch (error) {
      console.error('Error removing component from BOM:', error);
      toast.error('Failed to remove component from BOM', {
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
    }
  };

  // Edit BOM item quantity
  const handleEditBomItemQuantity = async (productId: string, componentId: string, currentQuantity: number) => {
    const newQuantity = prompt('Enter new quantity:', currentQuantity.toString());

    if (newQuantity === null) {
      return; // User cancelled
    }

    const quantity = parseInt(newQuantity, 10);

    if (isNaN(quantity) || quantity <= 0) {
      toast.error('Invalid quantity', {
        description: 'Quantity must be a positive number',
      });
      return;
    }

    try {
      const response = await fetch(`/api/products/${productId}/components/${componentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ quantityRequired: quantity }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update quantity');
      }

      // Refresh BOM
      fetchBOM(productId);

      toast.success('Quantity updated successfully');
    } catch (error) {
      console.error('Error updating quantity:', error);
      toast.error('Failed to update quantity', {
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
    }
  };

  // Redirect if not admin
  if (!isAdmin) {
    return null; // Will be redirected at the server component level
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Admin Inventory Management</h1>
        <p className="text-gray-500">Manage product BOMs and add new components</p>
      </div>

      <Tabs defaultValue="bom" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="bom">Bill of Materials</TabsTrigger>
          <TabsTrigger value="components">Add Components</TabsTrigger>
        </TabsList>

        <TabsContent value="bom">
          <Card>
            <CardHeader>
              <CardTitle>Bill of Materials Management</CardTitle>
              <CardDescription>Add or edit product component requirements</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Select Product
                  </label>
                  <Select value={selectedProductId} onValueChange={handleProductChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a product" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map(product => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name} ({product.modelNumber})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {bomError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{bomError}</AlertDescription>
                  </Alert>
                )}

                {selectedProductId && (
                  <div>
                    <h3 className="text-lg font-medium mb-4">Components</h3>

                    {isLoadingBOM ? (
                      <div className="flex justify-center py-8">
                        <Spinner size="lg" />
                      </div>
                    ) : bomItems.length > 0 ? (
                      <div className="border rounded-md overflow-hidden">
                        <table className="w-full">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Component</th>
                              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">SKU</th>
                              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Category</th>
                              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Quantity</th>
                              <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {bomItems.map((item) => (
                              <tr key={item.id} className="bg-white">
                                <td className="px-4 py-3 text-sm">{item.component.name}</td>
                                <td className="px-4 py-3 text-sm">{item.component.sku}</td>
                                <td className="px-4 py-3 text-sm">
                                  <Badge variant="secondary">{item.component.category}</Badge>
                                </td>
                                <td className="px-4 py-3 text-sm">{item.quantityRequired}</td>
                                <td className="px-4 py-3 text-sm text-right">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleEditBomItemQuantity(item.productId, item.componentId, item.quantityRequired)}
                                    className="mr-2"
                                  >
                                    <Edit className="h-4 w-4 mr-1" />
                                    Edit
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => handleDeleteBomItem(item.productId, item.componentId)}
                                  >
                                    <Trash2 className="h-4 w-4 mr-1" />
                                    Remove
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        No components in BOM. Add one below.
                      </div>
                    )}

                    {selectedProductId && (
                      <div className="mt-6 p-4 border rounded-md bg-gray-50">
                        <h4 className="text-md font-medium mb-4">Add Component to BOM</h4>
                        <form onSubmit={handleAddBomItem} className="grid gap-4">
                          <div className="grid gap-2">
                            <label className="text-sm font-medium">Component</label>
                            <Select value={bomForm.componentId} onValueChange={handleComponentSelectChange} required>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a component" />
                              </SelectTrigger>
                              <SelectContent>
                                {components.map(component => (
                                  <SelectItem key={component.id} value={component.id}>
                                    {component.name} ({component.sku})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="grid gap-2">
                            <label className="text-sm font-medium">Quantity Required</label>
                            <Input
                              type="number"
                              name="quantityRequired"
                              value={bomForm.quantityRequired}
                              onChange={handleBomFormChange}
                              min="1"
                              required
                            />
                          </div>

                          <Button type="submit" disabled={isAddingBomItem || !bomForm.componentId}>
                            {isAddingBomItem ? <Spinner size="sm" className="mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                            Add to BOM
                          </Button>
                        </form>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="components">
          <Card>
            <CardHeader>
              <CardTitle>Add New Component</CardTitle>
              <CardDescription>Create a new inventory component</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddComponent} className="grid gap-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Name</label>
                    <Input
                      name="name"
                      value={componentForm.name}
                      onChange={handleComponentFormChange}
                      required
                    />
                  </div>

                  <div className="grid gap-2">
                    <label className="text-sm font-medium">SKU</label>
                    <Input
                      name="sku"
                      value={componentForm.sku}
                      onChange={handleComponentFormChange}
                      required
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <label className="text-sm font-medium">Description</label>
                  <Input
                    name="description"
                    value={componentForm.description}
                    onChange={handleComponentFormChange}
                  />
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Category</label>
                    <Select value={componentForm.category} onValueChange={handleCategoryChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ELECTRONIC">Electronic</SelectItem>
                        <SelectItem value="MECHANICAL">Mechanical</SelectItem>
                        <SelectItem value="FASTENER">Fastener</SelectItem>
                        <SelectItem value="CABLE">Cable</SelectItem>
                        <SelectItem value="PACKAGING">Packaging</SelectItem>
                        <SelectItem value="OTHER">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Minimum Quantity</label>
                    <Input
                      type="number"
                      name="minimumQuantity"
                      value={componentForm.minimumQuantity}
                      onChange={handleComponentFormChange}
                      min="0"
                      required
                    />
                  </div>
                </div>

                <Button type="submit" disabled={isAddingComponent}>
                  {isAddingComponent ? <Spinner size="sm" className="mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                  Add Component
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}