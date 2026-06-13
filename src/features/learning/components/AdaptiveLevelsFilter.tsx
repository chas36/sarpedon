import { useState } from 'react';
import type { ProficiencyLevel } from '@/shared/types';

interface AdaptiveLevelsFilterProps {
  proficiencyLevel: ProficiencyLevel | null;
  onFilterChange: (filters: FilterState) => void;
}

export interface FilterState {
  showCompleted: boolean;
  useAdaptiveFilter: boolean;
  minDifficulty?: number;
  maxDifficulty?: number;
}

export function AdaptiveLevelsFilter({
  proficiencyLevel,
  onFilterChange,
}: AdaptiveLevelsFilterProps) {
  const [showCompleted, setShowCompleted] = useState(true);
  const [useAdaptiveFilter, setUseAdaptiveFilter] = useState(true);

  const handleShowCompletedChange = (value: boolean) => {
    setShowCompleted(value);
    updateFilters(value, useAdaptiveFilter);
  };

  const handleAdaptiveFilterChange = (value: boolean) => {
    setUseAdaptiveFilter(value);
    updateFilters(showCompleted, value);
  };

  const updateFilters = (showComp: boolean, adaptive: boolean) => {
    const filters: FilterState = {
      showCompleted: showComp,
      useAdaptiveFilter: adaptive,
    };

    // Set difficulty range based on proficiency level
    if (adaptive && proficiencyLevel) {
      switch (proficiencyLevel) {
        case 'beginner':
          filters.minDifficulty = 1;
          filters.maxDifficulty = 4;
          break;
        case 'intermediate':
          filters.minDifficulty = 4;
          filters.maxDifficulty = 7;
          break;
        case 'advanced':
          filters.minDifficulty = 7;
          filters.maxDifficulty = 10;
          break;
      }
    }

    onFilterChange(filters);
  };

  const getDifficultyRangeText = () => {
    if (!proficiencyLevel) return '';
    switch (proficiencyLevel) {
      case 'beginner':
        return 'сложность 1-4';
      case 'intermediate':
        return 'сложность 4-7';
      case 'advanced':
        return 'сложность 7-10';
    }
  };

  const getProficiencyLabel = () => {
    if (!proficiencyLevel) return '';
    switch (proficiencyLevel) {
      case 'beginner':
        return 'Начинающий';
      case 'intermediate':
        return 'Средний';
      case 'advanced':
        return 'Продвинутый';
    }
  };

  return (
    <div className="bg-learning-surface border border-learning-muted/10 rounded-lg p-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Adaptive Filter Toggle */}
        <div className="flex items-center gap-3">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="adaptive-filter"
              checked={useAdaptiveFilter}
              onChange={(e) => handleAdaptiveFilterChange(e.target.checked)}
              className="w-4 h-4 text-learning-accent bg-learning-bg border-learning-muted/30 rounded focus:ring-learning-accent focus:ring-2"
            />
            <label
              htmlFor="adaptive-filter"
              className="ml-2 text-sm font-medium text-learning-text cursor-pointer"
            >
              🎯 Адаптивная фильтрация
            </label>
          </div>
          {useAdaptiveFilter && proficiencyLevel && (
            <div className="text-xs text-learning-muted">
              ({getProficiencyLabel()}: {getDifficultyRangeText()})
            </div>
          )}
        </div>

        {/* Show Completed Toggle */}
        <div className="flex items-center">
          <input
            type="checkbox"
            id="show-completed"
            checked={showCompleted}
            onChange={(e) => handleShowCompletedChange(e.target.checked)}
            className="w-4 h-4 text-learning-accent bg-learning-bg border-learning-muted/30 rounded focus:ring-learning-accent focus:ring-2"
          />
          <label
            htmlFor="show-completed"
            className="ml-2 text-sm font-medium text-learning-text cursor-pointer"
          >
            Показать выполненные
          </label>
        </div>
      </div>

      {/* Info Text */}
      {useAdaptiveFilter && proficiencyLevel && (
        <div className="mt-3 pt-3 border-t border-learning-muted/10">
          <p className="text-xs text-learning-muted">
            💡 Показываются задачи, соответствующие вашему уровню владения. Отключите
            адаптивную фильтрацию, чтобы увидеть все задачи.
          </p>
        </div>
      )}
    </div>
  );
}
