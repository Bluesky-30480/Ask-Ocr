/**
 * Keyboard Settings Section - Recoded with working buttons
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { globalShortcutsService } from '../../../services/shortcuts/global-shortcuts.service';
import './settings.css';

interface Shortcut {
  id: string;
  label: string;
  description: string;
  keys: string;
  modifiable: boolean;
  category?: string;
}

export const KeyboardSettings: React.FC = () => {
  const [shortcuts, setShortcuts] = useState<Shortcut[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [recordingKeys, setRecordingKeys] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const recorderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadShortcuts();
  }, []);

  // Focus recorder when editing starts
  useEffect(() => {
    if (editingId && recorderRef.current) {
      recorderRef.current.focus();
    }
  }, [editingId]);

  const loadShortcuts = useCallback(() => {
    try {
      const serviceShortcuts = globalShortcutsService.getShortcuts();
      const customShortcuts = JSON.parse(localStorage.getItem('custom_shortcuts') || '{}');
      
      const mappedShortcuts: Shortcut[] = serviceShortcuts.map(s => ({
        id: s.id,
        label: s.name,
        description: s.description,
        keys: customShortcuts[s.id] || s.defaultAccelerator,
        modifiable: true,
        category: s.id.includes('ocr') ? 'OCR' : s.id.includes('capture') ? 'Capture' : 'General'
      }));
      
      setShortcuts(mappedShortcuts);
    } catch (error) {
      console.error('Failed to load shortcuts:', error);
    }
  }, []);

  const handleStartEdit = useCallback((id: string) => {
    const shortcut = shortcuts.find(s => s.id === id);
    if (shortcut?.modifiable) {
      setEditingId(id);
      setRecordingKeys([]);
    }
  }, [shortcuts]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!editingId) return;

    e.preventDefault();
    e.stopPropagation();
    
    const keys: string[] = [];

    // Modifiers
    if (e.ctrlKey) keys.push('Ctrl');
    if (e.shiftKey) keys.push('Shift');
    if (e.altKey) keys.push('Alt');
    if (e.metaKey) keys.push('Cmd');

    // Main key
    const key = e.key;
    const ignoredKeys = ['Control', 'Shift', 'Alt', 'Meta', 'CapsLock', 'NumLock', 'ScrollLock'];
    
    if (!ignoredKeys.includes(key)) {
      // Format key name properly
      let formattedKey = key;
      if (key.length === 1) {
        formattedKey = key.toUpperCase();
      } else if (key === ' ') {
        formattedKey = 'Space';
      } else if (key === 'ArrowUp') {
        formattedKey = 'Up';
      } else if (key === 'ArrowDown') {
        formattedKey = 'Down';
      } else if (key === 'ArrowLeft') {
        formattedKey = 'Left';
      } else if (key === 'ArrowRight') {
        formattedKey = 'Right';
      }
      
      keys.push(formattedKey);
    }

    if (keys.length > 0) {
      setRecordingKeys(keys);
    }
  }, [editingId]);

  const handleSaveShortcut = useCallback(async (id: string) => {
    if (recordingKeys.length === 0) {
      alert('Please press a key combination first');
      return;
    }

    // Require at least one modifier key
    const modifiers = ['Ctrl', 'Shift', 'Alt', 'Cmd'];
    const hasModifier = recordingKeys.some(k => modifiers.includes(k));
    
    if (!hasModifier) {
      alert('Shortcut must include at least one modifier key (Ctrl, Shift, Alt, or Cmd)');
      return;
    }

    setIsSaving(true);
    const newKeys = recordingKeys.join('+');
    
    try {
      const success = await globalShortcutsService.updateShortcut(id, newKeys);
      
      if (success) {
        // Save to localStorage
        const customShortcuts = JSON.parse(localStorage.getItem('custom_shortcuts') || '{}');
        customShortcuts[id] = newKeys;
        localStorage.setItem('custom_shortcuts', JSON.stringify(customShortcuts));
        
        loadShortcuts();
        setSaveStatus('success');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } else {
        alert('Failed to register shortcut. It might be in use by another application.');
        setSaveStatus('error');
      }
    } catch (error) {
      console.error('Failed to save shortcut:', error);
      alert('Failed to save shortcut: ' + error);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
      setEditingId(null);
      setRecordingKeys([]);
    }
  }, [recordingKeys, loadShortcuts]);

  const handleCancelEdit = useCallback(() => {
    setEditingId(null);
    setRecordingKeys([]);
  }, []);

  const handleResetAll = useCallback(async () => {
    if (!confirm('Reset all keyboard shortcuts to their default values?')) {
      return;
    }

    try {
      const serviceShortcuts = globalShortcutsService.getShortcuts();
      
      for (const s of serviceShortcuts) {
        await globalShortcutsService.resetShortcut(s.id);
      }
      
      localStorage.removeItem('custom_shortcuts');
      loadShortcuts();
      
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Failed to reset shortcuts:', error);
      alert('Failed to reset shortcuts: ' + error);
    }
  }, [loadShortcuts]);

  const handleResetSingle = useCallback(async (id: string) => {
    try {
      await globalShortcutsService.resetShortcut(id);
      
      // Remove from custom shortcuts
      const customShortcuts = JSON.parse(localStorage.getItem('custom_shortcuts') || '{}');
      delete customShortcuts[id];
      localStorage.setItem('custom_shortcuts', JSON.stringify(customShortcuts));
      
      loadShortcuts();
    } catch (error) {
      console.error('Failed to reset shortcut:', error);
    }
  }, [loadShortcuts]);

  const formatKeysDisplay = (keys: string) => {
    return keys.split('+').map((key, i) => (
      <span key={i} className="key-badge">
        {key}
      </span>
    ));
  };

  // Group shortcuts by category
  const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
    const category = shortcut.category || 'General';
    if (!acc[category]) acc[category] = [];
    acc[category].push(shortcut);
    return acc;
  }, {} as Record<string, Shortcut[]>);

  return (
    <div className="settings-section">
      <div className="settings-section-header">
        <h2 className="settings-section-title">Keyboard Shortcuts</h2>
        <p className="settings-section-description">
          Customize global hotkeys for quick access to features
        </p>
      </div>

      {/* Actions Bar */}
      <div className="settings-group">
        <div className="shortcuts-actions">
          <button
            type="button"
            className="button-control secondary"
            onClick={handleResetAll}
          >
            🔄 Reset All to Defaults
          </button>
          
          {saveStatus === 'success' && (
            <span className="save-status success">✅ Saved!</span>
          )}
        </div>
      </div>

      {/* Shortcuts by Category */}
      {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
        <div key={category} className="settings-group">
          <h3 className="settings-group-title">
            {category === 'OCR' ? '📝' : category === 'Capture' ? '📷' : '⚙️'} {category}
          </h3>
          
          <div className="shortcuts-list">
            {categoryShortcuts.map((shortcut) => (
              <div 
                key={shortcut.id} 
                className={`shortcut-card ${editingId === shortcut.id ? 'editing' : ''}`}
              >
                <div className="shortcut-info">
                  <h4 className="shortcut-label">{shortcut.label}</h4>
                  <p className="shortcut-desc">{shortcut.description}</p>
                </div>
                
                <div className="shortcut-control">
                  {editingId === shortcut.id ? (
                    <div className="shortcut-editor">
                      <div 
                        ref={recorderRef}
                        className="key-recorder"
                        tabIndex={0}
                        onKeyDown={handleKeyDown}
                        onBlur={() => {
                          // Don't cancel on blur if clicking save/cancel
                          setTimeout(() => {
                            if (editingId === shortcut.id && recordingKeys.length === 0) {
                              handleCancelEdit();
                            }
                          }, 200);
                        }}
                      >
                        {recordingKeys.length > 0 
                          ? recordingKeys.join(' + ') 
                          : 'Press keys...'}
                      </div>
                      
                      <div className="editor-buttons">
                        <button
                          type="button"
                          className="btn-save"
                          onClick={() => handleSaveShortcut(shortcut.id)}
                          disabled={recordingKeys.length === 0 || isSaving}
                        >
                          {isSaving ? '...' : '✓'}
                        </button>
                        <button
                          type="button"
                          className="btn-cancel"
                          onClick={handleCancelEdit}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="shortcut-display">
                      <button
                        type="button"
                        className="keys-button"
                        onClick={() => handleStartEdit(shortcut.id)}
                        disabled={!shortcut.modifiable}
                        title="Click to edit"
                      >
                        {formatKeysDisplay(shortcut.keys)}
                      </button>
                      
                      <button
                        type="button"
                        className="btn-reset"
                        onClick={() => handleResetSingle(shortcut.id)}
                        title="Reset to default"
                      >
                        ↺
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Help Info */}
      <div className="settings-group">
        <div className="info-card">
          <span className="info-icon">💡</span>
          <div className="info-content">
            <strong>Tips:</strong>
            <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
              <li>Click on a shortcut to edit it</li>
              <li>Shortcuts must include a modifier key (Ctrl, Shift, Alt)</li>
              <li>Some shortcuts may conflict with system or other app shortcuts</li>
            </ul>
          </div>
        </div>
      </div>

      <style>{`
        .shortcuts-actions {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        
        .save-status {
          font-size: 14px;
          font-weight: 500;
        }
        
        .save-status.success {
          color: #34c759;
        }
        
        .shortcuts-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        
        .shortcut-card {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          background: var(--color-surface-primary);
          border: 2px solid var(--color-border-primary);
          border-radius: 12px;
          transition: all 0.2s ease;
        }
        
        .shortcut-card:hover {
          border-color: var(--color-primary);
        }
        
        .shortcut-card.editing {
          border-color: var(--color-primary);
          background: rgba(var(--color-primary-rgb), 0.05);
        }
        
        .shortcut-info {
          flex: 1;
        }
        
        .shortcut-label {
          margin: 0 0 4px 0;
          font-size: 15px;
          font-weight: 600;
          color: var(--color-text-primary);
        }
        
        .shortcut-desc {
          margin: 0;
          font-size: 13px;
          color: var(--color-text-secondary);
        }
        
        .shortcut-control {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        
        .shortcut-display {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .keys-button {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 10px 16px;
          background: var(--color-background-primary);
          border: 1px solid var(--color-border-primary);
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
          min-width: 120px;
          justify-content: center;
        }
        
        .keys-button:hover:not(:disabled) {
          border-color: var(--color-primary);
          background: var(--color-surface-secondary);
        }
        
        .keys-button:disabled {
          opacity: 0.6;
          cursor: default;
        }
        
        .key-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 4px 8px;
          background: var(--color-surface-primary);
          border: 1px solid var(--color-border-primary);
          border-bottom-width: 2px;
          border-radius: 5px;
          font-family: 'JetBrains Mono', 'Fira Code', monospace;
          font-size: 12px;
          font-weight: 600;
          color: var(--color-text-primary);
          min-width: 24px;
        }
        
        .btn-reset {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: 1px solid var(--color-border-primary);
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          color: var(--color-text-secondary);
          transition: all 0.2s ease;
        }
        
        .btn-reset:hover {
          background: var(--color-surface-secondary);
          color: var(--color-text-primary);
        }
        
        .shortcut-editor {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .key-recorder {
          padding: 10px 16px;
          min-width: 150px;
          background: var(--color-background-primary);
          border: 2px solid var(--color-primary);
          border-radius: 8px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 14px;
          font-weight: 600;
          color: var(--color-primary);
          text-align: center;
          outline: none;
          cursor: text;
          animation: pulse 1.5s ease-in-out infinite;
        }
        
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(var(--color-primary-rgb), 0.4); }
          50% { box-shadow: 0 0 0 6px rgba(var(--color-primary-rgb), 0); }
        }
        
        .editor-buttons {
          display: flex;
          gap: 4px;
        }
        
        .btn-save, .btn-cancel {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          font-weight: bold;
          transition: all 0.2s ease;
        }
        
        .btn-save {
          background: #34c759;
          border: none;
          color: white;
        }
        
        .btn-save:hover:not(:disabled) {
          background: #2db84e;
        }
        
        .btn-save:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .btn-cancel {
          background: var(--color-surface-secondary);
          border: 1px solid var(--color-border-primary);
          color: var(--color-text-secondary);
        }
        
        .btn-cancel:hover {
          background: rgba(255, 59, 48, 0.1);
          border-color: #ff3b30;
          color: #ff3b30;
        }
        
        .info-card {
          display: flex;
          gap: 12px;
          padding: 14px 16px;
          background: rgba(var(--color-primary-rgb), 0.1);
          border: 1px solid var(--color-primary);
          border-radius: 12px;
        }
        
        .info-icon {
          font-size: 18px;
        }
        
        .info-content {
          font-size: 13px;
          color: var(--color-text-primary);
          line-height: 1.5;
        }
        
        .info-content ul li {
          margin-bottom: 4px;
        }
        
        .button-control.secondary {
          background: var(--color-surface-primary);
          color: var(--color-text-primary);
          border: 1px solid var(--color-border-primary);
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .button-control.secondary:hover {
          background: var(--color-surface-secondary);
          border-color: var(--color-primary);
        }
      `}</style>
    </div>
  );
};
