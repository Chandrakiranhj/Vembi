'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from 'sonner';
import { Skeleton } from "@/components/ui/skeleton";
import { PlusCircle, Pencil, X, Check } from "lucide-react";
import AddVendorDialog from "@/components/AddVendorDialog";
import { Input } from "@/components/ui/input";

// Vendor interface
interface Vendor {
  id: string;
  name: string;
  contactPerson?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  notes?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showInactive, setShowInactive] = useState(false);

  // Fetch vendors on page load
  useEffect(() => {
    fetchVendors();
  }, [showInactive]);

  // Filter vendors based on search term
  const filteredVendors = vendors.filter(vendor => 
    vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (vendor.contactPerson && vendor.contactPerson.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (vendor.email && vendor.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const fetchVendors = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const url = `/api/vendors${!showInactive ? '?active=true' : ''}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch vendors: ${response.status}`);
      }
      
      const data = await response.json();
      setVendors(data.vendors || []);
    } catch (err) {
      console.error('Error fetching vendors:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      toast.error('Failed to load vendors');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleVendorStatus = async (vendor: Vendor) => {
    try {
      const response = await fetch(`/api/vendors/${vendor.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !vendor.isActive }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update vendor: ${response.status}`);
      }
      
      toast.success(`Vendor ${vendor.isActive ? 'deactivated' : 'activated'} successfully`);
      fetchVendors(); // Refetch to update the list
    } catch (err) {
      console.error('Error updating vendor status:', err);
      toast.error('Failed to update vendor status');
    }
  };

  const handleVendorAdded = () => {
    setIsDialogOpen(false);
    fetchVendors();
    toast.success('Vendor added successfully');
  };

  if (isLoading && vendors.length === 0) {
    return (
      <div className="container mx-auto py-10">
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-3/4 mb-2" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Vendor Management</CardTitle>
            <CardDescription>
              {filteredVendors.length} {filteredVendors.length === 1 ? 'vendor' : 'vendors'} found
            </CardDescription>
          </div>
          <Button onClick={() => setIsDialogOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Vendor
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div className="relative w-full max-w-sm">
              <Input
                placeholder="Search vendors..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <div className="flex items-center ml-4">
              <input
                type="checkbox"
                id="showInactive"
                checked={showInactive}
                onChange={() => setShowInactive(!showInactive)}
                className="rounded border-gray-300 mr-2"
              />
              <label htmlFor="showInactive" className="text-sm">
                Show Inactive Vendors
              </label>
            </div>
          </div>

          {error ? (
            <div className="bg-red-50 text-red-500 p-4 rounded-md">
              {error}
            </div>
          ) : filteredVendors.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              {searchTerm
                ? 'No vendors match your search criteria'
                : 'No vendors found. Add your first vendor!'}
            </div>
          ) : (
            <div className="overflow-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                  <tr>
                    <th className="px-6 py-3">Name</th>
                    <th className="px-6 py-3">Contact Person</th>
                    <th className="px-6 py-3">Email / Phone</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVendors.map((vendor) => (
                    <tr key={vendor.id} className="border-b hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium">
                        {vendor.name}
                      </td>
                      <td className="px-6 py-4">
                        {vendor.contactPerson || '-'}
                      </td>
                      <td className="px-6 py-4">
                        <div>{vendor.email || '-'}</div>
                        <div className="text-xs text-gray-500">{vendor.phone || '-'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span 
                          className={`px-2 py-1 rounded-full text-xs ${
                            vendor.isActive 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {vendor.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => toggleVendorStatus(vendor)}
                          >
                            {vendor.isActive ? (
                              <><X className="h-4 w-4 mr-1" /> Deactivate</>
                            ) : (
                              <><Check className="h-4 w-4 mr-1" /> Activate</>
                            )}
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                          >
                            <Pencil className="h-4 w-4 mr-1" /> Edit
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Vendor Dialog */}
      <AddVendorDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onVendorAdded={handleVendorAdded}
      />
    </div>
  );
} 