'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { removeUser } from './_actions/userActions';
import { toast } from 'sonner';

interface DeleteUserDialogProps {
  userId: string;
  userName: string;
}

export const DeleteUserDialog: React.FC<DeleteUserDialogProps> = ({ userId, userName }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    
    try {
      const formData = new FormData();
      formData.append('userId', userId);
      
      await removeUser(formData);
      toast.success(`User ${userName} has been deleted`);
      setIsOpen(false);
    } catch (error) {
      console.error("Delete error:", error);
      toast.error('Deletion Failed', {
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Button 
        onClick={() => setIsOpen(true)} 
        size="sm" 
        variant="destructive"
      >
        Delete
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you absolutely sure?</DialogTitle>
            <DialogDescription>
              This action will permanently delete user <strong>{userName}</strong> and remove all their associated data. 
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsOpen(false)} 
              disabled={isDeleting}>
              Cancel
            </Button>
            <Button 
              onClick={handleDelete}
              disabled={isDeleting}
              variant="destructive"
            >
              {isDeleting ? 'Deleting...' : 'Delete User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}; 