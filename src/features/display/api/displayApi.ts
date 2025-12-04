import { supabase } from '@/shared/lib/supabase';
import type { Profile } from '@/shared/types';
import type {
  ClassStats,
  StudentListItem,
  LessonActivity,
  AuthorStats
} from '../types/display.types';

// Get all available classes
export async function getAvailableClasses(): Promise<string[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('class')
    .eq('role', 'student')
    .not('class', 'is', null);

  if (error) throw error;

  // Get unique classes
  const classes = [...new Set(data.map(p => p.class).filter(Boolean))];
  return classes.sort();
}

// Get students for a class
export async function getClassStudents(className: string): Promise<StudentListItem[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, login, first_name, last_name, full_name, class, updated_at')
    .eq('role', 'student')
    .eq('class', className)
    .order('login');

  if (error) throw error;

  return data.map(student => ({
    id: student.id,
    login: student.login || '',
    firstName: student.first_name,
    lastName: student.last_name,
    fullName: student.full_name,
    class: student.class,
    lastActivity: student.updated_at
  }));
}

// Get class statistics
export async function getClassStats(className: string): Promise<ClassStats> {
  // Get total students
  const { data: students, error: studentsError } = await supabase
    .from('profiles')
    .select('id, proficiency_score')
    .eq('role', 'student')
    .eq('class', className);

  if (studentsError) throw studentsError;

  const totalStudents = students.length;

  // Calculate average score
  const averageScore = totalStudents > 0
    ? students.reduce((sum, s) => sum + (s.proficiency_score || 0), 0) / totalStudents
    : 0;

  // Get completion stats
  const { data: progress, error: progressError } = await supabase
    .from('level_progress')
    .select('student_id, status')
    .in('student_id', students.map(s => s.id));

  if (progressError) throw progressError;

  const completedLevels = progress?.filter(p => p.status === 'completed').length || 0;
  const totalAttempts = progress?.length || 0;
  const completionRate = totalAttempts > 0 ? (completedLevels / totalAttempts) * 100 : 0;

  // Calculate overall progress percentage (average of individual progress)
  const progressPercentage = averageScore; // Simplified for now

  return {
    className,
    totalStudents,
    averageScore: Math.round(averageScore),
    progressPercentage: Math.round(progressPercentage),
    completionRate: Math.round(completionRate)
  };
}

// Get active lesson for a class
export async function getActiveLesson(className: string) {
  const { data, error } = await supabase
    .rpc('get_active_lesson_for_class', {
      p_class_name: className
    });

  if (error) throw error;
  return data;
}

// Get lesson activity
export async function getLessonActivity(lessonId: string): Promise<LessonActivity> {
  const { data: activity, error } = await supabase
    .rpc('get_lesson_activity', {
      p_lesson_id: lessonId
    });

  if (error) throw error;
  return activity;
}

// Get top authors
export async function getTopAuthors(limit: number = 5): Promise<AuthorStats[]> {
  const { data, error } = await supabase
    .from('levels')
    .select('created_by, profiles!levels_created_by_fkey(full_name)')
    .not('created_by', 'is', null);

  if (error) throw error;

  // Group by author and count
  const authorMap = new Map<string, { name: string; count: number }>();

  data.forEach(level => {
    const authorId = level.created_by;
    const authorName = (level.profiles as any)?.full_name || 'Unknown';

    if (authorMap.has(authorId)) {
      authorMap.get(authorId)!.count++;
    } else {
      authorMap.set(authorId, { name: authorName, count: 1 });
    }
  });

  // Convert to array and sort
  const authors = Array.from(authorMap.entries())
    .map(([id, data]) => ({
      authorId: id,
      authorName: data.name,
      levelCount: data.count,
      averageRating: 0, // Placeholder
      totalPlays: 0 // Placeholder
    }))
    .sort((a, b) => b.levelCount - a.levelCount)
    .slice(0, limit);

  return authors;
}
