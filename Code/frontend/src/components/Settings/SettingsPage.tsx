/**
 * Settings Page - Apple-styled settings interface
 * Clean, spacious design with segmented sections
 */

import React, { useState } from 'react';
import { GeneralSettings } from './sections/GeneralSettings';
import { AISettings } from './sections/AISettings';
import { OcrSettings } from './sections/OcrSettings';
import { OllamaModelManager } from './sections/OllamaModelManager';
import { KeyboardSettings } from './sections/KeyboardSettings';
import { AppearanceSettings } from './sections/AppearanceSettings';
import { PopupCustomizationSettings } from './sections/PopupCustomizationSettings';
import { PrivacySettings } from './sections/PrivacySettings';
import { AdvancedSettings } from './sections/AdvancedSettings';
import './SettingsPage.css';

type SettingsSection = 
  | 'general'
  | 'ai'
  | 'ocr'
  | 'models'
  | 'keyboard'
  | 'appearance'
  | 'popups'
  | 'privacy'
  | 'advanced';

interface SettingsSidebarItem {
  id: SettingsSection;
  icon: string;
  label: string;
}

const SIDEBAR_ITEMS: SettingsSidebarItem[] = [
  { id: 'general', icon: '⚙️', label: 'General' },
  { id: 'ai', icon: '🤖', label: 'AI & Models' },
  { id: 'ocr', icon: '📝', label: 'OCR Settings' },
  { id: 'models', icon: '💾', label: 'Model Manager' },
  { id: 'keyboard', icon: '⌨️', label: 'Keyboard' },
  { id: 'appearance', icon: '🎨', label: 'Appearance' },
  { id: 'popups', icon: '🪟', label: 'Popup Windows' },
  { id: 'privacy', icon: '🔒', label: 'Privacy' },
  { id: 'advanced', icon: '🔧', label: 'Advanced' },
];

export const SettingsPage: React.FC = () => {
  const [activeSection, setActiveSection] = useState<SettingsSection>('general');

  const renderSection = () => {
    switch (activeSection) {
      case 'general':
        return <GeneralSettings />;
      case 'ai':
        return <AISettings />;
      case 'ocr':
        return <OcrSettings />;
      case 'models':
        return <OllamaModelManager />;
      case 'keyboard':
        return <KeyboardSettings />;
      case 'appearance':
        return <AppearanceSettings />;
      case 'popups':
        return <PopupCustomizationSettings />;
      case 'privacy':
        return <PrivacySettings />;
      case 'advanced':
        return <AdvancedSettings />;
      default:
        return <GeneralSettings />;
    }
  };

  return (
    <div className="settings-page">
      {/* Sidebar */}
      <div className="settings-sidebar">
        <div className="settings-sidebar-header">
          <h1>Settings</h1>
        </div>
        
        <nav className="settings-nav">
          {SIDEBAR_ITEMS.map((item) => (
            <button
              key={item.id}
              className={`settings-nav-item ${activeSection === item.id ? 'active' : ''}`}
              onClick={() => setActiveSection(item.id)}
            >
              <span className="settings-nav-icon">{item.icon}</span>
              <span className="settings-nav-label">{item.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="settings-content">
        {renderSection()}
      </div>
    </div>
  );
};
