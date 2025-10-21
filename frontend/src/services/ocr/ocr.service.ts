/**
 * OCR Service Facade
 * Coordinates OCR operations with task queue and caching
 */

import { tesseractOcr } from './tesseract-ocr.service';
import { ocrTaskQueue } from '../task-queue.service';
import type { OcrResult, OcrRequest } from '@shared/types';

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

  /**
   * Perform OCR on an image with task queue management
   */
  async processImage(
    imageData: string | File,
    options: OcrServiceOptions & Partial<OcrRequest> = {}
  ): Promise<OcrResult> {
    // Check cache first
    if (options.useCache !== false) {
      const cacheKey = this.getCacheKey(imageData);
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

        // Perform OCR
        const ocrResult = await tesseractOcr.recognize(imageData, options);

        // Cache result
        if (options.useCache !== false) {
          this.addToCache(this.getCacheKey(imageData), ocrResult);
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
    await tesseractOcr.initialize(language);
  }

  /**
   * Get supported languages
   */
  getSupportedLanguages() {
    return tesseractOcr.getSupportedLanguages();
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
    console.log('OCR cache cleared');
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
