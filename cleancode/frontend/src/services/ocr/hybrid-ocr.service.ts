/**
 * Hybrid OCR Service
 * Supports both offline (Tesseract.js) and online OCR with automatic fallback
 */

import type { OcrResult, OcrRequest } from '@shared/types';
import type { OcrProgressCallback } from './tesseract-ocr.service';

export type OcrMode = 'offline' | 'online' | 'auto';

export interface HybridOcrConfig {
  mode: OcrMode;
  preferOffline: boolean;
  onlineTimeout: number;
  enableFirewallDetection: boolean;
}

export interface OnlineOcrProvider {
  name: string;
  recognize: (
    imageData: string | File,
    options?: Partial<OcrRequest>,
    onProgress?: OcrProgressCallback
  ) => Promise<OcrResult>;
  isAvailable: () => Promise<boolean>;
}

export class HybridOcrService {
  private config: HybridOcrConfig;
  private offlineProvider: any; // Will be TesseractOcrService
  private onlineProviders: Map<string, OnlineOcrProvider> = new Map();
  private isOnlineAvailable: boolean | null = null;
  private lastOnlineCheck: number = 0;
  private onlineCheckInterval: number = 30000; // 30 seconds

  constructor(
    offlineProvider: any,
    config?: Partial<HybridOcrConfig>
  ) {
    this.offlineProvider = offlineProvider;
    this.config = {
      mode: 'auto',
      preferOffline: true,
      onlineTimeout: 10000,
      enableFirewallDetection: true,
      ...config,
    };
  }

  /**
   * Update configuration
   */
  setConfig(config: Partial<HybridOcrConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Register an online OCR provider
   */
  registerOnlineProvider(provider: OnlineOcrProvider): void {
    this.onlineProviders.set(provider.name, provider);
    console.log(`Registered online OCR provider: ${provider.name}`);
  }

  /**
   * Perform OCR with automatic provider selection
   */
  async recognize(
    imageData: string | File,
    options?: Partial<OcrRequest>,
    onProgress?: OcrProgressCallback
  ): Promise<OcrResult> {
    const mode = this.config.mode;

    try {
      // Force offline mode
      if (mode === 'offline') {
        console.log('Using offline OCR (forced by config)');
        return await this.recognizeOffline(imageData, options, onProgress);
      }

      // Force online mode
      if (mode === 'online') {
        console.log('Using online OCR (forced by config)');
        return await this.recognizeOnline(imageData, options, onProgress);
      }

      // Auto mode: check availability and prefer based on config
      if (this.config.preferOffline) {
        // Try offline first
        try {
          console.log('Attempting offline OCR (preferred)');
          return await this.recognizeOffline(imageData, options, onProgress);
        } catch (offlineError) {
          console.warn('Offline OCR failed, falling back to online:', offlineError);
          return await this.recognizeOnline(imageData, options, onProgress);
        }
      } else {
        // Try online first if available
        const onlineAvailable = await this.checkOnlineAvailability();
        if (onlineAvailable) {
          try {
            console.log('Attempting online OCR (preferred)');
            return await this.recognizeOnline(imageData, options, onProgress);
          } catch (onlineError) {
            console.warn('Online OCR failed, falling back to offline:', onlineError);
            return await this.recognizeOffline(imageData, options, onProgress);
          }
        } else {
          console.log('Online OCR not available, using offline');
          return await this.recognizeOffline(imageData, options, onProgress);
        }
      }
    } catch (error) {
      console.error('All OCR methods failed:', error);
      throw new Error(`OCR failed: ${(error as Error).message}`);
    }
  }

  /**
   * Perform offline OCR using Tesseract.js
   */
  private async recognizeOffline(
    imageData: string | File,
    options?: Partial<OcrRequest>,
    onProgress?: OcrProgressCallback
  ): Promise<OcrResult> {
    if (onProgress) {
      onProgress({
        status: 'recognizing',
        progress: 0.1,
        message: 'Using offline OCR...',
      });
    }

    const result = await this.offlineProvider.recognize(imageData, options, (progress: any) => {
      if (onProgress) {
        onProgress({
          ...progress,
          message: `Offline OCR: ${progress.message || progress.status}`,
        });
      }
    });

    // Return result (provider info is logged, not stored in result)
    return result;
  }

  /**
   * Perform online OCR using registered providers
   */
  private async recognizeOnline(
    imageData: string | File,
    options?: Partial<OcrRequest>,
    onProgress?: OcrProgressCallback
  ): Promise<OcrResult> {
    if (this.onlineProviders.size === 0) {
      throw new Error('No online OCR providers registered');
    }

    if (onProgress) {
      onProgress({
        status: 'checking',
        progress: 0.05,
        message: 'Checking online OCR availability...',
      });
    }

    // Try each provider until one succeeds
    let lastError: Error | null = null;

    for (const [name, provider] of this.onlineProviders) {
      try {
        // Check if provider is available
        const available = await Promise.race([
          provider.isAvailable(),
          new Promise<boolean>((_, reject) =>
            setTimeout(() => reject(new Error('Timeout')), 3000)
          ),
        ]);

        if (!available) {
          console.log(`Provider ${name} is not available`);
          continue;
        }

        if (onProgress) {
          onProgress({
            status: 'recognizing',
            progress: 0.2,
            message: `Using online OCR provider: ${name}...`,
          });
        }

        // Perform OCR with timeout
        const result = await Promise.race([
          provider.recognize(imageData, options, onProgress),
          new Promise<never>((_, reject) =>
            setTimeout(
              () => reject(new Error('Online OCR timeout')),
              this.config.onlineTimeout
            )
          ),
        ]);

        // Return result (provider info is logged, not stored in result)
        return result;
      } catch (error) {
        console.warn(`Online provider ${name} failed:`, error);
        lastError = error as Error;
        continue;
      }
    }

    throw new Error(`All online OCR providers failed. Last error: ${lastError?.message || 'Unknown'}`);
  }

  /**
   * Check if online OCR is available
   */
  private async checkOnlineAvailability(): Promise<boolean> {
    if (!this.config.enableFirewallDetection) {
      return true; // Assume available if detection disabled
    }

    // Use cached result if recent
    const now = Date.now();
    if (
      this.isOnlineAvailable !== null &&
      now - this.lastOnlineCheck < this.onlineCheckInterval
    ) {
      return this.isOnlineAvailable;
    }

    // Check connectivity with a simple fetch
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);

      await fetch('https://www.google.com/favicon.ico', {
        method: 'HEAD',
        signal: controller.signal,
        cache: 'no-cache',
      });

      clearTimeout(timeout);
      this.isOnlineAvailable = true;
      this.lastOnlineCheck = now;
      return true;
    } catch (error) {
      console.warn('Online connectivity check failed:', error);
      this.isOnlineAvailable = false;
      this.lastOnlineCheck = now;
      return false;
    }
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<HybridOcrConfig>): void {
    this.config = { ...this.config, ...config };
    console.log('Hybrid OCR config updated:', this.config);

    // Invalidate online availability cache
    this.isOnlineAvailable = null;
  }

  /**
   * Get current configuration
   */
  getConfig(): HybridOcrConfig {
    return { ...this.config };
  }

  /**
   * Force check online availability
   */
  async checkConnectivity(): Promise<boolean> {
    this.isOnlineAvailable = null;
    this.lastOnlineCheck = 0;
    return this.checkOnlineAvailability();
  }

  /**
   * Get available providers
   */
  getAvailableProviders(): string[] {
    return ['offline', ...Array.from(this.onlineProviders.keys())];
  }

  /**
   * Initialize the service
   */
  async initialize(language = 'eng'): Promise<void> {
    if (this.offlineProvider?.initialize) {
      await this.offlineProvider.initialize(language);
    }
  }

  /**
   * Get supported languages
   */
  getSupportedLanguages() {
    return this.offlineProvider.getSupportedLanguages();
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    if (this.offlineProvider.terminate) {
      await this.offlineProvider.terminate();
    }
  }
}
