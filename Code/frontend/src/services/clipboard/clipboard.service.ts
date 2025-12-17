/**
 * Clipboard Service
 * Provides simple clipboard operations with fallback support
 */

export interface ClipboardResult {
  success: boolean;
  error?: string;
}

export class ClipboardService {
  /**
   * Copy text to clipboard
   */
  async copyText(text: string): Promise<ClipboardResult> {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback for older browsers
        this.fallbackCopyText(text);
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to copy to clipboard',
      };
    }
  }

  /**
   * Read text from clipboard
   */
  async readText(): Promise<string | null> {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        return await navigator.clipboard.readText();
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Check if clipboard API is available
   */
  isAvailable(): boolean {
    return !!(navigator.clipboard && navigator.clipboard.writeText);
  }

  /**
   * Fallback copy method for older browsers
   */
  private fallbackCopyText(text: string): void {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    
    // Make the textarea invisible
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    textArea.style.opacity = '0';
    
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    
    if (!successful) {
      throw new Error('Fallback copy method failed');
    }
  }

  /**
   * Copy with user feedback
   */
  async copyWithFeedback(
    text: string,
    onSuccess?: (message: string) => void,
    onError?: (message: string) => void
  ): Promise<boolean> {
    const result = await this.copyText(text);
    
    if (result.success) {
      onSuccess?.('✅ Copied to clipboard');
    } else {
      onError?.(`❌ Failed to copy: ${result.error}`);
    }
    
    return result.success;
  }

  /**
   * Copy formatted text (with line breaks preserved)
   */
  async copyFormatted(lines: string[]): Promise<ClipboardResult> {
    return this.copyText(lines.join('\n'));
  }

  /**
   * Copy as JSON (formatted)
   */
  async copyAsJson(data: any): Promise<ClipboardResult> {
    try {
      const jsonString = JSON.stringify(data, null, 2);
      return this.copyText(jsonString);
    } catch (error) {
      return {
        success: false,
        error: 'Failed to serialize data to JSON',
      };
    }
  }
}

// Singleton instance
export const clipboardService = new ClipboardService();