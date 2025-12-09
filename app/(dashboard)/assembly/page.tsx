'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAssemblies } from '@/lib/hooks/useAssemblies';
import { DataTable } from "./_components/data-table";
import { columns, ApiAssembly } from "./_components/columns";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, PlusCircle, X, Package, Box, Tag, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Component type definition with batch and vendor information
interface ComponentDetails {
  id: string;
  name: string;
  sku: string;
  category: string;
  batchNumber: string;
  vendor: string;
  quantityUsed: number;
}

export default function AssemblyPage() {
  const [search, setSearch] = useState("");
  const [selectedAssembly, setSelectedAssembly] = useState<ApiAssembly | null>(null);
  const [components, setComponents] = useState<ComponentDetails[]>([]);
  const [isComponentLoading, setIsComponentLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const {
    assemblies,
    isLoading: isAssembliesLoading,
    error,
    fetchAssemblies,
  } = useAssemblies();

  // Fetch data when component mounts or search changes
  useEffect(() => {
    const currentOptions = {
      search: search || undefined,
    };
    fetchAssemblies(currentOptions);
  }, [search, fetchAssemblies]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  };

  const fetchAssemblyDetails = async (assemblyId: string) => {
    try {
      setIsComponentLoading(true);
      const response = await fetch(`/api/assemblies/${assemblyId}/components`);
      if (!response.ok) {
        throw new Error('Failed to fetch components');
      }
      const data = await response.json();
      setComponents(data);
    } catch (error) {
      console.error("Error fetching components:", error);
    } finally {
      setIsComponentLoading(false);
    }
  };

  const handleRowClick = (assembly: ApiAssembly) => {
    setSelectedAssembly(assembly);
    setIsModalOpen(true);
    fetchAssemblyDetails(assembly.id);
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Assembly</h2>
          <p className="text-muted-foreground">
            Manage and track your product assemblies.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button asChild>
            <Link href="/assembly/new">
              <PlusCircle className="mr-2 h-4 w-4" /> Start New Assembly
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative w-full sm:w-[300px]">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search Serial Number..."
            value={search}
            onChange={handleSearchChange}
            className="pl-8"
          />
        </div>
      </div>

      {isAssembliesLoading ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-10 w-[250px]" />
            <Skeleton className="h-10 w-[100px]" />
          </div>
          <div className="border rounded-md p-4">
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </div>
        </div>
      ) : error ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Failed to load assemblies: {error}
            <Button variant="outline" size="sm" onClick={() => fetchAssemblies({ search: search || undefined })} className="ml-2">
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      ) : (
        <DataTable
          columns={columns}
          data={assemblies as ApiAssembly[]}
          onRowClick={handleRowClick}
        />
      )}

      {/* Component Details Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col w-[95vw] sm:w-auto">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="text-base sm:text-xl font-bold flex items-center">
              <Box className="h-4 sm:h-5 w-4 sm:w-5 mr-2 text-primary" />
              Assembly Details: {selectedAssembly?.serialNumber}
            </DialogTitle>
            <DialogDescription className="text-sm">
              Model: {selectedAssembly?.product?.modelNumber} - {selectedAssembly?.product?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="my-2 overflow-y-auto flex-grow">
            <Card className="shadow-sm border-0">
              <CardHeader className="pb-2 px-0">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm sm:text-base flex items-center">
                    <Package className="h-4 w-4 mr-2 text-primary" />
                    Components
                  </CardTitle>
                  <CardDescription className="mt-0 text-xs sm:text-sm">
                    Components used in this assembly
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="px-0">
                {isComponentLoading ? (
                  <div className="space-y-2">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : components.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    No component information available
                  </div>
                ) : (
                  <div className="overflow-x-auto max-h-[50vh] border rounded-md">
                    <table className="w-full text-xs sm:text-sm border-collapse">
                      <thead className="sticky top-0 z-10 bg-muted">
                        <tr className="text-left">
                          <th className="py-2 px-2 sm:px-4 font-medium">Component</th>
                          <th className="py-2 px-2 sm:px-4 font-medium">Batch</th>
                          <th className="py-2 px-2 sm:px-4 font-medium">Vendor</th>
                          <th className="py-2 px-2 sm:px-4 text-center font-medium w-16 sm:w-20">Qty</th>
                        </tr>
                      </thead>
                      <tbody>
                        {components.map((component, index) => (
                          <tr
                            key={component.id}
                            className={`border-b last:border-0 ${index % 2 === 0 ? 'bg-background' : 'bg-muted/30'} hover:bg-muted/50 transition-colors`}
                          >
                            <td className="py-2 sm:py-3 px-2 sm:px-4">
                              <div className="font-medium truncate max-w-[120px] sm:max-w-none">{component.name}</div>
                              <div className="text-xs text-muted-foreground flex items-center mt-1 truncate max-w-[120px] sm:max-w-none">
                                <Tag className="h-3 w-3 mr-1 flex-shrink-0" />
                                {component.sku}
                              </div>
                            </td>
                            <td className="py-2 sm:py-3 px-2 sm:px-4 truncate">{component.batchNumber}</td>
                            <td className="py-2 sm:py-3 px-2 sm:px-4 truncate">{component.vendor}</td>
                            <td className="py-2 sm:py-3 px-2 sm:px-4 text-center">
                              <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-md font-medium">
                                {component.quantityUsed}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <DialogFooter className="flex-shrink-0 mt-4">
            <Button
              onClick={() => setIsModalOpen(false)}
              className="w-full sm:w-auto"
            >
              <X className="h-4 w-4 mr-1" /> Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}