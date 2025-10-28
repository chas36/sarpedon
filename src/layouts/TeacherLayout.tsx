import { ReactNode } from 'react';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { Button } from '@/shared/components/ui';

interface TeacherLayoutProps {
  children: ReactNode;
}

export function TeacherLayout({ children }: TeacherLayoutProps) {
  const { profile } = useAuthStore();
  const { handleLogout } = useAuth();

  const onLogout = async () => {
    try {
      await handleLogout();
      // TODO: Redirect to login page after router is fully set up
    } catch (err) {
      // Error handled by useAuth
    }
  };

  return (
    <div className="min-h-screen bg-admin-bg">
      {/* Header */}
      <header className="bg-admin-surface border-b border-admin-muted/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="text-2xl font-bold text-admin-accent">
                Sarpedon
              </div>
              <div className="text-sm text-admin-muted hidden sm:block">
                Преподаватель
              </div>
            </div>

            {/* User Info */}
            <div className="flex items-center space-x-4">
              {profile && (
                <div className="text-right hidden sm:block">
                  <div className="text-sm font-medium text-admin-text">
                    {profile.first_name} {profile.last_name}
                  </div>
                  <div className="text-xs text-admin-muted">
                    Преподаватель
                  </div>
                </div>
              )}
              <Button variant="ghost" size="sm" onClick={onLogout}>
                Выйти
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-admin-surface border-b border-admin-muted/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8 h-12 items-center">
            <a
              href="#"
              className="text-sm font-medium text-admin-text hover:text-admin-accent transition-colors"
            >
              Ученики
            </a>
            <a
              href="#"
              className="text-sm font-medium text-admin-text hover:text-admin-accent transition-colors"
            >
              Уровни
            </a>
            <a
              href="#"
              className="text-sm font-medium text-admin-text hover:text-admin-accent transition-colors"
            >
              Соревнования
            </a>
            <a
              href="#"
              className="text-sm font-medium text-admin-text hover:text-admin-accent transition-colors"
            >
              Статистика
            </a>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
