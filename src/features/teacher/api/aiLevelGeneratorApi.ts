import { supabase } from '@/shared/lib/supabase';

export interface GenerateLevelRequest {
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  language: string;
  count: number;
  additionalContext?: string;
}

export interface GeneratedLevel {
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  language: string;
  test_cases: Array<{
    input: string;
    output: string;
    description?: string;
  }>;
  hints: string[];
  reference_solution: string;
  target_skills: string[];
}

export interface GenerateLevelResponse {
  success: boolean;
  levels?: GeneratedLevel[];
  error?: string;
}

/**
 * Generate programming levels using AI
 */
export async function generateLevels(request: GenerateLevelRequest): Promise<GenerateLevelResponse> {
  try {
    console.log('Calling Edge Function generate-level:', request);

    const { data, error } = await supabase.functions.invoke('generate-level', {
      body: request
    });

    console.log('Edge Function response:', { data, error });

    if (error) {
      console.error('Edge Function error:', error);
      throw new Error(`Edge Function error: ${error.message || error}`);
    }

    if (!data) {
      throw new Error('No data returned from Edge Function');
    }

    if (!data.success) {
      throw new Error(data.error || 'Failed to generate levels');
    }

    return {
      success: true,
      levels: data.levels
    };

  } catch (error) {
    console.error('AI Level Generation error:', error);

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
