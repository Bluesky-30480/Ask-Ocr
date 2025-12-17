import React, { useState, useEffect } from 'react';
import './ThemeToggle.css';

export type Theme = 'light' | 'dark' | 'system';

export interface ThemeToggleProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  onChange?: (theme: Theme) => void;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  className = '',
  size = 'md',
  showLabel = true,
  onChange,
}) => {
  const [currentTheme, setCurrentTheme] = useState<Theme>('system');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    // Load saved theme preference
    const savedTheme = localStorage.getItem('theme') as Theme;
    if (savedTheme) {
      setCurrentTheme(savedTheme);
      applyTheme(savedTheme);
    } else {
      applyTheme('system');
    }
  }, []);

  const applyTheme = (theme: Theme) => {
    const root = document.documentElement;
    
    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    } else {
      root.setAttribute('data-theme', theme);
    }
  };

  const handleThemeChange = (theme: Theme) => {
    setCurrentTheme(theme);
    localStorage.setItem('theme', theme);
    applyTheme(theme);
    setDropdownOpen(false);
    onChange?.(theme);
  };

  const getIcon = (theme: Theme) => {
    switch (theme) {
      case 'light':
        return (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M8 11C9.66 11 11 9.66 11 8C11 6.34 9.66 5 8 5C6.34 5 5 6.34 5 8C5 9.66 6.34 11 8 11ZM8 0L10.12 2.12L7.5 2.5L8 0ZM16 8L13.88 10.12L13.5 7.5L16 8ZM8 16L5.88 13.88L8.5 13.5L8 16ZM0 8L2.12 5.88L2.5 8.5L0 8Z"
              fill="currentColor"
            />
          </svg>
        );
      case 'dark':
        return (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M8 0C3.6 0 0 3.6 0 8C0 12.4 3.6 16 8 16C12.4 16 16 12.4 16 8C16 7.4 15.9 6.8 15.8 6.3C14.4 7.5 12.6 8.2 10.6 8.2C6.9 8.2 3.8 5.1 3.8 1.4C3.8 0.9 3.9 0.5 4 0C1.6 1.3 0 4 0 7C0 11.4 3.6 15 8 15C12.4 15 16 11.4 16 7C16 3.1 13.3 0 8 0Z"
              fill="currentColor"
            />
          </svg>
        );
      case 'system':
        return (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M14 0H2C0.9 0 0 0.9 0 2V12C0 13.1 0.9 14 2 14H6V15H4V16H12V15H10V14H14C15.1 14 16 13.1 16 12V2C16 0.9 15.1 0 14 0ZM14 12H2V2H14V12Z"
              fill="currentColor"
            />
          </svg>
        );
    }
  };

  const getLabel = (theme: Theme) => {
    switch (theme) {
      case 'light':
        return 'Light';
      case 'dark':
        return 'Dark';
      case 'system':
        return 'System';
    }
  };

  return (
    <div className={`theme-toggle size-${size} ${className}`}>
      <button
        className="theme-toggle-btn"
        onClick={() => setDropdownOpen(!dropdownOpen)}
        aria-expanded={dropdownOpen}
        aria-haspopup="true"
        type="button"
      >
        <span className="theme-icon">{getIcon(currentTheme)}</span>
        {showLabel && <span className="theme-label">{getLabel(currentTheme)}</span>}
        <svg className="dropdown-arrow" width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M2 4L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>

      {dropdownOpen && (
        <>
          <div className="theme-overlay" onClick={() => setDropdownOpen(false)} />
          <div className="theme-dropdown">
            <button
              className={`theme-option ${currentTheme === 'light' ? 'active' : ''}`}
              onClick={() => handleThemeChange('light')}
              type="button"
            >
              <span className="theme-option-icon">{getIcon('light')}</span>
              <span className="theme-option-label">Light</span>
              {currentTheme === 'light' && (
                <svg className="check-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M6 11L2 7L3.4 5.6L6 8.2L12.6 1.6L14 3L6 11Z" fill="currentColor" />
                </svg>
              )}
            </button>
            <button
              className={`theme-option ${currentTheme === 'dark' ? 'active' : ''}`}
              onClick={() => handleThemeChange('dark')}
              type="button"
            >
              <span className="theme-option-icon">{getIcon('dark')}</span>
              <span className="theme-option-label">Dark</span>
              {currentTheme === 'dark' && (
                <svg className="check-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M6 11L2 7L3.4 5.6L6 8.2L12.6 1.6L14 3L6 11Z" fill="currentColor" />
                </svg>
              )}
            </button>
            <button
              className={`theme-option ${currentTheme === 'system' ? 'active' : ''}`}
              onClick={() => handleThemeChange('system')}
              type="button"
            >
              <span className="theme-option-icon">{getIcon('system')}</span>
              <span className="theme-option-label">System</span>
              {currentTheme === 'system' && (
                <svg className="check-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M6 11L2 7L3.4 5.6L6 8.2L12.6 1.6L14 3L6 11Z" fill="currentColor" />
                </svg>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default ThemeToggle;
