import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL and Anon Key must be provided in .env file')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function getUserAvatar(userId) {
  if (!userId) return null;
  const { data, error } = await supabase
    .from('custom_cards')
    .select('*')
    .eq('user_id', userId)
    .eq('is_avatar', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    console.error('Error fetching avatar:', error.message);
    return null;
  }
  return data;
}
