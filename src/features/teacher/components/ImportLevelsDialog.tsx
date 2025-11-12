import { useState, useRef, useEffect } from 'react';
import { importLevelsFromJSON, type ImportResult } from '../api/moderationApi';
import { getEditorStudents } from '../api/studentsApi';
import { Button, Spinner } from '@/shared/components/ui';
import type { Profile } from '@/shared/types';

interface ImportLevelsDialogProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function ImportLevelsDialog({ onClose, onSuccess }: ImportLevelsDialogProps) {
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [jsonText, setJsonText] = useState('');
  const [selectedAuthorId, setSelectedAuthorId] = useState<string>(''); // '' = teacher (null), or student ID
  const [editors, setEditors] = useState<Profile[]>([]);
  const [loadingEditors, setLoadingEditors] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadEditors();
  }, []);

  async function loadEditors() {
    try {
      setLoadingEditors(true);
      const editorsData = await getEditorStudents();
      setEditors(editorsData);
    } catch (err) {
      console.error('Failed to load editors:', err);
    } finally {
      setLoadingEditors(false);
    }
  }

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setJsonText(text);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    try {
      setImporting(true);
      setResult(null);

      // Parse JSON
      let levelsData;
      try {
        levelsData = JSON.parse(jsonText);
      } catch (err) {
        alert('Ошибка парсинга JSON: ' + (err instanceof Error ? err.message : 'неверный формат'));
        return;
      }

      // Ensure it's an array
      if (!Array.isArray(levelsData)) {
        alert('JSON должен содержать массив заданий');
        return;
      }

      // Convert empty string to null (teacher import)
      const authorId = selectedAuthorId === '' ? null : selectedAuthorId;

      // Import
      const importResult = await importLevelsFromJSON(levelsData, authorId);
      setResult(importResult);

      if (importResult.success) {
        setTimeout(() => {
          onSuccess();
        }, 2000);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Ошибка при импорте');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-admin-surface rounded-lg border border-admin-muted/10 max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-admin-muted/10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-admin-text">Импорт заданий из JSON</h2>
              <p className="text-sm text-admin-muted mt-1">
                Загрузите JSON файл с заданиями или вставьте текст
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-admin-muted hover:text-admin-text transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Author Selection */}
          <div>
            <label className="block text-sm font-medium text-admin-text mb-2">
              Автор заданий
            </label>
            {loadingEditors ? (
              <div className="flex items-center gap-2 text-admin-muted">
                <Spinner size="sm" />
                <span className="text-sm">Загрузка списка редакторов...</span>
              </div>
            ) : (
              <>
                <select
                  value={selectedAuthorId}
                  onChange={(e) => setSelectedAuthorId(e.target.value)}
                  className="w-full px-3 py-2 bg-admin-bg border border-admin-muted/20 rounded-lg text-admin-text focus:outline-none focus:ring-2 focus:ring-admin-accent"
                >
                  <option value="">Я (учитель) - задания будут одобрены сразу</option>
                  {editors.map((editor) => (
                    <option key={editor.id} value={editor.id}>
                      {editor.first_name} {editor.last_name} ({editor.class || 'без класса'}) - задания на модерацию
                    </option>
                  ))}
                </select>
                <p className="text-xs text-admin-muted mt-2">
                  {selectedAuthorId === '' ? (
                    <span className="text-green-500">
                      ✅ Задания будут импортированы со статусом <strong>"Одобрено"</strong> и сразу доступны студентам
                    </span>
                  ) : (
                    <span className="text-yellow-500">
                      ⏳ Задания будут импортированы со статусом <strong>"На модерации"</strong> и потребуют одобрения
                    </span>
                  )}
                </p>
              </>
            )}
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-admin-text mb-2">
              Загрузить JSON файл
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              className="block w-full text-sm text-admin-text
                file:mr-4 file:py-2 file:px-4
                file:rounded-lg file:border-0
                file:text-sm file:font-medium
                file:bg-admin-accent file:text-white
                file:cursor-pointer
                hover:file:bg-blue-600
                border border-admin-muted/20 rounded-lg
                cursor-pointer"
            />
            <p className="text-xs text-admin-muted mt-1">
              Формат: массив объектов с полями title, description, language, difficulty, test_cases и т.д.
            </p>
          </div>

          {/* JSON Text Area */}
          <div>
            <label className="block text-sm font-medium text-admin-text mb-2">
              Или вставьте JSON текст
            </label>
            <textarea
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              placeholder='[{"title": "Название задания", "description": "...", ...}]'
              className="w-full h-64 px-3 py-2 bg-admin-bg border border-admin-muted/20 rounded-lg text-admin-text text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-admin-accent"
            />
          </div>

          {/* Download Template Link */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
            <p className="text-sm text-admin-text mb-2">
              📄 <strong>Нужен шаблон?</strong>
            </p>
            <p className="text-xs text-admin-muted mb-3">
              Скачайте шаблон JSON файла и руководство по созданию заданий:
            </p>
            <div className="flex gap-2">
              <a
                href="/docs/level-template.json"
                download
                className="text-xs px-3 py-1.5 bg-admin-accent text-white rounded hover:bg-blue-600 transition-colors"
              >
                📥 Скачать шаблон JSON
              </a>
              <a
                href="/docs/CREATE_LEVELS_GUIDE.md"
                download
                className="text-xs px-3 py-1.5 bg-admin-surface border border-admin-muted/20 text-admin-text rounded hover:bg-admin-bg transition-colors"
              >
                📖 Скачать руководство
              </a>
            </div>
          </div>

          {/* Import Result */}
          {result && (
            <div className={`rounded-lg p-4 border ${
              result.success
                ? 'bg-green-500/10 border-green-500/20'
                : 'bg-yellow-500/10 border-yellow-500/20'
            }`}>
              <div className="flex items-start gap-3">
                <span className="text-2xl">{result.success ? '✅' : '⚠️'}</span>
                <div className="flex-1">
                  <p className={`font-medium ${result.success ? 'text-green-400' : 'text-yellow-400'}`}>
                    {result.success ? 'Импорт завершен успешно!' : 'Импорт завершен с ошибками'}
                  </p>
                  <div className="text-sm text-admin-muted mt-2 space-y-1">
                    <p>✅ Импортировано: {result.imported}</p>
                    {result.failed > 0 && <p>❌ Не удалось: {result.failed}</p>}
                  </div>
                  {result.errors.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <p className="text-sm font-medium text-admin-text">Ошибки:</p>
                      {result.errors.map((err, idx) => (
                        <div key={idx} className="text-xs bg-admin-bg rounded p-2">
                          <span className="font-medium text-admin-text">{err.level}:</span>{' '}
                          <span className="text-red-400">{err.error}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-admin-muted/10 flex items-center justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>
            Закрыть
          </Button>
          <Button
            onClick={handleImport}
            disabled={!jsonText.trim() || importing}
          >
            {importing ? (
              <>
                <Spinner size="sm" />
                <span className="ml-2">Импорт...</span>
              </>
            ) : (
              '📥 Импортировать'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
