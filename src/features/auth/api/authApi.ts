import { supabase } from '@/shared/lib/supabase';
import type { LoginCredentials } from '@/shared/types';

export async function login(credentials: LoginCredentials) {
  // Пользователи входят по логину, но Supabase требует email
  // Если это уже email - используем его, если нет - ищем по логину в профиле
  let email = credentials.login;

  if (!email.includes('@')) {
    // Это логин, нужно найти email в profiles
    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('generated_login', credentials.login)
      .single();

    if (profile?.email) {
      email = profile.email;
    } else {
      // Если профиль не найден, пытаемся войти как есть
      // (может быть teacher с реальным email)
      email = credentials.login;
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
