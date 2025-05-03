import { useState, useCallback } from 'react';

// Define Types
export interface Component {
  id: string;
  componentId: string;
  quantity: number;
  inspected: boolean;
  passed?: boolean;
  notes?: string;
  component: {
    id: string;
    name: string;
    sku: string;
    category: string;
  };
}

export interface Assembly {
  id: string;
  serialNumber: string;
  status: 'IN_PROGRESS' | 'PASSED_QC' | 'FAILED_QC' | 'SHIPPED';
  createdAt: string;
  updatedAt: string;
  notes?: string;
  productId: string;
  product?: {
    id: string;
    name: string;
    modelNumber: string;
  };
  components: Component[];
  _count?: {
    returns: number;
  };
}

// Define hook options
export interface UseAssembliesOptions {
  status?: 'IN_PROGRESS' | 'PASSED_QC' | 'FAILED_QC' | 'SHIPPED';
  productId?: string;
  search?: string;
}

export function useAssemblies(initialOptions: UseAssembliesOptions = {}) {
  const [assemblies, setAssemblies] = useState<Assembly[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch assemblies with optional filtering
  const fetchAssemblies = useCallback(async (fetchOptions: UseAssembliesOptions = initialOptions) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Build query string from the passed fetchOptions
      const params = new URLSearchParams();
      if (fetchOptions.status) params.append('status', fetchOptions.status);
      if (fetchOptions.productId) params.append('productId', fetchOptions.productId);
      if (fetchOptions.search) params.append('search', fetchOptions.search);
      
      const queryString = params.toString() ? `?${params.toString()}` : '';
      const response = await fetch(`/api/assemblies${queryString}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch assemblies');
      }
      
      const data = await response.json();
      setAssemblies(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Add a new assembly (or batch)
  const addAssembly = useCallback(async (assemblyData: {
    productId: string;
    quantity?: number;
    startSerialNumber?: string;
    selectedBatches?: Array<{
      componentId: string;
      batchId: string;
      quantityUsed: number;
    }>;
  }) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/assemblies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
           productId: assemblyData.productId,
           quantity: assemblyData.quantity,
           startSerialNumber: assemblyData.startSerialNumber,
           selectedBatches: assemblyData.selectedBatches
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create assemblies');
      }
      
      const apiResponse = await response.json(); 
      return apiResponse;

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get a single assembly by ID
  const getAssembly = useCallback(async (id: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch(`/api/assemblies/${id}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch assembly');
      }
      
      const assembly = await response.json();
      return assembly;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Update an assembly
  const updateAssembly = useCallback(async (id: string, assemblyData: {
    status?: 'IN_PROGRESS' | 'PASSED_QC' | 'FAILED_QC' | 'SHIPPED';
    notes?: string;
    components?: {
      id: string;
      inspected?: boolean;
      passed?: boolean;
      notes?: string;
    }[];
  }) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch(`/api/assemblies/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(assemblyData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update assembly');
      }
      
      const updatedAssembly = await response.json();
      
      // Update the assemblies state
      setAssemblies(prev => 
        prev.map(assembly => 
          assembly.id === id ? updatedAssembly : assembly
        )
      );
      
      return updatedAssembly;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Delete an assembly
  const deleteAssembly = useCallback(async (id: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch(`/api/assemblies/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete assembly');
      }
      
      // Remove from state
      setAssemblies(prev => prev.filter(assembly => assembly.id !== id));
      
      return await response.json();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    assemblies,
    isLoading,
    error,
    fetchAssemblies,
    addAssembly,
    getAssembly,
    updateAssembly,
    deleteAssembly,
  };
} 