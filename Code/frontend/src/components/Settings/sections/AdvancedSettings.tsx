/**
 * Advanced Settings Section
 */

import React, { useState, useEffect } from 'react';

export const AdvancedSettings: React.FC = () => {
  const [developerMode, setDeveloperMode] = useState(false);
  const [debugLogging, setDebugLogging] = useState(false);
  const [cacheSize, setCacheSize] = useState(100);
  const [refreshRate, setRefreshRate] = useState(60);
  const [ocrConfidenceThreshold, setOcrConfidenceThreshold] = useState(0.7);
  const [autoLanguageDetection, setAutoLanguageDetection] = useState(true);

  useEffect(() => {
    // Load saved advanced settings
    const savedDeveloperMode = localStorage.getItem('advanced_developer_mode');
    const savedDebugLogging = localStorage.getItem('advanced_debug_logging');
    const savedCacheSize = localStorage.getItem('advanced_cache_size');
    const savedRefreshRate = localStorage.getItem('advanced_refresh_rate');
    const savedOcrThreshold = localStorage.getItem('advanced_ocr_threshold');
    const savedAutoLanguage = localStorage.getItem('advanced_auto_language');

    if (savedDeveloperMode !== null) setDeveloperMode(savedDeveloperMode === 'true');
    if (savedDebugLogging !== null) setDebugLogging(savedDebugLogging === 'true');
    if (savedCacheSize) setCacheSize(parseInt(savedCacheSize));
    if (savedRefreshRate) setRefreshRate(parseInt(savedRefreshRate));
    if (savedOcrThreshold) setOcrConfidenceThreshold(parseFloat(savedOcrThreshold));
    if (savedAutoLanguage !== null) setAutoLanguageDetection(savedAutoLanguage === 'true');
  }, []);

  const handleDeveloperModeToggle = (enabled: boolean) => {
    setDeveloperMode(enabled);
    localStorage.setItem('advanced_developer_mode', enabled.toString());
  };

  const handleDebugLoggingToggle = (enabled: boolean) => {
    setDebugLogging(enabled);
    localStorage.setItem('advanced_debug_logging', enabled.toString());
  };

  const handleCacheSizeChange = (size: number) => {
    setCacheSize(size);
    localStorage.setItem('advanced_cache_size', size.toString());
  };

  const handleRefreshRateChange = (rate: number) => {
    setRefreshRate(rate);
    localStorage.setItem('advanced_refresh_rate', rate.toString());
  };

  const handleOcrThresholdChange = (threshold: number) => {
    setOcrConfidenceThreshold(threshold);
    localStorage.setItem('advanced_ocr_threshold', threshold.toString());
  };

  const handleAutoLanguageToggle = (enabled: boolean) => {
    setAutoLanguageDetection(enabled);
    localStorage.setItem('advanced_auto_language', enabled.toString());
  };

  const handleExportSettings = () => {
    const settings: Record<string, string | null> = {};
    
    // Collect all localStorage settings
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        settings[key] = localStorage.getItem(key);
      }
    }

    const dataStr = JSON.stringify(settings, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `ask_ocr_settings_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
  };

  const handleImportSettings = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const settings = JSON.parse(event.target?.result as string);
          
          // Import settings
          Object.entries(settings).forEach(([key, value]) => {
            if (value !== null) {
              localStorage.setItem(key, value as string);
            }
          });

          alert('Settings imported successfully! Please restart the application.');
          window.location.reload();
        } catch (error) {
          alert('Failed to import settings. Please check the file format.');
          console.error('Import error:', error);
        }
      };
      
      reader.readAsText(file);
    };
    
    input.click();
  };

  const handleResetSettings = () => {
    if (confirm('Are you sure you want to reset all settings to defaults? This action cannot be undone.')) {
      localStorage.clear();
      alert('All settings have been reset. The application will reload.');
      window.location.reload();
    }
  };

  return (
    <div className="settings-section">
      <div className="settings-section-header">
        <h2 className="settings-section-title">Advanced</h2>
        <p className="settings-section-description">
          Advanced configuration and developer options
        </p>
      </div>

      {/* Developer */}
      <div className="settings-group">
        <h3 className="settings-group-title">Developer</h3>
        
        <div className="settings-item">
          <div className="settings-item-label">
            <div className="settings-item-title">Developer Mode</div>
            <div className="settings-item-description">Enable developer tools and debugging features</div>
          </div>
          <div className="settings-item-control">
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={developerMode}
                onChange={(e) => handleDeveloperModeToggle(e.target.checked)}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </div>

        {developerMode && (
          <div className="settings-item">
            <div className="settings-item-label">
              <div className="settings-item-title">Debug Logging</div>
              <div className="settings-item-description">Log detailed debug information to console</div>
            </div>
            <div className="settings-item-control">
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={debugLogging}
                  onChange={(e) => handleDebugLoggingToggle(e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Performance */}
      <div className="settings-group">
        <h3 className="settings-group-title">Performance</h3>
        
        <div className="settings-item">
          <div className="settings-item-label">
            <div className="settings-item-title">Cache Size</div>
            <div className="settings-item-description">Maximum number of cached items ({cacheSize})</div>
          </div>
          <div className="settings-item-control">
            <input
              type="range"
              className="slider-control"
              min="50"
              max="500"
              step="50"
              value={cacheSize}
              onChange={(e) => handleCacheSizeChange(parseInt(e.target.value))}
            />
          </div>
        </div>

        <div className="settings-item">
          <div className="settings-item-label">
            <div className="settings-item-title">Refresh Rate</div>
            <div className="settings-item-description">Context detection refresh rate ({refreshRate} FPS)</div>
          </div>
          <div className="settings-item-control">
            <input
              type="range"
              className="slider-control"
              min="30"
              max="120"
              step="10"
              value={refreshRate}
              onChange={(e) => handleRefreshRateChange(parseInt(e.target.value))}
            />
          </div>
        </div>
      </div>

      {/* OCR Settings */}
      <div className="settings-group">
        <h3 className="settings-group-title">OCR Settings</h3>
        
        <div className="settings-item">
          <div className="settings-item-label">
            <div className="settings-item-title">Confidence Threshold</div>
            <div className="settings-item-description">Minimum OCR confidence level ({Math.round(ocrConfidenceThreshold * 100)}%)</div>
          </div>
          <div className="settings-item-control">
            <input
              type="range"
              className="slider-control"
              min="0.3"
              max="0.95"
              step="0.05"
              value={ocrConfidenceThreshold}
              onChange={(e) => handleOcrThresholdChange(parseFloat(e.target.value))}
            />
          </div>
        </div>

        <div className="settings-item">
          <div className="settings-item-label">
            <div className="settings-item-title">Auto Language Detection</div>
            <div className="settings-item-description">Automatically detect text language</div>
          </div>
          <div className="settings-item-control">
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={autoLanguageDetection}
                onChange={(e) => handleAutoLanguageToggle(e.target.checked)}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </div>
      </div>

      {/* Settings Management */}
      <div className="settings-group">
        <h3 className="settings-group-title">Settings Management</h3>
        
        <div className="settings-item">
          <div className="settings-item-label">
            <div className="settings-item-title">Export Settings</div>
            <div className="settings-item-description">Download your settings as a JSON file</div>
          </div>
          <div className="settings-item-control">
            <button className="button-control secondary" onClick={handleExportSettings}>
              ↓ Export
            </button>
          </div>
        </div>

        <div className="settings-item">
          <div className="settings-item-label">
            <div className="settings-item-title">Import Settings</div>
            <div className="settings-item-description">Load settings from a JSON file</div>
          </div>
          <div className="settings-item-control">
            <button className="button-control secondary" onClick={handleImportSettings}>
              ↑ Import
            </button>
          </div>
        </div>

        <div className="settings-item">
          <div className="settings-item-label">
            <div className="settings-item-title">Reset to Defaults</div>
            <div className="settings-item-description">Reset all settings to factory defaults</div>
          </div>
          <div className="settings-item-control">
            <button className="button-control danger" onClick={handleResetSettings}>
              Reset All Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
