import { ReactNode } from 'react';
import { useAuthStore } from '@/features/auth/store/authStore';
import { Spinner } from '@/shared/components/ui';
import type { Role } from '@/shared/types';

interface RoleGuardProps {
  children: ReactNode;
  allowedRoles: Role[];
}

export function RoleGuard({ children, allowedRoles }: RoleGuardProps) {
  const { user, role, loading } = useAuthStore();

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-learning-bg flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  // User not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-learning-bg flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-learning-surface rounded-xl p-8 shadow-xl border border-learning-muted/10 text-center">
          <h2 className="text-2xl font-bold text-learning-text mb-4">
            Необходима авторизация
          </h2>
          <p className="text-learning-muted">
            Пожалуйста, войдите в систему для доступа к этой странице
          </p>
        </div>
      </div>
    );
  }

  // User authenticated but doesn't have required role
  if (role && !allowedRoles.includes(role)) {
    return (
      <div className="min-h-screen bg-learning-bg flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-learning-surface rounded-xl p-8 shadow-xl border border-learning-muted/10 text-center">
          <h2 className="text-2xl font-bold text-red-400 mb-4">
            Доступ запрещен
          </h2>
          <p className="text-learning-muted mb-2">
            У вас нет прав для доступа к этой странице
          </p>
          <p className="text-sm text-learning-muted">
            Ваша роль: <span className="font-semibold">{role}</span>
          </p>
        </div>
      </div>
    );
  }

  // User has required role - render children
  return <>{children}</>;
}
