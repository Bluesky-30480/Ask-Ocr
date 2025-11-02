/**
 * General Settings Section
 */

import React, { useState, useEffect } from 'react';

export const GeneralSettings: React.FC = () => {
  const [language, setLanguage] = useState('en');
  const [autoStart, setAutoStart] = useState(false);
  const [minimizeToTray, setMinimizeToTray] = useState(true);
  const [notifications, setNotifications] = useState(true);

  useEffect(() => {
    // Load saved settings
    const savedLanguage = localStorage.getItem('app_language') || 'en';
    const savedAutoStart = localStorage.getItem('auto_start') === 'true';
    const savedMinimize = localStorage.getItem('minimize_to_tray') !== 'false';
    const savedNotifications = localStorage.getItem('notifications') !== 'false';

    setLanguage(savedLanguage);
    setAutoStart(savedAutoStart);
    setMinimizeToTray(savedMinimize);
    setNotifications(savedNotifications);
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
        
        <div className="settings-item">
          <div className="settings-item-label">
            <div className="settings-item-title">Language</div>
            <div className="settings-item-description">
              Choose your preferred interface language
            </div>
          </div>
          <div className="settings-item-control">
            <select
              className="select-control"
              value={language}
              onChange={(e) => handleLanguageChange(e.target.value)}
            >
              <option value="en">English</option>
              <option value="zh">中文 (Chinese)</option>
              <option value="ja">日本語 (Japanese)</option>
              <option value="ko">한국어 (Korean)</option>
              <option value="es">Español (Spanish)</option>
              <option value="fr">Français (French)</option>
              <option value="de">Deutsch (German)</option>
            </select>
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
    </div>
  );
};
