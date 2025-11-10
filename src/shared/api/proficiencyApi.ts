import { supabase } from '../lib/supabase';
import type {
  ProficiencyData,
  SkillProficiency,
  WeakArea,
  ProficiencyHistory,
} from '../types/proficiency.types';
import { getSkillDisplayName } from '../types/proficiency.types';

/**
 * Get student's proficiency data from profile
 */
export async function getStudentProficiency(
  studentId: string
): Promise<ProficiencyData | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('proficiency_level, proficiency_score, proficiency_last_assessed, proficiency_manual_override')
    .eq('id', studentId)
    .single();

  if (error) {
    console.error('Error fetching proficiency:', error);
    throw new Error('Не удалось загрузить данные об уровне');
  }

  if (!data) return null;

  return {
    level: data.proficiency_level || 'beginner',
    score: data.proficiency_score || 0,
    last_assessed: data.proficiency_last_assessed,
    manual_override: data.proficiency_manual_override || false,
  };
}

/**
 * Get student's skill proficiency data
 */
export async function getStudentSkills(
  studentId: string
): Promise<SkillProficiency[]> {
  const { data, error } = await supabase
    .from('user_skill_profile')
    .select('*')
    .eq('user_id', studentId)
    .order('proficiency_percentage', { ascending: true });

  if (error) {
    console.error('Error fetching skills:', error);
    throw new Error('Не удалось загрузить данные о навыках');
  }

  return (data || []).map((skill) => ({
    skill_name: skill.skill_name,
    skill_display_name: getSkillDisplayName(skill.skill_name),
    proficiency_percentage: skill.proficiency_percentage || 0,
    submissions_count: skill.submissions_count || 0,
    successful_count: skill.successful_count || 0,
    last_practiced: skill.last_practiced,
  }));
}

/**
 * Get student's weak areas (top N skills with lowest proficiency)
 */
export async function getStudentWeakAreas(
  studentId: string,
  limit: number = 3
): Promise<WeakArea[]> {
  const { data, error } = await supabase.rpc('get_student_weak_areas', {
    p_student_id: studentId,
    p_limit: limit,
  });

  if (error) {
    console.error('Error fetching weak areas:', error);
    throw new Error('Не удалось загрузить слабые места');
  }

  return (data || []).map((area: any) => ({
    skill_name: area.skill_name,
    skill_display_name: getSkillDisplayName(area.skill_name),
    proficiency_percentage: area.proficiency_percentage || 0,
  }));
}

/**
 * Get student's proficiency change history
 */
export async function getProficiencyHistory(
  studentId: string,
  limit: number = 10
): Promise<ProficiencyHistory[]> {
  const { data, error } = await supabase
    .from('proficiency_history')
    .select('*')
    .eq('user_id', studentId)
    .order('changed_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching proficiency history:', error);
    throw new Error('Не удалось загрузить историю изменений уровня');
  }

  return data || [];
}

/**
 * Manually set student's proficiency level (teacher only)
 */
export async function setStudentProficiencyManual(
  studentId: string,
  level: 'beginner' | 'intermediate' | 'advanced',
  score: number,
  reason: string
): Promise<void> {
  const { error } = await supabase.rpc('set_student_proficiency_manual', {
    p_student_id: studentId,
    p_level: level,
    p_score: score,
    p_reason: reason,
  });

  if (error) {
    console.error('Error setting proficiency:', error);
    throw new Error('Не удалось установить уровень');
  }
}

/**
 * Enable automatic proficiency calculation for student (teacher only)
 */
export async function enableAutoProficiency(studentId: string): Promise<void> {
  const { error } = await supabase.rpc('enable_auto_proficiency', {
    p_student_id: studentId,
  });

  if (error) {
    console.error('Error enabling auto proficiency:', error);
    throw new Error('Не удалось включить автоматический расчет');
  }
}

/**
 * Get all students with their proficiency levels (teacher only)
 */
export async function getAllStudentsProficiency(
  classFilter?: string
): Promise<Array<{
  id: string;
  full_name: string;
  class: string | null;
  proficiency_level: string;
  proficiency_score: number;
  proficiency_last_assessed: string | null;
}>> {
  let query = supabase
    .from('profiles')
    .select('id, full_name, class, proficiency_level, proficiency_score, proficiency_last_assessed')
    .eq('role', 'student')
    .order('proficiency_score', { ascending: false });

  if (classFilter) {
    query = query.eq('class', classFilter);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching all students proficiency:', error);
    throw new Error('Не удалось загрузить данные студентов');
  }

  return data || [];
}
