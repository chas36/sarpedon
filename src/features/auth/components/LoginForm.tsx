import { useState, FormEvent } from 'react';
import { Button } from '@/shared/components/ui';
import type { LoginCredentials } from '@/shared/types';

interface LoginFormProps {
  onSubmit: (credentials: LoginCredentials) => void;
  loading?: boolean;
  error?: string | null;
}

export function LoginForm({ onSubmit, loading = false, error = null }: LoginFormProps) {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [validationErrors, setValidationErrors] = useState<{
    login?: string;
    password?: string;
  }>({});

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Clear previous validation errors
    setValidationErrors({});

    // Validate
    const errors: { login?: string; password?: string } = {};

    if (!login.trim()) {
      errors.login = 'Логин обязателен';
    }

    if (!password.trim()) {
      errors.password = 'Пароль обязателен';
    }

    // If there are validation errors, don't submit
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    // Submit the form
    onSubmit({ login, password });
  };

  const handleLoginChange = (value: string) => {
    setLogin(value);
    // Clear validation error for this field
    if (validationErrors.login) {
      setValidationErrors((prev) => {
        const { login, ...rest } = prev;
        return rest;
      });
    }
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    // Clear validation error for this field
    if (validationErrors.password) {
      setValidationErrors((prev) => {
        const { password, ...rest } = prev;
        return rest;
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="login" className="block text-sm font-medium text-learning-text mb-2">
          Логин
        </label>
        <input
          id="login"
          type="text"
          value={login}
          onChange={(e) => handleLoginChange(e.target.value)}
          disabled={loading}
          className="w-full px-4 py-2 bg-learning-surface border border-learning-muted/20 rounded-lg text-learning-text placeholder-learning-muted focus:outline-none focus:ring-2 focus:ring-learning-accent focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          placeholder="Введите логин"
        />
        {validationErrors.login && (
          <p className="mt-1 text-sm text-red-400">{validationErrors.login}</p>
        )}
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-learning-text mb-2">
          Пароль
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => handlePasswordChange(e.target.value)}
          disabled={loading}
          className="w-full px-4 py-2 bg-learning-surface border border-learning-muted/20 rounded-lg text-learning-text placeholder-learning-muted focus:outline-none focus:ring-2 focus:ring-learning-accent focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          placeholder="Введите пароль"
        />
        {validationErrors.password && (
          <p className="mt-1 text-sm text-red-400">{validationErrors.password}</p>
        )}
      </div>

      <Button type="submit" className="w-full" loading={loading} disabled={loading}>
        {loading ? 'Вход...' : 'Войти'}
      </Button>
    </form>
  );
}
