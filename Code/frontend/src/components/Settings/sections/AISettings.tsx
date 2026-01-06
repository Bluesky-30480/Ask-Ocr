/**
 * AI & Models Settings Section - Recoded with working buttons
 */

import React, { useState, useEffect, useCallback } from 'react';
import { universalAI } from '../../../services/ai/universal-ai.service';
import { ollamaManager, type OllamaModel } from '../../../services/ai/ollama-manager.service';

type AIProviderType = 'local' | 'openai' | 'gemini' | 'claude' | 'deepseek' | 'grok' | 'perplexity';

interface ProviderConfig {
  id: AIProviderType;
  name: string;
  icon: string;
  keyPrefix: string;
  link: string;
  color: string;
}

const PROVIDERS: ProviderConfig[] = [
  { id: 'local', name: 'Local (Ollama)', icon: '💻', keyPrefix: '', link: '', color: '#10b981' },
  { id: 'openai', name: 'OpenAI', icon: '🤖', keyPrefix: 'sk-', link: 'https://platform.openai.com/api-keys', color: '#10a37f' },
  { id: 'gemini', name: 'Google Gemini', icon: '✨', keyPrefix: 'AIza', link: 'https://aistudio.google.com/app/apikey', color: '#4285f4' },
  { id: 'claude', name: 'Anthropic Claude', icon: '🧠', keyPrefix: 'sk-ant-', link: 'https://console.anthropic.com/settings/keys', color: '#d97757' },
  { id: 'deepseek', name: 'DeepSeek', icon: '🔮', keyPrefix: 'sk-', link: 'https://platform.deepseek.com/api_keys', color: '#6366f1' },
  { id: 'grok', name: 'xAI Grok', icon: '⚡', keyPrefix: 'xai-', link: 'https://console.x.ai/', color: '#1da1f2' },
  { id: 'perplexity', name: 'Perplexity', icon: '🔍', keyPrefix: 'pplx-', link: 'https://www.perplexity.ai/settings/api', color: '#20b2aa' },
];

interface AISettingsProps {
  onOpenQuickChat?: () => void;
}

export const AISettings: React.FC<AISettingsProps> = ({ onOpenQuickChat }) => {
  // API Keys state
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({
    openai: '',
    gemini: '',
    claude: '',
    deepseek: '',
    grok: '',
    perplexity: '',
  });
  
  // Other state
  const [defaultProvider, setDefaultProvider] = useState<AIProviderType>('local');
  const [defaultModel, setDefaultModel] = useState<string>('');
  const [installedModels, setInstalledModels] = useState<OllamaModel[]>([]);
  const [providerStatus, setProviderStatus] = useState<Record<string, boolean>>({});
  const [ollamaStatus, setOllamaStatus] = useState<{ isInstalled: boolean; isRunning: boolean }>({
    isInstalled: false,
    isRunning: false,
  });
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
    checkStatus();
  }, []);

  const loadSettings = () => {
    setApiKeys({
      openai: localStorage.getItem('openai_api_key') || '',
      gemini: localStorage.getItem('gemini_api_key') || '',
      claude: localStorage.getItem('claude_api_key') || '',
      deepseek: localStorage.getItem('deepseek_api_key') || '',
      grok: localStorage.getItem('grok_api_key') || '',
      perplexity: localStorage.getItem('perplexity_api_key') || '',
    });
    
    const savedProvider = (localStorage.getItem('default_ai_provider') as AIProviderType) || 'local';
    setDefaultProvider(savedProvider);
    
    const savedModel = localStorage.getItem('default_ai_model') || '';
    setDefaultModel(savedModel);
  };

  const checkStatus = async () => {
    try {
      const [status, ollamaInfo] = await Promise.all([
        universalAI.getProviderStatus(),
        ollamaManager.getStatus(),
      ]);

      setProviderStatus(status);
      setOllamaStatus({
        isInstalled: ollamaInfo.isInstalled,
        isRunning: ollamaInfo.isRunning,
      });
      setInstalledModels(ollamaInfo.models);

      if (!localStorage.getItem('default_ai_model') && ollamaInfo.models.length > 0) {
        const firstModel = ollamaInfo.models[0].name;
        setDefaultModel(firstModel);
        localStorage.setItem('default_ai_model', firstModel);
      }
    } catch (error) {
      console.error('Failed to check status:', error);
    }
  };

  const handleApiKeyChange = (provider: string, value: string) => {
    setApiKeys(prev => ({ ...prev, [provider]: value }));
  };

  const handleSaveAllKeys = useCallback(async () => {
    setIsSaving(true);
    setSaveMessage(null);

    try {
      // Save all keys to localStorage
      Object.entries(apiKeys).forEach(([provider, key]) => {
        if (key.trim()) {
          localStorage.setItem(`${provider}_api_key`, key.trim());
        } else {
          localStorage.removeItem(`${provider}_api_key`);
        }
      });

      // Re-initialize AI service
      universalAI.initialize({
        openaiApiKey: apiKeys.openai.trim(),
        geminiApiKey: apiKeys.gemini.trim(),
        claudeApiKey: apiKeys.claude.trim(),
        deepseekApiKey: apiKeys.deepseek.trim(),
        grokApiKey: apiKeys.grok.trim(),
        perplexityApiKey: apiKeys.perplexity.trim(),
      });

      setSaveMessage({ type: 'success', text: '✅ All API keys saved successfully!' });
      await checkStatus();
      
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      console.error('Failed to save keys:', error);
      setSaveMessage({ type: 'error', text: '❌ Failed to save API keys' });
    } finally {
      setIsSaving(false);
    }
  }, [apiKeys]);

  const handleDefaultModelChange = (value: string) => {
    setDefaultModel(value);
    localStorage.setItem('default_ai_model', value);
  };

  const handleDefaultProviderChange = (value: AIProviderType) => {
    setDefaultProvider(value);
    localStorage.setItem('default_ai_provider', value);
  };

  const handleTestConnections = async () => {
    setIsTesting(true);
    try {
      const results = await universalAI.testConnections();
      setProviderStatus(results);
      
      const summary = Object.entries(results)
        .map(([provider, ok]) => `${provider}: ${ok ? '✅' : '❌'}`)
        .join('\n');
      
      alert(`Connection Test Results:\n\n${summary}`);
    } catch (error) {
      alert('Connection test failed: ' + error);
    } finally {
      setIsTesting(false);
    }
  };

  const handleInstallOllama = async () => {
    try {
      await ollamaManager.oneClickInstall();
      await checkStatus();
    } catch (error) {
      console.error('Failed to install Ollama:', error);
      alert('Failed to install Ollama: ' + error);
    }
  };

  const handleStartOllama = async () => {
    try {
      await ollamaManager.startOllama();
      await checkStatus();
    } catch (error) {
      console.error('Failed to start Ollama:', error);
    }
  };

  const getStatusIcon = (provider: string): string => {
    if (provider === 'local') {
      return ollamaStatus.isRunning ? '🟢' : ollamaStatus.isInstalled ? '🟡' : '🔴';
    }
    const key = apiKeys[provider as keyof typeof apiKeys];
    if (!key) return '⚪';
    return providerStatus[provider] ? '🟢' : '🟡';
  };

  const getStatusText = (provider: string): string => {
    if (provider === 'local') {
      if (ollamaStatus.isRunning) return 'Running';
      if (ollamaStatus.isInstalled) return 'Stopped';
      return 'Not installed';
    }
    const key = apiKeys[provider as keyof typeof apiKeys];
    if (!key) return 'Not configured';
    return providerStatus[provider] ? 'Connected' : 'Not verified';
  };

  return (
    <div className="settings-section">
      <div className="settings-section-header">
        <h2 className="settings-section-title">AI & Models</h2>
        <p className="settings-section-description">
          Configure AI providers, API keys, and model preferences
        </p>
      </div>

      {/* Global Settings */}
      <div className="settings-group">
        <h3 className="settings-group-title">⚙️ Global Settings</h3>
        
        <div className="settings-item">
          <div className="settings-item-label">
            <div className="settings-item-title">Default Provider</div>
            <div className="settings-item-description">
              Choose which AI provider to use by default
            </div>
          </div>
          <div className="settings-item-control">
            <select
              className="select-control"
              value={defaultProvider}
              onChange={(e) => handleDefaultProviderChange(e.target.value as AIProviderType)}
            >
              {PROVIDERS.map(p => (
                <option key={p.id} value={p.id}>
                  {p.icon} {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="settings-item">
          <div className="settings-item-label">
            <div className="settings-item-title">Quick Actions</div>
            <div className="settings-item-description">
              Test connections or open Quick Chat
            </div>
          </div>
          <div className="settings-item-control" style={{ display: 'flex', gap: '8px' }}>
            <button 
              type="button"
              className="button-control secondary"
              onClick={onOpenQuickChat}
            >
              💬 Quick Chat
            </button>
            <button
              type="button"
              className="button-control secondary"
              onClick={handleTestConnections}
              disabled={isTesting}
            >
              {isTesting ? '⏳ Testing...' : '🔍 Test All'}
            </button>
          </div>
        </div>
      </div>

      {/* Local Provider (Ollama) */}
      <div className="settings-group">
        <h3 className="settings-group-title">💻 Local AI (Ollama)</h3>
        
        <div className="provider-status-card">
          <div className="status-row">
            <span className="status-indicator">{getStatusIcon('local')}</span>
            <span className="status-label">{getStatusText('local')}</span>
          </div>
          
          <div className="provider-actions">
            {!ollamaStatus.isInstalled ? (
              <button 
                type="button" 
                className="button-control primary"
                onClick={handleInstallOllama}
              >
                📥 Install Ollama
              </button>
            ) : !ollamaStatus.isRunning ? (
              <button 
                type="button" 
                className="button-control primary"
                onClick={handleStartOllama}
              >
                ▶️ Start Ollama
              </button>
            ) : null}
            
            <button 
              type="button" 
              className="button-control secondary"
              onClick={checkStatus}
            >
              🔄 Refresh
            </button>
          </div>
        </div>

        {ollamaStatus.isRunning && installedModels.length > 0 && (
          <div className="settings-item" style={{ marginTop: '12px' }}>
            <div className="settings-item-label">
              <div className="settings-item-title">Default Model</div>
              <div className="settings-item-description">
                {installedModels.length} model(s) available
              </div>
            </div>
            <div className="settings-item-control">
              <select
                className="select-control"
                value={defaultModel}
                onChange={(e) => handleDefaultModelChange(e.target.value)}
              >
                {installedModels.map((model) => (
                  <option key={model.name} value={model.name}>
                    {model.name} ({(model.size / 1024 / 1024 / 1024).toFixed(1)} GB)
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Cloud Providers */}
      <div className="settings-group">
        <h3 className="settings-group-title">☁️ Cloud Providers</h3>
        
        <div className="providers-list">
          {PROVIDERS.filter(p => p.id !== 'local').map((provider) => (
            <div 
              key={provider.id} 
              className={`provider-card ${expandedProvider === provider.id ? 'expanded' : ''}`}
            >
              <button
                type="button"
                className="provider-header"
                onClick={() => setExpandedProvider(
                  expandedProvider === provider.id ? null : provider.id
                )}
              >
                <div className="provider-info">
                  <span className="provider-icon">{provider.icon}</span>
                  <span className="provider-name">{provider.name}</span>
                </div>
                <div className="provider-status">
                  <span className="status-badge">{getStatusIcon(provider.id)} {getStatusText(provider.id)}</span>
                  <span className="expand-arrow">{expandedProvider === provider.id ? '▲' : '▼'}</span>
                </div>
              </button>
              
              {expandedProvider === provider.id && (
                <div className="provider-content">
                  <div className="api-key-row">
                    <input
                      type="password"
                      className="input-control"
                      value={apiKeys[provider.id as keyof typeof apiKeys] || ''}
                      onChange={(e) => handleApiKeyChange(provider.id, e.target.value)}
                      placeholder={`${provider.keyPrefix}...`}
                    />
                  </div>
                  <div className="provider-link">
                    <a 
                      href={provider.link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      🔗 Get API Key
                    </a>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Save Button */}
      <div className="settings-group">
        <div className="settings-actions">
          <button
            type="button"
            className="button-control primary"
            onClick={handleSaveAllKeys}
            disabled={isSaving}
          >
            {isSaving ? '⏳ Saving...' : '💾 Save All API Keys'}
          </button>
          
          {saveMessage && (
            <span className={`save-message ${saveMessage.type}`}>
              {saveMessage.text}
            </span>
          )}
        </div>
      </div>

      <style>{`
        .provider-status-card {
          background: var(--color-surface-primary);
          border: 1px solid var(--color-border-primary);
          border-radius: 12px;
          padding: 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .status-row {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        
        .status-indicator {
          font-size: 16px;
        }
        
        .status-label {
          font-size: 14px;
          font-weight: 500;
          color: var(--color-text-primary);
        }
        
        .provider-actions {
          display: flex;
          gap: 8px;
        }
        
        .providers-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        
        .provider-card {
          background: var(--color-surface-primary);
          border: 1px solid var(--color-border-primary);
          border-radius: 12px;
          overflow: hidden;
          transition: all 0.2s ease;
        }
        
        .provider-card.expanded {
          border-color: var(--color-primary);
        }
        
        .provider-header {
          width: 100%;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 14px 16px;
          background: transparent;
          border: none;
          cursor: pointer;
          transition: background 0.2s ease;
        }
        
        .provider-header:hover {
          background: var(--color-surface-secondary);
        }
        
        .provider-info {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        
        .provider-icon {
          font-size: 18px;
        }
        
        .provider-name {
          font-size: 14px;
          font-weight: 600;
          color: var(--color-text-primary);
        }
        
        .provider-status {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .status-badge {
          font-size: 12px;
          color: var(--color-text-secondary);
        }
        
        .expand-arrow {
          font-size: 10px;
          color: var(--color-text-secondary);
        }
        
        .provider-content {
          padding: 0 16px 16px;
          border-top: 1px solid var(--color-border-primary);
          animation: slideDown 0.2s ease;
        }
        
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .api-key-row {
          margin-top: 12px;
        }
        
        .provider-link {
          margin-top: 8px;
        }
        
        .provider-link a {
          font-size: 13px;
          color: var(--color-primary);
          text-decoration: none;
        }
        
        .provider-link a:hover {
          text-decoration: underline;
        }
        
        .settings-actions {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        
        .save-message {
          font-size: 14px;
          font-weight: 500;
        }
        
        .save-message.success {
          color: #34c759;
        }
        
        .save-message.error {
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
        
        .button-control.secondary {
          background: var(--color-surface-primary);
          color: var(--color-text-primary);
          border: 1px solid var(--color-border-primary);
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .button-control.secondary:hover {
          background: var(--color-surface-secondary);
          border-color: var(--color-primary);
        }
        
        .button-control.secondary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
};
