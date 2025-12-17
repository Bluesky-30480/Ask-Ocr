import React, { useState } from 'react';
import './Toolbar.css';

interface ToolbarProps {
  onScreenshot: () => void;
  onSearch: (query: string) => void;
  onAIChat: () => void;
  searchQuery?: string;
  isProcessing?: boolean;
}

const Toolbar: React.FC<ToolbarProps> = ({
  onScreenshot,
  onSearch,
  onAIChat,
  searchQuery = '',
  isProcessing = false,
}) => {
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setLocalSearchQuery(query);
    onSearch(query);
    setShowSearchSuggestions(query.length > 0);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(localSearchQuery);
    setShowSearchSuggestions(false);
  };

  const searchSuggestions = [
    'Recent screenshots',
    'Documents',
    'Invoices',
    'Meeting notes',
    'Templates',
  ];

  return (
    <div className="toolbar">
      {/* Left Section - Primary Actions */}
      <div className="toolbar-section toolbar-left">
        <button
          className={`toolbar-btn primary ${isProcessing ? 'processing' : ''}`}
          onClick={onScreenshot}
          disabled={isProcessing}
          title="Take Screenshot (Ctrl+Shift+S)"
        >
          <span className="btn-icon">
            {isProcessing ? (
              <svg className="spinner" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm0 2a6 6 0 110 12 6 6 0 010-12z" opacity="0.3"/>
                <path d="M10 2a8 8 0 018 8h-2a6 6 0 00-6-6V2z">
                  <animateTransform
                    attributeName="transform"
                    attributeType="XML"
                    type="rotate"
                    from="0 10 10"
                    to="360 10 10"
                    dur="1s"
                    repeatCount="indefinite"
                  />
                </path>
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path d="M4 4h12a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2zm0 2v8h12V6H4zm2 2h8v4H6V8z"/>
              </svg>
            )}
          </span>
          <span className="btn-label">
            {isProcessing ? 'Processing...' : 'Screenshot'}
          </span>
        </button>

        <button
          className="toolbar-btn secondary"
          onClick={onAIChat}
          title="AI Chat (Ctrl+Shift+C)"
        >
          <span className="btn-icon">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path d="M18 6V4a2 2 0 00-2-2H4a2 2 0 00-2 2v8a2 2 0 002 2h4l4 4V6h6z"/>
            </svg>
          </span>
          <span className="btn-label">AI Chat</span>
        </button>
      </div>

      {/* Center Section - Search */}
      <div className="toolbar-section toolbar-center">
        <form className="search-form" onSubmit={handleSearchSubmit}>
          <div className="search-container">
            <div className="search-input-wrapper">
              <svg className="search-icon" width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M11.742 10.344a6.5 6.5 0 10-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 001.415-1.414l-3.85-3.85a1.007 1.007 0 00-.115-.1zM12 6.5a5.5 5.5 0 11-11 0 5.5 5.5 0 0111 0z"/>
              </svg>
              <input
                type="text"
                className="search-input"
                placeholder="Search history, templates, or ask AI..."
                value={localSearchQuery}
                onChange={handleSearchChange}
                onFocus={() => setShowSearchSuggestions(localSearchQuery.length > 0)}
                onBlur={() => setTimeout(() => setShowSearchSuggestions(false), 200)}
              />
              {localSearchQuery && (
                <button
                  type="button"
                  className="search-clear"
                  onClick={() => {
                    setLocalSearchQuery('');
                    onSearch('');
                    setShowSearchSuggestions(false);
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                    <path d="M6 4.586L9.293 1.293a1 1 0 111.414 1.414L7.414 6l3.293 3.293a1 1 0 01-1.414 1.414L6 7.414 2.707 10.707a1 1 0 01-1.414-1.414L4.586 6 1.293 2.707a1 1 0 011.414-1.414L6 4.586z"/>
                  </svg>
                </button>
              )}
            </div>

            {/* Search Suggestions */}
            {showSearchSuggestions && (
              <div className="search-suggestions">
                <div className="suggestions-header">
                  <span>Quick searches</span>
                </div>
                <ul className="suggestions-list">
                  {searchSuggestions
                    .filter(suggestion => 
                      suggestion.toLowerCase().includes(localSearchQuery.toLowerCase())
                    )
                    .map((suggestion, index) => (
                      <li key={index}>
                        <button
                          className="suggestion-item"
                          onClick={() => {
                            setLocalSearchQuery(suggestion);
                            onSearch(suggestion);
                            setShowSearchSuggestions(false);
                          }}
                        >
                          <svg className="suggestion-icon" width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                            <path d="M10.5 9.5a5.5 5.5 0 10-1 1h.001l3.85 3.85a1 1 0 001.414-1.414l-3.85-3.85-.415-.586zM11 6.5a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z"/>
                          </svg>
                          <span>{suggestion}</span>
                        </button>
                      </li>
                    ))
                  }
                </ul>
              </div>
            )}
          </div>
        </form>
      </div>

      {/* Right Section - Secondary Actions */}
      <div className="toolbar-section toolbar-right">
        <button className="toolbar-btn icon-only" title="Upload Image">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <path d="M4 4h12a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2zm0 2v8h12V6H4zm8 2l-4 4h2v2h4v-2h2l-4-4z"/>
          </svg>
        </button>

        <button className="toolbar-btn icon-only" title="Templates">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <path d="M4 4h12a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2zm0 2v2h12V6H4zm0 4v4h4v-4H4zm6 0v4h6v-4h-6z"/>
          </svg>
        </button>

        <button className="toolbar-btn icon-only" title="History">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm0 2a6 6 0 110 12 6 6 0 010-12zm1 3v4l3 2-1 1.5-4-2.5V7h2z"/>
          </svg>
        </button>

        <div className="toolbar-divider"></div>

        <button className="toolbar-btn icon-only" title="Settings">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
            <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/>
          </svg>
        </button>
      </div>
    </div>
  );
};

export default Toolbar;
