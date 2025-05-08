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
import { rejectUser } from './_actions/userActions';
import { toast } from 'sonner';

interface RejectUserDialogProps {
  userId: string;
  userName: string;
}

export const RejectUserDialog: React.FC<RejectUserDialogProps> = ({ userId, userName }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  const handleReject = async () => {
    setIsRejecting(true);
    
    try {
      const formData = new FormData();
      formData.append('userId', userId);
      
      await rejectUser(formData);
      toast.success(`User ${userName} has been rejected`);
      setIsOpen(false);
    } catch (error) {
      console.error("Rejection error:", error);
      toast.error('Rejection Failed', {
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
      });
    } finally {
      setIsRejecting(false);
    }
  };

  return (
    <>
      <Button 
        onClick={() => setIsOpen(true)} 
        size="sm" 
        variant="destructive"
      >
        Reject
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Rejection</DialogTitle>
            <DialogDescription>
              Are you sure you want to reject user <strong>{userName}</strong>? 
              This will permanently delete the user from the system. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsOpen(false)} 
              disabled={isRejecting}>
              Cancel
            </Button>
            <Button 
              onClick={handleReject}
              disabled={isRejecting}
              variant="destructive"
            >
              {isRejecting ? 'Rejecting...' : 'Confirm Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}; 