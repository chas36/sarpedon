interface SimpleProgressBarProps {
  value: number;
  max?: number;
  color?: 'green' | 'yellow' | 'orange' | 'red' | 'accent';
  height?: number;
  showLabel?: boolean;
}

export function SimpleProgressBar({
  value,
  max = 100,
  color = 'accent',
  height = 16,
  showLabel = false,
}: SimpleProgressBarProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  const colorClasses = {
    green: 'bg-learning-success',
    yellow: 'bg-yellow-400',
    orange: 'bg-orange-500',
    red: 'bg-red-500',
    accent: 'bg-admin-accent',
  };

  return (
    <div>
      {showLabel && (
        <div className="flex justify-between text-xs text-admin-muted mb-1">
          <span>{value}</span>
          <span>{max}</span>
        </div>
      )}
      <div
        className="w-full bg-admin-bg rounded-full overflow-hidden"
        style={{ height: `${height}px` }}
      >
        <div
          className={`h-full ${colorClasses[color]} transition-all duration-500 ease-out rounded-full`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
