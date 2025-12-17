/**
 * Export Service
 * Handles exporting OCR results to various formats (TXT, PDF, Markdown)
 */

import { invoke } from '@tauri-apps/api/tauri';
import { save } from '@tauri-apps/api/dialog';
import { clipboardService } from '../clipboard/clipboard.service';

export interface ExportOptions {
  format: 'txt' | 'pdf' | 'markdown' | 'json' | 'clipboard';
  includeMetadata: boolean;
  includeTimestamp: boolean;
  includeImage?: boolean; // For PDF and Markdown
  customFileName?: string;
  defaultPath?: string;
}

export interface ExportMetadata {
  ocrText: string;
  timestamp: string;
  language?: string;
  confidence?: number;
  summary?: string;
  tags?: string[];
  aiAnswers?: Array<{ question: string; answer: string }>;
  imagePath?: string;
}

export interface ExportResult {
  success: boolean;
  filePath?: string;
  format: string;
  size?: number; // File size in bytes
  error?: string;
}

export class ExportService {
  /**
   * Copy text to clipboard
   */
  async copyToClipboard(
    metadata: ExportMetadata,
    options: Partial<ExportOptions> = {}
  ): Promise<ExportResult> {
    try {
      let content: string;
      
      // Determine what to copy based on format preference
      switch (options.format) {
        case 'markdown':
          content = this.generateMarkdownContent(metadata, options);
          break;
        case 'json':
          content = JSON.stringify(metadata, null, 2);
          break;
        case 'txt':
        default:
          content = options.includeMetadata 
            ? this.generateTxtContent(metadata, options)
            : metadata.ocrText;
          break;
      }

      // Use the clipboard service
      const clipboardResult = await clipboardService.copyText(content);
      if (!clipboardResult.success) {
        throw new Error(clipboardResult.error || 'Failed to copy to clipboard');
      }

      const size = new Blob([content]).size;

      return {
        success: true,
        format: options.format || 'txt',
        size,
      };
    } catch (error) {
      return {
        success: false,
        format: options.format || 'txt',
        error: error instanceof Error ? error.message : 'Failed to copy to clipboard',
      };
    }
  }

  /**
   * Copy plain text only (no metadata)
   */
  async copyPlainText(text: string): Promise<ExportResult> {
    try {
      const clipboardResult = await clipboardService.copyText(text);
      if (!clipboardResult.success) {
        throw new Error(clipboardResult.error || 'Failed to copy to clipboard');
      }

      return {
        success: true,
        format: 'txt',
        size: new Blob([text]).size,
      };
    } catch (error) {
      return {
        success: false,
        format: 'txt',
        error: error instanceof Error ? error.message : 'Failed to copy to clipboard',
      };
    }
  }

  /**
   * Export to TXT format
   */
  async exportToTxt(
    metadata: ExportMetadata,
    options: Partial<ExportOptions> = {}
  ): Promise<ExportResult> {
    try {
      const content = this.generateTxtContent(metadata, options);
      const filePath = await this.promptSaveLocation('txt', options.customFileName);
      
      if (!filePath) {
        return {
          success: false,
          format: 'txt',
          error: 'Save cancelled by user',
        };
      }

      await invoke('write_text_file', {
        path: filePath,
        content,
      });

      const fileSize = new Blob([content]).size;

      return {
        success: true,
        filePath,
        format: 'txt',
        size: fileSize,
      };
    } catch (error) {
      return {
        success: false,
        format: 'txt',
        error: error instanceof Error ? error.message : 'Export failed',
      };
    }
  }

  /**
   * Export to PDF format
   */
  async exportToPdf(
    metadata: ExportMetadata,
    options: Partial<ExportOptions> = {}
  ): Promise<ExportResult> {
    try {
      const filePath = await this.promptSaveLocation('pdf', options.customFileName);
      
      if (!filePath) {
        return {
          success: false,
          format: 'pdf',
          error: 'Save cancelled by user',
        };
      }

      // Generate PDF content through backend
      const pdfData = await invoke<{ size: number }>('export_to_pdf', {
        metadata: {
          text: metadata.ocrText,
          timestamp: metadata.timestamp,
          language: metadata.language,
          confidence: metadata.confidence,
          summary: metadata.summary,
          tags: metadata.tags,
          imagePath: options.includeImage ? metadata.imagePath : undefined,
        },
        includeMetadata: options.includeMetadata ?? true,
        includeTimestamp: options.includeTimestamp ?? true,
        includeImage: options.includeImage ?? false,
        outputPath: filePath,
      });

      return {
        success: true,
        filePath,
        format: 'pdf',
        size: pdfData.size,
      };
    } catch (error) {
      return {
        success: false,
        format: 'pdf',
        error: error instanceof Error ? error.message : 'PDF export failed',
      };
    }
  }

  /**
   * Export to Markdown format
   */
  async exportToMarkdown(
    metadata: ExportMetadata,
    options: Partial<ExportOptions> = {}
  ): Promise<ExportResult> {
    try {
      const content = this.generateMarkdownContent(metadata, options);
      const filePath = await this.promptSaveLocation('md', options.customFileName);
      
      if (!filePath) {
        return {
          success: false,
          format: 'markdown',
          error: 'Save cancelled by user',
        };
      }

      await invoke('write_text_file', {
        path: filePath,
        content,
      });

      const fileSize = new Blob([content]).size;

      return {
        success: true,
        filePath,
        format: 'markdown',
        size: fileSize,
      };
    } catch (error) {
      return {
        success: false,
        format: 'markdown',
        error: error instanceof Error ? error.message : 'Markdown export failed',
      };
    }
  }

  /**
   * Export to JSON format
   */
  async exportToJson(
    metadata: ExportMetadata,
    options: Partial<ExportOptions> = {}
  ): Promise<ExportResult> {
    try {
      const content = JSON.stringify(metadata, null, 2);
      const filePath = await this.promptSaveLocation('json', options.customFileName);
      
      if (!filePath) {
        return {
          success: false,
          format: 'json',
          error: 'Save cancelled by user',
        };
      }

      await invoke('write_text_file', {
        path: filePath,
        content,
      });

      const fileSize = new Blob([content]).size;

      return {
        success: true,
        filePath,
        format: 'json',
        size: fileSize,
      };
    } catch (error) {
      return {
        success: false,
        format: 'json',
        error: error instanceof Error ? error.message : 'JSON export failed',
      };
    }
  }

  /**
   * Export using automatic format selection
   */
  async export(
    metadata: ExportMetadata,
    options: ExportOptions
  ): Promise<ExportResult> {
    switch (options.format) {
      case 'txt':
        return this.exportToTxt(metadata, options);
      case 'pdf':
        return this.exportToPdf(metadata, options);
      case 'markdown':
        return this.exportToMarkdown(metadata, options);
      case 'json':
        return this.exportToJson(metadata, options);
      case 'clipboard':
        return this.copyToClipboard(metadata, options);
      default:
        return {
          success: false,
          format: options.format,
          error: `Unsupported format: ${options.format}`,
        };
    }
  }

  /**
   * Generate TXT content
   */
  private generateTxtContent(
    metadata: ExportMetadata,
    options: Partial<ExportOptions>
  ): string {
    const parts: string[] = [];

    // Title
    parts.push('OCR TEXT EXPORT');
    parts.push('='.repeat(50));
    parts.push('');

    // Metadata
    if (options.includeMetadata) {
      if (options.includeTimestamp) {
        parts.push(`Timestamp: ${metadata.timestamp}`);
      }
      if (metadata.language) {
        parts.push(`Language: ${metadata.language}`);
      }
      if (metadata.confidence !== undefined) {
        parts.push(`Confidence: ${(metadata.confidence * 100).toFixed(1)}%`);
      }
      if (metadata.tags && metadata.tags.length > 0) {
        parts.push(`Tags: ${metadata.tags.join(', ')}`);
      }
      parts.push('');
      parts.push('-'.repeat(50));
      parts.push('');
    }

    // Main text
    parts.push('TEXT CONTENT:');
    parts.push('');
    parts.push(metadata.ocrText);
    parts.push('');

    // Summary
    if (metadata.summary && options.includeMetadata) {
      parts.push('-'.repeat(50));
      parts.push('');
      parts.push('SUMMARY:');
      parts.push('');
      parts.push(metadata.summary);
      parts.push('');
    }

    // AI Answers
    if (metadata.aiAnswers && metadata.aiAnswers.length > 0 && options.includeMetadata) {
      parts.push('-'.repeat(50));
      parts.push('');
      parts.push('Q&A HISTORY:');
      parts.push('');
      metadata.aiAnswers.forEach((qa, index) => {
        parts.push(`Q${index + 1}: ${qa.question}`);
        parts.push(`A${index + 1}: ${qa.answer}`);
        parts.push('');
      });
    }

    return parts.join('\n');
  }

  /**
   * Generate Markdown content
   */
  private generateMarkdownContent(
    metadata: ExportMetadata,
    options: Partial<ExportOptions>
  ): string {
    const parts: string[] = [];

    // Title
    parts.push('# OCR Text Export');
    parts.push('');

    // Metadata
    if (options.includeMetadata) {
      parts.push('## Metadata');
      parts.push('');
      if (options.includeTimestamp) {
        parts.push(`- **Timestamp**: ${metadata.timestamp}`);
      }
      if (metadata.language) {
        parts.push(`- **Language**: ${metadata.language}`);
      }
      if (metadata.confidence !== undefined) {
        parts.push(`- **Confidence**: ${(metadata.confidence * 100).toFixed(1)}%`);
      }
      if (metadata.tags && metadata.tags.length > 0) {
        parts.push(`- **Tags**: ${metadata.tags.map(t => `\`${t}\``).join(', ')}`);
      }
      parts.push('');
    }

    // Image
    if (options.includeImage && metadata.imagePath) {
      parts.push('## Source Image');
      parts.push('');
      parts.push(`![OCR Source](${metadata.imagePath})`);
      parts.push('');
    }

    // Main text
    parts.push('## Extracted Text');
    parts.push('');
    parts.push('```');
    parts.push(metadata.ocrText);
    parts.push('```');
    parts.push('');

    // Summary
    if (metadata.summary && options.includeMetadata) {
      parts.push('## Summary');
      parts.push('');
      parts.push(metadata.summary);
      parts.push('');
    }

    // AI Answers
    if (metadata.aiAnswers && metadata.aiAnswers.length > 0 && options.includeMetadata) {
      parts.push('## Q&A History');
      parts.push('');
      metadata.aiAnswers.forEach((qa, index) => {
        parts.push(`### Question ${index + 1}`);
        parts.push('');
        parts.push(qa.question);
        parts.push('');
        parts.push('**Answer:**');
        parts.push('');
        parts.push(qa.answer);
        parts.push('');
      });
    }

    return parts.join('\n');
  }

  /**
   * Prompt user for save location
   */
  private async promptSaveLocation(
    extension: string,
    customFileName?: string
  ): Promise<string | null> {
    const defaultFileName = customFileName || this.generateDefaultFileName(extension);
    
    const filePath = await save({
      defaultPath: defaultFileName,
      filters: [
        {
          name: `${extension.toUpperCase()} Files`,
          extensions: [extension],
        },
        {
          name: 'All Files',
          extensions: ['*'],
        },
      ],
    });

    return filePath;
  }

  /**
   * Generate default file name
   */
  private generateDefaultFileName(extension: string): string {
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, '-')
      .replace('T', '_')
      .split('.')[0];
    
    return `ocr_export_${timestamp}.${extension}`;
  }

  /**
   * Check if clipboard API is available
   */
  isClipboardAvailable(): boolean {
    return clipboardService.isAvailable();
  }

  /**
   * Quick copy OCR text only
   */
  async quickCopyText(text: string): Promise<boolean> {
    try {
      const result = await this.copyPlainText(text);
      return result.success;
    } catch {
      return false;
    }
  }

  /**
   * Quick copy with metadata
   */
  async quickCopyWithMetadata(
    metadata: ExportMetadata,
    format: 'txt' | 'markdown' | 'json' = 'txt'
  ): Promise<boolean> {
    try {
      const result = await this.copyToClipboard(metadata, {
        format: format as any, // Use the specified format for content generation
        includeMetadata: true,
        includeTimestamp: true,
      });
      return result.success;
    } catch {
      return false;
    }
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes: number): string {
    if (bytes < 1024) {
      return `${bytes} B`;
    } else if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    } else {
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    }
  }
}

// Singleton instance
export const exportService = new ExportService();
