/**
 * Shortcut Manager Service
 * Frontend service to manage global keyboard shortcuts via Tauri backend
 */

import { invoke } from '@tauri-apps/api/tauri';
import { listen } from '@tauri-apps/api/event';
import type { UnlistenFn } from '@tauri-apps/api/event';
import type { ShortcutConfig } from '@shared/types';

export interface ShortcutRegistrationResult {
  success: boolean;
  shortcut_id: string;
  error?: string;
}

export type ShortcutCallback = () => void;

/**
 * Shortcut Manager - handles global keyboard shortcuts
 */
export class ShortcutManager {
  private listeners: Map<string, ShortcutCallback> = new Map();
  private unlistenFn: UnlistenFn | null = null;

  /**
   * Initialize shortcut manager and listen for shortcut events
   */
  async initialize(): Promise<void> {
    // Listen for shortcut-triggered events from backend
    this.unlistenFn = await listen<string>('shortcut-triggered', (event: any) => {
      const shortcutId = event.payload;
      const callback = this.listeners.get(shortcutId);
      if (callback) {
        callback();
      } else {
        console.warn(`No callback registered for shortcut: ${shortcutId}`);
      }
    });

    console.log('Shortcut manager initialized');
  }

  /**
   * Register a global shortcut
   * @param id - Unique identifier for the shortcut
   * @param accelerator - Keyboard combination (e.g., "Ctrl+Shift+S")
   * @param callback - Function to call when shortcut is triggered
   * @param description - Human-readable description
   */
  async register(
    id: string,
    accelerator: string,
    callback: ShortcutCallback,
    description = ''
  ): Promise<ShortcutRegistrationResult> {
    try {
      const result = await invoke<ShortcutRegistrationResult>('register_shortcut', {
        shortcutId: id,
        accelerator,
        description,
      });

      if (result.success) {
        this.listeners.set(id, callback);
        console.log(`Shortcut registered: ${id} (${accelerator})`);
      } else {
        console.error(`Failed to register shortcut: ${result.error}`);
      }

      return result;
    } catch (error) {
      console.error('Error registering shortcut:', error);
      return {
        success: false,
        shortcut_id: id,
        error: String(error),
      };
    }
  }

  /**
   * Unregister a shortcut
   */
  async unregister(id: string): Promise<boolean> {
    try {
      const success = await invoke<boolean>('unregister_shortcut', {
        shortcutId: id,
      });

      if (success) {
        this.listeners.delete(id);
        console.log(`Shortcut unregistered: ${id}`);
      }

      return success;
    } catch (error) {
      console.error('Error unregistering shortcut:', error);
      return false;
    }
  }

  /**
   * Unregister all shortcuts
   */
  async unregisterAll(): Promise<number> {
    try {
      const count = await invoke<number>('unregister_all_shortcuts');
      this.listeners.clear();
      console.log(`All shortcuts unregistered (${count})`);
      return count;
    } catch (error) {
      console.error('Error unregistering all shortcuts:', error);
      return 0;
    }
  }

  /**
   * Get all registered shortcuts
   */
  async getRegistered(): Promise<ShortcutConfig[]> {
    try {
      const shortcuts = await invoke<ShortcutConfig[]>('get_registered_shortcuts');
      return shortcuts;
    } catch (error) {
      console.error('Error getting registered shortcuts:', error);
      return [];
    }
  }

  /**
   * Check if a shortcut accelerator is available
   */
  async isAvailable(accelerator: string): Promise<boolean> {
    try {
      return await invoke<boolean>('is_shortcut_available', { accelerator });
    } catch (error) {
      console.error('Error checking shortcut availability:', error);
      return false;
    }
  }

  /**
   * Update an existing shortcut with a new accelerator
   */
  async update(id: string, newAccelerator: string): Promise<ShortcutRegistrationResult> {
    try {
      const result = await invoke<ShortcutRegistrationResult>('update_shortcut', {
        shortcutId: id,
        newAccelerator,
      });

      console.log(`Shortcut updated: ${id} -> ${newAccelerator}`);
      return result;
    } catch (error) {
      console.error('Error updating shortcut:', error);
      return {
        success: false,
        shortcut_id: id,
        error: String(error),
      };
    }
  }

  /**
   * Register default application shortcuts
   */
  async registerDefaults(callbacks: {
    screenshot?: ShortcutCallback;
    fullScreenshot?: ShortcutCallback;
    windowScreenshot?: ShortcutCallback;
    openHistory?: ShortcutCallback;
    openSettings?: ShortcutCallback;
    toggleLocalMode?: ShortcutCallback;
  }): Promise<void> {
    const defaults = [
      {
        id: 'screenshot',
        accelerator: 'Ctrl+Shift+S',
        callback: callbacks.screenshot,
        description: 'Capture region screenshot',
      },
      {
        id: 'fullScreenshot',
        accelerator: 'Ctrl+Shift+F',
        callback: callbacks.fullScreenshot,
        description: 'Capture full screen',
      },
      {
        id: 'windowScreenshot',
        accelerator: 'Ctrl+Shift+W',
        callback: callbacks.windowScreenshot,
        description: 'Capture active window',
      },
      {
        id: 'openHistory',
        accelerator: 'Ctrl+H',
        callback: callbacks.openHistory,
        description: 'Open history panel',
      },
      {
        id: 'openSettings',
        accelerator: 'Ctrl+,',
        callback: callbacks.openSettings,
        description: 'Open settings',
      },
      {
        id: 'toggleLocalMode',
        accelerator: 'Ctrl+Shift+L',
        callback: callbacks.toggleLocalMode,
        description: 'Toggle local-only mode',
      },
    ];

    for (const shortcut of defaults) {
      if (shortcut.callback) {
        await this.register(
          shortcut.id,
          shortcut.accelerator,
          shortcut.callback,
          shortcut.description
        );
      }
    }
  }

  /**
   * Cleanup and remove event listener
   */
  async cleanup(): Promise<void> {
    if (this.unlistenFn) {
      this.unlistenFn();
      this.unlistenFn = null;
    }
    await this.unregisterAll();
    console.log('Shortcut manager cleaned up');
  }
}

// Export singleton instance
export const shortcutManager = new ShortcutManager();
