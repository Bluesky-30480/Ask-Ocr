/**
 * OCR Service Facade
 * Coordinates OCR operations with task queue and caching
 * Supports hybrid offline/online OCR
 */

import { tesseractOcr } from './tesseract-ocr.service';
import { HybridOcrService } from './hybrid-ocr.service';
import { ocrTaskQueue } from '../task-queue.service';
import type { OcrResult, OcrRequest } from '@shared/types';

// Initialize hybrid OCR service
const hybridOcr = new HybridOcrService(tesseractOcr, {
  mode: 'auto',
  preferOffline: true,
  onlineTimeout: 10000,
  enableFirewallDetection: true,
});

export interface OcrServiceOptions {
  useCache?: boolean;
  priority?: number;
  timeout?: number;
}

/**
 * High-level OCR service that manages task queue and caching
 */
class OcrService {
  private cache: Map<string, OcrResult> = new Map();
  private maxCacheSize = 50;
  private preprocessCache: Map<string, string> = new Map();
  private isPreprocessingEnabled = true;

  /**
   * Perform OCR on an image with task queue management
   */
  async processImage(
    imageData: string | File,
    options: OcrServiceOptions & Partial<OcrRequest> = {}
  ): Promise<OcrResult> {
    // Update configuration from settings
    const ocrEngine = localStorage.getItem('ocr_engine') || 'tesseract';
    if (ocrEngine === 'online') {
      hybridOcr.setConfig({ mode: 'online', preferOffline: false });
    } else {
      hybridOcr.setConfig({ mode: 'offline', preferOffline: true });
    }

    // Preprocess image if enabled and imageData is base64 string
    let processedImageData = imageData;
    if (this.isPreprocessingEnabled && typeof imageData === 'string' && imageData.startsWith('data:image')) {
      try {
        processedImageData = await this.preprocessImage(imageData);
      } catch (error) {
        console.warn('Image preprocessing failed, using original:', error);
      }
    }

    // Check cache first
    if (options.useCache !== false) {
      const cacheKey = this.getCacheKey(processedImageData);
      const cached = this.cache.get(cacheKey);
      if (cached) {
        console.log('OCR result retrieved from cache');
        return cached;
      }
    }

    // Add to task queue
    const result = await ocrTaskQueue.add<OcrResult>(
      'ocr',
      async (signal) => {
        // Check if cancelled
        if (signal.aborted) {
          throw new Error('OCR task cancelled');
        }

        // Perform OCR using hybrid service
        const ocrResult = await hybridOcr.recognize(processedImageData, options);

        // Cache result
        if (options.useCache !== false) {
          this.addToCache(this.getCacheKey(processedImageData), ocrResult);
        }

        return ocrResult;
      },
      {
        priority: options.priority ?? 5,
        timeout: options.timeout ?? 60000,
      }
    );

    return result;
  }

  /**
   * Initialize OCR with specific language
   */
  async initialize(language = 'eng'): Promise<void> {
    await hybridOcr.initialize(language);
  }

  /**
   * Get supported languages
   */
  getSupportedLanguages() {
    return hybridOcr.getSupportedLanguages();
  }

  /**
   * Update OCR mode (offline/online/auto)
   */
  setOcrMode(mode: 'offline' | 'online' | 'auto'): void {
    hybridOcr.updateConfig({ mode });
    console.log(`OCR mode set to: ${mode}`);
  }

  /**
   * Get OCR configuration
   */
  getOcrConfig() {
    return hybridOcr.getConfig();
  }

  /**
   * Check online connectivity
   */
  async checkConnectivity(): Promise<boolean> {
    return hybridOcr.checkConnectivity();
  }

  /**
   * Get current queue status
   */
  getQueueStatus() {
    return ocrTaskQueue.getStatus();
  }

  /**
   * Cancel pending OCR tasks
   */
  cancelPending(): number {
    return ocrTaskQueue.cancelByType('ocr');
  }

  /**
   * Clear OCR cache
   */
  clearCache(): void {
    this.cache.clear();
    this.preprocessCache.clear();
    console.log('OCR cache cleared');
  }

  /**
   * Enable/disable image preprocessing
   */
  setPreprocessing(enabled: boolean): void {
    this.isPreprocessingEnabled = enabled;
    console.log(`Image preprocessing ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Preprocess image for better OCR results (optional optimization)
   * This method can be called before processImage for manual control
   */
  async preprocessImage(imageData: string): Promise<string> {
    // Check preprocess cache
    const cached = this.preprocessCache.get(imageData);
    if (cached) {
      return cached;
    }

    try {
      // Create an image element to load the base64 data
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = imageData;
      });

      // Create canvas for image processing
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Failed to get canvas context');
      }

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      // Get image data
      const imageDataObj = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageDataObj.data;

      // Apply simple contrast enhancement
      // Adjust contrast
      const contrast = 1.2; // 20% contrast increase
      const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));

      for (let i = 0; i < data.length; i += 4) {
        data[i] = factor * (data[i] - 128) + 128; // R
        data[i + 1] = factor * (data[i + 1] - 128) + 128; // G
        data[i + 2] = factor * (data[i + 2] - 128) + 128; // B
        // Alpha channel (i + 3) unchanged
      }

      ctx.putImageData(imageDataObj, 0, 0);

      // Convert back to base64
      const processedData = canvas.toDataURL('image/png');

      // Cache the result (limit cache size)
      if (this.preprocessCache.size >= 20) {
        const firstKey = this.preprocessCache.keys().next().value;
        if (firstKey) {
          this.preprocessCache.delete(firstKey);
        }
      }
      this.preprocessCache.set(imageData, processedData);

      console.log('Image preprocessed for better OCR');
      return processedData;
    } catch (error) {
      console.warn('Image preprocessing failed, using original:', error);
      return imageData; // Fallback to original
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxCacheSize,
      entries: Array.from(this.cache.keys()),
    };
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    this.clearCache();
    await tesseractOcr.terminate();
  }

  /**
   * Generate cache key from image data
   */
  private getCacheKey(imageData: string | File): string {
    if (typeof imageData === 'string') {
      // Use first and last 100 chars of base64 as key (good enough for dedup)
      return imageData.substring(0, 100) + imageData.substring(imageData.length - 100);
    } else {
      // For File objects, use name + size + lastModified
      return `${imageData.name}_${imageData.size}_${imageData.lastModified}`;
    }
  }

  /**
   * Add result to cache with LRU eviction
   */
  private addToCache(key: string, result: OcrResult): void {
    // Remove oldest entry if cache is full
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, result);
  }
}

// Export singleton instance
export const ocrService = new OcrService();
