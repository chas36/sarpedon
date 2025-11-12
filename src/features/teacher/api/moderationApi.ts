import { supabase } from '@/shared/lib/supabase';
import type { Level, Profile } from '@/shared/types';

export interface LevelWithAuthor extends Level {
  author?: Profile;
}

/**
 * DEBUG: Get all levels (for debugging)
 */
export async function getAllLevelsDebug() {
  const { data, error } = await supabase
    .from('levels')
    .select('id, title, moderation_status, created_by')
    .order('created_at', { ascending: false });

  console.log('DEBUG: All levels in DB', { data, error });
  return { data, error };
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
    .not('created_by', 'is', null); // Only editor-created levels

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

/**
 * Import levels from JSON
 */
export interface ImportLevelData {
  title: string;
  description: string;
  educational_context?: string;
  language: string;
  difficulty: number;
  topic?: string;
  target_skills?: string[];
  reference_solution: string;
  test_cases: { input: string; output: string; description?: string }[];
  hints?: string[];
}

export interface ImportResult {
  success: boolean;
  imported: number;
  failed: number;
  errors: { level: string; error: string }[];
}

export async function importLevelsFromJSON(
  levelsData: ImportLevelData[],
  authorId: string | null
): Promise<ImportResult> {
  const result: ImportResult = {
    success: true,
    imported: 0,
    failed: 0,
    errors: []
  };

  // Get max order_index
  const { data: existingLevels } = await supabase
    .from('levels')
    .select('order_index')
    .order('order_index', { ascending: false })
    .limit(1);

  let nextOrderIndex = (existingLevels?.[0]?.order_index || 0) + 1;

  // Determine moderation status based on author
  // If authorId is null (teacher import) -> approved
  // If authorId is set (student editor) -> pending_review
  const moderationStatus = authorId === null ? 'approved' : 'pending_review';

  for (const levelData of levelsData) {
    try {
      // Validate required fields
      if (!levelData.title || !levelData.description || !levelData.reference_solution) {
        throw new Error('Отсутствуют обязательные поля: title, description, reference_solution');
      }

      if (!levelData.test_cases || levelData.test_cases.length === 0) {
        throw new Error('Требуется хотя бы один тест-кейс');
      }

      if (levelData.difficulty < 1 || levelData.difficulty > 10) {
        throw new Error('Сложность должна быть от 1 до 10');
      }

      // Create level
      // Teacher imports: moderation_status = 'approved', created_by = null
      // Student editor imports: moderation_status = 'pending_review', created_by = authorId
      const { error } = await supabase
        .from('levels')
        .insert({
          title: levelData.title,
          description: levelData.description,
          educational_context: levelData.educational_context,
          language: levelData.language || 'python',
          difficulty: levelData.difficulty,
          topic: levelData.topic,
          target_skills: levelData.target_skills || [],
          reference_solution: levelData.reference_solution,
          test_cases: levelData.test_cases,
          hints: levelData.hints || [],
          order_index: nextOrderIndex++,
          moderation_status: moderationStatus,
          created_by: authorId
        });

      if (error) {
        console.error('Supabase insert error:', error);
        throw new Error(`${error.message} (code: ${error.code})`);
      }
      result.imported++;
    } catch (err) {
      result.failed++;
      result.errors.push({
        level: levelData.title || 'Без названия',
        error: err instanceof Error ? err.message : 'Неизвестная ошибка'
      });
    }
  }

  result.success = result.failed === 0;
  return result;
}
