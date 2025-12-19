/**
 * Ollama Model Manager Service
 * Manages local AI model installation, download, and execution
 */

import { invoke } from '@tauri-apps/api/tauri';
import { listen } from '@tauri-apps/api/event';
import { databaseService } from '../database.service';

export interface OllamaModel {
  name: string;
  size: number;
  digest: string;
  modified_at: string;
  details?: {
    format: string;
    family: string;
    families: string[];
    parameter_size: string;
    quantization_level: string;
  };
}

export interface ModelDownloadProgress {
  status: 'downloading' | 'verifying' | 'complete' | 'error' | 'success';
  progress: number; // 0-100
  downloadedBytes: number;
  totalBytes: number;
  error?: string;
}

export interface OllamaStatus {
  isInstalled: boolean;
  isRunning: boolean;
  version?: string;
  models: OllamaModel[];
}

export class OllamaManagerService {
  private readonly OLLAMA_DOWNLOAD_URL = 'https://ollama.com/download';
  private downloadCallbacks: Map<string, (progress: ModelDownloadProgress) => void> = new Map();

  constructor() {
    this.setupEventListeners();
  }

  private async setupEventListeners() {
    try {
      await listen('ollama-progress', (event: any) => {
        const { model, data } = event.payload;
        this.handleDownloadProgress(model, {
          status: data.status === 'success' ? 'complete' : data.status,
          progress: data.progress,
          downloadedBytes: data.downloaded_bytes,
          totalBytes: data.total_bytes,
          error: data.error
        });
      });
    } catch (error) {
      console.error('Failed to setup Ollama event listeners:', error);
    }
  }

  /**
   * Check if Ollama is installed
   */
  async isOllamaInstalled(): Promise<boolean> {
    try {
      const result = await invoke<boolean>('check_ollama_installed');
      return result;
    } catch (error) {
      console.error('Failed to check Ollama installation:', error);
      return false;
    }
  }

  /**
   * Check if Ollama service is running
   */
  async isOllamaRunning(): Promise<boolean> {
    try {
      const result = await invoke<boolean>('check_ollama_running');
      return result;
    } catch (error) {
      console.error('Failed to check Ollama status:', error);
      return false;
    }
  }

  /**
   * Get Ollama version
   */
  async getOllamaVersion(): Promise<string | null> {
    try {
      const version = await invoke<string>('get_ollama_version');
      return version;
    } catch (error) {
      console.error('Failed to get Ollama version:', error);
      return null;
    }
  }

  /**
   * Get Ollama status (installed, running, version, models)
   */
  async getStatus(): Promise<OllamaStatus> {
    const isInstalled = await this.isOllamaInstalled();
    const isRunning = isInstalled ? await this.isOllamaRunning() : false;
    const versionResult = isRunning ? await this.getOllamaVersion() : null;
    const version = versionResult ?? undefined;
    const models = isRunning ? await this.listModels() : [];

    return {
      isInstalled,
      isRunning,
      version,
      models,
    };
  }

  /**
   * 1-Click Install Ollama
   * Opens download page and provides installation instructions
   */
  async oneClickInstall(): Promise<void> {
    try {
      // Check if already installed
      const isInstalled = await this.isOllamaInstalled();
      if (isInstalled) {
        console.log('Ollama is already installed');
        return;
      }

      // Open download page
      await invoke('open_url', { url: this.OLLAMA_DOWNLOAD_URL });

      // Show installation instructions
      const instructions = this.getInstallationInstructions();
      console.log('Installation instructions:', instructions);

      // Emit event for UI to show instructions
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('ollama-install-started', {
            detail: { instructions },
          })
        );
      }
    } catch (error) {
      console.error('Failed to start Ollama installation:', error);
      throw error;
    }
  }

  /**
   * Get platform-specific installation instructions
   */
  private getInstallationInstructions(): string {
    const platform = window.navigator.platform.toLowerCase();

    if (platform.includes('win')) {
      return `
Windows Installation:
1. Download OllamaSetup.exe from the opened page
2. Run the installer and follow the prompts
3. Restart this application after installation
4. Ollama will run in the background automatically
      `.trim();
    } else if (platform.includes('mac')) {
      return `
macOS Installation:
1. Download Ollama.dmg from the opened page
2. Open the DMG and drag Ollama to Applications
3. Launch Ollama from Applications
4. Restart this application
5. Ollama will appear in the menu bar
      `.trim();
    } else {
      return `
Linux Installation:
1. Run: curl -fsSL https://ollama.com/install.sh | sh
2. Or download from the opened page
3. Start Ollama: ollama serve
4. Restart this application
      `.trim();
    }
  }

  /**
   * Start Ollama service
   */
  async startOllama(): Promise<void> {
    try {
      await invoke('start_ollama_service');
      console.log('Ollama service started');
    } catch (error) {
      console.error('Failed to start Ollama service:', error);
      throw error;
    }
  }

  /**
   * Stop Ollama service
   */
  async stopOllama(): Promise<void> {
    try {
      await invoke('stop_ollama_service');
      console.log('Ollama service stopped');
    } catch (error) {
      console.error('Failed to stop Ollama service:', error);
      throw error;
    }
  }

  /**
   * List installed models
   */
  async listModels(): Promise<OllamaModel[]> {
    try {
      const models = await invoke<OllamaModel[]>('ollama_list_models');
      return models;
    } catch (error) {
      console.error('Failed to list Ollama models:', error);
      return [];
    }
  }

  /**
   * Download and install a model
   */
  async downloadModel(
    modelName: string,
    onProgress?: (progress: ModelDownloadProgress) => void
  ): Promise<void> {
    try {
      // Register progress callback
      if (onProgress) {
        this.downloadCallbacks.set(modelName, onProgress);
      }

      // Start download via backend
      await invoke('ollama_pull_model', { modelName });

      // Save to database
      await this.saveModelToDatabase(modelName);

      console.log(`Model ${modelName} downloaded successfully`);
    } catch (error) {
      console.error(`Failed to download model ${modelName}:`, error);

      if (onProgress) {
        onProgress({
          status: 'error',
          progress: 0,
          downloadedBytes: 0,
          totalBytes: 0,
          error: String(error),
        });
      }

      throw error;
    } finally {
      this.downloadCallbacks.delete(modelName);
    }
  }

  /**
   * Handle download progress from backend
   */
  handleDownloadProgress(modelName: string, progress: ModelDownloadProgress): void {
    const callback = this.downloadCallbacks.get(modelName);
    if (callback) {
      callback(progress);
    }
  }

  /**
   * Delete a model
   */
  async deleteModel(modelName: string): Promise<void> {
    try {
      await invoke('ollama_delete_model', { modelName });

      // Remove from database
      await this.removeModelFromDatabase(modelName);

      console.log(`Model ${modelName} deleted successfully`);
    } catch (error) {
      console.error(`Failed to delete model ${modelName}:`, error);
      throw error;
    }
  }

  /**
   * Get recommended models for different use cases
   */
  getRecommendedModels(): Array<{
    name: string;
    size: string;
    description: string;
    useCase: string;
    category: 'normal' | 'thinking' | 'websearch' | 'coding';
  }> {
    return [
      // Normal (Chat/General)
      {
        name: 'llama3.2:1b',
        size: '1.3 GB',
        description: 'Fast, lightweight model for quick responses',
        useCase: 'General text processing, summaries',
        category: 'normal',
      },
      {
        name: 'llama3.2:3b',
        size: '2.0 GB',
        description: 'Balanced performance and quality',
        useCase: 'Text analysis, Q&A, translations',
        category: 'normal',
      },
      {
        name: 'llama3.1:8b',
        size: '4.7 GB',
        description: 'High quality responses',
        useCase: 'Complex analysis, research',
        category: 'normal',
      },
      {
        name: 'mistral:7b',
        size: '4.1 GB',
        description: 'Efficient and accurate',
        useCase: 'General purpose, coding',
        category: 'normal',
      },
      {
        name: 'phi3:mini',
        size: '2.3 GB',
        description: 'Microsoft Phi-3 small model',
        useCase: 'Fast inference, embeddings',
        category: 'normal',
      },
      {
        name: 'gemma2:2b',
        size: '1.6 GB',
        description: 'Google Gemma tiny model',
        useCase: 'Ultra-fast local processing',
        category: 'normal',
      },

      // Thinking (Reasoning)
      {
        name: 'deepseek-r1:latest',
        size: '4.7 GB',
        description: 'DeepSeek R1 Reasoning Model',
        useCase: 'Complex reasoning, math, logic',
        category: 'thinking',
      },
      {
        name: 'qwq:latest',
        size: '4.5 GB',
        description: 'Qwen QwQ Reasoning Model',
        useCase: 'Step-by-step thinking, problem solving',
        category: 'thinking',
      },

      // Web Search / Tool Use Capable
      {
        name: 'llama3.1:latest',
        size: '4.7 GB',
        description: 'Llama 3.1 (Tool Use Optimized)',
        useCase: 'Web search integration, function calling',
        category: 'websearch',
      },
      {
        name: 'mistral-nemo:latest',
        size: '7.1 GB',
        description: 'Mistral Nemo (Large Context)',
        useCase: 'Research, long documents, tools',
        category: 'websearch',
      },

      // Coding
      {
        name: 'codellama:7b',
        size: '3.8 GB',
        description: 'Code Llama',
        useCase: 'Programming, code explanation',
        category: 'coding',
      },
      {
        name: 'qwen2.5-coder:7b',
        size: '4.3 GB',
        description: 'Qwen 2.5 Coder',
        useCase: 'Code generation, debugging',
        category: 'coding',
      },
    ];
  }

  /**
   * Save model to database
   */
  private async saveModelToDatabase(modelName: string): Promise<void> {
    try {
      const now = Date.now();
      await databaseService.createModelRecord({
        name: modelName,
        path: `ollama://${modelName}`,
        version: '1.0',
        hash: '',
        installedAt: now,
        modelType: 'ollama',
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
    } catch (error) {
      console.error('Failed to save model to database:', error);
    }
  }

  /**
   * Remove model from database
   */
  private async removeModelFromDatabase(modelName: string): Promise<void> {
    try {
      // Get all model records
      const models = await databaseService.getAllModelRecords();

      // Find the matching model
      const model = models.find((m) => m.name === modelName);

      if (model) {
        await databaseService.deleteModelRecord(model.id!);
      }
    } catch (error) {
      console.error('Failed to remove model from database:', error);
    }
  }

  /**
   * Run a model (generate response)
   */
  async generate(
    modelName: string,
    prompt: string,
    options?: {
      temperature?: number;
      maxTokens?: number;
      stream?: boolean;
    }
  ): Promise<string> {
    try {
      const response = await invoke<string>('ollama_generate', {
        modelName,
        prompt,
        temperature: options?.temperature ?? 0.7,
        maxTokens: options?.maxTokens ?? 1000,
      });

      return response;
    } catch (error) {
      console.error(`Failed to generate with model ${modelName}:`, error);
      throw error;
    }
  }

  /**
   * Check model hash/integrity
   */
  async verifyModel(modelName: string): Promise<boolean> {
    try {
      const result = await invoke<boolean>('ollama_verify_model', { modelName });
      return result;
    } catch (error) {
      console.error(`Failed to verify model ${modelName}:`, error);
      return false;
    }
  }

  /**
   * Get model info (size, parameters, quantization)
   */
  async getModelInfo(modelName: string): Promise<OllamaModel | null> {
    try {
      const models = await this.listModels();
      return models.find((m) => m.name === modelName) || null;
    } catch (error) {
      console.error(`Failed to get info for model ${modelName}:`, error);
      return null;
    }
  }

  /**
   * Get resource usage (CPU/Memory)
   */
  async getResourceUsage(): Promise<{
    cpu: number;
    memory: number;
    gpu?: number;
  }> {
    try {
      const usage = await invoke<{ cpu: number; memory: number; gpu?: number }>(
        'get_ollama_resource_usage'
      );
      return usage;
    } catch (error) {
      console.error('Failed to get resource usage:', error);
      return { cpu: 0, memory: 0 };
    }
  }
}

// Export singleton instance
export const ollamaManager = new OllamaManagerService();
