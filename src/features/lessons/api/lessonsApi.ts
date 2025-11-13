import { supabase } from '@/shared/lib/supabase';

// ============================================
// Types
// ============================================

export type LessonStatus = 'active' | 'completed' | 'cancelled';

export interface LessonSession {
  id: string;
  teacher_id: string;
  class: string;
  date: string;
  start_time: string;
  end_time: string | null;
  topic: string | null;
  description: string | null;
  status: LessonStatus;
  created_at: string;
  updated_at: string;
}

export interface LessonGrade {
  id: string;
  lesson_session_id: string;
  student_id: string;
  grade: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
}

export interface StudentActivity {
  student_id: string;
  student_first_name: string;
  student_last_name: string;
  student_class: string;
  total_submissions: number;
  passed_submissions: number;
  failed_submissions: number;
  unique_levels_attempted: number;
  unique_levels_passed: number;
  success_rate: number;
  last_activity: string | null;
  current_grade: number | null;
  grade_comment: string | null;
  suggested_grade: number | null;
}

export interface CreateLessonData {
  class: string;
  date?: string;
  topic?: string;
  description?: string;
}

export interface UpdateLessonData {
  end_time?: string;
  topic?: string;
  description?: string;
  status?: LessonStatus;
}

export interface CreateGradeData {
  lesson_session_id: string;
  student_id: string;
  grade: number;
  comment?: string;
}

// ============================================
// Lesson Sessions API
// ============================================

/**
 * Create a new lesson session
 */
export async function createLessonSession(
  data: CreateLessonData
): Promise<LessonSession> {
  const { data: session, error } = await supabase
    .from('lesson_sessions')
    .insert({
      class: data.class,
      date: data.date || new Date().toISOString().split('T')[0],
      topic: data.topic || null,
      description: data.description || null,
      status: 'active'
    })
    .select()
    .single();

  if (error) throw error;
  return session;
}

/**
 * Get active lesson for a class
 */
export async function getActiveLessonForClass(
  className: string
): Promise<LessonSession | null> {
  const { data, error } = await supabase
    .rpc('get_active_lesson_for_class', {
      p_class: className
    });

  if (error) throw error;
  return data && data.length > 0 ? data[0] : null;
}

/**
 * Get lesson session by ID
 */
export async function getLessonSession(
  lessonId: string
): Promise<LessonSession> {
  const { data, error } = await supabase
    .from('lesson_sessions')
    .select('*')
    .eq('id', lessonId)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get all lesson sessions for a teacher
 */
export async function getTeacherLessons(
  teacherId: string,
  limit: number = 50
): Promise<LessonSession[]> {
  const { data, error } = await supabase
    .from('lesson_sessions')
    .select('*')
    .eq('teacher_id', teacherId)
    .order('date', { ascending: false })
    .order('start_time', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

/**
 * Get lesson sessions for a specific class
 */
export async function getClassLessons(
  className: string,
  limit: number = 20
): Promise<LessonSession[]> {
  const { data, error } = await supabase
    .from('lesson_sessions')
    .select('*')
    .eq('class', className)
    .order('date', { ascending: false })
    .order('start_time', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

/**
 * Update lesson session
 */
export async function updateLessonSession(
  lessonId: string,
  updates: UpdateLessonData
): Promise<void> {
  const { error } = await supabase
    .from('lesson_sessions')
    .update(updates)
    .eq('id', lessonId);

  if (error) throw error;
}

/**
 * Complete a lesson session
 */
export async function completeLessonSession(lessonId: string): Promise<void> {
  const { error } = await supabase
    .from('lesson_sessions')
    .update({
      status: 'completed',
      end_time: new Date().toISOString()
    })
    .eq('id', lessonId);

  if (error) throw error;
}

/**
 * Delete a lesson session
 */
export async function deleteLessonSession(lessonId: string): Promise<void> {
  const { error } = await supabase
    .from('lesson_sessions')
    .delete()
    .eq('id', lessonId);

  if (error) throw error;
}

// ============================================
// Lesson Activity API
// ============================================

/**
 * Get activity statistics for a lesson
 */
export async function getLessonActivity(
  lessonId: string
): Promise<StudentActivity[]> {
  const { data, error } = await supabase.rpc('get_lesson_activity', {
    p_lesson_session_id: lessonId
  });

  if (error) throw error;
  return data || [];
}

// ============================================
// Grades API
// ============================================

/**
 * Create or update a grade for a student
 */
export async function upsertGrade(data: CreateGradeData): Promise<LessonGrade> {
  const { data: grade, error } = await supabase
    .from('lesson_grades')
    .upsert(
      {
        lesson_session_id: data.lesson_session_id,
        student_id: data.student_id,
        grade: data.grade,
        comment: data.comment || null
      },
      {
        onConflict: 'lesson_session_id,student_id'
      }
    )
    .select()
    .single();

  if (error) throw error;
  return grade;
}

/**
 * Get all grades for a lesson
 */
export async function getLessonGrades(
  lessonId: string
): Promise<LessonGrade[]> {
  const { data, error } = await supabase
    .from('lesson_grades')
    .select('*')
    .eq('lesson_session_id', lessonId);

  if (error) throw error;
  return data || [];
}

/**
 * Get student's grade for a specific lesson
 */
export async function getStudentLessonGrade(
  lessonId: string,
  studentId: string
): Promise<LessonGrade | null> {
  const { data, error } = await supabase
    .from('lesson_grades')
    .select('*')
    .eq('lesson_session_id', lessonId)
    .eq('student_id', studentId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Get all grades for a student
 */
export async function getStudentGrades(studentId: string): Promise<LessonGrade[]> {
  const { data, error } = await supabase
    .from('lesson_grades')
    .select(`
      *,
      lesson_session:lesson_sessions(*)
    `)
    .eq('student_id', studentId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Delete a grade
 */
export async function deleteGrade(
  lessonId: string,
  studentId: string
): Promise<void> {
  const { error } = await supabase
    .from('lesson_grades')
    .delete()
    .eq('lesson_session_id', lessonId)
    .eq('student_id', studentId);

  if (error) throw error;
}

/**
 * Batch upsert grades for multiple students
 */
export async function batchUpsertGrades(
  grades: CreateGradeData[]
): Promise<LessonGrade[]> {
  const { data, error } = await supabase
    .from('lesson_grades')
    .upsert(
      grades.map(g => ({
        lesson_session_id: g.lesson_session_id,
        student_id: g.student_id,
        grade: g.grade,
        comment: g.comment || null
      })),
      {
        onConflict: 'lesson_session_id,student_id'
      }
    )
    .select();

  if (error) throw error;
  return data || [];
}
