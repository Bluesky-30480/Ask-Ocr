/**
 * OCR.Space online provider (free tier supported with API key)
 * Uses the Online OCR Provider interface from hybrid-ocr.service
 */

import type { OnlineOcrProvider } from './hybrid-ocr.service';
import type { OcrRequest, OcrResult } from '@shared/types';
import type { OcrProgressCallback } from './tesseract-ocr.service';

// Minimal availability check: require API key to be set
async function isAvailable(): Promise<boolean> {
  const key = localStorage.getItem('ocrspace_api_key');
  return Boolean(key && key.trim().length > 0);
}

async function recognize(
  imageData: string | File,
  options?: Partial<OcrRequest>,
  onProgress?: OcrProgressCallback
): Promise<OcrResult> {
  const apiKey = localStorage.getItem('ocrspace_api_key') || '';
  if (!apiKey) {
    throw new Error('OCR.Space API key is not set');
  }

  // Convert File to base64 if needed
  let base64Image: string;
  if (imageData instanceof File) {
    base64Image = await fileToBase64(imageData);
  } else {
    base64Image = imageData;
  }

  if (onProgress) {
    onProgress({ status: 'uploading', progress: 0.1, message: 'Uploading to OCR.Space...' });
  }

  const form = new FormData();
  // OCR.Space accepts base64 with data URL prefix or pure base64
  const cleanBase64 = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;
  form.append('base64Image', `data:image/png;base64,${cleanBase64}`);
  form.append('language', options?.language || 'eng');
  form.append('isOverlayRequired', 'false');

  const response = await fetch('https://api.ocr.space/parse/image', {
    method: 'POST',
    headers: {
      apikey: apiKey,
    },
    body: form,
  });

  if (!response.ok) {
    throw new Error(`OCR.Space HTTP ${response.status}`);
  }

  const data = await response.json();
  if (data?.IsErroredOnProcessing) {
    throw new Error(data?.ErrorMessage?.[0] || 'OCR.Space error');
  }

  const parsed = data?.ParsedResults?.[0];
  if (!parsed?.ParsedText) {
    throw new Error('OCR.Space returned no text');
  }

  if (onProgress) {
    onProgress({ status: 'complete', progress: 1, message: 'Online OCR complete' });
  }

  const text: string = parsed.ParsedText || '';
  return {
    text,
    language: options?.language || parsed?.TextOrientation || 'eng',
    confidence: 1.0,
  } as OcrResult;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

export const ocrSpaceProvider: OnlineOcrProvider = {
  name: 'ocr.space',
  recognize,
  isAvailable,
};
