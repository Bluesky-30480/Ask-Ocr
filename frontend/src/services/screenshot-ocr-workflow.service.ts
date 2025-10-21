/**
 * Screenshot-to-OCR Workflow Service
 * Provides smooth integration between screenshot capture and OCR processing
 */

import { ocrService } from './ocr/ocr.service';
import type { OcrResult } from '@shared/types';
import type { ScreenshotRegion } from '@shared/types';
import { invoke } from '@tauri-apps/api/tauri';

export type ScreenshotMode = 'fullscreen' | 'window' | 'region';

export interface ScreenshotOcrProgress {
  stage: 'capturing' | 'processing' | 'complete' | 'error';
  progress: number; // 0-100
  message: string;
  imageData?: string;
  result?: OcrResult;
  error?: string;
}

export type ScreenshotOcrCallback = (progress: ScreenshotOcrProgress) => void;

export interface ScreenshotOcrOptions {
  mode: ScreenshotMode;
  region?: ScreenshotRegion;
  language?: string;
  autoSave?: boolean;
  onProgress?: ScreenshotOcrCallback;
}

export class ScreenshotOcrWorkflowService {
  private isProcessing: boolean = false;
  private currentCallback: ScreenshotOcrCallback | null = null;

  /**
   * Capture screenshot and perform OCR in one smooth workflow
   */
  async captureAndProcess(options: ScreenshotOcrOptions): Promise<OcrResult> {
    if (this.isProcessing) {
      throw new Error('Another screenshot-OCR process is already running');
    }

    this.isProcessing = true;
    this.currentCallback = options.onProgress || null;

    try {
      // Stage 1: Capture screenshot
      this.notifyProgress({
        stage: 'capturing',
        progress: 10,
        message: 'Capturing screenshot...',
      });

      const imageData = await this.captureScreenshot(options.mode, options.region);

      if (!imageData) {
        throw new Error('Screenshot capture failed - no image data returned');
      }

      this.notifyProgress({
        stage: 'capturing',
        progress: 30,
        message: 'Screenshot captured successfully',
        imageData,
      });

      // Stage 2: Process with OCR
      this.notifyProgress({
        stage: 'processing',
        progress: 40,
        message: 'Performing OCR...',
        imageData,
      });

      const ocrResult = await ocrService.processImage(imageData, {
        language: options.language || 'eng',
        useCache: true,
      });

      this.notifyProgress({
        stage: 'processing',
        progress: 80,
        message: 'OCR complete',
        imageData,
        result: ocrResult,
      });

      // Stage 3: Auto-save if enabled
      if (options.autoSave) {
        this.notifyProgress({
          stage: 'processing',
          progress: 90,
          message: 'Saving to database...',
          imageData,
          result: ocrResult,
        });

        // TODO: Save to database when database integration is ready
        // await databaseService.createOcrRecord(...)
      }

      // Stage 4: Complete
      this.notifyProgress({
        stage: 'complete',
        progress: 100,
        message: 'Complete',
        imageData,
        result: ocrResult,
      });

      return ocrResult;
    } catch (error) {
      const errorMessage = (error as Error).message || 'Unknown error';
      console.error('Screenshot-OCR workflow failed:', error);

      this.notifyProgress({
        stage: 'error',
        progress: 0,
        message: `Error: ${errorMessage}`,
        error: errorMessage,
      });

      throw error;
    } finally {
      this.isProcessing = false;
      this.currentCallback = null;
    }
  }

  /**
   * Capture screenshot based on mode
   */
  private async captureScreenshot(
    mode: ScreenshotMode,
    region?: ScreenshotRegion
  ): Promise<string | null> {
    try {
      let result: any;

      switch (mode) {
        case 'fullscreen':
          result = await invoke('capture_fullscreen');
          break;
        case 'window':
          result = await invoke('capture_window');
          break;
        case 'region':
          if (!region) {
            throw new Error('Region is required for region capture mode');
          }
          result = await invoke('capture_region', { region });
          break;
        default:
          throw new Error(`Unknown screenshot mode: ${mode}`);
      }

      if (!result.success) {
        throw new Error(result.error || 'Screenshot capture failed');
      }

      return result.image_data || null;
    } catch (error) {
      console.error('Screenshot capture error:', error);
      throw error;
    }
  }

  /**
   * Quick screenshot with default settings
   */
  async quickCapture(mode: ScreenshotMode = 'fullscreen'): Promise<OcrResult> {
    return this.captureAndProcess({
      mode,
      language: 'eng',
      autoSave: true,
    });
  }

  /**
   * Capture with progress tracking
   */
  async captureWithProgress(
    mode: ScreenshotMode,
    onProgress: ScreenshotOcrCallback,
    options?: Partial<ScreenshotOcrOptions>
  ): Promise<OcrResult> {
    return this.captureAndProcess({
      mode,
      onProgress,
      language: options?.language || 'eng',
      autoSave: options?.autoSave !== false,
      region: options?.region,
    });
  }

  /**
   * Notify progress to callback
   */
  private notifyProgress(progress: ScreenshotOcrProgress): void {
    if (this.currentCallback) {
      try {
        this.currentCallback(progress);
      } catch (error) {
        console.error('Error in progress callback:', error);
      }
    }
  }

  /**
   * Check if workflow is currently processing
   */
  isActive(): boolean {
    return this.isProcessing;
  }

  /**
   * Cancel current workflow (if possible)
   */
  cancel(): void {
    if (this.isProcessing) {
      this.isProcessing = false;
      this.notifyProgress({
        stage: 'error',
        progress: 0,
        message: 'Cancelled by user',
        error: 'Cancelled',
      });
      this.currentCallback = null;
    }
  }
}

// Export singleton instance
export const screenshotOcrWorkflow = new ScreenshotOcrWorkflowService();
