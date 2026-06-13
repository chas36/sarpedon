/**
 * Event Configuration
 *
 * Probabilities and cooldowns for character events
 */

import { CharacterEvent, CharacterEventType, EventProbability } from '../types/character.types';

// =====================================================
// Event Probabilities Configuration
// =====================================================

export const EVENT_PROBABILITIES: Record<CharacterEventType, EventProbability> = {
  coffee_break: {
    baseChance: 0.05,        // 5% after any submission
    increasedAfter: 3,       // Increased after 3+ submissions in a row
    increasedChance: 0.15,   // Increased to 15%
    cooldown: 10,            // Minimum 10 submissions between coffee breaks
  },

  union_protest: {
    baseChance: 0.02,        // 2% base chance
    cooldown: 15,            // Minimum 15 submissions between protests
    afterStreak: 0.05,       // 5% after streak > 5
    onHolidays: 0.30,        // 30% on holidays (May 1, Nov 7)
  },

  fns_scare: {
    baseChance: 0.02,        // 2% random chance
    cooldown: 20,            // Minimum 20 submissions between scares
    whenMuskvaAngry: 0.08,   // 8% when Muskva is angry
  },

  glasha_mention: {
    baseChance: 0.05,        // 5% base chance for Johnny teasing
    cooldown: 12,            // Minimum 12 submissions
    whenMuskvaAngry: 0.10,   // 10% when Muskva in 'rich' mood
  },
};

// =====================================================
// Event Definitions
// =====================================================

export const CHARACTER_EVENTS: Record<CharacterEventType, CharacterEvent> = {
  coffee_break: {
    type: 'coffee_break',
    characters: ['johnny', 'panda'],
    message: 'Ур-ур-ур прячемся! ☕ Ур-ур радость!',
    duration: 5000,
    interruptsMuskva: false,
  },

  union_protest: {
    type: 'union_protest',
    characters: ['tapka_potapka'],
    message: 'Раздуем пламя коммунистической революции! Долой Бурого! 🚩⚒️',
    duration: 8000,
    interruptsMuskva: true, // Can interrupt Muskva's feedback
  },

  fns_scare: {
    type: 'fns_scare',
    characters: ['muskva'],
    message: 'Бадютька! Дябя-дябя! Совы! *убегает* 🦉',
    duration: 4000,
    interruptsMuskva: false,
  },

  glasha_mention: {
    type: 'glasha_mention',
    characters: ['johnny', 'muskva'],
    message: 'Джонни: Ур-ур Глаша! | Мусква: Глаша?! Где?! *паника*',
    duration: 6000,
    interruptsMuskva: false,
  },
};

// =====================================================
// Holiday Dates (for increased protest probability)
// =====================================================

export const HOLIDAY_DATES: Array<{ month: number; day: number }> = [
  { month: 4, day: 1 },  // May 1 (month is 0-indexed: 4 = May)
  { month: 10, day: 7 }, // November 7
];

export function isHoliday(date: Date = new Date()): boolean {
  const month = date.getMonth();
  const day = date.getDate();

  return HOLIDAY_DATES.some(
    (holiday) => holiday.month === month && holiday.day === day
  );
}

// =====================================================
// Event Cooldown Durations (in milliseconds)
// =====================================================

export const EVENT_COOLDOWN_DURATION: Record<CharacterEventType, number> = {
  coffee_break: 10 * 60 * 1000,      // 10 minutes
  union_protest: 15 * 60 * 1000,     // 15 minutes
  fns_scare: 20 * 60 * 1000,         // 20 minutes
  glasha_mention: 12 * 60 * 1000,    // 12 minutes
};

// =====================================================
// Helper Functions
// =====================================================

/**
 * Calculate event probability based on context
 */
export function calculateEventProbability(
  eventType: CharacterEventType,
  context: {
    consecutiveSubmissions?: number;
    currentStreak?: number;
    muskvaMode?: string;
  }
): number {
  const config = EVENT_PROBABILITIES[eventType];
  let probability = config.baseChance;

  switch (eventType) {
    case 'coffee_break':
      if (
        context.consecutiveSubmissions &&
        config.increasedAfter &&
        context.consecutiveSubmissions >= config.increasedAfter
      ) {
        probability = config.increasedChance || config.baseChance;
      }
      break;

    case 'union_protest':
      if (isHoliday()) {
        probability = config.onHolidays || config.baseChance;
      } else if (
        context.currentStreak &&
        config.afterStreak &&
        context.currentStreak > 5
      ) {
        probability = config.afterStreak;
      }
      break;

    case 'fns_scare':
      if (context.muskvaMode === 'angry' && config.whenMuskvaAngry) {
        probability = config.whenMuskvaAngry;
      }
      break;

    case 'glasha_mention':
      if (context.muskvaMode === 'rich' && config.whenMuskvaAngry) {
        probability = config.whenMuskvaAngry;
      }
      break;
  }

  return probability;
}

/**
 * Get cooldown duration for event
 */
export function getEventCooldownDuration(eventType: CharacterEventType): number {
  return EVENT_COOLDOWN_DURATION[eventType];
}

/**
 * Get event configuration
 */
export function getEventConfig(eventType: CharacterEventType): CharacterEvent {
  return CHARACTER_EVENTS[eventType];
}
