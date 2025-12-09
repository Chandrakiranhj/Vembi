'use client';

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function SignOutPage() {
    const router = useRouter();
    const supabase = createClient();

    useEffect(() => {
        const signOut = async () => {
            await supabase.auth.signOut();
            router.push('/sign-in');
        };
        signOut();
    }, [router, supabase]);

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
            <div className="text-center">
                <h1 className="text-2xl font-bold text-gray-900">Signing out...</h1>
                <p className="mt-2 text-gray-600">Please wait while we sign you out.</p>
            </div>
        </div>
    );
}
