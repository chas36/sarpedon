/**
 * Character API
 *
 * API functions for character interactions
 */

import { supabase } from '@/shared/lib/supabase';
import {
  CharacterInteraction,
  CharacterEventHistory,
  UserCharacterPreferences,
  UserCharacterStats,
  CharacterStats,
  CreateCharacterInteractionRequest,
  CharacterEventType,
  CharacterName,
} from '../types/character.types';
import { getEventCooldownDuration } from '../config/eventConfig';

// =====================================================
// Character Interactions
// =====================================================

/**
 * Create a new character interaction
 */
export async function createCharacterInteraction(
  request: CreateCharacterInteractionRequest
): Promise<CharacterInteraction> {
  const { data, error } = await supabase
    .from('character_interactions')
    .insert({
      user_id: request.userId,
      submission_id: request.submissionId || null,
      character_name: request.characterName,
      mood: request.mood,
      message: request.message,
      interaction_type: request.interactionType,
      event_type: request.eventType || null,
      context: request.context,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating character interaction:', error);
    throw new Error(`Failed to create character interaction: ${error.message}`);
  }

  return data;
}

/**
 * Get user's character interactions
 */
export async function getUserInteractions(
  userId: string,
  limit = 50
): Promise<CharacterInteraction[]> {
  const { data, error } = await supabase
    .from('character_interactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching user interactions:', error);
    throw new Error(`Failed to fetch interactions: ${error.message}`);
  }

  return data || [];
}

/**
 * Get interactions by character
 */
export async function getInteractionsByCharacter(
  userId: string,
  characterName: CharacterName
): Promise<CharacterInteraction[]> {
  const { data, error } = await supabase
    .from('character_interactions')
    .select('*')
    .eq('user_id', userId)
    .eq('character_name', characterName)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching character interactions:', error);
    throw new Error(`Failed to fetch interactions: ${error.message}`);
  }

  return data || [];
}

// =====================================================
// Event History & Cooldowns
// =====================================================

/**
 * Check if event is on cooldown
 */
export async function isEventOnCooldown(
  userId: string,
  eventType: CharacterEventType
): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_event_on_cooldown', {
    p_user_id: userId,
    p_event_type: eventType,
  });

  if (error) {
    console.error('Error checking event cooldown:', error);
    return true; // Fail safe: assume on cooldown
  }

  return data === true;
}

/**
 * Record event trigger (for cooldown tracking)
 */
export async function recordEventTrigger(
  userId: string,
  eventType: CharacterEventType,
  metadata: Record<string, unknown> = {}
): Promise<CharacterEventHistory> {
  const cooldownDuration = getEventCooldownDuration(eventType);
  const cooldownUntil = new Date(Date.now() + cooldownDuration);

  const { data, error } = await supabase
    .from('character_events_history')
    .insert({
      user_id: userId,
      event_type: eventType,
      cooldown_until: cooldownUntil.toISOString(),
      metadata,
    })
    .select()
    .single();

  if (error) {
    console.error('Error recording event trigger:', error);
    throw new Error(`Failed to record event: ${error.message}`);
  }

  return data;
}

/**
 * Get user's event history
 */
export async function getUserEventHistory(
  userId: string,
  limit = 20
): Promise<CharacterEventHistory[]> {
  const { data, error } = await supabase
    .from('character_events_history')
    .select('*')
    .eq('user_id', userId)
    .order('triggered_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching event history:', error);
    throw new Error(`Failed to fetch event history: ${error.message}`);
  }

  return data || [];
}

// =====================================================
// User Preferences
// =====================================================

/**
 * Get user's character preferences
 */
export async function getUserPreferences(
  userId: string
): Promise<UserCharacterPreferences | null> {
  const { data, error } = await supabase
    .from('user_character_preferences')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No preferences yet, create default
      return await createDefaultPreferences(userId);
    }
    console.error('Error fetching user preferences:', error);
    throw new Error(`Failed to fetch preferences: ${error.message}`);
  }

  return data;
}

/**
 * Create default preferences for new user
 */
export async function createDefaultPreferences(
  userId: string
): Promise<UserCharacterPreferences> {
  const defaultPreferences = {
    user_id: userId,
    favorite_character: null,
    interaction_counts: {},
    response_to_muskva: null,
    response_to_johnny: null,
    prefers_support: true,
    last_event: null,
  };

  const { data, error } = await supabase
    .from('user_character_preferences')
    .insert(defaultPreferences)
    .select()
    .single();

  if (error) {
    console.error('Error creating default preferences:', error);
    throw new Error(`Failed to create preferences: ${error.message}`);
  }

  return data;
}

/**
 * Update user's character preferences
 */
export async function updateUserPreferences(
  userId: string,
  updates: Partial<UserCharacterPreferences>
): Promise<UserCharacterPreferences> {
  const { data, error } = await supabase
    .from('user_character_preferences')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error updating preferences:', error);
    throw new Error(`Failed to update preferences: ${error.message}`);
  }

  return data;
}

/**
 * Increment interaction count for character
 */
export async function incrementCharacterCount(
  userId: string,
  characterName: CharacterName
): Promise<void> {
  const preferences = await getUserPreferences(userId);
  if (!preferences) return;

  const currentCounts = preferences.interaction_counts || {};
  const updatedCounts = {
    ...currentCounts,
    [characterName]: (currentCounts[characterName as keyof typeof currentCounts] || 0) + 1,
  };

  await updateUserPreferences(userId, {
    interaction_counts: updatedCounts,
  });
}

// =====================================================
// Statistics
// =====================================================

/**
 * Get character statistics for user
 */
export async function getCharacterStats(userId: string): Promise<UserCharacterStats> {
  const { data, error } = await supabase.rpc('get_character_stats', {
    p_user_id: userId,
  });

  if (error) {
    console.error('Error fetching character stats:', error);
    // Return empty stats on error
    return {
      totalInteractions: 0,
      favoriteCharacter: null,
      characterBreakdown: {
        muskva: 0,
        johnny: 0,
        panda: 0,
        tapka_potapka: 0,
      },
      eventBreakdown: {
        coffee_break: 0,
        union_protest: 0,
        fns_scare: 0,
        glasha_mention: 0,
      },
      lastSeenCharacter: null,
      lastSeenAt: null,
    };
  }

  // Process database response into UserCharacterStats
  const stats = data as CharacterStats[];

  const characterBreakdown = stats.reduce(
    (acc, stat) => {
      acc[stat.character_name] = Number(stat.total_interactions);
      return acc;
    },
    {
      muskva: 0,
      johnny: 0,
      panda: 0,
      tapka_potapka: 0,
    } as Record<CharacterName, number>
  );

  const totalInteractions = stats.reduce(
    (sum, stat) => sum + Number(stat.total_interactions),
    0
  );

  const favoriteCharacter =
    stats.length > 0 ? stats[0].character_name : null;

  const lastSeenStat = stats.find((s) => s.last_interaction !== null);

  // Get event breakdown
  const eventBreakdown = await getEventBreakdown(userId);

  return {
    totalInteractions,
    favoriteCharacter,
    characterBreakdown,
    eventBreakdown,
    lastSeenCharacter: lastSeenStat?.character_name || null,
    lastSeenAt: lastSeenStat?.last_interaction || null,
  };
}

/**
 * Get event breakdown statistics
 */
async function getEventBreakdown(
  userId: string
): Promise<Record<CharacterEventType, number>> {
  const { data, error } = await supabase
    .from('character_interactions')
    .select('event_type')
    .eq('user_id', userId)
    .eq('interaction_type', 'event')
    .not('event_type', 'is', null);

  if (error) {
    console.error('Error fetching event breakdown:', error);
    return {
      coffee_break: 0,
      union_protest: 0,
      fns_scare: 0,
      glasha_mention: 0,
    };
  }

  const breakdown = data.reduce(
    (acc, row) => {
      if (row.event_type) {
        acc[row.event_type as CharacterEventType] =
          (acc[row.event_type as CharacterEventType] || 0) + 1;
      }
      return acc;
    },
    {
      coffee_break: 0,
      union_protest: 0,
      fns_scare: 0,
      glasha_mention: 0,
    } as Record<CharacterEventType, number>
  );

  return breakdown;
}

// =====================================================
// Analytics (for teachers)
// =====================================================

/**
 * Get all interactions for class (teacher view)
 */
export async function getClassInteractions(
  className: string,
  limit = 100
): Promise<CharacterInteraction[]> {
  // First get user IDs for the class
  const { data: students, error: studentsError } = await supabase
    .from('profiles')
    .select('id')
    .eq('class', className)
    .eq('role', 'student');

  if (studentsError) {
    console.error('Error fetching students:', studentsError);
    throw new Error(`Failed to fetch students: ${studentsError.message}`);
  }

  const studentIds = students.map((s) => s.id);

  // Get interactions for all students
  const { data, error } = await supabase
    .from('character_interactions')
    .select('*')
    .in('user_id', studentIds)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching class interactions:', error);
    throw new Error(`Failed to fetch interactions: ${error.message}`);
  }

  return data || [];
}

/**
 * Get character usage statistics for class
 */
export async function getClassCharacterStats(
  className: string
): Promise<Record<CharacterName, number>> {
  const interactions = await getClassInteractions(className, 1000);

  return interactions.reduce(
    (acc, interaction) => {
      acc[interaction.character_name] =
        (acc[interaction.character_name] || 0) + 1;
      return acc;
    },
    {
      muskva: 0,
      johnny: 0,
      panda: 0,
      tapka_potapka: 0,
    } as Record<CharacterName, number>
  );
}
