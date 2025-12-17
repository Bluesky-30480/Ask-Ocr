/**
 * Data Upload Notifier
 * Provides clear notifications when data is sent to external services
 */

import { sendNotification } from '@tauri-apps/api/notification';

export type UploadDestination = 'openai' | 'perplexity' | 'online_ocr' | 'cloud' | 'analytics';

export interface UploadNotification {
  destination: UploadDestination;
  dataType: string;
  dataSize?: number;
  timestamp: number;
  success: boolean;
  error?: string;
}

export class DataUploadNotifier {
  private notificationHistory: UploadNotification[] = [];
  private maxHistorySize = 100;
  private showNotifications = true;

  /**
   * Notify user about data upload
   */
  async notify(
    destination: UploadDestination,
    dataType: string,
    options?: {
      dataSize?: number;
      showToast?: boolean;
      showSystemNotification?: boolean;
    }
  ): Promise<void> {
    const notification: UploadNotification = {
      destination,
      dataType,
      dataSize: options?.dataSize,
      timestamp: Date.now(),
      success: true,
    };

    // Add to history
    this.addToHistory(notification);

    // Show notifications if enabled
    if (this.showNotifications) {
      // Show toast notification (in-app)
      if (options?.showToast !== false) {
        this.showToastNotification(notification);
      }

      // Show system notification (optional)
      if (options?.showSystemNotification) {
        await this.showSystemNotification(notification);
      }
    }

    console.log(`Data uploaded to ${destination}: ${dataType}`, options);
  }

  /**
   * Notify about upload failure
   */
  async notifyError(
    destination: UploadDestination,
    dataType: string,
    error: string
  ): Promise<void> {
    const notification: UploadNotification = {
      destination,
      dataType,
      timestamp: Date.now(),
      success: false,
      error,
    };

    this.addToHistory(notification);

    console.warn(`Data upload failed to ${destination}: ${dataType}`, error);
  }

  /**
   * Show in-app toast notification
   */
  private showToastNotification(notification: UploadNotification): void {
    const destinationName = this.getDestinationDisplayName(notification.destination);
    const message = `Sending ${notification.dataType} to ${destinationName}`;

    // In a real app, this would trigger a toast component
    console.log(`[TOAST] ${message}`);

    // Emit event for UI to catch
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('data-upload-notification', {
          detail: {
            message,
            notification,
          },
        })
      );
    }
  }

  /**
   * Show system notification
   */
  private async showSystemNotification(notification: UploadNotification): Promise<void> {
    try {
      const destinationName = this.getDestinationDisplayName(notification.destination);
      const title = 'Data Upload';
      const body = `Sending ${notification.dataType} to ${destinationName}`;

      await sendNotification({
        title,
        body,
      });
    } catch (error) {
      console.warn('Failed to show system notification:', error);
    }
  }

  /**
   * Get user-friendly destination name
   */
  private getDestinationDisplayName(destination: UploadDestination): string {
    const names: Record<UploadDestination, string> = {
      openai: 'OpenAI',
      perplexity: 'Perplexity AI',
      online_ocr: 'Online OCR Service',
      cloud: 'Cloud Storage',
      analytics: 'Analytics Service',
    };

    return names[destination] || destination;
  }

  /**
   * Add notification to history
   */
  private addToHistory(notification: UploadNotification): void {
    this.notificationHistory.unshift(notification);

    // Trim history if too long
    if (this.notificationHistory.length > this.maxHistorySize) {
      this.notificationHistory = this.notificationHistory.slice(0, this.maxHistorySize);
    }
  }

  /**
   * Get notification history
   */
  getHistory(limit?: number): UploadNotification[] {
    if (limit) {
      return this.notificationHistory.slice(0, limit);
    }
    return [...this.notificationHistory];
  }

  /**
   * Get history for specific destination
   */
  getHistoryByDestination(destination: UploadDestination): UploadNotification[] {
    return this.notificationHistory.filter((n) => n.destination === destination);
  }

  /**
   * Clear history
   */
  clearHistory(): void {
    this.notificationHistory = [];
    console.log('Notification history cleared');
  }

  /**
   * Enable/disable notifications
   */
  setNotificationsEnabled(enabled: boolean): void {
    this.showNotifications = enabled;
    console.log(`Data upload notifications ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Check if notifications are enabled
   */
  areNotificationsEnabled(): boolean {
    return this.showNotifications;
  }

  /**
   * Get upload statistics
   */
  getStatistics(): {
    total: number;
    successful: number;
    failed: number;
    byDestination: Record<string, number>;
  } {
    const total = this.notificationHistory.length;
    const successful = this.notificationHistory.filter((n) => n.success).length;
    const failed = this.notificationHistory.filter((n) => !n.success).length;

    const byDestination: Record<string, number> = {};
    this.notificationHistory.forEach((n) => {
      byDestination[n.destination] = (byDestination[n.destination] || 0) + 1;
    });

    return {
      total,
      successful,
      failed,
      byDestination,
    };
  }

  /**
   * Create upload confirmation dialog message
   */
  createConfirmationMessage(destination: UploadDestination, dataType: string): string {
    const destinationName = this.getDestinationDisplayName(destination);

    return `You are about to send ${dataType} to ${destinationName}. This data will be transmitted over the internet. Do you want to continue?`;
  }

  /**
   * Requires user confirmation before upload
   */
  async requestUploadConfirmation(
    destination: UploadDestination,
    dataType: string
  ): Promise<boolean> {
    const message = this.createConfirmationMessage(destination, dataType);

    // In a real app, this would show a confirmation dialog
    // For now, we'll just log and return true
    console.log(`[CONFIRMATION REQUESTED] ${message}`);

    // Emit event for UI to catch
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('data-upload-confirmation-request', {
        detail: {
          destination,
          dataType,
          message,
        },
      });
      window.dispatchEvent(event);
    }

    // In production, this would wait for user response
    return true;
  }
}

// Export singleton instance
export const dataUploadNotifier = new DataUploadNotifier();
