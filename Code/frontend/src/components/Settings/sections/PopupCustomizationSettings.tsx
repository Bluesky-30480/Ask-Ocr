/**
 * Popup Customization Settings Section
 * Per-window and per-app popup configuration
 */

import React, { useState, useEffect } from 'react';

interface PopupFeature {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
}

interface PopupProfile {
  id: string;
  name: string;
  windowType: 'ocr' | 'word' | 'file_explorer' | 'universal';
  features: PopupFeature[];
}

interface AppSpecificConfig {
  appName: string;
  appExecutable: string;
  profileId: string;
}

const DEFAULT_FEATURES: Record<string, PopupFeature[]> = {
  ocr: [
    { id: 'summary', label: 'Summary Button', description: 'One-click AI summarization', enabled: true },
    { id: 'research', label: 'Research Tab', description: 'Perplexity web search', enabled: true },
    { id: 'ask', label: 'Ask Tab', description: 'Q&A interface', enabled: true },
    { id: 'actions', label: 'Actions Tab', description: 'Copy, export, translate', enabled: true },
    { id: 'copy', label: 'Quick Copy', description: 'Copy button in header', enabled: true },
    { id: 'save', label: 'Quick Save', description: 'Save to history', enabled: true },
    { id: 'math', label: 'Math Formula', description: 'LaTeX formula preview', enabled: true },
  ],
  word: [
    { id: 'definition', label: 'Definition', description: 'Dictionary definition', enabled: true },
    { id: 'translate', label: 'Translation', description: 'Multiple language translation', enabled: true },
    { id: 'pronunciation', label: 'Pronunciation', description: 'Audio pronunciation', enabled: true },
    { id: 'examples', label: 'Example Sentences', description: 'Usage examples', enabled: true },
    { id: 'synonyms', label: 'Synonyms/Antonyms', description: 'Related words', enabled: true },
  ],
  file_explorer: [
    { id: 'preview', label: 'File Preview', description: 'Quick file preview', enabled: true },
    { id: 'metadata', label: 'File Metadata', description: 'Size, date, type info', enabled: true },
    { id: 'actions', label: 'Quick Actions', description: 'Open, copy path, share', enabled: true },
    { id: 'ai_summary', label: 'AI Summary', description: 'File content summary', enabled: false },
  ],
  universal: [
    { id: 'context', label: 'Context Detection', description: 'Show detected app context', enabled: true },
    { id: 'suggestions', label: 'AI Suggestions', description: 'Smart action suggestions', enabled: true },
    { id: 'history', label: 'Recent History', description: 'Show recent items', enabled: true },
    { id: 'quick_chat', label: 'Quick Chat', description: 'Mini chat interface', enabled: true },
  ],
};

export const PopupCustomizationSettings: React.FC = () => {
  const [selectedWindowType, setSelectedWindowType] = useState<'ocr' | 'word' | 'file_explorer' | 'universal'>('ocr');
  const [profiles, setProfiles] = useState<PopupProfile[]>([]);
  const [appSpecificConfigs, setAppSpecificConfigs] = useState<AppSpecificConfig[]>([]);
  const [newAppName, setNewAppName] = useState('');
  const [newAppExe, setNewAppExe] = useState('');

  useEffect(() => {
    // Load saved profiles
    const savedProfiles = localStorage.getItem('popup_profiles');
    if (savedProfiles) {
      try {
        setProfiles(JSON.parse(savedProfiles));
      } catch (error) {
        console.error('Failed to load popup profiles:', error);
        initializeDefaultProfiles();
      }
    } else {
      initializeDefaultProfiles();
    }

    // Load app-specific configs
    const savedAppConfigs = localStorage.getItem('popup_app_configs');
    if (savedAppConfigs) {
      try {
        setAppSpecificConfigs(JSON.parse(savedAppConfigs));
      } catch (error) {
        console.error('Failed to load app configs:', error);
      }
    }
  }, []);

  const initializeDefaultProfiles = () => {
    const defaultProfiles: PopupProfile[] = Object.entries(DEFAULT_FEATURES).map(([type, features]) => ({
      id: `default_${type}`,
      name: `Default ${type.replace('_', ' ').toUpperCase()}`,
      windowType: type as any,
      features: features,
    }));
    setProfiles(defaultProfiles);
    localStorage.setItem('popup_profiles', JSON.stringify(defaultProfiles));
  };

  const getCurrentProfile = (): PopupProfile | undefined => {
    return profiles.find(p => p.windowType === selectedWindowType && p.id.startsWith('default'));
  };

  const handleFeatureToggle = (featureId: string, enabled: boolean) => {
    const profile = getCurrentProfile();
    if (!profile) return;

    const updatedProfiles = profiles.map(p => {
      if (p.id === profile.id) {
        return {
          ...p,
          features: p.features.map(f =>
            f.id === featureId ? { ...f, enabled } : f
          ),
        };
      }
      return p;
    });

    setProfiles(updatedProfiles);
    localStorage.setItem('popup_profiles', JSON.stringify(updatedProfiles));
  };

  const handleCreateProfile = () => {
    const profileName = prompt('Enter profile name:');
    if (!profileName) return;

    const currentProfile = getCurrentProfile();
    if (!currentProfile) return;

    const newProfile: PopupProfile = {
      id: `custom_${Date.now()}`,
      name: profileName,
      windowType: selectedWindowType,
      features: JSON.parse(JSON.stringify(currentProfile.features)),
    };

    const updatedProfiles = [...profiles, newProfile];
    setProfiles(updatedProfiles);
    localStorage.setItem('popup_profiles', JSON.stringify(updatedProfiles));
  };

  const handleDeleteProfile = (profileId: string) => {
    if (profileId.startsWith('default')) {
      alert('Cannot delete default profile');
      return;
    }

    if (confirm('Delete this profile?')) {
      const updatedProfiles = profiles.filter(p => p.id !== profileId);
      setProfiles(updatedProfiles);
      localStorage.setItem('popup_profiles', JSON.stringify(updatedProfiles));
    }
  };

  const handleAddAppConfig = () => {
    if (!newAppName.trim() || !newAppExe.trim()) return;

    const currentProfile = getCurrentProfile();
    if (!currentProfile) return;

    const newConfig: AppSpecificConfig = {
      appName: newAppName.trim(),
      appExecutable: newAppExe.trim(),
      profileId: currentProfile.id,
    };

    const updatedConfigs = [...appSpecificConfigs, newConfig];
    setAppSpecificConfigs(updatedConfigs);
    localStorage.setItem('popup_app_configs', JSON.stringify(updatedConfigs));

    setNewAppName('');
    setNewAppExe('');
  };

  const handleRemoveAppConfig = (appExe: string) => {
    const updatedConfigs = appSpecificConfigs.filter(c => c.appExecutable !== appExe);
    setAppSpecificConfigs(updatedConfigs);
    localStorage.setItem('popup_app_configs', JSON.stringify(updatedConfigs));
  };

  const currentProfile = getCurrentProfile();
  const customProfiles = profiles.filter(p => p.windowType === selectedWindowType && !p.id.startsWith('default'));
  const currentAppConfigs = appSpecificConfigs.filter(c => {
    const profile = profiles.find(p => p.id === c.profileId);
    return profile?.windowType === selectedWindowType;
  });

  return (
    <div className="settings-section">
      <div className="settings-section-header">
        <h2 className="settings-section-title">Popup Customization</h2>
        <p className="settings-section-description">
          Customize what appears in each popup window and configure per-app settings
        </p>
      </div>

      {/* Window Type Selector */}
      <div className="settings-group">
        <h3 className="settings-group-title">Window Type</h3>
        <p className="settings-group-description">
          Select which popup window type to customize
        </p>

        <div className="window-type-selector" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
          {[
            { value: 'ocr', label: 'OCR Result', icon: '📄' },
            { value: 'word', label: 'Word Popup', icon: '📖' },
            { value: 'file_explorer', label: 'File Explorer', icon: '📁' },
            { value: 'universal', label: 'Universal AI', icon: '🤖' },
          ].map((type) => (
            <button
              key={type.value}
              className={`window-type-button ${selectedWindowType === type.value ? 'active' : ''}`}
              onClick={() => setSelectedWindowType(type.value as any)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '16px',
                gap: '8px',
                background: selectedWindowType === type.value ? 'var(--color-accent-primary)' : 'var(--color-surface-primary)',
                color: selectedWindowType === type.value ? 'white' : 'var(--color-text-primary)',
                border: '1px solid var(--color-border-primary)',
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: selectedWindowType === type.value ? '0 4px 12px rgba(var(--color-accent-primary-rgb), 0.3)' : 'none',
              }}
            >
              <span className="window-type-icon" style={{ fontSize: '24px' }}>{type.icon}</span>
              <span style={{ fontWeight: 600, fontSize: '14px' }}>{type.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Features Configuration */}
      {currentProfile && (
        <div className="settings-group">
          <h3 className="settings-group-title">Features</h3>
          <p className="settings-group-description">
            Toggle features for {currentProfile.name}
          </p>

          {currentProfile.features.map((feature) => (
            <div key={feature.id} className="settings-item">
              <div className="settings-item-label">
                <div className="settings-item-title">{feature.label}</div>
                <div className="settings-item-description">{feature.description}</div>
              </div>
              <div className="settings-item-control">
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={feature.enabled}
                    onChange={(e) => handleFeatureToggle(feature.id, e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Custom Profiles */}
      <div className="settings-group">
        <h3 className="settings-group-title">Custom Profiles</h3>
        <p className="settings-group-description">
          Create custom popup layouts for different scenarios
        </p>

        {customProfiles.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            {customProfiles.map((profile) => (
              <div key={profile.id} className="profile-item">
                <div>
                  <div style={{ fontWeight: 500 }}>{profile.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {profile.features.filter(f => f.enabled).length} features enabled
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    className="button-control danger"
                    onClick={() => handleDeleteProfile(profile.id)}
                    style={{ padding: '4px 12px', fontSize: '13px' }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <button className="button-control" onClick={handleCreateProfile}>
          + Create Custom Profile
        </button>
      </div>

      {/* Per-App Configuration */}
      <div className="settings-group">
        <h3 className="settings-group-title">Per-App Configuration</h3>
        <p className="settings-group-description">
          Set custom popup layouts for specific applications
        </p>

        {currentAppConfigs.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            {currentAppConfigs.map((config) => {
              const profile = profiles.find(p => p.id === config.profileId);
              return (
                <div key={config.appExecutable} className="app-config-item">
                  <div>
                    <div style={{ fontWeight: 500 }}>{config.appName}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                      {config.appExecutable}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--accent-bg)', marginTop: '4px' }}>
                      Profile: {profile?.name || 'Unknown'}
                    </div>
                  </div>
                  <button
                    className="button-control danger"
                    onClick={() => handleRemoveAppConfig(config.appExecutable)}
                    style={{ padding: '4px 12px', fontSize: '13px' }}
                  >
                    Remove
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <div className="app-config-add">
          <input
            type="text"
            className="input-control"
            placeholder="App name (e.g., Visual Studio Code)"
            value={newAppName}
            onChange={(e) => setNewAppName(e.target.value)}
            style={{ flex: 1 }}
          />
          <input
            type="text"
            className="input-control"
            placeholder="Executable (e.g., code.exe)"
            value={newAppExe}
            onChange={(e) => setNewAppExe(e.target.value)}
            style={{ flex: 1 }}
          />
          <button
            className="button-control"
            onClick={handleAddAppConfig}
            disabled={!newAppName.trim() || !newAppExe.trim()}
          >
            + Add
          </button>
        </div>
      </div>
    </div>
  );
};
