import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder';

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.warn('Supabase URL and Anon Key are missing. Backend features will be disabled.');
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
