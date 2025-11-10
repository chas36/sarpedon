import { supabase } from '@/shared/lib/supabase';
import type { Level } from '@/shared/types';

// ============================================
// Types
// ============================================

export interface RecommendedLevel {
  level_id: string;
  title: string;
  description: string;
  difficulty: number;
  language: string;
  target_skills: string[];
  match_score: number;
  recommendation_reason: string;
}

export interface DifficultyRange {
  min_difficulty: number;
  max_difficulty: number;
  description: string;
}

export interface LevelWithStatus extends Level {
  status: 'not_started' | 'in_progress' | 'completed';
  is_recommended: boolean;
}

// ============================================
// Get recommended levels for student
// ============================================

export async function getRecommendedLevels(
  studentId: string,
  limit: number = 5
): Promise<RecommendedLevel[]> {
  const { data, error } = await supabase.rpc('get_recommended_levels', {
    p_student_id: studentId,
    p_limit: limit,
  });

  if (error) {
    console.error('Error fetching recommended levels:', error);
    throw new Error('Не удалось загрузить рекомендованные уровни');
  }

  return data || [];
}

// ============================================
// Get difficulty range for proficiency level
// ============================================

export async function getDifficultyRangeForProficiency(
  proficiencyLevel: 'beginner' | 'intermediate' | 'advanced'
): Promise<DifficultyRange> {
  const { data, error } = await supabase.rpc(
    'get_difficulty_range_for_proficiency',
    {
      p_proficiency_level: proficiencyLevel,
    }
  );

  if (error) {
    console.error('Error fetching difficulty range:', error);
    throw new Error('Не удалось загрузить диапазон сложности');
  }

  if (!data || data.length === 0) {
    return {
      min_difficulty: 1,
      max_difficulty: 10,
      description: 'Все уровни сложности',
    };
  }

  return data[0];
}

// ============================================
// Get levels filtered by proficiency
// ============================================

export async function getLevelsForProficiency(
  studentId: string,
  includeCompleted: boolean = false
): Promise<LevelWithStatus[]> {
  const { data, error } = await supabase.rpc('get_levels_for_proficiency', {
    p_student_id: studentId,
    p_include_completed: includeCompleted,
  });

  if (error) {
    console.error('Error fetching levels for proficiency:', error);
    throw new Error('Не удалось загрузить уровни');
  }

  return data || [];
}

// ============================================
// Get student's proficiency level
// ============================================

export async function getStudentProficiencyLevel(
  studentId: string
): Promise<'beginner' | 'intermediate' | 'advanced'> {
  const { data, error } = await supabase
    .from('profiles')
    .select('proficiency_level')
    .eq('id', studentId)
    .single();

  if (error) {
    console.error('Error fetching proficiency level:', error);
    return 'beginner'; // Default fallback
  }

  return data?.proficiency_level || 'beginner';
}
