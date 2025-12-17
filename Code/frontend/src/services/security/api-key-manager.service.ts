/**
 * API Key Manager
 * Manages encrypted storage and retrieval of API keys
 */

import { encryptionService } from './encryption.service';
import { databaseService } from '../database.service';

export interface ApiKeyConfig {
  provider: string;
  apiKey: string;
  label?: string;
  createdAt?: number;
}

export class ApiKeyManager {
  private masterPassword: string | null = null;
  private keyCache: Map<string, string> = new Map();
  private isUnlocked: boolean = false;

  /**
   * Set master password for encryption/decryption
   * @param password - User's master password
   */
  async setMasterPassword(password: string): Promise<void> {
    // Verify password is strong enough
    if (!this.isPasswordStrong(password)) {
      throw new Error(
        'Password must be at least 8 characters with uppercase, lowercase, and numbers'
      );
    }

    this.masterPassword = password;
    this.isUnlocked = true;

    // Store password hash for future verification
    const passwordHash = await encryptionService.hashPassword(password);
    const now = Date.now();
    await databaseService.setSetting({
      key: 'master_password_hash',
      value: passwordHash,
      valueType: 'string',
      category: 'security',
      description: 'Hashed master password for API key encryption',
      createdAt: now,
      updatedAt: now,
    });

    console.log('Master password set successfully');
  }

  /**
   * Unlock key manager with master password
   * @param password - User's master password
   */
  async unlock(password: string): Promise<boolean> {
    try {
      // Get stored password hash
      const setting = await databaseService.getSetting('master_password_hash');
      const storedHash = setting.value;

      // Verify password
      const isValid = await encryptionService.verifyPassword(password, storedHash);

      if (isValid) {
        this.masterPassword = password;
        this.isUnlocked = true;
        console.log('Key manager unlocked');
        return true;
      }

      console.warn('Invalid master password');
      return false;
    } catch (error) {
      console.error('Failed to unlock key manager:', error);
      return false;
    }
  }

  /**
   * Lock key manager and clear cached keys
   */
  lock(): void {
    this.masterPassword = null;
    this.isUnlocked = false;
    this.keyCache.clear();
    console.log('Key manager locked');
  }

  /**
   * Store API key securely
   * @param provider - Provider name (e.g., 'openai', 'perplexity')
   * @param apiKey - The API key to store
   * @param label - Optional label for the key
   */
  async storeApiKey(provider: string, apiKey: string, label?: string): Promise<void> {
    if (!this.isUnlocked || !this.masterPassword) {
      throw new Error('Key manager is locked. Please unlock first.');
    }

    try {
      // Encrypt API key
      const encrypted = await encryptionService.encrypt(apiKey, this.masterPassword);

      // Store in database
      const key = `api_key_${provider}`;
      const now = Date.now();
      await databaseService.setSetting({
        key,
        value: encrypted,
        valueType: 'encrypted',
        category: 'api_keys',
        description: label || `API key for ${provider}`,
        createdAt: now,
        updatedAt: now,
      });

      // Cache decrypted key
      this.keyCache.set(provider, apiKey);

      console.log(`API key for ${provider} stored securely`);
    } catch (error) {
      console.error(`Failed to store API key for ${provider}:`, error);
      throw new Error(`Failed to store API key: ${(error as Error).message}`);
    }
  }

  /**
   * Retrieve API key
   * @param provider - Provider name
   * @returns Decrypted API key or null if not found
   */
  async getApiKey(provider: string): Promise<string | null> {
    if (!this.isUnlocked || !this.masterPassword) {
      throw new Error('Key manager is locked. Please unlock first.');
    }

    // Check cache first
    if (this.keyCache.has(provider)) {
      return this.keyCache.get(provider)!;
    }

    try {
      // Get from database
      const key = `api_key_${provider}`;
      const setting = await databaseService.getSetting(key);

      if (!setting || !setting.value) {
        return null;
      }

      // Decrypt
      const decrypted = await encryptionService.decrypt(setting.value, this.masterPassword);

      // Cache for future use
      this.keyCache.set(provider, decrypted);

      return decrypted;
    } catch (error) {
      console.error(`Failed to retrieve API key for ${provider}:`, error);
      return null;
    }
  }

  /**
   * Delete API key
   * @param provider - Provider name
   */
  async deleteApiKey(provider: string): Promise<void> {
    try {
      const key = `api_key_${provider}`;
      await databaseService.deleteSetting(key);
      this.keyCache.delete(provider);
      console.log(`API key for ${provider} deleted`);
    } catch (error) {
      console.error(`Failed to delete API key for ${provider}:`, error);
      throw error;
    }
  }

  /**
   * List all stored API key providers
   */
  async listProviders(): Promise<string[]> {
    try {
      const settings = await databaseService.getAllSettings('api_keys');
      const providers = settings
        .filter((s) => s.key.startsWith('api_key_'))
        .map((s) => s.key.replace('api_key_', ''));
      return providers;
    } catch (error) {
      console.error('Failed to list providers:', error);
      return [];
    }
  }

  /**
   * Check if master password is set
   */
  async hasMasterPassword(): Promise<boolean> {
    try {
      const setting = await databaseService.getSetting('master_password_hash');
      return !!setting;
    } catch {
      return false;
    }
  }

  /**
   * Check if key manager is unlocked
   */
  isKeyManagerUnlocked(): boolean {
    return this.isUnlocked;
  }

  /**
   * Validate password strength
   */
  private isPasswordStrong(password: string): boolean {
    if (password.length < 8) return false;

    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);

    return hasUppercase && hasLowercase && hasNumber;
  }

  /**
   * Change master password
   */
  async changeMasterPassword(oldPassword: string, newPassword: string): Promise<void> {
    // Verify old password
    const isValid = await this.unlock(oldPassword);
    if (!isValid) {
      throw new Error('Invalid current password');
    }

    // Verify new password strength
    if (!this.isPasswordStrong(newPassword)) {
      throw new Error(
        'New password must be at least 8 characters with uppercase, lowercase, and numbers'
      );
    }

    // Re-encrypt all API keys with new password
    const providers = await this.listProviders();

    for (const provider of providers) {
      const apiKey = await this.getApiKey(provider);
      if (apiKey) {
        // Temporarily set new password
        const oldMasterPassword = this.masterPassword;
        this.masterPassword = newPassword;

        // Re-encrypt
        const encrypted = await encryptionService.encrypt(apiKey, newPassword);
        const key = `api_key_${provider}`;
        const setting = await databaseService.getSetting(key);

        await databaseService.setSetting({
          ...setting,
          value: encrypted,
          updatedAt: Date.now(),
        });

        // Restore for next iteration
        this.masterPassword = oldMasterPassword;
      }
    }

    // Update master password
    await this.setMasterPassword(newPassword);
    console.log('Master password changed successfully');
  }
}

// Export singleton instance
export const apiKeyManager = new ApiKeyManager();
