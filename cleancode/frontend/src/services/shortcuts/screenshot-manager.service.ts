/**
 * Screenshot Service
 * Frontend service to handle screenshot capture via Tauri backend
 */

import { invoke } from '@tauri-apps/api/tauri';
import { listen } from '@tauri-apps/api/event';
import type { UnlistenFn } from '@tauri-apps/api/event';
import type { ScreenshotRegion, ScreenshotResult } from '@shared/types';

/**
 * Screenshot Manager - handles screen capture operations
 */
export class ScreenshotManager {
  private overlayListener: UnlistenFn | null = null;

  /**
   * Capture full screen
   */
  async captureFullScreen(): Promise<ScreenshotResult> {
    try {
      const result = await invoke<ScreenshotResult>('capture_fullscreen');
      return result;
    } catch (error) {
      console.error('Error capturing full screen:', error);
      return {
        success: false,
        error: String(error),
      };
    }
  }

  /**
   * Capture active window
   */
  async captureWindow(): Promise<ScreenshotResult> {
    try {
      const result = await invoke<ScreenshotResult>('capture_window');
      return result;
    } catch (error) {
      console.error('Error capturing window:', error);
      return {
        success: false,
        error: String(error),
      };
    }
  }

  /**
   * Capture specific region
   */
  async captureRegion(region: ScreenshotRegion): Promise<ScreenshotResult> {
    try {
      const result = await invoke<ScreenshotResult>('capture_region', { region });
      return result;
    } catch (error) {
      console.error('Error capturing region:', error);
      return {
        success: false,
        error: String(error),
      };
    }
  }

  /**
   * Show screenshot overlay for region selection
   */
  async showOverlay(onRegionSelected?: (region: ScreenshotRegion) => void): Promise<void> {
    try {
      // Listen for overlay events if callback provided
      if (onRegionSelected && !this.overlayListener) {
        this.overlayListener = await listen<ScreenshotRegion>(
          'screenshot-region-selected',
          (event: any) => {
            onRegionSelected(event.payload);
          }
        );
      }

      await invoke('show_screenshot_overlay');
    } catch (error) {
      console.error('Error showing screenshot overlay:', error);
    }
  }

  /**
   * Hide screenshot overlay
   */
  async hideOverlay(): Promise<void> {
    try {
      await invoke('hide_screenshot_overlay');

      // Clean up listener
      if (this.overlayListener) {
        this.overlayListener();
        this.overlayListener = null;
      }
    } catch (error) {
      console.error('Error hiding screenshot overlay:', error);
    }
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.overlayListener) {
      this.overlayListener();
      this.overlayListener = null;
    }
  }
}

// Export singleton instance
export const screenshotManager = new ScreenshotManager();
