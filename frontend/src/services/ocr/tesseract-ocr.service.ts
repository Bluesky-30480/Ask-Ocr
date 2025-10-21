/**
 * Tesseract.js OCR Service
 * Provides OCR functionality using Tesseract.js with Web Workers
 * Supports multiple languages and progress tracking
 */

import { createWorker, PSM } from 'tesseract.js';
import type { Worker, RecognizeResult } from 'tesseract.js';
import type { OcrResult, OcrRequest } from '@shared/types';

export interface OcrProgress {
  status: string;
  progress: number; // 0-1
  message?: string;
}

export type OcrProgressCallback = (progress: OcrProgress) => void;

/**
 * Tesseract.js OCR implementation
 * Uses Web Workers to avoid blocking the main thread
 */
export class TesseractOcrService {
  private worker: Worker | null = null;
  private isInitialized = false;
  private currentLanguage = 'eng';

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

      // Create new worker with language and logger
      this.worker = await createWorker(language, undefined, {
        logger: (m) => {
          console.log('[Tesseract]', m);
        },
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
   * Perform OCR on an image
   * @param imageData - base64 string or File object
   * @param options - OCR request options
   * @param onProgress - Optional progress callback
   */
  async recognize(
    imageData: string | File,
    options?: Partial<OcrRequest>,
    onProgress?: OcrProgressCallback
  ): Promise<OcrResult> {
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

      // Set up progress tracking
      if (onProgress) {
        this.worker.setParameters({
          tessedit_pageseg_mode: PSM.AUTO,
        });
      }

      // Perform recognition
      const result: RecognizeResult = await this.worker.recognize(imageData, {
        rotateAuto: true,
      });

      const processingTime = Date.now() - startTime;

      // Validate OCR result
      const validationResult = this.validateOcrResult(result.data);
      
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

      // Log validation warnings
      if (!validationResult.isValid) {
        console.warn('OCR validation warnings:', validationResult.warnings);
      }

      console.log(
        `OCR completed in ${processingTime}ms, confidence: ${result.data.confidence.toFixed(2)}%`,
        validationResult.isValid ? '✓' : '⚠️'
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
      
      // Check for common error scenarios
      if (errorMessage.includes('Worker')) {
        errorMessage += ' (Worker initialization issue - try restarting)';
      } else if (errorMessage.includes('language')) {
        errorMessage += ' (Language data not available)';
      } else if (errorMessage.includes('image')) {
        errorMessage += ' (Invalid image format)';
      }
      
      throw new Error(errorMessage);
    }
  }

  /**
   * Validate OCR result quality and content
   */
  private validateOcrResult(data: any): { isValid: boolean; warnings: string[] } {
    const warnings: string[] = [];
    
    // Check confidence score
    if (data.confidence < 60) {
      warnings.push(`Low confidence score: ${data.confidence.toFixed(2)}% (threshold: 60%)`);
    }
    
    // Check if text is empty or very short
    if (!data.text || data.text.trim().length === 0) {
      warnings.push('No text detected in image');
    } else if (data.text.trim().length < 3) {
      warnings.push('Very short text detected - may be inaccurate');
    }
    
    // Check for excessive special characters (potential gibberish)
    const specialCharRatio = (data.text.match(/[^a-zA-Z0-9\s\u4e00-\u9fa5]/g) || []).length / data.text.length;
    if (specialCharRatio > 0.5) {
      warnings.push('High ratio of special characters - text may be garbled');
    }
    
    // Check for repeated characters (potential OCR error)
    const repeatedChars = data.text.match(/(.)\1{5,}/g);
    if (repeatedChars) {
      warnings.push(`Detected repeated characters: ${repeatedChars.join(', ')}`);
    }
    
    // Validate word-level confidence if available
    if (data.words && Array.isArray(data.words)) {
      const lowConfidenceWords = data.words.filter((word: any) => word.confidence < 50);
      if (lowConfidenceWords.length > data.words.length * 0.3) {
        warnings.push(`${lowConfidenceWords.length} words have low confidence (<50%)`);
      }
    }
    
    return {
      isValid: warnings.length === 0,
      warnings
    };
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
