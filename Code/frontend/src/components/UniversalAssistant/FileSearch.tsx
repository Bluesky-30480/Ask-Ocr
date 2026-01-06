import React, { useState, useEffect, useRef } from 'react';
import { fileSearchService, type SearchResult } from '../../services/file-search.service';
import './FileSearch.css';
import './FileSearchMulti.css';

interface FileSearchProps {
  onClose: () => void;
  onFileSelect: (files: SearchResult[]) => void;
}

export const FileSearch: React.FC<FileSearchProps> = ({ onClose, onFileSelect }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (query.trim()) {
        performSearch();
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [query]);

  const performSearch = async () => {
    setIsLoading(true);
    try {
      const searchResults = await fileSearchService.searchFiles({
        query: query,
        max_results: 20
      });
      setResults(searchResults);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  const toggleSelection = (file: SearchResult) => {
    setSelectedFiles(prev => {
      const exists = prev.find(f => f.path === file.path);
      if (exists) {
        return prev.filter(f => f.path !== file.path);
      } else {
        return [...prev, file];
      }
    });
  };

  const handleConfirmSelection = () => {
    if (selectedFiles.length > 0) {
      onFileSelect(selectedFiles);
    }
  };

  const getFileIcon = (filename: string, isDir: boolean) => {
    if (isDir) return '📁';
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf': return '📄';
      case 'doc':
      case 'docx': return '📝';
      case 'xls':
      case 'xlsx': return '📊';
      case 'ppt':
      case 'pptx': return '📽️';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif': return '🖼️';
      case 'zip':
      case 'rar':
      case '7z': return '📦';
      case 'txt':
      case 'md':
      case 'json':
      case 'xml':
      case 'yml': return '📃';
      case 'js':
      case 'ts':
      case 'py':
      case 'rs':
      case 'c':
      case 'cpp':
      case 'java': return '💻';
      default: return '📄';
    }
  };

  return (
    <div className="file-search-overlay">
      <div className="file-search-header">
        <h3>Search Files</h3>
        <div className="header-actions">
          {selectedFiles.length > 0 && (
            <button className="confirm-selection-btn" onClick={handleConfirmSelection}>
              Add {selectedFiles.length} File{selectedFiles.length > 1 ? 's' : ''}
            </button>
          )}
          <button className="close-search-btn" onClick={onClose}>×</button>
        </div>
      </div>
      
      <div className="search-input-container">
        <input
          ref={inputRef}
          type="text"
          className="file-search-input"
          placeholder="Type filename to search..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
        />
      </div>

      <div className="search-results-list">
        {isLoading && <div className="loading-indicator">Searching...</div>}
        
        {!isLoading && results.length === 0 && query.trim() && (
          <div className="no-results">No files found matching "{query}"</div>
        )}

        {!isLoading && results.map((file, index) => {
          const isSelected = selectedFiles.some(f => f.path === file.path);
          return (
            <div 
              key={`${file.path}-${index}`} 
              className={`search-result-item ${isSelected ? 'selected' : ''}`}
              onClick={() => toggleSelection(file)}
            >
              <div className="selection-checkbox">
                {isSelected ? '☑️' : '⬜'}
              </div>
              <div className="file-icon">{getFileIcon(file.name, file.is_dir)}</div>
              <div className="file-info">
                <div className="file-name">{file.name}</div>
                <div className="file-path">{file.path}</div>
                <div className="file-meta">
                  {fileSearchService.formatFileSize(file.size)} • {fileSearchService.formatDate(file.modified)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
