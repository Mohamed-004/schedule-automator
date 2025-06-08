'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase-client'
import { User, Session } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signInAnonymously: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signInAnonymously: async () => {}
})

export function useAuth() {
  return useContext(AuthContext)
}

export function SimpleAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user || null)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email)
        setSession(session)
        setUser(session?.user || null)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signInAnonymously = async () => {
    try {
      const { data, error } = await supabase.auth.signInAnonymously()
      if (error) throw error
      console.log('Signed in anonymously:', data.user?.id)
    } catch (error) {
      console.error('Anonymous sign-in failed:', error)
      throw error
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        signInAnonymously
      }}
    >
      {children}
    </AuthContext.Provider>
  )
} 