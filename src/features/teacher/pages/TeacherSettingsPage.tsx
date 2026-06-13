import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getOrInitializeTeacherSettings,
  updateTeacherSettings,
  testAIConnection,
  updateConnectionStatus,
  AI_MODELS,
  type UpdateTeacherSettingsPayload
} from '@/shared/api/teacherSettingsApi';
import type { TeacherSettings, AIProvider } from '@/shared/types/database.types';
import { ConnectionStatus } from '../components/ConnectionStatus';
import { AIModelSelector } from '../components/AIModelSelector';

export function TeacherSettingsPage() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<TeacherSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form state
  const [aiProvider, setAiProvider] = useState<AIProvider>('groq');
  const [aiModel, setAiModel] = useState('llama-3.1-8b-instant');
  const [groqApiKey, setGroqApiKey] = useState('');
  const [openrouterApiKey, setOpenrouterApiKey] = useState('');
  const [hasGroqKey, setHasGroqKey] = useState(false); // Track if key is saved in DB
  const [hasOpenrouterKey, setHasOpenrouterKey] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(true);
  const [aiHintsEnabled, setAiHintsEnabled] = useState(true);
  const [aiTemperature, setAiTemperature] = useState(0.3);
  const [aiMaxTokens, setAiMaxTokens] = useState(1000);
  const [feedbackStyle, setFeedbackStyle] = useState<'adaptive' | 'detailed' | 'concise' | 'minimal'>('adaptive');

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getOrInitializeTeacherSettings();
      setSettings(data);

      // Populate form
      setAiProvider(data.ai_provider);
      setAiModel(data.ai_model);

      // Check if keys are saved (they come as '***SAVED***' if they exist)
      setHasGroqKey(data.groq_api_key === '***SAVED***');
      setHasOpenrouterKey(data.openrouter_api_key === '***SAVED***');

      // Don't populate actual keys (for security)
      setGroqApiKey('');
      setOpenrouterApiKey('');

      setAiEnabled(data.ai_enabled);
      setAiHintsEnabled(data.ai_hints_enabled);
      setAiTemperature(data.ai_temperature);
      setAiMaxTokens(data.ai_max_tokens);
      setFeedbackStyle(data.feedback_style);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось загрузить настройки');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);

      const payload: UpdateTeacherSettingsPayload = {
        ai_provider: aiProvider,
        ai_model: aiModel,
        groq_api_key: groqApiKey || undefined,
        openrouter_api_key: openrouterApiKey || undefined,
        ai_enabled: aiEnabled,
        ai_hints_enabled: aiHintsEnabled,
        ai_temperature: aiTemperature,
        ai_max_tokens: aiMaxTokens,
        feedback_style: feedbackStyle
      };

      const updated = await updateTeacherSettings(payload);
      setSettings(updated);
      setSuccessMessage('Настройки успешно сохранены');

      // Auto-hide success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить настройки');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      setTesting(true);
      setError(null);

      // Use API key from form, or undefined to use saved key from database/environment
      const apiKey = aiProvider === 'groq' ? groqApiKey : openrouterApiKey;

      const result = await testAIConnection(aiProvider, apiKey || undefined, aiModel);

      if (result.success) {
        await updateConnectionStatus('connected');
        setSuccessMessage('Соединение успешно установлено');
        await loadSettings(); // Reload to get updated connection status
      } else {
        await updateConnectionStatus('error', result.error);
        setError(result.error || 'Не удалось подключиться');
        await loadSettings();
      }
    } catch (err) {
      await updateConnectionStatus('error', err instanceof Error ? err.message : 'Unknown error');
      setError(err instanceof Error ? err.message : 'Ошибка проверки соединения');
      await loadSettings();
    } finally {
      setTesting(false);
    }
  };

  const handleProviderChange = (newProvider: AIProvider) => {
    setAiProvider(newProvider);
    // Set default model for the selected provider
    const defaultModel = AI_MODELS[newProvider][0]?.id;
    if (defaultModel) {
      setAiModel(defaultModel);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Настройки AI помощника</h1>
          <p className="text-gray-400 mt-2">
            Настройте AI модели и параметры для обратной связи студентам
          </p>
          {settings && (
            <div className="mt-3 flex items-center gap-2">
              <span className="text-sm text-gray-500">Текущая модель:</span>
              <span className="px-3 py-1 bg-primary-500/20 border border-primary-500/50 rounded-full text-primary-400 text-sm font-medium">
                {settings.ai_provider === 'groq' ? '⚡ Groq' : '🌐 OpenRouter'} · {settings.ai_model}
              </span>
              {settings.ai_enabled ? (
                <span className="px-2 py-1 bg-green-500/20 border border-green-500/50 rounded-full text-green-400 text-xs">
                  ✓ Активен
                </span>
              ) : (
                <span className="px-2 py-1 bg-red-500/20 border border-red-500/50 rounded-full text-red-400 text-xs">
                  ✗ Выключен
                </span>
              )}
            </div>
          )}
        </div>
        <button
          onClick={() => navigate('/teacher')}
          className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
        >
          Назад
        </button>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="p-4 bg-red-900/20 border border-red-500 rounded-lg text-red-400">
          {error}
        </div>
      )}
      {successMessage && (
        <div className="p-4 bg-green-900/20 border border-green-500 rounded-lg text-green-400">
          {successMessage}
        </div>
      )}

      {/* Connection Status */}
      {settings && (
        <ConnectionStatus
          status={settings.connection_status}
          error={settings.connection_error}
          onTest={handleTestConnection}
          testing={testing}
        />
      )}

      {/* Settings Form */}
      <div className="space-y-6 bg-dark-800 p-6 rounded-lg border border-dark-600">
        {/* AI Provider Selection */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-200">
            Провайдер AI
          </label>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => handleProviderChange('groq')}
              className={`p-4 rounded-lg border-2 transition-all ${
                aiProvider === 'groq'
                  ? 'border-primary-500 bg-primary-500/10'
                  : 'border-dark-600 bg-dark-700 hover:border-dark-500'
              }`}
            >
              <div className="font-semibold text-white">Groq</div>
              <div className="text-xs text-gray-400 mt-1">
                Быстро, бесплатно, ограничения
              </div>
            </button>
            <button
              onClick={() => handleProviderChange('openrouter')}
              className={`p-4 rounded-lg border-2 transition-all ${
                aiProvider === 'openrouter'
                  ? 'border-primary-500 bg-primary-500/10'
                  : 'border-dark-600 bg-dark-700 hover:border-dark-500'
              }`}
            >
              <div className="font-semibold text-white">OpenRouter</div>
              <div className="text-xs text-gray-400 mt-1">
                Больше моделей, платно
              </div>
            </button>
          </div>
        </div>

        {/* API Key Input */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-200">
            API Ключ {aiProvider === 'groq' ? 'Groq' : 'OpenRouter'}
          </label>
          <div className="relative">
            <input
              type="password"
              value={aiProvider === 'groq' ? groqApiKey : openrouterApiKey}
              onChange={(e) =>
                aiProvider === 'groq'
                  ? setGroqApiKey(e.target.value)
                  : setOpenrouterApiKey(e.target.value)
              }
              placeholder={
                (aiProvider === 'groq' && hasGroqKey) || (aiProvider === 'openrouter' && hasOpenrouterKey)
                  ? 'Ключ сохранен (оставьте пустым для использования сохраненного)'
                  : `Введите ${aiProvider === 'groq' ? 'Groq' : 'OpenRouter'} API ключ`
              }
              className="w-full px-4 py-2 bg-dark-700 border border-dark-600 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            {((aiProvider === 'groq' && hasGroqKey) || (aiProvider === 'openrouter' && hasOpenrouterKey)) && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-green-400 text-xs flex items-center gap-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Сохранен
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400">
            {aiProvider === 'groq' ? (
              <>
                Получите бесплатный API ключ на{' '}
                <a
                  href="https://console.groq.com/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-400 hover:underline"
                >
                  console.groq.com
                </a>
              </>
            ) : (
              <>
                Получите API ключ на{' '}
                <a
                  href="https://openrouter.ai/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-400 hover:underline"
                >
                  openrouter.ai
                </a>
              </>
            )}
          </p>
        </div>

        {/* Model Selection */}
        <AIModelSelector
          provider={aiProvider}
          selectedModel={aiModel}
          onModelChange={setAiModel}
        />

        {/* AI Toggles */}
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-dark-700/50 rounded-lg border border-dark-600">
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-200 flex items-center gap-2">
                Включить AI помощника
                {aiEnabled && <span className="text-green-400 text-xs">● Включен</span>}
                {!aiEnabled && <span className="text-red-400 text-xs">● Выключен</span>}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                Разрешить студентам получать AI обратную связь
              </div>
            </div>
            <button
              onClick={() => setAiEnabled(!aiEnabled)}
              className={`relative inline-flex h-7 w-14 items-center rounded-full transition-all duration-200 ${
                aiEnabled
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-gray-600 hover:bg-gray-500'
              }`}
              aria-label="Toggle AI helper"
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition-transform duration-200 ${
                  aiEnabled ? 'translate-x-8' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between p-4 bg-dark-700/50 rounded-lg border border-dark-600">
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-200 flex items-center gap-2">
                Подсказки AI
                {aiHintsEnabled && <span className="text-green-400 text-xs">● Включены</span>}
                {!aiHintsEnabled && <span className="text-gray-500 text-xs">● Выключены</span>}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                Показывать кнопку "Получить подсказку" студентам
              </div>
            </div>
            <button
              onClick={() => setAiHintsEnabled(!aiHintsEnabled)}
              className={`relative inline-flex h-7 w-14 items-center rounded-full transition-all duration-200 ${
                aiHintsEnabled
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-gray-600 hover:bg-gray-500'
              }`}
              aria-label="Toggle AI hints"
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition-transform duration-200 ${
                  aiHintsEnabled ? 'translate-x-8' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Advanced Settings */}
        <div className="space-y-4 pt-4 border-t border-dark-600">
          <h3 className="text-sm font-semibold text-gray-200">
            Дополнительные параметры
          </h3>

          {/* Feedback Style */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-200">
              Стиль обратной связи
            </label>
            <select
              value={feedbackStyle}
              onChange={(e) => setFeedbackStyle(e.target.value as any)}
              className="w-full px-4 py-2 bg-dark-700 border border-dark-600 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="adaptive">Адаптивный (по уровню студента)</option>
              <option value="detailed">Детальный</option>
              <option value="concise">Краткий</option>
              <option value="minimal">Минимальный</option>
            </select>
          </div>

          {/* Temperature */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-200">
              Температура: {aiTemperature}
            </label>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={aiTemperature}
              onChange={(e) => setAiTemperature(parseFloat(e.target.value))}
              className="w-full"
            />
            <p className="text-xs text-gray-400">
              Более высокая температура = более творческие ответы
            </p>
          </div>

          {/* Max Tokens */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-200">
              Макс. токенов: {aiMaxTokens}
            </label>
            <input
              type="range"
              min="100"
              max="4096"
              step="100"
              value={aiMaxTokens}
              onChange={(e) => setAiMaxTokens(parseInt(e.target.value))}
              className="w-full"
            />
            <p className="text-xs text-gray-400">
              Максимальная длина ответа AI
            </p>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end space-x-4">
        <button
          onClick={() => navigate('/teacher')}
          className="px-6 py-3 bg-dark-700 hover:bg-dark-600 text-white rounded-lg font-medium transition-colors"
        >
          Отмена
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-3 bg-primary-600 hover:bg-primary-700 disabled:bg-dark-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
        >
          {saving ? 'Сохранение...' : 'Сохранить настройки'}
        </button>
      </div>
    </div>
  );
}
