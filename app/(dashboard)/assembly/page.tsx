'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAssemblies, Assembly as HookAssembly } from '@/lib/hooks/useAssemblies';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, PlusCircle, CalendarClock, X, Package, Box, Tag } from "lucide-react"; 
import { format } from 'date-fns';
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

// Define the type for the data as received from the API (extending the hook's type)
interface ApiAssembly extends HookAssembly {
  startTime?: string | null;
  assembledBy?: {
    id: string;
    name: string;
  } | null;
}

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

  const handleRowClick = async (assembly: ApiAssembly) => {
    setSelectedAssembly(assembly);
    setIsModalOpen(true);
    fetchAssemblyDetails(assembly.id);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center">
          <div className="w-1.5 h-8 bg-gradient-to-b from-[#8B2131] to-[#4A1219] rounded-full mr-3"></div>
          <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-[#8B2131] to-[#6D1A27] bg-clip-text text-transparent">
            Assembly
          </h1>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative group w-full sm:w-auto">
            <div className="absolute inset-0 bg-gradient-to-r from-[#F5F1E4] to-[#E9DEC5] rounded-md filter blur-sm opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative bg-white border border-gray-200 rounded-md shadow-sm">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#8B2131]" />
             <Input
               type="text"
               placeholder="Search Serial Number..."
               className="pl-10 pr-4 py-2 w-full focus:ring-[#8B2131]"
               value={search}
               onChange={handleSearchChange}
             />
           </div>
          </div>
          
          <Button asChild className="bg-gradient-to-r from-[#8B2131] to-[#6D1A27] hover:from-[#7A1C2A] hover:to-[#5D1622] text-white transition-all duration-300">
             <Link href="/assembly/new">
               <PlusCircle className="mr-2 h-4 w-4" /> Start New Assembly
             </Link>
           </Button>
         </div>
       </div>

      {isAssembliesLoading ? (
        <div className="border rounded-lg p-6 bg-white shadow-sm">
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </div>
      ) : error ? (
        <div className="bg-gradient-to-r from-red-50 to-rose-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg shadow-sm relative" role="alert">
          <strong className="font-bold">Error:</strong>
          <span className="block sm:inline"> {error}</span>
          <Button 
            variant="outline"
            size="sm"
            onClick={() => fetchAssemblies({ search: search || undefined })} 
            className="mt-2 ml-2 border-red-200 text-red-700 hover:bg-red-50"
          >
            Try Again
          </Button>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden bg-white shadow-lg">
          <div className="overflow-x-auto">
          <Table>
              <TableHeader className="bg-gradient-to-r from-[#F5F1E4] to-[#E9DEC5]">
                <TableRow className="border-b-0">
                  <TableHead className="font-bold text-[#8B2131] px-3 sm:px-6 py-4 sm:py-5">Serial Number</TableHead>
                  <TableHead className="font-bold text-[#8B2131] px-3 sm:px-6 py-4 sm:py-5">Product</TableHead>
                  <TableHead className="font-bold text-[#8B2131] px-3 sm:px-6 py-4 sm:py-5 hidden sm:table-cell">Assembled By</TableHead>
                  <TableHead className="font-bold text-[#8B2131] px-3 sm:px-6 py-4 sm:py-5 hidden sm:table-cell">Started At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assemblies.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      <div className="flex flex-col items-center py-6">
                        <div className="bg-[#F5F1E4] rounded-full p-3 mb-2">
                          <Search className="h-6 w-6 text-[#8B2131]" />
                        </div>
                        <p className="text-gray-500 font-medium text-lg">No assemblies found</p>
                        <p className="text-gray-400 text-base">{search ? 'Try adjusting your search query.' : ''}</p>
                      </div>
                  </TableCell>
                </TableRow>
              ) : (
                  assemblies.map((assembly: HookAssembly, index) => {
                  const apiAssembly = assembly as ApiAssembly; // Cast here for optional fields
                  return (
                    <TableRow 
                      key={apiAssembly.id}
                      className={`group hover:bg-gradient-to-r hover:from-[#F5F1E4]/30 hover:to-[#E9DEC5]/30 transition-colors border-b border-gray-100 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} cursor-pointer`}
                      onClick={() => handleRowClick(apiAssembly)}
                    >
                      <TableCell className="font-medium px-3 sm:px-6 py-4 sm:py-5">
                        <div className="truncate max-w-[100px] sm:max-w-none">
                          {apiAssembly.serialNumber}
                        </div>
                      </TableCell>
                      <TableCell className="px-3 sm:px-6 py-4 sm:py-5">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                          <span className="px-2 py-1 bg-[#F5F1E4] text-[#8B2131] rounded-full text-xs sm:text-sm font-medium shadow-sm truncate max-w-[100px] sm:max-w-none">
                            {apiAssembly.product?.modelNumber}
                          </span>
                          <span className="text-gray-600 truncate max-w-[100px] sm:max-w-none text-xs sm:text-sm">
                            {apiAssembly.product?.name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-600 px-3 sm:px-6 py-4 sm:py-5 hidden sm:table-cell">
                        {apiAssembly.assembledBy?.name ?? 'Unknown'}
                    </TableCell>
                      <TableCell className="text-gray-600 items-center px-3 sm:px-6 py-4 sm:py-5 hidden sm:flex">
                        <CalendarClock className="h-3.5 w-3.5 mr-2 text-[#8B2131]" />
                      {apiAssembly.startTime ? format(new Date(apiAssembly.startTime), 'PPp') : 'N/A'} 
                    </TableCell>
                  </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
          </div>
        </div>
      )}

      {!isAssembliesLoading && !error && (
        <div className="flex justify-between items-center mt-4">
          <div className="text-sm bg-gradient-to-r from-[#8B2131] to-[#6D1A27] bg-clip-text text-transparent font-medium">
            Showing <span className="font-bold">{assemblies.length}</span> assemblies
          </div>
        </div>
      )}

      {/* Component Details Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col w-[95vw] sm:w-auto">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="text-base sm:text-xl font-bold flex items-center">
              <Box className="h-4 sm:h-5 w-4 sm:w-5 mr-2 text-[#8B2131]" />
              Assembly Details: {selectedAssembly?.serialNumber}
            </DialogTitle>
            <DialogDescription className="text-sm">
              Model: {selectedAssembly?.product?.modelNumber} - {selectedAssembly?.product?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="my-2 overflow-y-auto flex-grow">
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm sm:text-base flex items-center">
                    <Package className="h-4 w-4 mr-2 text-[#8B2131]" />
                    Components
                  </CardTitle>
                  <CardDescription className="mt-0 text-xs sm:text-sm">
                    Components used in this assembly
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                {isComponentLoading ? (
                  <div className="space-y-2">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : components.length === 0 ? (
                  <div className="text-center py-4 text-gray-500">
                    No component information available
                  </div>
                ) : (
                  <div className="overflow-x-auto max-h-[50vh]">
                    <table className="w-full text-xs sm:text-sm border-collapse">
                      <thead className="sticky top-0 z-10">
                        <tr className="bg-[#F5F1E4] text-[#8B2131] border-b">
                          <th className="py-2 px-2 sm:px-4 text-left font-medium">Component</th>
                          <th className="py-2 px-2 sm:px-4 text-left font-medium">Batch</th>
                          <th className="py-2 px-2 sm:px-4 text-left font-medium">Vendor</th>
                          <th className="py-2 px-2 sm:px-4 text-center font-medium w-16 sm:w-20">Qty</th>
                        </tr>
                      </thead>
                      <tbody>
                        {components.map((component, index) => (
                          <tr 
                            key={component.id} 
                            className={`border-b ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-gray-100 transition-colors`}
                          >
                            <td className="py-2 sm:py-3 px-2 sm:px-4">
                              <div className="font-medium text-[#8B2131] truncate max-w-[120px] sm:max-w-none">{component.name}</div>
                              <div className="text-xs text-gray-500 flex items-center mt-1 truncate max-w-[120px] sm:max-w-none">
                                <Tag className="h-3 w-3 mr-1 text-gray-400 flex-shrink-0" />
                                {component.sku}
                              </div>
                            </td>
                            <td className="py-2 sm:py-3 px-2 sm:px-4 truncate">{component.batchNumber}</td>
                            <td className="py-2 sm:py-3 px-2 sm:px-4 truncate">{component.vendor}</td>
                            <td className="py-2 sm:py-3 px-2 sm:px-4 text-center">
                              <span className="px-2 py-1 bg-[#8B2131] text-white text-xs rounded-md">
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
              className="bg-gradient-to-r from-[#8B2131] to-[#6D1A27] hover:from-[#7A1C2A] hover:to-[#5D1622] text-white w-full"
            >
              <X className="h-4 w-4 mr-1" /> Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 