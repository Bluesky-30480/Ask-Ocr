import React, { useState, useEffect, useCallback } from 'react';
import './Toast.css';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastProps {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  action?: ToastAction;
  onClose: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({
  id,
  type,
  title,
  message,
  duration = 5000,
  action,
  onClose,
}) => {
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [progress, setProgress] = useState(100);

  const handleClose = useCallback(() => {
    setExiting(true);
    setTimeout(() => {
      onClose(id);
    }, 200);
  }, [id, onClose]);

  useEffect(() => {
    // Show animation
    requestAnimationFrame(() => {
      setVisible(true);
    });

    // Auto-close timer
    if (duration > 0) {
      const startTime = Date.now();
      const interval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
        setProgress(remaining);

        if (remaining === 0) {
          clearInterval(interval);
          handleClose();
        }
      }, 50);

      return () => clearInterval(interval);
    }
  }, [duration, handleClose]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M10 0C4.48 0 0 4.48 0 10C0 15.52 4.48 20 10 20C15.52 20 20 15.52 20 10C20 4.48 15.52 0 10 0ZM8 15L3 10L4.41 8.59L8 12.17L15.59 4.58L17 6L8 15Z"
              fill="currentColor"
            />
          </svg>
        );
      case 'error':
        return (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M10 0C4.48 0 0 4.48 0 10C0 15.52 4.48 20 10 20C15.52 20 20 15.52 20 10C20 4.48 15.52 0 10 0ZM11 15H9V13H11V15ZM11 11H9V5H11V11Z"
              fill="currentColor"
            />
          </svg>
        );
      case 'warning':
        return (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M0 20H20L10 0L0 20ZM11 17H9V15H11V17ZM11 13H9V9H11V13Z"
              fill="currentColor"
            />
          </svg>
        );
      case 'info':
        return (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M10 0C4.48 0 0 4.48 0 10C0 15.52 4.48 20 10 20C15.52 20 20 15.52 20 10C20 4.48 15.52 0 10 0ZM11 15H9V9H11V15ZM11 7H9V5H11V7Z"
              fill="currentColor"
            />
          </svg>
        );
    }
  };

  return (
    <div
      className={`toast toast-${type} ${visible ? 'toast-visible' : ''} ${exiting ? 'toast-exiting' : ''}`}
      role="alert"
      aria-live="polite"
    >
      {duration > 0 && (
        <div className="toast-progress">
          <div
            className="toast-progress-fill"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      <div className="toast-content">
        <div className="toast-icon-container">{getIcon()}</div>

        <div className="toast-text">
          <div className="toast-title">{title}</div>
          {message && <div className="toast-message">{message}</div>}
        </div>

        {action && (
          <button
            className="toast-action"
            onClick={action.onClick}
            type="button"
          >
            {action.label}
          </button>
        )}

        <button
          className="toast-close"
          onClick={handleClose}
          type="button"
          aria-label="Close notification"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M12.8 4.27L11.73 3.2L8 6.93L4.27 3.2L3.2 4.27L6.93 8L3.2 11.73L4.27 12.8L8 9.07L11.73 12.8L12.8 11.73L9.07 8L12.8 4.27Z"
              fill="currentColor"
            />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default Toast;
