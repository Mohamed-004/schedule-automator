"use client"
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { supabase } from './supabaseClient'
import type { Session } from '@supabase/supabase-js'

interface SupabaseContextType {
  supabase: typeof supabase;
  session: Session | null;
  user: any;
  loading: boolean;
}

const SupabaseContext = createContext<SupabaseContextType | null>(null)

export function SupabaseProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    let authListener: any = null

    // Get initial session
    const getSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error) {
          console.error('Error getting session:', error)
        } else if (mounted) {
          setSession(session)
          setUser(session?.user ?? null)
        }
      } catch (error) {
        if (mounted) {
          console.error('Session fetch error:', error)
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    getSession()

    // Listen for auth changes - only set up once
    try {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, newSession) => {
          if (!mounted) return

          // Only log important auth events to reduce console noise
          if (event !== 'INITIAL_SESSION') {
            console.log('Auth state changed:', event)
          }
          
          setSession(newSession)
          setUser(newSession?.user ?? null)
          setLoading(false)
        }
      )
      
      authListener = subscription
    } catch (error) {
      console.error('Error setting up auth listener:', error)
      setLoading(false)
    }

    return () => {
      mounted = false
      if (authListener) {
        authListener.unsubscribe()
      }
    }
  }, [])

  const value = {
    supabase,
    session,
    user,
    loading
  }

  return (
    <SupabaseContext.Provider value={value}>
      {children}
    </SupabaseContext.Provider>
  )
}

export function useSupabase() {
  const context = useContext(SupabaseContext)
  if (!context) {
    throw new Error('useSupabase must be used within a SupabaseProvider')
  }
  return context
} 