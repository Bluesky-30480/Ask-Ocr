/**
 * OCR Settings Section - Recoded with working buttons
 */

import React, { useState, useEffect, useCallback } from 'react';
import { tesseractOcr } from '../../../services/ocr/tesseract-ocr.service';
import './settings.css';

interface LanguagePack {
  code: string;
  name: string;
  size: string;
  installed: boolean;
  region?: string;
}

const DEFAULT_LANGUAGES: LanguagePack[] = [
  { code: 'eng', name: 'English', size: '10.6 MB', installed: true, region: '🇺🇸' },
  { code: 'chi_sim', name: 'Chinese (Simplified)', size: '16.8 MB', installed: false, region: '🇨🇳' },
  { code: 'chi_tra', name: 'Chinese (Traditional)', size: '18.2 MB', installed: false, region: '🇹🇼' },
  { code: 'spa', name: 'Spanish', size: '11.2 MB', installed: false, region: '🇪🇸' },
  { code: 'fra', name: 'French', size: '11.8 MB', installed: false, region: '🇫🇷' },
  { code: 'deu', name: 'German', size: '12.4 MB', installed: false, region: '🇩🇪' },
  { code: 'jpn', name: 'Japanese', size: '14.3 MB', installed: false, region: '🇯🇵' },
  { code: 'kor', name: 'Korean', size: '13.1 MB', installed: false, region: '🇰🇷' },
  { code: 'rus', name: 'Russian', size: '15.7 MB', installed: false, region: '🇷🇺' },
  { code: 'ara', name: 'Arabic', size: '13.9 MB', installed: false, region: '🇸🇦' },
  { code: 'hin', name: 'Hindi', size: '16.2 MB', installed: false, region: '🇮🇳' },
  { code: 'por', name: 'Portuguese', size: '10.9 MB', installed: false, region: '🇧🇷' },
  { code: 'ita', name: 'Italian', size: '11.4 MB', installed: false, region: '🇮🇹' },
  { code: 'tha', name: 'Thai', size: '17.5 MB', installed: false, region: '🇹🇭' },
  { code: 'vie', name: 'Vietnamese', size: '12.8 MB', installed: false, region: '🇻🇳' },
];

export const OcrSettings: React.FC = () => {
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(['eng']);
  const [availableLanguages, setAvailableLanguages] = useState<LanguagePack[]>(DEFAULT_LANGUAGES);
  const [isInstalling, setIsInstalling] = useState<string | null>(null);
  const [installProgress, setInstallProgress] = useState<Record<string, number>>({});
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = useCallback(() => {
    try {
      const saved = localStorage.getItem('ocr_languages');
      if (saved) {
        setSelectedLanguages(JSON.parse(saved));
      }

      const savedInstalled = localStorage.getItem('ocr_installed_languages');
      if (savedInstalled) {
        const installedCodes = JSON.parse(savedInstalled) as string[];
        setAvailableLanguages(prev => prev.map(lang => ({
          ...lang,
          installed: lang.code === 'eng' || installedCodes.includes(lang.code)
        })));
      }
    } catch (error) {
      console.error('Failed to load OCR settings:', error);
    }
  }, []);

  const handleToggleLanguage = useCallback((code: string) => {
    setSelectedLanguages(prev => {
      const newLangs = prev.includes(code)
        ? prev.filter(l => l !== code)
        : [...prev, code];
      
      localStorage.setItem('ocr_languages', JSON.stringify(newLangs));
      return newLangs;
    });
  }, []);

  const handleInstallLanguage = useCallback(async (code: string) => {
    if (isInstalling) return;
    
    setIsInstalling(code);
    setInstallProgress(prev => ({ ...prev, [code]: 0 }));

    try {
      // Simulate progress while downloading
      const progressInterval = setInterval(() => {
        setInstallProgress(prev => {
          const current = prev[code] || 0;
          if (current >= 90) return prev;
          return { ...prev, [code]: current + Math.random() * 15 };
        });
      }, 300);

      await tesseractOcr.initialize(code);
      
      clearInterval(progressInterval);
      setInstallProgress(prev => ({ ...prev, [code]: 100 }));

      // Update installed status
      setAvailableLanguages(prev => {
        const updated = prev.map(l => 
          l.code === code ? { ...l, installed: true } : l
        );
        
        const installedCodes = updated.filter(l => l.installed).map(l => l.code);
        localStorage.setItem('ocr_installed_languages', JSON.stringify(installedCodes));
        
        return updated;
      });
      
      // Auto-select installed language
      if (!selectedLanguages.includes(code)) {
        handleToggleLanguage(code);
      }
      
      // Clear progress after delay
      setTimeout(() => {
        setInstallProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[code];
          return newProgress;
        });
      }, 1000);

    } catch (error) {
      console.error('Failed to install language:', error);
      alert(`Failed to install ${code}: ${error}`);
      setInstallProgress(prev => {
        const newProgress = { ...prev };
        delete newProgress[code];
        return newProgress;
      });
    } finally {
      setIsInstalling(null);
    }
  }, [isInstalling, selectedLanguages, handleToggleLanguage]);

  const handleUninstallLanguage = useCallback((code: string) => {
    if (code === 'eng') {
      alert('English is the default language and cannot be removed.');
      return;
    }

    if (confirm(`Remove ${code} language pack? You can reinstall it later.`)) {
      setAvailableLanguages(prev => {
        const updated = prev.map(l => 
          l.code === code ? { ...l, installed: false } : l
        );
        
        const installedCodes = updated.filter(l => l.installed).map(l => l.code);
        localStorage.setItem('ocr_installed_languages', JSON.stringify(installedCodes));
        
        return updated;
      });

      // Remove from selected if currently selected
      if (selectedLanguages.includes(code)) {
        handleToggleLanguage(code);
      }
    }
  }, [selectedLanguages, handleToggleLanguage]);

  const filteredLanguages = availableLanguages.filter(lang =>
    lang.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lang.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const installedLanguages = filteredLanguages.filter(l => l.installed);
  const availableToInstall = filteredLanguages.filter(l => !l.installed);

  return (
    <div className="settings-section">
      <div className="settings-section-header">
        <h2 className="settings-section-title">OCR Settings</h2>
        <p className="settings-section-description">
          Configure OCR language packs and recognition settings
        </p>
      </div>

      {/* Active Languages Summary */}
      <div className="settings-group">
        <h3 className="settings-group-title">📋 Active Languages</h3>
        
        <div className="active-languages-card">
          <div className="active-languages-list">
            {selectedLanguages.map(code => {
              const lang = availableLanguages.find(l => l.code === code);
              return lang ? (
                <span key={code} className="active-lang-tag">
                  {lang.region} {lang.name}
                </span>
              ) : null;
            })}
          </div>
          {selectedLanguages.length === 0 && (
            <p className="no-languages">No languages selected. Select at least one below.</p>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="settings-group">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="search-input"
            placeholder="Search languages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button 
              type="button" 
              className="clear-search"
              onClick={() => setSearchQuery('')}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Installed Languages */}
      <div className="settings-group">
        <h3 className="settings-group-title">✅ Installed ({installedLanguages.length})</h3>
        
        <div className="language-cards">
          {installedLanguages.map(lang => (
            <div 
              key={lang.code} 
              className={`language-card ${selectedLanguages.includes(lang.code) ? 'selected' : ''}`}
            >
              <div className="lang-card-header">
                <span className="lang-region">{lang.region}</span>
                <span className="lang-name">{lang.name}</span>
                {lang.code === 'eng' && <span className="default-badge">Default</span>}
              </div>
              
              <div className="lang-card-meta">
                <span className="lang-code">{lang.code}</span>
                <span className="lang-size">{lang.size}</span>
              </div>
              
              <div className="lang-card-actions">
                <button
                  type="button"
                  className={`lang-toggle-btn ${selectedLanguages.includes(lang.code) ? 'active' : ''}`}
                  onClick={() => handleToggleLanguage(lang.code)}
                >
                  {selectedLanguages.includes(lang.code) ? '✓ Active' : 'Enable'}
                </button>
                
                {lang.code !== 'eng' && (
                  <button
                    type="button"
                    className="lang-remove-btn"
                    onClick={() => handleUninstallLanguage(lang.code)}
                    title="Remove language pack"
                  >
                    🗑️
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Available to Install */}
      {availableToInstall.length > 0 && (
        <div className="settings-group">
          <h3 className="settings-group-title">📥 Available to Install ({availableToInstall.length})</h3>
          
          <div className="language-cards">
            {availableToInstall.map(lang => (
              <div key={lang.code} className="language-card">
                <div className="lang-card-header">
                  <span className="lang-region">{lang.region}</span>
                  <span className="lang-name">{lang.name}</span>
                </div>
                
                <div className="lang-card-meta">
                  <span className="lang-code">{lang.code}</span>
                  <span className="lang-size">{lang.size}</span>
                </div>
                
                <div className="lang-card-actions">
                  {installProgress[lang.code] !== undefined ? (
                    <div className="install-progress">
                      <div 
                        className="progress-fill" 
                        style={{ width: `${Math.min(installProgress[lang.code], 100)}%` }}
                      />
                      <span className="progress-text">
                        {Math.round(installProgress[lang.code])}%
                      </span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="lang-install-btn"
                      onClick={() => handleInstallLanguage(lang.code)}
                      disabled={isInstalling !== null}
                    >
                      📥 Install
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="settings-group">
        <div className="info-card">
          <span className="info-icon">💡</span>
          <div className="info-content">
            <strong>Tip:</strong> Tesseract.js downloads language packs on first use. 
            Pre-installing packs allows offline OCR for those languages.
          </div>
        </div>
      </div>

      <style>{`
        .active-languages-card {
          background: var(--color-surface-primary);
          border: 1px solid var(--color-border-primary);
          border-radius: 12px;
          padding: 16px;
        }
        
        .active-languages-list {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        
        .active-lang-tag {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          background: rgba(var(--color-primary-rgb), 0.15);
          border: 1px solid var(--color-primary);
          border-radius: 20px;
          font-size: 13px;
          font-weight: 500;
          color: var(--color-primary);
        }
        
        .no-languages {
          color: var(--color-text-secondary);
          font-size: 14px;
          margin: 0;
        }
        
        .search-box {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          background: var(--color-surface-primary);
          border: 1px solid var(--color-border-primary);
          border-radius: 10px;
          transition: border-color 0.2s;
        }
        
        .search-box:focus-within {
          border-color: var(--color-primary);
        }
        
        .search-icon {
          font-size: 14px;
        }
        
        .search-input {
          flex: 1;
          border: none;
          background: transparent;
          font-size: 14px;
          color: var(--color-text-primary);
          outline: none;
        }
        
        .clear-search {
          background: transparent;
          border: none;
          color: var(--color-text-secondary);
          cursor: pointer;
          padding: 4px;
          font-size: 12px;
        }
        
        .language-cards {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 12px;
        }
        
        .language-card {
          background: var(--color-surface-primary);
          border: 2px solid var(--color-border-primary);
          border-radius: 12px;
          padding: 14px;
          transition: all 0.2s ease;
        }
        
        .language-card:hover {
          border-color: var(--color-primary);
        }
        
        .language-card.selected {
          border-color: var(--color-primary);
          background: rgba(var(--color-primary-rgb), 0.05);
        }
        
        .lang-card-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }
        
        .lang-region {
          font-size: 18px;
        }
        
        .lang-name {
          font-size: 14px;
          font-weight: 600;
          color: var(--color-text-primary);
          flex: 1;
        }
        
        .default-badge {
          font-size: 10px;
          padding: 2px 6px;
          background: rgba(var(--color-primary-rgb), 0.2);
          color: var(--color-primary);
          border-radius: 4px;
          font-weight: 600;
        }
        
        .lang-card-meta {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          color: var(--color-text-secondary);
          margin-bottom: 12px;
        }
        
        .lang-card-actions {
          display: flex;
          gap: 8px;
        }
        
        .lang-toggle-btn {
          flex: 1;
          padding: 8px 12px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          background: var(--color-surface-secondary);
          border: 1px solid var(--color-border-primary);
          color: var(--color-text-primary);
        }
        
        .lang-toggle-btn:hover {
          border-color: var(--color-primary);
        }
        
        .lang-toggle-btn.active {
          background: var(--color-primary);
          border-color: var(--color-primary);
          color: white;
        }
        
        .lang-install-btn {
          flex: 1;
          padding: 8px 12px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          background: var(--color-primary);
          border: none;
          color: white;
        }
        
        .lang-install-btn:hover {
          opacity: 0.9;
        }
        
        .lang-install-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .lang-remove-btn {
          padding: 8px;
          border-radius: 8px;
          background: transparent;
          border: 1px solid var(--color-border-primary);
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .lang-remove-btn:hover {
          background: rgba(255, 59, 48, 0.1);
          border-color: #ff3b30;
        }
        
        .install-progress {
          flex: 1;
          height: 32px;
          background: var(--color-surface-secondary);
          border-radius: 8px;
          overflow: hidden;
          position: relative;
        }
        
        .install-progress .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--color-primary), #00c3ff);
          transition: width 0.3s ease;
        }
        
        .install-progress .progress-text {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-size: 12px;
          font-weight: 600;
          color: var(--color-text-primary);
        }
        
        .info-card {
          display: flex;
          gap: 12px;
          padding: 14px 16px;
          background: rgba(var(--color-primary-rgb), 0.1);
          border: 1px solid var(--color-primary);
          border-radius: 12px;
        }
        
        .info-icon {
          font-size: 18px;
        }
        
        .info-content {
          font-size: 13px;
          color: var(--color-text-primary);
          line-height: 1.5;
        }
      `}</style>
    </div>
  );
};
