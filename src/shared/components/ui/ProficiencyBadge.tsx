import {
  getProficiencyBadgeColor,
  getProficiencyLabel,
  type ProficiencyLevel,
} from '@/shared/types/proficiency.types';

interface ProficiencyBadgeProps {
  level: ProficiencyLevel;
  score?: number;
  showScore?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function ProficiencyBadge({
  level,
  score,
  showScore = false,
  size = 'md',
}: ProficiencyBadgeProps) {
  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2',
  };

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border font-medium ${getProficiencyBadgeColor(
        level
      )} ${sizeClasses[size]}`}
    >
      <span>{getProficiencyLabel(level)}</span>
      {showScore && score !== undefined && (
        <span className="opacity-75">({score}/100)</span>
      )}
    </span>
  );
}
