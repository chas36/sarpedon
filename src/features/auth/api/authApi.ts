import { supabase } from '@/shared/lib/supabase';
import type { LoginCredentials } from '@/shared/types';

export async function login(credentials: LoginCredentials) {
  // Пользователи входят по логину, но Supabase требует email
  let email = credentials.login;

  // Если это не email (нет @), пробуем найти email в профиле через secure function
  if (!email.includes('@')) {
    try {
      const { data, error } = await supabase.rpc('lookup_email_by_login', {
        login_input: credentials.login
      });

      if (!error && data) {
        email = data;
      }
    } catch (e) {
      // Игнорируем ошибки, используем логин как есть
      console.warn('Could not fetch profile email, using login as-is');
    }
  }

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
