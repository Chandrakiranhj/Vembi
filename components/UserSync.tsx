'use client';

import { useEffect, useState, useRef } from 'react';
import { useUser, useAuth, useSession } from '@clerk/nextjs';
import { toast } from 'sonner';

/**
 * This component syncs the Clerk user data to our own database.
 * It should be added to the dashboard layout or any authenticated layout.
 * Optimized for performance with debouncing and memoization.
 */
export default function UserSync() {
  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();
  const { session } = useSession();
  const [isSyncing, setIsSyncing] = useState(false);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasSyncedRef = useRef(false);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    // Only run sync when the user data is loaded and user exists
    if (!isLoaded || !user || !session) {
      return;
    }
    
    // Avoid multiple syncs and only sync once per session
    if (isSyncing || hasSyncedRef.current) return;
    
    // Add a small delay before syncing to avoid blocking UI
    syncTimeoutRef.current = setTimeout(async () => {
      try {
        setIsSyncing(true);
        
        // Get the session token
        const token = await getToken();
        if (!token) {
          console.error('No authentication token available');
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
          // Add cache control
          cache: 'no-store',
        });

        // Check if the response is HTML (error page)
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('text/html')) {
          throw new Error('Server returned an error page. Please try again later.');
        }
        
        // Handle unauthorized response quietly
        if (response.status === 401) {
          const authMessage = response.headers.get('x-clerk-auth-message');
          console.error('Unauthorized access:', authMessage);
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
        
        // If response is ok, mark as synced
        hasSyncedRef.current = true;
        console.log('User data synced successfully');
        
      } catch (error) {
        console.error('Error syncing user data:', error);
        // Only show errors in development
        if (process.env.NODE_ENV === 'development') {
          toast.error('User Sync Error', {
            description: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      } finally {
        setIsSyncing(false);
      }
    }, 500); // Small delay to avoid blocking UI
  }, [isLoaded, user, isSyncing, getToken, session]);

  // This is a background process - doesn't render anything
  return null;
} 