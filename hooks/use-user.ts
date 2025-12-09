import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'

export function useUser() {
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    useEffect(() => {
        const getUser = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser()
                setUser(user)
            } catch (error) {
                console.error('Error getting user:', error)
            } finally {
                setLoading(false)
            }
        }

        getUser()

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null)
            setLoading(false)
        })

        return () => {
            subscription.unsubscribe()
        }
    }, [])

    return {
        user,
        isLoaded: !loading,
        isSignedIn: !!user,
    }
}

export function useAuth() {
    const { user, isLoaded, isSignedIn } = useUser();
    return {
        userId: user?.id,
        sessionId: null, // Supabase doesn't expose session ID the same way
        getToken: async () => {
            const supabase = createClient();
            const { data } = await supabase.auth.getSession();
            return data.session?.access_token;
        },
        isLoaded,
        isSignedIn,
        signOut: async () => {
            const supabase = createClient();
            await supabase.auth.signOut();
        }
    }
}
