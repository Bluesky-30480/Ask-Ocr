/**
 * System Tray Service
 * Manages system tray icon and menu for Windows, macOS, and Linux
 */

import { invoke } from '@tauri-apps/api/tauri';
import { listen } from '@tauri-apps/api/event';

export interface TrayMenuItem {
  id: string;
  label: string;
  accelerator?: string;
  enabled?: boolean;
  checked?: boolean;
  type?: 'normal' | 'separator' | 'checkbox';
}

export interface RecentCapture {
  id: number;
  timestamp: string;
  text: string;
}

export class SystemTrayService {
  private initialized = false;
  private eventListeners: (() => void)[] = [];

  /**
   * Initialize system tray and set up event listeners
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // System tray is created in Rust on app startup
      // Set up event listeners for tray interactions
      
      const unlistenScreenshot = await listen('tray-screenshot', () => {
        // Trigger screenshot capture
        window.dispatchEvent(new CustomEvent('global-screenshot'));
      });
      
      const unlistenHistory = await listen('navigate-to-history', () => {
        // Navigate to history page
        window.location.hash = '#/history';
      });
      
      const unlistenSettings = await listen('navigate-to-settings', () => {
        // Navigate to settings page
        window.location.hash = '#/settings';
      });
      
      const unlistenOffline = await listen('toggle-offline-mode', () => {
        // Toggle offline mode
        window.dispatchEvent(new CustomEvent('toggle-offline-mode'));
      });
      
      const unlistenModels = await listen('navigate-to-models', () => {
        // Navigate to model management
        window.location.hash = '#/settings/ai';
      });
      
      const unlistenUpdates = await listen('check-updates', () => {
        // Check for updates
        window.dispatchEvent(new CustomEvent('check-updates'));
      });
      
      const unlistenAbout = await listen('navigate-to-about', () => {
        // Navigate to about page
        window.location.hash = '#/about';
      });
      
      this.eventListeners = [
        unlistenScreenshot,
        unlistenHistory,
        unlistenSettings,
        unlistenOffline,
        unlistenModels,
        unlistenUpdates,
        unlistenAbout,
      ];
      
      this.initialized = true;
      console.log('System tray initialized');
    } catch (error) {
      console.error('Failed to initialize system tray:', error);
      // Non-critical - continue without tray
    }
  }

  /**
   * Cleanup event listeners
   */
  dispose(): void {
    this.eventListeners.forEach(unlisten => unlisten());
    this.eventListeners = [];
    this.initialized = false;
  }

  /**
   * Toggle offline mode indicator in tray
   */
  async setOfflineMode(enabled: boolean): Promise<void> {
    try {
      await invoke('tray_set_offline_mode', { enabled });
    } catch (error) {
      console.error('Failed to set offline mode:', error);
    }
  }

  /**
   * Update tooltip
   */
  async setTooltip(tooltip: string): Promise<void> {
    try {
      await invoke('tray_set_tooltip', { tooltip });
    } catch (error) {
      console.error('Failed to set tooltip:', error);
    }
  }

  /**
   * Update recent captures in tray menu
   */
  async updateRecentCaptures(captures: RecentCapture[]): Promise<void> {
    try {
      await invoke('tray_update_recent_captures', { captures });
    } catch (error) {
      console.error('Failed to update recent captures:', error);
    }
  }

  /**
   * Show main window
   */
  async showWindow(): Promise<void> {
    try {
      await invoke('show_main_window');
    } catch (error) {
      console.error('Failed to show window:', error);
    }
  }

  /**
   * Hide main window
   */
  async hideWindow(): Promise<void> {
    try {
      await invoke('hide_main_window');
    } catch (error) {
      console.error('Failed to hide window:', error);
    }
  }

  /**
   * Toggle main window visibility
   */
  async toggleWindow(): Promise<void> {
    try {
      await invoke('toggle_main_window');
    } catch (error) {
      console.error('Failed to toggle window:', error);
    }
  }

  /**
   * Show notification from tray
   */
  showNotification(title: string, message: string): void {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body: message,
        icon: '/icon.png',
      });
    }
  }

  /**
   * Request notification permission
   */
  async requestNotificationPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }

    return false;
  }
}

// Export singleton instance
export const systemTrayService = new SystemTrayService();

