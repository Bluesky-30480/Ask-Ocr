/**
 * Homepage Component
 * Main landing page with history, quick access, and statistics
 */

import React, { useState, useEffect } from 'react';
import './Homepage.css';

interface OcrHistoryItem {
  id: string;
  timestamp: number;
  text: string;
  imagePath: string;
  language: string;
  summary?: string;
}

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
  onOpenQuickChat?: () => void;
  onNewOcr?: () => void;
}

export const Homepage: React.FC<HomepageProps> = ({ 
  onOpenSettings, 
  onOpenQuickChat,
  onNewOcr
}) => {
  const [activeTab, setActiveTab] = useState<'ocr' | 'chats' | 'apps'>('ocr');
  const [ocrHistory, setOcrHistory] = useState<OcrHistoryItem[]>([]);
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
    loadStats();
  }, []);

  const loadHistory = () => {
    // Load OCR history
    const savedOcrHistory = localStorage.getItem('ocr_history');
    if (savedOcrHistory) {
      try {
        setOcrHistory(JSON.parse(savedOcrHistory));
      } catch (error) {
        console.error('Failed to load OCR history:', error);
      }
    }

    // Load chat history
    const savedChatHistory = localStorage.getItem('chat_history');
    if (savedChatHistory) {
      try {
        setChatHistory(JSON.parse(savedChatHistory));
      } catch (error) {
        console.error('Failed to load chat history:', error);
      }
    }

    // Load app-specific chats
    const savedAppChats = localStorage.getItem('app_chats');
    if (savedAppChats) {
      try {
        setAppChats(JSON.parse(savedAppChats));
      } catch (error) {
        console.error('Failed to load app chats:', error);
      }
    }
  };

  const loadStats = () => {
    const ocrCount = JSON.parse(localStorage.getItem('ocr_history') || '[]').length;
    const chatCount = JSON.parse(localStorage.getItem('chat_history') || '[]').length;
    const appCount = JSON.parse(localStorage.getItem('app_chats') || '[]').length;
    
    const today = new Date().setHours(0, 0, 0, 0);
    const todayOcrs = JSON.parse(localStorage.getItem('ocr_history') || '[]')
      .filter((item: OcrHistoryItem) => new Date(item.timestamp).setHours(0, 0, 0, 0) === today)
      .length;

    setStats({
      totalOcrs: ocrCount,
      totalChats: chatCount,
      totalApps: appCount,
      todayOcrs,
    });
  };

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

  const handleQuickChat = () => {
    if (onOpenQuickChat) {
      onOpenQuickChat();
    } else {
      console.log('Opening quick chat...');
    }
  };

  const handleOpenSettings = () => {
    if (onOpenSettings) {
      onOpenSettings();
    } else {
      console.log('Opening settings...');
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
        <div className="homepage-header-right">
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

        <button className="quick-action-card" onClick={handleQuickChat}>
          <div className="quick-action-icon">💬</div>
          <div className="quick-action-content">
            <div className="quick-action-title">Quick Chat</div>
            <div className="quick-action-description">Chat with AI models</div>
          </div>
        </button>

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
                  <div key={item.id} className="history-item">
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
