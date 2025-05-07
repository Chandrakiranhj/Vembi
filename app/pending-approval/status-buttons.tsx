"use client";

import { useState } from "react";
import { RefreshCw, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface StatusButtonsProps {
  userId: string | null;
}

export default function StatusButtons({ userId }: StatusButtonsProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const handleRefresh = () => {
    // Prevent multiple rapid clicks
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    
    // Refresh the page and provide user feedback
    window.location.reload();
    
    // This timeout isn't needed as page will reload, but added as a fallback
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  return (
    <div className="space-y-3">
      <Button 
        variant="outline" 
        className="w-full flex items-center justify-center relative" 
        onClick={handleRefresh}
        disabled={isRefreshing}
      >
        {isRefreshing ? (
          <>
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> 
            <span>Refreshing...</span>
          </>
        ) : (
          <>
            <RefreshCw className="h-4 w-4 mr-2" /> 
            <span>Check Status</span>
          </>
        )}
      </Button>
      
      <Button 
        variant="outline" 
        className="w-full flex items-center justify-center"
        asChild
      >
        <Link 
          href={`mailto:support@vembi.com?subject=Account%20Approval%20Status&body=Hello%20VEMBI%20support,%0A%0AI%20recently%20registered%20for%20an%20account%20and%20would%20like%20to%20check%20on%20the%20status%20of%20my%20approval.%0A%0AMy%20account%20ID:%20${userId}%0A%0AThank%20you!`}
          prefetch={false}
        >
          <Mail className="h-4 w-4 mr-2" /> Email Support
        </Link>
      </Button>
    </div>
  );
} 