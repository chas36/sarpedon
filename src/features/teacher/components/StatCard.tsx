interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
}

export function StatCard({ title, value, subtitle, icon }: StatCardProps) {
  return (
    <div className="bg-admin-surface rounded-lg p-6 border border-admin-muted/10">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-admin-muted mb-1">{title}</p>
          <p className="text-3xl font-bold text-admin-text">{value}</p>
          {subtitle && (
            <p className="text-xs text-admin-muted mt-1">{subtitle}</p>
          )}
        </div>
        {icon && (
          <div className="text-admin-accent opacity-20 text-3xl">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
