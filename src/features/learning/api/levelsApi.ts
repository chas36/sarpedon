import { supabase } from '@/shared/lib/supabase';
import type { Level } from '@/shared/types';

export async function getLevels(): Promise<Level[]> {
  const { data, error } = await supabase
    .from('levels')
    .select('*')
    .order('order_index', { ascending: true });

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
