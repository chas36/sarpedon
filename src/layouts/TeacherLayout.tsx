import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { Button } from '@/shared/components/ui';

interface TeacherLayoutProps {
  children: ReactNode;
}

export function TeacherLayout({ children }: TeacherLayoutProps) {
  const { profile } = useAuthStore();
  const { handleLogout } = useAuth();
  const location = useLocation();

  const onLogout = async () => {
    try {
      await handleLogout();
    } catch (err) {
      // Error handled by useAuth
    }
  };

  const isActive = (path: string) => {
    return location.pathname.startsWith(path);
  };

  const navLinkClass = (path: string) =>
    `text-sm font-medium transition-colors ${
      isActive(path)
        ? 'text-admin-accent'
        : 'text-admin-text hover:text-admin-accent'
    }`;

  return (
    <div className="min-h-screen bg-admin-bg">
      {/* Header */}
      <header className="bg-admin-surface border-b border-admin-muted/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <img
                src="/logo.png"
                alt="Sarpedon"
                className="h-8 w-8"
              />
              <div className="text-xl font-bold text-admin-text">
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
            <Link to="/teacher/students" className={navLinkClass('/teacher/students')}>
              Ученики
            </Link>
            <Link to="/teacher/levels" className={navLinkClass('/teacher/levels')}>
              Уровни
            </Link>
            <Link to="/teacher/competitions" className={navLinkClass('/teacher/competitions')}>
              Соревнования
            </Link>
            <Link to="/teacher/statistics" className={navLinkClass('/teacher/statistics')}>
              Статистика
            </Link>
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
