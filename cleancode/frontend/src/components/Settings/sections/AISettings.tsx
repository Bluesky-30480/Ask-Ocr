/**
 * AI & Models Settings Section
 */

import React, { useState, useEffect } from 'react';
import { universalAI } from '../../../services/ai/universal-ai.service';
import { ollamaManager, type OllamaModel } from '../../../services/ai/ollama-manager.service';

type AIProviderType = 'local' | 'openai' | 'gemini' | 'claude' | 'deepseek' | 'grok' | 'perplexity';

interface AISettingsProps {
  onOpenQuickChat?: () => void;
}

export const AISettings: React.FC<AISettingsProps> = ({ onOpenQuickChat }) => {
  const [openaiKey, setOpenaiKey] = useState('');
  const [geminiKey, setGeminiKey] = useState('');
  const [claudeKey, setClaudeKey] = useState('');
  const [deepseekKey, setDeepseekKey] = useState('');
  const [grokKey, setGrokKey] = useState('');
  const [perplexityKey, setPerplexityKey] = useState('');
  
  const [defaultProvider, setDefaultProvider] = useState<AIProviderType>('local');
  const [defaultModel, setDefaultModel] = useState<string>('');
  const [installedModels, setInstalledModels] = useState<OllamaModel[]>([]);
  const [providerStatus, setProviderStatus] = useState<Record<string, boolean>>({});
  const [ollamaStatus, setOllamaStatus] = useState<{ isInstalled: boolean; isRunning: boolean }>({
    isInstalled: false,
    isRunning: false,
  });
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    loadSettings();
    checkStatus();
  }, []);

  const loadSettings = () => {
    setOpenaiKey(localStorage.getItem('openai_api_key') || '');
    setGeminiKey(localStorage.getItem('gemini_api_key') || '');
    setClaudeKey(localStorage.getItem('claude_api_key') || '');
    setDeepseekKey(localStorage.getItem('deepseek_api_key') || '');
    setGrokKey(localStorage.getItem('grok_api_key') || '');
    setPerplexityKey(localStorage.getItem('perplexity_api_key') || '');
    
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

      // If no default model is set and we have models, set the first one
      if (!localStorage.getItem('default_ai_model') && ollamaInfo.models.length > 0) {
        const firstModel = ollamaInfo.models[0].name;
        setDefaultModel(firstModel);
        localStorage.setItem('default_ai_model', firstModel);
      }
    } catch (error) {
      console.error('Failed to check status:', error);
    }
  };

  const handleSaveKeys = () => {
    if (openaiKey.trim()) localStorage.setItem('openai_api_key', openaiKey.trim());
    else localStorage.removeItem('openai_api_key');

    if (geminiKey.trim()) localStorage.setItem('gemini_api_key', geminiKey.trim());
    else localStorage.removeItem('gemini_api_key');

    if (claudeKey.trim()) localStorage.setItem('claude_api_key', claudeKey.trim());
    else localStorage.removeItem('claude_api_key');

    if (deepseekKey.trim()) localStorage.setItem('deepseek_api_key', deepseekKey.trim());
    else localStorage.removeItem('deepseek_api_key');

    if (grokKey.trim()) localStorage.setItem('grok_api_key', grokKey.trim());
    else localStorage.removeItem('grok_api_key');

    if (perplexityKey.trim()) localStorage.setItem('perplexity_api_key', perplexityKey.trim());
    else localStorage.removeItem('perplexity_api_key');

    universalAI.initialize({
      openaiApiKey: openaiKey.trim(),
      geminiApiKey: geminiKey.trim(),
      claudeApiKey: claudeKey.trim(),
      deepseekApiKey: deepseekKey.trim(),
      grokApiKey: grokKey.trim(),
      perplexityApiKey: perplexityKey.trim(),
    });

    alert('API keys saved successfully');
    checkStatus();
  };

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
        .map(([provider, ok]) => `${provider}: ${ok ? '✅ Connected' : '❌ Failed'}`)
        .join('\n');
      
      alert(`Connection Test Results:\n\n${summary}`);
    } catch (error) {
      alert('Connection test failed');
    } finally {
      setIsTesting(false);
    }
  };

  const handleInstallOllama = async () => {
    try {
      await ollamaManager.oneClickInstall();
    } catch (error) {
      console.error('Failed to install Ollama:', error);
    }
  };

  const renderProviderInput = (
    label: string,
    value: string,
    setValue: (val: string) => void,
    placeholder: string,
    link: string,
    providerKey: string
  ) => (
    <div className="settings-group">
      <h3 className="settings-group-title">{label} Configuration</h3>
      <div className="settings-item">
        <div className="settings-item-label">
          <div className="settings-item-title">API Key</div>
          <div className="settings-item-description">
            Get your API key from{' '}
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--accent-color)' }}
            >
              {new URL(link).hostname}
            </a>
          </div>
        </div>
      </div>
      <div className="settings-item">
        <div className="settings-item-label">
          <input
            type="password"
            className="input-control"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            style={{ fontFamily: 'monospace' }}
          />
        </div>
        <div className="settings-item-control">
          <div className="status-indicator">
            {providerStatus[providerKey] ? '✅ Connected' : value ? '⚠️ Not Verified' : '⚪ Not Configured'}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="settings-section">
      <div className="settings-section-header">
        <h2 className="settings-section-title">AI & Models</h2>
        <p className="settings-section-description">
          Configure AI providers, API keys, and model preferences
        </p>
      </div>

      {/* Provider Status & Global Controls */}
      <div className="settings-group">
        <h3 className="settings-group-title">Global Settings</h3>
        
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
              <option value="local">Local (Ollama) - Free</option>
              <option value="openai">OpenAI</option>
              <option value="gemini">Google Gemini</option>
              <option value="claude">Anthropic Claude</option>
              <option value="deepseek">DeepSeek</option>
              <option value="grok">xAI Grok</option>
              <option value="perplexity">Perplexity</option>
            </select>
          </div>
        </div>

        <div className="settings-item">
          <div className="settings-item-label">
            <div className="settings-item-title">Quick Chat</div>
            <div className="settings-item-description">
              Open the full chat interface to test models
            </div>
          </div>
          <div className="settings-item-control">
            <button 
              className="button-control secondary"
              onClick={onOpenQuickChat}
            >
              💬 Open Quick Chat
            </button>
          </div>
        </div>

        <div className="settings-item">
          <div className="settings-item-label">
            <div className="settings-item-title">Connection Status</div>
            <div className="settings-item-description">
              Test connections to all configured providers
            </div>
          </div>
          <div className="settings-item-control">
            <button
              className="button-control secondary"
              onClick={handleTestConnections}
              disabled={isTesting}
            >
              {isTesting ? '⏳ Testing...' : '🔍 Test Connections'}
            </button>
          </div>
        </div>
        
        <div className="settings-item">
           <div className="settings-item-label"></div>
           <div className="settings-item-control">
             <button className="button-control" onClick={handleSaveKeys}>
               💾 Save All Keys
             </button>
           </div>
        </div>
      </div>

      {/* Local Provider */}
      <div className="settings-group">
        <h3 className="settings-group-title">Local AI (Ollama)</h3>
        <div className="settings-item">
          <div className="settings-item-label">
            <div className="settings-item-title">
              {providerStatus.local ? '🟢' : '🔴'} Status
            </div>
            <div className="settings-item-description">
              {ollamaStatus.isRunning
                ? 'Running and ready'
                : ollamaStatus.isInstalled
                ? 'Installed but not running'
                : 'Not installed'}
            </div>
          </div>
          {!ollamaStatus.isInstalled && (
            <div className="settings-item-control">
              <button className="button-control" onClick={handleInstallOllama}>
                Install Ollama
              </button>
            </div>
          )}
        </div>

        {ollamaStatus.isRunning && installedModels.length > 0 && (
          <div className="settings-item">
            <div className="settings-item-label">
              <div className="settings-item-title">Default Model</div>
              <div className="settings-item-description">
                Select the model to use for AI assistance
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
                    {model.name} ({Math.round(model.size / 1024 / 1024 / 1024 * 100) / 100} GB)
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Cloud Providers */}
      {renderProviderInput(
        'OpenAI',
        openaiKey,
        setOpenaiKey,
        'sk-...',
        'https://platform.openai.com/api-keys',
        'openai'
      )}

      {renderProviderInput(
        'Google Gemini',
        geminiKey,
        setGeminiKey,
        'AIza...',
        'https://aistudio.google.com/app/apikey',
        'gemini'
      )}

      {renderProviderInput(
        'Anthropic Claude',
        claudeKey,
        setClaudeKey,
        'sk-ant-...',
        'https://console.anthropic.com/settings/keys',
        'claude'
      )}

      {renderProviderInput(
        'DeepSeek',
        deepseekKey,
        setDeepseekKey,
        'sk-...',
        'https://platform.deepseek.com/api_keys',
        'deepseek'
      )}

      {renderProviderInput(
        'xAI Grok',
        grokKey,
        setGrokKey,
        'xai-...',
        'https://console.x.ai/',
        'grok'
      )}

      {renderProviderInput(
        'Perplexity',
        perplexityKey,
        setPerplexityKey,
        'pplx-...',
        'https://www.perplexity.ai/settings/api',
        'perplexity'
      )}
    </div>
  );
};
