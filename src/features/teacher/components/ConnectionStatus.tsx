import React from 'react';
import type { ConnectionStatus as Status } from '@/shared/types/database.types';

interface ConnectionStatusProps {
  status: Status;
  error?: string;
  onTest?: () => void;
  testing?: boolean;
}

export function ConnectionStatus({
  status,
  error,
  onTest,
  testing = false
}: ConnectionStatusProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'connected':
        return 'text-green-400';
      case 'disconnected':
        return 'text-gray-400';
      case 'error':
        return 'text-red-400';
      default:
        return 'text-gray-500';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'connected':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
      case 'disconnected':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        );
      case 'error':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'connected':
        return 'Подключено';
      case 'disconnected':
        return 'Отключено';
      case 'error':
        return 'Ошибка';
      default:
        return 'Неизвестно';
    }
  };

  return (
    <div className="flex items-center justify-between p-4 bg-dark-700 rounded-lg border border-dark-600">
      <div className="flex items-center space-x-3">
        <div className={getStatusColor()}>
          {getStatusIcon()}
        </div>
        <div>
          <p className="text-sm font-medium text-gray-200">
            Статус подключения
          </p>
          <p className={`text-sm ${getStatusColor()}`}>
            {getStatusText()}
          </p>
          {error && (
            <p className="text-xs text-red-400 mt-1">
              {error}
            </p>
          )}
        </div>
      </div>

      {onTest && (
        <button
          onClick={onTest}
          disabled={testing}
          className="px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-dark-600 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
        >
          {testing ? (
            <span className="flex items-center space-x-2">
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>Проверка...</span>
            </span>
          ) : (
            'Проверить соединение'
          )}
        </button>
      )}
    </div>
  );
}
