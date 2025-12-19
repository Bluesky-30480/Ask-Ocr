/**
 * Homepage Component
 * Main landing page with history, quick access, and statistics
 */

import React, { useState, useEffect } from 'react';
import { databaseService } from '../../services/database.service';
import type { OcrRecord } from '../../services/database.service';
import './Homepage.css';

interface ChatHistoryItem {
  id: string;
  timestamp: number;
  title: string;
  messages: number;
  lastMessage: string;
}

interface AppChat {
  appName: string;
  appIcon: string;
  appExecutable: string;
  chats: ChatHistoryItem[];
}

interface HomepageProps {
  onOpenSettings?: () => void;
  onOpenQuickChat?: (initialText?: string) => void;
  onNewOcr?: () => void;
}

export const Homepage: React.FC<HomepageProps> = ({ 
  onOpenSettings, 
  onOpenQuickChat,
  onNewOcr
}) => {
  const [activeTab, setActiveTab] = useState<'ocr' | 'chats' | 'apps'>('ocr');
  const [ocrHistory, setOcrHistory] = useState<OcrRecord[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatHistoryItem[]>([]);
  const [appChats, setAppChats] = useState<AppChat[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({
    totalOcrs: 0,
    totalChats: 0,
    totalApps: 0,
    todayOcrs: 0,
  });

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    // Load OCR history from database
    try {
      const records = await databaseService.getAllOcrRecords(50); // Limit to 50 recent
      setOcrHistory(records);
      
      // Update stats based on DB records
      const today = new Date().setHours(0, 0, 0, 0);
      const todayOcrs = records.filter(item => new Date(item.timestamp).setHours(0, 0, 0, 0) === today).length;
      
      setStats(prev => ({
        ...prev,
        totalOcrs: records.length,
        todayOcrs
      }));
    } catch (error) {
      console.error('Failed to load OCR history from DB:', error);
    }

    // Load chat history (still from localStorage for now)
    const savedChatHistory = localStorage.getItem('chat_history');
    if (savedChatHistory) {
      try {
        const parsed = JSON.parse(savedChatHistory);
        setChatHistory(parsed);
        setStats(prev => ({ ...prev, totalChats: parsed.length }));
      } catch (error) {
        console.error('Failed to load chat history:', error);
      }
    }

    // Load app-specific chats
    const savedAppChats = localStorage.getItem('app_chats');
    if (savedAppChats) {
      try {
        const parsed = JSON.parse(savedAppChats);
        setAppChats(parsed);
        setStats(prev => ({ ...prev, totalApps: parsed.length }));
      } catch (error) {
        console.error('Failed to load app chats:', error);
      }
    }
  };

  // Removed loadStats as it is now integrated into loadHistory to avoid double fetching


  const handleNewOcr = () => {
    if (onNewOcr) {
      onNewOcr();
    } else {
      // Trigger screenshot capture via Tauri command
      console.log('Starting new OCR...');
      // TODO: Call Tauri command to trigger screenshot
      // invoke('start_screenshot_capture');
    }
  };

  const handleQuickChat = (initialText?: string) => {
    if (onOpenQuickChat) {
      onOpenQuickChat(initialText);
    } else {
      console.log('Opening quick chat...', initialText);
    }
  };

  const handleOpenSettings = () => {
    if (onOpenSettings) {
      onOpenSettings();
    } else {
      console.log('Opening settings...');
    }
  };


  const [selectedModel, setSelectedModel] = useState('local');
  const [availableModels, setAvailableModels] = useState<string[]>(['local']);

  useEffect(() => {
    // Load available models
    const loadModels = async () => {
      // This is a placeholder. In a real app, we'd fetch this from universalAI
      // For now, we'll check which keys are present in localStorage
      const models = ['local'];
      if (localStorage.getItem('openai_api_key')) models.push('openai');
      if (localStorage.getItem('gemini_api_key')) models.push('gemini');
      if (localStorage.getItem('claude_api_key')) models.push('claude');
      if (localStorage.getItem('deepseek_api_key')) models.push('deepseek');
      if (localStorage.getItem('grok_api_key')) models.push('grok');
      if (localStorage.getItem('perplexity_api_key')) models.push('perplexity');
      
      setAvailableModels(models);
      
      // Load saved selection
      const saved = localStorage.getItem('default_ai_provider');
      if (saved && models.includes(saved)) {
        setSelectedModel(saved);
      }
    };
    
    loadModels();
  }, []);

  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const model = e.target.value;
    setSelectedModel(model);
    localStorage.setItem('default_ai_provider', model);
  };

  const getModelCapabilities = (model: string) => {
    const caps = {
      search: false,
      think: false,
      upload: false
    };
    
    switch (model) {
      case 'openai':
        caps.search = true;
        caps.think = true; // o1 models
        caps.upload = true;
        break;
      case 'gemini':
        caps.search = true;
        caps.upload = true;
        break;
      case 'claude':
        caps.upload = true;
        break;
      case 'deepseek':
        caps.think = true;
        break;
      case 'perplexity':
        caps.search = true;
        break;
      case 'grok':
        caps.search = true;
        break;
      case 'local':
        // Local might support these depending on the model loaded
        break;
    }
    return caps;
  };

  const capabilities = getModelCapabilities(selectedModel);

  const handleCapabilityAction = (action: 'search' | 'think' | 'upload') => {
    console.log(`Triggering ${action} for model ${selectedModel}`);
    // TODO: Implement actual actions
    // For now, we can open quick chat with a specific context or mode
    if (onOpenQuickChat) {
      onOpenQuickChat();
    }
  };

  const filterItems = (items: any[], query: string) => {
    if (!query) return items;
    return items.filter(item => 
      JSON.stringify(item).toLowerCase().includes(query.toLowerCase())
    );
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="homepage">
      {/* Header */}
      <div className="homepage-header">
        <div className="homepage-header-left">
          <h1 className="homepage-title">Ask OCR</h1>
          <p className="homepage-subtitle">Your intelligent OCR assistant</p>
        </div>
        
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {/* Model Selector */}
          <div className="model-selector-container">
            <select 
              className="model-selector"
              value={selectedModel}
              onChange={handleModelChange}
              title="Select AI Model"
              style={{
                padding: '10px 16px',
                borderRadius: '8px',
                border: '1px solid var(--color-border-primary)',
                background: 'var(--color-surface)',
                color: 'var(--color-text-primary)',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              {availableModels.map(model => (
                <option key={model} value={model}>
                  {model === 'local' ? 'Local (Ollama)' : 
                   model.charAt(0).toUpperCase() + model.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <button className="header-button" onClick={handleOpenSettings}>
            <span className="button-icon">⚙️</span>
            Settings
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <button className="quick-action-card primary" onClick={handleNewOcr}>
          <div className="quick-action-icon">📸</div>
          <div className="quick-action-content">
            <div className="quick-action-title">New OCR</div>
            <div className="quick-action-description">Capture and extract text</div>
          </div>
        </button>

        <button className="quick-action-card" onClick={() => handleQuickChat()}>
          <div className="quick-action-icon">💬</div>
          <div className="quick-action-content">
            <div className="quick-action-title">Quick Chat</div>
            <div className="quick-action-description">Chat with AI models</div>
          </div>
        </button>

        {capabilities.search && (
          <button className="quick-action-card" onClick={() => handleCapabilityAction('search')}>
            <div className="quick-action-icon">🌐</div>
            <div className="quick-action-content">
              <div className="quick-action-title">Web Search</div>
              <div className="quick-action-description">Search the internet</div>
            </div>
          </button>
        )}

        {capabilities.think && (
          <button className="quick-action-card" onClick={() => handleCapabilityAction('think')}>
            <div className="quick-action-icon">🧠</div>
            <div className="quick-action-content">
              <div className="quick-action-title">Deep Think</div>
              <div className="quick-action-description">Reasoning mode</div>
            </div>
          </button>
        )}

        {capabilities.upload && (
          <button className="quick-action-card" onClick={() => handleCapabilityAction('upload')}>
            <div className="quick-action-icon">📁</div>
            <div className="quick-action-content">
              <div className="quick-action-title">Upload File</div>
              <div className="quick-action-description">Analyze documents</div>
            </div>
          </button>
        )}

        <div className="quick-action-card stats">
          <div className="quick-action-icon">📊</div>
          <div className="quick-action-content">
            <div className="quick-action-title">Today</div>
            <div className="quick-action-description">{stats.todayOcrs} OCRs processed</div>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats.totalOcrs}</div>
          <div className="stat-label">Total OCRs</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.totalChats}</div>
          <div className="stat-label">Chat Sessions</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.totalApps}</div>
          <div className="stat-label">Connected Apps</div>
        </div>
      </div>

      {/* History Section */}
      <div className="history-section">
        <div className="history-header">
          <div className="history-tabs">
            <button
              className={`history-tab ${activeTab === 'ocr' ? 'active' : ''}`}
              onClick={() => setActiveTab('ocr')}
            >
              📄 OCR History
            </button>
            <button
              className={`history-tab ${activeTab === 'chats' ? 'active' : ''}`}
              onClick={() => setActiveTab('chats')}
            >
              💬 Chat History
            </button>
            <button
              className={`history-tab ${activeTab === 'apps' ? 'active' : ''}`}
              onClick={() => setActiveTab('apps')}
            >
              📱 App Chats
            </button>
          </div>

          <input
            type="text"
            className="history-search"
            placeholder="Search history..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="history-content">
          {activeTab === 'ocr' && (
            <div className="history-list">
              {filterItems(ocrHistory, searchQuery).length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">📄</div>
                  <div className="empty-state-title">No OCR history yet</div>
                  <div className="empty-state-description">
                    Start by capturing a screenshot with OCR
                  </div>
                </div>
              ) : (
                filterItems(ocrHistory, searchQuery).map((item) => (
                  <div 
                    key={item.id} 
                    className="history-item clickable" 
                    onClick={() => handleQuickChat(item.text)}
                    title="Click to open in Quick Chat"
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="history-item-icon">📄</div>
                    <div className="history-item-content">
                      <div className="history-item-text">
                        {item.text.substring(0, 100)}
                        {item.text.length > 100 && '...'}
                      </div>
                      <div className="history-item-meta">
                        <span className="history-item-language">{item.language}</span>
                        <span className="history-item-time">{formatDate(item.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'chats' && (
            <div className="history-list">
              {filterItems(chatHistory, searchQuery).length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">💬</div>
                  <div className="empty-state-title">No chat history yet</div>
                  <div className="empty-state-description">
                    Start a conversation with Quick Chat
                  </div>
                </div>
              ) : (
                filterItems(chatHistory, searchQuery).map((item) => (
                  <div key={item.id} className="history-item">
                    <div className="history-item-icon">💬</div>
                    <div className="history-item-content">
                      <div className="history-item-title">{item.title}</div>
                      <div className="history-item-text">{item.lastMessage}</div>
                      <div className="history-item-meta">
                        <span>{item.messages} messages</span>
                        <span className="history-item-time">{formatDate(item.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'apps' && (
            <div className="app-chats-list">
              {appChats.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">📱</div>
                  <div className="empty-state-title">No app chats yet</div>
                  <div className="empty-state-description">
                    App-specific chats will appear here
                  </div>
                </div>
              ) : (
                appChats.map((app, index) => (
                  <div key={index} className="app-chat-group">
                    <div className="app-chat-header">
                      <span className="app-chat-icon">{app.appIcon}</span>
                      <span className="app-chat-name">{app.appName}</span>
                      <span className="app-chat-count">{app.chats.length} chats</span>
                    </div>
                    <div className="app-chat-items">
                      {app.chats.map((chat) => (
                        <div key={chat.id} className="history-item nested">
                          <div className="history-item-content">
                            <div className="history-item-title">{chat.title}</div>
                            <div className="history-item-text">{chat.lastMessage}</div>
                            <div className="history-item-meta">
                              <span>{chat.messages} messages</span>
                              <span className="history-item-time">{formatDate(chat.timestamp)}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
