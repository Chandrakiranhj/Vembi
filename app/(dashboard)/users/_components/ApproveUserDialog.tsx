'use client';

import React, { useState } from 'react';
import { Role } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from '@/components/ui/dialog'; // Assuming these are available
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { approveUserRole } from './_actions/userActions'; // Server action
import { toast } from 'sonner';

interface ApproveUserDialogProps {
  userId: string;
  userName: string;
}

export const ApproveUserDialog: React.FC<ApproveUserDialogProps> = ({ userId, userName }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | ''>(Role.ASSEMBLER); // Default to Assembler
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Roles that can be assigned (excluding PENDING_APPROVAL)
  const assignableRoles = Object.values(Role).filter(r => r !== "PENDING_APPROVAL");

  const handleApprove = async () => {
    if (!selectedRole || selectedRole === "PENDING_APPROVAL") {
      toast.error('Please select a valid role to assign.');
      return;
    }
    
    setIsSubmitting(true);
    try {
      const result = await approveUserRole(userId, selectedRole);
      if (result?.success) {
        toast.success(`User ${userName} approved as ${selectedRole.replace('_',' ')}.`);
        setIsOpen(false); // Close dialog on success
      } else {
        throw new Error(result?.error || 'Failed to approve user.');
      }
    } catch (error) {
      console.error("Approval error:", error);
      toast.error('Approval Failed', {
        description: error instanceof Error ? error.message : 'An unexpected error occurred.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Button onClick={() => setIsOpen(true)} size="sm">
        Approve
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Approve User: {userName}</DialogTitle>
            <DialogDescription>
              Select a role to assign to this user. They will gain access based on the assigned role.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="role" className="text-right text-sm font-medium">
                Assign Role
              </label>
              <Select 
                 value={selectedRole}
                 onValueChange={(value: Role) => setSelectedRole(value)}
              >
                <SelectTrigger id="role" className="col-span-3">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {assignableRoles.map((role) => (
                     <SelectItem key={role} value={role}>
                       {role.replace('_', ' ')}
                     </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleApprove} disabled={isSubmitting || !selectedRole}>
              {isSubmitting ? 'Approving...' : 'Approve User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}; 