/**
 * Database Service
 * Frontend interface for database operations via Tauri backend
 */

import { invoke } from '@tauri-apps/api/tauri';

// ============================================================================
// Types (matching Rust backend)
// ============================================================================

export interface OcrRecord {
  id?: number;
  timestamp: number;
  imagePath?: string;
  imageData?: string;
  text: string;
  language: string;
  summary?: string;
  tags?: string;
  aiAnswers?: string;
  confidence?: number;
  processingTime?: number;
  createdAt: number;
  updatedAt: number;
}

export interface ModelRecord {
  id?: number;
  name: string;
  path: string;
  version: string;
  hash: string;
  installedAt: number;
  sizeBytes?: number;
  modelType: string;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface Setting {
  id?: number;
  key: string;
  value: string;
  valueType: string;
  category?: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Migration {
  version: number;
  name: string;
  appliedAt: number;
}

// ============================================================================
// Database Service Class
// ============================================================================

export class DatabaseService {
  // ========== OCR Records ==========

  async createOcrRecord(record: OcrRecord): Promise<number> {
    try {
      const id = await invoke<number>('create_ocr_record', { record });
      return id;
    } catch (error) {
      console.error('Failed to create OCR record:', error);
      throw new Error(`Failed to create OCR record: ${error}`);
    }
  }

  async getOcrRecord(id: number): Promise<OcrRecord> {
    try {
      const record = await invoke<OcrRecord>('get_ocr_record', { id });
      return record;
    } catch (error) {
      console.error(`Failed to get OCR record ${id}:`, error);
      throw new Error(`Failed to get OCR record: ${error}`);
    }
  }

  async getAllOcrRecords(limit?: number, offset?: number): Promise<OcrRecord[]> {
    try {
      const records = await invoke<OcrRecord[]>('get_all_ocr_records', { 
        limit, 
        offset 
      });
      return records;
    } catch (error) {
      console.error('Failed to get OCR records:', error);
      throw new Error(`Failed to get OCR records: ${error}`);
    }
  }

  async updateOcrRecord(id: number, record: OcrRecord): Promise<void> {
    try {
      await invoke('update_ocr_record', { id, record });
    } catch (error) {
      console.error(`Failed to update OCR record ${id}:`, error);
      throw new Error(`Failed to update OCR record: ${error}`);
    }
  }

  async deleteOcrRecord(id: number): Promise<void> {
    try {
      await invoke('delete_ocr_record', { id });
    } catch (error) {
      console.error(`Failed to delete OCR record ${id}:`, error);
      throw new Error(`Failed to delete OCR record: ${error}`);
    }
  }

  // ========== Model Records ==========

  async createModelRecord(record: ModelRecord): Promise<number> {
    try {
      const id = await invoke<number>('create_model_record', { record });
      return id;
    } catch (error) {
      console.error('Failed to create model record:', error);
      throw new Error(`Failed to create model record: ${error}`);
    }
  }

  async getAllModelRecords(): Promise<ModelRecord[]> {
    try {
      const records = await invoke<ModelRecord[]>('get_all_model_records');
      return records;
    } catch (error) {
      console.error('Failed to get model records:', error);
      throw new Error(`Failed to get model records: ${error}`);
    }
  }

  async deleteModelRecord(id: number): Promise<void> {
    try {
      await invoke('delete_model_record', { id });
    } catch (error) {
      console.error(`Failed to delete model record ${id}:`, error);
      throw new Error(`Failed to delete model record: ${error}`);
    }
  }

  // ========== Settings ==========

  async setSetting(setting: Setting): Promise<void> {
    try {
      await invoke('set_setting', { setting });
    } catch (error) {
      console.error(`Failed to set setting ${setting.key}:`, error);
      throw new Error(`Failed to set setting: ${error}`);
    }
  }

  async getSetting(key: string): Promise<Setting> {
    try {
      const setting = await invoke<Setting>('get_setting', { key });
      return setting;
    } catch (error) {
      console.error(`Failed to get setting ${key}:`, error);
      throw new Error(`Failed to get setting: ${error}`);
    }
  }

  async getAllSettings(category?: string): Promise<Setting[]> {
    try {
      const settings = await invoke<Setting[]>('get_all_settings', { category });
      return settings;
    } catch (error) {
      console.error('Failed to get settings:', error);
      throw new Error(`Failed to get settings: ${error}`);
    }
  }

  async deleteSetting(key: string): Promise<void> {
    try {
      await invoke('delete_setting', { key });
    } catch (error) {
      console.error(`Failed to delete setting ${key}:`, error);
      throw new Error(`Failed to delete setting: ${error}`);
    }
  }

  // ========== Helper Methods ==========

  /**
   * Get current timestamp in milliseconds
   */
  now(): number {
    return Date.now();
  }

  /**
   * Create a new OCR record with default values
   */
  createOcrRecordTemplate(text: string, language: string): OcrRecord {
    const now = this.now();
    return {
      timestamp: now,
      text,
      language,
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Create a new setting with default values
   */
  createSettingTemplate(key: string, value: string, valueType: string): Setting {
    const now = this.now();
    return {
      key,
      value,
      valueType,
      createdAt: now,
      updatedAt: now,
    };
  }

  // ============================================================================
  // Migration Methods
  // ============================================================================

  /**
   * Get current database schema version
   */
  async getDatabaseVersion(): Promise<number> {
    return invoke<number>('get_database_version');
  }

  /**
   * Get migration history
   */
  async getMigrationHistory(): Promise<Migration[]> {
    return invoke<Migration[]>('get_migration_history');
  }
}

// Export singleton instance
export const databaseService = new DatabaseService();
