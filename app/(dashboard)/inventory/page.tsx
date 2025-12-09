'use client';

import { useState } from "react";
import { useComponents } from "@/lib/hooks/useComponents";
import { DataTable } from "./_components/data-table";
import { columns } from "./_components/columns";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Search, Box, Filter, AlertCircle } from "lucide-react";
import AddBatchDialog from "@/components/AddBatchDialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

export default function InventoryPage() {
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");
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

  const categories = ["All", "Storage", "Electronics", "Power", "Cables", "Audio", "Housing", "Miscellaneous"];

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  };

  const handleCategoryChange = (value: string) => {
    setCategory(value);
  };

  const handleBatchAdded = () => {
    setIsAddBatchDialogOpen(false);
    refetch();
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Inventory</h2>
          <p className="text-muted-foreground">
            Manage your component inventory and stock levels.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            onClick={() => setIsAddBatchDialogOpen(true)}
            disabled={isLoading}
          >
            <Box className="mr-2 h-4 w-4" /> Add Batch
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-[300px]">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search components..."
              value={search}
              onChange={handleSearchChange}
              className="pl-8"
            />
          </div>
          <Select value={category} onValueChange={handleCategoryChange}>
            <SelectTrigger className="w-[180px]">
              <div className="flex items-center">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Category" />
              </div>
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
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
            Failed to load inventory: {error}
            <Button variant="outline" size="sm" onClick={() => refetch()} className="ml-2">
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      ) : (
        <DataTable columns={columns} data={components} />
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