import { ReactNode } from 'react';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { Button } from '@/shared/components/ui';

interface StudentLayoutProps {
  children: ReactNode;
}

export function StudentLayout({ children }: StudentLayoutProps) {
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
    <div className="min-h-screen bg-learning-bg">
      {/* Header */}
      <header className="bg-learning-surface border-b border-learning-muted/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="text-2xl font-bold text-learning-accent">
                Sarpedon
              </div>
              <div className="text-sm text-learning-muted hidden sm:block">
                Студент
              </div>
            </div>

            {/* User Info */}
            <div className="flex items-center space-x-4">
              {profile && (
                <div className="text-right hidden sm:block">
                  <div className="text-sm font-medium text-learning-text">
                    {profile.first_name} {profile.last_name}
                  </div>
                  {profile.class && (
                    <div className="text-xs text-learning-muted">
                      Класс: {profile.class}
                    </div>
                  )}
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
      <nav className="bg-learning-surface border-b border-learning-muted/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8 h-12 items-center">
            <a
              href="#"
              className="text-sm font-medium text-learning-text hover:text-learning-accent transition-colors"
            >
              Уровни
            </a>
            <a
              href="#"
              className="text-sm font-medium text-learning-text hover:text-learning-accent transition-colors"
            >
              Мой прогресс
            </a>
            <a
              href="#"
              className="text-sm font-medium text-learning-text hover:text-learning-accent transition-colors"
            >
              Соревнования
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
