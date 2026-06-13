import { useState, useEffect } from 'react';
import { Modal, Button } from '@/shared/components/ui';
import { bulkCreateStudents } from '../api/studentsApi';
import { getAllClasses } from '../api/classesApi';
import type { Profile } from '@/shared/types';

interface BulkImportStudentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ParsedStudent {
  firstName: string;
  lastName: string;
  className: string;
  login?: string;
}

export function BulkImportStudentsModal({ isOpen, onClose, onSuccess }: BulkImportStudentsModalProps) {
  const [inputText, setInputText] = useState('');
  const [useExistingLogins, setUseExistingLogins] = useState(false);
  const [classes, setClasses] = useState<string[]>([]);
  const [parsedStudents, setParsedStudents] = useState<ParsedStudent[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<{
    success: Profile[];
    errors: Array<{ student: any; error: string }>;
  } | null>(null);

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
    setInputText('');
    setUseExistingLogins(false);
    setParsedStudents([]);
    setShowPreview(false);
    setError(null);
    setResults(null);
  };

  const parseInput = () => {
    const lines = inputText.trim().split('\n').filter((line) => line.trim());
    const students: ParsedStudent[] = [];
    const errors: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const parts = line.split(/\s+/);

      if (useExistingLogins) {
        // Format: Иванов Иван 10А ОКРУГ460
        if (parts.length < 4) {
          errors.push(`Строка ${i + 1}: недостаточно данных (нужно: Фамилия Имя Класс Логин)`);
          continue;
        }

        students.push({
          lastName: parts[0],
          firstName: parts[1],
          className: parts[2],
          login: parts[3],
        });
      } else {
        // Format: Иванов Иван 10А
        if (parts.length < 3) {
          errors.push(`Строка ${i + 1}: недостаточно данных (нужно: Фамилия Имя Класс)`);
          continue;
        }

        students.push({
          lastName: parts[0],
          firstName: parts[1],
          className: parts[2],
        });
      }
    }

    if (errors.length > 0) {
      setError(errors.join('\n'));
      return;
    }

    setParsedStudents(students);
    setShowPreview(true);
    setError(null);
  };

  const handleImport = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await bulkCreateStudents(parsedStudents);
      setResults(result);

      if (result.errors.length === 0) {
        // All successful - close after short delay
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 2000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка импорта');
    } finally {
      setLoading(false);
    }
  };

  const downloadCSV = () => {
    if (!results || results.success.length === 0) return;

    const header = 'Фамилия,Имя,Класс,Логин,Пароль\n';
    const rows = results.success.map((s) =>
      `${s.last_name},${s.first_name},${s.class},${s.generated_login},${s.generated_password}`
    ).join('\n');

    const csv = header + rows;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `students_credentials_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Массовый импорт учеников"
      size="large"
    >
      {error && (
        <div className="bg-admin-danger/10 border border-admin-danger rounded-lg p-3 mb-4">
          <p className="text-admin-danger text-sm whitespace-pre-wrap">{error}</p>
        </div>
      )}

      {!showPreview && !results ? (
        <div className="space-y-4">
          <div>
            <label className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                checked={useExistingLogins}
                onChange={(e) => setUseExistingLogins(e.target.checked)}
                className="rounded border-admin-muted/20"
              />
              <span className="text-sm text-admin-text">
                Использовать существующие логины
              </span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-admin-text mb-2">
              Список учеников
            </label>
            <p className="text-xs text-admin-muted mb-2">
              {useExistingLogins
                ? 'Формат: Фамилия Имя Класс Логин (каждый ученик с новой строки)'
                : 'Формат: Фамилия Имя Класс (каждый ученик с новой строки, логины будут сгенерированы автоматически)'}
            </p>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={
                useExistingLogins
                  ? 'Иванов Иван 10А ОКРУГ460\nПетров Петр 10А ГРАНАТ622'
                  : 'Иванов Иван 10А\nПетров Петр 10А'
              }
              rows={10}
              className="w-full px-3 py-2 bg-admin-surface border border-admin-muted/20 rounded-lg text-admin-text focus:outline-none focus:ring-2 focus:ring-admin-accent font-mono text-sm"
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={parseInput} className="flex-1">
              Предпросмотр ({inputText.trim().split('\n').filter((l) => l.trim()).length} учеников)
            </Button>
            <Button variant="ghost" onClick={onClose}>
              Отмена
            </Button>
          </div>
        </div>
      ) : showPreview && !results ? (
        <div className="space-y-4">
          <div className="max-h-96 overflow-y-auto border border-admin-muted/20 rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-admin-bg sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left text-admin-text">Фамилия</th>
                  <th className="px-3 py-2 text-left text-admin-text">Имя</th>
                  <th className="px-3 py-2 text-left text-admin-text">Класс</th>
                  {useExistingLogins && (
                    <th className="px-3 py-2 text-left text-admin-text">Логин</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {parsedStudents.map((student, index) => (
                  <tr key={index} className="border-t border-admin-muted/10">
                    <td className="px-3 py-2 text-admin-text">{student.lastName}</td>
                    <td className="px-3 py-2 text-admin-text">{student.firstName}</td>
                    <td className="px-3 py-2 text-admin-text">{student.className}</td>
                    {useExistingLogins && (
                      <td className="px-3 py-2 text-admin-text font-mono">{student.login}</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleImport} loading={loading} className="flex-1">
              Импортировать {parsedStudents.length} учеников
            </Button>
            <Button variant="ghost" onClick={() => setShowPreview(false)}>
              Назад
            </Button>
          </div>
        </div>
      ) : results ? (
        <div className="space-y-4">
          <div className="bg-admin-accent/10 border border-admin-accent rounded-lg p-4">
            <h3 className="text-lg font-semibold text-admin-text mb-2">
              Импорт завершен
            </h3>
            <p className="text-admin-text">
              Успешно создано: {results.success.length}
            </p>
            {results.errors.length > 0 && (
              <p className="text-admin-danger">
                Ошибок: {results.errors.length}
              </p>
            )}
          </div>

          {results.errors.length > 0 && (
            <div className="bg-admin-danger/10 border border-admin-danger rounded-lg p-4 max-h-48 overflow-y-auto">
              <h4 className="text-sm font-semibold text-admin-danger mb-2">Ошибки:</h4>
              <ul className="text-xs text-admin-danger space-y-1">
                {results.errors.map((err, index) => (
                  <li key={index}>
                    {err.student.lastName} {err.student.firstName}: {err.error}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex gap-2">
            {results.success.length > 0 && (
              <Button onClick={downloadCSV} variant="secondary" className="flex-1">
                Скачать учетные данные (CSV)
              </Button>
            )}
            <Button onClick={onClose}>
              Закрыть
            </Button>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
