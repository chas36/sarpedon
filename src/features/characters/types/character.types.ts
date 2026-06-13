/**
 * Character System Types
 */

import { CharacterName, MoodType } from '../config/characterPhrases';

// =====================================================
// Database Types
// =====================================================

export interface CharacterInteraction {
  id: string;
  user_id: string;
  submission_id: string | null;
  character_name: CharacterName;
  mood: MoodType;
  message: string;
  interaction_type: 'feedback' | 'event' | 'random';
  event_type: CharacterEventType | null;
  context: CharacterContext;
  created_at: string;
}

export interface CharacterEventHistory {
  id: string;
  user_id: string;
  event_type: string;
  triggered_at: string;
  cooldown_until: string;
  metadata: Record<string, unknown>;
}

export interface UserCharacterPreferences {
  user_id: string;
  favorite_character: CharacterName | null;
  interaction_counts: Record<CharacterName, number>;
  response_to_muskva: 'motivated' | 'discouraged' | 'neutral' | null;
  response_to_johnny: 'motivated' | 'discouraged' | 'neutral' | null;
  prefers_support: boolean;
  last_event: {
    type: string;
    timestamp: string;
  } | null;
  updated_at: string;
}

// =====================================================
// Context Types
// =====================================================

export interface CharacterContext {
  attemptNumber: number;
  qualityScore: number;
  isCorrect: boolean;
  consecutiveErrors: number;
  totalCompleted: number;
  levelDifficulty?: number;
  [key: string]: unknown;
}

export interface FeedbackContext extends CharacterContext {
  submissionId: string;
  userId: string;
  levelId: string;
}

// =====================================================
// Event Types
// =====================================================

export type CharacterEventType =
  | 'coffee_break'
  | 'union_protest'
  | 'fns_scare'
  | 'glasha_mention';

export interface CharacterEvent {
  type: CharacterEventType;
  characters: CharacterName[];
  message: string;
  duration: number; // milliseconds
  interruptsMuskva?: boolean;
  probability?: number;
}

export interface EventProbability {
  baseChance: number;
  increasedAfter?: number;
  increasedChance?: number;
  cooldown: number; // minimum number of submissions between events
  afterStreak?: number;
  whenMuskvaAngry?: number;
  onHolidays?: number;
}

// =====================================================
// Character Response Types
// =====================================================

export interface CharacterResponse {
  characters: CharacterName[];
  mood: MoodType;
  message: string;
  emoji?: string;
  event?: CharacterEvent;
  interactionType: 'feedback' | 'event' | 'random';
}

export interface CharacterSelectionResult {
  character: CharacterName;
  mood: MoodType;
  message: string;
  emoji?: string;
  eventType?: CharacterEventType;
  shouldShowEvent: boolean;
}

// =====================================================
// Character Configuration Types
// =====================================================

export interface CharacterConfig {
  name: CharacterName;
  displayName: string;
  description: string;
  defaultMood: MoodType;
  availableMoods: MoodType[];
  colors: {
    primary: string;
    secondary: string;
    background: string;
  };
  avatar: string; // SVG or image path
}

// =====================================================
// Animation Types
// =====================================================

export type AnimationType =
  | 'enter'
  | 'exit'
  | 'idle'
  | 'bounce'
  | 'shake'
  | 'slide-in'
  | 'slide-out'
  | 'fade-in'
  | 'fade-out';

export interface CharacterAnimation {
  type: AnimationType;
  duration: number;
  delay?: number;
  repeat?: boolean;
}

// =====================================================
// Statistics Types
// =====================================================

export interface CharacterStats {
  character_name: CharacterName;
  total_interactions: number;
  feedback_count: number;
  event_count: number;
  last_interaction: string | null;
}

export interface UserCharacterStats {
  totalInteractions: number;
  favoriteCharacter: CharacterName | null;
  characterBreakdown: Record<CharacterName, number>;
  eventBreakdown: Record<CharacterEventType, number>;
  lastSeenCharacter: CharacterName | null;
  lastSeenAt: string | null;
}

// =====================================================
// API Request/Response Types
// =====================================================

export interface CreateCharacterInteractionRequest {
  userId: string;
  submissionId?: string;
  characterName: CharacterName;
  mood: MoodType;
  message: string;
  interactionType: 'feedback' | 'event' | 'random';
  eventType?: CharacterEventType;
  context: CharacterContext;
}

export interface CreateCharacterInteractionResponse {
  success: boolean;
  interaction?: CharacterInteraction;
  error?: string;
}

export interface CheckEventCooldownRequest {
  userId: string;
  eventType: CharacterEventType;
}

export interface CheckEventCooldownResponse {
  isOnCooldown: boolean;
  cooldownUntil?: string;
  canTrigger: boolean;
}

// =====================================================
// Store Types
// =====================================================

export interface CharacterState {
  // Current character being displayed
  currentCharacter: CharacterName | null;
  currentMood: MoodType | null;
  currentMessage: string | null;

  // Event state
  activeEvent: CharacterEvent | null;
  isEventActive: boolean;

  // User preferences
  preferences: UserCharacterPreferences | null;

  // Statistics
  stats: UserCharacterStats | null;

  // Loading state
  isLoading: boolean;
  error: string | null;
}

export interface CharacterActions {
  // Display character
  showCharacter: (response: CharacterResponse) => void;
  hideCharacter: () => void;

  // Events
  triggerEvent: (event: CharacterEvent) => void;
  clearEvent: () => void;

  // Preferences
  loadPreferences: (userId: string) => Promise<void>;
  updatePreferences: (preferences: Partial<UserCharacterPreferences>) => Promise<void>;

  // Statistics
  loadStats: (userId: string) => Promise<void>;
  incrementInteraction: (character: CharacterName) => void;

  // Reset
  reset: () => void;
}

export type CharacterStore = CharacterState & CharacterActions;

// =====================================================
// Utility Types
// =====================================================

export type CharacterPhraseKey =
  | 'first_error'
  | 'multiple_errors'
  | 'many_errors'
  | 'perfect_success'
  | 'good_success'
  | 'mediocre_success'
  | 'greeting'
  | 'success'
  | 'coffee_break'
  | 'main_protest'
  | 'fns_scare'
  | 'glasha_mention';

export interface CharacterPhrase {
  mood: MoodType;
  text: string;
  emoji?: string;
}
