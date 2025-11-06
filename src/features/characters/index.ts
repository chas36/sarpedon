/**
 * Characters Feature Export
 *
 * Main entry point for character system
 */

// Components
export * from './components';

// Hooks
export { useCharacter, useSubmissionCharacter } from './hooks/useCharacter';

// Store
export { useCharacterStore } from './store/characterStore';

// Types
export type {
  CharacterName,
  MoodType,
  CharacterContext,
  CharacterResponse,
  CharacterEvent,
  CharacterEventType,
  UserCharacterPreferences,
  UserCharacterStats,
} from './types/character.types';

// Utils
export { selectCharacter, getCharacterDisplayName, getCharacterColors } from './utils/characterSelector';

// API
export * from './api/characterApi';

// Config
export { CHARACTER_PHRASES, CHARACTER_EVENTS } from './config/characterPhrases';
export { EVENT_PROBABILITIES, isHoliday } from './config/eventConfig';
