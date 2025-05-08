'use client';

import { SignUp } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function SignUpPage() {
  return (
    <div className="flex flex-col min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md">
        <SignUp 
          appearance={{
            elements: {
              formButtonPrimary: 'bg-[#8B2131] hover:bg-[#6D1A27] text-white',
              footerActionLink: 'text-[#8B2131] hover:text-[#6D1A27]'
            }
          }}
          redirectUrl="/api/auth/force-create"
          afterSignUpUrl="/api/auth/force-create"
        />
      </div>
    </div>
  );
} 