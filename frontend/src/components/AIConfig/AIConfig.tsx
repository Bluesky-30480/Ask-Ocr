/**
 * AI Configuration Component
 * Quick settings for AI provider API keys
 */

import React, { useState, useEffect } from 'react';
import { universalAI } from '../../services/ai/universal-ai.service';
import './AIConfig.css';

interface AIConfigProps {
  onClose: () => void;
}

export const AIConfig: React.FC<AIConfigProps> = ({ onClose }) => {
  const [openaiKey, setOpenaiKey] = useState('');
  const [status, setStatus] = useState<Record<string, boolean>>({});
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    // Load saved keys
    const savedKey = localStorage.getItem('openai_api_key');
    if (savedKey) {
      setOpenaiKey(savedKey);
    }

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
      // Save to localStorage
      if (openaiKey) {
        localStorage.setItem('openai_api_key', openaiKey);
        
        // Initialize AI service
        await universalAI.initialize({ openaiApiKey: openaiKey });
      } else {
        localStorage.removeItem('openai_api_key');
      }

      await checkStatus();
      alert('Settings saved successfully!');
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
      
      const summary = Object.entries(results)
        .map(([provider, ok]) => `${provider}: ${ok ? '✅ OK' : '❌ Failed'}`)
        .join('\n');
      
      alert(`Connection Test Results:\n\n${summary}`);
    } catch (error) {
      console.error('Connection test failed:', error);
      alert('Connection test failed');
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="ai-config-overlay" onClick={onClose}>
      <div className="ai-config-panel" onClick={(e) => e.stopPropagation()}>
        <div className="ai-config-header">
          <h2>⚙️ AI Configuration</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="ai-config-content">
          {/* Provider Status */}
          <div className="status-section">
            <h3>Provider Status</h3>
            <div className="status-grid">
              <div className={`status-item ${status.local ? 'online' : 'offline'}`}>
                <span className="status-icon">{status.local ? '🟢' : '🔴'}</span>
                <span className="status-label">Local (Ollama)</span>
              </div>
              <div className={`status-item ${status.openai ? 'online' : 'offline'}`}>
                <span className="status-icon">{status.openai ? '🟢' : '🔴'}</span>
                <span className="status-label">OpenAI</span>
              </div>
              <div className={`status-item ${status.custom ? 'online' : 'offline'}`}>
                <span className="status-icon">{status.custom ? '🟢' : '🔴'}</span>
                <span className="status-label">Custom Models</span>
              </div>
              <div className={`status-item ${status.perplexity ? 'online' : 'offline'}`}>
                <span className="status-icon">{status.perplexity ? '🟢' : '🔴'}</span>
                <span className="status-label">Perplexity</span>
              </div>
            </div>
          </div>

          {/* OpenAI Configuration */}
          <div className="config-section">
            <h3>OpenAI API Key</h3>
            <input
              type="password"
              value={openaiKey}
              onChange={(e) => setOpenaiKey(e.target.value)}
              placeholder="sk-..."
              className="api-key-input"
            />
            <p className="help-text">
              Get your API key from{' '}
              <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer">
                platform.openai.com
              </a>
            </p>
          </div>

          {/* Local Ollama Info */}
          <div className="info-section">
            <h3>Local AI (Ollama)</h3>
            <p>
              {status.local ? (
                <>
                  ✅ Ollama is running and ready to use.
                  <br />
                  No API key required for local models.
                </>
              ) : (
                <>
                  ❌ Ollama is not running.
                  <br />
                  <a href="https://ollama.com/download" target="_blank" rel="noopener noreferrer">
                    Download Ollama
                  </a>{' '}
                  to use local AI models.
                </>
              )}
            </p>
          </div>
        </div>

        <div className="ai-config-footer">
          <button 
            className="test-btn" 
            onClick={handleTest}
            disabled={isTesting}
          >
            {isTesting ? '⏳ Testing...' : '🔍 Test Connections'}
          </button>
          <button className="save-btn" onClick={handleSave}>
            💾 Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};
