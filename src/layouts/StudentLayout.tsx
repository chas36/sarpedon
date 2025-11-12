import { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { Button } from '@/shared/components/ui';

interface StudentLayoutProps {
  children: ReactNode;
}

export function StudentLayout({ children }: StudentLayoutProps) {
  const { profile } = useAuthStore();
  const { handleLogout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const onLogout = async () => {
    try {
      await handleLogout();
      navigate('/login');
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
              <img
                src="/logo.png"
                alt="Sarpedon"
                className="h-8 w-8"
              />
              <div className="text-xl font-bold text-learning-text">
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
            <Link
              to="/student/levels"
              className={`text-sm font-medium transition-colors ${
                location.pathname === '/student/levels'
                  ? 'text-learning-accent border-b-2 border-learning-accent'
                  : 'text-learning-text hover:text-learning-accent'
              }`}
            >
              Уровни
            </Link>
            <Link
              to="/student/progress"
              className={`text-sm font-medium transition-colors ${
                location.pathname === '/student/progress'
                  ? 'text-learning-accent border-b-2 border-learning-accent'
                  : 'text-learning-text hover:text-learning-accent'
              }`}
            >
              Мой прогресс
            </Link>
            <Link
              to="/student/competitions"
              className={`text-sm font-medium transition-colors ${
                location.pathname === '/student/competitions'
                  ? 'text-learning-accent border-b-2 border-learning-accent'
                  : 'text-learning-text hover:text-learning-accent'
              }`}
            >
              Соревнования
            </Link>

            {/* Editor menu items - only visible if is_editor=true */}
            {profile?.is_editor && (
              <>
                <div className="border-l border-learning-muted/20 h-6 mx-2" />
                <Link
                  to="/student/editor/my-levels"
                  className={`text-sm font-medium transition-colors ${
                    location.pathname.startsWith('/student/editor')
                      ? 'text-purple-500 border-b-2 border-purple-500'
                      : 'text-learning-text hover:text-purple-500'
                  }`}
                >
                  ✏️ Мои задания
                </Link>
                <Link
                  to="/student/editor/levels/new"
                  className={`text-sm font-medium transition-colors ${
                    location.pathname === '/student/editor/levels/new'
                      ? 'text-purple-500 border-b-2 border-purple-500'
                      : 'text-learning-text hover:text-purple-500'
                  }`}
                >
                  ➕ Создать задание
                </Link>
              </>
            )}
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
