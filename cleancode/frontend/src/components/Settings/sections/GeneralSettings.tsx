/**
 * General Settings Section
 */

import React, { useState, useEffect } from 'react';

export const GeneralSettings: React.FC = () => {
  const [language, setLanguage] = useState('en');
  const [autoStart, setAutoStart] = useState(false);
  const [minimizeToTray, setMinimizeToTray] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [ocrEngine, setOcrEngine] = useState<'offline' | 'online'>('offline');
  const [ocrApiKey, setOcrApiKey] = useState('');

  useEffect(() => {
    // Load saved settings
    const savedLanguage = localStorage.getItem('app_language') || 'en';
    const savedAutoStart = localStorage.getItem('auto_start') === 'true';
    const savedMinimize = localStorage.getItem('minimize_to_tray') !== 'false';
    const savedNotifications = localStorage.getItem('notifications') !== 'false';
    const savedOcrEngine = (localStorage.getItem('ocr_engine') as 'offline' | 'online') || 'offline';
    const savedApiKey = localStorage.getItem('ocrspace_api_key') || '';

    setLanguage(savedLanguage);
    setAutoStart(savedAutoStart);
    setMinimizeToTray(savedMinimize);
    setNotifications(savedNotifications);
    setOcrEngine(savedOcrEngine);
    setOcrApiKey(savedApiKey);
  }, []);

  const handleLanguageChange = (value: string) => {
    setLanguage(value);
    localStorage.setItem('app_language', value);
  };

  const handleAutoStartToggle = () => {
    const newValue = !autoStart;
    setAutoStart(newValue);
    localStorage.setItem('auto_start', String(newValue));
  };

  const handleMinimizeToggle = () => {
    const newValue = !minimizeToTray;
    setMinimizeToTray(newValue);
    localStorage.setItem('minimize_to_tray', String(newValue));
  };

  const handleNotificationsToggle = () => {
    const newValue = !notifications;
    setNotifications(newValue);
    localStorage.setItem('notifications', String(newValue));
  };

  const handleOcrEngineChange = (value: 'offline' | 'online') => {
    setOcrEngine(value);
    localStorage.setItem('ocr_engine', value);
  };

  const handleApiKeyChange = (value: string) => {
    setOcrApiKey(value);
    localStorage.setItem('ocrspace_api_key', value.trim());
  };

  const languages = [
    { code: 'en', name: 'English', native: 'English' },
    { code: 'zh', name: 'Chinese', native: '中文' },
    { code: 'ja', name: 'Japanese', native: '日本語' },
    { code: 'ko', name: 'Korean', native: '한국어' },
    { code: 'es', name: 'Spanish', native: 'Español' },
    { code: 'fr', name: 'French', native: 'Français' },
    { code: 'de', name: 'German', native: 'Deutsch' },
  ];

  return (
    <div className="settings-section">
      <div className="settings-section-header">
        <h2 className="settings-section-title">General</h2>
        <p className="settings-section-description">
          Configure general application behavior and preferences
        </p>
      </div>

      {/* Language & Region */}
      <div className="settings-group">
        <h3 className="settings-group-title">Language & Region</h3>
        
        <div className="settings-item" style={{ display: 'block' }}>
          <div className="settings-item-label" style={{ marginBottom: '12px' }}>
            <div className="settings-item-title">Language</div>
            <div className="settings-item-description">
              Choose your preferred interface language
            </div>
          </div>
          
          <div className="language-list">
            {languages.map((lang) => (
              <div 
                key={lang.code} 
                className={`language-item ${language === lang.code ? 'selected' : ''}`}
                onClick={() => handleLanguageChange(lang.code)}
                style={{ cursor: 'pointer' }}
              >
                <div className="language-info">
                  <span style={{ fontSize: '14px', fontWeight: 500 }}>{lang.native}</span>
                  <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>{lang.name}</span>
                </div>
                {language === lang.code && (
                  <div className="language-check" style={{ color: 'var(--color-primary)', fontSize: '16px', fontWeight: 'bold' }}>✓</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Startup */}
      <div className="settings-group">
        <h3 className="settings-group-title">Startup</h3>
        
        <div className="settings-item">
          <div className="settings-item-label">
            <div className="settings-item-title">Launch at Login</div>
            <div className="settings-item-description">
              Automatically start Ask OCR when you log in
            </div>
          </div>
          <div className="settings-item-control">
            <button
              className={`toggle-switch ${autoStart ? 'active' : ''}`}
              onClick={handleAutoStartToggle}
              aria-label="Toggle auto start"
            />
          </div>
        </div>

        <div className="settings-item">
          <div className="settings-item-label">
            <div className="settings-item-title">Minimize to System Tray</div>
            <div className="settings-item-description">
              Hide window to tray instead of closing when minimized
            </div>
          </div>
          <div className="settings-item-control">
            <button
              className={`toggle-switch ${minimizeToTray ? 'active' : ''}`}
              onClick={handleMinimizeToggle}
              aria-label="Toggle minimize to tray"
            />
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="settings-group">
        <h3 className="settings-group-title">Notifications</h3>
        
        <div className="settings-item">
          <div className="settings-item-label">
            <div className="settings-item-title">Show Notifications</div>
            <div className="settings-item-description">
              Display notifications for OCR completion and errors
            </div>
          </div>
          <div className="settings-item-control">
            <button
              className={`toggle-switch ${notifications ? 'active' : ''}`}
              onClick={handleNotificationsToggle}
              aria-label="Toggle notifications"
            />
          </div>
        </div>
      </div>

      {/* OCR */}
      <div className="settings-group">
        <h3 className="settings-group-title">OCR Engine</h3>

        <div className="settings-item" style={{ display: 'block' }}>
          <div className="settings-item-label" style={{ marginBottom: '12px' }}>
            <div className="settings-item-title">Engine Selection</div>
            <div className="settings-item-description">
              Choose between offline (native Windows OCR) and online OCR.Space (requires free API key).
            </div>
          </div>

          <div className="settings-item-control" style={{ display: 'flex', gap: '12px' }}>
            <button
              className={`button-control ${ocrEngine === 'offline' ? '' : 'secondary'}`}
              onClick={() => handleOcrEngineChange('offline')}
            >
              Offline (Native)
            </button>
            <button
              className={`button-control ${ocrEngine === 'online' ? '' : 'secondary'}`}
              onClick={() => handleOcrEngineChange('online')}
            >
              Online (OCR.Space)
            </button>
          </div>

          {ocrEngine === 'online' && (
            <div className="settings-item" style={{ marginTop: '12px' }}>
              <div className="settings-item-label">
                <div className="settings-item-title">OCR.Space API Key</div>
                <div className="settings-item-description">
                  Enter your free OCR.Space API key ("helloworld" works for testing with strict limits).
                </div>
              </div>
              <div className="settings-item-control">
                <input
                  className="input-control"
                  value={ocrApiKey}
                  placeholder="OCR.Space API Key"
                  onChange={(e) => handleApiKeyChange(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
