/**
 * Character Message Component
 *
 * Speech bubble for character messages
 */

import { motion } from 'framer-motion';
import { CharacterName, MoodType } from '../types/character.types';
import { getCharacterColors } from '../utils/characterSelector';

interface CharacterMessageProps {
  character: CharacterName;
  mood: MoodType;
  message: string;
  emoji?: string;
}

export function CharacterMessage({
  character,
  mood,
  message,
  emoji,
}: CharacterMessageProps) {
  const colors = getCharacterColors(character);

  // Message style based on character
  const getMessageStyle = () => {
    switch (character) {
      case 'muskva':
        return 'font-bold';
      case 'johnny':
        return 'font-medium italic';
      case 'panda':
        return 'font-normal';
      case 'tapka_potapka':
        return 'font-semibold uppercase text-sm';
      default:
        return '';
    }
  };

  // Bubble style based on mood
  const getBubbleColor = () => {
    // Muskva moods
    if (mood === 'angry') return 'bg-red-100 border-red-500';
    if (mood === 'rich') return 'bg-yellow-100 border-yellow-600';
    if (mood === 'evil_laugh') return 'bg-purple-100 border-purple-500';
    if (mood === 'scared') return 'bg-gray-100 border-gray-400';

    // Johnny moods
    if (mood === 'supportive') return 'bg-green-100 border-green-500';
    if (mood === 'happy') return 'bg-blue-100 border-blue-500';
    if (mood === 'offended') return 'bg-orange-100 border-orange-400';

    // Protest/revolutionary
    if (mood === 'revolutionary' || mood === 'protest')
      return 'bg-red-50 border-red-600';

    // Default
    return 'bg-white border-gray-300';
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{
        type: 'spring',
        stiffness: 200,
        damping: 15,
      }}
      className="relative"
    >
      {/* Speech bubble */}
      <div
        className={`
          relative
          px-6 py-4
          rounded-2xl
          border-4
          shadow-lg
          ${getBubbleColor()}
          max-w-md
        `}
      >
        {/* Message text */}
        <p
          className={`
            text-gray-800
            whitespace-pre-line
            ${getMessageStyle()}
          `}
          style={{ color: colors.primary }}
        >
          {message}
        </p>

        {/* Emoji */}
        {emoji && (
          <span className="text-3xl ml-2 inline-block">{emoji}</span>
        )}

        {/* Speech bubble tail */}
        <div
          className="absolute bottom-0 left-8 w-0 h-0 transform translate-y-full"
          style={{
            borderLeft: '15px solid transparent',
            borderRight: '15px solid transparent',
            borderTop: `20px solid ${colors.primary}`,
          }}
        />
      </div>

      {/* Mood indicator (optional debug) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute top-0 right-0 text-xs text-gray-500 -mt-5">
          {mood}
        </div>
      )}
    </motion.div>
  );
}
