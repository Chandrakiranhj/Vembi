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
          afterSignUpUrl="/api/auth/force-create"
        />
      </div>
      
      {/* Helpful information for users who get stuck */}
      <div className="mt-8 text-center max-w-md px-4">
        <p className="text-sm text-gray-500 mb-2">
          Already signed up but not seeing your account?
        </p>
        <Button asChild variant="outline" size="sm">
          <Link href="/api/auth/force-create">
            Go to Account Setup
          </Link>
        </Button>
      </div>
    </div>
  );
} 