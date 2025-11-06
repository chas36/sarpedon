/**
 * Character Selection Logic
 *
 * Main algorithm for selecting which character appears based on context
 */

import {
  CharacterResponse,
  CharacterContext,
  CharacterName,
  MoodType,
  CharacterEventType,
} from '../types/character.types';
import {
  CHARACTER_PHRASES,
  getRandomPhrase,
  MUSKVA_PHRASES,
  JOHNNY_PHRASES,
  PANDA_PHRASES,
  TAPKA_POTAPKA_PHRASES,
} from '../config/characterPhrases';
import {
  calculateEventProbability,
  getEventConfig,
  isHoliday,
} from '../config/eventConfig';

// =====================================================
// Main Character Selection Function
// =====================================================

export function selectCharacter(
  context: CharacterContext
): CharacterResponse {
  const {
    isCorrect,
    attemptNumber,
    qualityScore,
    consecutiveErrors,
    totalCompleted,
  } = context;

  // ===== 1. Check for random events first =====
  const eventResponse = checkForRandomEvents(context);
  if (eventResponse) {
    return eventResponse;
  }

  // ===== 2. Johnny for newbies and support =====
  if (attemptNumber <= 2 && !isCorrect) {
    return selectJohnnySupport(attemptNumber);
  }

  // ===== 3. Muskva for high-quality success =====
  if (isCorrect && qualityScore >= 90) {
    return selectMukvaPerfectSuccess();
  }

  // ===== 4. Muskva for many errors (evil laugh) =====
  if (consecutiveErrors >= 3) {
    return selectMuskvaEvilLaugh();
  }

  // ===== 5. Muskva for errors after attempts =====
  if (!isCorrect && attemptNumber > 2) {
    return selectMuskvaAngry(attemptNumber);
  }

  // ===== 6. Muskva for regular success =====
  if (isCorrect) {
    return selectMuskvaSuccess(qualityScore);
  }

  // ===== 7. Default: Johnny support =====
  return selectJohnnyDefault();
}

// =====================================================
// Event Checking
// =====================================================

function checkForRandomEvents(
  context: CharacterContext
): CharacterResponse | null {
  const { totalCompleted, consecutiveErrors } = context;

  // Coffee Break Event (5-15% chance)
  const coffeeBreakChance = calculateEventProbability('coffee_break', {
    consecutiveSubmissions: totalCompleted,
  });

  if (Math.random() < coffeeBreakChance) {
    return {
      characters: ['johnny', 'panda'],
      mood: 'coffee_break' as MoodType,
      message: getRandomPhrase(PANDA_PHRASES.coffee_break).text,
      emoji: '☕',
      event: getEventConfig('coffee_break'),
      interactionType: 'event',
    };
  }

  // Union Protest Event (2-30% chance on holidays)
  const protestChance = calculateEventProbability('union_protest', {
    currentStreak: totalCompleted,
  });

  if (Math.random() < protestChance) {
    return {
      characters: ['tapka_potapka'],
      mood: 'revolutionary' as MoodType,
      message: getRandomPhrase(TAPKA_POTAPKA_PHRASES.main_protest).text,
      emoji: '🚩',
      event: getEventConfig('union_protest'),
      interactionType: 'event',
    };
  }

  // FNS Scare Event (2-8% chance when Muskva angry)
  const muskvaMode = consecutiveErrors >= 3 ? 'angry' : 'neutral';
  const fnsChance = calculateEventProbability('fns_scare', { muskvaMode });

  if (Math.random() < fnsChance) {
    return {
      characters: ['muskva'],
      mood: 'scared' as MoodType,
      message: getRandomPhrase(MUSKVA_PHRASES.fns_scare).text,
      emoji: '🦉',
      event: getEventConfig('fns_scare'),
      interactionType: 'event',
    };
  }

  return null; // No event triggered
}

// =====================================================
// Muskva Selection Functions
// =====================================================

function selectMukvaPerfectSuccess(): CharacterResponse {
  const phrase = getRandomPhrase(MUSKVA_PHRASES.perfect_success);
  return {
    characters: ['muskva'],
    mood: phrase.mood,
    message: phrase.text,
    emoji: phrase.emoji,
    interactionType: 'feedback',
  };
}

function selectMuskvaSuccess(qualityScore: number): CharacterResponse {
  let phraseCategory: keyof typeof MUSKVA_PHRASES;

  if (qualityScore >= 60) {
    phraseCategory = 'good_success';
  } else {
    phraseCategory = 'mediocre_success';
  }

  const phrase = getRandomPhrase(MUSKVA_PHRASES[phraseCategory]);
  return {
    characters: ['muskva'],
    mood: phrase.mood,
    message: phrase.text,
    emoji: phrase.emoji,
    interactionType: 'feedback',
  };
}

function selectMuskvaAngry(attemptNumber: number): CharacterResponse {
  const phrase = getRandomPhrase(MUSKVA_PHRASES.multiple_errors);
  return {
    characters: ['muskva'],
    mood: phrase.mood,
    message: phrase.text,
    emoji: phrase.emoji,
    interactionType: 'feedback',
  };
}

function selectMuskvaEvilLaugh(): CharacterResponse {
  const phrase = getRandomPhrase(MUSKVA_PHRASES.many_errors);
  return {
    characters: ['muskva'],
    mood: phrase.mood,
    message: phrase.text,
    emoji: phrase.emoji,
    interactionType: 'feedback',
  };
}

// =====================================================
// Johnny Selection Functions
// =====================================================

function selectJohnnySupport(attemptNumber: number): CharacterResponse {
  const phraseCategory =
    attemptNumber === 1 ? 'greeting' : 'first_error';
  const phrase = getRandomPhrase(JOHNNY_PHRASES[phraseCategory]);

  return {
    characters: ['johnny'],
    mood: phrase.mood,
    message: phrase.text,
    emoji: phrase.emoji,
    interactionType: 'feedback',
  };
}

function selectJohnnyDefault(): CharacterResponse {
  const phrase = getRandomPhrase(JOHNNY_PHRASES.greeting);
  return {
    characters: ['johnny'],
    mood: phrase.mood,
    message: phrase.text,
    emoji: phrase.emoji,
    interactionType: 'feedback',
  };
}

// =====================================================
// Special Events
// =====================================================

/**
 * Glasha mention (Johnny teases Muskva)
 */
export function triggerGlashaMention(): CharacterResponse {
  const johnnyPhrase = getRandomPhrase(JOHNNY_PHRASES.teasing_muskva);
  const muskvaPhrase = getRandomPhrase(MUSKVA_PHRASES.glasha_mention);

  return {
    characters: ['johnny', 'muskva'],
    mood: 'scared' as MoodType,
    message: `${johnnyPhrase.text}\n\n${muskvaPhrase.text}`,
    emoji: '😰',
    event: getEventConfig('glasha_mention'),
    interactionType: 'event',
  };
}

/**
 * Muskva denies having communist children
 */
export function triggerMuskvaDenialAfterProtest(): CharacterResponse {
  const muskvaPhrase = getRandomPhrase(MUSKVA_PHRASES.denying_communism);
  const kidsPhrase = getRandomPhrase(TAPKA_POTAPKA_PHRASES.after_muskva_response);

  return {
    characters: ['muskva', 'tapka_potapka'],
    mood: 'angry' as MoodType,
    message: `Мусква: ${muskvaPhrase.text}\n\nТапка и Потапка: ${kidsPhrase.text}`,
    emoji: '😤',
    interactionType: 'random',
  };
}

// =====================================================
// Helper Functions
// =====================================================

/**
 * Get character name display
 */
export function getCharacterDisplayName(character: CharacterName): string {
  const names: Record<CharacterName, string> = {
    muskva: 'Мусква (CEO)',
    johnny: 'Джонни (Стажёр)',
    panda: 'Панда (Баобао)',
    tapka_potapka: 'Тапка и Потапка',
  };
  return names[character];
}

/**
 * Get character color scheme
 */
export function getCharacterColors(character: CharacterName): {
  primary: string;
  secondary: string;
  background: string;
} {
  const colors: Record<CharacterName, { primary: string; secondary: string; background: string }> = {
    muskva: {
      primary: '#dc2626', // Red (ribbon)
      secondary: '#fbbf24', // Gold (crown)
      background: '#7c2d12', // Brown
    },
    johnny: {
      primary: '#3b82f6', // Blue (sweater)
      secondary: '#10b981', // Green (eyes)
      background: '#1e40af', // Dark blue
    },
    panda: {
      primary: '#000000', // Black
      secondary: '#ffffff', // White
      background: '#404040', // Gray
    },
    tapka_potapka: {
      primary: '#ef4444', // Red (flags)
      secondary: '#fbbf24', // Gold (hammer/sickle)
      background: '#f0f9ff', // Ice white
    },
  };
  return colors[character];
}

/**
 * Should trigger event based on cooldown and probability
 */
export function shouldTriggerEvent(
  eventType: CharacterEventType,
  totalCompleted: number
): boolean {
  // This is a simplified version - actual cooldown check should be done via API
  const probability = calculateEventProbability(eventType, {
    consecutiveSubmissions: totalCompleted,
  });

  return Math.random() < probability;
}
