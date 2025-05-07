import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <SignIn 
        appearance={{
          elements: {
            formButtonPrimary: 'bg-[#8B2131] hover:bg-[#6D1A27] text-white',
            footerActionLink: 'text-[#8B2131] hover:text-[#6D1A27]'
          }
        }}
        redirectUrl="/api/auth/clerk-redirect"
      />
    </div>
  );
} 