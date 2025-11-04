import { supabase } from '@/shared/lib/supabase';
import type { Level } from '@/shared/types';

export async function getLevels(studentClass?: string): Promise<Level[]> {
  let query = supabase
    .from('levels')
    .select('*')
    .order('order_index', { ascending: true });

  // If a student class is provided, filter levels based on allowed_classes
  if (studentClass) {
    // Get levels where:
    // 1. allowed_classes is NULL (available to all), OR
    // 2. allowed_classes is an empty array (available to all), OR
    // 3. studentClass is in the allowed_classes array
    query = query.or(`allowed_classes.is.null,allowed_classes.eq.{},allowed_classes.cs.{${studentClass}}`);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

export async function getLevelById(id: string): Promise<Level> {
  const { data, error } = await supabase
    .from('levels')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export async function getLevelsByTopic(topic: string): Promise<Level[]> {
  const { data, error } = await supabase
    .from('levels')
    .select('*')
    .eq('topic', topic)
    .order('order_index', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getLevelsByDifficulty(difficulty: 'easy' | 'medium' | 'hard'): Promise<Level[]> {
  const { data, error } = await supabase
    .from('levels')
    .select('*')
    .eq('difficulty', difficulty)
    .order('order_index', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Teacher API - Create, Update, Delete levels
 */

export interface CreateLevelData {
  title: string;
  description: string;
  educational_context?: string;
  reference_solution: string;
  test_cases: { input: string; output: string; description?: string }[];
  hints?: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  order_index: number;
  topic?: string;
  language: string;
  target_skills: string[];
  is_remedial?: boolean;
  remedial_for?: string[];
  allowed_classes?: string[]; // NULL or empty = available to all
}

export async function createLevel(levelData: CreateLevelData, teacherId: string): Promise<Level> {
  const { data, error } = await supabase
    .from('levels')
    .insert({
      ...levelData,
      created_by: teacherId
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateLevel(id: string, levelData: Partial<CreateLevelData>): Promise<Level> {
  const { data, error } = await supabase
    .from('levels')
    .update(levelData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteLevel(id: string): Promise<void> {
  const { error } = await supabase
    .from('levels')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

/**
 * Get all levels with submission statistics for teacher dashboard
 */
export async function getLevelsWithStats(): Promise<(Level & { total_submissions?: number; success_rate?: number })[]> {
  // For now, just return levels. We'll add stats aggregation later
  const levels = await getLevels();
  return levels;
}
