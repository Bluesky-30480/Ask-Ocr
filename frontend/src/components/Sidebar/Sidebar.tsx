import React, { useState, useEffect } from 'react';
import './Sidebar.css';

interface HistoryItem {
  id: string;
  timestamp: string;
  text: string;
  language: string;
  confidence: number;
  tags: string[];
  summary?: string;
}

interface DirectoryItem {
  id: string;
  name: string;
  type: 'folder' | 'file';
  children?: DirectoryItem[];
  itemCount?: number;
  lastModified?: string;
}

interface SidebarProps {
  collapsed: boolean;
  activeView: 'home' | 'history' | 'settings' | 'templates';
  onViewChange: (view: 'home' | 'history' | 'settings' | 'templates') => void;
  onToggleCollapse: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  collapsed,
  activeView,
  onViewChange,
  onToggleCollapse,
}) => {
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [directoryItems, setDirectoryItems] = useState<DirectoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  // Load history items
  useEffect(() => {
    // Mock data - replace with actual data loading
    const mockHistory: HistoryItem[] = [
      {
        id: '1',
        timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit...',
        language: 'en',
        confidence: 0.95,
        tags: ['document', 'text'],
        summary: 'Lorem ipsum document content',
      },
      {
        id: '2',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
        text: 'Invoice #12345 - Total: $299.99',
        language: 'en',
        confidence: 0.88,
        tags: ['invoice', 'financial'],
        summary: 'Invoice document with total amount',
      },
      {
        id: '3',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
        text: 'Meeting notes from quarterly review...',
        language: 'en',
        confidence: 0.92,
        tags: ['meeting', 'notes'],
        summary: 'Quarterly review meeting notes',
      },
    ];

    setHistoryItems(mockHistory);
  }, []);

  // Load directory structure
  useEffect(() => {
    // Mock data - replace with actual directory loading
    const mockDirectory: DirectoryItem[] = [
      {
        id: 'recent',
        name: 'Recent',
        type: 'folder',
        itemCount: 15,
        lastModified: new Date().toISOString(),
        children: [
          { id: 'today', name: 'Today', type: 'folder', itemCount: 5 },
          { id: 'yesterday', name: 'Yesterday', type: 'folder', itemCount: 3 },
          { id: 'this-week', name: 'This Week', type: 'folder', itemCount: 7 },
        ],
      },
      {
        id: 'documents',
        name: 'Documents',
        type: 'folder',
        itemCount: 42,
        lastModified: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
        children: [
          { id: 'invoices', name: 'Invoices', type: 'folder', itemCount: 12 },
          { id: 'contracts', name: 'Contracts', type: 'folder', itemCount: 8 },
          { id: 'reports', name: 'Reports', type: 'folder', itemCount: 22 },
        ],
      },
      {
        id: 'screenshots',
        name: 'Screenshots',
        type: 'folder',
        itemCount: 128,
        lastModified: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
        children: [
          { id: 'desktop', name: 'Desktop', type: 'folder', itemCount: 45 },
          { id: 'web', name: 'Web Pages', type: 'folder', itemCount: 83 },
        ],
      },
      {
        id: 'favorites',
        name: 'Favorites',
        type: 'folder',
        itemCount: 8,
        lastModified: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
      },
    ];

    setDirectoryItems(mockDirectory);
  }, []);

  const filteredHistoryItems = historyItems.filter(item =>
    item.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

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

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folderId)) {
        newSet.delete(folderId);
      } else {
        newSet.add(folderId);
      }
      return newSet;
    });
  };

  const renderDirectoryItem = (item: DirectoryItem, level: number = 0) => {
    const isExpanded = expandedFolders.has(item.id);
    const hasChildren = item.children && item.children.length > 0;

    return (
      <div key={item.id} className="directory-item">
        <div
          className={`directory-item-content ${level > 0 ? 'nested' : ''}`}
          style={{ paddingLeft: `${level * 16 + 12}px` }}
          onClick={() => hasChildren && toggleFolder(item.id)}
        >
          <div className="directory-item-icon">
            {hasChildren ? (
              <span className={`folder-icon ${isExpanded ? 'expanded' : ''}`}>
                📁
              </span>
            ) : (
              <span className="file-icon">📄</span>
            )}
          </div>
          
          {!collapsed && (
            <div className="directory-item-info">
              <div className="directory-item-name">{item.name}</div>
              {item.itemCount !== undefined && (
                <div className="directory-item-count">{item.itemCount} items</div>
              )}
            </div>
          )}
        </div>

        {hasChildren && isExpanded && !collapsed && (
          <div className="directory-children">
            {item.children!.map(child => renderDirectoryItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      {/* Sidebar Header */}
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <div className="logo-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
          </div>
          {!collapsed && (
            <div className="logo-text">
              <span className="logo-title">Ask OCR</span>
              <span className="logo-subtitle">AI-Powered OCR</span>
            </div>
          )}
        </div>

        <button
          className="sidebar-toggle"
          onClick={onToggleCollapse}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d={collapsed 
              ? "M6 4l4 4-4 4V4z" 
              : "M10 4L6 8l4 4V4z"
            }/>
          </svg>
        </button>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <div className="nav-section">
          <ul className="nav-list">
            <li>
              <button
                className={`nav-item ${activeView === 'home' ? 'active' : ''}`}
                onClick={() => onViewChange('home')}
              >
                <span className="nav-icon">🏠</span>
                {!collapsed && <span className="nav-label">Home</span>}
              </button>
            </li>
            <li>
              <button
                className={`nav-item ${activeView === 'history' ? 'active' : ''}`}
                onClick={() => onViewChange('history')}
              >
                <span className="nav-icon">📚</span>
                {!collapsed && <span className="nav-label">History</span>}
              </button>
            </li>
            <li>
              <button
                className={`nav-item ${activeView === 'templates' ? 'active' : ''}`}
                onClick={() => onViewChange('templates')}
              >
                <span className="nav-icon">📝</span>
                {!collapsed && <span className="nav-label">Templates</span>}
              </button>
            </li>
            <li>
              <button
                className={`nav-item ${activeView === 'settings' ? 'active' : ''}`}
                onClick={() => onViewChange('settings')}
              >
                <span className="nav-icon">⚙️</span>
                {!collapsed && <span className="nav-label">Settings</span>}
              </button>
            </li>
          </ul>
        </div>
      </nav>

      {/* Content Area */}
      <div className="sidebar-content">
        {activeView === 'history' && !collapsed && (
          <div className="history-panel">
            <div className="panel-header">
              <h3 className="panel-title">History</h3>
              <div className="search-box">
                <input
                  type="text"
                  placeholder="Search history..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                />
                <span className="search-icon">🔍</span>
              </div>
            </div>

            <div className="history-list">
              {filteredHistoryItems.map(item => (
                <div
                  key={item.id}
                  className={`history-item ${selectedHistoryItem === item.id ? 'selected' : ''}`}
                  onClick={() => setSelectedHistoryItem(item.id)}
                >
                  <div className="history-item-header">
                    <div className="history-item-time">
                      {formatRelativeTime(item.timestamp)}
                    </div>
                    <div className="history-item-confidence">
                      {Math.round(item.confidence * 100)}%
                    </div>
                  </div>
                  
                  <div className="history-item-preview">
                    {item.summary || item.text.substring(0, 80) + '...'}
                  </div>
                  
                  <div className="history-item-tags">
                    {item.tags.map(tag => (
                      <span key={tag} className="tag">{tag}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {(activeView === 'home' || activeView === 'templates') && !collapsed && (
          <div className="directory-panel">
            <div className="panel-header">
              <h3 className="panel-title">
                {activeView === 'home' ? 'Collections' : 'Template Library'}
              </h3>
            </div>

            <div className="directory-tree">
              {directoryItems.map(item => renderDirectoryItem(item))}
            </div>
          </div>
        )}
      </div>

      {/* Sidebar Footer */}
      <div className="sidebar-footer">
        <div className="connection-status">
          <div className="status-indicator online"></div>
          {!collapsed && (
            <div className="status-text">
              <span className="status-label">Connected</span>
              <span className="status-detail">Local AI Ready</span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;