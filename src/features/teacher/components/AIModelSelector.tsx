import React from 'react';
import type { AIProvider } from '@/shared/types/database.types';
import { AI_MODELS } from '@/shared/api/teacherSettingsApi';

interface AIModelSelectorProps {
  provider: AIProvider;
  selectedModel: string;
  onModelChange: (model: string) => void;
  disabled?: boolean;
}

export function AIModelSelector({
  provider,
  selectedModel,
  onModelChange,
  disabled = false
}: AIModelSelectorProps) {
  const models = AI_MODELS[provider] || [];

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-200">
        Модель AI
      </label>
      <select
        value={selectedModel}
        onChange={(e) => onModelChange(e.target.value)}
        disabled={disabled}
        className="w-full px-4 py-2 bg-dark-700 border border-dark-600 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {models.map((model) => (
          <option key={model.id} value={model.id}>
            {model.name}
          </option>
        ))}
      </select>
      {models.find((m) => m.id === selectedModel) && (
        <p className="text-xs text-gray-400">
          {models.find((m) => m.id === selectedModel)?.description}
        </p>
      )}
    </div>
  );
}
