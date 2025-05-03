import { useState, useEffect, useCallback } from 'react';

// Define the Product type based on Prisma schema and API response
// (Adjust if API returns different fields)
export interface Product {
  id: string;
  modelNumber: string;
  name: string;
  description?: string | null;
  specifications?: unknown | null; // Use unknown instead of Record<string, any>
  createdAt: string;
  updatedAt: string;
  _count?: {
    assemblies: number;
    returns: number;
  };
}

// Define hook options (e.g., for search)
export interface UseProductsOptions {
  search?: string;
}

export function useProducts(options: UseProductsOptions = {}) {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch products with optional filtering
  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Build query string
      const params = new URLSearchParams();
      if (options.search) {
        params.append('search', options.search);
      }
      
      const queryString = params.toString() ? `?${params.toString()}` : '';
      const response = await fetch(`/api/products${queryString}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch products');
      }
      
      const data: Product[] = await response.json();
      setProducts(data);
    } catch (err: unknown) { // Use unknown type
      let errorMessage = 'An unknown error occurred.';
        if (err instanceof Error) {
          errorMessage = err.message;
        }
      setError(errorMessage);
      console.error('Error fetching products:', err);
    } finally {
      setIsLoading(false);
    }
  }, [options.search]); // Dependency array includes options used in the fetch call

  // Fetch products when the component mounts or options change
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Function to get a single product by ID (optional, add if needed)
  const getProduct = async (id: string): Promise<Product | null> => {
    try {
      const response = await fetch(`/api/products/${id}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch product');
      }
      return await response.json();
    } catch (err) {
      console.error('Error fetching product:', err);
      return null; // Or re-throw error depending on desired handling
    }
  };
  
  // Add create/update/delete functions here if needed in the future
  
  return {
    products,
    isLoading,
    error,
    refetch: fetchProducts,
    getProduct, // Expose if needed
  };
} 