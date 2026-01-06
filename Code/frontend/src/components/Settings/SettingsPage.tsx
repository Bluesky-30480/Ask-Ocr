/**
 * Settings Page - Beautiful modern design with animations
 */

import React, { useState } from 'react';
import { GeneralSettings } from './sections/GeneralSettings';
import { AISettings } from './sections/AISettings';
import { OcrSettings } from './sections/OcrSettings';
import { AdvancedModelManager } from './sections/AdvancedModelManager';
import { KeyboardSettings } from './sections/KeyboardSettings';
import { AppearanceSettings } from './sections/AppearanceSettings';
import { PopupCustomizationSettings } from './sections/PopupCustomizationSettings';
import { PrivacySettings } from './sections/PrivacySettings';
import { AdvancedSettings } from './sections/AdvancedSettings';
import { MediaHelperSettings } from './sections/MediaHelperSettings';
import { Music, MessageSquare, ArrowLeft, Sparkles, Film } from 'lucide-react';
import './SettingsPage.css';
import './sections/settings.css';

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

type MediaSection = 'audio-text' | 'media-tools' | 'ffmpeg';

type SettingsCategory = 'none' | 'music' | 'ask' | 'media';

interface SettingsSidebarItem {
  id: SettingsSection;
  icon: string;
  label: string;
  color: string;
}

interface MediaSidebarItem {
  id: MediaSection;
  icon: string;
  label: string;
  color: string;
}

const ASK_SIDEBAR_ITEMS: SettingsSidebarItem[] = [
  { id: 'general', icon: '⚙️', label: 'General', color: '#6366f1' },
  { id: 'ai', icon: '🤖', label: 'AI & Models', color: '#8b5cf6' },
  { id: 'ocr', icon: '📝', label: 'OCR Settings', color: '#ec4899' },
  { id: 'models', icon: '💾', label: 'Model Manager', color: '#14b8a6' },
  { id: 'keyboard', icon: '⌨️', label: 'Keyboard', color: '#f59e0b' },
  { id: 'appearance', icon: '🎨', label: 'Appearance', color: '#3b82f6' },
  { id: 'popups', icon: '🪟', label: 'Popup Windows', color: '#10b981' },
  { id: 'privacy', icon: '🔒', label: 'Privacy', color: '#ef4444' },
  { id: 'advanced', icon: '🔧', label: 'Advanced', color: '#6b7280' },
];

const MEDIA_SIDEBAR_ITEMS: MediaSidebarItem[] = [
  { id: 'audio-text', icon: '🎙️', label: 'Audio-Text', color: '#8b5cf6' },
  { id: 'media-tools', icon: '🎬', label: 'Media Tools', color: '#3b82f6' },
  { id: 'ffmpeg', icon: '⚡', label: 'FFmpeg Advanced', color: '#10b981' },
];

interface SettingsPageProps {
  onBack?: () => void;
  onOpenQuickChat?: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ onOpenQuickChat }) => {
  const [category, setCategory] = useState<SettingsCategory>('none');
  const [activeSection, setActiveSection] = useState<SettingsSection>('general');
  const [activeMediaSection, setActiveMediaSection] = useState<MediaSection>('audio-text');
  const [isTransitioning, setIsTransitioning] = useState(false);

  const handleCategorySelect = (cat: SettingsCategory) => {
    setIsTransitioning(true);
    setTimeout(() => {
      setCategory(cat);
      setIsTransitioning(false);
    }, 300);
  };

  const handleBack = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      setCategory('none');
      setIsTransitioning(false);
    }, 300);
  };

  const renderSection = () => {
    switch (activeSection) {
      case 'general': return <GeneralSettings />;
      case 'ai': return <AISettings onOpenQuickChat={onOpenQuickChat} />;
      case 'ocr': return <OcrSettings />;
      case 'models': return <AdvancedModelManager />;
      case 'keyboard': return <KeyboardSettings />;
      case 'appearance': return <AppearanceSettings />;
      case 'popups': return <PopupCustomizationSettings />;
      case 'privacy': return <PrivacySettings />;
      case 'advanced': return <AdvancedSettings />;
      default: return <GeneralSettings />;
    }
  };

  // Category Selection Screen
  if (category === 'none') {
    return (
      <div className={`settings-category-page ${isTransitioning ? 'fade-out' : 'fade-in'}`}>
        <div className="settings-bg-gradient"></div>
        <div className="settings-bg-orbs">
          <div className="orb orb-1"></div>
          <div className="orb orb-2"></div>
          <div className="orb orb-3"></div>
        </div>

        <div className="category-content">
          <div className="category-header">
            <div className="header-icon">
              <Sparkles size={32} />
            </div>
            <h1>Settings</h1>
            <p>Choose a category to customize your experience</p>
          </div>

          <div className="category-cards three-columns">
            <button 
              className="category-card music-card"
              onClick={() => handleCategorySelect('music')}
            >
              <div className="card-glow"></div>
              <div className="card-icon">
                <Music size={48} />
              </div>
              <div className="card-content">
                <h2>Music Player</h2>
                <p>Playback, library, and audio settings</p>
              </div>
              <div className="card-arrow">→</div>
            </button>

            <button 
              className="category-card ask-card"
              onClick={() => handleCategorySelect('ask')}
            >
              <div className="card-glow"></div>
              <div className="card-icon">
                <MessageSquare size={48} />
              </div>
              <div className="card-content">
                <h2>Ask Assistant</h2>
                <p>AI, OCR, keyboard, and appearance</p>
              </div>
              <div className="card-arrow">→</div>
            </button>

            <button 
              className="category-card media-card"
              onClick={() => handleCategorySelect('media')}
            >
              <div className="card-glow"></div>
              <div className="card-icon">
                <Film size={48} />
              </div>
              <div className="card-content">
                <h2>Media Helper</h2>
                <p>Audio transcription, media tools, FFmpeg</p>
              </div>
              <div className="card-arrow">→</div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Music Settings (placeholder)
  if (category === 'music') {
    return (
      <div className={`settings-page-container ${isTransitioning ? 'fade-out' : 'fade-in'}`}>
        <div className="settings-bg-gradient music-gradient"></div>
        <div className="settings-sidebar">
          <button className="back-button" onClick={handleBack}>
            <ArrowLeft size={20} />
            <span>Back</span>
          </button>
          <div className="sidebar-header">
            <div className="sidebar-icon music-icon">
              <Music size={24} />
            </div>
            <div>
              <h1>Music</h1>
              <p>Player Settings</p>
            </div>
          </div>
          <div className="coming-soon">
            <Sparkles size={48} />
            <p>Coming Soon</p>
          </div>
        </div>
      </div>
    );
  }

  // Media Helper Settings
  if (category === 'media') {
    return (
      <div className={`settings-page-container ${isTransitioning ? 'fade-out' : 'fade-in'}`}>
        <div className="settings-bg-gradient media-gradient"></div>
        
        <aside className="settings-sidebar">
          <button className="back-button" onClick={handleBack}>
            <ArrowLeft size={20} />
            <span>Back</span>
          </button>

          <div className="sidebar-header">
            <div className="sidebar-icon media-icon">
              <Film size={24} />
            </div>
            <div>
              <h1>Media</h1>
              <p>Helper Settings</p>
            </div>
          </div>

          <nav className="settings-nav">
            {MEDIA_SIDEBAR_ITEMS.map((item, index) => (
              <button
                key={item.id}
                className={`nav-item ${activeMediaSection === item.id ? 'active' : ''}`}
                onClick={() => setActiveMediaSection(item.id)}
                style={{ 
                  animationDelay: `${index * 0.05}s`,
                  '--item-color': item.color 
                } as React.CSSProperties}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
                {activeMediaSection === item.id && <div className="nav-indicator"></div>}
              </button>
            ))}
          </nav>

          <div className="sidebar-footer">
            <div className="version-info">
              <span>Bluesky v0.1.0</span>
            </div>
          </div>
        </aside>

        <main className="settings-main">
          <div className="settings-content-header">
            <h2>{MEDIA_SIDEBAR_ITEMS.find(i => i.id === activeMediaSection)?.icon} {MEDIA_SIDEBAR_ITEMS.find(i => i.id === activeMediaSection)?.label}</h2>
          </div>
          <div className="settings-content-scroll" key={activeMediaSection}>
            <MediaHelperSettings activeSection={activeMediaSection} />
          </div>
        </main>
      </div>
    );
  }

  // Ask Settings
  return (
    <div className={`settings-page-container ${isTransitioning ? 'fade-out' : 'fade-in'}`}>
      <div className="settings-bg-gradient ask-gradient"></div>
      
      <aside className="settings-sidebar">
        <button className="back-button" onClick={handleBack}>
          <ArrowLeft size={20} />
          <span>Back</span>
        </button>

        <div className="sidebar-header">
          <div className="sidebar-icon ask-icon">
            <MessageSquare size={24} />
          </div>
          <div>
            <h1>Ask</h1>
            <p>Assistant Settings</p>
          </div>
        </div>

        <nav className="settings-nav">
          {ASK_SIDEBAR_ITEMS.map((item, index) => (
            <button
              key={item.id}
              className={`nav-item ${activeSection === item.id ? 'active' : ''}`}
              onClick={() => setActiveSection(item.id)}
              style={{ 
                animationDelay: `${index * 0.05}s`,
                '--item-color': item.color 
              } as React.CSSProperties}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
              {activeSection === item.id && <div className="nav-indicator"></div>}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="version-info">
            <span>Bluesky v0.1.0</span>
          </div>
        </div>
      </aside>

      <main className="settings-main">
        <div className="settings-content-header">
          <h2>{ASK_SIDEBAR_ITEMS.find(i => i.id === activeSection)?.icon} {ASK_SIDEBAR_ITEMS.find(i => i.id === activeSection)?.label}</h2>
        </div>
        <div className="settings-content-scroll" key={activeSection}>
          {renderSection()}
        </div>
      </main>
    </div>
  );
};
