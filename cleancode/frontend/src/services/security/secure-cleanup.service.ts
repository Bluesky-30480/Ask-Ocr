/**
 * Secure Data Cleanup Service
 * Handles secure deletion of sensitive data on uninstall or user request
 */

import { invoke } from '@tauri-apps/api/tauri';
import { databaseService } from '../database.service';
import { apiKeyManager } from './api-key-manager.service';
import { dataUploadNotifier } from './data-upload-notifier.service';

export interface CleanupOptions {
  deleteDatabase?: boolean;
  deleteApiKeys?: boolean;
  deleteSettings?: boolean;
  deleteCache?: boolean;
  deleteLogs?: boolean;
  secureWipe?: boolean; // Overwrite data before deletion
}

export interface CleanupResult {
  success: boolean;
  itemsCleaned: string[];
  errors: string[];
  duration: number;
}

export class SecureDataCleanupService {
  /**
   * Perform full cleanup (for uninstall)
   */
  async fullCleanup(): Promise<CleanupResult> {
    return this.cleanup({
      deleteDatabase: true,
      deleteApiKeys: true,
      deleteSettings: true,
      deleteCache: true,
      deleteLogs: true,
      secureWipe: true,
    });
  }

  /**
   * Perform partial cleanup
   */
  async cleanup(options: CleanupOptions): Promise<CleanupResult> {
    const startTime = Date.now();
    const itemsCleaned: string[] = [];
    const errors: string[] = [];

    try {
      // 1. Clear API keys
      if (options.deleteApiKeys) {
        try {
          await this.clearApiKeys();
          itemsCleaned.push('API Keys');
        } catch (error) {
          errors.push(`API Keys: ${error}`);
        }
      }

      // 2. Clear database
      if (options.deleteDatabase) {
        try {
          await this.clearDatabase(options.secureWipe);
          itemsCleaned.push('Database');
        } catch (error) {
          errors.push(`Database: ${error}`);
        }
      }

      // 3. Clear settings
      if (options.deleteSettings) {
        try {
          await this.clearSettings();
          itemsCleaned.push('Settings');
        } catch (error) {
          errors.push(`Settings: ${error}`);
        }
      }

      // 4. Clear cache
      if (options.deleteCache) {
        try {
          await this.clearCache();
          itemsCleaned.push('Cache');
        } catch (error) {
          errors.push(`Cache: ${error}`);
        }
      }

      // 5. Clear logs
      if (options.deleteLogs) {
        try {
          await this.clearLogs();
          itemsCleaned.push('Logs');
        } catch (error) {
          errors.push(`Logs: ${error}`);
        }
      }

      // 6. Clear notification history
      try {
        dataUploadNotifier.clearHistory();
        itemsCleaned.push('Notification History');
      } catch (error) {
        errors.push(`Notification History: ${error}`);
      }

      const duration = Date.now() - startTime;

      return {
        success: errors.length === 0,
        itemsCleaned,
        errors,
        duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      return {
        success: false,
        itemsCleaned,
        errors: [...errors, `Cleanup failed: ${error}`],
        duration,
      };
    }
  }

  /**
   * Clear all API keys
   */
  private async clearApiKeys(): Promise<void> {
    try {
      // Lock the API key manager
      apiKeyManager.lock();

      // Delete all API key settings from database
      const apiKeyTypes = ['openai', 'perplexity', 'google', 'anthropic'];

      for (const type of apiKeyTypes) {
        try {
          await databaseService.deleteSetting(`api_key_${type}`);
        } catch (error) {
          // Key might not exist, continue
          console.warn(`Failed to delete ${type} API key:`, error);
        }
      }

      // Delete master password hash
      try {
        await databaseService.deleteSetting('master_password_hash');
      } catch (error) {
        console.warn('Failed to delete master password hash:', error);
      }

      console.log('API keys cleared');
    } catch (error) {
      console.error('Failed to clear API keys:', error);
      throw error;
    }
  }

  /**
   * Clear database
   */
  private async clearDatabase(secureWipe: boolean = false): Promise<void> {
    try {
      if (secureWipe) {
        // Overwrite sensitive data before deletion
        await this.secureWipeDatabase();
      }

      // Delete database file through Tauri
      await invoke('delete_database');

      console.log('Database cleared');
    } catch (error) {
      console.error('Failed to clear database:', error);
      throw error;
    }
  }

  /**
   * Securely wipe database by overwriting sensitive data
   */
  private async secureWipeDatabase(): Promise<void> {
    try {
      // Get all settings
      const settings = await databaseService.getAllSettings();

      // Overwrite each setting with random data
      for (const setting of settings) {
        const randomValue = this.generateRandomString(setting.value.length);
        await databaseService.setSetting({
          key: setting.key,
          value: randomValue,
          valueType: setting.valueType,
          category: setting.category,
          description: 'wiped',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }

      console.log('Database securely wiped');
    } catch (error) {
      console.error('Failed to securely wipe database:', error);
      // Continue anyway
    }
  }

  /**
   * Clear settings
   */
  private async clearSettings(): Promise<void> {
    try {
      // Clear privacy settings
      await databaseService.deleteSetting('privacy_settings');

      // Clear other settings
      await databaseService.deleteSetting('app_settings');
      await databaseService.deleteSetting('ocr_settings');

      console.log('Settings cleared');
    } catch (error) {
      console.error('Failed to clear settings:', error);
      throw error;
    }
  }

  /**
   * Clear cache files
   */
  private async clearCache(): Promise<void> {
    try {
      // Clear through Tauri backend
      await invoke('clear_cache');

      // Clear browser cache
      if (typeof window !== 'undefined' && 'caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((name) => caches.delete(name)));
      }

      console.log('Cache cleared');
    } catch (error) {
      console.error('Failed to clear cache:', error);
      // Non-critical, continue
    }
  }

  /**
   * Clear log files
   */
  private async clearLogs(): Promise<void> {
    try {
      // Clear through Tauri backend
      await invoke('clear_logs');

      console.log('Logs cleared');
    } catch (error) {
      console.error('Failed to clear logs:', error);
      // Non-critical, continue
    }
  }

  /**
   * Generate random string for secure wiping
   */
  private generateRandomString(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);

    for (let i = 0; i < length; i++) {
      result += chars[array[i] % chars.length];
    }

    return result;
  }

  /**
   * Clear only OCR history
   */
  async clearOcrHistory(): Promise<void> {
    try {
      await invoke('clear_ocr_history');
      console.log('OCR history cleared');
    } catch (error) {
      console.error('Failed to clear OCR history:', error);
      throw error;
    }
  }

  /**
   * Clear only screenshots
   */
  async clearScreenshots(): Promise<void> {
    try {
      await invoke('clear_screenshots');
      console.log('Screenshots cleared');
    } catch (error) {
      console.error('Failed to clear screenshots:', error);
      throw error;
    }
  }

  /**
   * Export data before cleanup (for backup)
   */
  async exportData(): Promise<string> {
    try {
      const data = {
        settings: await databaseService.getAllSettings(),
        timestamp: Date.now(),
        version: '1.0.0',
      };

      return JSON.stringify(data, null, 2);
    } catch (error) {
      console.error('Failed to export data:', error);
      throw error;
    }
  }

  /**
   * Schedule automatic cleanup
   */
  async scheduleAutoCleanup(days: number): Promise<void> {
    try {
      const setting = {
        key: 'auto_cleanup_days',
        value: days.toString(),
        valueType: 'number' as const,
        category: 'privacy',
        description: 'Automatically delete data older than this many days',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await databaseService.setSetting(setting);

      console.log(`Auto cleanup scheduled for ${days} days`);
    } catch (error) {
      console.error('Failed to schedule auto cleanup:', error);
      throw error;
    }
  }

  /**
   * Perform auto cleanup based on schedule
   */
  async performAutoCleanup(): Promise<void> {
    try {
      const setting = await databaseService.getSetting('auto_cleanup_days');

      if (!setting) {
        return; // No auto cleanup scheduled
      }

      const days = parseInt(setting.value);

      if (isNaN(days) || days <= 0) {
        return;
      }

      // Delete old OCR results
      const cutoffTime = Date.now() - days * 24 * 60 * 60 * 1000;
      await invoke('delete_old_ocr_results', { beforeTimestamp: cutoffTime });

      console.log(`Auto cleanup completed: deleted data older than ${days} days`);
    } catch (error) {
      console.error('Failed to perform auto cleanup:', error);
    }
  }
}

// Export singleton instance
export const secureDataCleanupService = new SecureDataCleanupService();
