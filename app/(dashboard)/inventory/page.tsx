'use client';

import { useState } from "react";
import { useComponents, Component } from "@/lib/hooks/useComponents";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Box, Filter } from "lucide-react";
import AddBatchDialog from "@/components/AddBatchDialog";

// Define the type for badge variants explicitly
type BadgeVariant = 'default' | 'destructive' | 'outline' | 'secondary' | 'warning' | 'success';

export default function InventoryPage() {
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [showLowStock, setShowLowStock] = useState(false);
  const [isAddBatchDialogOpen, setIsAddBatchDialogOpen] = useState(false);
  
  const { 
    components, 
    isLoading, 
    error, 
    refetch 
  } = useComponents({ 
    category: category === "All" ? undefined : category,
    search,
  });

  const filteredComponents = showLowStock 
    ? components.filter((component: Component) => component.totalStock <= component.minimumQuantity)
    : components;

  const categories = ["All", "Storage", "Electronics", "Power", "Cables", "Audio", "Housing", "Miscellaneous"];

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  };

  const handleCategoryChange = (value: string) => {
    setCategory(value);
  };

  const toggleLowStock = () => {
    setShowLowStock(!showLowStock);
  };

  const handleBatchAdded = () => {
    setIsAddBatchDialogOpen(false);
    refetch();
  };

  // Helper function to determine badge variant
  const getStockBadgeVariant = (totalStock: number, minimumQuantity: number): BadgeVariant => {
    if (totalStock <= minimumQuantity) return 'destructive';
    if (totalStock < minimumQuantity * 1.5) return 'warning';
    return 'success'; // Default to success if not low or warning
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center">
          <div className="w-1.5 h-8 bg-gradient-to-b from-[#8B2131] to-[#4A1219] rounded-full mr-3"></div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-[#8B2131] to-[#6D1A27] bg-clip-text text-transparent">
            Inventory Management
          </h1>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-[#F5F1E4] to-[#E9DEC5] rounded-md filter blur-sm opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative bg-white border border-gray-200 rounded-md shadow-sm">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#8B2131]" />
              <Input
                type="text"
                placeholder="Search components..."
                className="pl-10 pr-4 py-2 w-full focus:ring-[#8B2131]"
                value={search}
                onChange={handleSearchChange}
              />
            </div>
          </div>
          
          <Select value={category} onValueChange={handleCategoryChange}>
            <SelectTrigger className="w-[180px] border-gray-200 shadow-sm bg-white">
              <div className="flex items-center">
                <Filter className="h-3.5 w-3.5 text-[#8B2131] mr-2" />
                <SelectValue placeholder="Select category" />
              </div>
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat} className="hover:bg-[#F5F1E4]">
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button 
            variant={showLowStock ? 'secondary' : 'outline'}
            className={`${showLowStock 
              ? 'bg-gradient-to-r from-[#F5F1E4] to-[#E9DEC5] border-[#D4BC7D] text-[#5A4C3A]' 
              : 'border-gray-200 shadow-sm bg-white hover:bg-[#F5F1E4]'} transition-all duration-300`}
            onClick={toggleLowStock}
          >
            Low Stock Only
          </Button>
          
          <Button 
            onClick={() => setIsAddBatchDialogOpen(true)} 
            disabled={isLoading}
            className="bg-gradient-to-r from-[#8B2131] to-[#6D1A27] hover:from-[#7A1C2A] hover:to-[#5D1622] text-white transition-all duration-300"
          >
            <Box className="mr-2 h-4 w-4" /> Add Batch
          </Button>
        </div>
      </div>

      {isLoading ? (
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
            onClick={() => refetch()} 
            className="mt-2 ml-2 border-red-200 text-red-700 hover:bg-red-50"
          >
            Try Again
          </Button>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden bg-white shadow-lg">
          <div className="overflow-hidden">
            <Table>
              <TableHeader className="bg-gradient-to-r from-[#F5F1E4] to-[#E9DEC5]">
                <TableRow className="border-b-0">
                  <TableHead className="font-bold text-[#8B2131] px-6 py-5">Name</TableHead>
                  <TableHead className="font-bold text-[#8B2131] px-6 py-5">SKU</TableHead>
                  <TableHead className="font-bold text-[#8B2131] px-6 py-5">Category</TableHead>
                  <TableHead className="font-bold text-[#8B2131] px-6 py-5">Total Stock</TableHead>
                  <TableHead className="font-bold text-[#8B2131] px-6 py-5">Min. Qty</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredComponents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      <div className="flex flex-col items-center py-6">
                        <div className="bg-[#F5F1E4] rounded-full p-3 mb-2">
                          <Search className="h-6 w-6 text-[#8B2131]" />
                        </div>
                        <p className="text-gray-500 font-medium text-lg">No components found</p>
                        <p className="text-gray-400 text-base">{search || category !== "All" || showLowStock ? 'Try adjusting your filters.' : ''}</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredComponents.map((component, index) => (
                    <TableRow 
                      key={component.id}
                      className={`group hover:bg-gradient-to-r hover:from-[#F5F1E4]/30 hover:to-[#E9DEC5]/30 transition-colors border-b border-gray-100 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                    >
                      <TableCell className="font-medium text-[#8B2131] px-6 py-5">{component.name}</TableCell>
                      <TableCell className="text-gray-600 px-6 py-5">{component.sku}</TableCell>
                      <TableCell className="px-6 py-5">
                        <span className="px-3 py-1.5 bg-[#F5F1E4] text-[#8B2131] rounded-full text-sm font-medium shadow-sm">
                          {component.category}
                        </span>
                      </TableCell>
                      <TableCell className="px-6 py-5">
                        <Badge 
                          variant={getStockBadgeVariant(component.totalStock, component.minimumQuantity)}
                          className={`${
                            component.totalStock <= component.minimumQuantity 
                              ? 'bg-gradient-to-r from-rose-50 to-red-50 border-rose-200 text-rose-800' 
                              : component.totalStock < component.minimumQuantity * 1.5 
                                ? 'bg-gradient-to-r from-[#F5F1E4] to-[#E9DEC5] border-[#D4BC7D] text-[#5A4C3A]'
                                : 'bg-gradient-to-r from-[#F5F1E4] to-[#E9DEC5] border-[#8B2131]/20 text-[#8B2131]'
                          } px-3.5 py-1.5 shadow-sm transition-all text-base font-medium`}
                        >
                          {component.totalStock}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-600 px-6 py-5">{component.minimumQuantity}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {!isLoading && !error && (
        <div className="flex justify-between items-center mt-4">
          <div className="text-sm bg-gradient-to-r from-[#8B2131] to-[#6D1A27] bg-clip-text text-transparent font-medium">
            Showing <span className="font-bold">{filteredComponents.length}</span> components
            {showLowStock && ' (Low Stock Only)'}
          </div>
        </div>
      )}

      <AddBatchDialog 
        isOpen={isAddBatchDialogOpen} 
        onClose={() => setIsAddBatchDialogOpen(false)} 
        onBatchAdded={handleBatchAdded}
        components={components}
      />
    </div>
  );
} 