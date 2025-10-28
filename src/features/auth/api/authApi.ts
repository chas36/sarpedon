import { supabase } from '@/shared/lib/supabase';
import type { LoginCredentials } from '@/shared/types';

export async function login(credentials: LoginCredentials) {
  // For now, we use email/password auth
  // Later we'll map generated_login to email
  const email = `${credentials.login}@sarpedon.local`;

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: credentials.password
  });

  if (error) throw error;
  return data;
}

export async function logout() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
}

export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data;
}
