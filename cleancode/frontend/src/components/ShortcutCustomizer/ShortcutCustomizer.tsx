import React, { useState, useEffect, useCallback } from 'react';
import keyboardShortcutsService from '../../services/shortcuts/keyboard-shortcuts.service';
import type { ShortcutConfig, ShortcutConflict } from '../../services/shortcuts/keyboard-shortcuts.service';
import './ShortcutCustomizer.css';

export interface ShortcutCustomizerProps {
  onClose?: () => void;
  className?: string;
}

export const ShortcutCustomizer: React.FC<ShortcutCustomizerProps> = ({
  onClose,
  className = '',
}) => {
  const [shortcuts, setShortcuts] = useState<ShortcutConfig[]>([]);
  const [conflicts, setConflicts] = useState<ShortcutConflict[]>([]);
  const [recordingId, setRecordingId] = useState<string | null>(null);
  const [recordedKeys, setRecordedKeys] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    loadShortcuts();
  }, []);

  const loadShortcuts = () => {
    const all = keyboardShortcutsService.getAllShortcuts();
    setShortcuts(all);
  };

  const handleStartRecording = (id: string) => {
    setRecordingId(id);
    setRecordedKeys([]);
  };

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!recordingId) return;

    event.preventDefault();
    event.stopPropagation();
    if (event.repeat) return;

    const keys: string[] = [];
    
    // Capture modifiers
    if (event.ctrlKey || event.metaKey) keys.push('Ctrl');
    if (event.shiftKey) keys.push('Shift');
    if (event.altKey) keys.push('Alt');

    // Capture the actual key (not just modifiers)
    const key = event.key;
    const code = event.code;
    const isModifierKey = ['Control', 'Shift', 'Alt', 'Meta'].includes(key);
    
    if (!isModifierKey) {
      // Use code for standard keys to handle layout/shift issues better
      if (code.startsWith('Key')) {
        keys.push(code.slice(3));
      } else if (code.startsWith('Digit')) {
        keys.push(code.slice(5));
      } else if (code.startsWith('Numpad')) {
        keys.push('Num' + code.slice(6));
      } 
      // Fallback to key for others
      else if (/^[a-z0-9]$/i.test(key)) {
        keys.push(key.toUpperCase());
      }
      // Handle function keys (F1-F12)
      else if (/^F\d{1,2}$/i.test(key)) {
        keys.push(key.toUpperCase());
      }
      // Handle special keys
      else if (key.length === 1) {
        keys.push(key.toUpperCase());
      }
      // Handle named keys (Enter, Space, etc.)
      else {
        const normalizedKey = key.charAt(0).toUpperCase() + key.slice(1);
        keys.push(normalizedKey);
      }
    }

    // Only update if we have at least one non-modifier key
    if (keys.length > 0 && !isModifierKey) {
      setRecordedKeys(keys);
    }
  }, [recordingId]);

  const handleKeyUp = useCallback(() => {
    if (!recordingId || recordedKeys.length === 0) return;

    // Save the recorded shortcut
    const conflict = keyboardShortcutsService.checkConflict(recordingId, recordedKeys);
    
    if (conflict) {
      setConflicts([conflict]);
    } else {
      keyboardShortcutsService.updateShortcut(recordingId, { keys: recordedKeys });
      loadShortcuts();
      setRecordingId(null);
      setRecordedKeys([]);
    }
  }, [recordingId, recordedKeys]);

  useEffect(() => {
    if (recordingId) {
      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('keyup', handleKeyUp);

      return () => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
      };
    }
  }, [recordingId, handleKeyDown, handleKeyUp]);

  const handleCancelRecording = () => {
    setRecordingId(null);
    setRecordedKeys([]);
  };

  const handleToggleShortcut = (id: string, enabled: boolean) => {
    keyboardShortcutsService.updateShortcut(id, { enabled });
    loadShortcuts();
  };

  const handleResetShortcut = (id: string) => {
    keyboardShortcutsService.resetShortcut(id);
    loadShortcuts();
  };

  const handleResetAll = () => {
    if (confirm('Reset all shortcuts to defaults? This cannot be undone.')) {
      keyboardShortcutsService.resetToDefaults();
      loadShortcuts();
      setConflicts([]);
    }
  };

  const filteredShortcuts = shortcuts.filter((shortcut) => {
    const matchesSearch =
      shortcut.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shortcut.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory =
      selectedCategory === 'all' || shortcut.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const categories = ['all', 'global', 'editor', 'navigation', 'ocr', 'ai'];

  return (
    <div className={`shortcut-customizer ${className}`}>
      <div className="customizer-header">
        <div className="header-content">
          <h2>Keyboard Shortcuts</h2>
          <p>Customize keyboard shortcuts for faster workflow</p>
        </div>
        <div className="header-actions">
          <button className="btn-warning" onClick={handleResetAll}>
            <span className="warning-icon">⚠️</span>
            Reset All
          </button>
          {onClose && (
            <button className="close-btn" onClick={onClose} aria-label="Close">
              ✕
            </button>
          )}
        </div>
      </div>

      {conflicts.length > 0 && (
        <div className="conflicts-panel">
          <div className="panel-header">
            <h3>⚠️ Shortcut Conflicts Detected</h3>
            <button
              className="close-btn"
              onClick={() => setConflicts([])}
              aria-label="Close conflicts"
            >
              ✕
            </button>
          </div>
          <div className="conflicts-list">
            {conflicts.map((conflict, index) => (
              <div key={index} className="conflict-item">
                <div className="conflict-details">
                  <div className="conflict-shortcut">
                    {conflict.keys.map((key, i) => (
                      <span key={i} className="shortcut-key">{key}</span>
                    ))}
                  </div>
                  <p>
                    <span>{conflict.existingName}</span> is already using this shortcut.
                    Please choose a different combination.
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="customizer-toolbar">
        <div className="search-container">
          <input
            type="text"
            className="search-input"
            placeholder="Search shortcuts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="category-tabs">
          {categories.map((category) => (
            <button
              key={category}
              className={`category-tab ${selectedCategory === category ? 'active' : ''}`}
              onClick={() => setSelectedCategory(category)}
            >
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="shortcuts-content">
        <div className="shortcuts-list">
          {filteredShortcuts.map((shortcut) => (
            <div key={shortcut.id} className={`shortcut-item ${!shortcut.enabled ? 'disabled' : ''}`}>
              <div className="shortcut-info">
                <div className="shortcut-name">{shortcut.name}</div>
                <div className="shortcut-description">{shortcut.description}</div>
                <div className="shortcut-category-badge">{shortcut.category}</div>
              </div>

              <div className="shortcut-controls">
                <div className="shortcut-keys">
                  {recordingId === shortcut.id ? (
                    <>
                      <div className="recording-indicator">
                        <span className="recording-pulse" />
                        Press keys...
                      </div>
                      {recordedKeys.length > 0 && (
                        <div className="recorded-keys">
                          {recordedKeys.map((key, i) => (
                            <span key={i} className="key-badge">{key}</span>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    shortcut.keys.map((key, i) => (
                      <span key={i} className="key-badge">{key}</span>
                    ))
                  )}
                </div>

                <div className="shortcut-actions">
                  {recordingId === shortcut.id ? (
                    <button
                      className="btn-cancel"
                      onClick={handleCancelRecording}
                    >
                      Cancel
                    </button>
                  ) : (
                    <>
                      <button
                        className="btn-record"
                        onClick={() => handleStartRecording(shortcut.id)}
                        disabled={!shortcut.enabled}
                      >
                        Record
                      </button>
                      <button
                        className="btn-reset"
                        onClick={() => handleResetShortcut(shortcut.id)}
                        title="Reset to default"
                      >
                        ↺
                      </button>
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={shortcut.enabled}
                          onChange={(e) => handleToggleShortcut(shortcut.id, e.target.checked)}
                        />
                        <span className="toggle-slider" />
                      </label>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ShortcutCustomizer;
