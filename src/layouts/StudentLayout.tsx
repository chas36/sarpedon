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

  const isActive = (path: string) => {
    // Для главной страницы - точное совпадение
    if (path === '/student') {
      return location.pathname === '/student';
    }
    // Для остальных - начинается с пути
    return location.pathname.startsWith(path);
  };

  const navLinkClass = (path: string) =>
    `flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-all ${
      isActive(path)
        ? 'text-learning-accent bg-learning-accent/10'
        : 'text-learning-text hover:text-learning-accent hover:bg-learning-accent/5'
    }`;

  return (
    <div className="min-h-screen bg-learning-bg">
      {/* Header */}
      <header className="bg-learning-surface border-b border-learning-muted/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Branding */}
            <Link to="/student" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
              <div className="text-xl font-bold text-learning-text">
                Sarpedon
              </div>
              <div className="text-sm text-learning-muted hidden sm:block">
                Студент
              </div>
            </Link>

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
          <div className="flex gap-2 py-2 overflow-x-auto">
            <Link to="/student" className={navLinkClass('/student')}>
              <span>🏠</span>
              <span className="hidden md:inline">Главная</span>
            </Link>
            <Link to="/student/levels" className={navLinkClass('/student/levels')}>
              <span>📚</span>
              <span className="hidden md:inline">Уровни</span>
            </Link>
            <Link to="/student/progress" className={navLinkClass('/student/progress')}>
              <span>📊</span>
              <span className="hidden md:inline">Мой прогресс</span>
            </Link>
            <Link to="/student/competitions" className={navLinkClass('/student/competitions')}>
              <span>🏆</span>
              <span className="hidden md:inline">Соревнования</span>
            </Link>

            {/* Editor menu items - only visible if is_editor=true */}
            {profile?.is_editor && (
              <>
                <div className="border-l border-learning-muted/20 h-8 mx-2" />
                <Link to="/student/editor/my-levels" className={navLinkClass('/student/editor/my-levels')}>
                  <span>✏️</span>
                  <span className="hidden md:inline">Мои задания</span>
                </Link>
                <Link to="/student/editor/levels/new" className={navLinkClass('/student/editor/levels/new')}>
                  <span>➕</span>
                  <span className="hidden md:inline">Создать</span>
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
