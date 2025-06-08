import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { SupabaseClient } from '@supabase/supabase-js';

export async function getBusinessId(userId: string): Promise<string | null> {
    const cookieStore = cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            get(name: string) {
              return cookieStore.get(name)?.value;
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