import React from 'react';
import './LoadingSpinner.css';

export type SpinnerSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type SpinnerVariant = 'default' | 'dots' | 'pulse' | 'bars' | 'ring' | 'wave';
export type SpinnerColor = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';

export interface LoadingSpinnerProps {
  size?: SpinnerSize;
  variant?: SpinnerVariant;
  color?: SpinnerColor;
  text?: string;
  className?: string;
  inline?: boolean;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  variant = 'default',
  color = 'primary',
  text,
  className = '',
  inline = false,
}) => {
  const renderSpinner = () => {
    switch (variant) {
      case 'default':
        return (
          <div className="spinner-default">
            <svg className="spinner-svg" viewBox="0 0 24 24" fill="none">
              <circle
                className="spinner-circle"
                cx="12"
                cy="12"
                r="10"
                strokeWidth="2"
              />
            </svg>
          </div>
        );

      case 'dots':
        return (
          <div className="spinner-dots">
            <div className="spinner-dot" />
            <div className="spinner-dot" />
            <div className="spinner-dot" />
          </div>
        );

      case 'pulse':
        return (
          <div className="spinner-pulse">
            <div className="pulse-ring" />
            <div className="pulse-dot" />
          </div>
        );

      case 'bars':
        return (
          <div className="spinner-bars">
            <div className="spinner-bar" />
            <div className="spinner-bar" />
            <div className="spinner-bar" />
            <div className="spinner-bar" />
          </div>
        );

      case 'ring':
        return (
          <div className="spinner-ring">
            <div className="ring-outer" />
            <div className="ring-inner" />
          </div>
        );

      case 'wave':
        return (
          <div className="spinner-wave">
            <div className="wave-bar" />
            <div className="wave-bar" />
            <div className="wave-bar" />
            <div className="wave-bar" />
            <div className="wave-bar" />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div
      className={`loading-spinner size-${size} color-${color} ${inline ? 'inline' : ''} ${className}`}
      role="status"
      aria-label={text || 'Loading'}
    >
      {renderSpinner()}
      {text && <span className="spinner-text">{text}</span>}
    </div>
  );
};

export default LoadingSpinner;
