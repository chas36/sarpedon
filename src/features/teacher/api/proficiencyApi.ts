import { supabase } from '@/shared/lib/supabase';
import type { ProficiencyLevel } from '@/shared/types';

// ============================================
// Types
// ============================================

export interface ProficiencyData {
  proficiency_level: ProficiencyLevel;
  proficiency_score: number;
  proficiency_last_assessed: string | null;
  proficiency_manual_override: boolean;
}

export interface ProficiencyHistoryRecord {
  id: string;
  student_id: string;
  old_level: ProficiencyLevel;
  new_level: ProficiencyLevel;
  old_score: number;
  new_score: number;
  change_reason: 'automatic' | 'manual' | 'entrance_test';
  changed_by: string | null;
  changed_at: string;
  notes: string | null;
}

export interface WeakArea {
  skill_name: string;
  proficiency: number;
  mistake_count: number;
  practice_count: number;
}

export interface SkillProfile {
  id: string;
  user_id: string;
  skill_category_id: string;
  skill_name?: string;
  proficiency: number;
  mistake_count: number;
  practice_count: number;
  last_practiced_at: string | null;
}

export interface StudentProficiencyOverview extends ProficiencyData {
  weak_areas: WeakArea[];
  common_mistakes: string[];
}

// ============================================
// Get student proficiency data
// ============================================

export async function getStudentProficiency(studentId: string): Promise<ProficiencyData | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('proficiency_level, proficiency_score, proficiency_last_assessed, proficiency_manual_override')
    .eq('id', studentId)
    .single();

  if (error) throw error;
  return data;
}

// ============================================
// Get student proficiency history
// ============================================

export async function getStudentProficiencyHistory(
  studentId: string
): Promise<ProficiencyHistoryRecord[]> {
  const { data, error } = await supabase
    .from('proficiency_history')
    .select('*')
    .eq('student_id', studentId)
    .order('changed_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

// ============================================
// Get student weak areas
// ============================================

export async function getStudentWeakAreas(
  studentId: string,
  limit: number = 3
): Promise<WeakArea[]> {
  const { data, error } = await supabase.rpc('get_student_weak_areas', {
    p_user_id: studentId,
    p_limit: limit
  });

  if (error) throw error;
  return data || [];
}

// ============================================
// Get student skill profile
// ============================================

export async function getStudentSkillProfile(studentId: string): Promise<SkillProfile[]> {
  const { data, error } = await supabase
    .from('user_skill_profile')
    .select(`
      id,
      user_id,
      skill_category_id,
      proficiency,
      mistake_count,
      practice_count,
      last_practiced_at,
      skill_categories (name)
    `)
    .eq('user_id', studentId)
    .order('proficiency', { ascending: true });

  if (error) throw error;

  // Map the data to include skill_name
  return (data || []).map((item: any) => ({
    id: item.id,
    user_id: item.user_id,
    skill_category_id: item.skill_category_id,
    skill_name: item.skill_categories?.name,
    proficiency: item.proficiency,
    mistake_count: item.mistake_count,
    practice_count: item.practice_count,
    last_practiced_at: item.last_practiced_at
  }));
}

// ============================================
// Get student proficiency overview (all data)
// ============================================

export async function getStudentProficiencyOverview(
  studentId: string
): Promise<StudentProficiencyOverview> {
  const [proficiencyData, weakAreas] = await Promise.all([
    getStudentProficiency(studentId),
    getStudentWeakAreas(studentId, 5)
  ]);

  if (!proficiencyData) {
    throw new Error('Student proficiency data not found');
  }

  // Extract common mistakes from weak areas
  const commonMistakes = weakAreas
    .filter(wa => wa.mistake_count > 2)
    .map(wa => wa.skill_name);

  return {
    ...proficiencyData,
    weak_areas: weakAreas,
    common_mistakes: commonMistakes
  };
}

// ============================================
// Manually set student proficiency
// ============================================

export async function setStudentProficiency(
  studentId: string,
  level: ProficiencyLevel,
  score: number,
  notes?: string
): Promise<void> {
  const { error } = await supabase.rpc('set_student_proficiency_manual', {
    p_student_id: studentId,
    p_new_level: level,
    p_new_score: score,
    p_notes: notes || null
  });

  if (error) throw error;
}

// ============================================
// Enable automatic proficiency calculation
// ============================================

export async function enableAutoProficiency(studentId: string): Promise<void> {
  const { error } = await supabase.rpc('enable_auto_proficiency', {
    p_student_id: studentId
  });

  if (error) throw error;
}

// ============================================
// Recalculate student proficiency
// ============================================

export async function recalculateStudentProficiency(studentId: string): Promise<{
  score: number;
  level: ProficiencyLevel;
}> {
  const { data, error } = await supabase.rpc('calculate_proficiency_score', {
    p_student_id: studentId
  });

  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error('Failed to calculate proficiency');
  }

  return {
    score: data[0].score,
    level: data[0].level as ProficiencyLevel
  };
}

// ============================================
// Get all students with proficiency levels
// ============================================

export interface StudentWithProficiency {
  id: string;
  first_name: string;
  last_name: string;
  full_name?: string;
  class?: string;
  proficiency_level: ProficiencyLevel;
  proficiency_score: number;
  proficiency_last_assessed: string | null;
  proficiency_manual_override: boolean;
}

export async function getAllStudentsWithProficiency(): Promise<StudentWithProficiency[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, full_name, class, proficiency_level, proficiency_score, proficiency_last_assessed, proficiency_manual_override')
    .eq('role', 'student')
    .order('last_name', { ascending: true });

  if (error) throw error;
  return data || [];
}

// ============================================
// Get proficiency statistics for class
// ============================================

export interface ProficiencyStats {
  total_students: number;
  beginner_count: number;
  intermediate_count: number;
  advanced_count: number;
  average_score: number;
}

export async function getClassProficiencyStats(className?: string): Promise<ProficiencyStats> {
  let query = supabase
    .from('profiles')
    .select('proficiency_level, proficiency_score')
    .eq('role', 'student');

  if (className) {
    query = query.eq('class', className);
  }

  const { data, error } = await query;

  if (error) throw error;

  const students = data || [];
  const total = students.length;

  const beginnerCount = students.filter(s => s.proficiency_level === 'beginner').length;
  const intermediateCount = students.filter(s => s.proficiency_level === 'intermediate').length;
  const advancedCount = students.filter(s => s.proficiency_level === 'advanced').length;

  const avgScore = total > 0
    ? Math.round(students.reduce((sum, s) => sum + (s.proficiency_score || 0), 0) / total)
    : 0;

  return {
    total_students: total,
    beginner_count: beginnerCount,
    intermediate_count: intermediateCount,
    advanced_count: advancedCount,
    average_score: avgScore
  };
}
