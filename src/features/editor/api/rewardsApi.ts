import { supabase } from '@/shared/lib/supabase';

export interface LevelCreationReward {
  id: string;
  level_id: string;
  author_id: string;
  moderator_id?: string;
  points_awarded: number;
  difficulty: number;
  awarded_at: string;
  level?: {
    id: string;
    title: string;
  };
}

export interface RewardStats {
  total_points: number;
  total_approved_levels: number;
  average_difficulty: number;
  recent_rewards: LevelCreationReward[];
}

/**
 * Get rewards for a specific student editor
 */
export async function getEditorRewards(studentId: string): Promise<LevelCreationReward[]> {
  const { data, error } = await supabase
    .from('level_creation_rewards')
    .select(`
      *,
      level:levels!level_creation_rewards_level_id_fkey (
        id,
        title
      )
    `)
    .eq('author_id', studentId)
    .order('awarded_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Get reward statistics for a student editor
 */
export async function getEditorRewardStats(studentId: string): Promise<RewardStats> {
  const rewards = await getEditorRewards(studentId);

  const stats: RewardStats = {
    total_points: 0,
    total_approved_levels: rewards.length,
    average_difficulty: 0,
    recent_rewards: rewards.slice(0, 5)
  };

  if (rewards.length > 0) {
    stats.total_points = rewards.reduce((sum, r) => sum + r.points_awarded, 0);
    stats.average_difficulty = rewards.reduce((sum, r) => sum + r.difficulty, 0) / rewards.length;
  }

  return stats;
}

/**
 * Get total points earned from level creation for display
 */
export async function getTotalCreationPoints(studentId: string): Promise<number> {
  const { data, error } = await supabase
    .from('level_creation_rewards')
    .select('points_awarded')
    .eq('author_id', studentId);

  if (error) throw error;

  return data?.reduce((sum, r) => sum + r.points_awarded, 0) || 0;
}
