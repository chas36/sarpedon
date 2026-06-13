import { ReactNode } from 'react';
import { cn } from '@/shared/utils/cn';

export interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className }: CardProps) {
  return (
    <div
      className={cn(
        'bg-admin-surface rounded-lg p-6 border border-admin-muted/10',
        className
      )}
    >
      {children}
    </div>
  );
}
