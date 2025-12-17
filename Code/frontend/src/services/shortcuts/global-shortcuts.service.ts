/**
 * Global Shortcuts Service
 * Registers and manages application-wide keyboard shortcuts
 */

import { shortcutManager } from './shortcut-manager.service';
import { screenshotManager } from './screenshot-manager.service';

export interface GlobalShortcut {
  id: string;
  name: string;
  description: string;
  defaultAccelerator: string;
  category: 'app' | 'screenshot' | 'navigation' | 'editing';
  callback: () => void;
}

export class GlobalShortcutsService {
  private shortcuts: Map<string, GlobalShortcut> = new Map();
  private initialized = false;

  /**
   * Initialize all global shortcuts
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    await shortcutManager.initialize();

    // Register default shortcuts
    await this.registerDefaultShortcuts();

    this.initialized = true;
    console.log('Global shortcuts initialized');
  }

  /**
   * Register default application shortcuts
   */
  private async registerDefaultShortcuts(): Promise<void> {
    const shortcuts: GlobalShortcut[] = [
      // Screenshot shortcuts
      {
        id: 'screenshot_region',
        name: 'Screenshot Region',
        description: 'Capture a selected region of the screen',
        defaultAccelerator: 'Ctrl+Shift+S',
        category: 'screenshot',
        callback: () => this.handleScreenshotRegion(),
      },
      {
        id: 'screenshot_fullscreen',
        name: 'Screenshot Fullscreen',
        description: 'Capture the entire screen',
        defaultAccelerator: 'Ctrl+Shift+F',
        category: 'screenshot',
        callback: () => this.handleScreenshotFullscreen(),
      },
      {
        id: 'screenshot_window',
        name: 'Screenshot Window',
        description: 'Capture the active window',
        defaultAccelerator: 'Ctrl+Shift+W',
        category: 'screenshot',
        callback: () => this.handleScreenshotWindow(),
      },

      // Navigation shortcuts
      {
        id: 'open_settings',
        name: 'Open Settings',
        description: 'Open the settings page',
        defaultAccelerator: 'Ctrl+,',
        category: 'navigation',
        callback: () => this.handleOpenSettings(),
      },
      {
        id: 'open_history',
        name: 'Open History',
        description: 'Open the history page',
        defaultAccelerator: 'Ctrl+H',
        category: 'navigation',
        callback: () => this.handleOpenHistory(),
      },
      {
        id: 'toggle_window',
        name: 'Show/Hide Window',
        description: 'Toggle main window visibility',
        defaultAccelerator: 'Ctrl+Shift+A',
        category: 'app',
        callback: () => this.handleToggleWindow(),
      },
      {
        id: 'quick_chat',
        name: 'Quick Chat',
        description: 'Open quick AI chat',
        defaultAccelerator: 'Ctrl+Shift+Q',
        category: 'navigation',
        callback: () => this.handleQuickChat(),
      },

      // Editing shortcuts
      {
        id: 'copy_last_result',
        name: 'Copy Last OCR Result',
        description: 'Copy the last OCR result to clipboard',
        defaultAccelerator: 'Ctrl+Shift+C',
        category: 'editing',
        callback: () => this.handleCopyLastResult(),
      },
    ];

    // Register each shortcut
    for (const shortcut of shortcuts) {
      this.shortcuts.set(shortcut.id, shortcut);
      
      // Try to get custom accelerator from settings
      const customAccelerator = await this.getCustomAccelerator(shortcut.id);
      const accelerator = customAccelerator || shortcut.defaultAccelerator;

      await shortcutManager.register(
        shortcut.id,
        accelerator,
        shortcut.callback,
        shortcut.description
      );
    }
  }

  /**
   * Get custom accelerator from localStorage
   */
  private async getCustomAccelerator(shortcutId: string): Promise<string | null> {
    try {
      const saved = localStorage.getItem('custom_shortcuts');
      if (!saved) return null;

      const customShortcuts = JSON.parse(saved);
      return customShortcuts[shortcutId] || null;
    } catch (error) {
      console.error('Failed to load custom shortcuts:', error);
      return null;
    }
  }

  /**
   * Update a shortcut's accelerator
   */
  async updateShortcut(shortcutId: string, newAccelerator: string): Promise<boolean> {
    const shortcut = this.shortcuts.get(shortcutId);
    if (!shortcut) {
      console.error(`Shortcut not found: ${shortcutId}`);
      return false;
    }

    // Unregister old shortcut
    await shortcutManager.unregister(shortcutId);

    // Register with new accelerator
    const result = await shortcutManager.register(
      shortcutId,
      newAccelerator,
      shortcut.callback,
      shortcut.description
    );

    if (result.success) {
      // Save to localStorage
      try {
        const saved = localStorage.getItem('custom_shortcuts') || '{}';
        const customShortcuts = JSON.parse(saved);
        customShortcuts[shortcutId] = newAccelerator;
        localStorage.setItem('custom_shortcuts', JSON.stringify(customShortcuts));
        return true;
      } catch (error) {
        console.error('Failed to save custom shortcut:', error);
        return false;
      }
    }

    return false;
  }

  /**
   * Reset a shortcut to default
   */
  async resetShortcut(shortcutId: string): Promise<boolean> {
    const shortcut = this.shortcuts.get(shortcutId);
    if (!shortcut) {
      console.error(`Shortcut not found: ${shortcutId}`);
      return false;
    }

    return await this.updateShortcut(shortcutId, shortcut.defaultAccelerator);
  }

  /**
   * Get all registered shortcuts
   */
  getShortcuts(): GlobalShortcut[] {
    return Array.from(this.shortcuts.values());
  }

  /**
   * Get shortcuts by category
   */
  getShortcutsByCategory(category: string): GlobalShortcut[] {
    return Array.from(this.shortcuts.values()).filter(
      (s) => s.category === category
    );
  }

  // Shortcut handlers

  private handleScreenshotRegion(): void {
    window.dispatchEvent(new CustomEvent('global-screenshot', { 
      detail: { type: 'region' } 
    }));
    // Screenshot manager will handle the capture
  }

  private handleScreenshotFullscreen(): void {
    window.dispatchEvent(new CustomEvent('global-screenshot', { 
      detail: { type: 'fullscreen' } 
    }));
    screenshotManager.captureFullScreen();
  }

  private handleScreenshotWindow(): void {
    window.dispatchEvent(new CustomEvent('global-screenshot', { 
      detail: { type: 'window' } 
    }));
    screenshotManager.captureWindow();
  }

  private handleOpenSettings(): void {
    window.location.hash = '#/settings';
    window.dispatchEvent(new CustomEvent('navigate', {
      detail: { path: '/settings' }
    }));
  }

  private handleOpenHistory(): void {
    window.location.hash = '#/history';
    window.dispatchEvent(new CustomEvent('navigate', {
      detail: { path: '/history' }
    }));
  }

  private handleToggleWindow(): void {
    window.dispatchEvent(new CustomEvent('toggle-window'));
  }

  private handleQuickChat(): void {
    window.location.hash = '#/chat';
    window.dispatchEvent(new CustomEvent('navigate', {
      detail: { path: '/chat' }
    }));
  }

  private handleCopyLastResult(): void {
    window.dispatchEvent(new CustomEvent('copy-last-result'));
  }

  /**
   * Cleanup
   */
  async dispose(): Promise<void> {
    await shortcutManager.cleanup();
    this.shortcuts.clear();
    this.initialized = false;
  }
}

// Export singleton instance
export const globalShortcutsService = new GlobalShortcutsService();
