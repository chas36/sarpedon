/**
 * Character Display Component
 *
 * Main component for displaying characters with messages
 */

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CharacterName, MoodType } from '../types/character.types';
import { CharacterAvatar } from './CharacterAvatar';
import { CharacterMessage } from './CharacterMessage';
import { getCharacterDisplayName } from '../utils/characterSelector';

interface CharacterDisplayProps {
  character: CharacterName;
  mood: MoodType;
  message: string;
  emoji?: string;
  onComplete?: () => void;
  autoHide?: boolean;
  autoHideDuration?: number;
}

export const CharacterDisplay: React.FC<CharacterDisplayProps> = ({
  character,
  mood,
  message,
  emoji,
  onComplete,
  autoHide = false,
  autoHideDuration = 5000,
}) => {
  // Auto-hide after duration
  useEffect(() => {
    if (autoHide && onComplete) {
      const timer = setTimeout(() => {
        onComplete();
      }, autoHideDuration);

      return () => clearTimeout(timer);
    }
  }, [autoHide, autoHideDuration, onComplete]);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={`${character}-${mood}`}
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -50 }}
        transition={{
          type: 'spring',
          stiffness: 150,
          damping: 20,
        }}
        className="flex flex-col items-center gap-6 p-6"
      >
        {/* Character name */}
        <motion.h3
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-xl font-bold text-gray-700"
        >
          {getCharacterDisplayName(character)}
        </motion.h3>

        {/* Avatar */}
        <CharacterAvatar
          character={character}
          mood={mood}
          size="large"
          animate={true}
        />

        {/* Message */}
        <CharacterMessage
          character={character}
          mood={mood}
          message={message}
          emoji={emoji}
        />

        {/* Close button (optional) */}
        {onComplete && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onComplete}
            className="
              mt-4 px-6 py-2
              bg-blue-600 hover:bg-blue-700
              text-white font-medium
              rounded-lg
              shadow-md
              transition-colors
            "
          >
            Продолжить
          </motion.button>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

// =====================================================
// Compact version for sidebar/notifications
// =====================================================

interface CharacterNotificationProps {
  character: CharacterName;
  mood: MoodType;
  message: string;
  emoji?: string;
  onDismiss?: () => void;
}

export const CharacterNotification: React.FC<CharacterNotificationProps> = ({
  character,
  mood,
  message,
  emoji,
  onDismiss,
}) => {
  return (
    <motion.div
      initial={{ x: 100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 100, opacity: 0 }}
      className="
        flex items-center gap-3
        p-4
        bg-white
        border-2 border-gray-300
        rounded-lg
        shadow-lg
        max-w-sm
      "
    >
      {/* Small avatar */}
      <CharacterAvatar character={character} mood={mood} size="small" animate={false} />

      {/* Message */}
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-800">{message}</p>
        {emoji && <span className="text-lg ml-1">{emoji}</span>}
      </div>

      {/* Dismiss button */}
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="text-gray-400 hover:text-gray-600"
        >
          ✕
        </button>
      )}
    </motion.div>
  );
};
