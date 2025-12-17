/**
 * Tesseract.js OCR Service
 * Provides OCR functionality using Tesseract.js with Web Workers
 * Supports multiple languages and progress tracking
 * OPTIMIZED: Pre-initialized worker, faster recognition
 */

import { createWorker } from 'tesseract.js';
import type { Worker, RecognizeResult } from 'tesseract.js';
import type { OcrResult, OcrRequest } from '@shared/types';

export interface OcrProgress {
  status: string;
  progress: number; // 0-1
  message?: string;
}

export type OcrProgressCallback = (progress: OcrProgress) => void;

/**
 * Tesseract.js OCR implementation - OPTIMIZED
 * Uses pre-initialized Web Workers for faster recognition
 */
export class TesseractOcrService {
  private worker: Worker | null = null;
  private isInitialized = false;
  private currentLanguage = 'eng';
  private initializationPromise: Promise<void> | null = null;

  constructor() {
    // Pre-initialize with English on construction
    this.preInitialize();
  }

  /**
   * Pre-initialize worker in background for faster first recognition
   */
  private async preInitialize(): Promise<void> {
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this.initialize('eng');
    return this.initializationPromise;
  }

  /**
   * Initialize the OCR worker with specified language
   */
  async initialize(language = 'eng'): Promise<void> {
    if (this.isInitialized && this.currentLanguage === language) {
      return; // Already initialized with same language
    }

    try {
      // Terminate existing worker if switching languages
      if (this.worker) {
        await this.worker.terminate();
      }

      // Create new worker with language - NO LOGGER for performance
      // Use local worker files if available (for offline support)
      this.worker = await createWorker(language, 1, {
        workerPath: '/tessdata/worker.min.js',
        corePath: '/tesseract-core.wasm.js',
        logger: () => {}, // Disable logging for performance
      });

      this.isInitialized = true;
      this.currentLanguage = language;
      
      console.log(`Tesseract OCR initialized with language: ${language}`);
    } catch (error) {
      console.error('Failed to initialize Tesseract:', error);
      throw new Error(`OCR initialization failed: ${error}`);
    }
  }

  /**
   * Perform OCR on an image - OPTIMIZED
   * @param imageData - base64 string or File object
   * @param options - OCR request options
   */
  async recognize(
    imageData: string | File,
    options?: Partial<OcrRequest>
  ): Promise<OcrResult> {
    // Wait for initialization if in progress
    if (this.initializationPromise && !this.isInitialized) {
      await this.initializationPromise;
    }

    // Initialize if not already done
    if (!this.isInitialized) {
      await this.initialize(options?.language || 'eng');
    }

    // Switch language if needed
    if (options?.language && options.language !== this.currentLanguage && this.worker) {
      await this.worker.reinitialize(options.language);
      this.currentLanguage = options.language;
    }

    if (!this.worker) {
      throw new Error('OCR worker not initialized');
    }

    try {
      const startTime = Date.now();

      // Perform recognition - OPTIMIZED: rotateAuto off for speed
      const result: RecognizeResult = await this.worker.recognize(imageData, {
        rotateAuto: false, // Faster without auto-rotation
      });

      const processingTime = Date.now() - startTime;
      
      // Convert to our OcrResult format
      const ocrResult: OcrResult = {
        id: this.generateId(),
        timestamp: Date.now(),
        imagePath: '',
        imageData: typeof imageData === 'string' ? imageData : '',
        text: result.data.text,
        language: this.currentLanguage,
        confidence: result.data.confidence,
        summary: undefined,
        tags: [],
        aiAnswers: [],
      };

      console.log(
        `⚡ OCR completed in ${processingTime}ms, confidence: ${result.data.confidence.toFixed(2)}%`
      );

      return ocrResult;
    } catch (error) {
      console.error('OCR recognition failed:', error);
      
      // Provide detailed error messages
      let errorMessage = 'OCR failed: ';
      if (error instanceof Error) {
        errorMessage += error.message;
      } else {
        errorMessage += String(error);
      }
      
      throw new Error(errorMessage);
    }
  }

  /**
   * Detect language from image (requires multi-language initialization)
   */
  async detectLanguage(imageData: string | File): Promise<string> {
    // Initialize with language detection mode
    if (!this.isInitialized) {
      await this.initialize('eng+chi_sim+chi_tra+spa+fra+deu+jpn+kor');
    }

    if (!this.worker) {
      throw new Error('OCR worker not initialized');
    }

    try {
      // Perform recognition to validate image contains recognizable text
      await this.worker.recognize(imageData);
      
      // Tesseract doesn't have built-in language detection
      // This is a simplified approach - real implementation would analyze the result
      return this.currentLanguage;
    } catch (error) {
      console.error('Language detection failed:', error);
      return 'eng'; // Default fallback
    }
  }

  /**
   * Get list of supported languages
   */
  getSupportedLanguages(): Array<{ code: string; name: string }> {
    return [
      { code: 'eng', name: 'English' },
      { code: 'chi_sim', name: 'Chinese (Simplified)' },
      { code: 'chi_tra', name: 'Chinese (Traditional)' },
      { code: 'spa', name: 'Spanish' },
      { code: 'fra', name: 'French' },
      { code: 'deu', name: 'German' },
      { code: 'jpn', name: 'Japanese' },
      { code: 'kor', name: 'Korean' },
      { code: 'rus', name: 'Russian' },
      { code: 'ara', name: 'Arabic' },
      { code: 'por', name: 'Portuguese' },
      { code: 'ita', name: 'Italian' },
    ];
  }

  /**
   * Cleanup and terminate worker
   */
  async terminate(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
      this.isInitialized = false;
      console.log('Tesseract OCR terminated');
    }
  }

  /**
   * Generate unique ID for OCR result
   */
  private generateId(): string {
    return `ocr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
export const tesseractOcr = new TesseractOcrService();
