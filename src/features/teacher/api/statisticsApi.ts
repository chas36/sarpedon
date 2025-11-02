import { supabase } from '@/shared/lib/supabase';
import type { Profile, Level, Submission } from '@/shared/types';
import { calculateSuccessRate, calculateCompletionRate } from '../utils/statsCalculations';

/**
 * Get overall statistics for all students
 */
export async function getOverallStatistics(): Promise<{
  totalStudents: number;
  totalLevels: number;
  totalSubmissions: number;
  averageSuccessRate: number;
  activeStudentsLast7Days: number;
}> {
  // Get total students count
  const { count: totalStudents } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'student');

  // Get total levels count
  const { count: totalLevels } = await supabase
    .from('levels')
    .select('*', { count: 'exact', head: true });

  // Get all submissions
  const { data: submissions } = await supabase
    .from('submissions')
    .select('is_correct, user_id, submitted_at');

  const totalSubmissions = submissions?.length || 0;
  const successfulSubmissions = submissions?.filter(s => s.is_correct).length || 0;
  const averageSuccessRate = calculateSuccessRate(successfulSubmissions, totalSubmissions);

  // Get active students in last 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const activeStudents = new Set(
    submissions
      ?.filter(s => new Date(s.submitted_at) >= sevenDaysAgo)
      .map(s => s.user_id)
  );

  return {
    totalStudents: totalStudents || 0,
    totalLevels: totalLevels || 0,
    totalSubmissions,
    averageSuccessRate,
    activeStudentsLast7Days: activeStudents.size,
  };
}

/**
 * Get top students by completed levels
 */
export async function getTopStudents(limit: number = 10): Promise<
  Array<{
    student: Profile;
    completedLevels: number;
    successRate: number;
    rank: number;
  }>
> {
  // Get all students
  const { data: students } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'student');

  if (!students) return [];

  // Get progress for all students
  const { data: progress } = await supabase
    .from('level_progress')
    .select('user_id, status');

  // Get submissions for success rate
  const { data: submissions } = await supabase
    .from('submissions')
    .select('user_id, is_correct');

  // Calculate stats for each student
  const studentsWithStats = students.map(student => {
    const studentProgress = progress?.filter(p => p.user_id === student.id) || [];
    const completedLevels = studentProgress.filter(p => p.status === 'completed').length;

    const studentSubmissions = submissions?.filter(s => s.user_id === student.id) || [];
    const successRate = calculateSuccessRate(
      studentSubmissions.filter(s => s.is_correct).length,
      studentSubmissions.length
    );

    return {
      student,
      completedLevels,
      successRate,
    };
  });

  // Sort and return top N
  return studentsWithStats
    .sort((a, b) => {
      if (b.completedLevels !== a.completedLevels) {
        return b.completedLevels - a.completedLevels;
      }
      return b.successRate - a.successRate;
    })
    .slice(0, limit)
    .map((s, index) => ({ ...s, rank: index + 1 }));
}
