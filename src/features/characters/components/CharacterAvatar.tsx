/**
 * Character Avatar Component
 *
 * Displays character avatar with mood-based expressions
 * Currently using placeholder SVGs - can be replaced with actual images
 */

import { motion } from 'framer-motion';
import { CharacterName, MoodType } from '../types/character.types';
import { getCharacterColors } from '../utils/characterSelector';

interface CharacterAvatarProps {
  character: CharacterName;
  mood: MoodType;
  size?: 'small' | 'medium' | 'large';
  animate?: boolean;
}

export function CharacterAvatar({
  character,
  mood,
  size = 'medium',
  animate = true,
}: CharacterAvatarProps) {
  const colors = getCharacterColors(character);

  const sizeClasses = {
    small: 'w-16 h-16',
    medium: 'w-32 h-32',
    large: 'w-48 h-48',
  };

  // Animation variants
  const avatarVariants = {
    muskva: {
      enter: {
        rotate: [-180, 0],
        scale: [0, 1],
        opacity: [0, 1],
      },
      idle: {
        rotate: [-2, 2, -2],
        transition: {
          repeat: Infinity,
          duration: 2,
          ease: 'easeInOut',
        },
      },
    },
    johnny: {
      enter: {
        y: [100, -10, 0],
        opacity: [0, 1, 1],
      },
      idle: {
        y: [0, -10, 0],
        transition: {
          repeat: Infinity,
          duration: 2,
          ease: 'easeInOut',
        },
      },
    },
    panda: {
      enter: {
        x: [-50, 0],
        opacity: [0, 1],
      },
      idle: {
        rotate: [-3, 3, -3],
        transition: {
          repeat: Infinity,
          duration: 2.5,
          ease: 'easeInOut',
        },
      },
    },
    tapka_potapka: {
      enter: {
        x: [-200, 0],
        opacity: [0, 1],
      },
      idle: {
        rotate: [-5, 5, -5],
        scale: [1, 1.05, 1],
        transition: {
          repeat: Infinity,
          duration: 0.5,
          ease: 'linear',
        },
      },
    },
  };

  const variants = avatarVariants[character];

  return (
    <motion.div
      initial={animate ? 'enter' : undefined}
      animate={animate ? 'idle' : undefined}
      variants={variants}
      className={`${sizeClasses[size]} relative flex items-center justify-center`}
    >
      {character === 'muskva' && <MuskvaAvatar mood={mood} colors={colors} />}
      {character === 'johnny' && <JohnnyAvatar mood={mood} colors={colors} />}
      {character === 'panda' && <PandaAvatar mood={mood} colors={colors} />}
      {character === 'tapka_potapka' && <TapkaPotapkaAvatar mood={mood} colors={colors} />}
    </motion.div>
  );
}

// =====================================================
// Individual Character Avatars (Placeholder SVGs)
// =====================================================

interface AvatarProps {
  mood: MoodType;
  colors: { primary: string; secondary: string; background: string };
}

// 🐻 Muskva Avatar
function MuskvaAvatar({ mood, colors }: AvatarProps) {
  // Different expressions based on mood
  const getExpression = () => {
    switch (mood) {
      case 'angry':
        return { eyebrows: -10, mouth: 'M40,70 Q60,80 80,70' }; // Frown
      case 'rich':
        return { eyebrows: 5, mouth: 'M40,65 Q60,55 80,65' }; // Smile
      case 'evil_laugh':
        return { eyebrows: 0, mouth: 'M35,65 Q60,50 85,65' }; // Wide smile
      case 'scared':
        return { eyebrows: 15, mouth: 'M50,70 Q60,75 70,70' }; // Shocked
      default:
        return { eyebrows: 0, mouth: 'M45,68 Q60,70 75,68' }; // Neutral
    }
  };

  const expr = getExpression();

  return (
    <svg viewBox="0 0 120 120" className="w-full h-full">
      {/* Bear face */}
      <circle cx="60" cy="60" r="50" fill={colors.background} />

      {/* Ears */}
      <circle cx="25" cy="25" r="18" fill={colors.background} />
      <circle cx="95" cy="25" r="18" fill={colors.background} />

      {/* Crown 👑 */}
      <path
        d="M30,20 L40,10 L50,20 L60,10 L70,20 L80,10 L90,20 L85,30 L35,30 Z"
        fill={colors.secondary}
        stroke="#000"
        strokeWidth="2"
      />

      {/* Eyes */}
      <circle cx="45" cy="50" r="5" fill="#000" />
      <circle cx="75" cy="50" r="5" fill="#000" />

      {/* Eyebrows */}
      <line
        x1="35"
        y1={45 + expr.eyebrows}
        x2="50"
        y2={45 + expr.eyebrows}
        stroke="#000"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <line
        x1="70"
        y1={45 + expr.eyebrows}
        x2="85"
        y2={45 + expr.eyebrows}
        stroke="#000"
        strokeWidth="3"
        strokeLinecap="round"
      />

      {/* Mouth */}
      <path d={expr.mouth} stroke="#000" strokeWidth="3" fill="none" />

      {/* Red bow 🎀 */}
      <path
        d="M50,95 L55,85 L60,95 L65,85 L70,95 L60,90 Z"
        fill={colors.primary}
        stroke="#000"
        strokeWidth="1"
      />

      {/* Money sign 💰 (for rich mood) */}
      {mood === 'rich' && (
        <text x="100" y="100" fontSize="20" fill={colors.secondary}>
          💰
        </text>
      )}
    </svg>
  );
}

// 🧸 Johnny Avatar
function JohnnyAvatar({ mood, colors }: AvatarProps) {
  const getExpression = () => {
    switch (mood) {
      case 'happy':
        return { eyes: '^_^', mouth: 'M40,65 Q60,55 80,65' };
      case 'offended':
        return { eyes: 'T_T', mouth: 'M40,70 Q60,80 80,70' };
      case 'supportive':
        return { eyes: '^_^', mouth: 'M45,65 Q60,60 75,65' };
      default:
        return { eyes: 'o_o', mouth: 'M45,68 Q60,68 75,68' };
    }
  };

  const expr = getExpression();

  return (
    <svg viewBox="0 0 120 120" className="w-full h-full">
      {/* Bear face */}
      <circle cx="60" cy="60" r="45" fill={colors.background} />

      {/* Ears */}
      <circle cx="30" cy="30" r="15" fill={colors.background} />
      <circle cx="90" cy="30" r="15" fill={colors.background} />

      {/* Blue sweater 💙 */}
      <rect x="20" y="80" width="80" height="30" fill={colors.primary} rx="5" />

      {/* Eyes (green glow 💚) */}
      <circle cx="45" cy="50" r="6" fill={colors.secondary} opacity="0.8" />
      <circle cx="75" cy="50" r="6" fill={colors.secondary} opacity="0.8" />
      <circle cx="45" cy="50" r="3" fill="#000" />
      <circle cx="75" cy="50" r="3" fill="#000" />

      {/* Mouth */}
      <path d={expr.mouth} stroke="#000" strokeWidth="2" fill="none" />

      {/* Coffee emoji ☕ (for coffee_break mood) */}
      {mood === 'coffee_break' && (
        <text x="90" y="95" fontSize="18">
          ☕
        </text>
      )}

      {/* Sad tear (for offended mood) */}
      {mood === 'offended' && (
        <circle cx="50" cy="60" r="2" fill="#60a5fa" opacity="0.7" />
      )}
    </svg>
  );
}

// 🐼 Panda Avatar
function PandaAvatar({ mood, colors }: AvatarProps) {
  return (
    <svg viewBox="0 0 120 120" className="w-full h-full">
      {/* Panda face (white) */}
      <circle cx="60" cy="60" r="45" fill="#fff" />

      {/* Black ears */}
      <circle cx="30" cy="30" r="15" fill="#000" />
      <circle cx="90" cy="30" r="15" fill="#000" />

      {/* Black eye patches */}
      <ellipse cx="45" cy="50" rx="12" ry="15" fill="#000" />
      <ellipse cx="75" cy="50" rx="12" ry="15" fill="#000" />

      {/* Eyes */}
      <circle cx="45" cy="50" r="5" fill="#fff" />
      <circle cx="75" cy="50" r="5" fill="#fff" />
      <circle cx="45" cy="50" r="2" fill="#000" />
      <circle cx="75" cy="50" r="2" fill="#000" />

      {/* Nose */}
      <ellipse cx="60" cy="65" rx="8" ry="6" fill="#000" />

      {/* Mouth */}
      <path d="M45,68 Q60,75 75,68" stroke="#000" strokeWidth="2" fill="none" />

      {/* Phone 📱 (SMM panda) */}
      {mood === 'working' && (
        <rect x="85" y="75" width="15" height="25" fill="#3b82f6" rx="2" />
      )}

      {/* Coffee ☕ */}
      {mood === 'coffee_break' && (
        <text x="90" y="100" fontSize="20">
          ☕
        </text>
      )}
    </svg>
  );
}

// 🐻‍❄️ Tapka & Potapka Avatar (two bears)
function TapkaPotapkaAvatar({ mood, colors }: AvatarProps) {
  return (
    <svg viewBox="0 0 120 120" className="w-full h-full">
      {/* Left bear (Tapka) */}
      <circle cx="40" cy="60" r="30" fill="#f0f9ff" />
      <circle cx="25" cy="40" r="12" fill="#f0f9ff" />
      <circle cx="55" cy="40" r="12" fill="#f0f9ff" />
      <circle cx="35" cy="55" r="3" fill="#000" />
      <circle cx="45" cy="55" r="3" fill="#000" />
      <path d="M32,65 Q40,62 48,65" stroke="#000" strokeWidth="2" fill="none" />

      {/* Right bear (Potapka) */}
      <circle cx="80" cy="60" r="30" fill="#f0f9ff" />
      <circle cx="65" cy="40" r="12" fill="#f0f9ff" />
      <circle cx="95" cy="40" r="12" fill="#f0f9ff" />
      <circle cx="75" cy="55" r="3" fill="#000" />
      <circle cx="85" cy="55" r="3" fill="#000" />
      <path d="M72,65 Q80,62 88,65" stroke="#000" strokeWidth="2" fill="none" />

      {/* Red flags 🚩 */}
      <line x1="10" y1="20" x2="10" y2="80" stroke="#000" strokeWidth="2" />
      <polygon points="10,20 30,30 10,40" fill={colors.primary} />

      <line x1="110" y1="20" x2="110" y2="80" stroke="#000" strokeWidth="2" />
      <polygon points="110,20 90,30 110,40" fill={colors.primary} />

      {/* Hammer & sickle ⚒️ (for revolutionary mood) */}
      {mood === 'revolutionary' && (
        <>
          <text x="5" y="110" fontSize="18">
            ⚒️
          </text>
          <text x="95" y="110" fontSize="18">
            🔨
          </text>
        </>
      )}
    </svg>
  );
}
