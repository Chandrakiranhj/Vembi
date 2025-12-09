'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, ArrowRight, Shield } from 'lucide-react'

export default function SignUp() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [fullName, setFullName] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const router = useRouter()
    const supabase = createClient()

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            const { error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName,
                    },
                    emailRedirectTo: `${location.origin}/auth/callback`,
                },
            })

            if (error) {
                setError(error.message)
            } else {
                router.push('/dashboard?message=Check your email for confirmation')
            }
        } catch (err) {
            setError('An unexpected error occurred')
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-[#0F172A] flex flex-col items-center justify-center p-4 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-slate-800/20 blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-slate-800/10 blur-[120px] pointer-events-none" />

            <div className="w-full max-w-md space-y-8 relative z-10">
                <div className="text-center space-y-2">
                    <div className="inline-flex items-center justify-center h-16 w-48 mb-4">
                        <img
                            src="/logo_vembi.svg"
                            alt="Vembi Logo"
                            className="h-full w-full object-contain brightness-0 invert"
                        />
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight text-white">Create Account</h1>
                    <p className="text-slate-400">Join the Vembi Quality Control Platform</p>
                </div>

                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
                    <form onSubmit={handleSignUp} className="space-y-6">
                        {error && (
                            <Alert variant="destructive" className="bg-red-500/10 border-red-500/20 text-red-400">
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="fullName" className="text-slate-300">Full Name</Label>
                            <Input
                                id="fullName"
                                placeholder="John Doe"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                required
                                className="bg-slate-900/50 border-white/10 text-white placeholder:text-slate-600 focus:border-slate-500 focus:ring-slate-500"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-slate-300">Email Address</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="name@vembi.in"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="bg-slate-900/50 border-white/10 text-white placeholder:text-slate-600 focus:border-slate-500 focus:ring-slate-500"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-slate-300">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="bg-slate-900/50 border-white/10 text-white placeholder:text-slate-600 focus:border-slate-500 focus:ring-slate-500"
                            />
                        </div>

                        <Button
                            type="submit"
                            className="w-full bg-white text-slate-900 hover:bg-slate-200 font-bold h-11"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Creating account...
                                </>
                            ) : (
                                <>
                                    Sign Up <ArrowRight className="ml-2 h-4 w-4" />
                                </>
                            )}
                        </Button>
                    </form>

                    <div className="mt-6 text-center text-sm">
                        <span className="text-slate-500">Already have an account? </span>
                        <Link href="/sign-in" className="text-white hover:underline font-medium">
                            Sign in
                        </Link>
                    </div>
                </div>

                <div className="text-center text-xs text-slate-600 flex items-center justify-center gap-2">
                    <Shield className="h-3 w-3" />
                    Secure Internal System
                </div>
            </div>
        </div>
    )
}
