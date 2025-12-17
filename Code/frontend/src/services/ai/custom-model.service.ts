/**
 * Custom Model Import Service
 * Handles user-installed custom AI models with validation and metadata extraction
 */

import { invoke } from '@tauri-apps/api/tauri';
import type { ModelMetadata } from './model-registry.service';

export interface CustomModelMetadata {
  // User-provided information
  id: string;
  name: string;
  displayName: string;
  description: string;
  
  // File information
  filePath: string;
  fileName: string;
  fileSize: number;
  fileHash: string; // SHA256
  
  // Model specifications (auto-detected or user-provided)
  format: 'GGUF' | 'GGML' | 'SafeTensors' | 'PyTorch' | 'ONNX' | 'Unknown';
  quantization?: string;
  parameters?: string;
  contextWindow?: number;
  
  // Compatibility information
  isCompatible: boolean;
  compatibilityIssues: string[];
  requiredRAM?: string;
  supportedBackends: ('ollama' | 'llama.cpp' | 'onnx')[];
  
  // Metadata from model file
  architecture?: string;
  author?: string;
  license?: string;
  sourceUrl?: string;
  tags: string[];
  
  // Validation results
  isValidated: boolean;
  validationErrors: string[];
  validationWarnings: string[];
  
  // Installation info
  isInstalled: boolean;
  installedPath?: string;
  installedAt?: string;
  lastUsed?: string;
  
  // User preferences
  isFavorite: boolean;
  notes?: string;
  customPromptTemplate?: string;
}

export interface ModelValidationResult {
  isValid: boolean;
  format: CustomModelMetadata['format'];
  errors: string[];
  warnings: string[];
  metadata: {
    architecture?: string;
    parameters?: string;
    quantization?: string;
    contextWindow?: number;
    author?: string;
    license?: string;
  };
  compatibility: {
    isCompatible: boolean;
    issues: string[];
    supportedBackends: string[];
  };
}

export interface ModelImportOptions {
  validateChecksum?: boolean;
  autoInstall?: boolean;
  installPath?: string;
  overwriteExisting?: boolean;
  extractMetadata?: boolean;
}

export class CustomModelService {
  private customModels = new Map<string, CustomModelMetadata>();

  /**
   * Import a custom model from file
   */
  async importModel(
    filePath: string,
    options: ModelImportOptions = {}
  ): Promise<CustomModelMetadata> {
    try {
      // Step 1: Validate file exists and is accessible
      const fileInfo = await this.getFileInfo(filePath);
      
      // Step 2: Validate model file format and compatibility
      const validation = await this.validateModelFile(filePath, options.validateChecksum ?? true);
      
      if (!validation.isValid && validation.errors.length > 0) {
        throw new Error(`Model validation failed: ${validation.errors.join(', ')}`);
      }

      // Step 3: Extract metadata from model file
      const metadata = options.extractMetadata
        ? await this.extractModelMetadata(filePath, validation.format)
        : validation.metadata;

      // Step 4: Create custom model metadata
      const customModel: CustomModelMetadata = {
        id: `custom_${Date.now()}_${this.sanitizeFileName(fileInfo.name)}`,
        name: fileInfo.name,
        displayName: this.generateDisplayName(fileInfo.name),
        description: `Custom imported model: ${fileInfo.name}`,
        filePath: filePath,
        fileName: fileInfo.name,
        fileSize: fileInfo.size,
        fileHash: fileInfo.hash,
        format: validation.format,
        quantization: metadata.quantization,
        parameters: metadata.parameters,
        contextWindow: metadata.contextWindow,
        isCompatible: validation.compatibility.isCompatible,
        compatibilityIssues: validation.compatibility.issues,
        supportedBackends: validation.compatibility.supportedBackends as any[],
        architecture: metadata.architecture,
        author: metadata.author,
        license: metadata.license,
        tags: this.generateTags(fileInfo.name, validation.format),
        isValidated: true,
        validationErrors: validation.errors,
        validationWarnings: validation.warnings,
        isInstalled: false,
        isFavorite: false,
      };

      // Step 5: Auto-install if requested
      if (options.autoInstall && validation.compatibility.isCompatible) {
        await this.installCustomModel(customModel, options.installPath);
      }

      // Step 6: Save to registry
      this.customModels.set(customModel.id, customModel);
      await this.saveCustomModels();

      return customModel;
    } catch (error) {
      throw new Error(`Failed to import model: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate model file format and compatibility
   */
  private async validateModelFile(
    filePath: string,
    validateChecksum: boolean
  ): Promise<ModelValidationResult> {
    try {
      const result = await invoke<ModelValidationResult>('validate_model_file', {
        filePath,
        validateChecksum,
      });

      return result;
    } catch (error) {
      return {
        isValid: false,
        format: 'Unknown',
        errors: [error instanceof Error ? error.message : 'Validation failed'],
        warnings: [],
        metadata: {},
        compatibility: {
          isCompatible: false,
          issues: ['Failed to validate model file'],
          supportedBackends: [],
        },
      };
    }
  }

  /**
   * Extract metadata from model file
   */
  private async extractModelMetadata(
    filePath: string,
    format: CustomModelMetadata['format']
  ): Promise<ModelValidationResult['metadata']> {
    try {
      const metadata = await invoke<ModelValidationResult['metadata']>('extract_model_metadata', {
        filePath,
        format,
      });

      return metadata;
    } catch (error) {
      console.warn('Failed to extract model metadata:', error);
      return {};
    }
  }

  /**
   * Get file information
   */
  private async getFileInfo(filePath: string): Promise<{
    name: string;
    size: number;
    hash: string;
  }> {
    try {
      const info = await invoke<{ name: string; size: number; hash: string }>('get_file_info', {
        filePath,
      });

      return info;
    } catch (error) {
      throw new Error(`Failed to read file info: ${error}`);
    }
  }

  /**
   * Install custom model
   */
  private async installCustomModel(
    model: CustomModelMetadata,
    installPath?: string
  ): Promise<void> {
    try {
      const targetPath = installPath || await this.getDefaultInstallPath();

      await invoke('install_custom_model', {
        sourcePath: model.filePath,
        targetPath,
        modelName: model.name,
      });

      model.isInstalled = true;
      model.installedPath = targetPath;
      model.installedAt = new Date().toISOString();
    } catch (error) {
      throw new Error(`Failed to install model: ${error}`);
    }
  }

  /**
   * Browse for model file
   */
  async browseForModel(): Promise<string | null> {
    try {
      const selected = await invoke<string>('select_model_file', {
        title: 'Select AI Model File',
        filters: [
          { name: 'GGUF Models', extensions: ['gguf'] },
          { name: 'GGML Models', extensions: ['ggml', 'bin'] },
          { name: 'SafeTensors', extensions: ['safetensors'] },
          { name: 'PyTorch', extensions: ['pt', 'pth', 'bin'] },
          { name: 'ONNX', extensions: ['onnx'] },
          { name: 'All Files', extensions: ['*'] },
        ],
      });

      return selected || null;
    } catch (error) {
      console.error('Failed to browse for model:', error);
      return null;
    }
  }

  /**
   * Get all custom models
   */
  getAllCustomModels(): CustomModelMetadata[] {
    return Array.from(this.customModels.values());
  }

  /**
   * Get custom model by ID
   */
  getCustomModel(id: string): CustomModelMetadata | undefined {
    return this.customModels.get(id);
  }

  /**
   * Get installed custom models
   */
  getInstalledCustomModels(): CustomModelMetadata[] {
    return this.getAllCustomModels().filter(m => m.isInstalled);
  }

  /**
   * Get compatible custom models
   */
  getCompatibleCustomModels(): CustomModelMetadata[] {
    return this.getAllCustomModels().filter(m => m.isCompatible);
  }

  /**
   * Remove custom model
   */
  async removeCustomModel(id: string, deleteFile: boolean = false): Promise<void> {
    const model = this.customModels.get(id);
    if (!model) {
      throw new Error(`Model not found: ${id}`);
    }

    if (deleteFile && model.installedPath) {
      try {
        await invoke('delete_model_file', {
          filePath: model.installedPath,
        });
      } catch (error) {
        console.error('Failed to delete model file:', error);
      }
    }

    this.customModels.delete(id);
    await this.saveCustomModels();
  }

  /**
   * Update custom model metadata
   */
  async updateCustomModel(id: string, updates: Partial<CustomModelMetadata>): Promise<void> {
    const model = this.customModels.get(id);
    if (!model) {
      throw new Error(`Model not found: ${id}`);
    }

    Object.assign(model, updates);
    await this.saveCustomModels();
  }

  /**
   * Toggle favorite status
   */
  async toggleFavorite(id: string): Promise<void> {
    const model = this.customModels.get(id);
    if (model) {
      model.isFavorite = !model.isFavorite;
      await this.saveCustomModels();
    }
  }

  /**
   * Convert custom model to standard ModelMetadata format
   */
  toStandardMetadata(customModel: CustomModelMetadata): Partial<ModelMetadata> {
    return {
      id: customModel.id,
      name: customModel.name,
      displayName: customModel.displayName,
      version: 'custom',
      parameters: customModel.parameters || 'Unknown',
      tags: [...customModel.tags, 'custom', 'user-installed'],
      category: 'general',
      license: customModel.license || 'Unknown',
      releaseDate: customModel.installedAt || new Date().toISOString().split('T')[0],
      lastUpdated: new Date().toISOString().split('T')[0],
    } as Partial<ModelMetadata>;
  }

  /**
   * Search custom models
   */
  searchCustomModels(query: string): CustomModelMetadata[] {
    const lowerQuery = query.toLowerCase();
    return this.getAllCustomModels().filter(
      m =>
        m.name.toLowerCase().includes(lowerQuery) ||
        m.displayName.toLowerCase().includes(lowerQuery) ||
        m.description.toLowerCase().includes(lowerQuery) ||
        m.tags.some(t => t.toLowerCase().includes(lowerQuery))
    );
  }

  // Private helper methods

  private sanitizeFileName(name: string): string {
    return name.replace(/[^a-z0-9_-]/gi, '_').toLowerCase();
  }

  private generateDisplayName(fileName: string): string {
    // Remove extension
    const nameWithoutExt = fileName.replace(/\.(gguf|ggml|bin|safetensors|pt|pth|onnx)$/i, '');
    
    // Convert snake_case or kebab-case to Title Case
    return nameWithoutExt
      .replace(/[_-]/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  private generateTags(fileName: string, format: CustomModelMetadata['format']): string[] {
    const tags: string[] = ['custom', 'user-installed'];
    
    const lowerName = fileName.toLowerCase();
    
    // Add format tag
    tags.push(format.toLowerCase());
    
    // Detect common model families
    if (lowerName.includes('llama')) tags.push('llama');
    if (lowerName.includes('mistral')) tags.push('mistral');
    if (lowerName.includes('phi')) tags.push('phi');
    if (lowerName.includes('gemma')) tags.push('gemma');
    if (lowerName.includes('qwen')) tags.push('qwen');
    if (lowerName.includes('falcon')) tags.push('falcon');
    
    // Detect quantization
    if (lowerName.includes('q4')) tags.push('4-bit');
    if (lowerName.includes('q5')) tags.push('5-bit');
    if (lowerName.includes('q8')) tags.push('8-bit');
    if (lowerName.includes('fp16')) tags.push('fp16');
    
    // Detect size
    if (lowerName.includes('1b') || lowerName.includes('1.5b')) tags.push('small');
    if (lowerName.includes('3b') || lowerName.includes('7b')) tags.push('medium');
    if (lowerName.includes('8b') || lowerName.includes('13b')) tags.push('large');
    
    return tags;
  }

  private async getDefaultInstallPath(): Promise<string> {
    try {
      const path = await invoke<string>('get_default_models_path');
      return path;
    } catch (error) {
      // Fallback to platform-specific default
      const platform = window.navigator.platform.toLowerCase();
      if (platform.includes('win')) {
        return '%APPDATA%\\AskOcr\\custom_models';
      } else if (platform.includes('mac')) {
        return '~/Library/Application Support/AskOcr/custom_models';
      } else {
        return '~/.local/share/askoocr/custom_models';
      }
    }
  }

  private async saveCustomModels(): Promise<void> {
    try {
      const models = Array.from(this.customModels.values());
      await invoke('save_custom_models', { models });
    } catch (error) {
      console.error('Failed to save custom models:', error);
    }
  }

  /**
   * Load custom models from storage
   */
  async loadCustomModels(): Promise<void> {
    try {
      const models = await invoke<CustomModelMetadata[]>('load_custom_models');
      this.customModels.clear();
      models.forEach(model => {
        this.customModels.set(model.id, model);
      });
    } catch (error) {
      console.error('Failed to load custom models:', error);
    }
  }
}

// Singleton instance
export const customModelService = new CustomModelService();
