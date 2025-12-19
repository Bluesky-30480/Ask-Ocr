/**
 * Keyboard Shortcuts Service
 * Manages global and local keyboard shortcuts with conflict detection
 */

export interface ShortcutConfig {
  id: string;
  name: string;
  description: string;
  keys: string[];
  category: 'global' | 'editor' | 'navigation' | 'ocr' | 'ai';
  action: () => void;
  enabled: boolean;
  global?: boolean;
}

export interface ShortcutConflict {
  existingId: string;
  existingName: string;
  newId: string;
  newName: string;
  keys: string[];
}

class KeyboardShortcutsService {
  private shortcuts: Map<string, ShortcutConfig> = new Map();
  private keyMap: Map<string, string> = new Map(); // key combination -> shortcut id
  private listeners: Array<(shortcut: ShortcutConfig) => void> = [];

  constructor() {
    this.initializeDefaultShortcuts();
    this.loadCustomShortcuts();
    this.setupEventListener();
  }

  private initializeDefaultShortcuts() {
    const defaults: Omit<ShortcutConfig, 'action'>[] = [
      {
        id: 'screenshot',
        name: 'Take Screenshot',
        description: 'Capture screen area for OCR',
        keys: ['Ctrl', 'Shift', 'S'],
        category: 'ocr',
        enabled: true,
        global: true,
      },
      {
        id: 'settings',
        name: 'Open Settings',
        description: 'Open settings page',
        keys: ['Ctrl', ','],
        category: 'navigation',
        enabled: true,
        global: false,
      },
      {
        id: 'history',
        name: 'View History',
        description: 'Open OCR history',
        keys: ['Ctrl', 'H'],
        category: 'navigation',
        enabled: true,
        global: false,
      },
      {
        id: 'ai-assistant',
        name: 'Open AI Assistant',
        description: 'Open universal AI assistant',
        keys: ['Ctrl', 'Shift', 'A'],
        category: 'ai',
        enabled: true,
        global: true,
      },
      {
        id: 'quick-chat',
        name: 'Quick Chat',
        description: 'Open quick chat window',
        keys: ['Ctrl', 'Shift', 'C'],
        category: 'ai',
        enabled: true,
        global: false,
      },
      {
        id: 'search',
        name: 'Search',
        description: 'Focus search bar',
        keys: ['Ctrl', 'K'],
        category: 'navigation',
        enabled: true,
        global: false,
      },
      {
        id: 'toggle-theme',
        name: 'Toggle Theme',
        description: 'Switch between light and dark theme',
        keys: ['Ctrl', 'Shift', 'T'],
        category: 'global',
        enabled: true,
        global: false,
      },
    ];

    // Initialize with no-op actions (will be set by consumers)
    defaults.forEach((config) => {
      this.shortcuts.set(config.id, { ...config, action: () => {} } as ShortcutConfig);
      this.updateKeyMap(config.id, config.keys);
    });
  }

  private loadCustomShortcuts() {
    const saved = localStorage.getItem('keyboard_shortcuts');
    if (saved) {
      try {
        const custom = JSON.parse(saved);
        Object.entries(custom).forEach(([id, config]: [string, any]) => {
          const existing = this.shortcuts.get(id);
          if (existing) {
            this.shortcuts.set(id, { ...existing, ...config });
            this.updateKeyMap(id, config.keys);
          }
        });
      } catch (error) {
        console.error('Failed to load custom shortcuts:', error);
      }
    }
  }

  private saveCustomShortcuts() {
    const custom: Record<string, Partial<ShortcutConfig>> = {};
    this.shortcuts.forEach((config, id) => {
      custom[id] = {
        keys: config.keys,
        enabled: config.enabled,
      };
    });
    localStorage.setItem('keyboard_shortcuts', JSON.stringify(custom));
  }

  private updateKeyMap(id: string, keys: string[]) {
    // Remove old mapping
    this.keyMap.forEach((value, key) => {
      if (value === id) {
        this.keyMap.delete(key);
      }
    });
    
    // Add new mapping
    const keyCombo = this.normalizeKeys(keys).join('+');
    this.keyMap.set(keyCombo, id);
  }

  private normalizeKeys(keys: string[]): string[] {
    return keys.map((key) => {
      // Normalize common variations
      const normalized = key.toLowerCase().trim();
      if (normalized === 'control' || normalized === 'ctrl') return 'ctrl';
      if (normalized === 'command' || normalized === 'cmd' || normalized === 'meta') return 'ctrl'; // Treat meta as ctrl for consistency
      if (normalized === 'alt' || normalized === 'option') return 'alt';
      if (normalized === 'shift') return 'shift';
      // For all other keys (including alphanumeric), just lowercase them
      return normalized;
    }).sort();
  }

  private setupEventListener() {
    document.addEventListener('keydown', (event) => {
      const pressedKeys: string[] = [];
      
      // Capture modifiers
      if (event.ctrlKey || event.metaKey) pressedKeys.push('ctrl');
      if (event.shiftKey) pressedKeys.push('shift');
      if (event.altKey) pressedKeys.push('alt');
      
      // Capture the actual key
      const key = event.key;
      const code = event.code;
      const isModifierKey = ['Control', 'Shift', 'Alt', 'Meta'].includes(key);
      
      if (!isModifierKey) {
        // Use code for standard keys to match recorder logic
        if (code.startsWith('Key')) {
          pressedKeys.push(code.slice(3).toLowerCase());
        } else if (code.startsWith('Digit')) {
          pressedKeys.push(code.slice(5).toLowerCase());
        } else if (code.startsWith('Numpad')) {
          pressedKeys.push(('Num' + code.slice(6)).toLowerCase());
        }
        // Fallback to key for others
        else if (/^[a-z0-9]$/i.test(key)) {
          pressedKeys.push(key.toLowerCase());
        } else if (key.length === 1) {
          pressedKeys.push(key.toLowerCase());
        } else {
          pressedKeys.push(key.toLowerCase());
        }
      }

      // Only process if we have at least one non-modifier key
      if (pressedKeys.length > 0 && !isModifierKey) {
        const keyCombo = pressedKeys.sort().join('+');
        const shortcutId = this.keyMap.get(keyCombo);

        if (shortcutId) {
          const shortcut = this.shortcuts.get(shortcutId);
          if (shortcut && shortcut.enabled) {
            event.preventDefault();
            event.stopPropagation();
            shortcut.action();
            this.notifyListeners(shortcut);
          }
        }
      }
    });
  }

  public registerShortcut(config: ShortcutConfig): void {
    this.shortcuts.set(config.id, config);
    this.updateKeyMap(config.id, config.keys);
    this.saveCustomShortcuts();
  }

  public unregisterShortcut(id: string): void {
    this.shortcuts.delete(id);
    this.keyMap.forEach((value, key) => {
      if (value === id) {
        this.keyMap.delete(key);
      }
    });
    this.saveCustomShortcuts();
  }

  public updateShortcut(id: string, updates: Partial<ShortcutConfig>): boolean {
    const existing = this.shortcuts.get(id);
    if (!existing) return false;

    // Check for conflicts if keys are being updated
    if (updates.keys) {
      const conflict = this.checkConflict(id, updates.keys);
      if (conflict) {
        console.warn('Shortcut conflict detected:', conflict);
        return false;
      }
    }

    const updated = { ...existing, ...updates };
    this.shortcuts.set(id, updated);
    
    if (updates.keys) {
      this.updateKeyMap(id, updates.keys);
    }
    
    this.saveCustomShortcuts();
    return true;
  }

  public setShortcutAction(id: string, action: () => void): void {
    const shortcut = this.shortcuts.get(id);
    if (shortcut) {
      shortcut.action = action;
    }
  }

  public getShortcut(id: string): ShortcutConfig | undefined {
    return this.shortcuts.get(id);
  }

  public getAllShortcuts(): ShortcutConfig[] {
    return Array.from(this.shortcuts.values());
  }

  public getShortcutsByCategory(category: ShortcutConfig['category']): ShortcutConfig[] {
    return Array.from(this.shortcuts.values()).filter((s) => s.category === category);
  }

  public checkConflict(id: string, keys: string[]): ShortcutConflict | null {
    const keyCombo = this.normalizeKeys(keys).join('+');
    const existingId = this.keyMap.get(keyCombo);

    if (existingId && existingId !== id) {
      const existing = this.shortcuts.get(existingId);
      const newShortcut = this.shortcuts.get(id);

      if (existing && newShortcut) {
        return {
          existingId,
          existingName: existing.name,
          newId: id,
          newName: newShortcut.name,
          keys,
        };
      }
    }

    return null;
  }

  public resetToDefaults(): void {
    this.shortcuts.clear();
    this.keyMap.clear();
    this.initializeDefaultShortcuts();
    localStorage.removeItem('keyboard_shortcuts');
  }

  public resetShortcut(id: string): boolean {
    const shortcut = this.shortcuts.get(id);
    if (!shortcut) return false;

    // Re-initialize default for this ID
    this.shortcuts.delete(id);
    this.initializeDefaultShortcuts();
    this.saveCustomShortcuts();
    return true;
  }

  public addListener(callback: (shortcut: ShortcutConfig) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }

  private notifyListeners(shortcut: ShortcutConfig): void {
    this.listeners.forEach((callback) => callback(shortcut));
  }

  public formatKeys(keys: string[]): string {
    return keys
      .map((key) => {
        const normalized = key.toLowerCase();
        if (normalized === 'ctrl' || normalized === 'control') return 'Ctrl';
        if (normalized === 'shift') return 'Shift';
        if (normalized === 'alt' || normalized === 'option') return 'Alt';
        if (normalized === 'meta' || normalized === 'cmd' || normalized === 'command') return 'Cmd';
        return key.charAt(0).toUpperCase() + key.slice(1);
      })
      .join('+');
  }
}

// Singleton instance
export const keyboardShortcutsService = new KeyboardShortcutsService();

export default keyboardShortcutsService;
