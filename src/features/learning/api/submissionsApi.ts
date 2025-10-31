import { supabase } from '@/shared/lib/supabase';
import type {
  Submission,
  CreateSubmissionData,
  UpdateSubmissionData,
  UserProgress
} from '@/shared/types';

/**
 * Create a new submission
 */
export async function createSubmission(data: CreateSubmissionData): Promise<Submission> {
  const { data: submission, error } = await supabase
    .from('submissions')
    .insert(data)
    .select()
    .single();

  if (error) throw error;
  return submission;
}

/**
 * Get all submissions for a specific user
 */
export async function getSubmissionsByUser(userId: string): Promise<Submission[]> {
  const { data, error } = await supabase
    .from('submissions')
    .select('*')
    .eq('user_id', userId)
    .order('submitted_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Get all submissions for a specific level
 */
export async function getSubmissionsByLevel(levelId: string): Promise<Submission[]> {
  const { data, error } = await supabase
    .from('submissions')
    .select('*')
    .eq('level_id', levelId)
    .order('submitted_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Get the latest submission for a user and level
 */
export async function getLatestSubmission(
  userId: string,
  levelId: string
): Promise<Submission | null> {
  const { data, error } = await supabase
    .from('submissions')
    .select('*')
    .eq('user_id', userId)
    .eq('level_id', levelId)
    .order('submitted_at', { ascending: false })
    .limit(1)
    .single();

  // PGRST116 means no rows returned, which is ok
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

/**
 * Update a submission
 */
export async function updateSubmission(
  submissionId: string,
  data: UpdateSubmissionData
): Promise<Submission> {
  const { data: submission, error } = await supabase
    .from('submissions')
    .update(data)
    .eq('id', submissionId)
    .select()
    .single();

  if (error) throw error;
  return submission;
}

/**
 * Delete a submission
 */
export async function deleteSubmission(submissionId: string): Promise<void> {
  const { error } = await supabase
    .from('submissions')
    .delete()
    .eq('id', submissionId);

  if (error) throw error;
}

/**
 * Get user progress statistics
 */
export async function getUserProgress(userId: string): Promise<UserProgress> {
  // Get total number of levels
  const { count: totalLevels, error: levelsError } = await supabase
    .from('levels')
    .select('*', { count: 'exact', head: true });

  if (levelsError) throw levelsError;

  // Get all user submissions
  const { data: submissions, error: submissionsError } = await supabase
    .from('submissions')
    .select('*')
    .eq('user_id', userId);

  if (submissionsError) throw submissionsError;

  // Calculate statistics
  const uniqueLevels = new Set(submissions?.map(s => s.level_id) || []);
  const completedLevels = new Set(
    submissions?.filter(s => s.status === 'passed').map(s => s.level_id) || []
  );
  const inProgressLevels = uniqueLevels.size - completedLevels.size;

  const passedSubmissions = submissions?.filter(s => s.status === 'passed').length || 0;
  const failedSubmissions = submissions?.filter(s => s.status === 'failed').length || 0;

  return {
    total_levels: totalLevels || 0,
    completed_levels: completedLevels.size,
    in_progress_levels: inProgressLevels,
    completion_percentage: totalLevels ? Math.round((completedLevels.size / totalLevels) * 100) : 0,
    total_submissions: submissions?.length || 0,
    passed_submissions: passedSubmissions,
    failed_submissions: failedSubmissions
  };
}
