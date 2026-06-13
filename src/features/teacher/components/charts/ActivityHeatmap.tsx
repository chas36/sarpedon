import { useMemo } from 'react';

interface ActivityHeatmapProps {
  data: Array<{ date: string; activityCount: number }>;
  tooltip?: (date: string, count: number) => string;
}

export function ActivityHeatmap({ data, tooltip }: ActivityHeatmapProps) {
  // Group data by weeks
  const weeks = useMemo(() => {
    const weekMap = new Map<number, Array<{ date: string; count: number }>>();

    data.forEach(item => {
      const date = new Date(item.date);
      const firstDate = new Date(data[0].date);
      const week = Math.floor(
        (date.getTime() - firstDate.getTime()) / (7 * 24 * 60 * 60 * 1000)
      );

      if (!weekMap.has(week)) {
        weekMap.set(week, []);
      }
      weekMap.get(week)!.push({ date: item.date, count: item.activityCount });
    });

    return Array.from(weekMap.values());
  }, [data]);

  // Determine cell color based on activity count
  const getColor = (count: number) => {
    if (count === 0) return 'bg-admin-bg';
    if (count < 5) return 'bg-admin-accent/20';
    if (count < 10) return 'bg-admin-accent/40';
    if (count < 20) return 'bg-admin-accent/60';
    return 'bg-admin-accent';
  };

  return (
    <div className="overflow-x-auto">
      <div className="inline-flex gap-1">
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="flex flex-col gap-1">
            {week.map((day, dayIndex) => (
              <div
                key={dayIndex}
                className={`w-3 h-3 rounded-sm ${getColor(day.count)} transition-colors hover:ring-2 hover:ring-admin-accent cursor-pointer`}
                title={
                  tooltip
                    ? tooltip(day.date, day.count)
                    : `${day.date}: ${day.count}`
                }
              />
            ))}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 mt-4 text-xs text-admin-muted">
        <span>Меньше</span>
        <div className="flex gap-1">
          <div className="w-3 h-3 bg-admin-bg rounded-sm" />
          <div className="w-3 h-3 bg-admin-accent/20 rounded-sm" />
          <div className="w-3 h-3 bg-admin-accent/40 rounded-sm" />
          <div className="w-3 h-3 bg-admin-accent/60 rounded-sm" />
          <div className="w-3 h-3 bg-admin-accent rounded-sm" />
        </div>
        <span>Больше</span>
      </div>
    </div>
  );
}
