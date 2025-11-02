import React, { useState, useEffect } from 'react';
import './Workspace.css';

interface WorkspaceProps {
  activeView: 'home' | 'history' | 'settings' | 'templates';
  children?: React.ReactNode;
}

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: string;
  shortcut?: string;
  action: () => void;
}

interface RecentItem {
  id: string;
  type: 'ocr' | 'chat' | 'template';
  title: string;
  preview: string;
  timestamp: string;
  confidence?: number;
}

const Workspace: React.FC<WorkspaceProps> = ({ activeView, children }) => {
  const [recentItems, setRecentItems] = useState<RecentItem[]>([]);
  const [stats, setStats] = useState({
    totalOCRs: 0,
    totalChats: 0,
    totalTemplates: 0,
    todayOCRs: 0,
  });

  // Load recent items and stats
  useEffect(() => {
    // Mock data - replace with actual data loading
    const mockRecentItems: RecentItem[] = [
      {
        id: '1',
        type: 'ocr',
        title: 'Invoice Analysis',
        preview: 'Invoice #12345 - Total: $299.99',
        timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        confidence: 0.95,
      },
      {
        id: '2',
        type: 'chat',
        title: 'Document Summary',
        preview: 'Can you summarize this quarterly report?',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
      },
      {
        id: '3',
        type: 'template',
        title: 'Business Letter Template',
        preview: 'Template for formal business correspondence',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
      },
    ];

    setRecentItems(mockRecentItems);
    setStats({
      totalOCRs: 156,
      totalChats: 43,
      totalTemplates: 12,
      todayOCRs: 8,
    });
  }, []);

  const quickActions: QuickAction[] = [
    {
      id: 'screenshot',
      title: 'Take Screenshot',
      description: 'Capture and analyze screen content',
      icon: '📷',
      shortcut: 'Ctrl+Shift+S',
      action: () => console.log('Take screenshot'),
    },
    {
      id: 'chat',
      title: 'Quick Chat',
      description: 'Start a conversation with AI',
      icon: '💬',
      shortcut: 'Ctrl+Shift+C',
      action: () => console.log('Open chat'),
    },
    {
      id: 'upload',
      title: 'Upload Image',
      description: 'Upload and process an image',
      icon: '📁',
      shortcut: 'Ctrl+O',
      action: () => console.log('Upload image'),
    },
    {
      id: 'templates',
      title: 'Browse Templates',
      description: 'Explore AI prompt templates',
      icon: '📝',
      shortcut: 'Ctrl+T',
      action: () => console.log('Browse templates'),
    },
  ];

  const formatRelativeTime = (timestamp: string) => {
    const now = new Date();
    const date = new Date(timestamp);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getItemIcon = (type: RecentItem['type']) => {
    switch (type) {
      case 'ocr': return '📄';
      case 'chat': return '💬';
      case 'template': return '📝';
      default: return '📄';
    }
  };

  const renderHomeView = () => (
    <div className="home-view">
      {/* Welcome Section */}
      <div className="welcome-section">
        <div className="welcome-content">
          <h1 className="welcome-title">Welcome to Ask OCR</h1>
          <p className="welcome-subtitle">
            AI-powered OCR and document analysis at your fingertips
          </p>
        </div>
        <div className="welcome-actions">
          <button className="btn-primary welcome-cta">
            <span className="btn-icon">📷</span>
            Take Screenshot
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions-section">
        <h2 className="section-title">Quick Actions</h2>
        <div className="quick-actions-grid">
          {quickActions.map(action => (
            <button
              key={action.id}
              className="quick-action-card"
              onClick={action.action}
            >
              <div className="quick-action-icon">{action.icon}</div>
              <div className="quick-action-content">
                <h3 className="quick-action-title">{action.title}</h3>
                <p className="quick-action-description">{action.description}</p>
                {action.shortcut && (
                  <div className="quick-action-shortcut">{action.shortcut}</div>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Stats Section */}
      <div className="stats-section">
        <h2 className="section-title">Your Activity</h2>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{stats.totalOCRs}</div>
            <div className="stat-label">Total OCRs</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.totalChats}</div>
            <div className="stat-label">AI Conversations</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.totalTemplates}</div>
            <div className="stat-label">Templates</div>
          </div>
          <div className="stat-card highlight">
            <div className="stat-value">{stats.todayOCRs}</div>
            <div className="stat-label">Today's OCRs</div>
          </div>
        </div>
      </div>

      {/* Recent Items */}
      <div className="recent-section">
        <div className="section-header">
          <h2 className="section-title">Recent Activity</h2>
          <button className="section-action">View All</button>
        </div>
        <div className="recent-items">
          {recentItems.map(item => (
            <div key={item.id} className="recent-item">
              <div className="recent-item-icon">
                {getItemIcon(item.type)}
              </div>
              <div className="recent-item-content">
                <div className="recent-item-header">
                  <h4 className="recent-item-title">{item.title}</h4>
                  <span className="recent-item-time">
                    {formatRelativeTime(item.timestamp)}
                  </span>
                </div>
                <p className="recent-item-preview">{item.preview}</p>
                {item.confidence && (
                  <div className="recent-item-confidence">
                    {Math.round(item.confidence * 100)}% confidence
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderEmptyState = (view: string) => (
    <div className="empty-state">
      <div className="empty-state-icon">
        {view === 'history' && '📚'}
        {view === 'templates' && '📝'}
        {view === 'settings' && '⚙️'}
      </div>
      <h3 className="empty-state-title">
        {view === 'history' && 'No History Yet'}
        {view === 'templates' && 'No Templates'}
        {view === 'settings' && 'Settings'}
      </h3>
      <p className="empty-state-description">
        {view === 'history' && 'Your OCR history will appear here once you start using the app.'}
        {view === 'templates' && 'Create or import AI prompt templates to get started.'}
        {view === 'settings' && 'Configure your preferences and AI settings.'}
      </p>
      {view !== 'settings' && (
        <button className="btn-primary empty-state-action">
          {view === 'history' && 'Take First Screenshot'}
          {view === 'templates' && 'Browse Template Library'}
        </button>
      )}
    </div>
  );

  return (
    <main className="workspace">
      <div className="workspace-content">
        {children ? (
          children
        ) : activeView === 'home' ? (
          renderHomeView()
        ) : (
          renderEmptyState(activeView)
        )}
      </div>
    </main>
  );
};

export default Workspace;