/**
 * Model Download Manager Service
 * Handles downloading, verifying, and managing local AI model installations
 */

import { invoke } from '@tauri-apps/api/tauri';
import type { ModelMetadata } from './model-registry.service';

export interface DownloadProgress {
  modelId: string;
  modelName: string;
  status: 'queued' | 'downloading' | 'verifying' | 'installing' | 'completed' | 'failed' | 'paused' | 'cancelled';
  
  // Progress tracking
  bytesDownloaded: number;
  totalBytes: number;
  percentage: number;
  
  // Speed and timing
  downloadSpeed: number; // bytes per second
  averageSpeed: number; // bytes per second
  elapsedTime: number; // seconds
  estimatedTimeRemaining: number; // seconds
  
  // Network stats
  peakSpeed: number;
  currentChunk: number;
  totalChunks: number;
  
  // Verification
  sha256Hash?: string;
  expectedHash?: string;
  isVerified: boolean;
  
  // Error handling
  error?: string;
  retryCount: number;
  maxRetries: number;
  
  // Resume support
  isResumable: boolean;
  resumeToken?: string;
  
  // Timestamps
  startTime: number;
  endTime?: number;
  lastUpdateTime: number;
}

export interface DownloadOptions {
  modelId: string;
  quantization: 'fp16' | 'q4_0' | 'q4_K_M' | 'q5_K_M' | 'q8_0';
  installPath: string;
  
  // Network options
  maxDownloadSpeed?: number; // bytes per second, undefined = unlimited
  maxRetries?: number;
  timeoutSeconds?: number;
  
  // Resume options
  resumeIfPossible?: boolean;
  
  // Verification
  verifyChecksum?: boolean;
  expectedSha256?: string;
  
  // Callbacks
  onProgress?: (progress: DownloadProgress) => void;
  onComplete?: (modelId: string) => void;
  onError?: (error: Error) => void;
}

export interface DownloadQueueItem {
  id: string;
  modelMetadata: ModelMetadata;
  options: DownloadOptions;
  priority: number;
  addedAt: number;
}

export class ModelDownloadService {
  private activeDownloads = new Map<string, DownloadProgress>();
  private downloadQueue: DownloadQueueItem[] = [];
  private maxConcurrentDownloads = 2;
  private downloadSpeedLimit?: number; // Global speed limit
  
  constructor() {
    this.startQueueProcessor();
  }

  /**
   * Add a model to the download queue
   */
  async queueDownload(
    modelMetadata: ModelMetadata,
    options: DownloadOptions,
    priority: number = 0
  ): Promise<string> {
    const queueItem: DownloadQueueItem = {
      id: `download_${Date.now()}_${modelMetadata.id}`,
      modelMetadata,
      options,
      priority,
      addedAt: Date.now(),
    };

    // Insert into queue based on priority
    const insertIndex = this.downloadQueue.findIndex(item => item.priority < priority);
    if (insertIndex === -1) {
      this.downloadQueue.push(queueItem);
    } else {
      this.downloadQueue.splice(insertIndex, 0, queueItem);
    }

    // Initialize progress tracking
    this.activeDownloads.set(queueItem.id, {
      modelId: modelMetadata.id,
      modelName: modelMetadata.displayName,
      status: 'queued',
      bytesDownloaded: 0,
      totalBytes: this.estimateTotalBytes(modelMetadata, options.quantization),
      percentage: 0,
      downloadSpeed: 0,
      averageSpeed: 0,
      elapsedTime: 0,
      estimatedTimeRemaining: 0,
      peakSpeed: 0,
      currentChunk: 0,
      totalChunks: 0,
      isVerified: false,
      retryCount: 0,
      maxRetries: options.maxRetries || 3,
      isResumable: options.resumeIfPossible ?? true,
      startTime: Date.now(),
      lastUpdateTime: Date.now(),
    });

    return queueItem.id;
  }

  /**
   * Start downloading a model from the queue
   */
  private async processDownload(queueItem: DownloadQueueItem): Promise<void> {
    const { id, modelMetadata, options } = queueItem;
    const progress = this.activeDownloads.get(id);
    
    if (!progress) {
      throw new Error(`Download progress not found for ${id}`);
    }

    try {
      // Update status to downloading
      this.updateProgress(id, { status: 'downloading' });

      // Call Tauri backend to download the model
      await this.downloadWithProgress(id, modelMetadata, options);

      // Verify checksum if requested
      if (options.verifyChecksum && options.expectedSha256) {
        this.updateProgress(id, { status: 'verifying' });
        const isValid = await this.verifyChecksum(options.installPath, options.expectedSha256);
        
        this.updateProgress(id, {
          isVerified: isValid,
          expectedHash: options.expectedSha256,
        });

        if (!isValid) {
          throw new Error('Checksum verification failed');
        }
      }

      // Update status to installing
      this.updateProgress(id, { status: 'installing' });
      await this.installModel(modelMetadata, options);

      // Mark as completed
      this.updateProgress(id, {
        status: 'completed',
        percentage: 100,
        endTime: Date.now(),
      });

      // Call completion callback
      if (options.onComplete) {
        options.onComplete(modelMetadata.id);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Check if we should retry
      if (progress.retryCount < progress.maxRetries) {
        this.updateProgress(id, {
          retryCount: progress.retryCount + 1,
        });
        
        // Wait before retry (exponential backoff)
        const delay = Math.min(1000 * Math.pow(2, progress.retryCount), 30000);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Retry download
        return this.processDownload(queueItem);
      }

      // Max retries exceeded, mark as failed
      this.updateProgress(id, {
        status: 'failed',
        error: errorMessage,
        endTime: Date.now(),
      });

      if (options.onError) {
        options.onError(error as Error);
      }
    }
  }

  /**
   * Download model with progress tracking
   */
  private async downloadWithProgress(
    downloadId: string,
    modelMetadata: ModelMetadata,
    options: DownloadOptions
  ): Promise<void> {
    const progress = this.activeDownloads.get(downloadId);
    if (!progress) return;

    const startTime = Date.now();
    let lastUpdateTime = startTime;
    let bytesAtLastUpdate = 0;

    try {
      // Use Ollama CLI through Tauri backend
      const downloadUrl = modelMetadata.downloadUrl.replace('ollama://library/', '');
      
      // Start download process
      const effectiveSpeedLimit = options.maxDownloadSpeed || this.downloadSpeedLimit;
      const unlisten = await invoke<any>('download_ollama_model', {
        modelName: downloadUrl,
        installPath: options.installPath,
        maxSpeed: effectiveSpeedLimit,
        onProgress: (event: any) => {
          const now = Date.now();
          const elapsedTime = (now - startTime) / 1000; // seconds
          const timeSinceLastUpdate = (now - lastUpdateTime) / 1000;

          // Calculate speeds
          const bytesSinceLastUpdate = event.bytesDownloaded - bytesAtLastUpdate;
          const instantSpeed = timeSinceLastUpdate > 0 ? bytesSinceLastUpdate / timeSinceLastUpdate : 0;
          const averageSpeed = elapsedTime > 0 ? event.bytesDownloaded / elapsedTime : 0;

          // Calculate ETA
          const remainingBytes = event.totalBytes - event.bytesDownloaded;
          const estimatedTimeRemaining = averageSpeed > 0 ? remainingBytes / averageSpeed : 0;

          // Update progress
          this.updateProgress(downloadId, {
            bytesDownloaded: event.bytesDownloaded,
            totalBytes: event.totalBytes,
            percentage: (event.bytesDownloaded / event.totalBytes) * 100,
            downloadSpeed: instantSpeed,
            averageSpeed: averageSpeed,
            peakSpeed: Math.max(progress.peakSpeed, instantSpeed),
            elapsedTime: elapsedTime,
            estimatedTimeRemaining: estimatedTimeRemaining,
            lastUpdateTime: now,
          });

          // Call user progress callback
          if (options.onProgress) {
            options.onProgress(this.activeDownloads.get(downloadId)!);
          }

          bytesAtLastUpdate = event.bytesDownloaded;
          lastUpdateTime = now;
        },
      });

      // Cleanup listener
      if (typeof unlisten === 'function') {
        unlisten();
      }
    } catch (error) {
      throw new Error(`Failed to download model: ${error}`);
    }
  }

  /**
   * Verify file checksum using SHA256
   */
  private async verifyChecksum(filePath: string, expectedHash: string): Promise<boolean> {
    try {
      const actualHash = await invoke<string>('verify_file_sha256', {
        filePath,
        expectedHash,
      });
      
      return actualHash.toLowerCase() === expectedHash.toLowerCase();
    } catch (error) {
      console.error('Checksum verification error:', error);
      return false;
    }
  }

  /**
   * Install model to Ollama
   */
  private async installModel(modelMetadata: ModelMetadata, options: DownloadOptions): Promise<void> {
    try {
      await invoke('install_ollama_model', {
        modelPath: options.installPath,
        modelName: modelMetadata.name,
      });
    } catch (error) {
      throw new Error(`Failed to install model: ${error}`);
    }
  }

  /**
   * Pause a download
   */
  async pauseDownload(downloadId: string): Promise<void> {
    const progress = this.activeDownloads.get(downloadId);
    if (progress && progress.status === 'downloading') {
      this.updateProgress(downloadId, { status: 'paused' });
      
      // Call backend to pause download
      await invoke('pause_download', { downloadId });
    }
  }

  /**
   * Resume a paused download
   */
  async resumeDownload(downloadId: string): Promise<void> {
    const progress = this.activeDownloads.get(downloadId);
    if (progress && progress.status === 'paused' && progress.isResumable) {
      this.updateProgress(downloadId, { status: 'downloading' });
      
      // Re-add to queue with high priority
      const queueItem = this.downloadQueue.find(item => item.id === downloadId);
      if (queueItem) {
        queueItem.priority = 1000; // High priority
      }
    }
  }

  /**
   * Cancel a download
   */
  async cancelDownload(downloadId: string): Promise<void> {
    const progress = this.activeDownloads.get(downloadId);
    if (progress) {
      this.updateProgress(downloadId, {
        status: 'cancelled',
        endTime: Date.now(),
      });
      
      // Remove from queue
      this.downloadQueue = this.downloadQueue.filter(item => item.id !== downloadId);
      
      // Call backend to cancel download
      await invoke('cancel_download', { downloadId });
    }
  }

  /**
   * Get progress for a specific download
   */
  getProgress(downloadId: string): DownloadProgress | undefined {
    return this.activeDownloads.get(downloadId);
  }

  /**
   * Get all active downloads
   */
  getAllProgress(): DownloadProgress[] {
    return Array.from(this.activeDownloads.values());
  }

  /**
   * Set global download speed limit
   */
  setGlobalSpeedLimit(bytesPerSecond: number | undefined): void {
    this.downloadSpeedLimit = bytesPerSecond;
  }

  /**
   * Clear completed downloads from tracking
   */
  clearCompleted(): void {
    for (const [id, progress] of this.activeDownloads.entries()) {
      if (progress.status === 'completed' || progress.status === 'cancelled') {
        this.activeDownloads.delete(id);
      }
    }
  }

  /**
   * Format download speed for display
   */
  formatSpeed(bytesPerSecond: number): string {
    if (bytesPerSecond < 1024) {
      return `${bytesPerSecond.toFixed(0)} B/s`;
    } else if (bytesPerSecond < 1024 * 1024) {
      return `${(bytesPerSecond / 1024).toFixed(1)} KB/s`;
    } else {
      return `${(bytesPerSecond / (1024 * 1024)).toFixed(1)} MB/s`;
    }
  }

  /**
   * Format time remaining for display
   */
  formatTimeRemaining(seconds: number): string {
    if (seconds < 60) {
      return `${Math.round(seconds)}s`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const secs = Math.round(seconds % 60);
      return `${minutes}m ${secs}s`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return `${hours}h ${minutes}m`;
    }
  }

  /**
   * Format bytes for display
   */
  formatBytes(bytes: number): string {
    if (bytes < 1024) {
      return `${bytes} B`;
    } else if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    } else if (bytes < 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    } else {
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    }
  }

  // Private helper methods

  private updateProgress(downloadId: string, updates: Partial<DownloadProgress>): void {
    const current = this.activeDownloads.get(downloadId);
    if (current) {
      this.activeDownloads.set(downloadId, { ...current, ...updates });
    }
  }

  private estimateTotalBytes(metadata: ModelMetadata, quantization: string): number {
    const sizeStr = metadata.size[quantization as keyof typeof metadata.size];
    if (!sizeStr) return 0;

    // Parse size string (e.g., "4.3 GB", "700 MB")
    const match = sizeStr.match(/(\d+\.?\d*)\s*(GB|MB|KB)/i);
    if (!match) return 0;

    const value = parseFloat(match[1]);
    const unit = match[2].toUpperCase();

    switch (unit) {
      case 'GB':
        return value * 1024 * 1024 * 1024;
      case 'MB':
        return value * 1024 * 1024;
      case 'KB':
        return value * 1024;
      default:
        return 0;
    }
  }

  private async startQueueProcessor(): Promise<void> {
    // Process queue every second
    setInterval(() => {
      const activeCount = Array.from(this.activeDownloads.values())
        .filter(p => p.status === 'downloading').length;

      // Start new downloads if capacity available
      while (activeCount < this.maxConcurrentDownloads && this.downloadQueue.length > 0) {
        const nextItem = this.downloadQueue.shift();
        if (nextItem) {
          this.processDownload(nextItem).catch(console.error);
        }
      }
    }, 1000);
  }
}

// Singleton instance
export const modelDownloadService = new ModelDownloadService();
