/**
 * AI Configuration Component
 * Quick settings for AI provider API keys and preferences
 */

import React, { useState, useEffect } from 'react';
import { universalAI } from '../../services/ai/universal-ai.service';
import './AIConfig.css';
import './AIConfigGrid.css';

interface AIConfigProps {
  onClose: () => void;
}

type Provider = 'openai' | 'anthropic' | 'gemini' | 'deepseek' | 'grok' | 'perplexity' | 'local';

export const AIConfig: React.FC<AIConfigProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'general' | 'providers'>('general');
  const [selectedProvider, setSelectedProvider] = useState<Provider>('openai');
  
  // API Keys
  const [keys, setKeys] = useState({
    openai: '',
    anthropic: '',
    gemini: '',
    deepseek: '',
    grok: '',
    perplexity: ''
  });

  // Settings
  const [screenshotMethod, setScreenshotMethod] = useState<'builtin' | 'native'>('builtin');
  const [ocrEngine, setOcrEngine] = useState<'tesseract' | 'online'>('tesseract');
  const [defaultProvider, setDefaultProvider] = useState<Provider>('openai');

  // Status
  const [status, setStatus] = useState<Record<string, boolean>>({});
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    // Load saved keys
    const loadKeys = () => {
      const newKeys = { ...keys };
      (Object.keys(newKeys) as Array<keyof typeof keys>).forEach(key => {
        const saved = localStorage.getItem(`${key}_api_key`);
        if (saved) newKeys[key] = saved;
      });
      setKeys(newKeys);
    };

    loadKeys();

    // Load settings
    const savedMethod = localStorage.getItem('screenshot_method');
    if (savedMethod) setScreenshotMethod(savedMethod as any);

    const savedEngine = localStorage.getItem('ocr_engine');
    if (savedEngine) setOcrEngine(savedEngine as any);

    const savedProvider = localStorage.getItem('default_provider');
    if (savedProvider) setDefaultProvider(savedProvider as any);

    // Check status
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      const providerStatus = await universalAI.getProviderStatus();
      setStatus(providerStatus);
    } catch (error) {
      console.error('Failed to check status:', error);
    }
  };

  const handleSave = async () => {
    try {
      // Save keys
      Object.entries(keys).forEach(([provider, key]) => {
        if (key) {
          localStorage.setItem(`${provider}_api_key`, key);
        } else {
          localStorage.removeItem(`${provider}_api_key`);
        }
      });

      // Save settings
      localStorage.setItem('screenshot_method', screenshotMethod);
      localStorage.setItem('ocr_engine', ocrEngine);
      localStorage.setItem('default_provider', defaultProvider);

      // Re-initialize AI service
      await universalAI.initialize({ 
        openaiApiKey: keys.openai,
        geminiApiKey: keys.gemini,
        claudeApiKey: keys.anthropic,
        deepseekApiKey: keys.deepseek,
        grokApiKey: keys.grok,
        perplexityApiKey: keys.perplexity
      });

      await checkStatus();
      
      // Show success feedback (could be a toast, but for now alert is fine or just close)
      onClose();
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Failed to save settings');
    }
  };

  const handleTest = async () => {
    setIsTesting(true);
    try {
      const results = await universalAI.testConnections();
      setStatus(results);
    } catch (error) {
      console.error('Connection test failed:', error);
    } finally {
      setIsTesting(false);
    }
  };

  const renderGeneralSettings = () => {
    const providers: { id: Provider; name: string; desc: string; icon: string }[] = [
      { id: 'openai', name: 'OpenAI', desc: 'GPT-4o / GPT-3.5', icon: '🤖' },
      { id: 'anthropic', name: 'Anthropic', desc: 'Claude 3.5 Sonnet', icon: '🧠' },
      { id: 'gemini', name: 'Google', desc: 'Gemini 1.5 Pro', icon: '✨' },
      { id: 'deepseek', name: 'DeepSeek', desc: 'DeepSeek V3', icon: '🐋' },
      { id: 'grok', name: 'xAI', desc: 'Grok Beta', icon: '🌌' },
      { id: 'perplexity', name: 'Perplexity', desc: 'Online Search', icon: '🔍' },
      { id: 'local', name: 'Local', desc: 'Ollama (Offline)', icon: '🏠' },
    ];

    return (
    <div className="settings-group">
      <div className="setting-item full-width">
        <div className="setting-label">
          <label>Default AI Provider</label>
          <span className="setting-desc">Choose which AI answers your questions by default</span>
        </div>
        
        <div className="provider-grid">
          {providers.map((provider) => (
            <div 
              key={provider.id}
              className={`provider-card ${defaultProvider === provider.id ? 'selected' : ''}`}
              onClick={() => setDefaultProvider(provider.id)}
            >
              <div className="provider-icon">{provider.icon}</div>
              <div className="provider-info">
                <div className="provider-name">{provider.name}</div>
                <div className="provider-desc">{provider.desc}</div>
              </div>
              {defaultProvider === provider.id && <div className="selected-check">✓</div>}
            </div>
          ))}
        </div>
      </div>

      <div className="setting-item">
        <div className="setting-label">
          <label>Screenshot Method</label>
          <span className="setting-desc">How screenshots are captured</span>
        </div>
        <select 
          value={screenshotMethod} 
          onChange={(e) => setScreenshotMethod(e.target.value as any)}
          className="apple-select"
        >
          <option value="builtin">Built-in Overlay (Fast)</option>
          <option value="native">Windows Snipping Tool</option>
        </select>
      </div>

      <div className="setting-item">
        <div className="setting-label">
          <label>OCR Engine</label>
          <span className="setting-desc">Text recognition technology</span>
        </div>
        <select 
          value={ocrEngine} 
          onChange={(e) => setOcrEngine(e.target.value as any)}
          className="apple-select"
        >
          <option value="tesseract">Tesseract (Local / Offline)</option>
          <option value="online">Online AI (Higher Accuracy)</option>
        </select>
      </div>
    </div>
  );
  };

  const renderProviderSettings = () => (
    <div className="providers-container">
      <div className="provider-list">
        {(['openai', 'anthropic', 'gemini', 'deepseek', 'grok', 'perplexity', 'local'] as Provider[]).map(p => (
          <button
            key={p}
            className={`provider-tab ${selectedProvider === p ? 'active' : ''}`}
            onClick={() => setSelectedProvider(p)}
          >
            <span className={`status-dot ${status[p === 'local' ? 'local' : p] ? 'online' : 'offline'}`} />
            {p.charAt(0).toUpperCase() + p.slice(1)}
          </button>
        ))}
      </div>
      
      <div className="provider-details">
        <h3>{selectedProvider.charAt(0).toUpperCase() + selectedProvider.slice(1)} Configuration</h3>
        
        {selectedProvider === 'local' ? (
          <div className="info-box">
            <p>Ollama runs locally on your machine. No API key required.</p>
            <div className={`status-badge ${status.local ? 'success' : 'error'}`}>
              {status.local ? 'Running' : 'Not Detected'}
            </div>
            {!status.local && (
              <a href="https://ollama.com" target="_blank" rel="noreferrer" className="download-link">
                Download Ollama ↗
              </a>
            )}
          </div>
        ) : (
          <div className="api-key-section">
            <label>API Key</label>
            <input
              type="password"
              value={keys[selectedProvider as keyof typeof keys] || ''}
              onChange={(e) => setKeys({...keys, [selectedProvider]: e.target.value})}
              placeholder={`sk-...`}
              className="apple-input"
            />
            <p className="help-text">
              Enter your {selectedProvider} API key to enable this provider.
            </p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="ai-config-overlay" onClick={onClose}>
      <div className="ai-config-window" onClick={(e) => e.stopPropagation()}>
        <div className="window-sidebar">
          <div className="sidebar-header">
            <h2>Settings</h2>
          </div>
          <nav className="sidebar-nav">
            <button 
              className={activeTab === 'general' ? 'active' : ''} 
              onClick={() => setActiveTab('general')}
            >
              ⚙️ General
            </button>
            <button 
              className={activeTab === 'providers' ? 'active' : ''} 
              onClick={() => setActiveTab('providers')}
            >
              🔌 Providers
            </button>
          </nav>
          <div className="sidebar-footer">
            <button className="test-connection-btn" onClick={handleTest} disabled={isTesting}>
              {isTesting ? 'Testing...' : 'Test Connections'}
            </button>
          </div>
        </div>

        <div className="window-content">
          <div className="content-header">
            <h2>{activeTab === 'general' ? 'General Settings' : 'AI Providers'}</h2>
            <button className="close-btn" onClick={onClose}>✕</button>
          </div>
          
          <div className="content-body">
            {activeTab === 'general' ? renderGeneralSettings() : renderProviderSettings()}
          </div>

          <div className="content-footer">
            <button className="cancel-btn" onClick={onClose}>Cancel</button>
            <button className="save-btn" onClick={handleSave}>Save Changes</button>
          </div>
        </div>
      </div>
    </div>
  );
};
