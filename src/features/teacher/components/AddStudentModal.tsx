import { useState, useEffect } from 'react';
import { Modal, Button, Spinner } from '@/shared/components/ui';
import { createStudent } from '../api/studentsApi';
import { getAllClasses } from '../api/classesApi';
import { generateUniqueLogin, validateLogin } from '../utils/loginGenerator';
import type { Profile } from '@/shared/types';

interface AddStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (student: Profile) => void;
}

export function AddStudentModal({ isOpen, onClose, onSuccess }: AddStudentModalProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [className, setClassName] = useState('');
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [classes, setClasses] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCredentials, setShowCredentials] = useState(false);
  const [createdStudent, setCreatedStudent] = useState<Profile | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadClasses();
      resetForm();
    }
  }, [isOpen]);

  const loadClasses = async () => {
    try {
      const data = await getAllClasses();
      setClasses(data.map((c) => c.name));
    } catch (err) {
      console.error('Failed to load classes:', err);
    }
  };

  const resetForm = () => {
    setFirstName('');
    setLastName('');
    setClassName('');
    setLogin('');
    setPassword('');
    setError(null);
    setShowCredentials(false);
    setCreatedStudent(null);
  };

  const handleGenerateLogin = async () => {
    try {
      const generated = await generateUniqueLogin();
      setLogin(generated);
      setPassword(generated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка генерации логина');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!firstName.trim() || !lastName.trim()) {
      setError('Имя и фамилия обязательны');
      return;
    }

    if (!className.trim()) {
      setError('Выберите класс');
      return;
    }

    if (!login.trim()) {
      setError('Логин обязателен');
      return;
    }

    const loginError = validateLogin(login);
    if (loginError) {
      setError(loginError);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const student = await createStudent({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        className: className.trim(),
        login: login.trim(),
        password: password.trim() || login.trim(),
      });

      setCreatedStudent(student);
      setShowCredentials(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка создания ученика');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (createdStudent && showCredentials) {
      onSuccess(createdStudent);
    }
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={showCredentials ? 'Ученик создан' : 'Добавить ученика'}
    >
      {!showCredentials ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-admin-danger/10 border border-admin-danger rounded-lg p-3">
              <p className="text-admin-danger text-sm">{error}</p>
            </div>
          )}

          <div>
            <label htmlFor="firstName" className="block text-sm font-medium text-admin-text mb-1">
              Имя *
            </label>
            <input
              id="firstName"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full px-3 py-2 bg-admin-surface border border-admin-muted/20 rounded-lg text-admin-text focus:outline-none focus:ring-2 focus:ring-admin-accent"
              required
            />
          </div>

          <div>
            <label htmlFor="lastName" className="block text-sm font-medium text-admin-text mb-1">
              Фамилия *
            </label>
            <input
              id="lastName"
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full px-3 py-2 bg-admin-surface border border-admin-muted/20 rounded-lg text-admin-text focus:outline-none focus:ring-2 focus:ring-admin-accent"
              required
            />
          </div>

          <div>
            <label htmlFor="className" className="block text-sm font-medium text-admin-text mb-1">
              Класс *
            </label>
            <select
              id="className"
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              className="w-full px-3 py-2 bg-admin-surface border border-admin-muted/20 rounded-lg text-admin-text focus:outline-none focus:ring-2 focus:ring-admin-accent"
              required
            >
              <option value="">Выберите класс</option>
              {classes.map((cls) => (
                <option key={cls} value={cls}>
                  {cls}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="login" className="block text-sm font-medium text-admin-text mb-1">
              Логин *
            </label>
            <div className="flex gap-2">
              <input
                id="login"
                type="text"
                value={login}
                onChange={(e) => setLogin(e.target.value.toUpperCase())}
                placeholder="ОКРУГ460"
                className="flex-1 px-3 py-2 bg-admin-surface border border-admin-muted/20 rounded-lg text-admin-text focus:outline-none focus:ring-2 focus:ring-admin-accent"
                required
              />
              <Button
                type="button"
                variant="secondary"
                onClick={handleGenerateLogin}
              >
                Сгенерировать
              </Button>
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-admin-text mb-1">
              Пароль (по умолчанию = логин)
            </label>
            <input
              id="password"
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={login || 'Будет равен логину'}
              className="w-full px-3 py-2 bg-admin-surface border border-admin-muted/20 rounded-lg text-admin-text focus:outline-none focus:ring-2 focus:ring-admin-accent"
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" loading={loading} className="flex-1">
              Создать ученика
            </Button>
            <Button type="button" variant="ghost" onClick={onClose}>
              Отмена
            </Button>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          <div className="bg-admin-accent/10 border border-admin-accent rounded-lg p-4">
            <h3 className="text-lg font-semibold text-admin-text mb-2">
              {createdStudent?.first_name} {createdStudent?.last_name}
            </h3>
            <p className="text-admin-muted text-sm mb-4">
              Класс: {createdStudent?.class}
            </p>

            <div className="space-y-2">
              <div>
                <label className="text-xs text-admin-muted">Логин:</label>
                <div className="flex gap-2 mt-1">
                  <input
                    type="text"
                    value={createdStudent?.generated_login || ''}
                    readOnly
                    className="flex-1 px-3 py-2 bg-admin-surface rounded-lg text-admin-text"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      navigator.clipboard.writeText(
                        createdStudent?.generated_login || ''
                      )
                    }
                  >
                    Копировать
                  </Button>
                </div>
              </div>

              <div>
                <label className="text-xs text-admin-muted">Пароль:</label>
                <div className="flex gap-2 mt-1">
                  <input
                    type="text"
                    value={createdStudent?.generated_password || ''}
                    readOnly
                    className="flex-1 px-3 py-2 bg-admin-surface rounded-lg text-admin-text"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      navigator.clipboard.writeText(
                        createdStudent?.generated_password || ''
                      )
                    }
                  >
                    Копировать
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <p className="text-admin-muted text-sm">
            Сохраните эти данные! Передайте их ученику для входа в систему.
          </p>

          <Button onClick={handleClose} className="w-full">
            Готово
          </Button>
        </div>
      )}
    </Modal>
  );
}
