/**
 * Shortcut Mapper Service
 * Maps shortcuts to platform-specific key combinations
 */

import { platformService } from './platform.service';
import type { Platform } from './platform.service';

export interface ShortcutMapping {
  id: string;
  description: string;
  windows: string;
  macos: string;
  linux: string;
  category: 'global' | 'window' | 'editor';
}

export interface PlatformShortcut {
  id: string;
  description: string;
  shortcut: string;
  displayShortcut: string;
  category: 'global' | 'window' | 'editor';
}

export class ShortcutMapper {
  private shortcuts: ShortcutMapping[] = [
    // Global shortcuts
    {
      id: 'screenshot',
      description: 'Take screenshot',
      windows: 'Ctrl+Shift+S',
      macos: 'Cmd+Shift+S',
      linux: 'Ctrl+Shift+S',
      category: 'global',
    },
    {
      id: 'screenshot-fullscreen',
      description: 'Fullscreen screenshot',
      windows: 'Ctrl+Shift+F',
      macos: 'Cmd+Shift+F',
      linux: 'Ctrl+Shift+F',
      category: 'global',
    },
    {
      id: 'screenshot-window',
      description: 'Window screenshot',
      windows: 'Ctrl+Shift+W',
      macos: 'Cmd+Shift+W',
      linux: 'Ctrl+Shift+W',
      category: 'global',
    },
    
    // Window shortcuts
    {
      id: 'settings',
      description: 'Open settings',
      windows: 'Ctrl+,',
      macos: 'Cmd+,',
      linux: 'Ctrl+,',
      category: 'window',
    },
    {
      id: 'history',
      description: 'Open history',
      windows: 'Ctrl+H',
      macos: 'Cmd+H',
      linux: 'Ctrl+H',
      category: 'window',
    },
    {
      id: 'search',
      description: 'Search',
      windows: 'Ctrl+F',
      macos: 'Cmd+F',
      linux: 'Ctrl+F',
      category: 'window',
    },
    {
      id: 'quit',
      description: 'Quit application',
      windows: 'Alt+F4',
      macos: 'Cmd+Q',
      linux: 'Ctrl+Q',
      category: 'window',
    },
    {
      id: 'minimize',
      description: 'Minimize window',
      windows: 'Ctrl+M',
      macos: 'Cmd+M',
      linux: 'Ctrl+M',
      category: 'window',
    },
    {
      id: 'toggle-fullscreen',
      description: 'Toggle fullscreen',
      windows: 'F11',
      macos: 'Ctrl+Cmd+F',
      linux: 'F11',
      category: 'window',
    },
    
    // Editor shortcuts
    {
      id: 'copy',
      description: 'Copy',
      windows: 'Ctrl+C',
      macos: 'Cmd+C',
      linux: 'Ctrl+C',
      category: 'editor',
    },
    {
      id: 'paste',
      description: 'Paste',
      windows: 'Ctrl+V',
      macos: 'Cmd+V',
      linux: 'Ctrl+V',
      category: 'editor',
    },
    {
      id: 'cut',
      description: 'Cut',
      windows: 'Ctrl+X',
      macos: 'Cmd+X',
      linux: 'Ctrl+X',
      category: 'editor',
    },
    {
      id: 'select-all',
      description: 'Select all',
      windows: 'Ctrl+A',
      macos: 'Cmd+A',
      linux: 'Ctrl+A',
      category: 'editor',
    },
    {
      id: 'save',
      description: 'Save',
      windows: 'Ctrl+S',
      macos: 'Cmd+S',
      linux: 'Ctrl+S',
      category: 'editor',
    },
    {
      id: 'undo',
      description: 'Undo',
      windows: 'Ctrl+Z',
      macos: 'Cmd+Z',
      linux: 'Ctrl+Z',
      category: 'editor',
    },
    {
      id: 'redo',
      description: 'Redo',
      windows: 'Ctrl+Y',
      macos: 'Cmd+Shift+Z',
      linux: 'Ctrl+Y',
      category: 'editor',
    },
    {
      id: 'cancel',
      description: 'Cancel operation',
      windows: 'Esc',
      macos: 'Esc',
      linux: 'Esc',
      category: 'editor',
    },
    {
      id: 'confirm',
      description: 'Confirm operation',
      windows: 'Enter',
      macos: 'Enter',
      linux: 'Enter',
      category: 'editor',
    },
  ];

  /**
   * Get shortcut for current platform
   */
  getShortcut(id: string): PlatformShortcut | null {
    const mapping = this.shortcuts.find((s) => s.id === id);
    if (!mapping) return null;

    const platform = platformService.getPlatformInfo().platform;
    const shortcut = this.getShortcutForPlatform(mapping, platform);

    return {
      id: mapping.id,
      description: mapping.description,
      shortcut,
      displayShortcut: platformService.formatShortcut(shortcut),
      category: mapping.category,
    };
  }

  /**
   * Get all shortcuts for current platform
   */
  getAllShortcuts(): PlatformShortcut[] {
    const platform = platformService.getPlatformInfo().platform;

    return this.shortcuts.map((mapping) => ({
      id: mapping.id,
      description: mapping.description,
      shortcut: this.getShortcutForPlatform(mapping, platform),
      displayShortcut: platformService.formatShortcut(
        this.getShortcutForPlatform(mapping, platform)
      ),
      category: mapping.category,
    }));
  }

  /**
   * Get shortcuts by category
   */
  getShortcutsByCategory(category: 'global' | 'window' | 'editor'): PlatformShortcut[] {
    return this.getAllShortcuts().filter((s) => s.category === category);
  }

  /**
   * Get shortcut for specific platform
   */
  private getShortcutForPlatform(mapping: ShortcutMapping, platform: Platform): string {
    switch (platform) {
      case 'windows':
        return mapping.windows;
      case 'macos':
        return mapping.macos;
      case 'linux':
        return mapping.linux;
      default:
        return mapping.windows; // Fallback to Windows
    }
  }

  /**
   * Check if shortcut conflicts with another
   */
  hasConflict(shortcut: string): { conflict: boolean; conflictsWith?: PlatformShortcut } {
    const normalized = this.normalizeShortcut(shortcut);
    const allShortcuts = this.getAllShortcuts();

    for (const existing of allShortcuts) {
      if (this.normalizeShortcut(existing.shortcut) === normalized) {
        return {
          conflict: true,
          conflictsWith: existing,
        };
      }
    }

    return { conflict: false };
  }

  /**
   * Normalize shortcut string for comparison
   */
  private normalizeShortcut(shortcut: string): string {
    return shortcut
      .toLowerCase()
      .replace(/\s+/g, '')
      .replace(/cmd|meta|command/g, 'ctrl') // Normalize Cmd to Ctrl for comparison
      .split('+')
      .sort()
      .join('+');
  }

  /**
   * Convert shortcut to Tauri format
   */
  toTauriFormat(shortcut: string): string {
    // Tauri uses format like "CmdOrCtrl+Shift+S"
    const platform = platformService.getPlatformInfo().platform;

    let tauriShortcut = shortcut;

    // Replace platform-specific modifiers with CmdOrCtrl
    if (platform === 'macos') {
      tauriShortcut = tauriShortcut.replace(/Cmd/gi, 'CmdOrCtrl');
    } else {
      tauriShortcut = tauriShortcut.replace(/Ctrl/gi, 'CmdOrCtrl');
    }

    return tauriShortcut;
  }

  /**
   * Validate shortcut format
   */
  isValidShortcut(shortcut: string): boolean {
    // Basic validation: must have at least one modifier and one key
    const parts = shortcut.split('+');
    if (parts.length < 2) return false;

    const modifiers = ['ctrl', 'cmd', 'alt', 'shift', 'meta'];
    const hasModifier = parts.some((part) =>
      modifiers.includes(part.toLowerCase())
    );

    return hasModifier;
  }

  /**
   * Add custom shortcut
   */
  addCustomShortcut(mapping: ShortcutMapping): void {
    // Check if ID already exists
    const index = this.shortcuts.findIndex((s) => s.id === mapping.id);

    if (index >= 0) {
      // Update existing
      this.shortcuts[index] = mapping;
    } else {
      // Add new
      this.shortcuts.push(mapping);
    }
  }

  /**
   * Remove custom shortcut
   */
  removeCustomShortcut(id: string): void {
    this.shortcuts = this.shortcuts.filter((s) => s.id !== id);
  }
}

// Export singleton instance
export const shortcutMapper = new ShortcutMapper();
