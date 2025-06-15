'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSupabase } from '@/lib/SupabaseProvider';

export default function SignOutPage() {
  const { supabase } = useSupabase();
  const router = useRouter();

  useEffect(() => {
    const signOut = async () => {
      await supabase.auth.signOut();
      router.push('/auth/login');
    };
    signOut();
  }, [supabase, router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-lg">Signing out...</p>
    </div>
  );
} 