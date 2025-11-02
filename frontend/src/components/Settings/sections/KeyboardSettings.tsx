/**
 * Keyboard Settings Section
 */

import React, { useState, useEffect } from 'react';

interface Shortcut {
  id: string;
  label: string;
  description: string;
  keys: string;
  modifiable: boolean;
}

const DEFAULT_SHORTCUTS: Shortcut[] = [
  {
    id: 'screenshot_fullscreen',
    label: 'Capture Fullscreen',
    description: 'Take a screenshot of the entire screen',
    keys: 'Ctrl+Shift+S',
    modifiable: true,
  },
  {
    id: 'screenshot_region',
    label: 'Capture Region',
    description: 'Select and capture a screen region',
    keys: 'Ctrl+Shift+R',
    modifiable: true,
  },
  {
    id: 'universal_assistant',
    label: 'Universal AI Assistant',
    description: 'Show/hide the AI assistant window',
    keys: 'Ctrl+Shift+A',
    modifiable: true,
  },
  {
    id: 'quick_ocr',
    label: 'Quick OCR',
    description: 'Capture and immediately process with OCR',
    keys: 'Ctrl+Shift+O',
    modifiable: true,
  },
  {
    id: 'show_history',
    label: 'Show History',
    description: 'Open OCR history panel',
    keys: 'Ctrl+Shift+H',
    modifiable: true,
  },
  {
    id: 'settings',
    label: 'Settings',
    description: 'Open settings window',
    keys: 'Ctrl+,',
    modifiable: false,
  },
];

export const KeyboardSettings: React.FC = () => {
  const [shortcuts, setShortcuts] = useState<Shortcut[]>(DEFAULT_SHORTCUTS);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [recordingKeys, setRecordingKeys] = useState<string[]>([]);

  useEffect(() => {
    // Load saved shortcuts
    const savedShortcuts = localStorage.getItem('keyboard_shortcuts');
    if (savedShortcuts) {
      try {
        const parsed = JSON.parse(savedShortcuts);
        setShortcuts(parsed);
      } catch (error) {
        console.error('Failed to load shortcuts:', error);
      }
    }
  }, []);

  const saveShortcuts = (newShortcuts: Shortcut[]) => {
    setShortcuts(newShortcuts);
    localStorage.setItem('keyboard_shortcuts', JSON.stringify(newShortcuts));
  };

  const handleEdit = (id: string) => {
    const shortcut = shortcuts.find(s => s.id === id);
    if (shortcut?.modifiable) {
      setEditingId(id);
      setRecordingKeys([]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (editingId !== id) return;

    e.preventDefault();
    const keys: string[] = [];

    if (e.ctrlKey) keys.push('Ctrl');
    if (e.shiftKey) keys.push('Shift');
    if (e.altKey) keys.push('Alt');
    if (e.metaKey) keys.push('Cmd');

    const key = e.key;
    if (key !== 'Control' && key !== 'Shift' && key !== 'Alt' && key !== 'Meta') {
      keys.push(key.length === 1 ? key.toUpperCase() : key);
    }

    if (keys.length > 0) {
      setRecordingKeys(keys);
    }
  };

  const handleSaveShortcut = (id: string) => {
    if (recordingKeys.length === 0) return;

    const newKeys = recordingKeys.join('+');
    const newShortcuts = shortcuts.map(s =>
      s.id === id ? { ...s, keys: newKeys } : s
    );

    saveShortcuts(newShortcuts);
    setEditingId(null);
    setRecordingKeys([]);
  };

  const handleCancel = () => {
    setEditingId(null);
    setRecordingKeys([]);
  };

  const handleReset = () => {
    if (confirm('Reset all keyboard shortcuts to defaults?')) {
      saveShortcuts(DEFAULT_SHORTCUTS);
    }
  };

  const formatKeys = (keys: string) => {
    return keys.split('+').map((key, i) => (
      <span key={i} className="shortcut-key">
        {key}
      </span>
    ));
  };

  return (
    <div className="settings-section">
      <div className="settings-section-header">
        <h2 className="settings-section-title">Keyboard</h2>
        <p className="settings-section-description">
          Customize keyboard shortcuts for quick access to features
        </p>
      </div>

      {/* Shortcuts */}
      <div className="settings-group">
        <h3 className="settings-group-title">Keyboard Shortcuts</h3>
        <p className="settings-group-description">
          Click on a shortcut to change it, then press your desired key combination
        </p>

        {shortcuts.map((shortcut) => (
          <div key={shortcut.id} className="settings-item">
            <div className="settings-item-label">
              <div className="settings-item-title">{shortcut.label}</div>
              <div className="settings-item-description">{shortcut.description}</div>
            </div>
            <div className="settings-item-control">
              {editingId === shortcut.id ? (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <div
                    className="shortcut-display"
                    style={{ background: 'var(--accent-bg)', color: '#fff', cursor: 'text' }}
                    tabIndex={0}
                    onKeyDown={(e) => handleKeyDown(e, shortcut.id)}
                  >
                    {recordingKeys.length > 0
                      ? formatKeys(recordingKeys.join('+'))
                      : 'Press keys...'}
                  </div>
                  <button
                    className="button-control"
                    onClick={() => handleSaveShortcut(shortcut.id)}
                    disabled={recordingKeys.length === 0}
                    style={{ padding: '6px 12px', fontSize: '13px' }}
                  >
                    ✓
                  </button>
                  <button
                    className="button-control secondary"
                    onClick={handleCancel}
                    style={{ padding: '6px 12px', fontSize: '13px' }}
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div
                  className="shortcut-display"
                  onClick={() => handleEdit(shortcut.id)}
                  style={{
                    cursor: shortcut.modifiable ? 'pointer' : 'default',
                    opacity: shortcut.modifiable ? 1 : 0.6,
                  }}
                >
                  {formatKeys(shortcut.keys)}
                </div>
              )}
            </div>
          </div>
        ))}

        <div className="settings-item">
          <div className="settings-item-label"></div>
          <div className="settings-item-control">
            <button className="button-control secondary" onClick={handleReset}>
              ↺ Reset to Defaults
            </button>
          </div>
        </div>
      </div>

      {/* Tips */}
      <div className="settings-group">
        <h3 className="settings-group-title">Tips</h3>
        
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
          <p style={{ margin: '0 0 12px 0' }}>
            • Shortcuts must include at least one modifier key (Ctrl, Shift, Alt, or Cmd)
          </p>
          <p style={{ margin: '0 0 12px 0' }}>
            • Some shortcuts cannot be changed as they are system-level
          </p>
          <p style={{ margin: '0' }}>
            • Avoid using shortcuts that conflict with system or other applications
          </p>
        </div>
      </div>
    </div>
  );
};
