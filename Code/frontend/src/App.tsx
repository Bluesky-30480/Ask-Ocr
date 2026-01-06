import { useEffect, useState } from 'react'
import './App.css'
import { AppRouter } from './components/AppRouter/AppRouter'
import { TitleBar } from './components/TitleBar/TitleBar'
import { FloatingBall } from './components/FloatingBall/FloatingBall'
import { systemTrayService } from './services/system-tray/system-tray.service'
import { globalShortcutsService } from './services/shortcuts/global-shortcuts.service'
import { ocrService } from './services/ocr/ocr.service'
import { appWindow, LogicalSize } from '@tauri-apps/api/window'
import { useTheme } from './contexts/ThemeContext'

export type View = 'home' | 'settings' | 'quickchat' | 'music' | 'media-helper';

function App() {
  const { isDarkMode, toggleTheme } = useTheme();
  const [isFloating, setIsFloating] = useState(false);
  const [previousSize, setPreviousSize] = useState<{width: number, height: number} | null>(null);
  const [currentView, setCurrentView] = useState<View>('home');

  // Initialize system tray and global shortcuts on mount
  useEffect(() => {
    const initializeServices = async () => {
      // Initialize OCR service
      try {
        console.log('[App] Initializing OCR service...');
        await ocrService.initialize('eng');
        console.log('[App] OCR service initialized successfully');
      } catch (error) {
        console.error('[App] Failed to initialize OCR:', error);
      }
      
      // Initialize system tray
      await systemTrayService.initialize();
      await systemTrayService.requestNotificationPermission();
      
      // Initialize global shortcuts
      await globalShortcutsService.initialize();
    };
    
    initializeServices();
    
    return () => {
      systemTrayService.dispose();
      globalShortcutsService.dispose();
    };
  }, []);

  // Prevent default browser shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && (e.key === 'r' || e.key === 'R')) e.preventDefault();
      if (e.ctrlKey && (e.key === 'r' || e.key === 'R') && !e.shiftKey) e.preventDefault();
      if (e.key === 'F5') e.preventDefault();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const enterFloatingMode = async () => {
    const scaleFactor = await appWindow.scaleFactor();
    const size = await appWindow.innerSize();
    // Store logical size to avoid DPI-scaled blow-up when restoring
    setPreviousSize({ width: size.width / scaleFactor, height: size.height / scaleFactor });
    
    await appWindow.setAlwaysOnTop(true);
    await appWindow.setSize(new LogicalSize(60, 60));
    setIsFloating(true);
    
    // Make background transparent for the ball
    document.documentElement.style.background = 'transparent';
    document.body.style.background = 'transparent';
    document.getElementById('root')!.style.background = 'transparent';
  };

  const exitFloatingMode = async () => {
    setIsFloating(false);
    await appWindow.setAlwaysOnTop(false);
    await appWindow.setFullscreen(false);

    if (previousSize) {
      await appWindow.setSize(new LogicalSize(previousSize.width, previousSize.height));
    } else {
      await appWindow.setSize(new LogicalSize(1100, 760));
    }
    
    // Ensure we are not maximized
    await appWindow.unmaximize();

    // Restore background to transparent (content handles the color)
    document.documentElement.style.background = 'transparent';
    document.body.style.background = 'transparent';
    document.getElementById('root')!.style.background = '#0f172a'; // Restore default background
  };

  if (isFloating) {
    return <FloatingBall onExpand={exitFloatingMode} />;
  }

  return (
    <div className="app-container" style={{ 
      height: '100vh', 
      width: '100%',
      display: 'flex', 
      flexDirection: 'column',
      background: 'var(--color-background-primary)',
      overflow: 'hidden'
    }}>
      <TitleBar 
        isDarkMode={isDarkMode} 
        toggleTheme={toggleTheme} 
        onEnterFloatingMode={enterFloatingMode}
        currentView={currentView}
        onNavigateHome={() => setCurrentView('home')}
      />
      <div className="app-content" style={{ flex: 1, overflow: 'hidden', position: 'relative', marginTop: '32px', minHeight: 0 }}>
        <AppRouter currentView={currentView} onNavigate={setCurrentView} />
      </div>
    </div>
  );
}

export default App
