/**
 * Native Windows OCR Service
 * Uses the backend Rust implementation of Windows.Media.Ocr
 * Extremely fast and accurate, no large downloads required.
 */

import { invoke } from '@tauri-apps/api/tauri';
import type { OcrResult, OcrRequest } from '@shared/types';

export interface OcrProgress {
  status: string;
  progress: number; // 0-1
  message?: string;
}

export type OcrProgressCallback = (progress: OcrProgress) => void;

export class NativeOcrService {
  // Native service is always "ready" (OS managed)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async initialize(_language = 'eng'): Promise<void> {
    // No initialization needed for Windows Native OCR
    // It uses the system's installed languages
    return Promise.resolve();
  }

  async recognize(
    imageData: string | File,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _options: Partial<OcrRequest> = {},
    onProgress?: OcrProgressCallback
  ): Promise<OcrResult> {
    try {
      // Convert File to base64 if needed
      let base64Image: string;
      if (imageData instanceof File) {
        base64Image = await this.fileToBase64(imageData);
      } else {
        base64Image = imageData;
      }

      if (onProgress) {
        onProgress({ status: 'processing', progress: 0.1, message: 'Sending to Windows OCR...' });
      }

      // Call backend
      const result = await invoke<OcrResult>('perform_ocr_native', {
        imageData: base64Image,
      });

      if (onProgress) {
        onProgress({ status: 'complete', progress: 1.0, message: 'OCR Complete' });
      }

      return result;
    } catch (error) {
      console.error('Native OCR failed:', error);
      throw error;
    }
  }

  async terminate(): Promise<void> {
    // Nothing to terminate
    return Promise.resolve();
  }

  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  }
}

export const nativeOcr = new NativeOcrService();
