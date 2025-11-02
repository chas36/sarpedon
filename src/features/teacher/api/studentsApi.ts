import { supabase } from '@/shared/lib/supabase';
import type { Profile } from '@/shared/types';

/**
 * Get all students (for teachers)
 */
export async function getAllStudents(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'student')
    .order('last_name', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Get students by class
 */
export async function getStudentsByClass(className: string): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'student')
    .eq('class', className)
    .order('last_name', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Get student by ID with progress statistics
 */
export interface StudentWithProgress extends Profile {
  total_levels?: number;
  completed_levels?: number;
  in_progress_levels?: number;
  total_submissions?: number;
  success_rate?: number;
}

export async function getStudentWithProgress(studentId: string): Promise<StudentWithProgress> {
  // Get student profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', studentId)
    .single();

  if (profileError) throw profileError;

  // Get progress statistics
  const { data: progressData, error: progressError } = await supabase
    .from('user_progress')
    .select('status')
    .eq('user_id', studentId);

  if (progressError) throw progressError;

  const completed = progressData?.filter(p => p.status === 'completed').length || 0;
  const inProgress = progressData?.filter(p => p.status === 'in_progress').length || 0;
  const total = progressData?.length || 0;

  // Get submission statistics
  const { data: submissions, error: submissionsError } = await supabase
    .from('submissions')
    .select('is_correct')
    .eq('user_id', studentId);

  if (submissionsError) throw submissionsError;

  const totalSubmissions = submissions?.length || 0;
  const successfulSubmissions = submissions?.filter(s => s.is_correct).length || 0;
  const successRate = totalSubmissions > 0
    ? Math.round((successfulSubmissions / totalSubmissions) * 100)
    : 0;

  return {
    ...profile,
    total_levels: total,
    completed_levels: completed,
    in_progress_levels: inProgress,
    total_submissions: totalSubmissions,
    success_rate: successRate
  };
}

/**
 * Get student's submissions for a specific level
 */
export async function getStudentLevelSubmissions(studentId: string, levelId: string) {
  const { data, error } = await supabase
    .from('submissions')
    .select('*')
    .eq('user_id', studentId)
    .eq('level_id', levelId)
    .order('submitted_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Get all unique classes
 */
export async function getAllClasses(): Promise<string[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('class')
    .eq('role', 'student')
    .not('class', 'is', null);

  if (error) throw error;

  // Get unique classes
  const classes = [...new Set(data?.map(p => p.class).filter(Boolean))];
  return classes.sort();
}
