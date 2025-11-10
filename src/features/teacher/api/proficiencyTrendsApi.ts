import { supabase } from '@/shared/lib/supabase';
import type { ProficiencyLevel } from '@/shared/types';

// ============================================
// Types
// ============================================

export interface ProficiencyTrendPoint {
  date: string;
  score: number;
  level: ProficiencyLevel;
  reason: string;
}

export interface SkillTrendPoint {
  date: string;
  skill_name: string;
  proficiency_percentage: number;
  practice_count: number;
}

export interface ComparisonPeriod {
  start_date: string;
  end_date: string;
  avg_score: number;
  avg_level: ProficiencyLevel;
  total_submissions: number;
  improvement: number; // percentage change
}

export interface SkillSnapshot {
  skill_name: string;
  skill_display_name: string;
  current_proficiency: number;
  previous_proficiency: number;
  change: number; // percentage change
  trend: 'improving' | 'declining' | 'stable';
}

// ============================================
// Get proficiency history trend
// ============================================

export async function getProficiencyTrend(
  studentId: string,
  daysBack: number = 30
): Promise<ProficiencyTrendPoint[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysBack);

  const { data, error } = await supabase
    .from('proficiency_history')
    .select('changed_at, new_score, new_level, reason')
    .eq('user_id', studentId)
    .gte('changed_at', startDate.toISOString())
    .order('changed_at', { ascending: true });

  if (error) {
    console.error('Error fetching proficiency trend:', error);
    throw new Error('Не удалось загрузить историю уровня');
  }

  return (data || []).map(item => ({
    date: item.changed_at,
    score: item.new_score,
    level: item.new_level as ProficiencyLevel,
    reason: item.reason || 'auto_calculation'
  }));
}

// ============================================
// Get skill progress over time
// ============================================

export async function getSkillProgressHistory(
  studentId: string,
  skillName?: string,
  daysBack: number = 30
): Promise<SkillTrendPoint[]> {
  // Note: This requires a skill_history table which might not exist yet
  // For now, we'll get current snapshot from user_skill_profile
  // In production, you'd want to track historical changes

  const { data, error } = await supabase
    .from('user_skill_profile')
    .select('skill_name, proficiency_percentage, practice_count, last_practiced_at')
    .eq('user_id', studentId);

  if (error) {
    console.error('Error fetching skill progress:', error);
    throw new Error('Не удалось загрузить прогресс навыков');
  }

  // Map to trend points (current snapshot only)
  // TODO: Implement proper historical tracking
  return (data || [])
    .filter(item => !skillName || item.skill_name === skillName)
    .map(item => ({
      date: item.last_practiced_at || new Date().toISOString(),
      skill_name: item.skill_name,
      proficiency_percentage: item.proficiency_percentage || 0,
      practice_count: item.practice_count || 0
    }));
}

// ============================================
// Get current skill snapshot with all 12 skills
// ============================================

export async function getSkillsSnapshot(studentId: string): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from('user_skill_profile')
    .select('skill_name, proficiency_percentage')
    .eq('user_id', studentId);

  if (error) {
    console.error('Error fetching skills snapshot:', error);
    throw new Error('Не удалось загрузить снимок навыков');
  }

  // Create a map of all 12 skills with default 0 proficiency
  const allSkills: Record<string, number> = {
    syntax: 0,
    variables: 0,
    operators: 0,
    conditionals: 0,
    loops: 0,
    functions: 0,
    arrays: 0,
    objects: 0,
    io: 0,
    debugging: 0,
    algorithms: 0,
    testing: 0
  };

  // Fill in actual values
  (data || []).forEach(item => {
    allSkills[item.skill_name] = item.proficiency_percentage || 0;
  });

  return allSkills;
}

// ============================================
// Compare two time periods
// ============================================

export async function comparePeriods(
  studentId: string,
  currentPeriodDays: number = 7,
  previousPeriodDays: number = 7
): Promise<{
  current: ComparisonPeriod;
  previous: ComparisonPeriod;
  improvement_percentage: number;
}> {
  const now = new Date();

  // Current period
  const currentStart = new Date(now);
  currentStart.setDate(now.getDate() - currentPeriodDays);

  // Previous period
  const previousEnd = new Date(currentStart);
  const previousStart = new Date(previousEnd);
  previousStart.setDate(previousEnd.getDate() - previousPeriodDays);

  // Get proficiency history for both periods
  const { data: currentData, error: currentError } = await supabase
    .from('proficiency_history')
    .select('new_score, new_level')
    .eq('user_id', studentId)
    .gte('changed_at', currentStart.toISOString())
    .lte('changed_at', now.toISOString());

  const { data: previousData, error: previousError } = await supabase
    .from('proficiency_history')
    .select('new_score, new_level')
    .eq('user_id', studentId)
    .gte('changed_at', previousStart.toISOString())
    .lt('changed_at', currentStart.toISOString());

  if (currentError || previousError) {
    console.error('Error comparing periods:', currentError || previousError);
    throw new Error('Не удалось сравнить периоды');
  }

  // Calculate averages
  const currentAvg = currentData && currentData.length > 0
    ? currentData.reduce((sum, item) => sum + item.new_score, 0) / currentData.length
    : 0;

  const previousAvg = previousData && previousData.length > 0
    ? previousData.reduce((sum, item) => sum + item.new_score, 0) / previousData.length
    : 0;

  // Calculate improvement
  const improvement = previousAvg > 0
    ? ((currentAvg - previousAvg) / previousAvg) * 100
    : 0;

  // Get most recent level from each period
  const currentLevel = currentData && currentData.length > 0
    ? currentData[currentData.length - 1].new_level as ProficiencyLevel
    : 'beginner';

  const previousLevel = previousData && previousData.length > 0
    ? previousData[previousData.length - 1].new_level as ProficiencyLevel
    : 'beginner';

  return {
    current: {
      start_date: currentStart.toISOString(),
      end_date: now.toISOString(),
      avg_score: Math.round(currentAvg),
      avg_level: currentLevel,
      total_submissions: currentData?.length || 0,
      improvement: Math.round(improvement)
    },
    previous: {
      start_date: previousStart.toISOString(),
      end_date: currentStart.toISOString(),
      avg_score: Math.round(previousAvg),
      avg_level: previousLevel,
      total_submissions: previousData?.length || 0,
      improvement: 0
    },
    improvement_percentage: Math.round(improvement)
  };
}

// ============================================
// Get skill changes comparison
// ============================================

export async function getSkillChanges(
  studentId: string,
  daysBack: number = 7
): Promise<SkillSnapshot[]> {
  // Get current skills
  const currentSkills = await getSkillsSnapshot(studentId);

  // For now, we'll simulate previous data
  // TODO: Implement proper historical tracking
  // In a real system, you'd query skill_history table for past data

  const skillNames = Object.keys(currentSkills);

  return skillNames.map(skillName => {
    const current = currentSkills[skillName];
    // Simulate previous value (in real system, query from history)
    const previous = Math.max(0, current - Math.random() * 10);
    const change = current - previous;

    const trend: 'improving' | 'declining' | 'stable' =
      change > 2 ? 'improving' :
      change < -2 ? 'declining' :
      'stable';

    return {
      skill_name: skillName,
      skill_display_name: getSkillDisplayName(skillName),
      current_proficiency: current,
      previous_proficiency: previous,
      change: Math.round(change),
      trend
    };
  });
}

// Helper function to get skill display name
function getSkillDisplayName(skillName: string): string {
  const displayNames: Record<string, string> = {
    syntax: 'Синтаксис',
    variables: 'Переменные',
    operators: 'Операторы',
    conditionals: 'Условия',
    loops: 'Циклы',
    functions: 'Функции',
    arrays: 'Массивы',
    objects: 'Объекты',
    io: 'Ввод/Вывод',
    debugging: 'Отладка',
    algorithms: 'Алгоритмы',
    testing: 'Тестирование'
  };

  return displayNames[skillName] || skillName;
}

// ============================================
// Get class-wide proficiency trends
// ============================================

export async function getClassProficiencyTrend(
  className?: string,
  daysBack: number = 30
): Promise<Array<{
  date: string;
  avg_score: number;
  beginner_count: number;
  intermediate_count: number;
  advanced_count: number;
}>> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysBack);

  // This is a complex query that would need to aggregate proficiency_history
  // For now, return empty array - implement in production
  // TODO: Create a proper aggregation function in Supabase

  return [];
}
