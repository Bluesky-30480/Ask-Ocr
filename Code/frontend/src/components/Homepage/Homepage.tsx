/**
 * Homepage Component
 * Beautiful non-scrollable dashboard with Quick Chat integration
 */

import React, { useState, useEffect, useRef } from 'react';
import { databaseService } from '../../services/database.service';
import type { OcrRecord } from '../../services/database.service';
import { ollamaManager } from '../../services/ai/ollama-manager.service';
import type { OllamaStatus } from '../../services/ai/ollama-manager.service';
import { 
  Home, Settings, Eye, MessageSquare, Camera, Cpu, 
  CheckCircle, XCircle, AlertCircle, Send, Sparkles, Music, FolderOpen,
  Play, ExternalLink, RefreshCw
} from 'lucide-react';
import './Homepage.css';

interface HomepageProps {
  onOpenSettings?: () => void;
  onOpenQuickChat?: (initialText?: string) => void;
  onOpenMusic?: () => void;
  onOpenMediaHelper?: () => void;
  onNewOcr?: () => void;
}

interface ModelStatus {
  name: string;
  status: 'online' | 'offline' | 'checking';
  provider: string;
}

export const Homepage: React.FC<HomepageProps> = ({ 
  onOpenSettings, 
  onOpenQuickChat,
  onOpenMusic,
  onOpenMediaHelper,
  onNewOcr
}) => {
  const [stats, setStats] = useState({
    totalOcrs: 0,
    totalChats: 0,
    todayOcrs: 0,
  });
  const [ollamaStatus, setOllamaStatus] = useState<OllamaStatus | null>(null);
  const [modelStatuses, setModelStatuses] = useState<ModelStatus[]>([]);
  const [quickChatInput, setQuickChatInput] = useState('');
  const [recentOcrs, setRecentOcrs] = useState<OcrRecord[]>([]);
  const [isCheckingModels, setIsCheckingModels] = useState(true);
  const [isStartingOllama, setIsStartingOllama] = useState(false);
  const quickChatInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    loadData();
    checkModelStatus();
  }, []);

  const loadData = async () => {
    try {
      const records = await databaseService.getAllOcrRecords(5);
      setRecentOcrs(records);
      
      const allRecords = await databaseService.getAllOcrRecords(1000);
      const today = new Date().setHours(0, 0, 0, 0);
      const todayOcrs = allRecords.filter(item => 
        new Date(item.timestamp).setHours(0, 0, 0, 0) === today
      ).length;
      
      setStats(prev => ({
        ...prev,
        totalOcrs: allRecords.length,
        todayOcrs
      }));
    } catch (error) {
      console.error('Failed to load data:', error);
    }

    // Load chat count
    const savedChatHistory = localStorage.getItem('chat_history');
    if (savedChatHistory) {
      try {
        const parsed = JSON.parse(savedChatHistory);
        setStats(prev => ({ ...prev, totalChats: parsed.length }));
      } catch (error) {
        console.error('Failed to load chat history:', error);
      }
    }
  };

  const checkModelStatus = async () => {
    setIsCheckingModels(true);
    const statuses: ModelStatus[] = [];

    // Check Ollama status
    try {
      const status = await ollamaManager.getStatus();
      setOllamaStatus(status);
      
      if (status.isRunning && status.models.length > 0) {
        status.models.slice(0, 3).forEach(model => {
          statuses.push({
            name: model.name,
            status: 'online',
            provider: 'Ollama'
          });
        });
      } else if (status.isInstalled) {
        statuses.push({
          name: 'Ollama',
          status: 'offline',
          provider: 'Local'
        });
      }
    } catch (error) {
      console.error('Failed to check Ollama status:', error);
    }

    // Check cloud API keys
    const cloudProviders = [
      { key: 'openai_api_key', name: 'GPT-4', provider: 'OpenAI' },
      { key: 'claude_api_key', name: 'Claude', provider: 'Anthropic' },
      { key: 'gemini_api_key', name: 'Gemini', provider: 'Google' },
    ];

    cloudProviders.forEach(({ key, name, provider }) => {
      const hasKey = !!localStorage.getItem(key);
      statuses.push({
        name,
        status: hasKey ? 'online' : 'offline',
        provider
      });
    });

    setModelStatuses(statuses);
    setIsCheckingModels(false);
  };

  const handleStartOllama = async () => {
    setIsStartingOllama(true);
    try {
      await ollamaManager.startOllama();
      // Wait a moment for Ollama to start
      await new Promise(resolve => setTimeout(resolve, 2000));
      await checkModelStatus();
    } catch (error) {
      console.error('Failed to start Ollama:', error);
    } finally {
      setIsStartingOllama(false);
    }
  };

  const handleQuickChat = () => {
    if (quickChatInput.trim() && onOpenQuickChat) {
      onOpenQuickChat(quickChatInput.trim());
      setQuickChatInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleQuickChat();
    }
  };

  const formatTimeAgo = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <div className="homepage-container">
      {/* Sidebar */}
      <aside className="homepage-sidebar">
        <div className="sidebar-brand">
          <div className="brand-icon">
            <Sparkles size={22} />
          </div>
          <span className="brand-name">Bluesky</span>
        </div>

        <nav className="sidebar-navigation">
          <button className="nav-btn active">
            <Home size={20} />
            <span>Home</span>
          </button>
          <button className="nav-btn" onClick={onOpenMusic}>
            <Music size={20} />
            <span>Music Player</span>
          </button>
          <button className="nav-btn" onClick={onOpenMediaHelper}>
            <FolderOpen size={20} />
            <span>Media Helper</span>
          </button>
          <button className="nav-btn" onClick={onOpenSettings}>
            <Settings size={20} />
            <span>Settings</span>
          </button>
        </nav>

        <div className="sidebar-bottom">
          <div className="version-tag">v0.1.0</div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="homepage-main">
        {/* Top Section: Welcome + Quick Actions */}
        <section className="top-section">
          <div className="welcome-area">
            <h1>Welcome back!</h1>
            <p>What would you like to do today?</p>
          </div>

          <div className="quick-actions">
            <button className="action-btn primary" onClick={onNewOcr}>
              <Camera size={20} />
              <span>New OCR</span>
            </button>
            <button className="action-btn secondary" onClick={() => onOpenQuickChat?.()}>
              <MessageSquare size={20} />
              <span>Quick Chat</span>
            </button>
          </div>
        </section>

        {/* Middle Section: Stats + Quick Chat */}
        <section className="middle-section">
          {/* Stats Cards */}
          <div className="stats-row">
            <div className="stat-card purple">
              <div className="stat-icon">
                <Eye size={24} />
              </div>
              <div className="stat-info">
                <span className="stat-value">{stats.totalOcrs}</span>
                <span className="stat-label">Total OCRs</span>
              </div>
            </div>

            <div className="stat-card blue">
              <div className="stat-icon">
                <MessageSquare size={24} />
              </div>
              <div className="stat-info">
                <span className="stat-value">{stats.totalChats}</span>
                <span className="stat-label">Chats</span>
              </div>
            </div>

            <div className="stat-card green">
              <div className="stat-icon">
                <Cpu size={24} />
              </div>
              <div className="stat-info">
                <span className="stat-value">
                  {modelStatuses.filter(m => m.status === 'online').length}
                </span>
                <span className="stat-label">Active Models</span>
              </div>
            </div>
          </div>

          {/* Quick Chat Panel */}
          <div className="quick-chat-panel">
            <div className="panel-header">
              <Sparkles size={18} />
              <h3>Quick Chat</h3>
            </div>
            <div className="chat-input-area">
              <textarea
                ref={quickChatInputRef}
                value={quickChatInput}
                onChange={(e) => setQuickChatInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything... (Enter to send)"
                rows={2}
              />
              <button 
                className="send-btn"
                onClick={handleQuickChat}
                disabled={!quickChatInput.trim()}
              >
                <Send size={18} />
              </button>
            </div>
            <div className="chat-suggestions">
              <button onClick={() => setQuickChatInput('Explain this code: ')}>
                Explain code
              </button>
              <button onClick={() => setQuickChatInput('Summarize: ')}>
                Summarize text
              </button>
              <button onClick={() => setQuickChatInput('Help me write: ')}>
                Write content
              </button>
            </div>
          </div>
        </section>

        {/* Bottom Section: Model Status + Recent OCRs */}
        <section className="bottom-section">
          {/* Model Detection Panel */}
          <div className="model-status-panel">
            <div className="panel-header">
              <Cpu size={18} />
              <h3>Model Status</h3>
              <button 
                className="refresh-btn"
                onClick={checkModelStatus}
                disabled={isCheckingModels}
              >
                <RefreshCw size={14} className={isCheckingModels ? 'spinning' : ''} />
                {isCheckingModels ? 'Checking...' : 'Refresh'}
              </button>
            </div>
            <div className="model-list">
              {modelStatuses.length === 0 && !isCheckingModels ? (
                <div className="no-models">
                  <AlertCircle size={20} />
                  <span>No models configured</span>
                </div>
              ) : (
                modelStatuses.map((model, index) => (
                  <div key={index} className={`model-item ${model.status}`}>
                    <div className="model-indicator">
                      {model.status === 'online' && <CheckCircle size={16} />}
                      {model.status === 'offline' && <XCircle size={16} />}
                      {model.status === 'checking' && <AlertCircle size={16} />}
                    </div>
                    <div className="model-info">
                      <span className="model-name">{model.name}</span>
                      <span className="model-provider">{model.provider}</span>
                    </div>
                    <span className={`status-badge ${model.status}`}>
                      {model.status}
                    </span>
                  </div>
                ))
              )}
            </div>
            {ollamaStatus && ollamaStatus.isInstalled && !ollamaStatus.isRunning && (
              <div className="ollama-cta ollama-start">
                <div className="ollama-cta-info">
                  <Play size={16} />
                  <span>Ollama is installed but not running</span>
                </div>
                <button 
                  className="start-ollama-btn"
                  onClick={handleStartOllama}
                  disabled={isStartingOllama}
                >
                  {isStartingOllama ? (
                    <>
                      <RefreshCw size={14} className="spinning" />
                      Starting...
                    </>
                  ) : (
                    <>
                      <Play size={14} />
                      Start Ollama
                    </>
                  )}
                </button>
              </div>
            )}
            {ollamaStatus && !ollamaStatus.isInstalled && (
              <div className="ollama-cta">
                <div className="ollama-cta-info">
                  <ExternalLink size={16} />
                  <span>Install Ollama for local AI</span>
                </div>
                <button onClick={onOpenSettings}>Setup →</button>
              </div>
            )}
          </div>

          {/* Recent OCRs Panel */}
          <div className="recent-ocrs-panel">
            <div className="panel-header">
              <Eye size={18} />
              <h3>Recent OCRs</h3>
            </div>
            <div className="ocr-list">
              {recentOcrs.length === 0 ? (
                <div className="no-ocrs">
                  <Camera size={24} />
                  <span>No OCRs yet</span>
                  <button onClick={onNewOcr}>Capture First OCR</button>
                </div>
              ) : (
                recentOcrs.map((ocr) => (
                  <div 
                    key={ocr.id} 
                    className="ocr-item"
                    onClick={() => onOpenQuickChat?.(ocr.text)}
                  >
                    <div className="ocr-preview">
                      {ocr.text.substring(0, 60)}
                      {ocr.text.length > 60 && '...'}
                    </div>
                    <div className="ocr-meta">
                      <span className="ocr-lang">{ocr.language}</span>
                      <span className="ocr-time">{formatTimeAgo(ocr.timestamp)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};
