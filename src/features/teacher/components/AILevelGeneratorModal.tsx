import { useState } from 'react';
import { Modal, Button, Spinner } from '@/shared/components/ui';
import { generateLevels, GeneratedLevel } from '../api/aiLevelGeneratorApi';
import { createLevel } from '@/features/learning/api/levelsApi';
import { useAuthStore } from '@/features/auth/store/authStore';

interface AILevelGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLevelsCreated: () => void;
}

export function AILevelGeneratorModal({ isOpen, onClose, onLevelsCreated }: AILevelGeneratorModalProps) {
  const { user } = useAuthStore();
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy');
  const [language, setLanguage] = useState('python');
  const [count, setCount] = useState(1);
  const [additionalContext, setAdditionalContext] = useState('');

  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generatedLevels, setGeneratedLevels] = useState<GeneratedLevel[]>([]);
  const [selectedLevels, setSelectedLevels] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!topic.trim()) {
      setError('Введите тему задания');
      return;
    }

    try {
      setGenerating(true);
      setError(null);
      setGeneratedLevels([]);
      setSelectedLevels(new Set());

      const response = await generateLevels({
        topic: topic.trim(),
        difficulty,
        language,
        count,
        additionalContext: additionalContext.trim()
      });

      if (!response.success || !response.levels) {
        throw new Error(response.error || 'Не удалось сгенерировать задания');
      }

      setGeneratedLevels(response.levels);
      // By default, select all generated levels
      setSelectedLevels(new Set(response.levels.map((_, idx) => idx)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка генерации');
      console.error('Generation error:', err);
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveSelected = async () => {
    if (!user || selectedLevels.size === 0) return;

    try {
      setSaving(true);
      setError(null);

      // Get the highest order_index to add new levels after existing ones
      const highestOrderIndex = 0; // TODO: get from API

      for (const idx of selectedLevels) {
        const level = generatedLevels[idx];

        await createLevel({
          title: level.title,
          description: level.description,
          reference_solution: level.reference_solution,
          test_cases: level.test_cases,
          hints: level.hints,
          difficulty: level.difficulty,
          order_index: highestOrderIndex + idx + 1,
          language: level.language,
          target_skills: level.target_skills,
          is_remedial: false
        }, user.id);
      }

      onLevelsCreated();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка сохранения');
      console.error('Save error:', err);
    } finally {
      setSaving(false);
    }
  };

  const toggleLevelSelection = (idx: number) => {
    const newSelected = new Set(selectedLevels);
    if (newSelected.has(idx)) {
      newSelected.delete(idx);
    } else {
      newSelected.add(idx);
    }
    setSelectedLevels(newSelected);
  };

  const handleClose = () => {
    setTopic('');
    setAdditionalContext('');
    setGeneratedLevels([]);
    setSelectedLevels(new Set());
    setError(null);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="🤖 AI Генератор заданий" size="large">
      <div className="space-y-6">
        {/* Generation Form */}
        {generatedLevels.length === 0 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-learning-text mb-2">
                Тема задания *
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Например: Циклы for, Работа со строками, Рекурсия..."
                className="w-full px-4 py-2 bg-learning-surface border border-learning-muted/20 rounded-lg text-learning-text focus:outline-none focus:border-learning-accent"
                disabled={generating}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-learning-text mb-2">
                  Сложность
                </label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as 'easy' | 'medium' | 'hard')}
                  className="w-full px-4 py-2 bg-learning-surface border border-learning-muted/20 rounded-lg text-learning-text focus:outline-none focus:border-learning-accent"
                  disabled={generating}
                >
                  <option value="easy">Легко</option>
                  <option value="medium">Средне</option>
                  <option value="hard">Сложно</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-learning-text mb-2">
                  Язык программирования
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full px-4 py-2 bg-learning-surface border border-learning-muted/20 rounded-lg text-learning-text focus:outline-none focus:border-learning-accent"
                  disabled={generating}
                >
                  <option value="python">Python</option>
                  <option value="javascript">JavaScript</option>
                  <option value="java">Java</option>
                  <option value="cpp">C++</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-learning-text mb-2">
                Количество заданий (1-5)
              </label>
              <input
                type="number"
                min="1"
                max="5"
                value={count}
                onChange={(e) => setCount(Math.min(5, Math.max(1, parseInt(e.target.value) || 1)))}
                className="w-full px-4 py-2 bg-learning-surface border border-learning-muted/20 rounded-lg text-learning-text focus:outline-none focus:border-learning-accent"
                disabled={generating}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-learning-text mb-2">
                Дополнительный контекст (опционально)
              </label>
              <textarea
                value={additionalContext}
                onChange={(e) => setAdditionalContext(e.target.value)}
                placeholder="Добавьте дополнительные требования, ограничения или контекст..."
                rows={3}
                className="w-full px-4 py-2 bg-learning-surface border border-learning-muted/20 rounded-lg text-learning-text focus:outline-none focus:border-learning-accent resize-none"
                disabled={generating}
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <Button
                onClick={handleGenerate}
                disabled={generating || !topic.trim()}
                className="flex-1"
              >
                {generating ? (
                  <span className="flex items-center gap-2">
                    <Spinner size="sm" />
                    Генерирую задания...
                  </span>
                ) : (
                  '✨ Сгенерировать задания'
                )}
              </Button>
              <Button onClick={handleClose} variant="secondary">
                Отмена
              </Button>
            </div>
          </div>
        )}

        {/* Generated Levels Preview */}
        {generatedLevels.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-learning-text">
                Сгенерировано заданий: {generatedLevels.length}
              </h3>
              <div className="text-sm text-learning-muted">
                Выбрано: {selectedLevels.size}
              </div>
            </div>

            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
              {generatedLevels.map((level, idx) => (
                <div
                  key={idx}
                  className={`border rounded-lg p-4 cursor-pointer transition-all ${
                    selectedLevels.has(idx)
                      ? 'border-learning-accent bg-learning-accent/5'
                      : 'border-learning-muted/20 bg-learning-surface'
                  }`}
                  onClick={() => toggleLevelSelection(idx)}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedLevels.has(idx)}
                      onChange={() => toggleLevelSelection(idx)}
                      className="mt-1"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-learning-text">{level.title}</h4>
                        <span className="text-xs px-2 py-1 rounded bg-learning-muted/20 text-learning-muted">
                          {level.difficulty}
                        </span>
                        <span className="text-xs px-2 py-1 rounded bg-learning-accent/20 text-learning-accent">
                          {level.language}
                        </span>
                      </div>
                      <p className="text-sm text-learning-muted line-clamp-2">
                        {level.description}
                      </p>
                      <div className="flex gap-2 text-xs text-learning-muted">
                        <span>🧪 {level.test_cases.length} тестов</span>
                        <span>💡 {level.hints.length} подсказок</span>
                        <span>🎯 {level.target_skills.length} навыков</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <Button
                onClick={handleSaveSelected}
                disabled={saving || selectedLevels.size === 0}
                className="flex-1"
              >
                {saving ? (
                  <span className="flex items-center gap-2">
                    <Spinner size="sm" />
                    Сохраняю...
                  </span>
                ) : (
                  `✓ Одобрить и сохранить (${selectedLevels.size})`
                )}
              </Button>
              <Button
                onClick={() => {
                  setGeneratedLevels([]);
                  setSelectedLevels(new Set());
                  setError(null);
                }}
                variant="secondary"
              >
                🔄 Сгенерировать заново
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
