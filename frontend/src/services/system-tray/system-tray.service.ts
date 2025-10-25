/**
 * System Tray Service
 * Manages system tray icon and menu for Windows, macOS, and Linux
 */

import { invoke } from '@tauri-apps/api/tauri';
import { platformService } from '../platform/platform.service';

export interface TrayMenuItem {
  id: string;
  label: string;
  accelerator?: string;
  enabled?: boolean;
  checked?: boolean;
  type?: 'normal' | 'separator' | 'checkbox';
}

export class SystemTrayService {
  private initialized = false;

  /**
   * Initialize system tray
   */
  async initialize(): Promise<void> {
    try {
      // Tray is configured in tauri.conf.json
      // This service manages tray interactions via backend commands
      await invoke('init_system_tray');
      this.initialized = true;
      
      console.log('System tray initialized');
    } catch (error) {
      console.error('Failed to initialize system tray:', error);
      // Non-critical - continue without tray
    }
  }

  /**
   * Toggle offline mode
   */
  async toggleOfflineMode(enabled: boolean): Promise<void> {
    try {
      await invoke('tray_set_offline_mode', { enabled });
    } catch (error) {
      console.error('Failed to toggle offline mode:', error);
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
}

// Export singleton instance
export const systemTrayService = new SystemTrayService();
