import { supabase } from '@/shared/lib/supabase';
import type { TeacherSettings, AIProvider } from '@/shared/types/database.types';

/**
 * API for managing teacher settings including AI model selection and configuration
 */

export interface UpdateTeacherSettingsPayload {
  ai_provider?: AIProvider;
  ai_model?: string;
  groq_api_key?: string;
  openrouter_api_key?: string;
  ai_temperature?: number;
  ai_max_tokens?: number;
  ai_top_p?: number;
  ai_enabled?: boolean;
  ai_hints_enabled?: boolean;
  feedback_style?: 'adaptive' | 'detailed' | 'concise' | 'minimal';
}

/**
 * Get teacher settings for the current authenticated teacher
 * Note: API keys are NOT returned for security reasons
 */
export async function getTeacherSettings(): Promise<TeacherSettings | null> {
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase
    .from('teacher_settings')
    .select('teacher_id, ai_provider, ai_model, groq_api_key, openrouter_api_key, ai_temperature, ai_max_tokens, ai_top_p, ai_enabled, ai_hints_enabled, feedback_style, last_connection_check, connection_status, connection_error, created_at, updated_at')
    .eq('teacher_id', user.id)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = not found
    throw error;
  }

  // Return data with masked API keys (show only if they exist, not the actual values)
  if (data) {
    const hasGroqKey = !!data.groq_api_key;
    const hasOpenrouterKey = !!data.openrouter_api_key;

    return {
      ...data,
      // Don't return actual keys, only indicate if they exist
      groq_api_key: hasGroqKey ? '***SAVED***' : undefined,
      openrouter_api_key: hasOpenrouterKey ? '***SAVED***' : undefined
    } as TeacherSettings;
  }

  return null;
}

/**
 * Initialize default settings for a teacher
 */
export async function initializeTeacherSettings(): Promise<TeacherSettings> {
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('User not authenticated');
  }

  // Call the database function to initialize settings
  const { data, error } = await supabase
    .rpc('initialize_teacher_settings', { p_teacher_id: user.id });

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Get or initialize teacher settings (convenience function)
 */
export async function getOrInitializeTeacherSettings(): Promise<TeacherSettings> {
  let settings = await getTeacherSettings();

  if (!settings) {
    settings = await initializeTeacherSettings();
  }

  return settings;
}

/**
 * Update teacher settings
 */
export async function updateTeacherSettings(
  payload: UpdateTeacherSettingsPayload
): Promise<TeacherSettings> {
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('User not authenticated');
  }

  // First, ensure settings exist
  await getOrInitializeTeacherSettings();

  // Then update
  const { data, error } = await supabase
    .from('teacher_settings')
    .update(payload)
    .eq('teacher_id', user.id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Update connection status for AI provider
 */
export async function updateConnectionStatus(
  status: 'connected' | 'disconnected' | 'error' | 'unknown',
  errorMessage?: string
): Promise<void> {
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('User not authenticated');
  }

  const { error } = await supabase
    .from('teacher_settings')
    .update({
      connection_status: status,
      connection_error: errorMessage || null,
      last_connection_check: new Date().toISOString()
    })
    .eq('teacher_id', user.id);

  if (error) {
    throw error;
  }
}

/**
 * Test connection to AI provider
 * If apiKey is not provided, the Edge Function will try to use:
 * 1. Saved API key from teacher_settings table
 * 2. Environment variable (GROQ_API_KEY or OPENROUTER_API_KEY)
 */
export async function testAIConnection(
  provider: AIProvider,
  apiKey?: string,
  model?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('test-ai-connection', {
      body: {
        provider,
        apiKey, // Can be undefined - Edge Function will handle it
        model
      }
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return data;
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error'
    };
  }
}

/**
 * Available AI models by provider
 */
export const AI_MODELS = {
  groq: [
    { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B Instant', description: 'Fast and efficient' },
    { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B Versatile', description: 'More capable, slower' },
    { id: 'llama-3.2-90b-text-preview', name: 'Llama 3.2 90B Text Preview', description: 'Most capable' },
    { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B', description: 'Good balance' },
  ],
  openrouter: [
    { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', description: 'Excellent for code feedback' },
    { id: 'anthropic/claude-3-haiku', name: 'Claude 3 Haiku', description: 'Fast and affordable' },
    { id: 'openai/gpt-4o', name: 'GPT-4o', description: 'OpenAI latest' },
    { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini', description: 'Fast and affordable' },
    { id: 'google/gemini-2.0-flash-exp:free', name: 'Gemini 2.0 Flash', description: 'Free, fast' },
    { id: 'meta-llama/llama-3.1-8b-instruct:free', name: 'Llama 3.1 8B', description: 'Free' },
  ]
} as const;

export default {
  getTeacherSettings,
  initializeTeacherSettings,
  getOrInitializeTeacherSettings,
  updateTeacherSettings,
  updateConnectionStatus,
  testAIConnection,
  AI_MODELS
};
