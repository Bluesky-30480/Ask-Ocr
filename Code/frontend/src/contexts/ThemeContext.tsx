import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'auto';

interface ThemeContextType {
  theme: Theme;
  isDarkMode: boolean;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>('auto');
  const [isDarkMode, setIsDarkMode] = useState(true);

  useEffect(() => {
    const savedTheme = localStorage.getItem('appearance_theme') as Theme;
    if (savedTheme) {
      setThemeState(savedTheme);
    }
  }, []);

  useEffect(() => {
    const calculateDarkMode = () => {
      if (theme === 'auto') {
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
      }
      return theme === 'dark';
    };

    const newIsDarkMode = calculateDarkMode();
    setIsDarkMode(newIsDarkMode);
    
    // Apply theme to document
    const root = document.documentElement;
    if (newIsDarkMode) {
      root.classList.add('dark-theme');
      root.setAttribute('data-theme', 'dark');
      
      // Apply variables (copied from App.tsx)
      root.style.setProperty('--color-background-primary', '#0f172a'); // Slate 900
      root.style.setProperty('--color-background-secondary', '#1e293b'); // Slate 800
      root.style.setProperty('--color-surface-primary', '#1e293b'); // Slate 800
      root.style.setProperty('--color-surface-secondary', '#334155'); // Slate 700
      root.style.setProperty('--color-text-primary', '#f8fafc'); // Slate 50
      root.style.setProperty('--color-text-secondary', '#94a3b8'); // Slate 400
      root.style.setProperty('--color-border-primary', '#334155'); // Slate 700
      root.style.setProperty('--color-primary', '#3b82f6'); // Blue 500
      root.style.setProperty('--color-primary-hover', '#2563eb'); // Blue 600
      
      // Glass Effect
      root.style.setProperty('--glass-header-bg', 'rgba(30, 41, 59, 0.7)');
      root.style.setProperty('--glass-header-blur', '12px');
      root.style.setProperty('--glass-header-border', 'rgba(255, 255, 255, 0.1)');
    } else {
      root.classList.remove('dark-theme');
      root.setAttribute('data-theme', 'light');
      
      root.style.setProperty('--color-background-primary', '#ffffff');
      root.style.setProperty('--color-background-secondary', '#f8fafc'); // Slate 50
      root.style.setProperty('--color-surface-primary', '#ffffff');
      root.style.setProperty('--color-surface-secondary', '#f1f5f9'); // Slate 100
      root.style.setProperty('--color-text-primary', '#0f172a'); // Slate 900
      root.style.setProperty('--color-text-secondary', '#64748b'); // Slate 500
      root.style.setProperty('--color-border-primary', '#e2e8f0'); // Slate 200
      root.style.setProperty('--color-primary', '#3b82f6'); // Blue 500
      root.style.setProperty('--color-primary-hover', '#2563eb'); // Blue 600

      // Glass Effect
      root.style.setProperty('--glass-header-bg', 'rgba(255, 255, 255, 0.7)');
      root.style.setProperty('--glass-header-blur', '12px');
      root.style.setProperty('--glass-header-border', 'rgba(0, 0, 0, 0.1)');
    }
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('appearance_theme', newTheme);
  };

  const toggleTheme = () => {
    setTheme(isDarkMode ? 'light' : 'dark');
  };

  return (
    <ThemeContext.Provider value={{ theme, isDarkMode, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
