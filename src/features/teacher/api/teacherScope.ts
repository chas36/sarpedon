import { supabase } from '@/shared/lib/supabase';

export async function getCurrentTeacherId(): Promise<string> {
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error) throw error;
  if (!user) throw new Error('Пользователь не авторизован');

  return user.id;
}

export async function getTeacherOwnedClassNames(): Promise<string[]> {
  const teacherId = await getCurrentTeacherId();

  const { data, error } = await supabase
    .from('classes')
    .select('name')
    .eq('created_by', teacherId)
    .order('name', { ascending: true });

  if (error) throw error;

  return data?.map((item) => item.name) ?? [];
}
