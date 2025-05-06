'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updateUserName } from './_actions/userActions';
import { toast } from 'sonner';

interface EditUserNameDialogProps {
  userId: string;
  userName: string;
}

export const EditUserNameDialog: React.FC<EditUserNameDialogProps> = ({ userId, userName }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [newName, setNewName] = useState(userName);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newName || newName.trim() === '') {
      toast.error('Name cannot be empty');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const formData = new FormData();
      formData.append('userId', userId);
      formData.append('name', newName.trim());
      
      const result = await updateUserName(formData);
      
      if (result?.success) {
        toast.success('User name updated successfully');
        setIsOpen(false);
      } else {
        throw new Error(result?.error || 'Failed to update user name');
      }
    } catch (error) {
      console.error("Edit error:", error);
      toast.error('Update Failed', {
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Button 
        onClick={() => setIsOpen(true)} 
        size="sm" 
        variant="outline"
      >
        Edit Name
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit User Name</DialogTitle>
            <DialogDescription>
              Update the name for user with current name: {userName}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Name
                </Label>
                <Input
                  id="name"
                  className="col-span-3"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsOpen(false)} 
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting || !newName.trim() || newName.trim() === userName}
              >
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}; 