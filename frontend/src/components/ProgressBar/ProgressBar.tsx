import React from 'react';
import './ProgressBar.css';

export type ProgressSize = 'xs' | 'sm' | 'md' | 'lg';
export type ProgressVariant = 'default' | 'striped' | 'gradient';
export type ProgressColor = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';

export interface ProgressBarProps {
  value: number;
  max?: number;
  size?: ProgressSize;
  variant?: ProgressVariant;
  color?: ProgressColor;
  showPercentage?: boolean;
  showValue?: boolean;
  label?: string;
  animated?: boolean;
  indeterminate?: boolean;
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  size = 'md',
  variant = 'default',
  color = 'primary',
  showPercentage = false,
  showValue = false,
  label,
  animated = true,
  indeterminate = false,
  className = '',
}) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  const renderValue = () => {
    if (showPercentage) {
      return `${Math.round(percentage)}%`;
    }
    if (showValue) {
      return `${value}/${max}`;
    }
    return null;
  };

  return (
    <div className={`progress-bar-container size-${size} ${className}`}>
      {(label || showPercentage || showValue) && (
        <div className="progress-label">
          {label && <span className="label-text">{label}</span>}
          {(showPercentage || showValue) && (
            <span className="label-value">{renderValue()}</span>
          )}
        </div>
      )}

      <div
        className={`progress-track color-${color} variant-${variant}`}
        role="progressbar"
        aria-valuenow={indeterminate ? undefined : value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label || 'Progress'}
      >
        <div
          className={`progress-fill ${animated ? 'animated' : ''} ${indeterminate ? 'indeterminate' : ''}`}
          style={indeterminate ? undefined : { width: `${percentage}%` }}
        >
          {variant === 'striped' && <div className="progress-stripes" />}
        </div>
      </div>
    </div>
  );
};

export default ProgressBar;
