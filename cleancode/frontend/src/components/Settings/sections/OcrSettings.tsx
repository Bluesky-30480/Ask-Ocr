/**
 * OCR Settings Section
 * Configure OCR languages and models
 */

import React, { useState, useEffect } from 'react';
import { tesseractOcr } from '../../../services/ocr/tesseract-ocr.service';
import './settings.css';

interface LanguagePack {
  code: string;
  name: string;
  size: string;
  installed: boolean;
}

export const OcrSettings: React.FC = () => {
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(['eng']);
  const [isInstalling, setIsInstalling] = useState(false);
  const [installProgress, setInstallProgress] = useState<Record<string, number>>({});

  const DEFAULT_LANGUAGES: LanguagePack[] = [
    { code: 'eng', name: 'English', size: '10.6 MB', installed: true },
    { code: 'chi_sim', name: 'Chinese (Simplified)', size: '16.8 MB', installed: false },
    { code: 'chi_tra', name: 'Chinese (Traditional)', size: '18.2 MB', installed: false },
    { code: 'spa', name: 'Spanish', size: '11.2 MB', installed: false },
    { code: 'fra', name: 'French', size: '11.8 MB', installed: false },
    { code: 'deu', name: 'German', size: '12.4 MB', installed: false },
    { code: 'jpn', name: 'Japanese', size: '14.3 MB', installed: false },
    { code: 'kor', name: 'Korean', size: '13.1 MB', installed: false },
    { code: 'rus', name: 'Russian', size: '15.7 MB', installed: false },
    { code: 'ara', name: 'Arabic', size: '13.9 MB', installed: false },
    { code: 'hin', name: 'Hindi', size: '16.2 MB', installed: false },
    { code: 'por', name: 'Portuguese', size: '10.9 MB', installed: false },
    { code: 'ita', name: 'Italian', size: '11.4 MB', installed: false },
    { code: 'tha', name: 'Thai', size: '17.5 MB', installed: false },
    { code: 'vie', name: 'Vietnamese', size: '12.8 MB', installed: false },
  ];

  const [availableLanguages, setAvailableLanguages] = useState<LanguagePack[]>(DEFAULT_LANGUAGES);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = () => {
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
  };

  const handleToggleLanguage = (code: string) => {
    setSelectedLanguages(prev => {
      const newLangs = prev.includes(code)
        ? prev.filter(l => l !== code)
        : [...prev, code];
      
      // Save to localStorage
      localStorage.setItem('ocr_languages', JSON.stringify(newLangs));
      
      return newLangs;
    });
  };

  const handleInstallLanguage = async (code: string) => {
    setIsInstalling(true);
    setInstallProgress(prev => ({ ...prev, [code]: 0 }));

    try {
      // Initialize Tesseract with the language to trigger download/caching
      // Tesseract.js handles the downloading of .traineddata files
      setInstallProgress(prev => ({ ...prev, [code]: 10 }));
      
      // We can't easily get granular progress from tesseract.js createWorker
      // so we'll simulate progress while it initializes
      const progressInterval = setInterval(() => {
        setInstallProgress(prev => {
          const current = prev[code] || 10;
          if (current >= 90) return prev;
          return { ...prev, [code]: current + 5 };
        });
      }, 500);

      await tesseractOcr.initialize(code);
      
      clearInterval(progressInterval);
      setInstallProgress(prev => ({ ...prev, [code]: 100 }));

      // Mark as installed in our local state
      const updatedLangs = availableLanguages.map(l => 
        l.code === code ? { ...l, installed: true } : l
      );
      setAvailableLanguages(updatedLangs);
      
      // Persist installed status
      const installedCodes = updatedLangs.filter(l => l.installed).map(l => l.code);
      localStorage.setItem('ocr_installed_languages', JSON.stringify(installedCodes));
      
      // Auto-select the newly installed language
      if (!selectedLanguages.includes(code)) {
        handleToggleLanguage(code);
      }
      
      alert(`Language pack "${code}" installed successfully!`);
    } catch (error) {
      console.error('Failed to install language:', error);
      alert(`Failed to install language pack: ${error}`);
    } finally {
      setIsInstalling(false);
      setInstallProgress(prev => {
        const newProgress = { ...prev };
        delete newProgress[code];
        return newProgress;
      });
    }
  };

  const handleTestOcr = async () => {
    try {
      const languages = selectedLanguages.join('+');
      alert(`OCR test with languages: ${languages}\n\nNote: Perform an actual OCR capture to test the selected languages.`);
    } catch (error) {
      console.error('OCR test failed:', error);
      alert(`OCR test failed: ${error}`);
    }
  };

  return (
    <div className="settings-section">
      <h2>OCR Settings</h2>
      <p className="section-description">
        Configure OCR language packs and recognition settings
      </p>

      {/* Selected Languages */}
      <div className="setting-group">
        <label>Active Languages</label>
        <div className="info-box">
          <p>
            Selected: {selectedLanguages.map(code => 
              availableLanguages.find(l => l.code === code)?.name || code
            ).join(', ')}
          </p>
        </div>
      </div>

      {/* Language List */}
      <div className="setting-group">
        <label>Available Language Packs</label>
        <div className="language-list">
          {availableLanguages.map(lang => (
            <div key={lang.code} className="language-item">
              <div className="language-info">
                <input
                  type="checkbox"
                  id={`lang-${lang.code}`}
                  checked={selectedLanguages.includes(lang.code)}
                  onChange={() => handleToggleLanguage(lang.code)}
                  disabled={!lang.installed}
                />
                <label htmlFor={`lang-${lang.code}`}>
                  <strong>{lang.name}</strong> ({lang.code})
                  {lang.code === 'eng' && <span className="badge default">Default</span>}
                </label>
              </div>
              <div className="language-actions">
                <span className="size-badge">{lang.size}</span>
                {lang.installed ? (
                  <span className="status-badge installed">Installed</span>
                ) : (
                  <>
                    {installProgress[lang.code] !== undefined ? (
                      <div className="progress-bar">
                        <div 
                          className="progress-fill" 
                          style={{ width: `${installProgress[lang.code]}%` }}
                        />
                        <span className="progress-text">{installProgress[lang.code]}%</span>
                      </div>
                    ) : (
                      <button
                        className="btn-small"
                        onClick={() => handleInstallLanguage(lang.code)}
                        disabled={isInstalling}
                      >
                        Install
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Test Button */}
      <div className="setting-group">
        <button 
          className="btn-primary" 
          onClick={handleTestOcr}
          disabled={selectedLanguages.length === 0}
        >
          Test OCR Configuration
        </button>
      </div>

      <div className="info-box">
        <p>
          <strong>Note:</strong> Tesseract.js automatically downloads language packs on first use.
          The "Install" buttons above are for pre-downloading packs.
        </p>
      </div>
    </div>
  );
};
