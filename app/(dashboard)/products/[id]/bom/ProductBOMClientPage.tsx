'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation'; 
import Link from 'next/link';
import { useProducts, Product } from '@/lib/hooks/useProducts';
import { useComponents } from '@/lib/hooks/useComponents';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Skeleton } from '@/components/ui/skeleton';
import { PlusCircle, Edit, Trash2, ArrowLeft, ShieldAlert } from 'lucide-react'; // Added ShieldAlert

// Interface for the ProductComponent data received from API
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
    currentQuantity: number;
  };
}

// Interface for props
interface ProductBOMClientPageProps {
  isAuthorized: boolean; // Prop to indicate if user is admin
}

export default function ProductBOMClientPage({ isAuthorized }: ProductBOMClientPageProps) {
  const params = useParams();
  const productId = params?.id as string;

  const { getProduct } = useProducts();
  const [product, setProduct] = useState<Product | null>(null);
  const [bom, setBom] = useState<ProductComponentData[]>([]);
  const [isLoadingProduct, setIsLoadingProduct] = useState(true);
  const [isLoadingBom, setIsLoadingBom] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- State for Add Component Dialog ---
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedComponentId, setSelectedComponentId] = useState<string>("");
  const [addQuantity, setAddQuantity] = useState<number>(1);
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false); 
  const { components: availableComponents, isLoading: isLoadingComponents } = useComponents(); 
  
  // --- State for Edit Quantity Dialog ---
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingComponent, setEditingComponent] = useState<ProductComponentData | null>(null);
  const [editingQuantity, setEditingQuantity] = useState<number>(1);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // Fetch product details
  const fetchProduct = useCallback(async () => {
    if (!productId) return;
    setIsLoadingProduct(true);
    try {
      const data = await getProduct(productId);
      if (!data) throw new Error("Product not found.");
      setProduct(data);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch product:", err);
      setError(err instanceof Error ? err.message : "Failed to load product details.");
      setProduct(null);
    } finally {
      setIsLoadingProduct(false);
    }
  }, [productId, getProduct]);

  // Fetch Bill of Materials (BOM)
  const fetchBom = useCallback(async () => {
    if (!productId) return;
    setIsLoadingBom(true);
    try {
      const response = await fetch(`/api/products/${productId}/components`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch BOM");
      }
      const data = await response.json();
      setBom(data);
    } catch (err) {
      console.error("Failed to fetch BOM:", err);
      setError(err instanceof Error ? err.message : "Failed to load BOM.");
      setBom([]);
    } finally {
      setIsLoadingBom(false);
    }
  }, [productId]);

  useEffect(() => {
    fetchProduct();
    fetchBom();
  }, [fetchProduct, fetchBom]);

  // --- Handlers for Dialogs ---
  const handleAddComponent = async () => {
    if (!isAuthorized) {
      toast.error("Unauthorized: Only admins can modify the BOM.");
      return;
    }
    if (!selectedComponentId || addQuantity <= 0) {
      toast.error("Please select a component and enter a valid quantity.");
      return;
    }
    setIsSubmittingAdd(true);
    try {
      const response = await fetch(`/api/products/${productId}/components`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ componentId: selectedComponentId, quantityRequired: addQuantity }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to add component");
      }
      toast.success("Component added to BOM successfully!");
      setSelectedComponentId("");
      setAddQuantity(1);
      setIsAddDialogOpen(false);
      fetchBom(); // Refresh BOM list
    } catch (err) {
      console.error("Failed to add component to BOM:", err);
      toast.error("Failed to add component", { description: err instanceof Error ? err.message : "Unknown error" });
    } finally {
      setIsSubmittingAdd(false);
    }
  };
  
  // Delete component requirement
  const handleDeleteComponent = async (componentId: string, componentName: string) => {
    if (!isAuthorized) {
      toast.error("Unauthorized: Only admins can modify the BOM.");
      return;
    }
    
    // Add confirmation dialog before deleting
    if (!confirm(`Are you sure you want to remove ${componentName} from the BOM for this product?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/products/${productId}/components/${componentId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to remove component");
      }

      toast.success(`${componentName} removed from BOM successfully!`);
      fetchBom(); // Refresh BOM list
    } catch (err) {
      console.error("Failed to delete component from BOM:", err);
      toast.error("Failed to remove component", { description: err instanceof Error ? err.message : "Unknown error" });
    }
  };

  // Initiate edit quantity process
  const handleEditQuantity = (component: ProductComponentData) => { 
    if (!isAuthorized) {
      toast.error("Unauthorized: Only admins can modify the BOM.");
      return;
    }
    setEditingComponent(component);
    setEditingQuantity(component.quantityRequired);
    setIsEditDialogOpen(true);
  };

  // Update quantity requirement
  const handleUpdateQuantity = async () => {
    if (!isAuthorized) {
      toast.error("Unauthorized: Only admins can modify the BOM.");
      return;
    }
    if (!editingComponent || editingQuantity <= 0) {
        toast.error("Invalid quantity specified.");
        return;
    }
    setIsSubmittingEdit(true);
    try {
        const response = await fetch(`/api/products/${productId}/components/${editingComponent.componentId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ quantityRequired: editingQuantity }),
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Failed to update quantity");
        }
        toast.success(`Quantity for ${editingComponent.component.name} updated successfully!`);
        setIsEditDialogOpen(false);
        setEditingComponent(null);
        fetchBom(); // Refresh BOM list
    } catch (err) {
        console.error("Failed to update component quantity:", err);
        toast.error("Failed to update quantity", { description: err instanceof Error ? err.message : "Unknown error" });
    } finally {
        setIsSubmittingEdit(false);
    }
  };
  
  // --- Render Logic ---

  // Render Unauthorized state FIRST if applicable
  if (!isAuthorized) {
    return (
      <div className="container mx-auto py-10">
        <Card className="max-w-2xl mx-auto border-red-500">
          <CardHeader>
            <CardTitle className="text-red-700 flex items-center">
              <ShieldAlert className="mr-2 h-5 w-5" /> Access Denied
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700">
              You do not have permission to manage the Bill of Materials for products. Please contact an administrator if you believe this is an error.
            </p>
            <Link href="/products">
              <Button variant="outline" className="mt-4">
                 <ArrowLeft className="mr-2 h-4 w-4" /> Back to Products
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ... Loading, Error, Not Found states ...
  if (isLoadingProduct || isLoadingBom) {
    // ... Skeleton loading JSX ...
    return (
      <div className="container mx-auto py-10 space-y-6">
        <Skeleton className="h-8 w-1/4" />
        <Skeleton className="h-10 w-3/4" />
        <Card>
          <CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader>
          <CardContent>
            <Skeleton className="h-40 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    // ... Error display JSX ...
    return (
      <div className="container mx-auto py-10">
        <Card>
          <CardHeader><CardTitle>Error</CardTitle></CardHeader>
          <CardContent>
            <p className="text-red-600">{error}</p>
            <Button onClick={() => { fetchProduct(); fetchBom(); }} variant="outline" className="mt-4">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!product) {
    // ... Product not found JSX ...
    return (
      <div className="container mx-auto py-10">
        <p>Product not found.</p>
        <Link href="/products">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Products
          </Button>
        </Link>
      </div>
    );
  }

  const componentsForDropdown = availableComponents.filter(
    comp => !bom.some(bomComp => bomComp.componentId === comp.id)
  );

  return (
    <div className="container mx-auto py-10 space-y-6">
      <Link href="/products" className="inline-flex items-center text-sm text-blue-600 hover:underline mb-4">
        <ArrowLeft className="mr-1 h-4 w-4" />
        Back to Products
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Bill of Materials (BOM) for {product.name} ({product.modelNumber})</CardTitle>
          <CardDescription>Manage the required components and quantities for this product.</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Add Component Button & Dialog (Only show if authorized - already handled by top-level check) */}
          <div className="flex justify-end mb-4">
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Component Requirement
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                {/* ... Dialog Content ... */}
                 <DialogHeader>
                  <DialogTitle>Add Component to BOM</DialogTitle>
                  <DialogDescription>
                    Select a component and specify the quantity needed for one unit of {product.name}.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <label htmlFor="component" className="text-right text-sm font-medium">
                      Component
                    </label>
                    <Select 
                        value={selectedComponentId}
                        onValueChange={setSelectedComponentId}
                        disabled={isLoadingComponents || isSubmittingAdd}
                    >
                      <SelectTrigger id="component" className="col-span-3">
                        <SelectValue placeholder={isLoadingComponents ? "Loading..." : "Select component..."} />
                      </SelectTrigger>
                      <SelectContent>
                        {componentsForDropdown.length === 0 && !isLoadingComponents ? (
                           <p className="p-2 text-sm text-gray-500">No available components to add.</p>
                        ) : (
                           componentsForDropdown.map((comp) => (
                             <SelectItem key={comp.id} value={comp.id}>
                               {comp.name} ({comp.sku})
                             </SelectItem>
                           ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <label htmlFor="quantity" className="text-right text-sm font-medium">
                      Quantity
                    </label>
                    <Input
                      id="quantity"
                      name="quantity"
                      type="number"
                      min="1"
                      value={addQuantity}
                      onChange={(e) => setAddQuantity(parseInt(e.target.value, 10) || 1)}
                      className="col-span-3"
                      disabled={isSubmittingAdd}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} disabled={isSubmittingAdd}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleAddComponent} 
                    disabled={isSubmittingAdd || isLoadingComponents || !selectedComponentId}
                  >
                    {isSubmittingAdd ? 'Adding...' : 'Add Component'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* BOM Table */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                {/* ... Table Headers ... */}
                <TableRow>
                  <TableHead>Component Name</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Qty. Required</TableHead>
                  <TableHead>Current Stock</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bom.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      No components defined for this product yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  bom.map((item) => (
                    <TableRow key={item.id}>
                      {/* ... Table Cells ... */}
                      <TableCell className="font-medium">{item.component.name}</TableCell>
                      <TableCell>{item.component.sku}</TableCell>
                      <TableCell>{item.component.category}</TableCell>
                      <TableCell>{item.quantityRequired}</TableCell>
                      <TableCell>
                         <Badge variant={item.component.currentQuantity < (item.quantityRequired * 2) ? "destructive" : "default" } >
                            {item.component.currentQuantity}
                         </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {/* Action buttons (only enable if authorized - handled by handlers) */}
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleEditQuantity(item)} 
                            className="mr-1"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleDeleteComponent(item.componentId, item.component.name)} 
                            className="text-red-600 hover:text-red-700"
                         >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          
          {/* Edit Quantity Dialog (Only show if authorized - handled by handler logic) */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="sm:max-w-[425px]">
              {editingComponent && (
                <>
                  {/* ... Edit Dialog Content ... */}
                   <DialogHeader>
                    <DialogTitle>Edit Required Quantity</DialogTitle>
                    <DialogDescription>
                      Update the quantity of <strong>{editingComponent.component.name} ({editingComponent.component.sku})</strong> required for one unit of {product.name}.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <label htmlFor="edit-quantity" className="text-right text-sm font-medium">
                        New Quantity
                      </label>
                      <Input
                        id="edit-quantity"
                        name="edit-quantity"
                        type="number"
                        min="1"
                        value={editingQuantity}
                        onChange={(e) => setEditingQuantity(parseInt(e.target.value, 10) || 1)}
                        className="col-span-3"
                        disabled={isSubmittingEdit}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={isSubmittingEdit}>
                      Cancel
                    </Button>
                    <Button 
                        onClick={handleUpdateQuantity} 
                        disabled={isSubmittingEdit || editingQuantity <= 0}
                    >
                      {isSubmittingEdit ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </DialogFooter>
                </>
              )}
            </DialogContent>
          </Dialog>

        </CardContent>
      </Card>
    </div>
  );
} 