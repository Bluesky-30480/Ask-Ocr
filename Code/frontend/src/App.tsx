import { useEffect } from 'react'
import './App.css'
import { AppRouter } from './components/AppRouter/AppRouter'
import { systemTrayService } from './services/system-tray/system-tray.service'
import { globalShortcutsService } from './services/shortcuts/global-shortcuts.service'

function App() {
  // Initialize system tray and global shortcuts on mount
  useEffect(() => {
    const initializeServices = async () => {
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

  return <AppRouter />
}

export default App
