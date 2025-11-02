import { supabase } from '@/shared/lib/supabase';
import type { Profile } from '@/shared/types';
import { generateUniqueLogin } from '../utils/loginGenerator';

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

// ============================================================
// CRUD Operations for Student Management
// ============================================================

/**
 * Create new student
 */
export async function createStudent(data: {
  firstName: string;
  lastName: string;
  className: string;
  login?: string;
  password?: string;
}): Promise<Profile> {
  // Generate login if not provided
  const login = data.login || await generateUniqueLogin();
  const password = data.password || login;

  // Create auth user with temporary email
  const email = `${login}@sarpedon.local`;

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (authError) throw authError;
  if (!authData.user) throw new Error('Failed to create user');

  // Create profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .insert({
      id: authData.user.id,
      first_name: data.firstName,
      last_name: data.lastName,
      role: 'student',
      class: data.className,
      generated_login: login,
      generated_password: password,
    })
    .select()
    .single();

  if (profileError) throw profileError;
  return profile;
}

/**
 * Bulk create students
 */
export async function bulkCreateStudents(
  students: Array<{
    firstName: string;
    lastName: string;
    className: string;
    login?: string;
  }>
): Promise<{
  success: Profile[];
  errors: Array<{ student: any; error: string }>;
}> {
  const success: Profile[] = [];
  const errors: Array<{ student: any; error: string }> = [];

  for (const student of students) {
    try {
      const created = await createStudent(student);
      success.push(created);
    } catch (error) {
      errors.push({
        student,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return { success, errors };
}

/**
 * Update student profile
 */
export async function updateStudent(
  id: string,
  data: {
    firstName?: string;
    lastName?: string;
    className?: string;
  }
): Promise<Profile> {
  const updates: any = {};
  if (data.firstName) updates.first_name = data.firstName;
  if (data.lastName) updates.last_name = data.lastName;
  if (data.className !== undefined) updates.class = data.className;

  const { data: profile, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return profile;
}

/**
 * Delete student
 */
export async function deleteStudent(id: string): Promise<void> {
  // Delete auth user (cascade will delete profile via FK)
  const { error } = await supabase.auth.admin.deleteUser(id);
  if (error) throw error;
}

/**
 * Reset password (password = login)
 */
export async function resetPassword(id: string): Promise<void> {
  // Get student's login
  const { data: student, error: fetchError } = await supabase
    .from('profiles')
    .select('generated_login')
    .eq('id', id)
    .single();

  if (fetchError) throw fetchError;
  if (!student.generated_login) throw new Error('Student has no login');

  // Update password in auth
  const { error: authError } = await supabase.auth.admin.updateUserById(id, {
    password: student.generated_login,
  });

  if (authError) throw authError;

  // Update generated_password in profile
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ generated_password: student.generated_login })
    .eq('id', id);

  if (profileError) throw profileError;
}

/**
 * Update credentials (login and password)
 */
export async function updateCredentials(
  id: string,
  login: string,
  password: string
): Promise<void> {
  // Update password in auth
  const { error: authError } = await supabase.auth.admin.updateUserById(id, {
    password,
  });

  if (authError) throw authError;

  // Update login and password in profile
  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      generated_login: login,
      generated_password: password,
    })
    .eq('id', id);

  if (profileError) throw profileError;
}
