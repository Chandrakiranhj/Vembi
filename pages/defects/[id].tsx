'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useUser } from '@clerk/nextjs';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';

type DefectSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
type DefectStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

type Defect = {
  id: string;
  description: string;
  severity: DefectSeverity;
  status: DefectStatus;
  componentId: string;
  createdAt: string;
  updatedAt: string;
  component?: {
    id: string;
    name: string;
    sku: string;
    category: string;
  };
  reportedBy: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  resolution?: string | null;
  images?: string[];
};

type UserRole = 'ADMIN' | 'ASSEMBLER' | 'RETURN_QC' | 'SERVICE_PERSON';

const DefectDetailPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const { isSignedIn } = useUser();

  const [defect, setDefect] = useState<Defect | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<DefectStatus | ''>('');
  const [severity, setSeverity] = useState<DefectSeverity | ''>('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        // This would be replaced with a real API call to get the user's role
        // For now we'll simulate with a delay
        await new Promise(resolve => setTimeout(resolve, 500));
        setUserRole('ADMIN'); // Simulating admin role for now
      } catch (err) {
        console.error('Error fetching user role:', err);
      }
    };

    if (isSignedIn) {
      fetchUserRole();
    }
  }, [isSignedIn]);

  useEffect(() => {
    const fetchDefect = async () => {
      if (!id) return;
      
      setLoading(true);
      try {
        const response = await fetch(`/api/defects/${id}`);
        
        if (!response.ok) {
          throw new Error(`Error fetching defect: ${response.statusText}`);
        }
        
        const defectData = await response.json();
        setDefect(defectData);
        setNotes(defectData.resolution || '');
        setStatus(defectData.status);
        setSeverity(defectData.severity);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error fetching defect');
        console.error('Error fetching defect:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDefect();
  }, [id]);

  const canEditDefect = () => {
    return userRole === 'ADMIN' || userRole === 'SERVICE_PERSON';
  };

  const canDeleteDefect = () => {
    return userRole === 'ADMIN';
  };

  const handleUpdateDefect = async () => {
    if (!defect) return;
    
    setIsUpdating(true);
    try {
      const updateData = {
        ...(status !== defect.status && { status }),
        ...(severity !== defect.severity && { severity }),
        ...(notes !== (defect.resolution || '') && { resolution: notes }),
      };
      
      // Don't make API call if nothing changed
      if (Object.keys(updateData).length === 0) {
        toast('No changes to update', {
          description: 'You have not made any changes to the defect.',
        });
        setIsUpdating(false);
        return;
      }
      
      const response = await fetch(`/api/defects/${defect.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update defect');
      }
      
      const updatedDefect = await response.json();
      setDefect(updatedDefect);
      
      toast('Defect updated', {
        description: 'The defect has been successfully updated.',
      });
    } catch (err) {
      console.error('Error updating defect:', err);
      toast('Update failed', {
        description: err instanceof Error ? err.message : 'There was an error updating the defect.',
        action: { label: 'Close', onClick: () => {} },
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteDefect = async () => {
    if (!defect) return;
    
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/defects/${defect.id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete defect');
      }
      
      toast('Defect deleted', {
        description: 'The defect has been successfully deleted.',
      });
      
      router.push('/defects');
    } catch (err) {
      console.error('Error deleting defect:', err);
      toast('Delete failed', {
        description: err instanceof Error ? err.message : 'There was an error deleting the defect.',
        action: { label: 'Close', onClick: () => {} },
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'LOW':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Low</Badge>;
      case 'MEDIUM':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Medium</Badge>;
      case 'HIGH':
        return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">High</Badge>;
      case 'CRITICAL':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Critical</Badge>;
      default:
        return null;
    }
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'OPEN':
        return <Badge className="bg-red-500">Open</Badge>;
      case 'IN_PROGRESS':
        return <Badge className="bg-blue-500">In Progress</Badge>;
      case 'RESOLVED':
        return <Badge className="bg-green-500">Resolved</Badge>;
      case 'CLOSED':
        return <Badge className="bg-gray-500">Closed</Badge>;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-pulse text-blue-500">Loading defect details...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-red-500">
          <p className="text-lg font-semibold">Error loading defect</p>
          <p>{error}</p>
          <Button 
            variant="outline" 
            className="mt-4" 
            onClick={() => router.push('/defects')}
          >
            Return to Defects
          </Button>
        </div>
      </div>
    );
  }

  if (!defect) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-gray-500">
          <p className="text-lg font-semibold">Defect not found</p>
          <Button 
            variant="outline" 
            className="mt-4" 
            onClick={() => router.push('/defects')}
          >
            Return to Defects
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-4 flex items-center">
        <Button 
          variant="outline" 
          className="mr-2" 
          onClick={() => router.push('/defects')}
        >
          &larr; Back to Defects
        </Button>
        <h1 className="text-2xl font-bold">Defect Details</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-xl">
                    {defect.component?.name || 'Unknown Component'} Issue
                  </CardTitle>
                  <CardDescription>
                    Reported {formatDistanceToNow(new Date(defect.createdAt), { addSuffix: true })}
                  </CardDescription>
                </div>
                <div className="flex space-x-2">
                  {getSeverityBadge(defect.severity)}
                  {getStatusInfo(defect.status)}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-gray-700">Description</h3>
                  <p className="mt-1 text-gray-600">{defect.description}</p>
                </div>
                
                {defect.component && (
                  <div>
                    <h3 className="font-medium text-gray-700">Component Details</h3>
                    <div className="mt-1 bg-gray-50 p-3 rounded">
                      <p><span className="font-medium">Name:</span> {defect.component.name}</p>
                      <p><span className="font-medium">SKU:</span> {defect.component.sku}</p>
                      <p><span className="font-medium">Category:</span> {defect.component.category}</p>
                    </div>
                  </div>
                )}
                
                {defect.resolution && (
                  <div>
                    <h3 className="font-medium text-gray-700">Resolution</h3>
                    <p className="mt-1 text-gray-600">{defect.resolution}</p>
                  </div>
                )}
                
                {defect.images && defect.images.length > 0 && (
                  <div>
                    <h3 className="font-medium text-gray-700">Images</h3>
                    <div className="mt-1 grid grid-cols-2 md:grid-cols-3 gap-2">
                      {defect.images.map((image, index) => (
                        <div key={index} className="aspect-square bg-gray-100 rounded overflow-hidden">
                          <img 
                            src={image} 
                            alt={`Defect image ${index + 1}`} 
                            className="object-cover w-full h-full"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Reported By</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-3">
                <Avatar>
                  <AvatarImage src="" />
                  <AvatarFallback>{defect.reportedBy?.name?.charAt(0) || 'U'}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{defect.reportedBy?.name || 'Unknown User'}</p>
                  <p className="text-sm text-gray-500">{defect.reportedBy?.role || 'Unknown Role'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {canEditDefect() && (
            <Card>
              <CardHeader>
                <CardTitle>Update Defect</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Severity</label>
                    <Select 
                      value={severity} 
                      onValueChange={(value: DefectSeverity) => setSeverity(value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select severity" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LOW">Low</SelectItem>
                        <SelectItem value="MEDIUM">Medium</SelectItem>
                        <SelectItem value="HIGH">High</SelectItem>
                        <SelectItem value="CRITICAL">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Status</label>
                    <Select 
                      value={status} 
                      onValueChange={(value: DefectStatus) => setStatus(value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="OPEN">Open</SelectItem>
                        <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                        <SelectItem value="RESOLVED">Resolved</SelectItem>
                        <SelectItem value="CLOSED">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Resolution / Notes</label>
                    <Textarea 
                      value={notes} 
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
                      placeholder="Add resolution details or notes"
                      className="mt-1"
                      rows={4}
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <div></div>
                <Button 
                  onClick={handleUpdateDefect} 
                  disabled={isUpdating}
                >
                  {isUpdating ? 'Updating...' : 'Update Defect'}
                </Button>
              </CardFooter>
            </Card>
          )}

          {canDeleteDefect() && (
            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="text-red-600">Danger Zone</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Once you delete this defect, there is no going back. Please be certain.
                </p>
              </CardContent>
              <CardFooter>
                <Button 
                  variant="destructive" 
                  className="w-full" 
                  onClick={() => setShowDeleteDialog(true)}
                >
                  Delete Defect
                </Button>
              </CardFooter>
            </Card>
          )}
        </div>
      </div>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Defect</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this defect? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteDefect}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DefectDetailPage; 