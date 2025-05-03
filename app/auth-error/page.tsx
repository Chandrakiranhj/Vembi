'use client';

import { useSearchParams } from "next/navigation";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Suspense } from "react";

// Error messages based on reason code
const errorMessages: Record<string, { title: string; description: string }> = {
  clerkError: {
    title: "Authentication Service Error",
    description: "We're having trouble connecting to our authentication service. Please try again later."
  },
  missingEmail: {
    title: "Email Not Found",
    description: "We couldn't find an email address associated with your account. Please ensure you've verified your email."
  },
  invalidRole: {
    title: "Account Role Issue",
    description: "There was an issue with your account role. Please contact support for assistance."
  },
  serverError: {
    title: "Server Error",
    description: "An unexpected error occurred on our servers. Please try again later or contact support if the issue persists."
  },
  databaseError: {
    title: "Database Error",
    description: "We encountered an issue with our database while setting up your account. Please try again or contact support."
  }
};

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const reason = searchParams?.get('reason') || 'serverError';
  const detail = searchParams?.get('detail');
  
  const errorInfo = errorMessages[reason] || errorMessages.serverError;
  
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 text-center">{errorInfo.title}</h1>
          <p className="mt-2 text-gray-600 text-center">{errorInfo.description}</p>
          
          {detail && (
            <div className="mt-4 bg-gray-50 p-3 rounded-md text-xs text-gray-600 w-full overflow-x-auto">
              <p className="font-mono">{detail}</p>
            </div>
          )}
        </div>
        
        <div className="space-y-3">
          <Button asChild variant="default" className="w-full">
            <Link href="/api/auth/force-create">
              Create Account & Continue
            </Link>
          </Button>
          
          <Button asChild variant="outline" className="w-full">
            <Link href="/api/auth/clerk-redirect">
              Retry Account Setup
            </Link>
          </Button>
          
          <div className="pt-2">
            <Button asChild variant="ghost" className="w-full">
              <Link href="/" className="flex items-center justify-center">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse text-gray-500">Loading error details...</div>
      </div>
    }>
      <AuthErrorContent />
    </Suspense>
  );
} 