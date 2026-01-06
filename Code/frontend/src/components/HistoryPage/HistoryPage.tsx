import React, { useState, useEffect } from 'react';
import { Search, Grid, List, AlignJustify, Trash2, Copy, BarChart2, Globe } from 'lucide-react';
import './HistoryPage.css';

export interface HistoryPageProps {
  onClose?: () => void;
  className?: string;
}

interface HistoryItem {
  id: string;
  text: string;
  thumbnail?: string;
  date: Date;
  language: string;
  confidence: number;
  tags: string[];
  app?: string;
}

type ViewMode = 'list' | 'grid' | 'compact';
type DateFilter = 'all' | 'today' | 'week' | 'month' | 'year';
type LanguageFilter = 'all' | 'en' | 'zh' | 'ja' | 'ko' | 'es' | 'fr' | 'de';

export const HistoryPage: React.FC<HistoryPageProps> = ({
  className = '',
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter] = useState<DateFilter>('all');
  const [languageFilter] = useState<LanguageFilter>('all');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [currentPage] = useState(1);
  const itemsPerPage = 20;

  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = () => {
    // Load from localStorage
    const saved = localStorage.getItem('ocr_history');
    if (saved) {
      try {
        const items = JSON.parse(saved);
        setHistoryItems(items.map((item: any) => ({
          ...item,
          date: new Date(item.date),
        })));
      } catch (error) {
        console.error('Failed to load history:', error);
      }
    }
  };

  const filterItems = (): HistoryItem[] => {
    return historyItems.filter((item) => {
      // Search filter
      const matchesSearch =
        searchQuery === '' ||
        item.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));

      // Date filter
      const now = new Date();
      let matchesDate = true;
      if (dateFilter === 'today') {
        matchesDate = item.date.toDateString() === now.toDateString();
      } else if (dateFilter === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        matchesDate = item.date >= weekAgo;
      } else if (dateFilter === 'month') {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        matchesDate = item.date >= monthAgo;
      } else if (dateFilter === 'year') {
        const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        matchesDate = item.date >= yearAgo;
      }

      // Language filter
      const matchesLanguage =
        languageFilter === 'all' || item.language === languageFilter;

      return matchesSearch && matchesDate && matchesLanguage;
    });
  };

  const paginateItems = (items: HistoryItem[]): HistoryItem[] => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return items.slice(startIndex, startIndex + itemsPerPage);
  };

  const handleToggleSelect = (id: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  const handleClearAll = () => {
    if (confirm('Clear all history? This cannot be undone.')) {
      setHistoryItems([]);
      localStorage.removeItem('ocr_history');
      setSelectedItems(new Set());
    }
  };

  const filteredItems = filterItems();
  const paginatedItems = paginateItems(filteredItems);

  // Stats Calculation
  const totalScans = historyItems.length;
  const todayScans = historyItems.filter(i => i.date.toDateString() === new Date().toDateString()).length;
  const avgConfidence = historyItems.length > 0 
    ? Math.round(historyItems.reduce((acc, i) => acc + i.confidence, 0) / historyItems.length * 100) 
    : 0;
  const topLanguage = historyItems.length > 0
    ? Object.entries(historyItems.reduce((acc: any, i) => { acc[i.language] = (acc[i.language] || 0) + 1; return acc; }, {}))
        .sort((a: any, b: any) => b[1] - a[1])[0]?.[0] || 'N/A'
    : 'N/A';

  const renderListView = () => (
    <div className="history-list-container">
      <div className="history-list-header" style={{
        display: 'grid',
        gridTemplateColumns: '60px 1fr 200px 120px',
        padding: '12px 16px',
        color: 'var(--color-text-secondary)',
        fontSize: '12px',
        fontWeight: 600,
        borderBottom: '1px solid var(--color-border-primary)',
        marginBottom: '8px'
      }}>
        <div>TYPE</div>
        <div>CONTENT</div>
        <div>DATE</div>
        <div style={{ textAlign: 'right' }}>ACTIONS</div>
      </div>

      <div className="history-list">
        {paginatedItems.map((item, index) => (
          <div
            key={item.id}
            className={`history-item ${selectedItems.has(item.id) ? 'selected' : ''}`}
            onClick={() => handleToggleSelect(item.id)}
            style={{ animationDelay: `${index * 0.05}s` }}
          >
            <div className="item-icon">
              {item.app ? '📱' : '📄'}
            </div>

            <div className="item-details">
              <div className="item-text">{item.text}</div>
              <div className="item-meta">
                <span className="item-tag">
                  {item.language.toUpperCase()}
                </span>
                <span className="item-tag">
                  {Math.round(item.confidence * 100)}%
                </span>
                {item.app && (
                  <span className="item-tag">
                    {item.app}
                  </span>
                )}
              </div>
            </div>

            <div className="item-date">
              {item.date.toLocaleDateString()}
              <br />
              <span style={{ opacity: 0.6, fontSize: '11px' }}>{item.date.toLocaleTimeString()}</span>
            </div>

            <div className="item-actions">
              <button className="action-btn" title="Copy text" onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(item.text); }}>
                <Copy size={16} />
              </button>
              <button className="action-btn delete" title="Delete" onClick={(e) => { e.stopPropagation(); /* Add delete logic */ }}>
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className={`history-page ${className}`}>
      {/* Header */}
      <div className="history-header">
        <div className="header-content">
          <h2>OCR History</h2>
          <p>Manage and search your captured text history</p>
        </div>
        <div className="header-actions">
          <button className="clear-history-btn" onClick={handleClearAll}>
            <Trash2 size={16} />
            Clear History
          </button>
        </div>
      </div>

      {/* Stats Dashboard */}
      <div className="history-stats">
        <div className="stat-card">
          <span className="stat-label">Total Scans</span>
          <span className="stat-value">{totalScans}</span>
          <div className="stat-graph">
            <div className="graph-bar" style={{ height: '40%' }}></div>
            <div className="graph-bar" style={{ height: '70%' }}></div>
            <div className="graph-bar" style={{ height: '50%' }}></div>
            <div className="graph-bar" style={{ height: '90%' }}></div>
            <div className="graph-bar" style={{ height: '60%' }}></div>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-label">Today's Activity</span>
          <span className="stat-value">{todayScans}</span>
          <div className="stat-trend">
            <BarChart2 size={14} />
            <span>Active today</span>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-label">Avg. Confidence</span>
          <span className="stat-value">{avgConfidence}%</span>
          <div className="stat-graph">
            <div className="graph-bar" style={{ height: '80%', backgroundColor: '#10b981' }}></div>
            <div className="graph-bar" style={{ height: '85%', backgroundColor: '#10b981' }}></div>
            <div className="graph-bar" style={{ height: '95%', backgroundColor: '#10b981' }}></div>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-label">Top Language</span>
          <span className="stat-value">{topLanguage.toUpperCase()}</span>
          <div className="stat-trend">
            <Globe size={14} />
            <span>Most used</span>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="history-toolbar">
        <div className="search-container">
          <input
            type="text"
            className="search-input"
            placeholder="Search text, tags, or apps..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Search className="search-icon" size={18} />
        </div>

        <div className="toolbar-controls">
          <div className="view-mode-buttons">
            <button
              className={`view-mode-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              title="List View"
            >
              <List size={18} />
            </button>
            <button
              className={`view-mode-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Grid View"
            >
              <Grid size={18} />
            </button>
            <button
              className={`view-mode-btn ${viewMode === 'compact' ? 'active' : ''}`}
              onClick={() => setViewMode('compact')}
              title="Compact View"
            >
              <AlignJustify size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="history-content">
        {filteredItems.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📄</div>
            <div className="empty-text">No history found</div>
            <div className="empty-subtext">
              {searchQuery
                ? 'No items match your search criteria'
                : 'Start using OCR to build your history'}
            </div>
          </div>
        ) : (
          <>
            {viewMode === 'list' && renderListView()}
            {/* Grid and Compact views can be implemented similarly if needed, 
                but List view is the primary focus for the new design */}
            {viewMode !== 'list' && renderListView()} 
          </>
        )}
      </div>
    </div>
  );
};

export default HistoryPage;
