import { LoginForm } from '../components/LoginForm';
import { useAuth } from '../hooks/useAuth';
import type { LoginCredentials } from '@/shared/types';

const demoCredentials = {
  login: 'demo_teacher',
  password: 'DemoTeacher123!',
};

export function LoginPage() {
  const { handleLogin, loading, error } = useAuth();

  const onSubmit = async (credentials: LoginCredentials) => {
    try {
      await handleLogin(credentials);
      // TODO: Redirect to appropriate page based on role after router is set up
    } catch (err) {
      // Error is already handled by useAuth hook
    }
  };

  return (
    <div className="min-h-screen bg-learning-bg flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-8">
        {/* Logo/Branding */}
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <img
              src="/logo.png"
              alt="Sarpedon"
              className="h-20 w-20"
            />
          </div>
          <h1 className="text-4xl font-bold text-learning-text mb-2">
            Sarpedon
          </h1>
          <h2 className="text-2xl font-semibold text-learning-text">
            Вход в систему
          </h2>
          <p className="mt-2 text-learning-muted">
            Образовательная платформа для изучения программирования
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-learning-surface rounded-xl p-8 shadow-xl border border-learning-muted/10">
          <LoginForm onSubmit={onSubmit} loading={loading} error={error} />
        </div>

        <div className="rounded-xl border border-learning-accent/20 bg-learning-accent/10 p-4 text-sm text-learning-text">
          <p className="font-semibold">Демо-доступ для презентации</p>
          <p className="mt-2">
            Логин: <code className="rounded bg-learning-surface px-2 py-1">{demoCredentials.login}</code>
          </p>
          <p className="mt-2">
            Пароль: <code className="rounded bg-learning-surface px-2 py-1">{demoCredentials.password}</code>
          </p>
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-learning-muted">
          <p>Для получения учетных данных обратитесь к преподавателю</p>
        </div>
      </div>
    </div>
  );
}
