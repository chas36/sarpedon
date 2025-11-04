import { supabase } from '@/shared/lib/supabase';

export interface Class {
  id: string;
  name: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  student_count?: number;
}

/**
 * Get all classes ordered by name with student count
 */
export async function getAllClasses(): Promise<Class[]> {
  // Get all classes
  const { data: classes, error: classesError } = await supabase
    .from('classes')
    .select('*')
    .order('name', { ascending: true });

  if (classesError) throw classesError;
  if (!classes) return [];

  // Get student counts for each class
  const classesWithCounts = await Promise.all(
    classes.map(async (cls) => {
      const count = await getClassStudentCount(cls.name);
      return {
        ...cls,
        student_count: count
      };
    })
  );

  return classesWithCounts;
}

/**
 * Create new class
 */
export async function createClass(name: string): Promise<Class> {
  const { data, error } = await supabase
    .from('classes')
    .insert({ name })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update class name
 */
export async function updateClass(id: string, name: string): Promise<Class> {
  const { data, error } = await supabase
    .from('classes')
    .update({ name })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete class
 */
export async function deleteClass(id: string): Promise<void> {
  const { error } = await supabase
    .from('classes')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

/**
 * Get number of students in class
 */
export async function getClassStudentCount(className: string): Promise<number> {
  const { count, error } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'student')
    .eq('class', className);

  if (error) throw error;
  return count || 0;
}
