import { useState, useEffect, useCallback } from 'react';

// Updated Component interface
export interface Component {
  id: string;
  name: string;
  sku: string;
  description?: string | null; // Adjusted to match schema/API
  category: string;
  // currentQuantity removed
  totalStock: number; // Added total stock from API
  minimumQuantity: number;
  createdAt: string;
  updatedAt: string;
  _count?: {
    stockBatches: number; // Use stockBatches relation
  };
}

interface UseComponentsOptions {
  category?: string;
  search?: string;
  // lowStock filter logic would now compare totalStock and minimumQuantity
  // It can be implemented client-side after fetching if needed.
}

export function useComponents(options: UseComponentsOptions = {}) {
  const [components, setComponents] = useState<Component[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchComponents = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Build query string (lowStock param removed from API call)
      const params = new URLSearchParams();
      if (options.category && options.category !== 'All') {
        params.append('category', options.category);
      }
      if (options.search) {
        params.append('search', options.search);
      }

      const response = await fetch(`/api/components?${params.toString()}`);

      if (!response.ok) {
        let errorMsg = `Error fetching components: ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorMsg = errorData.error || errorMsg;
        } catch { /* Ignore json parse error */ }
        throw new Error(errorMsg);
      }

      // Expect data to match the updated Component interface with totalStock
      const data: Component[] = await response.json();
      setComponents(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch components';
      setError(message);
      console.error('Error fetching components:', err);
    } finally {
      setIsLoading(false);
    }
    // Update dependency array if options object itself can change reference
  }, [options.category, options.search]);

  useEffect(() => {
    fetchComponents();
  }, [fetchComponents]);

  // Function to add a component (API expects data without totalStock)
  const addComponent = async (componentData: Omit<Component, 'id' | 'createdAt' | 'updatedAt' | 'totalStock' | '_count'>) => {
    try {
      const response = await fetch('/api/components', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(componentData), // Send data matching POST API
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add component');
      }

      const newComponent = await response.json();
      // After adding, refetch to get the component with calculated totalStock
      fetchComponents();
      return newComponent;
    } catch (err: unknown) {
      console.error('Error adding component:', err);
      if (err instanceof Error) throw err;
      throw new Error('An unknown error occurred while adding the component.');
    }
  };

  // Function to update a component (API expects data without totalStock)
  const updateComponent = async (id: string, componentData: Partial<Omit<Component, 'id' | 'createdAt' | 'updatedAt' | 'totalStock' | '_count'>>) => {
    try {
      const response = await fetch(`/api/components/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(componentData), // Send data matching PUT API
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update component');
      }

      const updatedComponent = await response.json();
      // Update local state or refetch for consistency
      fetchComponents();
      return updatedComponent;
    } catch (err: unknown) {
      console.error('Error updating component:', err);
      if (err instanceof Error) throw err;
      throw new Error('An unknown error occurred while updating the component.');
    }
  };

  // Function to delete a component
  const deleteComponent = async (id: string) => {
    try {
      const response = await fetch(`/api/components/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete component');
      }

      // Refetch after delete
      fetchComponents();
      return true;
    } catch (err: unknown) {
      console.error('Error deleting component:', err);
      if (err instanceof Error) throw err;
      throw new Error('An unknown error occurred while deleting the component.');
    }
  };

  // Function to get a single component (API returns structure with stockBatches array)
  // This function might need adjustment depending on how you want to handle the stock display on a single component view
  const getComponent = async (id: string): Promise<Component | null> => { // Keeping return type for now
    try {
      const response = await fetch(`/api/components/${id}`);

      if (!response.ok) {
        let errorMsg = `Failed to fetch component: ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorMsg = errorData.error || errorMsg;
        } catch { /* Ignore json parse error */ }
        throw new Error(errorMsg);
      }

      // The API returns stockBatches array, need to calculate totalStock here if needed by caller
      const rawData = await response.json();
      if (rawData && Array.isArray(rawData.stockBatches)) {
        const totalStock = rawData.stockBatches.reduce((sum: number, batch: { currentQuantity: number }) => sum + batch.currentQuantity, 0);
        // Return data conforming to the hook's Component interface
        return { ...rawData, stockBatches: undefined, totalStock };
      } else {
        // Handle case where stockBatches might be missing or not an array (shouldn't happen with API changes)
        return { ...rawData, stockBatches: undefined, totalStock: 0 };
      }

    } catch (err: unknown) {
      console.error('Error fetching component:', err);
      if (err instanceof Error) throw err;
      throw new Error('An unknown error occurred while fetching the component.');
    }
  };

  return {
    components,
    isLoading,
    error,
    refetch: fetchComponents,
    addComponent,
    updateComponent,
    deleteComponent,
    getComponent,
  };
}