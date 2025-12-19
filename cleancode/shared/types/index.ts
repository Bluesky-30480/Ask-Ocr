/**
 * Shared TypeScript type definitions for Ask OCR application
 * These types are used across frontend and can be shared with backend
 */

// ============================================================================
// OCR Related Types
// ============================================================================

export interface OcrResult {
  id: string;
  timestamp: number;
  imagePath: string;
  imageData?: string; // base64 encoded image
  text: string;
  language: string;
  confidence?: number;
  summary?: string;
  tags?: string[];
  aiAnswers?: AiAnswer[];
}

export interface OcrRequest {
  imageData: string; // base64 or file path
  language?: string;
  mode?: 'fast' | 'accurate';
}

// ============================================================================
// AI Integration Types
// ============================================================================

export interface AiAnswer {
  id: string;
  source: 'openai' | 'perplexity' | 'local';
  query: string;
  answer: string;
  confidence?: number;
  sources?: SourceLink[];
  timestamp: number;
}

export interface SourceLink {
  title: string;
  url: string;
  snippet?: string;
}

export interface AiRequest {
  text: string;
  type: 'summary' | 'research' | 'question';
  question?: string;
}

// ============================================================================
// Model Management Types
// ============================================================================

export interface ModelRecord {
  id: string;
  name: string;
  path: string;
  version: string;
  hash: string;
  installedAt: number;
  size: number;
  type: 'local' | 'remote';
  status: 'active' | 'inactive' | 'downloading' | 'error';
}

export interface ModelDownloadProgress {
  modelId: string;
  progress: number; // 0-100
  downloadedBytes: number;
  totalBytes: number;
  speed?: number; // bytes per second
}

// ============================================================================
// Settings Types
// ============================================================================

export interface AppSettings {
  shortcuts: ShortcutConfig;
  preferredModel: string;
  apiKeys: ApiKeysConfig;
  theme: 'light' | 'dark' | 'system';
  language: string;
  ocrSettings: OcrSettings;
  privacy: PrivacySettings;
}

export interface ShortcutConfig {
  screenshot: string;
  fullScreenshot: string;
  windowScreenshot: string;
  openHistory: string;
  openSettings: string;
  toggleLocalMode: string;
  [key: string]: string;
}

export interface ApiKeysConfig {
  openai?: string;
  perplexity?: string;
  [key: string]: string | undefined;
}

export interface OcrSettings {
  defaultLanguage: string;
  supportedLanguages: string[];
  autoDetectLanguage: boolean;
  defaultMode: 'fast' | 'accurate';
}

export interface PrivacySettings {
  localMode: boolean;
  uploadConsent: boolean;
  saveHistory: boolean;
  autoCleanup: boolean;
  cleanupDays: number;
}

// ============================================================================
// Screenshot Types
// ============================================================================

export interface ScreenshotRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ScreenshotRequest {
  type: 'rectangle' | 'fullscreen' | 'window';
  region?: ScreenshotRegion;
}

export interface ScreenshotResult {
  success: boolean;
  imageData?: string; // base64
  imagePath?: string;
  error?: string;
}

// ============================================================================
// UI State Types
// ============================================================================

export interface ModalTab {
  id: 'summary' | 'research' | 'ask' | 'actions';
  label: string;
  active: boolean;
}

export interface LoadingState {
  isLoading: boolean;
  message?: string;
  progress?: number;
}

export interface ErrorState {
  hasError: boolean;
  message?: string;
  code?: string;
}

// ============================================================================
// Export/Action Types
// ============================================================================

export interface ExportOptions {
  format: 'txt' | 'pdf' | 'markdown' | 'csv';
  fileName: string;
  includeMetadata: boolean;
  includeImage: boolean;
}

export interface ExportResult {
  success: boolean;
  filePath?: string;
  error?: string;
}

// ============================================================================
// Database Schema Types
// ============================================================================

export interface DatabaseSchema {
  ocrRecords: OcrResult[];
  modelRecords: ModelRecord[];
  settings: AppSettings;
}

// ============================================================================
// Utility Types
// ============================================================================

export type AsyncTaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface AsyncTask<T = any> {
  id: string;
  type: string;
  status: AsyncTaskStatus;
  priority: number;
  result?: T;
  error?: string;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
}
