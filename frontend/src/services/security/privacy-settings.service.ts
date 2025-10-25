/**
 * Privacy Settings Service
 * Manages offline-first privacy preferences
 */

import { databaseService } from '../database.service';
import { privacyManager } from './privacy-manager.service';
import type { PermissionType } from './privacy-manager.service';
import { dataUploadNotifier } from './data-upload-notifier.service';

export interface PrivacySettings {
  offlineMode: boolean;
  allowOnlineOcr: boolean;
  allowAiApi: boolean;
  allowCloudSync: boolean;
  allowAnalytics: boolean;
  allowCrashReports: boolean;
  allowTelemetry: boolean;
  allowDataSharing: boolean;
  requireUploadConfirmation: boolean;
  showUploadNotifications: boolean;
  autoDeleteAfterDays: number | null;
  version: string;
  lastUpdated: number;
}

export class PrivacySettingsService {
  private settings: PrivacySettings | null = null;
  private readonly SETTINGS_KEY = 'privacy_settings';
  private readonly DEFAULT_SETTINGS: PrivacySettings = {
    // Offline-first: All online features disabled by default
    offlineMode: true,
    allowOnlineOcr: false,
    allowAiApi: false,
    allowCloudSync: false,
    allowAnalytics: false,
    allowCrashReports: false,
    allowTelemetry: false,
    allowDataSharing: false,
    
    // Transparency features enabled by default
    requireUploadConfirmation: true,
    showUploadNotifications: true,
    
    // No auto-deletion by default
    autoDeleteAfterDays: null,
    
    version: '1.0.0',
    lastUpdated: Date.now(),
  };

  /**
   * Initialize settings (load from database)
   */
  async initialize(): Promise<void> {
    try {
      const stored = await databaseService.getSetting(this.SETTINGS_KEY);

      if (stored) {
        this.settings = JSON.parse(stored.value);
        await this.syncWithPermissions();
      } else {
        // First run: use default settings
        this.settings = { ...this.DEFAULT_SETTINGS };
        await this.save();
      }

      // Update notifier based on settings
      if (this.settings) {
        dataUploadNotifier.setNotificationsEnabled(this.settings.showUploadNotifications);
      }

      console.log('Privacy settings initialized:', this.settings);
    } catch (error) {
      console.error('Failed to initialize privacy settings:', error);
      this.settings = { ...this.DEFAULT_SETTINGS };
    }
  }

  /**
   * Get current settings
   */
  getSettings(): PrivacySettings {
    if (!this.settings) {
      throw new Error('Privacy settings not initialized. Call initialize() first.');
    }
    return { ...this.settings };
  }

  /**
   * Update settings
   */
  async updateSettings(updates: Partial<PrivacySettings>): Promise<void> {
    if (!this.settings) {
      throw new Error('Privacy settings not initialized.');
    }

    const oldSettings = { ...this.settings };
    this.settings = {
      ...this.settings,
      ...updates,
      lastUpdated: Date.now(),
    };

    // Handle offline mode
    if (updates.offlineMode !== undefined) {
      if (updates.offlineMode) {
        // Entering offline mode: disable all online features
        this.settings.allowOnlineOcr = false;
        this.settings.allowAiApi = false;
        this.settings.allowCloudSync = false;
        this.settings.allowAnalytics = false;
        this.settings.allowCrashReports = false;
        this.settings.allowTelemetry = false;
        this.settings.allowDataSharing = false;
        
        await privacyManager.enableOfflineMode();
      } else {
        // Exiting offline mode: don't automatically enable features
        // User must explicitly enable each feature
        console.log('Offline mode disabled. User can now enable online features.');
      }
    }

    // Sync with permission system
    await this.syncWithPermissions();

    // Update notifier
    if (updates.showUploadNotifications !== undefined) {
      dataUploadNotifier.setNotificationsEnabled(updates.showUploadNotifications);
    }

    // Save to database
    await this.save();

    console.log('Privacy settings updated:', {
      old: oldSettings,
      new: this.settings,
    });
  }

  /**
   * Enable offline mode (disables all online features)
   */
  async enableOfflineMode(): Promise<void> {
    await this.updateSettings({ offlineMode: true });
  }

  /**
   * Disable offline mode (allows user to enable features)
   */
  async disableOfflineMode(): Promise<void> {
    await this.updateSettings({ offlineMode: false });
  }

  /**
   * Enable online OCR
   */
  async enableOnlineOcr(): Promise<void> {
    if (this.settings?.offlineMode) {
      throw new Error('Cannot enable online OCR while in offline mode');
    }
    await this.updateSettings({ allowOnlineOcr: true });
  }

  /**
   * Enable AI API access
   */
  async enableAiApi(): Promise<void> {
    if (this.settings?.offlineMode) {
      throw new Error('Cannot enable AI API while in offline mode');
    }
    await this.updateSettings({ allowAiApi: true });
  }

  /**
   * Reset to default settings (offline-first)
   */
  async resetToDefaults(): Promise<void> {
    this.settings = {
      ...this.DEFAULT_SETTINGS,
      lastUpdated: Date.now(),
    };

    await this.syncWithPermissions();
    await this.save();

    console.log('Privacy settings reset to defaults');
  }

  /**
   * Export settings for backup
   */
  exportSettings(): string {
    if (!this.settings) {
      throw new Error('Privacy settings not initialized.');
    }
    return JSON.stringify(this.settings, null, 2);
  }

  /**
   * Import settings from backup
   */
  async importSettings(json: string): Promise<void> {
    try {
      const imported = JSON.parse(json) as PrivacySettings;

      // Validate structure
      if (typeof imported.offlineMode !== 'boolean') {
        throw new Error('Invalid settings format');
      }

      this.settings = {
        ...imported,
        lastUpdated: Date.now(),
      };

      await this.syncWithPermissions();
      await this.save();

      console.log('Privacy settings imported successfully');
    } catch (error) {
      console.error('Failed to import settings:', error);
      throw new Error('Invalid settings file');
    }
  }

  /**
   * Check if a specific feature is allowed
   */
  isFeatureAllowed(feature: keyof Omit<PrivacySettings, 'version' | 'lastUpdated'>): boolean {
    if (!this.settings) {
      return false;
    }

    // Offline mode blocks all online features
    if (this.settings.offlineMode) {
      const onlineFeatures = [
        'allowOnlineOcr',
        'allowAiApi',
        'allowCloudSync',
        'allowAnalytics',
        'allowCrashReports',
        'allowTelemetry',
        'allowDataSharing',
      ];

      if (onlineFeatures.includes(feature)) {
        return false;
      }
    }

    return Boolean(this.settings[feature]);
  }

  /**
   * Sync settings with permission manager
   */
  private async syncWithPermissions(): Promise<void> {
    if (!this.settings) return;

    const permissionMap: Array<[keyof PrivacySettings, PermissionType]> = [
      ['allowOnlineOcr', 'ocr_online'],
      ['allowAiApi', 'ai_api'],
      ['allowCloudSync', 'cloud_sync'],
      ['allowAnalytics', 'analytics'],
      ['allowCrashReports', 'crash_reports'],
      ['allowTelemetry', 'telemetry'],
      ['allowDataSharing', 'data_sharing'],
    ];

    for (const [settingKey, permissionType] of permissionMap) {
      const allowed = this.settings[settingKey];

      if (allowed) {
        await privacyManager.grantPermission(permissionType);
      } else {
        await privacyManager.revokePermission(permissionType);
      }
    }
  }

  /**
   * Save settings to database
   */
  private async save(): Promise<void> {
    if (!this.settings) return;

    await databaseService.setSetting({
      key: this.SETTINGS_KEY,
      value: JSON.stringify(this.settings),
      valueType: 'json',
      category: 'privacy',
      description: 'Privacy and security settings',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  }

  /**
   * Get privacy-friendly summary
   */
  getSummary(): string {
    if (!this.settings) {
      return 'Privacy settings not loaded';
    }

    const mode = this.settings.offlineMode ? 'Offline Mode (All data stays on your device)' : 'Online Mode';
    const enabledFeatures: string[] = [];

    if (this.settings.allowOnlineOcr) enabledFeatures.push('Online OCR');
    if (this.settings.allowAiApi) enabledFeatures.push('AI API');
    if (this.settings.allowCloudSync) enabledFeatures.push('Cloud Sync');
    if (this.settings.allowAnalytics) enabledFeatures.push('Analytics');

    const features = enabledFeatures.length > 0 
      ? enabledFeatures.join(', ')
      : 'No online features enabled';

    return `${mode}\nEnabled features: ${features}`;
  }
}

// Export singleton instance
export const privacySettingsService = new PrivacySettingsService();
