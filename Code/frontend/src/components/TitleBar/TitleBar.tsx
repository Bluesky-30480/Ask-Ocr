import React from 'react';
import { appWindow } from '@tauri-apps/api/window';
import { X, Minus, Moon, Sun, Circle, Home } from 'lucide-react';
import './TitleBar.css';

interface TitleBarProps {
  isDarkMode: boolean;
  toggleTheme: () => void;
  onEnterFloatingMode: () => void;
  currentView: string;
  onNavigateHome: () => void;
}

export const TitleBar: React.FC<TitleBarProps> = ({ 
  isDarkMode, 
  toggleTheme,
  onEnterFloatingMode,
  currentView,
  onNavigateHome
}) => {
  const handleMinimize = () => appWindow.minimize();
  const handleClose = () => appWindow.close();

  return (
    <div className="titlebar" data-tauri-drag-region>
      <div className="titlebar-left">
        <div className="app-icon">
          <div className="logo-icon-small">B</div>
        </div>
        <span className="app-title">Bluesky</span>
      </div>

      <div className="titlebar-right">
        <div className="window-controls">
          {currentView !== 'home' && (
            <button 
              className="titlebar-button" 
              onClick={onNavigateHome}
              title="Go Home"
            >
              <Home size={16} />
            </button>
          )}

          <button 
            className="titlebar-button" 
            onClick={onEnterFloatingMode}
            title="Switch to Floating Ball"
          >
            <Circle size={16} />
          </button>

          <button 
            className="titlebar-button" 
            onClick={toggleTheme}
            title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          <button className="titlebar-button" onClick={handleMinimize}>
            <Minus size={16} />
          </button>
          <button className="titlebar-button close" onClick={handleClose}>
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
