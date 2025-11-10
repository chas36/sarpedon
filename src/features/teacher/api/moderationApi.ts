import { supabase } from '@/shared/lib/supabase';
import type { Level, Profile } from '@/shared/types';

export interface LevelWithAuthor extends Level {
  author?: Profile;
}

/**
 * Get all levels pending moderation
 */
export async function getPendingLevels(): Promise<LevelWithAuthor[]> {
  const { data, error } = await supabase
    .from('levels')
    .select(`
      *,
      author:created_by (
        id,
        first_name,
        last_name,
        full_name
      )
    `)
    .eq('moderation_status', 'pending_review')
    .order('created_at', { ascending: false });

  if (error) throw error;

  // Transform the nested author object
  return (data || []).map(level => ({
    ...level,
    author: level.author ? (Array.isArray(level.author) ? level.author[0] : level.author) : undefined
  })) as LevelWithAuthor[];
}

/**
 * Approve a level
 */
export async function approveLevel(
  levelId: string,
  moderatorId: string,
  notes?: string
): Promise<Level> {
  const { data, error } = await supabase
    .from('levels')
    .update({
      moderation_status: 'approved',
      moderator_id: moderatorId,
      moderation_notes: notes || null,
      moderated_at: new Date().toISOString()
    })
    .eq('id', levelId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Reject a level
 */
export async function rejectLevel(
  levelId: string,
  moderatorId: string,
  notes: string
): Promise<Level> {
  const { data, error } = await supabase
    .from('levels')
    .update({
      moderation_status: 'rejected',
      moderator_id: moderatorId,
      moderation_notes: notes,
      moderated_at: new Date().toISOString()
    })
    .eq('id', levelId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get moderation statistics
 */
export interface ModerationStats {
  pending: number;
  approved: number;
  rejected: number;
  total: number;
}

export async function getModerationStats(): Promise<ModerationStats> {
  const { data, error } = await supabase
    .from('levels')
    .select('moderation_status')
    .neq('created_by', null); // Only editor-created levels

  if (error) throw error;

  const stats = {
    pending: 0,
    approved: 0,
    rejected: 0,
    total: data?.length || 0
  };

  data?.forEach(level => {
    if (level.moderation_status === 'pending_review') stats.pending++;
    else if (level.moderation_status === 'approved') stats.approved++;
    else if (level.moderation_status === 'rejected') stats.rejected++;
  });

  return stats;
}
