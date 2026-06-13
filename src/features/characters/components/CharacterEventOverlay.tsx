/**
 * Character Event Overlay Component
 *
 * Special full-screen overlays for character events
 */

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CharacterEvent, CharacterEventType } from '../types/character.types';
import { CharacterAvatar } from './CharacterAvatar';

interface CharacterEventOverlayProps {
  event: CharacterEvent;
  onComplete?: () => void;
}

export function CharacterEventOverlay({
  event,
  onComplete,
}: CharacterEventOverlayProps) {
  // Auto-complete after duration
  useEffect(() => {
    if (onComplete) {
      const timer = setTimeout(() => {
        onComplete();
      }, event.duration);

      return () => clearTimeout(timer);
    }
  }, [event.duration, onComplete]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="
          fixed inset-0
          z-50
          flex items-center justify-center
          bg-black/50
          backdrop-blur-sm
        "
        onClick={onComplete}
      >
        <div className="relative">
          {/* Render specific event */}
          {event.type === 'coffee_break' && <CoffeeBreakEvent event={event} />}
          {event.type === 'union_protest' && <UnionProtestEvent event={event} />}
          {event.type === 'fns_scare' && <FnsScareEvent event={event} />}
          {event.type === 'glasha_mention' && <GlashaMentionEvent event={event} />}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// =====================================================
// Individual Event Components
// =====================================================

interface EventProps {
  event: CharacterEvent;
}

// ☕ Coffee Break Event
function CoffeeBreakEvent({ event }: EventProps) {
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ x: -500, opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="
        bg-gradient-to-br from-blue-100 to-blue-200
        p-8 rounded-3xl
        shadow-2xl
        border-4 border-blue-400
      "
    >
      <div className="flex items-center gap-6">
        {/* Johnny */}
        <motion.div
          animate={{
            y: [0, -10, 0],
          }}
          transition={{
            repeat: Infinity,
            duration: 1.5,
          }}
        >
          <CharacterAvatar character="johnny" mood="coffee_break" size="large" />
        </motion.div>

        {/* Coffee cup animation */}
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            rotate: [0, -5, 5, 0],
          }}
          transition={{
            repeat: Infinity,
            duration: 2,
          }}
          className="text-6xl"
        >
          ☕
        </motion.div>

        {/* Panda */}
        <motion.div
          animate={{
            y: [0, -10, 0],
          }}
          transition={{
            repeat: Infinity,
            duration: 1.5,
            delay: 0.3,
          }}
        >
          <CharacterAvatar character="panda" mood="coffee_break" size="large" />
        </motion.div>
      </div>

      {/* Message */}
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-4 text-center text-xl font-bold text-blue-800"
      >
        {event.message}
      </motion.p>
    </motion.div>
  );
}

// 🚩 Union Protest Event
function UnionProtestEvent({ event }: EventProps) {
  return (
    <motion.div
      initial={{ x: -500, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -500, opacity: 0 }}
      transition={{
        type: 'spring',
        stiffness: 100,
      }}
      className="
        bg-gradient-to-br from-red-100 to-red-200
        p-8 rounded-3xl
        shadow-2xl
        border-4 border-red-600
        max-w-2xl
      "
    >
      {/* Animated flags */}
      <div className="flex justify-around mb-4">
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            animate={{
              rotate: [-5, 5, -5],
            }}
            transition={{
              repeat: Infinity,
              duration: 0.5,
              delay: i * 0.1,
            }}
            className="text-4xl"
          >
            🚩
          </motion.div>
        ))}
      </div>

      {/* Tapka & Potapka shaking */}
      <motion.div
        animate={{
          rotate: [-3, 3, -3],
          scale: [1, 1.05, 1],
        }}
        transition={{
          repeat: Infinity,
          duration: 0.4,
        }}
        className="flex justify-center"
      >
        <CharacterAvatar character="tapka_potapka" mood="revolutionary" size="large" />
      </motion.div>

      {/* Message */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="
          mt-4 text-center
          text-2xl font-bold uppercase
          text-red-900
        "
      >
        {event.message}
      </motion.p>

      {/* Tools */}
      <div className="flex justify-center gap-4 mt-4 text-3xl">
        <motion.span
          animate={{ rotate: [0, 360] }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          ⚒️
        </motion.span>
        <motion.span
          animate={{ rotate: [0, -360] }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          🔨
        </motion.span>
      </div>

      {/* Muskva's response (if interrupts) */}
      {event.interruptsMuskva && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2 }}
          className="mt-6 p-4 bg-yellow-100 rounded-lg border-2 border-yellow-600"
        >
          <p className="text-center font-bold text-yellow-900">
            Мусква: "Опять мои коммунистические дети! Это всё неправда!"
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}

// 🦉 FNS Scare Event
function FnsScareEvent({ event }: EventProps) {
  return (
    <motion.div
      initial={{ scale: 1.5, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ x: -300, opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="
        bg-gradient-to-br from-gray-200 to-gray-300
        p-8 rounded-3xl
        shadow-2xl
        border-4 border-gray-600
      "
    >
      {/* Scary owls */}
      <div className="flex justify-center gap-4 mb-4">
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            animate={{
              scale: [1, 1.2, 1],
              y: [0, -10, 0],
            }}
            transition={{
              repeat: Infinity,
              duration: 1,
              delay: i * 0.2,
            }}
            className="text-5xl"
          >
            🦉
          </motion.div>
        ))}
      </div>

      {/* Muskva running away */}
      <motion.div
        animate={{
          x: [0, -20, 0],
          rotate: [0, -10, 10, 0],
        }}
        transition={{
          repeat: Infinity,
          duration: 0.5,
        }}
      >
        <CharacterAvatar character="muskva" mood="scared" size="large" />
      </motion.div>

      {/* Message */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="mt-4 text-center text-xl font-bold text-gray-800"
      >
        {event.message}
      </motion.p>

      {/* Police siren effect */}
      <motion.div
        animate={{
          backgroundColor: ['#ef4444', '#3b82f6', '#ef4444'],
        }}
        transition={{
          repeat: Infinity,
          duration: 0.5,
        }}
        className="mt-4 h-2 rounded-full"
      />
    </motion.div>
  );
}

// 👻 Glasha Mention Event
function GlashaMentionEvent({ event }: EventProps) {
  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      className="
        bg-gradient-to-br from-purple-100 to-purple-200
        p-8 rounded-3xl
        shadow-2xl
        border-4 border-purple-500
        max-w-lg
      "
    >
      {/* Johnny teasing */}
      <motion.div
        animate={{
          rotate: [-5, 5, -5],
        }}
        transition={{
          repeat: Infinity,
          duration: 0.3,
        }}
        className="flex justify-center"
      >
        <CharacterAvatar character="johnny" mood="neutral" size="medium" />
      </motion.div>

      <p className="mt-2 text-center font-bold text-blue-800">
        Джонни: "Ур-ур Глаша! Ур-ур Глаша!"
      </p>

      {/* Ghost emoji */}
      <motion.div
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.5, 1, 0.5],
        }}
        transition={{
          repeat: Infinity,
          duration: 1,
        }}
        className="text-6xl text-center my-4"
      >
        👻
      </motion.div>

      {/* Muskva panicking */}
      <motion.div
        animate={{
          x: [-10, 10, -10],
          rotate: [-10, 10, -10],
        }}
        transition={{
          repeat: Infinity,
          duration: 0.2,
        }}
        className="flex justify-center"
      >
        <CharacterAvatar character="muskva" mood="scared" size="medium" />
      </motion.div>

      <p className="mt-2 text-center font-bold text-red-800">
        Мусква: "Глаша?! Где?! *паника*"
      </p>
    </motion.div>
  );
}
