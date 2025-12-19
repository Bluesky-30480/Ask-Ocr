import { useEffect } from 'react'
import './App.css'
import { AppRouter } from './components/AppRouter/AppRouter'
import { systemTrayService } from './services/system-tray/system-tray.service'
import { globalShortcutsService } from './services/shortcuts/global-shortcuts.service'
import { ocrService } from './services/ocr/ocr.service'

function App() {
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

  // Prevent default browser shortcuts (like Ctrl+Shift+R for reload)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent Ctrl+Shift+R (Reload)
      if (e.ctrlKey && e.shiftKey && (e.key === 'r' || e.key === 'R')) {
        e.preventDefault();
        console.log('Prevented default reload (Ctrl+Shift+R)');
        // We don't need to manually trigger the shortcut here because 
        // the global shortcut service should handle it via Tauri
      }
      
      // Prevent Ctrl+R (Reload)
      if (e.ctrlKey && (e.key === 'r' || e.key === 'R') && !e.shiftKey) {
        e.preventDefault();
        console.log('Prevented default reload (Ctrl+R)');
      }
      
      // Prevent F5 (Reload)
      if (e.key === 'F5') {
        e.preventDefault();
        console.log('Prevented default reload (F5)');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return <AppRouter />
}

export default App
