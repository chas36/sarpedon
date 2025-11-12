import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/shared/utils/cn';

interface QuickLinkCardProps {
  to: string;
  title: string;
  description: string;
  icon: ReactNode;
  color?: 'purple' | 'blue' | 'green' | 'orange';
}

export function QuickLinkCard({
  to,
  title,
  description,
  icon,
  color = 'purple',
}: QuickLinkCardProps) {
  const colorClasses = {
    purple: 'from-purple-500/20 to-purple-600/5 border-purple-500/20 hover:border-purple-500/40',
    blue: 'from-blue-500/20 to-blue-600/5 border-blue-500/20 hover:border-blue-500/40',
    green: 'from-green-500/20 to-green-600/5 border-green-500/20 hover:border-green-500/40',
    orange: 'from-orange-500/20 to-orange-600/5 border-orange-500/20 hover:border-orange-500/40',
  };

  const iconColorClasses = {
    purple: 'text-purple-400',
    blue: 'text-blue-400',
    green: 'text-green-400',
    orange: 'text-orange-400',
  };

  return (
    <Link
      to={to}
      className={cn(
        'group relative overflow-hidden rounded-lg border bg-gradient-to-br p-6',
        'transition-all duration-200 hover:scale-105',
        colorClasses[color]
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-admin-text mb-2 group-hover:text-admin-accent transition-colors">
            {title}
          </h3>
          <p className="text-sm text-admin-muted">{description}</p>
        </div>
        <div className={cn('text-3xl opacity-60 group-hover:opacity-100 transition-opacity', iconColorClasses[color])}>
          {icon}
        </div>
      </div>
    </Link>
  );
}
