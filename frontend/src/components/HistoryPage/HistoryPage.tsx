import React, { useState, useEffect } from 'react';
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
  onClose,
  className = '',
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [languageFilter, setLanguageFilter] = useState<LanguageFilter>('all');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
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

  const handleSelectAll = () => {
    if (selectedItems.size === filteredItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredItems.map((item) => item.id)));
    }
  };

  const handleDeleteSelected = () => {
    if (confirm(`Delete ${selectedItems.size} selected items?`)) {
      const updated = historyItems.filter((item) => !selectedItems.has(item.id));
      setHistoryItems(updated);
      localStorage.setItem('ocr_history', JSON.stringify(updated));
      setSelectedItems(new Set());
    }
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
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);

  const renderListView = () => (
    <div className="history-list">
      {paginatedItems.map((item) => (
        <div
          key={item.id}
          className={`history-item ${selectedItems.has(item.id) ? 'selected' : ''}`}
          onClick={() => handleToggleSelect(item.id)}
        >
          {item.thumbnail && (
            <div className="item-thumbnail">
              <img src={item.thumbnail} alt="" />
            </div>
          )}

          <div className="item-content">
            <div className="item-header">
              <div className="item-date">
                {item.date.toLocaleDateString()} {item.date.toLocaleTimeString()}
              </div>
            </div>

            <div className="item-text">{item.text}</div>

            <div className="item-meta">
              <span className="meta-badge">
                🌐 {item.language.toUpperCase()}
              </span>
              <span className="meta-badge">
                📊 {Math.round(item.confidence * 100)}%
              </span>
              {item.app && (
                <span className="meta-badge">
                  📱 {item.app}
                </span>
              )}
              {item.tags.map((tag) => (
                <span key={tag} className="meta-badge">
                  🏷️ {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="item-actions">
            <button className="action-btn" title="Copy text">
              📋
            </button>
            <button className="action-btn" title="Export">
              💾
            </button>
            <button className="action-btn" title="Delete">
              🗑️
            </button>
          </div>
        </div>
      ))}
    </div>
  );

  const renderGridView = () => (
    <div className="history-grid">
      {paginatedItems.map((item) => (
        <div
          key={item.id}
          className={`grid-item ${selectedItems.has(item.id) ? 'selected' : ''}`}
          onClick={() => handleToggleSelect(item.id)}
        >
          {item.thumbnail && (
            <div className="grid-thumbnail">
              <img src={item.thumbnail} alt="" />
            </div>
          )}

          <div className="grid-content">
            <div className="item-date">
              {item.date.toLocaleDateString()}
            </div>
            <div className="item-text">{item.text}</div>
            <div className="item-meta">
              <span className="meta-badge">
                {item.language.toUpperCase()}
              </span>
              <span className="meta-badge">
                {Math.round(item.confidence * 100)}%
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderCompactView = () => (
    <div className="history-compact">
      {paginatedItems.map((item) => (
        <div
          key={item.id}
          className="compact-item"
          onClick={() => handleToggleSelect(item.id)}
        >
          <div className="compact-info">
            <div className="compact-text">{item.text}</div>
          </div>
          <div className="item-date">
            {item.date.toLocaleDateString()}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className={`history-page ${className}`}>
      <div className="history-header">
        <div className="header-content">
          <h2>OCR History</h2>
          <p>{filteredItems.length} items</p>
        </div>

        <div className="header-actions">
          {selectedItems.size > 0 && (
            <>
              <button className="btn-danger" onClick={handleDeleteSelected}>
                Delete Selected ({selectedItems.size})
              </button>
              <button className="btn-secondary" onClick={handleSelectAll}>
                {selectedItems.size === filteredItems.length ? 'Deselect All' : 'Select All'}
              </button>
            </>
          )}
          <button className="btn-warning" onClick={handleClearAll}>
            Clear All
          </button>
          {onClose && (
            <button className="close-btn" onClick={onClose} aria-label="Close">
              ✕
            </button>
          )}
        </div>
      </div>

      <div className="history-toolbar">
        <div className="search-container">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="search-input"
            placeholder="Search history..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="toolbar-controls">
          <div className="view-mode-buttons">
            <button
              className={`view-mode-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              title="List view"
            >
              ☰
            </button>
            <button
              className={`view-mode-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Grid view"
            >
              ▦
            </button>
            <button
              className={`view-mode-btn ${viewMode === 'compact' ? 'active' : ''}`}
              onClick={() => setViewMode('compact')}
              title="Compact view"
            >
              ☰
            </button>
          </div>
        </div>
      </div>

      <div className="filters-container">
        <select
          className="filter-select"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value as DateFilter)}
        >
          <option value="all">All Time</option>
          <option value="today">Today</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
          <option value="year">This Year</option>
        </select>

        <select
          className="filter-select"
          value={languageFilter}
          onChange={(e) => setLanguageFilter(e.target.value as LanguageFilter)}
        >
          <option value="all">All Languages</option>
          <option value="en">English</option>
          <option value="zh">Chinese</option>
          <option value="ja">Japanese</option>
          <option value="ko">Korean</option>
          <option value="es">Spanish</option>
          <option value="fr">French</option>
          <option value="de">German</option>
        </select>
      </div>

      <div className="history-content">
        {filteredItems.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <h3>No History Found</h3>
            <p>
              {searchQuery
                ? 'No items match your search criteria'
                : 'Start using OCR to build your history'}
            </p>
          </div>
        ) : (
          <>
            {viewMode === 'list' && renderListView()}
            {viewMode === 'grid' && renderGridView()}
            {viewMode === 'compact' && renderCompactView()}
          </>
        )}
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button
            className="pagination-btn"
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
          >
            ← Previous
          </button>

          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pageNum;
            if (totalPages <= 5) {
              pageNum = i + 1;
            } else if (currentPage <= 3) {
              pageNum = i + 1;
            } else if (currentPage >= totalPages - 2) {
              pageNum = totalPages - 4 + i;
            } else {
              pageNum = currentPage - 2 + i;
            }

            return (
              <button
                key={pageNum}
                className={`pagination-btn ${currentPage === pageNum ? 'active' : ''}`}
                onClick={() => setCurrentPage(pageNum)}
              >
                {pageNum}
              </button>
            );
          })}

          <button
            className="pagination-btn"
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
};

export default HistoryPage;
