'use client';

import { useEffect, useState } from 'react';
import { useUser, useAuth, useSession } from '@clerk/nextjs';
import { toast } from 'sonner';

/**
 * This component syncs the Clerk user data to our own database.
 * It should be added to the dashboard layout or any authenticated layout.
 */
export default function UserSync() {
  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();
  const { session } = useSession();
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    // Only run sync when the user data is loaded and user exists
    if (!isLoaded || !user || !session) {
      console.log('Waiting for user data to load:', { isLoaded, user, session });
      return;
    }
    
    // Avoid multiple syncs
    if (isSyncing) return;
    
    const syncUser = async () => {
      try {
        setIsSyncing(true);
        
        // Get the session token
        const token = await getToken();
        if (!token) {
          console.error('No authentication token available');
          toast.error('Authentication Error', {
            description: 'Please sign in again to continue.',
          });
          return;
        }
        
        // Extract relevant user data
        const userData = {
          userId: user.id,
          name: user.fullName || user.firstName + ' ' + user.lastName || 'Unknown Name',
          email: user.primaryEmailAddress?.emailAddress || '',
          image: user.imageUrl || undefined
        };
        
        // POST to our own API to create/update the user record
        const response = await fetch('/api/users/sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(userData),
        });

        // Check if the response is HTML (error page)
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('text/html')) {
          throw new Error('Server returned an error page. Please try again later.');
        }
        
        // Handle unauthorized response
        if (response.status === 401) {
          const authMessage = response.headers.get('x-clerk-auth-message');
          console.error('Unauthorized access:', authMessage);
          
          if (authMessage?.includes('JWT issued at date claim (iat) is in the future')) {
            toast.error('Time Synchronization Error', {
              description: 'Your system clock is out of sync. Please check your system time and try again.',
            });
          } else {
            toast.error('Authentication Error', {
              description: 'Your session has expired. Please sign in again.',
            });
          }
          return;
        }
        
        // First check if the response is ok
        if (!response.ok) {
          // Try to parse the error response
          let errorMessage = 'Failed to sync user';
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorMessage;
          } catch {
            // If we can't parse the error response, use the status text
            errorMessage = response.statusText || errorMessage;
          }
          throw new Error(errorMessage);
        }
        
        // If response is ok, try to parse the success response
        try {
          const data = await response.json();
          if (data.success) {
            console.log('User data synced successfully');
          } else {
            throw new Error(data.error || 'Failed to sync user');
          }
        } catch {
          throw new Error('Failed to parse server response');
        }
      } catch (error) {
        console.error('Error syncing user data:', error);
        let message = 'Failed to sync user data';
        
        if (error instanceof Error) {
          message = error.message;
        }
        
        toast.error('User Sync Error', {
          description: message,
        });
      } finally {
        setIsSyncing(false);
      }
    };

    syncUser();
  }, [isLoaded, user, isSyncing, getToken, session]);

  // This is a background process - doesn't render anything
  return null;
} 