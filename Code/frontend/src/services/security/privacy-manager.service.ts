/**
 * Privacy Manager
 * Manages user privacy permissions and consent
 */

import { databaseService } from '../database.service';

export type PermissionType =
  | 'analytics'
  | 'cloud_sync'
  | 'ai_api'
  | 'telemetry'
  | 'crash_reports'
  | 'ocr_online'
  | 'data_sharing';

export interface PrivacyPermission {
  type: PermissionType;
  granted: boolean;
  grantedAt?: number;
  description: string;
  required: boolean;
}

export interface PrivacyConsent {
  version: string;
  acceptedAt: number;
  permissions: PrivacyPermission[];
}

export class PrivacyManager {
  private currentVersion = '1.0.0';
  private permissions: Map<PermissionType, PrivacyPermission> = new Map();

  constructor() {
    this.initializeDefaultPermissions();
  }

  /**
   * Initialize default permission states
   */
  private initializeDefaultPermissions(): void {
    const defaultPermissions: PrivacyPermission[] = [
      {
        type: 'ocr_online',
        granted: false,
        description: 'Use online OCR services when available for improved accuracy',
        required: false,
      },
      {
        type: 'ai_api',
        granted: false,
        description:
          'Send OCR text to AI services (OpenAI, Perplexity) for summaries and answers',
        required: false,
      },
      {
        type: 'cloud_sync',
        granted: false,
        description: 'Sync OCR history and settings to cloud (future feature)',
        required: false,
      },
      {
        type: 'analytics',
        granted: false,
        description: 'Anonymous usage analytics to improve the app',
        required: false,
      },
      {
        type: 'crash_reports',
        granted: false,
        description: 'Automatic crash reports to help fix bugs',
        required: false,
      },
      {
        type: 'telemetry',
        granted: false,
        description: 'Performance and feature usage telemetry',
        required: false,
      },
      {
        type: 'data_sharing',
        granted: false,
        description: 'Share anonymized data with third parties',
        required: false,
      },
    ];

    defaultPermissions.forEach((p) => this.permissions.set(p.type, p));
  }

  /**
   * Load permissions from database
   */
  async loadPermissions(): Promise<void> {
    try {
      const setting = await databaseService.getSetting('privacy_permissions');
      if (setting && setting.value) {
        const stored: PrivacyPermission[] = JSON.parse(setting.value);
        stored.forEach((p) => {
          if (this.permissions.has(p.type)) {
            this.permissions.set(p.type, p);
          }
        });
      }
    } catch (error) {
      console.warn('Failed to load privacy permissions, using defaults:', error);
    }
  }

  /**
   * Save permissions to database
   */
  private async savePermissions(): Promise<void> {
    try {
      const permissionsArray = Array.from(this.permissions.values());
      const now = Date.now();

      await databaseService.setSetting({
        key: 'privacy_permissions',
        value: JSON.stringify(permissionsArray),
        valueType: 'json',
        category: 'privacy',
        description: 'User privacy permissions and consent',
        createdAt: now,
        updatedAt: now,
      });
    } catch (error) {
      console.error('Failed to save privacy permissions:', error);
      throw error;
    }
  }

  /**
   * Request permission from user
   */
  async requestPermission(type: PermissionType): Promise<boolean> {
    const permission = this.permissions.get(type);
    if (!permission) {
      throw new Error(`Unknown permission type: ${type}`);
    }

    // If already granted, return true
    if (permission.granted) {
      return true;
    }

    // In a real app, this would show a dialog
    // For now, we'll just log and return false
    console.log(`Permission requested: ${type} - ${permission.description}`);

    return false;
  }

  /**
   * Grant permission
   */
  async grantPermission(type: PermissionType): Promise<void> {
    const permission = this.permissions.get(type);
    if (!permission) {
      throw new Error(`Unknown permission type: ${type}`);
    }

    permission.granted = true;
    permission.grantedAt = Date.now();
    this.permissions.set(type, permission);

    await this.savePermissions();
    console.log(`Permission granted: ${type}`);
  }

  /**
   * Revoke permission
   */
  async revokePermission(type: PermissionType): Promise<void> {
    const permission = this.permissions.get(type);
    if (!permission) {
      throw new Error(`Unknown permission type: ${type}`);
    }

    if (permission.required) {
      throw new Error(`Cannot revoke required permission: ${type}`);
    }

    permission.granted = false;
    permission.grantedAt = undefined;
    this.permissions.set(type, permission);

    await this.savePermissions();
    console.log(`Permission revoked: ${type}`);
  }

  /**
   * Check if permission is granted
   */
  hasPermission(type: PermissionType): boolean {
    const permission = this.permissions.get(type);
    return permission?.granted || false;
  }

  /**
   * Get all permissions
   */
  getAllPermissions(): PrivacyPermission[] {
    return Array.from(this.permissions.values());
  }

  /**
   * Get permission details
   */
  getPermission(type: PermissionType): PrivacyPermission | undefined {
    return this.permissions.get(type);
  }

  /**
   * Accept privacy policy
   */
  async acceptPrivacyPolicy(): Promise<void> {
    const consent: PrivacyConsent = {
      version: this.currentVersion,
      acceptedAt: Date.now(),
      permissions: Array.from(this.permissions.values()),
    };

    const now = Date.now();
    await databaseService.setSetting({
      key: 'privacy_consent',
      value: JSON.stringify(consent),
      valueType: 'json',
      category: 'privacy',
      description: 'Privacy policy consent record',
      createdAt: now,
      updatedAt: now,
    });

    console.log('Privacy policy accepted');
  }

  /**
   * Check if privacy policy is accepted
   */
  async isPrivacyPolicyAccepted(): Promise<boolean> {
    try {
      const setting = await databaseService.getSetting('privacy_consent');
      if (!setting || !setting.value) {
        return false;
      }

      const consent: PrivacyConsent = JSON.parse(setting.value);
      return consent.version === this.currentVersion;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get privacy consent details
   */
  async getPrivacyConsent(): Promise<PrivacyConsent | null> {
    try {
      const setting = await databaseService.getSetting('privacy_consent');
      if (!setting || !setting.value) {
        return null;
      }

      return JSON.parse(setting.value);
    } catch (error) {
      return null;
    }
  }

  /**
   * Enable offline-only mode (revoke all network permissions)
   */
  async enableOfflineMode(): Promise<void> {
    const networkPermissions: PermissionType[] = [
      'ocr_online',
      'ai_api',
      'cloud_sync',
      'analytics',
      'telemetry',
      'data_sharing',
    ];

    for (const type of networkPermissions) {
      const permission = this.permissions.get(type);
      if (permission && !permission.required) {
        await this.revokePermission(type);
      }
    }

    console.log('Offline mode enabled');
  }

  /**
   * Check if in offline mode
   */
  isOfflineMode(): boolean {
    const networkPermissions: PermissionType[] = [
      'ocr_online',
      'ai_api',
      'cloud_sync',
    ];

    return networkPermissions.every((type) => !this.hasPermission(type));
  }

  /**
   * Reset all permissions to default
   */
  async resetPermissions(): Promise<void> {
    this.initializeDefaultPermissions();
    await this.savePermissions();
    console.log('Permissions reset to defaults');
  }
}

// Export singleton instance
export const privacyManager = new PrivacyManager();
