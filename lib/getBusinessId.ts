import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { SupabaseClient } from '@supabase/supabase-js';

export async function getBusinessId(userId: string): Promise<string | null> {
    const cookieStore = await cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() {
              return cookieStore.getAll()
            },
            setAll(cookiesToSet) {
              try {
                cookiesToSet.forEach(({ name, value, options }) =>
                  cookieStore.set(name, value, options)
                )
              } catch {
                // The `setAll` method was called from a Server Component.
                // This can be ignored if you have middleware refreshing
                // user sessions.
              }
            },
          },
        }
    );
    return getBusinessIdWithSupa(userId, supabase);
}

export async function getBusinessIdWithSupa(userId: string, supabase: SupabaseClient): Promise<string | null> {
     const { data, error } = await supabase
        .from('businesses')
        .select('id')
        .eq('user_id', userId)
        .single();

    if (error || !data) {
        console.error('Error fetching business ID:', error?.message);
        return null;
    }

    return data.id;
} 