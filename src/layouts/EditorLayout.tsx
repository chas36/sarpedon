import { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { Button } from '@/shared/components/ui';

interface EditorLayoutProps {
  children: ReactNode;
}

export function EditorLayout({ children }: EditorLayoutProps) {
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
    return location.pathname.startsWith(path);
  };

  const navLinkClass = (path: string) =>
    `text-sm font-medium transition-colors ${
      isActive(path)
        ? 'text-learning-accent'
        : 'text-learning-text hover:text-learning-accent'
    }`;

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
                Редактор заданий
              </div>
            </div>

            {/* User Info */}
            <div className="flex items-center space-x-4">
              {profile && (
                <div className="text-right hidden sm:block">
                  <div className="text-sm font-medium text-learning-text">
                    {profile.first_name} {profile.last_name}
                  </div>
                  <div className="text-xs text-learning-muted">
                    {profile.class || 'Редактор'}
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
      <nav className="bg-learning-surface border-b border-learning-muted/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8 h-12 items-center">
            <Link to="/editor/levels" className={navLinkClass('/editor/levels')}>
              📝 Мои задания
            </Link>
            <Link to="/editor/levels/new" className={navLinkClass('/editor/levels/new')}>
              ➕ Создать задание
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Footer Info */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <div className="bg-learning-surface/50 rounded-lg p-4 border border-learning-muted/10">
          <p className="text-sm text-learning-muted text-center">
            💡 Вы можете создавать и редактировать задания для других учеников.
            Задания проверяются автоматически без использования ИИ.
          </p>
        </div>
      </div>
    </div>
  );
}
