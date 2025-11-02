import React, { useState, useEffect } from 'react';
import Toolbar from '../Toolbar/Toolbar';
import StatusBar from '../StatusBar/StatusBar';
import './MainWindow.css';

interface MainWindowProps {
  children?: React.ReactNode;
}

export interface MainWindowState {
  sidebarCollapsed: boolean;
  activeView: 'home' | 'history' | 'settings' | 'templates';
  isFullscreen: boolean;
  windowSize: { width: number; height: number };
}

const MainWindow: React.FC<MainWindowProps> = ({ children }) => {
  const [state, setState] = useState<MainWindowState>({
    sidebarCollapsed: false,
    activeView: 'home',
    isFullscreen: false,
    windowSize: { width: 1200, height: 800 },
  });

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setState(prev => ({
        ...prev,
        windowSize: {
          width: window.innerWidth,
          height: window.innerHeight,
        },
      }));
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial size

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + B: Toggle sidebar
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault();
        toggleSidebar();
      }
      
      // Cmd/Ctrl + 1-4: Switch views
      if ((e.metaKey || e.ctrlKey) && ['1', '2', '3', '4'].includes(e.key)) {
        e.preventDefault();
        const views: MainWindowState['activeView'][] = ['home', 'history', 'settings', 'templates'];
        const viewIndex = parseInt(e.key) - 1;
        if (views[viewIndex]) {
          setActiveView(views[viewIndex]);
        }
      }

      // F11: Toggle fullscreen
      if (e.key === 'F11') {
        e.preventDefault();
        toggleFullscreen();
      }

      // Escape: Exit fullscreen
      if (e.key === 'Escape' && state.isFullscreen) {
        e.preventDefault();
        setFullscreen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state.isFullscreen]);

  const toggleSidebar = () => {
    setState(prev => ({
      ...prev,
      sidebarCollapsed: !prev.sidebarCollapsed,
    }));
  };

  const setActiveView = (view: MainWindowState['activeView']) => {
    setState(prev => ({
      ...prev,
      activeView: view,
    }));
  };

  const toggleFullscreen = () => {
    setState(prev => ({
      ...prev,
      isFullscreen: !prev.isFullscreen,
    }));
  };

  const setFullscreen = (fullscreen: boolean) => {
    setState(prev => ({
      ...prev,
      isFullscreen: fullscreen,
    }));
  };

  const isCompactMode = state.windowSize.width < 768;

  return (
    <div 
      className={`main-window ${state.isFullscreen ? 'fullscreen' : ''} ${isCompactMode ? 'compact' : ''}`}
      data-view={state.activeView}
    >
      {/* Window Controls (macOS style) */}
      <div className="window-controls">
        <div className="traffic-lights">
          <button className="traffic-light close" aria-label="Close window">
            <span className="traffic-light-icon"></span>
          </button>
          <button className="traffic-light minimize" aria-label="Minimize window">
            <span className="traffic-light-icon"></span>
          </button>
          <button 
            className="traffic-light maximize" 
            aria-label="Maximize window"
            onClick={toggleFullscreen}
          >
            <span className="traffic-light-icon"></span>
          </button>
        </div>
        
        <div className="window-title">
          <span>Ask OCR</span>
        </div>
        
        <div className="window-actions">
          <button 
            className="window-action-btn"
            onClick={toggleSidebar}
            aria-label="Toggle sidebar"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M2 3h12a1 1 0 0 1 0 2H2a1 1 0 0 1 0-2zm0 4h12a1 1 0 0 1 0 2H2a1 1 0 0 1 0-2zm0 4h12a1 1 0 0 1 0 2H2a1 1 0 0 1 0-2z"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <Toolbar
        onScreenshot={() => console.log('Screenshot clicked')}
        onSearch={(query) => console.log('Search:', query)}
        onAIChat={() => console.log('AI Chat clicked')}
        isProcessing={false}
      />

      {/* Main Content Area */}
      <div className="main-content">
        {/* Sidebar */}
        <aside className={`sidebar ${state.sidebarCollapsed ? 'collapsed' : ''}`}>
          <div className="sidebar-header">
            <div className="sidebar-logo">
              <div className="logo-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
              </div>
              {!state.sidebarCollapsed && (
                <div className="logo-text">
                  <span className="logo-title">Ask OCR</span>
                  <span className="logo-subtitle">AI-Powered OCR</span>
                </div>
              )}
            </div>
          </div>

          <nav className="sidebar-nav">
            <div className="nav-section">
              <div className="nav-section-title">
                {!state.sidebarCollapsed && <span>Main</span>}
              </div>
              <ul className="nav-list">
                <li>
                  <button
                    className={`nav-item ${state.activeView === 'home' ? 'active' : ''}`}
                    onClick={() => setActiveView('home')}
                  >
                    <span className="nav-icon">🏠</span>
                    {!state.sidebarCollapsed && <span className="nav-label">Home</span>}
                  </button>
                </li>
                <li>
                  <button
                    className={`nav-item ${state.activeView === 'history' ? 'active' : ''}`}
                    onClick={() => setActiveView('history')}
                  >
                    <span className="nav-icon">📚</span>
                    {!state.sidebarCollapsed && <span className="nav-label">History</span>}
                  </button>
                </li>
                <li>
                  <button
                    className={`nav-item ${state.activeView === 'templates' ? 'active' : ''}`}
                    onClick={() => setActiveView('templates')}
                  >
                    <span className="nav-icon">📝</span>
                    {!state.sidebarCollapsed && <span className="nav-label">Templates</span>}
                  </button>
                </li>
              </ul>
            </div>

            <div className="nav-section">
              <div className="nav-section-title">
                {!state.sidebarCollapsed && <span>Tools</span>}
              </div>
              <ul className="nav-list">
                <li>
                  <button className="nav-item">
                    <span className="nav-icon">📷</span>
                    {!state.sidebarCollapsed && <span className="nav-label">Screenshot</span>}
                  </button>
                </li>
                <li>
                  <button className="nav-item">
                    <span className="nav-icon">🤖</span>
                    {!state.sidebarCollapsed && <span className="nav-label">AI Chat</span>}
                  </button>
                </li>
              </ul>
            </div>

            <div className="nav-section">
              <div className="nav-section-title">
                {!state.sidebarCollapsed && <span>Settings</span>}
              </div>
              <ul className="nav-list">
                <li>
                  <button
                    className={`nav-item ${state.activeView === 'settings' ? 'active' : ''}`}
                    onClick={() => setActiveView('settings')}
                  >
                    <span className="nav-icon">⚙️</span>
                    {!state.sidebarCollapsed && <span className="nav-label">Settings</span>}
                  </button>
                </li>
              </ul>
            </div>
          </nav>

          {/* Sidebar Footer */}
          <div className="sidebar-footer">
            <div className="connection-status">
              <div className="status-indicator online"></div>
              {!state.sidebarCollapsed && (
                <div className="status-text">
                  <span className="status-label">Connected</span>
                  <span className="status-detail">Local AI Ready</span>
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* Main Workspace */}
        <main className="workspace">
          <div className="workspace-content">
            {children}
          </div>
        </main>
      </div>

      {/* Status Bar */}
      <StatusBar
        connectionStatus="connected"
        modelStatus="ready"
        currentModel="Local AI"
        processingCount={0}
        onModelClick={() => console.log('Model clicked')}
        onConnectionClick={() => console.log('Connection clicked')}
      />

      {/* Resize Handle (for custom window controls) */}
      <div className="resize-handle resize-handle-right"></div>
      <div className="resize-handle resize-handle-bottom"></div>
      <div className="resize-handle resize-handle-corner"></div>
    </div>
  );
};

export default MainWindow;