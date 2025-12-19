/**
 * Screenshot-to-OCR Workflow Service - SIMPLIFIED
 * Direct region capture -> Windows Native OCR -> Database save
 */

import { invoke } from '@tauri-apps/api/tauri';
import { databaseService } from './database.service';
import type { OcrResult } from '@shared/types';

export interface ScreenshotRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ScreenshotOcrProgress {
  stage: 'capturing' | 'processing' | 'saving' | 'complete' | 'error';
  progress: number; // 0-100
  message: string;
}

export type ScreenshotOcrCallback = (progress: ScreenshotOcrProgress) => Promise<void> | void;

export interface ScreenshotOcrOptions {
  language?: string;
  autoSave?: boolean;
  onProgress?: ScreenshotOcrCallback;
  region?: ScreenshotRegion;
  captureMethod?: 'native' | 'overlay';
}

/**
 * Simplified OCR workflow - captures region and processes with Windows Native OCR
 */
export class ScreenshotOcrWorkflowService {
  private isProcessing: boolean = false;

  async captureAndProcess(options: ScreenshotOcrOptions): Promise<OcrResult> {
    if (this.isProcessing) {
      throw new Error('OCR process already running');
    }

    this.isProcessing = true;
    const onProgress = options.onProgress;

    try {
      // Step 1: Capture screenshot
      if (onProgress) {
        await onProgress({ stage: 'capturing', progress: 10, message: 'Capturing region...' });
      }

      let screenshotResult;
      if (options.captureMethod === 'native') {
         // Use Windows Snipping Tool (ms-screenclip)
         screenshotResult = await invoke<any>('capture_region_native');
      } else {
         // Use internal overlay + xcap
         if (!options.region) {
            throw new Error('Region is required for overlay capture');
         }
         screenshotResult = await invoke<any>('capture_region', { region: options.region });
      }
      
      if (!screenshotResult.success || !screenshotResult.image_data) {
        throw new Error(screenshotResult.error || 'Screenshot capture failed');
      }

      if (onProgress) {
        await onProgress({ stage: 'processing', progress: 30, message: 'Running OCR...' });
      }

      // Step 2: Perform OCR using Windows Native OCR
      console.log('[Workflow] Invoking perform_ocr_native...');
      const ocrResult = await invoke<OcrResult>('perform_ocr_native', {
        imageData: screenshotResult.image_data,
      });
      console.log('[Workflow] perform_ocr_native returned:', ocrResult);

      if (onProgress) {
        await onProgress({ stage: 'processing', progress: 70, message: 'OCR complete' });
      }

      // Step 3: Save to database if enabled
      if (options.autoSave) {
        if (onProgress) {
          await onProgress({ stage: 'saving', progress: 85, message: 'Saving to history...' });
        }

        try {
          await databaseService.createOcrRecord({
            timestamp: Date.now(),
            imageData: screenshotResult.image_data,
            text: ocrResult.text,
            language: ocrResult.language || 'eng',
            confidence: ocrResult.confidence,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });
        } catch (dbError) {
          console.error('Failed to save to database:', dbError);
          // Don't fail the whole process
        }
      }

      // Step 4: Complete
      if (onProgress) {
        await onProgress({ stage: 'complete', progress: 100, message: 'Complete!' });
      }

      return ocrResult;
    } catch (error) {
      if (onProgress) {
        await onProgress({
          stage: 'error',
          progress: 0,
          message: `Error: ${(error as Error).message}`,
        });
      }
      throw error;
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Native region capture (using OS snipping) without app overlay
   */
  async captureNativeRegionAndProcess(options: Omit<ScreenshotOcrOptions, 'region'> = {}): Promise<OcrResult> {
    if (this.isProcessing) {
      throw new Error('OCR process already running');
    }

    this.isProcessing = true;
    const onProgress = options.onProgress;

    try {
      // Step 1: Capture region via native snipping
      if (onProgress) {
        await onProgress({ stage: 'capturing', progress: 10, message: 'Capturing region...' });
      }

      console.log('[Workflow] Invoking capture_region_native...');
      const screenshotResult = await invoke<any>('capture_region_native');
      console.log('[Workflow] capture_region_native returned:', screenshotResult);

      if (!screenshotResult.success || !screenshotResult.image_data) {
        throw new Error(screenshotResult.error || 'Region capture failed');
      }

      if (onProgress) {
        await onProgress({ stage: 'processing', progress: 30, message: 'Running OCR...' });
      }

      // Step 2: Perform OCR using Windows Native OCR
      console.log('[Workflow] Invoking perform_ocr_native...');
      const ocrResult = await invoke<OcrResult>('perform_ocr_native', {
        imageData: screenshotResult.image_data,
      });
      console.log('[Workflow] perform_ocr_native returned:', ocrResult);

      if (onProgress) {
        await onProgress({ stage: 'processing', progress: 70, message: 'OCR complete' });
      }

      // Step 3: Save to database if enabled
      if (options.autoSave) {
        if (onProgress) {
          await onProgress({ stage: 'saving', progress: 85, message: 'Saving to history...' });
        }

        try {
          await databaseService.createOcrRecord({
            timestamp: Date.now(),
            imageData: screenshotResult.image_data,
            text: ocrResult.text,
            language: ocrResult.language || 'eng',
            confidence: ocrResult.confidence,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });
        } catch (dbError) {
          console.error('Failed to save to database:', dbError);
          // Don't fail the whole process
        }
      }

      // Step 4: Complete
      if (onProgress) {
        await onProgress({ stage: 'complete', progress: 100, message: 'Complete!' });
      }

      return ocrResult;
    } catch (error) {
      console.error('[Workflow] Error in captureNativeRegionAndProcess:', error);
      if (onProgress) {
        await onProgress({
          stage: 'error',
          progress: 0,
          message: `Error: ${(error as Error).message}`,
        });
      }
      throw error;
    } finally {
      this.isProcessing = false;
    }
  }
}

export const screenshotOcrWorkflow = new ScreenshotOcrWorkflowService();
