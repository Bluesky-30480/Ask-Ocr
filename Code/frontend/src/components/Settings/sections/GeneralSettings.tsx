/**
 * General Settings Section - Recoded with working buttons and clean UI
 */

import React, { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/tauri';

interface Language {
  code: string;
  name: string;
  native: string;
}

const LANGUAGES: Language[] = [
  { code: 'en', name: 'English', native: 'English' },
  { code: 'zh', name: 'Chinese', native: '中文' },
  { code: 'ja', name: 'Japanese', native: '日本語' },
  { code: 'ko', name: 'Korean', native: '한국어' },
  { code: 'es', name: 'Spanish', native: 'Español' },
  { code: 'fr', name: 'French', native: 'Français' },
  { code: 'de', name: 'German', native: 'Deutsch' },
  { code: 'ru', name: 'Russian', native: 'Русский' },
  { code: 'pt', name: 'Portuguese', native: 'Português' },
];

export const GeneralSettings: React.FC = () => {
  const [language, setLanguage] = useState('en');
  const [autoStart, setAutoStart] = useState(false);
  const [minimizeToTray, setMinimizeToTray] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [ocrEngine, setOcrEngine] = useState<'offline' | 'online'>('offline');
  const [ocrApiKey, setOcrApiKey] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Load settings on mount
  useEffect(() => {
    const loadSettings = () => {
      try {
        setLanguage(localStorage.getItem('app_language') || 'en');
        setAutoStart(localStorage.getItem('auto_start') === 'true');
        setMinimizeToTray(localStorage.getItem('minimize_to_tray') !== 'false');
        setNotifications(localStorage.getItem('notifications') !== 'false');
        setOcrEngine((localStorage.getItem('ocr_engine') as 'offline' | 'online') || 'offline');
        setOcrApiKey(localStorage.getItem('ocrspace_api_key') || '');
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    };
    loadSettings();
  }, []);

  // Auto-save with debounce
  const saveSettings = useCallback(async () => {
    setIsSaving(true);
    setSaveStatus('idle');
    
    try {
      localStorage.setItem('app_language', language);
      localStorage.setItem('auto_start', String(autoStart));
      localStorage.setItem('minimize_to_tray', String(minimizeToTray));
      localStorage.setItem('notifications', String(notifications));
      localStorage.setItem('ocr_engine', ocrEngine);
      if (ocrApiKey.trim()) {
        localStorage.setItem('ocrspace_api_key', ocrApiKey.trim());
      }

      // Apply auto-start via Tauri if available
      if (autoStart) {
        try {
          await invoke('enable_autostart');
        } catch {
          // Ignore if command not available
        }
      } else {
        try {
          await invoke('disable_autostart');
        } catch {
          // Ignore if command not available
        }
      }

      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Failed to save settings:', error);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  }, [language, autoStart, minimizeToTray, notifications, ocrEngine, ocrApiKey]);

  const handleLanguageChange = (code: string) => {
    setLanguage(code);
    localStorage.setItem('app_language', code);
  };

  const handleToggle = (
    setter: React.Dispatch<React.SetStateAction<boolean>>,
    key: string,
    currentValue: boolean
  ) => {
    const newValue = !currentValue;
    setter(newValue);
    localStorage.setItem(key, String(newValue));
  };

  const handleOcrEngineChange = (engine: 'offline' | 'online') => {
    setOcrEngine(engine);
    localStorage.setItem('ocr_engine', engine);
  };

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setOcrApiKey(value);
  };

  const handleSaveApiKey = () => {
    if (ocrApiKey.trim()) {
      localStorage.setItem('ocrspace_api_key', ocrApiKey.trim());
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }
  };

  const handleTestOcrApi = async () => {
    if (!ocrApiKey.trim()) {
      alert('Please enter an API key first');
      return;
    }

    try {
      const response = await fetch('https://api.ocr.space/parse/imageurl', {
        method: 'POST',
        headers: {
          'apikey': ocrApiKey.trim(),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'url=https://www.w3schools.com/howto/img_lights.jpg&language=eng',
      });

      const data = await response.json();
      
      if (data.IsErroredOnProcessing) {
        alert(`API Test Failed: ${data.ErrorMessage || 'Unknown error'}`);
      } else {
        alert('✅ OCR.Space API connection successful!');
      }
    } catch (error) {
      alert(`API Test Failed: ${error}`);
    }
  };

  return (
    <div className="settings-section">
      <div className="settings-section-header">
        <h2 className="settings-section-title">General Settings</h2>
        <p className="settings-section-description">
          Configure general application behavior and preferences
        </p>
      </div>

      {/* Language Selection */}
      <div className="settings-group">
        <h3 className="settings-group-title">🌍 Language & Region</h3>
        
        <div className="settings-item" style={{ display: 'block' }}>
          <div className="settings-item-label" style={{ marginBottom: '12px' }}>
            <div className="settings-item-title">Interface Language</div>
            <div className="settings-item-description">
              Choose your preferred display language
            </div>
          </div>
          
          <div className="language-grid">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                className={`language-option ${language === lang.code ? 'selected' : ''}`}
                onClick={() => handleLanguageChange(lang.code)}
                type="button"
              >
                <span className="language-native">{lang.native}</span>
                <span className="language-name">{lang.name}</span>
                {language === lang.code && <span className="language-check">✓</span>}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Startup Options */}
      <div className="settings-group">
        <h3 className="settings-group-title">🚀 Startup</h3>
        
        <div className="settings-item">
          <div className="settings-item-label">
            <div className="settings-item-title">Launch at Login</div>
            <div className="settings-item-description">
              Automatically start Ask OCR when you log in to your computer
            </div>
          </div>
          <div className="settings-item-control">
            <button
              type="button"
              className={`toggle-btn ${autoStart ? 'active' : ''}`}
              onClick={() => handleToggle(setAutoStart, 'auto_start', autoStart)}
              aria-pressed={autoStart}
            >
              <span className="toggle-slider-inner" />
            </button>
          </div>
        </div>

        <div className="settings-item">
          <div className="settings-item-label">
            <div className="settings-item-title">Minimize to System Tray</div>
            <div className="settings-item-description">
              Hide window to system tray instead of closing completely
            </div>
          </div>
          <div className="settings-item-control">
            <button
              type="button"
              className={`toggle-btn ${minimizeToTray ? 'active' : ''}`}
              onClick={() => handleToggle(setMinimizeToTray, 'minimize_to_tray', minimizeToTray)}
              aria-pressed={minimizeToTray}
            >
              <span className="toggle-slider-inner" />
            </button>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="settings-group">
        <h3 className="settings-group-title">🔔 Notifications</h3>
        
        <div className="settings-item">
          <div className="settings-item-label">
            <div className="settings-item-title">Enable Notifications</div>
            <div className="settings-item-description">
              Show system notifications for OCR completion and errors
            </div>
          </div>
          <div className="settings-item-control">
            <button
              type="button"
              className={`toggle-btn ${notifications ? 'active' : ''}`}
              onClick={() => handleToggle(setNotifications, 'notifications', notifications)}
              aria-pressed={notifications}
            >
              <span className="toggle-slider-inner" />
            </button>
          </div>
        </div>
      </div>

      {/* OCR Engine Selection */}
      <div className="settings-group">
        <h3 className="settings-group-title">📝 OCR Engine</h3>
        
        <div className="settings-item" style={{ display: 'block' }}>
          <div className="settings-item-label" style={{ marginBottom: '12px' }}>
            <div className="settings-item-title">Engine Selection</div>
            <div className="settings-item-description">
              Choose between offline (Windows native) or online (OCR.Space) recognition
            </div>
          </div>
          
          <div className="engine-selector">
            <button
              type="button"
              className={`engine-option ${ocrEngine === 'offline' ? 'active' : ''}`}
              onClick={() => handleOcrEngineChange('offline')}
            >
              <span className="engine-icon">💻</span>
              <span className="engine-label">Offline (Native)</span>
              <span className="engine-desc">Free, no internet needed</span>
            </button>
            
            <button
              type="button"
              className={`engine-option ${ocrEngine === 'online' ? 'active' : ''}`}
              onClick={() => handleOcrEngineChange('online')}
            >
              <span className="engine-icon">☁️</span>
              <span className="engine-label">Online (OCR.Space)</span>
              <span className="engine-desc">Better accuracy, needs API key</span>
            </button>
          </div>
        </div>

        {ocrEngine === 'online' && (
          <div className="settings-item" style={{ display: 'block', marginTop: '16px' }}>
            <div className="settings-item-label" style={{ marginBottom: '8px' }}>
              <div className="settings-item-title">OCR.Space API Key</div>
              <div className="settings-item-description">
                Get a free key at{' '}
                <a 
                  href="https://ocr.space/ocrapi" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ color: 'var(--color-primary)' }}
                >
                  ocr.space/ocrapi
                </a>
                {' '}(Use "helloworld" for testing)
              </div>
            </div>
            
            <div className="api-key-input-group">
              <input
                type="password"
                className="input-control"
                value={ocrApiKey}
                onChange={handleApiKeyChange}
                placeholder="Enter your OCR.Space API key"
              />
              <button 
                type="button" 
                className="button-control secondary"
                onClick={handleSaveApiKey}
              >
                Save
              </button>
              <button 
                type="button" 
                className="button-control secondary"
                onClick={handleTestOcrApi}
              >
                Test
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Save All Button */}
      <div className="settings-group">
        <div className="settings-actions">
          <button
            type="button"
            className="button-control primary"
            onClick={saveSettings}
            disabled={isSaving}
          >
            {isSaving ? '⏳ Saving...' : '💾 Save All Settings'}
          </button>
          
          {saveStatus === 'success' && (
            <span className="save-status success">✅ Settings saved!</span>
          )}
          {saveStatus === 'error' && (
            <span className="save-status error">❌ Failed to save</span>
          )}
        </div>
      </div>

      <style>{`
        .language-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
          gap: 8px;
        }
        
        .language-option {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 12px 8px;
          background: var(--color-surface-primary);
          border: 2px solid var(--color-border-primary);
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s ease;
          position: relative;
        }
        
        .language-option:hover {
          border-color: var(--color-primary);
          background: var(--color-surface-secondary);
        }
        
        .language-option.selected {
          border-color: var(--color-primary);
          background: rgba(var(--color-primary-rgb), 0.1);
        }
        
        .language-native {
          font-size: 15px;
          font-weight: 600;
          color: var(--color-text-primary);
        }
        
        .language-name {
          font-size: 12px;
          color: var(--color-text-secondary);
          margin-top: 2px;
        }
        
        .language-check {
          position: absolute;
          top: 6px;
          right: 8px;
          color: var(--color-primary);
          font-weight: bold;
        }
        
        .toggle-btn {
          width: 50px;
          height: 28px;
          border-radius: 14px;
          border: none;
          background: var(--color-border-primary);
          cursor: pointer;
          position: relative;
          transition: background 0.2s ease;
          padding: 0;
        }
        
        .toggle-btn.active {
          background: var(--color-primary);
        }
        
        .toggle-slider-inner {
          position: absolute;
          top: 3px;
          left: 3px;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: white;
          transition: transform 0.2s ease;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        
        .toggle-btn.active .toggle-slider-inner {
          transform: translateX(22px);
        }
        
        .engine-selector {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        
        .engine-option {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 16px;
          background: var(--color-surface-primary);
          border: 2px solid var(--color-border-primary);
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .engine-option:hover {
          border-color: var(--color-primary);
        }
        
        .engine-option.active {
          border-color: var(--color-primary);
          background: rgba(var(--color-primary-rgb), 0.1);
        }
        
        .engine-icon {
          font-size: 24px;
          margin-bottom: 8px;
        }
        
        .engine-label {
          font-size: 14px;
          font-weight: 600;
          color: var(--color-text-primary);
        }
        
        .engine-desc {
          font-size: 12px;
          color: var(--color-text-secondary);
          margin-top: 4px;
        }
        
        .api-key-input-group {
          display: flex;
          gap: 8px;
        }
        
        .api-key-input-group .input-control {
          flex: 1;
        }
        
        .settings-actions {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        
        .save-status {
          font-size: 14px;
          font-weight: 500;
        }
        
        .save-status.success {
          color: #34c759;
        }
        
        .save-status.error {
          color: #ff3b30;
        }
        
        .button-control.primary {
          background: var(--color-primary);
          color: white;
          border: none;
          padding: 10px 24px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .button-control.primary:hover {
          opacity: 0.9;
        }
        
        .button-control.primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
};
