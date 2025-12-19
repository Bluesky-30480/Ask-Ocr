/**
 * Ollama Detection Service
 * Provides utilities for detecting and managing Ollama installation
 */

import { invoke } from '@tauri-apps/api/tauri';

export interface OllamaStatus {
  installed: boolean;
  running: boolean;
  path: string | null;
}

class OllamaDetectionService {
  private statusCache: OllamaStatus | null = null;
  private cacheTimestamp: number = 0;
  private cacheDuration: number = 5000; // 5 seconds

  /**
   * Check if Ollama is installed
   */
  async isInstalled(): Promise<boolean> {
    try {
      return await invoke<boolean>('check_ollama_installed');
    } catch (error) {
      console.error('Failed to check Ollama installation:', error);
      return false;
    }
  }

  /**
   * Check if Ollama service is running
   */
  async isRunning(): Promise<boolean> {
    try {
      return await invoke<boolean>('check_ollama_running');
    } catch (error) {
      console.error('Failed to check Ollama status:', error);
      return false;
    }
  }

  /**
   * Get Ollama installation path
   */
  async getPath(): Promise<string | null> {
    try {
      return await invoke<string | null>('get_ollama_path');
    } catch (error) {
      console.error('Failed to get Ollama path:', error);
      return null;
    }
  }

  /**
   * Get complete Ollama status (with caching)
   */
  async getStatus(forceRefresh: boolean = false): Promise<OllamaStatus> {
    const now = Date.now();

    // Return cached status if available and not expired
    if (
      !forceRefresh &&
      this.statusCache &&
      now - this.cacheTimestamp < this.cacheDuration
    ) {
      return this.statusCache;
    }

    // Fetch fresh status
    const [installed, running, path] = await Promise.all([
      this.isInstalled(),
      this.isRunning(),
      this.getPath(),
    ]);

    this.statusCache = { installed, running, path };
    this.cacheTimestamp = now;

    return this.statusCache;
  }

  /**
   * Start Ollama service
   */
  async startService(): Promise<void> {
    try {
      await invoke('start_ollama_service');
      
      // Clear cache to force refresh
      this.statusCache = null;
    } catch (error) {
      console.error('Failed to start Ollama service:', error);
      throw new Error('Failed to start Ollama service');
    }
  }

  /**
   * Install Ollama with one click
   */
  async installOneClick(): Promise<void> {
    try {
      await invoke('install_ollama_one_click');
      
      // Clear cache to force refresh
      this.statusCache = null;
    } catch (error) {
      console.error('Failed to install Ollama:', error);
      throw error;
    }
  }

  /**
   * Verify Ollama installation
   */
  async verifyInstallation(): Promise<boolean> {
    try {
      return await invoke<boolean>('verify_ollama_installation');
    } catch (error) {
      console.error('Failed to verify Ollama installation:', error);
      return false;
    }
  }

  /**
   * Clear status cache
   */
  clearCache(): void {
    this.statusCache = null;
    this.cacheTimestamp = 0;
  }

  /**
   * Check if Ollama is available (installed and running)
   */
  async isAvailable(): Promise<boolean> {
    const status = await this.getStatus();
    return status.installed && status.running;
  }

  /**
   * Get Ollama API URL
   */
  getApiUrl(): string {
    return 'http://localhost:11434';
  }

  /**
   * Test Ollama API connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.getApiUrl()}/api/tags`);
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get list of installed models
   */
  async getInstalledModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.getApiUrl()}/api/tags`);
      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      return data.models?.map((m: any) => m.name) || [];
    } catch (error) {
      console.error('Failed to get installed models:', error);
      return [];
    }
  }
}

// Export singleton instance
export const ollamaDetectionService = new OllamaDetectionService();
export default ollamaDetectionService;
