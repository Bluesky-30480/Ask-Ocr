/**
 * App Router - Main navigation component
 * Handles routing between Homepage and Settings
 */

import React, { useState } from 'react';
import { Homepage } from '../Homepage/Homepage';
import { SettingsPage } from '../Settings/SettingsPage';
import { QuickChat } from '../QuickChat/QuickChat';
import OcrResultsModal from '../OcrResultsModal';
import { screenshotOcrWorkflow } from '../../services/screenshot-ocr-workflow.service';
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

  const handleNewOcr = async () => {
    try {
      setIsProcessing(true);
      
      // Trigger region screenshot with OCR
      const result = await screenshotOcrWorkflow.captureAndProcess({
        mode: 'region',
        language: 'eng',
        autoSave: true,
        onProgress: (progress: ScreenshotOcrProgress) => {
          console.log('OCR Progress:', progress.stage, progress.progress);
        },
      });

      setOcrResult(result);
      setIsOcrModalOpen(true);
    } catch (error) {
      console.error('OCR workflow failed:', error);
      alert(`OCR failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
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

      {/* OCR Results Modal */}
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
