/**
 * Utility functions for working with 10-point difficulty scale
 */

import type { Difficulty } from '@/shared/types';

/**
 * Get difficulty label based on numeric scale
 */
export function getDifficultyLabel(difficulty: Difficulty): string {
  if (difficulty <= 3) return 'Легкий';
  if (difficulty <= 5) return 'Средний';
  if (difficulty <= 7) return 'Сложный';
  return 'Очень сложный';
}

/**
 * Get difficulty color based on numeric scale
 */
export function getDifficultyColor(difficulty: Difficulty): string {
  if (difficulty <= 3) return '#10b981'; // green
  if (difficulty <= 5) return '#f59e0b'; // orange
  if (difficulty <= 7) return '#ef4444'; // red
  return '#dc2626'; // dark red
}

/**
 * Get difficulty badge class based on numeric scale
 */
export function getDifficultyBadgeClass(difficulty: Difficulty): string {
  if (difficulty <= 3) return 'bg-green-500/20 text-green-400';
  if (difficulty <= 5) return 'bg-yellow-500/20 text-yellow-400';
  if (difficulty <= 7) return 'bg-red-500/20 text-red-400';
  return 'bg-red-700/20 text-red-300';
}

/**
 * Calculate difficulty weight for scoring
 * Uses exponential scaling to give more weight to harder problems
 */
export function getDifficultyWeight(difficulty: Difficulty): number {
  // Scale from 1.0 (difficulty 1) to 3.0 (difficulty 10)
  return 1 + (difficulty - 1) * 0.22;
}

/**
 * Calculate weighted score based on difficulty
 */
export function calculateWeightedScore(
  baseScore: number,
  difficulty: Difficulty
): number {
  return Math.round(baseScore * getDifficultyWeight(difficulty));
}

/**
 * Get difficulty distribution ranges
 */
export function getDifficultyRanges(): Array<{
  min: number;
  max: number;
  label: string;
  color: string;
}> {
  return [
    { min: 1, max: 3, label: 'Легкий (1-3)', color: '#10b981' },
    { min: 4, max: 5, label: 'Средний (4-5)', color: '#f59e0b' },
    { min: 6, max: 7, label: 'Сложный (6-7)', color: '#ef4444' },
    { min: 8, max: 10, label: 'Очень сложный (8-10)', color: '#dc2626' },
  ];
}
