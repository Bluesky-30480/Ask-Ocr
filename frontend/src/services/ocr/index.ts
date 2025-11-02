/**
 * OCR Services Export
 */

export { ocrService } from './ocr.service';
export { tesseractOcr, TesseractOcrService } from './tesseract-ocr.service';
export { HybridOcrService } from './hybrid-ocr.service';
export { mathFormulaOCR, MathFormulaOCRService } from './math-formula-ocr.service';
export type { OcrProgress, OcrProgressCallback } from './tesseract-ocr.service';
export type { OcrServiceOptions } from './ocr.service';
export type { HybridOcrConfig, OcrMode } from './hybrid-ocr.service';
export type { MathFormula, MathOCRResult } from './math-formula-ocr.service';
