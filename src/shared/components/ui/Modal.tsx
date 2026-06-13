import { ReactNode } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  size?: 'small' | 'medium' | 'large';
  title?: string;
}

export function Modal({ isOpen, onClose, children, size = 'medium', title }: ModalProps) {
  if (!isOpen) return null;

  const sizeClasses = {
    small: 'max-w-md',
    medium: 'max-w-2xl',
    large: 'max-w-4xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className={`relative bg-admin-surface rounded-lg p-6 w-full ${sizeClasses[size]} max-h-[90vh] overflow-y-auto`}>
        {title && (
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-admin-text">{title}</h2>
            <button
              onClick={onClose}
              className="text-admin-muted hover:text-admin-text"
            >
              ✕
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
