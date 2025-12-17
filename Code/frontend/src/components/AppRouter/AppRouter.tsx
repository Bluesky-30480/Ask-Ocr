/**
 * App Router - Main navigation component
 * Handles routing between Homepage and Settings
 */

import React, { useState } from 'react';
import { Homepage } from '../Homepage/Homepage';
import { SettingsPage } from '../Settings/SettingsPage';
import { QuickChat } from '../QuickChat/QuickChat';
import OcrResultsModal from '../OcrResultsModal';
import { ScreenshotOverlay, type ScreenshotRegion } from '../ScreenshotOverlay';
import { screenshotOcrWorkflow } from '../../services/screenshot-ocr-workflow.service';
import { invoke } from '@tauri-apps/api/tauri';
import { listen } from '@tauri-apps/api/event';
import type { OcrResult } from '@shared/types';
import type { ScreenshotOcrProgress } from '../../services/screenshot-ocr-workflow.service';
import './AppRouter.css';

type View = 'home' | 'settings' | 'quickchat';

export const AppRouter: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('home');
  const [breadcrumbs, setBreadcrumbs] = useState<string[]>(['Home']);
  const [isOcrModalOpen, setIsOcrModalOpen] = useState(false);
  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showRegionSelector, setShowRegionSelector] = useState(false);
  const [isOverlayMode, setIsOverlayMode] = useState(false);

  // Check if we are in overlay mode (based on hash)
  React.useEffect(() => {
    if (window.location.hash === '#/overlay') {
      setIsOverlayMode(true);
      setShowRegionSelector(true);
    }
  }, []);

  // Listen for overlay requests from backend
  React.useEffect(() => {
    const unlisten = listen('screenshot-overlay-requested', () => {
      setShowRegionSelector(true);
    });
    return () => {
      unlisten.then(f => f());
    };
  }, []);

  if (isOverlayMode) {
    return (
      <ScreenshotOverlay
        visible={true}
        onCapture={async (region) => {
          // Send region back to main window/process
          await invoke('capture_region', { region });
          // Close this overlay window
          await invoke('hide_screenshot_overlay');
        }}
        onCancel={async () => {
          await invoke('hide_screenshot_overlay');
        }}
      />
    );
  }

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

  const handleNewOcr = async (mode: 'fullscreen' | 'region' = 'fullscreen') => {
    if (mode === 'region') {
      const method = localStorage.getItem('screenshot_method') || 'builtin';
      if (method === 'native') {
        // Use native Windows Snipping Tool
        await performOcr('native-region');
      } else {
        // Show region selector overlay in a new transparent fullscreen window
        try {
          await invoke('show_screenshot_overlay');
        } catch (error) {
          console.error('Failed to show overlay:', error);
          // Fallback to local overlay if window creation fails (might work if window is already maximized)
          setShowRegionSelector(true);
        }
      }
    } else {
      // Capture fullscreen directly
      await performOcr('fullscreen');
    }
  };

  const handleRegionSelected = async (region: ScreenshotRegion) => {
    setShowRegionSelector(false);
    await performOcr('region', region);
  };

  const handleRegionCancelled = () => {
    setShowRegionSelector(false);
  };

  const performOcr = async (mode: 'fullscreen' | 'region' | 'native-region', region?: ScreenshotRegion) => {
    try {
      setIsProcessing(true);
      
      console.log('[AppRouter] performOcr called with mode:', mode, 'region:', region);
      
      // Trigger screenshot with OCR
      const result = await screenshotOcrWorkflow.captureAndProcess({
        mode: mode as any, // Cast to match service type
        region,
        language: 'eng',
        autoSave: true,
        onProgress: (progress: ScreenshotOcrProgress) => {
          console.log('OCR Progress:', progress.stage, progress.progress);
        },
      });

      // Create popup window in bottom-right corner instead of modal
      await showOcrResultPopup(result);
    } catch (error) {
      console.error('OCR workflow failed:', error);
      alert(`OCR failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

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
            onOpenQuickChat={() => navigateTo('quickchat')}
            onNewOcr={handleNewOcr}
          />
        );
      case 'settings':
        return <SettingsPage />;
      case 'quickchat':
        return <QuickChat />;
      default:
        return (
          <Homepage 
            onOpenSettings={() => navigateTo('settings')} 
            onOpenQuickChat={() => navigateTo('quickchat')}
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

      {/* Region Selector Overlay */}
      <ScreenshotOverlay
        visible={showRegionSelector}
        onCapture={handleRegionSelected}
        onCancel={handleRegionCancelled}
      />

      {/* OCR Results Modal (Fallback) */}
      {ocrResult && (
        <OcrResultsModal
          isOpen={isOcrModalOpen}
          onClose={() => setIsOcrModalOpen(false)}
          ocrText={ocrResult.text}
          language={ocrResult.language || 'eng'}
        />
      )}

      {/* Processing Overlay */}
      {isProcessing && (
        <div className="processing-overlay">
          <div className="processing-spinner"></div>
          <p>Processing OCR...</p>
        </div>
      )}
    </div>
  );
};
