/**
 * App Router - Main navigation component
 * Handles routing between Homepage and Settings
 */

import React, { useRef, useState } from 'react';
import { Homepage } from '../Homepage/Homepage';
import { SettingsPage } from '../Settings/SettingsPage';
import { QuickChat } from '../QuickChat/QuickChat';
import OcrResultsModal from '../OcrResultsModal';
import { screenshotOcrWorkflow, type ScreenshotOcrProgress } from '../../services/screenshot-ocr-workflow.service';
import { invoke } from '@tauri-apps/api/tauri';
import { listen } from '@tauri-apps/api/event';
import type { OcrResult } from '@shared/types';
import './AppRouter.css';

type View = 'home' | 'settings' | 'quickchat';

export const AppRouter: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('home');
  const [breadcrumbs, setBreadcrumbs] = useState<string[]>(['Home']);
  const [quickChatInitialText, setQuickChatInitialText] = useState<string>('');
  const [isOcrModalOpen, setIsOcrModalOpen] = useState(false);
  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null);
  const ocrRunningRef = useRef(false);
  // No in-app overlay path; all captures use native snipping UI

  const navigateTo = (view: View) => {
    setCurrentView(view);
    
    // Update breadcrumbs
    switch (view) {
      case 'home':
        setBreadcrumbs(['Home']);
        break;
      case 'settings':
        setBreadcrumbs(['Home', 'Settings']);
        break;
      case 'quickchat':
        setBreadcrumbs(['Home', 'Quick Chat']);
        break;
    }
  };

  const navigateHome = () => {
    navigateTo('home');
  };

  const handleNewOcr = async (_mode: 'fullscreen' | 'region' = 'region') => {
    if (ocrRunningRef.current) {
      console.warn('[AppRouter] OCR already running, ignoring new request');
      return;
    }

    await performOcrNativeRegion();
  };

  const performOcrNativeRegion = async () => {
    if (ocrRunningRef.current) {
      console.warn('[AppRouter] OCR already running, skipping');
      return;
    }

    ocrRunningRef.current = true;
    let popupLabel: string | null = null;
    
    try {
      console.log('[AppRouter] Starting OCR capture with native region snip');
      
      // Create popup window FIRST
      try {
        popupLabel = await invoke('create_ocr_popup', { result: null }) as string;
        console.log('[AppRouter] Popup created:', popupLabel);

        // Immediately show initializing state so popup is not stuck
        try {
          await invoke('update_ocr_popup', {
            label: popupLabel,
            progress: {
              stage: 'capturing',
              progress: 5,
              message: 'Waiting for region selection...'
            },
            result: null,
          });
        } catch (e) {
          console.warn('Failed to send initial progress to popup:', e);
        }
      } catch (e) {
        console.error("Failed to create popup:", e);
        // Continue anyway, will use fallback
      }
      
      // Trigger native region screenshot + OCR workflow (no app overlay)
      const result = await screenshotOcrWorkflow.captureAndProcess({
        language: 'eng',
        autoSave: true,
        captureMethod: 'native',
        onProgress: async (progress: ScreenshotOcrProgress) => {
          console.log('[AppRouter] Progress:', progress.progress, progress.message);

          // Update popup if it exists
          if (popupLabel) {
             try {
               await invoke('update_ocr_popup', {
                  label: popupLabel,
                  progress: {
                      stage: progress.stage,
                      progress: progress.progress,
                      message: progress.message,
                  },
                  result: null,
               });
             } catch (e) {
               console.error("Failed to update popup progress:", e);
             }
          }
        },
      });

      console.log('[AppRouter] OCR complete:', result.text.substring(0, 50) + '...');

      // Send final result to popup
      if (popupLabel) {
          await invoke('update_ocr_popup', {
            label: popupLabel,
            progress: null,
            result: {
                text: result.text,
                language: result.language || 'eng',
            },
          });
      } else {
          // Fallback: create new popup with result
          await showOcrResultPopup(result);
      }
    } catch (error) {
      console.error('[AppRouter] OCR failed:', error);
      alert(`OCR failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      // Close popup if it was created
      if (popupLabel) {
        try {
          await invoke('close_popup', { label: popupLabel });
        } catch (e) {
          console.error('Failed to close popup:', e);
        }
      }
    } finally {
      ocrRunningRef.current = false;
    }
  };

  // Listen for global-screenshot events from keyboard shortcuts
  React.useEffect(() => {
    const handleGlobalScreenshot = (event: any) => {
      const type = event.detail?.type || 'region';
      console.log('[AppRouter] global-screenshot event received:', type);
      
      // Always use native region snipping; fullscreen path not used
      handleNewOcr('region');
    };

    window.addEventListener('global-screenshot', handleGlobalScreenshot);
    return () => {
      window.removeEventListener('global-screenshot', handleGlobalScreenshot);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // handleNewOcr is stable, no need to include as dependency

  // Listen for open-quick-chat events from popup
  React.useEffect(() => {
    let unlisten: (() => void) | undefined;

    const setupListener = async () => {
      unlisten = await listen<{ text: string }>('open-quick-chat', (event) => {
        console.log('[AppRouter] open-quick-chat event received:', event.payload);
        const text = event.payload?.text || '';
        setQuickChatInitialText(text);
        navigateTo('quickchat');
      });
    };

    setupListener();

    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  const showOcrResultPopup = async (result: OcrResult) => {
    try {
      // Store result in localStorage for the popup window to access
      localStorage.setItem('ocr_result_temp', JSON.stringify(result));
      
      // Create a new window positioned at bottom-right
      await invoke('create_ocr_popup', {
        result: {
          text: result.text,
          language: result.language || 'eng',
        }
      });
    } catch (error) {
      console.error('Failed to create popup window:', error);
      // Fallback to modal if window creation fails
      setOcrResult(result);
      setIsOcrModalOpen(true);
    }
  };

  const renderView = () => {
    switch (currentView) {
      case 'home':
        return (
          <Homepage 
            onOpenSettings={() => navigateTo('settings')}
            onOpenQuickChat={(text) => {
              setQuickChatInitialText(text || '');
              navigateTo('quickchat');
            }}
            onNewOcr={handleNewOcr}
          />
        );
      case 'settings':
        return <SettingsPage />;
      case 'quickchat':
        return <QuickChat initialText={quickChatInitialText} />;
      default:
        return (
          <Homepage 
            onOpenSettings={() => navigateTo('settings')} 
            onOpenQuickChat={(text) => {
              setQuickChatInitialText(text || '');
              navigateTo('quickchat');
            }}
            onNewOcr={handleNewOcr}
          />
        );
    }
  };

  return (
    <div className="app-router">
      {/* Breadcrumb Navigation */}
      {currentView !== 'home' && (
        <div className="app-breadcrumbs">
          <button className="breadcrumb-item" onClick={navigateHome}>
            🏠 Home
          </button>
          <span className="breadcrumb-separator">›</span>
          <span className="breadcrumb-item active">
            {breadcrumbs[breadcrumbs.length - 1]}
          </span>
          <button className="breadcrumb-close" onClick={navigateHome}>
            ✕
          </button>
        </div>
      )}

      {/* Main Content */}
      <div className="app-content">
        {renderView()}
      </div>

      {/* OCR Results Modal (Fallback) */}
      {ocrResult && (
        <OcrResultsModal
          isOpen={isOcrModalOpen}
          onClose={() => setIsOcrModalOpen(false)}
          ocrText={ocrResult.text}
          language={ocrResult.language || 'eng'}
        />
      )}
    </div>
  );
};
