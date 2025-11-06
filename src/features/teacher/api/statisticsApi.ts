import { supabase } from '@/shared/lib/supabase';
import type { Profile, Level, Submission } from '@/shared/types';
import {
  calculateSuccessRate,
  calculateCompletionRate,
  identifyStrugglingStudents,
  groupStudentsByProgress,
  aggregateActivityByDay,
  calculateAverageTime,
} from '../utils/statsCalculations';
import { fillMissingDays } from '../utils/dateUtils';

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
    .select('status, user_id, submitted_at');

  const totalSubmissions = submissions?.length || 0;
  const successfulSubmissions = submissions?.filter(s => s.status === 'passed').length || 0;
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
    .select('student_id, status');

  // Get submissions for success rate
  const { data: submissions } = await supabase
    .from('submissions')
    .select('user_id, status');

  // Calculate stats for each student
  const studentsWithStats = students.map(student => {
    const studentProgress = progress?.filter(p => p.student_id === student.id) || [];
    const completedLevels = studentProgress.filter(p => p.status === 'completed').length;

    const studentSubmissions = submissions?.filter(s => s.user_id === student.id) || [];
    const successRate = calculateSuccessRate(
      studentSubmissions.filter(s => s.status === 'passed').length,
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

/**
 * Get struggling students who need attention
 */
export async function getStrugglingStudents(): Promise<
  Array<{
    student: Profile;
    completedLevels: number;
    successRate: number;
    lastActivityDate: string | null;
    issue: 'low_success' | 'low_activity' | 'inactive';
  }>
> {
  // 1. Get all students
  const { data: students } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'student');

  if (!students) return [];

  // 2. Get progress for all students
  const { data: progress } = await supabase
    .from('level_progress')
    .select('student_id, status');

  // 3. Get submissions for success rate and last activity
  const { data: submissions } = await supabase
    .from('submissions')
    .select('user_id, status, submitted_at')
    .order('submitted_at', { ascending: false });

  // 4. Calculate stats and identify struggling students
  const studentsWithStats = students.map(student => {
    const studentProgress = progress?.filter(p => p.student_id === student.id) || [];
    const completedLevels = studentProgress.filter(p => p.status === 'completed').length;

    const studentSubmissions = submissions?.filter(s => s.user_id === student.id) || [];
    const successRate = calculateSuccessRate(
      studentSubmissions.filter(s => s.status === 'passed').length,
      studentSubmissions.length
    );

    const lastActivity = studentSubmissions[0]?.submitted_at || null;

    return {
      ...student,
      completedLevels,
      successRate,
      lastActivity,
    };
  });

  // 5. Use identifyStrugglingStudents utility
  const strugglingStudents = identifyStrugglingStudents(studentsWithStats, {
    minSuccessRate: 50,
    minCompletedLevels: 3,
    inactiveDays: 7,
  });

  // 6. Format result to match expected return type
  return strugglingStudents.map(s => ({
    student: {
      id: s.id,
      email: s.email,
      full_name: s.full_name,
      role: s.role,
      created_at: s.created_at,
      updated_at: s.updated_at,
    },
    completedLevels: s.completedLevels || 0,
    successRate: s.successRate || 0,
    lastActivityDate: s.lastActivity || null,
    issue: s.issue,
  }));
}

/**
 * Get recent activity across the platform
 */
export async function getRecentActivity(limit: number = 20): Promise<
  Array<Submission & { student: Profile; level: Level }>
> {
  const { data: submissions } = await supabase
    .from('submissions')
    .select(`
      *,
      student:profiles!user_id(*),
      level:levels(*)
    `)
    .order('submitted_at', { ascending: false })
    .limit(limit);

  if (!submissions) return [];

  return submissions;
}

/**
 * Get progress over time for all students
 */
export async function getProgressOverTime(days: number = 30): Promise<
  Array<{
    date: string;
    count: number;
  }>
> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data: progress } = await supabase
    .from('level_progress')
    .select('completed_at, status')
    .eq('status', 'completed')
    .gte('completed_at', startDate.toISOString());

  if (!progress) return [];

  // Aggregate by day
  const activityByDay = aggregateActivityByDay(
    progress.map(p => ({ submitted_at: p.completed_at }))
  );

  // Fill missing days
  return fillMissingDays(activityByDay, days);
}

/**
 * Get distribution of students by progress percentage
 */
export async function getStudentsDistribution(): Promise<{
  '0-25': number;
  '25-50': number;
  '50-75': number;
  '75-100': number;
}> {
  // Get all students
  const { data: students } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'student');

  if (!students) return { '0-25': 0, '25-50': 0, '50-75': 0, '75-100': 0 };

  // Get total levels count
  const { count: totalLevels } = await supabase
    .from('levels')
    .select('*', { count: 'exact', head: true });

  // Get progress for all students
  const { data: progress } = await supabase
    .from('level_progress')
    .select('student_id, status');

  // Calculate completed levels for each student
  const studentsWithProgress = students.map(student => {
    const studentProgress = progress?.filter(p => p.student_id === student.id) || [];
    const completedLevels = studentProgress.filter(p => p.status === 'completed').length;

    return {
      completedLevels,
      totalLevels: totalLevels || 1,
    };
  });

  // Use groupStudentsByProgress utility
  return groupStudentsByProgress(studentsWithProgress);
}

/**
 * Get aggregated activity for heatmap
 */
export async function getAggregatedActivity(days: number = 60): Promise<
  Array<{
    date: string;
    activityCount: number;
  }>
> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data: submissions } = await supabase
    .from('submissions')
    .select('submitted_at')
    .gte('submitted_at', startDate.toISOString());

  if (!submissions) return [];

  // Aggregate by day
  const activityByDay = aggregateActivityByDay(submissions);

  // Fill missing days and rename field
  const filledData = fillMissingDays(activityByDay, days);

  return filledData.map(d => ({
    date: d.date,
    activityCount: d.count,
  }));
}

/**
 * Get all submissions for a student with level data
 */
export async function getStudentSubmissions(
  studentId: string
): Promise<Array<Submission & { level: Level }>> {
  const { data: submissions } = await supabase
    .from('submissions')
    .select(`
      *,
      level:levels(*)
    `)
    .eq('user_id', studentId)
    .order('submitted_at', { ascending: false });

  if (!submissions) return [];

  return submissions;
}

/**
 * Get student progress for each level
 */
export async function getStudentLevelProgress(
  studentId: string
): Promise<
  Array<{
    level: Level;
    status: 'not_started' | 'in_progress' | 'completed';
    attempts: number;
    timeSpent: number;
    lastAttempt: string | null;
    isCorrect: boolean;
  }>
> {
  // Get all levels
  const { data: levels } = await supabase
    .from('levels')
    .select('*')
    .order('order_index', { ascending: true });

  if (!levels) return [];

  // Get student's progress
  const { data: progress } = await supabase
    .from('level_progress')
    .select('*')
    .eq('student_id', studentId);

  // Get student's submissions
  const { data: submissions } = await supabase
    .from('submissions')
    .select('*')
    .eq('user_id', studentId);

  // Build progress for each level
  return levels.map(level => {
    const levelProgress = progress?.find(p => p.level_id === level.id);
    const levelSubmissions = submissions?.filter(s => s.level_id === level.id) || [];

    const attempts = levelSubmissions.length;
    const timeSpent = 0; // execution_time_ms not available in submissions table
    const lastSubmission = levelSubmissions[0] || null;
    const isCorrect = levelSubmissions.some(s => s.status === 'passed');

    let status: 'not_started' | 'in_progress' | 'completed' = 'not_started';
    if (levelProgress) {
      status = levelProgress.status as 'not_started' | 'in_progress' | 'completed';
    } else if (attempts > 0) {
      status = 'in_progress';
    }

    return {
      level,
      status,
      attempts,
      timeSpent,
      lastAttempt: lastSubmission?.submitted_at || null,
      isCorrect,
    };
  });
}

/**
 * Get student activity over time
 */
export async function getStudentActivity(
  studentId: string,
  days: number = 30
): Promise<Array<{ date: string; count: number }>> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data: submissions } = await supabase
    .from('submissions')
    .select('submitted_at')
    .eq('user_id', studentId)
    .gte('submitted_at', startDate.toISOString());

  if (!submissions) return [];

  // Aggregate by day
  const activityByDay = aggregateActivityByDay(submissions);

  // Fill missing days
  return fillMissingDays(activityByDay, days);
}

/**
 * Get time metrics for student
 * Note: execution_time_ms is not available in submissions table
 */
export async function getStudentTimeMetrics(
  studentId: string
): Promise<{
  averageSolveTime: number;
  fastestSolveTime: number;
  slowestSolveTime: number;
}> {
  // execution_time_ms not available in submissions table
  // Return placeholder values
  return {
    averageSolveTime: 0,
    fastestSolveTime: 0,
    slowestSolveTime: 0,
  };
}

/**
 * Get statistics for all levels
 */
export async function getAllLevelsStatistics(): Promise<
  Array<{
    level: Level;
    totalAttempts: number;
    uniqueStudents: number;
    completedCount: number;
    successRate: number;
    averageAttempts: number;
  }>
> {
  // Get all levels
  const { data: levels } = await supabase
    .from('levels')
    .select('*')
    .order('order_index', { ascending: true });

  if (!levels) return [];

  // Get all submissions
  const { data: submissions } = await supabase
    .from('submissions')
    .select('level_id, user_id, status');

  if (!submissions) return levels.map(l => ({
    level: l,
    totalAttempts: 0,
    uniqueStudents: 0,
    completedCount: 0,
    successRate: 0,
    averageAttempts: 0,
  }));

  // Calculate stats for each level
  return levels.map(level => {
    const levelSubmissions = submissions.filter(s => s.level_id === level.id);
    const totalAttempts = levelSubmissions.length;
    const uniqueStudents = new Set(levelSubmissions.map(s => s.user_id)).size;
    const completedCount = levelSubmissions.filter(s => s.status === 'passed').length;
    const successRate = calculateSuccessRate(completedCount, totalAttempts);
    const averageAttempts = uniqueStudents > 0 ? totalAttempts / uniqueStudents : 0;

    return {
      level,
      totalAttempts,
      uniqueStudents,
      completedCount,
      successRate,
      averageAttempts: Math.round(averageAttempts * 10) / 10,
    };
  });
}

/**
 * Get detailed statistics for a specific level
 */
export async function getLevelStatistics(levelId: string): Promise<{
  level: Level;
  totalAttempts: number;
  uniqueStudents: number;
  completedCount: number;
  successRate: number;
  averageAttempts: number;
  attemptsDistribution: {
    '1': number;
    '2-3': number;
    '4-5': number;
    '6+': number;
    'unsolved': number;
  };
  submissions: Array<{
    student: Profile;
    attempts: number;
    isCorrect: boolean;
    lastSubmittedAt: string;
  }>;
}> {
  // Get level
  const { data: level } = await supabase
    .from('levels')
    .select('*')
    .eq('id', levelId)
    .single();

  if (!level) {
    throw new Error('Level not found');
  }

  // Get all submissions for this level with student data
  const { data: submissions } = await supabase
    .from('submissions')
    .select(`
      *,
      student:profiles!user_id(*)
    `)
    .eq('level_id', levelId)
    .order('submitted_at', { ascending: false });

  if (!submissions || submissions.length === 0) {
    return {
      level,
      totalAttempts: 0,
      uniqueStudents: 0,
      completedCount: 0,
      successRate: 0,
      averageAttempts: 0,
      attemptsDistribution: { '1': 0, '2-3': 0, '4-5': 0, '6+': 0, 'unsolved': 0 },
      submissions: [],
    };
  }

  // Calculate basic stats
  const totalAttempts = submissions.length;
  const uniqueStudents = new Set(submissions.map(s => s.user_id)).size;
  const completedCount = submissions.filter(s => s.status === 'passed').length;
  const successRate = calculateSuccessRate(completedCount, totalAttempts);
  const averageAttempts = uniqueStudents > 0 ? totalAttempts / uniqueStudents : 0;

  // Group by student
  const studentMap = new Map<string, {
    student: Profile;
    attempts: number;
    isCorrect: boolean;
    lastSubmittedAt: string;
  }>();

  submissions.forEach(s => {
    if (!studentMap.has(s.user_id)) {
      studentMap.set(s.user_id, {
        student: s.student,
        attempts: 0,
        isCorrect: false,
        lastSubmittedAt: s.submitted_at,
      });
    }
    const studentData = studentMap.get(s.user_id)!;
    studentData.attempts++;
    if (s.status === 'passed') studentData.isCorrect = true;
  });

  const studentSubmissions = Array.from(studentMap.values());

  // Calculate attempts distribution
  const attemptsDistribution = {
    '1': 0,
    '2-3': 0,
    '4-5': 0,
    '6+': 0,
    'unsolved': 0,
  };

  studentSubmissions.forEach(s => {
    if (!s.isCorrect) {
      attemptsDistribution['unsolved']++;
    } else if (s.attempts === 1) {
      attemptsDistribution['1']++;
    } else if (s.attempts <= 3) {
      attemptsDistribution['2-3']++;
    } else if (s.attempts <= 5) {
      attemptsDistribution['4-5']++;
    } else {
      attemptsDistribution['6+']++;
    }
  });

  return {
    level,
    totalAttempts,
    uniqueStudents,
    completedCount,
    successRate,
    averageAttempts: Math.round(averageAttempts * 10) / 10,
    attemptsDistribution,
    submissions: studentSubmissions,
  };
}

/**
 * Get recent submissions for a level
 */
export async function getLevelRecentSubmissions(
  levelId: string,
  limit: number = 20
): Promise<Array<Submission & { student: Profile }>> {
  const { data: submissions } = await supabase
    .from('submissions')
    .select(`
      *,
      student:profiles!user_id(*)
    `)
    .eq('level_id', levelId)
    .order('submitted_at', { ascending: false })
    .limit(limit);

  if (!submissions) return [];

  return submissions;
}

/**
 * Get comprehensive statistics for a class
 */
export async function getClassStatistics(className: string): Promise<{
  className: string;
  totalStudents: number;
  averageCompletedLevels: number;
  averageSuccessRate: number;
  activeStudentsLast7Days: number;
  distribution: {
    '0-25': number;
    '25-50': number;
    '50-75': number;
    '75-100': number;
  };
  students: Array<{
    student: Profile;
    completedLevels: number;
    totalLevels: number;
    successRate: number;
    lastActivity: string | null;
    rank: number;
  }>;
}> {
  // Get all students in the class
  const { data: students } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'student')
    .eq('class', className);

  if (!students || students.length === 0) {
    return {
      className,
      totalStudents: 0,
      averageCompletedLevels: 0,
      averageSuccessRate: 0,
      activeStudentsLast7Days: 0,
      distribution: { '0-25': 0, '25-50': 0, '50-75': 0, '75-100': 0 },
      students: [],
    };
  }

  // Get total levels count
  const { count: totalLevels } = await supabase
    .from('levels')
    .select('*', { count: 'exact', head: true });

  // Get progress for students in this class
  const { data: progress } = await supabase
    .from('level_progress')
    .select('student_id, status')
    .in('student_id', students.map(s => s.id));

  // Get submissions for students in this class
  const { data: submissions } = await supabase
    .from('submissions')
    .select('user_id, status, submitted_at')
    .in('user_id', students.map(s => s.id));

  // Calculate stats for each student
  const studentsWithStats = students.map(student => {
    const studentProgress = progress?.filter(p => p.student_id === student.id) || [];
    const completedLevels = studentProgress.filter(p => p.status === 'completed').length;

    const studentSubmissions = submissions?.filter(s => s.user_id === student.id) || [];
    const successRate = calculateSuccessRate(
      studentSubmissions.filter(s => s.status === 'passed').length,
      studentSubmissions.length
    );

    const lastActivity = studentSubmissions.length > 0
      ? studentSubmissions.sort((a, b) =>
          new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime()
        )[0].submitted_at
      : null;

    return {
      student,
      completedLevels,
      totalLevels: totalLevels || 0,
      successRate,
      lastActivity,
    };
  });

  // Sort by completed levels and add ranks
  const rankedStudents = studentsWithStats
    .sort((a, b) => {
      if (b.completedLevels !== a.completedLevels) {
        return b.completedLevels - a.completedLevels;
      }
      return b.successRate - a.successRate;
    })
    .map((s, index) => ({ ...s, rank: index + 1 }));

  // Calculate average metrics
  const averageCompletedLevels = studentsWithStats.reduce(
    (sum, s) => sum + s.completedLevels,
    0
  ) / students.length;

  const averageSuccessRate = Math.round(
    studentsWithStats.reduce((sum, s) => sum + s.successRate, 0) / students.length
  );

  // Calculate active students in last 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const activeStudentsLast7Days = studentsWithStats.filter(s =>
    s.lastActivity && new Date(s.lastActivity) >= sevenDaysAgo
  ).length;

  // Calculate distribution
  const distribution = groupStudentsByProgress(
    studentsWithStats.map(s => ({
      completedLevels: s.completedLevels,
      totalLevels: s.totalLevels,
    }))
  );

  return {
    className,
    totalStudents: students.length,
    averageCompletedLevels: Math.round(averageCompletedLevels * 10) / 10,
    averageSuccessRate,
    activeStudentsLast7Days,
    distribution,
    students: rankedStudents,
  };
}

/**
 * Get class progress over time
 */
export async function getClassProgressOverTime(
  className: string,
  days: number = 30
): Promise<Array<{ date: string; count: number }>> {
  // Get students in the class
  const { data: students } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'student')
    .eq('class', className);

  if (!students || students.length === 0) return [];

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // Get progress completions for these students
  const { data: progress } = await supabase
    .from('level_progress')
    .select('completed_at')
    .in('student_id', students.map(s => s.id))
    .eq('status', 'completed')
    .gte('completed_at', startDate.toISOString());

  if (!progress) return [];

  // Aggregate by day
  const activityByDay = aggregateActivityByDay(
    progress.map(p => ({ submitted_at: p.completed_at }))
  );

  // Fill missing days
  return fillMissingDays(activityByDay, days);
}

/**
 * Get class activity over time
 */
export async function getClassActivity(
  className: string,
  days: number = 60
): Promise<Array<{ date: string; activityCount: number }>> {
  // Get students in the class
  const { data: students } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'student')
    .eq('class', className);

  if (!students || students.length === 0) return [];

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // Get submissions for these students
  const { data: submissions } = await supabase
    .from('submissions')
    .select('submitted_at')
    .in('user_id', students.map(s => s.id))
    .gte('submitted_at', startDate.toISOString());

  if (!submissions) return [];

  // Aggregate by day
  const activityByDay = aggregateActivityByDay(submissions);

  // Fill missing days and rename field
  const filledData = fillMissingDays(activityByDay, days);

  return filledData.map(d => ({
    date: d.date,
    activityCount: d.count,
  }));
}
