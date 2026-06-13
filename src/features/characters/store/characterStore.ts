/**
 * Character Store (Zustand)
 *
 * Global state management for character system
 */

import { create } from 'zustand';
import { CharacterStore, CharacterResponse, CharacterEvent, UserCharacterPreferences, UserCharacterStats, CharacterName } from '../types/character.types';

const initialState = {
  currentCharacter: null,
  currentMood: null,
  currentMessage: null,
  activeEvent: null,
  isEventActive: false,
  preferences: null,
  stats: null,
  isLoading: false,
  error: null,
};

export const useCharacterStore = create<CharacterStore>((set, get) => ({
  // Initial state
  ...initialState,

  // =====================================================
  // Display character
  // =====================================================

  showCharacter: (response: CharacterResponse) => {
    set({
      currentCharacter: response.characters[0],
      currentMood: response.mood,
      currentMessage: response.message,
      activeEvent: response.event || null,
      isEventActive: !!response.event,
    });

    // Auto-hide after duration if it's an event
    if (response.event) {
      setTimeout(() => {
        get().clearEvent();
      }, response.event.duration);
    }
  },

  hideCharacter: () => {
    set({
      currentCharacter: null,
      currentMood: null,
      currentMessage: null,
    });
  },

  // =====================================================
  // Events
  // =====================================================

  triggerEvent: (event: CharacterEvent) => {
    set({
      activeEvent: event,
      isEventActive: true,
    });

    // Auto-clear after duration
    setTimeout(() => {
      get().clearEvent();
    }, event.duration);
  },

  clearEvent: () => {
    set({
      activeEvent: null,
      isEventActive: false,
    });
  },

  // =====================================================
  // Preferences
  // =====================================================

  loadPreferences: async (userId: string) => {
    try {
      set({ isLoading: true, error: null });

      // Import here to avoid circular dependency
      const { getUserPreferences } = await import('../api/characterApi');
      const preferences = await getUserPreferences(userId);

      set({
        preferences,
        isLoading: false,
      });
    } catch (error) {
      console.error('Failed to load preferences:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to load preferences',
        isLoading: false,
      });
    }
  },

  updatePreferences: async (updates: Partial<UserCharacterPreferences>) => {
    try {
      const currentPrefs = get().preferences;
      if (!currentPrefs) return;

      set({ isLoading: true, error: null });

      // Import here to avoid circular dependency
      const { updateUserPreferences } = await import('../api/characterApi');
      const updatedPreferences = await updateUserPreferences(currentPrefs.user_id, updates);

      set({
        preferences: updatedPreferences,
        isLoading: false,
      });
    } catch (error) {
      console.error('Failed to update preferences:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to update preferences',
        isLoading: false,
      });
    }
  },

  // =====================================================
  // Statistics
  // =====================================================

  loadStats: async (userId: string) => {
    try {
      set({ isLoading: true, error: null });

      // Import here to avoid circular dependency
      const { getCharacterStats } = await import('../api/characterApi');
      const stats = await getCharacterStats(userId);

      set({
        stats,
        isLoading: false,
      });
    } catch (error) {
      console.error('Failed to load stats:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to load stats',
        isLoading: false,
      });
    }
  },

  incrementInteraction: (character: CharacterName) => {
    const currentStats = get().stats;
    if (!currentStats) return;

    const updatedBreakdown = {
      ...currentStats.characterBreakdown,
      [character]: (currentStats.characterBreakdown[character] || 0) + 1,
    };

    set({
      stats: {
        ...currentStats,
        totalInteractions: currentStats.totalInteractions + 1,
        characterBreakdown: updatedBreakdown,
        lastSeenCharacter: character,
        lastSeenAt: new Date().toISOString(),
      },
    });
  },

  // =====================================================
  // Reset
  // =====================================================

  reset: () => {
    set(initialState);
  },
}));

// =====================================================
// Selectors (for performance)
// =====================================================

export const selectCurrentCharacter = (state: CharacterStore) => state.currentCharacter;
export const selectCurrentMood = (state: CharacterStore) => state.currentMood;
export const selectActiveEvent = (state: CharacterStore) => state.activeEvent;
export const selectIsEventActive = (state: CharacterStore) => state.isEventActive;
export const selectPreferences = (state: CharacterStore) => state.preferences;
export const selectStats = (state: CharacterStore) => state.stats;
