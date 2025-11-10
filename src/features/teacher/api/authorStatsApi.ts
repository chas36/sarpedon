import { supabase } from '@/shared/lib/supabase';
import type { Profile } from '@/shared/types';

export interface AuthorStats {
  author: Profile;
  total_levels: number;
  approved_levels: number;
  pending_levels: number;
  rejected_levels: number;
  total_submissions: number;
  passed_submissions: number;
  success_rate: number;
}

/**
 * Get statistics for all level authors (editors)
 */
export async function getAuthorStats(): Promise<AuthorStats[]> {
  // Get all editors
  const { data: editors, error: editorsError } = await supabase
    .from('profiles')
    .select('*')
    .eq('is_editor', true)
    .order('last_name', { ascending: true });

  if (editorsError) throw editorsError;
  if (!editors) return [];

  // Get level and submission stats for each editor
  const statsPromises = editors.map(async (editor) => {
    // Get levels created by this editor
    const { data: levels, error: levelsError } = await supabase
      .from('levels')
      .select('id, moderation_status')
      .eq('created_by', editor.id);

    if (levelsError) throw levelsError;

    const total_levels = levels?.length || 0;
    const approved_levels = levels?.filter(l => l.moderation_status === 'approved').length || 0;
    const pending_levels = levels?.filter(l => l.moderation_status === 'pending_review').length || 0;
    const rejected_levels = levels?.filter(l => l.moderation_status === 'rejected').length || 0;

    // Get submissions for approved levels
    const approvedLevelIds = levels?.filter(l => l.moderation_status === 'approved').map(l => l.id) || [];

    let total_submissions = 0;
    let passed_submissions = 0;

    if (approvedLevelIds.length > 0) {
      const { data: submissions, error: submissionsError } = await supabase
        .from('submissions')
        .select('status')
        .in('level_id', approvedLevelIds);

      if (submissionsError) throw submissionsError;

      total_submissions = submissions?.length || 0;
      passed_submissions = submissions?.filter(s => s.status === 'passed').length || 0;
    }

    const success_rate = total_submissions > 0
      ? Math.round((passed_submissions / total_submissions) * 100)
      : 0;

    return {
      author: editor,
      total_levels,
      approved_levels,
      pending_levels,
      rejected_levels,
      total_submissions,
      passed_submissions,
      success_rate
    };
  });

  return Promise.all(statsPromises);
}
