import { supabase } from '@/shared/lib/supabase';
import type { LoginCredentials } from '@/shared/types';

export async function login(credentials: LoginCredentials) {
  // Check if login is already an email (contains @)
  // If yes, use it directly. If not, append @students.sarpedon.edu
  const email = credentials.login.includes('@')
    ? credentials.login
    : `${credentials.login}@students.sarpedon.edu`;

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
