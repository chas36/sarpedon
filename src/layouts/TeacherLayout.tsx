import { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
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
    if (path === '/teacher') {
      return location.pathname === '/teacher';
    }
    // Для остальных - начинается с пути
    return location.pathname.startsWith(path);
  };

  const navLinkClass = (path: string) =>
    `flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-all ${
      isActive(path)
        ? 'text-admin-accent bg-admin-accent/10'
        : 'text-admin-text hover:text-admin-accent hover:bg-admin-accent/5'
    }`;

  return (
    <div className="min-h-screen bg-admin-bg">
      {/* Header */}
      <header className="bg-admin-surface border-b border-admin-muted/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/teacher" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
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
            </Link>

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
          <div className="flex gap-2 py-2 overflow-x-auto">
            <Link to="/teacher" className={navLinkClass('/teacher')}>
              <span>🏠</span>
              <span className="hidden md:inline">Главная</span>
            </Link>
            <Link to="/teacher/students" className={navLinkClass('/teacher/students')}>
              <span>👥</span>
              <span className="hidden md:inline">Ученики</span>
            </Link>
            <Link to="/teacher/levels" className={navLinkClass('/teacher/levels')}>
              <span>📝</span>
              <span className="hidden md:inline">Уровни</span>
            </Link>
            <Link to="/teacher/proficiency-analytics" className={navLinkClass('/teacher/proficiency-analytics')}>
              <span>📊</span>
              <span className="hidden md:inline">Аналитика</span>
            </Link>
            <Link to="/teacher/entrance-tests" className={navLinkClass('/teacher/entrance-tests')}>
              <span>✅</span>
              <span className="hidden md:inline">Тесты</span>
            </Link>
            <Link to="/teacher/statistics" className={navLinkClass('/teacher/statistics')}>
              <span>📈</span>
              <span className="hidden md:inline">Статистика</span>
            </Link>
            <Link to="/teacher/competitions" className={navLinkClass('/teacher/competitions')}>
              <span>🏆</span>
              <span className="hidden md:inline">Соревнования</span>
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
