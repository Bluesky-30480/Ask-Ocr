/**
 * Privacy Settings Section
 */

import React, { useState, useEffect } from 'react';

interface BlacklistedApp {
  id: string;
  name: string;
  executable: string;
}

export const PrivacySettings: React.FC = () => {
  const [contextDetection, setContextDetection] = useState(true);
  const [blacklistedApps, setBlacklistedApps] = useState<BlacklistedApp[]>([]);
  const [newAppName, setNewAppName] = useState('');
  const [newAppExe, setNewAppExe] = useState('');
  const [dataCollection, setDataCollection] = useState(true);
  const [historyRetention, setHistoryRetention] = useState(30);
  const [privacyMode, setPrivacyMode] = useState(false);

  useEffect(() => {
    // Load saved privacy settings
    const savedContextDetection = localStorage.getItem('privacy_context_detection');
    const savedBlacklist = localStorage.getItem('privacy_blacklisted_apps');
    const savedDataCollection = localStorage.getItem('privacy_data_collection');
    const savedHistoryRetention = localStorage.getItem('privacy_history_retention');
    const savedPrivacyMode = localStorage.getItem('privacy_mode');

    if (savedContextDetection !== null) setContextDetection(savedContextDetection === 'true');
    if (savedBlacklist) {
      try {
        setBlacklistedApps(JSON.parse(savedBlacklist));
      } catch (error) {
        console.error('Failed to load blacklisted apps:', error);
      }
    }
    if (savedDataCollection !== null) setDataCollection(savedDataCollection === 'true');
    if (savedHistoryRetention) setHistoryRetention(parseInt(savedHistoryRetention));
    if (savedPrivacyMode !== null) setPrivacyMode(savedPrivacyMode === 'true');
  }, []);

  const handleContextDetectionToggle = (enabled: boolean) => {
    setContextDetection(enabled);
    localStorage.setItem('privacy_context_detection', enabled.toString());
  };

  const handleAddApp = () => {
    if (!newAppName.trim() || !newAppExe.trim()) return;

    const newApp: BlacklistedApp = {
      id: Date.now().toString(),
      name: newAppName.trim(),
      executable: newAppExe.trim(),
    };

    const updatedApps = [...blacklistedApps, newApp];
    setBlacklistedApps(updatedApps);
    localStorage.setItem('privacy_blacklisted_apps', JSON.stringify(updatedApps));
    
    setNewAppName('');
    setNewAppExe('');
  };

  const handleRemoveApp = (id: string) => {
    const updatedApps = blacklistedApps.filter(app => app.id !== id);
    setBlacklistedApps(updatedApps);
    localStorage.setItem('privacy_blacklisted_apps', JSON.stringify(updatedApps));
  };

  const handleDataCollectionToggle = (enabled: boolean) => {
    setDataCollection(enabled);
    localStorage.setItem('privacy_data_collection', enabled.toString());
  };

  const handleHistoryRetentionChange = (days: number) => {
    setHistoryRetention(days);
    localStorage.setItem('privacy_history_retention', days.toString());
  };

  const handlePrivacyModeToggle = (enabled: boolean) => {
    setPrivacyMode(enabled);
    localStorage.setItem('privacy_mode', enabled.toString());
  };

  const handleClearHistory = () => {
    if (confirm('Are you sure you want to clear all OCR history? This action cannot be undone.')) {
      localStorage.removeItem('ocr_history');
      alert('History cleared successfully');
    }
  };

  const retentionOptions = [
    { value: 7, label: '7 days' },
    { value: 30, label: '30 days' },
    { value: 90, label: '90 days' },
    { value: 365, label: '1 year' },
    { value: -1, label: 'Forever' },
  ];

  return (
    <div className="settings-section">
      <div className="settings-section-header">
        <h2 className="settings-section-title">Privacy</h2>
        <p className="settings-section-description">
          Manage your privacy and data settings
        </p>
      </div>

      {/* Context Detection */}
      <div className="settings-group">
        <h3 className="settings-group-title">Context Detection</h3>
        
        <div className="settings-item">
          <div className="settings-item-label">
            <div className="settings-item-title">Enable Context Detection</div>
            <div className="settings-item-description">Allow Ask_Ocr to detect the current application context</div>
          </div>
          <div className="settings-item-control">
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={contextDetection}
                onChange={(e) => handleContextDetectionToggle(e.target.checked)}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </div>

        {contextDetection && (
          <>
            <div className="settings-item">
              <div className="settings-item-label">
                <div className="settings-item-title">Blacklisted Applications</div>
                <div className="settings-item-description">Apps that won't be monitored for context</div>
              </div>
            </div>

            {blacklistedApps.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                {blacklistedApps.map((app) => (
                  <div key={app.id} className="blacklist-item">
                    <div>
                      <div style={{ fontWeight: 500 }}>{app.name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                        {app.executable}
                      </div>
                    </div>
                    <button
                      className="button-control danger"
                      onClick={() => handleRemoveApp(app.id)}
                      style={{ padding: '4px 12px', fontSize: '13px' }}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="blacklist-add">
              <input
                type="text"
                className="input-control"
                placeholder="App name (e.g., Notepad)"
                value={newAppName}
                onChange={(e) => setNewAppName(e.target.value)}
                style={{ flex: 1 }}
              />
              <input
                type="text"
                className="input-control"
                placeholder="Executable (e.g., notepad.exe)"
                value={newAppExe}
                onChange={(e) => setNewAppExe(e.target.value)}
                style={{ flex: 1 }}
              />
              <button
                className="button-control"
                onClick={handleAddApp}
                disabled={!newAppName.trim() || !newAppExe.trim()}
              >
                + Add
              </button>
            </div>
          </>
        )}
      </div>

      {/* Data & Privacy */}
      <div className="settings-group">
        <h3 className="settings-group-title">Data & Privacy</h3>
        
        <div className="settings-item">
          <div className="settings-item-label">
            <div className="settings-item-title">Privacy Mode</div>
            <div className="settings-item-description">Disable all data collection and analytics</div>
          </div>
          <div className="settings-item-control">
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={privacyMode}
                onChange={(e) => handlePrivacyModeToggle(e.target.checked)}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </div>

        {!privacyMode && (
          <div className="settings-item">
            <div className="settings-item-label">
              <div className="settings-item-title">Usage Data Collection</div>
              <div className="settings-item-description">Help improve Ask_Ocr by sending anonymous usage data</div>
            </div>
            <div className="settings-item-control">
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={dataCollection}
                  onChange={(e) => handleDataCollectionToggle(e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* History */}
      <div className="settings-group">
        <h3 className="settings-group-title">History</h3>
        
        <div className="settings-item">
          <div className="settings-item-label">
            <div className="settings-item-title">History Retention</div>
            <div className="settings-item-description">How long to keep OCR history</div>
          </div>
          <div className="settings-item-control">
            <select
              className="select-control"
              value={historyRetention}
              onChange={(e) => handleHistoryRetentionChange(parseInt(e.target.value))}
            >
              {retentionOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="settings-item">
          <div className="settings-item-label">
            <div className="settings-item-title">Clear History</div>
            <div className="settings-item-description">Permanently delete all OCR history</div>
          </div>
          <div className="settings-item-control">
            <button className="button-control danger" onClick={handleClearHistory}>
              Clear All History
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
