/**
 * useCharacter Hook
 *
 * Custom hook for working with character system
 */

import { useEffect } from 'react';
import { useCharacterStore } from '../store/characterStore';
import { selectCharacter } from '../utils/characterSelector';
import { createCharacterInteraction, isEventOnCooldown, recordEventTrigger } from '../api/characterApi';
import { CharacterContext, CharacterResponse } from '../types/character.types';

export function useCharacter(userId: string) {
  const {
    currentCharacter,
    currentMood,
    currentMessage,
    activeEvent,
    isEventActive,
    showCharacter,
    hideCharacter,
    triggerEvent,
    clearEvent,
    loadPreferences,
    loadStats,
  } = useCharacterStore();

  // Load user data on mount
  useEffect(() => {
    if (userId) {
      loadPreferences(userId);
      loadStats(userId);
    }
  }, [userId, loadPreferences, loadStats]);

  /**
   * Select and show character based on context
   */
  const selectAndShowCharacter = async (context: CharacterContext & { userId: string; submissionId?: string }) => {
    try {
      // Select character
      const response = selectCharacter(context);

      // Check if event is on cooldown
      if (response.event) {
        const onCooldown = await isEventOnCooldown(userId, response.event.type);
        if (onCooldown) {
          // Don't show event, just show regular feedback
          const fallbackResponse: CharacterResponse = {
            ...response,
            event: undefined,
          };
          showCharacter(fallbackResponse);

          // Save interaction without event
          await createCharacterInteraction({
            userId: context.userId,
            submissionId: context.submissionId,
            characterName: fallbackResponse.characters[0],
            mood: fallbackResponse.mood,
            message: fallbackResponse.message,
            interactionType: 'feedback',
            context,
          });

          return fallbackResponse;
        }

        // Record event trigger for cooldown
        await recordEventTrigger(userId, response.event.type);
      }

      // Show character
      showCharacter(response);

      // Save interaction to database
      await createCharacterInteraction({
        userId: context.userId,
        submissionId: context.submissionId,
        characterName: response.characters[0],
        mood: response.mood,
        message: response.message,
        interactionType: response.interactionType,
        eventType: response.event?.type,
        context,
      });

      return response;
    } catch (error) {
      console.error('Failed to select and show character:', error);
      // Show default Johnny on error
      const fallbackResponse: CharacterResponse = {
        characters: ['johnny'],
        mood: 'neutral',
        message: 'Ур-ур! 🐻',
        interactionType: 'feedback',
      };
      showCharacter(fallbackResponse);
      return fallbackResponse;
    }
  };

  /**
   * Hide character and clear state
   */
  const hideAndClear = () => {
    hideCharacter();
    if (activeEvent) {
      clearEvent();
    }
  };

  return {
    // Current state
    currentCharacter,
    currentMood,
    currentMessage,
    activeEvent,
    isEventActive,

    // Actions
    selectAndShowCharacter,
    showCharacter,
    hideCharacter: hideAndClear,
    triggerEvent,
    clearEvent,
  };
}

// =====================================================
// Convenience hooks
// =====================================================

/**
 * Hook for showing character on submission feedback
 */
export function useSubmissionCharacter(userId: string) {
  const { selectAndShowCharacter } = useCharacter(userId);

  const showFeedbackCharacter = async (
    isCorrect: boolean,
    qualityScore: number,
    attemptNumber: number,
    submissionId: string,
    additionalContext?: Partial<CharacterContext>
  ) => {
    return await selectAndShowCharacter({
      userId,
      submissionId,
      isCorrect,
      qualityScore,
      attemptNumber,
      consecutiveErrors: additionalContext?.consecutiveErrors || 0,
      totalCompleted: additionalContext?.totalCompleted || 0,
      ...additionalContext,
    });
  };

  return { showFeedbackCharacter };
}
