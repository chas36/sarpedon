import { supabase } from '@/shared/lib/supabase';
import type { Level, Profile } from '@/shared/types';

export interface LevelWithAuthor extends Level {
  author?: Profile;
}

/**
 * Get all levels pending moderation
 */
export async function getPendingLevels(): Promise<LevelWithAuthor[]> {
  // Get pending levels
  const { data: levels, error: levelsError } = await supabase
    .from('levels')
    .select('*')
    .eq('moderation_status', 'pending_review')
    .order('created_at', { ascending: false });

  console.log('getPendingLevels: levels result', { levels, error: levelsError });

  if (levelsError) throw levelsError;
  if (!levels || levels.length === 0) return [];

  // Get unique author IDs
  const authorIds = [...new Set(levels.map(l => l.created_by).filter(Boolean))];

  // Get author profiles (if there are any)
  let authors: Profile[] = [];
  if (authorIds.length > 0) {
    const { data: authorsData, error: authorsError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, full_name')
      .in('id', authorIds);

    if (authorsError) throw authorsError;
    authors = authorsData || [];
  }

  // Create a map of authors by ID
  const authorsMap = new Map(authors?.map(a => [a.id, a]) || []);

  // Merge levels with authors
  return levels.map(level => ({
    ...level,
    author: level.created_by ? authorsMap.get(level.created_by) : undefined
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
