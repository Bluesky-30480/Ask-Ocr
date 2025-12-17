/**
 * AI & Models Settings Section
 */

import React, { useState, useEffect } from 'react';
import { universalAI } from '../../../services/ai/universal-ai.service';
import { ollamaManager } from '../../../services/ai/ollama-manager.service';

export const AISettings: React.FC = () => {
  const [openaiKey, setOpenaiKey] = useState('');
  const [defaultProvider, setDefaultProvider] = useState<'local' | 'openai'>('local');
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
    const savedKey = localStorage.getItem('openai_api_key') || '';
    const savedProvider = (localStorage.getItem('default_ai_provider') as 'local' | 'openai') || 'local';
    
    setOpenaiKey(savedKey);
    setDefaultProvider(savedProvider);
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
    } catch (error) {
      console.error('Failed to check status:', error);
    }
  };

  const handleSaveOpenAI = () => {
    if (openaiKey.trim()) {
      localStorage.setItem('openai_api_key', openaiKey.trim());
      universalAI.initialize({ openaiApiKey: openaiKey.trim() });
      alert('OpenAI API key saved successfully');
      checkStatus();
    } else {
      localStorage.removeItem('openai_api_key');
      alert('OpenAI API key removed');
    }
  };

  const handleDefaultProviderChange = (value: 'local' | 'openai') => {
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

  return (
    <div className="settings-section">
      <div className="settings-section-header">
        <h2 className="settings-section-title">AI & Models</h2>
        <p className="settings-section-description">
          Configure AI providers, API keys, and model preferences
        </p>
      </div>

      {/* Provider Status */}
      <div className="settings-group">
        <h3 className="settings-group-title">Provider Status</h3>
        <p className="settings-group-description">
          Current status of available AI providers
        </p>

        <div className="settings-item">
          <div className="settings-item-label">
            <div className="settings-item-title">
              {providerStatus.local ? '🟢' : '🔴'} Local (Ollama)
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

        <div className="settings-item">
          <div className="settings-item-label">
            <div className="settings-item-title">
              {providerStatus.openai ? '🟢' : '🔴'} OpenAI
            </div>
            <div className="settings-item-description">
              {providerStatus.openai ? 'API key configured and valid' : 'No API key or invalid'}
            </div>
          </div>
        </div>

        <div className="settings-item">
          <div className="settings-item-label"></div>
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
      </div>

      {/* Default Provider */}
      <div className="settings-group">
        <h3 className="settings-group-title">Default Provider</h3>
        <p className="settings-group-description">
          Choose which AI provider to use by default
        </p>

        <div className="settings-item">
          <div className="settings-item-label">
            <div className="settings-item-title">Preferred Provider</div>
            <div className="settings-item-description">
              This will be used unless a specific provider is required
            </div>
          </div>
          <div className="settings-item-control">
            <select
              className="select-control"
              value={defaultProvider}
              onChange={(e) => handleDefaultProviderChange(e.target.value as 'local' | 'openai')}
            >
              <option value="local">Local (Ollama) - Free</option>
              <option value="openai">OpenAI - Requires API Key</option>
            </select>
          </div>
        </div>
      </div>

      {/* OpenAI Configuration */}
      <div className="settings-group">
        <h3 className="settings-group-title">OpenAI Configuration</h3>
        <p className="settings-group-description">
          Configure your OpenAI API key for cloud-based AI features
        </p>

        <div className="settings-item">
          <div className="settings-item-label">
            <div className="settings-item-title">API Key</div>
            <div className="settings-item-description">
              Get your API key from{' '}
              <a
                href="https://platform.openai.com/api-keys"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'var(--accent-color)' }}
              >
                platform.openai.com
              </a>
            </div>
          </div>
        </div>

        <div className="settings-item">
          <div className="settings-item-label">
            <input
              type="password"
              className="input-control"
              value={openaiKey}
              onChange={(e) => setOpenaiKey(e.target.value)}
              placeholder="sk-..."
              style={{ fontFamily: 'monospace' }}
            />
          </div>
          <div className="settings-item-control">
            <button className="button-control" onClick={handleSaveOpenAI}>
              💾 Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
