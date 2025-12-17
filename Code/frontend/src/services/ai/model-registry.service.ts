/**
 * Local AI Model Registry Service
 * Provides comprehensive metadata for supported local AI models
 */

export interface ModelMetadata {
  id: string;
  name: string;
  displayName: string;
  provider: 'meta' | 'mistral' | 'microsoft' | 'google';
  version: string;
  
  // Model specifications
  parameters: string; // e.g., "1B", "3B", "8B"
  size: {
    fp16: string; // Full precision
    q4_0: string; // 4-bit quantization
    q4_K_M: string; // 4-bit K-quant medium
    q5_K_M?: string; // 5-bit K-quant medium
    q8_0?: string; // 8-bit quantization
  };
  
  // Hardware requirements
  requirements: {
    minRAM: string;
    minVRAM?: string; // For GPU acceleration
    recommendedRAM: string;
    recommendedVRAM?: string;
    diskSpace: string;
    cpuCores?: number;
  };
  
  // Performance characteristics
  performance: {
    tokensPerSecond: {
      cpu: string;
      gpu?: string;
    };
    contextWindow: number; // Max tokens
    maxOutput: number; // Max output tokens
  };
  
  // Capabilities and use cases
  capabilities: string[];
  useCases: string[];
  strengths: string[];
  limitations: string[];
  
  // Model tags and categories
  tags: string[];
  category: 'general' | 'coding' | 'chat' | 'reasoning' | 'vision';
  
  // Download information
  downloadUrl: string;
  sha256?: string;
  license: string;
  homepage: string;
  
  // Release information
  releaseDate: string;
  lastUpdated: string;
  isRecommended?: boolean;
  isExperimental?: boolean;
}

export interface ModelCategory {
  id: string;
  name: string;
  description: string;
  models: string[]; // Model IDs
}

export class ModelRegistryService {
  private models: Map<string, ModelMetadata> = new Map();
  private categories: Map<string, ModelCategory> = new Map();

  constructor() {
    this.initializeRegistry();
  }

  private initializeRegistry(): void {
    // Llama 3.2 1B - Lightweight model for fast inference
    this.registerModel({
      id: 'llama-3.2-1b',
      name: 'llama3.2:1b',
      displayName: 'Llama 3.2 1B',
      provider: 'meta',
      version: '3.2',
      parameters: '1B',
      size: {
        fp16: '2.6 GB',
        q4_0: '700 MB',
        q4_K_M: '750 MB',
        q5_K_M: '900 MB',
        q8_0: '1.3 GB',
      },
      requirements: {
        minRAM: '4 GB',
        minVRAM: '2 GB',
        recommendedRAM: '8 GB',
        recommendedVRAM: '4 GB',
        diskSpace: '3 GB',
        cpuCores: 2,
      },
      performance: {
        tokensPerSecond: {
          cpu: '15-25 tokens/s',
          gpu: '40-80 tokens/s',
        },
        contextWindow: 8192,
        maxOutput: 2048,
      },
      capabilities: [
        'Text generation',
        'Summarization',
        'Simple Q&A',
        'Translation',
        'Text classification',
      ],
      useCases: [
        'Quick OCR text summarization',
        'Real-time text analysis',
        'Edge devices and laptops',
        'Privacy-focused applications',
        'Rapid prototyping',
      ],
      strengths: [
        'Very fast inference on CPU',
        'Low memory footprint',
        'Good for simple tasks',
        'Efficient quantization support',
      ],
      limitations: [
        'Limited reasoning capabilities',
        'May struggle with complex queries',
        'Shorter context compared to larger models',
        'Less accurate on technical content',
      ],
      tags: ['lightweight', 'fast', 'cpu-friendly', 'edge'],
      category: 'general',
      downloadUrl: 'ollama://library/llama3.2:1b',
      license: 'Llama 3 Community License',
      homepage: 'https://ai.meta.com/blog/llama-3-2/',
      releaseDate: '2024-09-25',
      lastUpdated: '2024-09-25',
      isRecommended: true,
    });

    // Llama 3.2 3B - Balanced performance and efficiency
    this.registerModel({
      id: 'llama-3.2-3b',
      name: 'llama3.2:3b',
      displayName: 'Llama 3.2 3B',
      provider: 'meta',
      version: '3.2',
      parameters: '3B',
      size: {
        fp16: '6.4 GB',
        q4_0: '1.7 GB',
        q4_K_M: '1.9 GB',
        q5_K_M: '2.3 GB',
        q8_0: '3.2 GB',
      },
      requirements: {
        minRAM: '6 GB',
        minVRAM: '4 GB',
        recommendedRAM: '12 GB',
        recommendedVRAM: '6 GB',
        diskSpace: '7 GB',
        cpuCores: 4,
      },
      performance: {
        tokensPerSecond: {
          cpu: '8-15 tokens/s',
          gpu: '30-60 tokens/s',
        },
        contextWindow: 8192,
        maxOutput: 2048,
      },
      capabilities: [
        'Advanced text generation',
        'Code understanding',
        'Summarization',
        'Q&A with context',
        'Translation',
        'Content analysis',
      ],
      useCases: [
        'OCR text analysis and summarization',
        'Document Q&A',
        'Content extraction',
        'Multi-language translation',
        'Local AI assistant',
      ],
      strengths: [
        'Excellent balance of speed and quality',
        'Good reasoning capabilities',
        'Handles technical content well',
        'Efficient on modern CPUs',
      ],
      limitations: [
        'Requires more resources than 1B',
        'May be slower on older hardware',
        'Context window limitation for long documents',
      ],
      tags: ['balanced', 'versatile', 'recommended', 'efficient'],
      category: 'general',
      downloadUrl: 'ollama://library/llama3.2:3b',
      license: 'Llama 3 Community License',
      homepage: 'https://ai.meta.com/blog/llama-3-2/',
      releaseDate: '2024-09-25',
      lastUpdated: '2024-09-25',
      isRecommended: true,
    });

    // Llama 3.1 8B - High-quality general-purpose model
    this.registerModel({
      id: 'llama-3.1-8b',
      name: 'llama3.1:8b',
      displayName: 'Llama 3.1 8B',
      provider: 'meta',
      version: '3.1',
      parameters: '8B',
      size: {
        fp16: '16 GB',
        q4_0: '4.3 GB',
        q4_K_M: '4.7 GB',
        q5_K_M: '5.7 GB',
        q8_0: '8.5 GB',
      },
      requirements: {
        minRAM: '12 GB',
        minVRAM: '8 GB',
        recommendedRAM: '16 GB',
        recommendedVRAM: '12 GB',
        diskSpace: '17 GB',
        cpuCores: 6,
      },
      performance: {
        tokensPerSecond: {
          cpu: '4-8 tokens/s',
          gpu: '20-40 tokens/s',
        },
        contextWindow: 131072, // 128K tokens
        maxOutput: 4096,
      },
      capabilities: [
        'Advanced reasoning',
        'Code generation and analysis',
        'Complex Q&A',
        'Long document summarization',
        'Multi-step problem solving',
        'Creative writing',
      ],
      useCases: [
        'Complex document analysis',
        'Technical content extraction',
        'Code generation from OCR',
        'Research assistance',
        'Multi-turn conversations',
      ],
      strengths: [
        'Excellent reasoning abilities',
        'Very large context window (128K)',
        'High-quality outputs',
        'Strong coding capabilities',
        'Handles complex instructions',
      ],
      limitations: [
        'Requires significant RAM',
        'Slower inference on CPU',
        'Large disk space requirement',
        'Best with GPU acceleration',
      ],
      tags: ['powerful', 'long-context', 'reasoning', 'coding'],
      category: 'reasoning',
      downloadUrl: 'ollama://library/llama3.1:8b',
      license: 'Llama 3.1 Community License',
      homepage: 'https://ai.meta.com/blog/llama-3-1/',
      releaseDate: '2024-07-23',
      lastUpdated: '2024-07-23',
      isRecommended: true,
    });

    // Mistral 7B - Fast and efficient instruction-following model
    this.registerModel({
      id: 'mistral-7b',
      name: 'mistral:7b',
      displayName: 'Mistral 7B',
      provider: 'mistral',
      version: '0.3',
      parameters: '7B',
      size: {
        fp16: '14.5 GB',
        q4_0: '3.8 GB',
        q4_K_M: '4.1 GB',
        q5_K_M: '5.0 GB',
        q8_0: '7.7 GB',
      },
      requirements: {
        minRAM: '10 GB',
        minVRAM: '6 GB',
        recommendedRAM: '16 GB',
        recommendedVRAM: '10 GB',
        diskSpace: '15 GB',
        cpuCores: 4,
      },
      performance: {
        tokensPerSecond: {
          cpu: '5-10 tokens/s',
          gpu: '25-50 tokens/s',
        },
        contextWindow: 32768, // 32K tokens
        maxOutput: 4096,
      },
      capabilities: [
        'Instruction following',
        'Code generation',
        'Reasoning',
        'Summarization',
        'Translation',
        'Q&A',
      ],
      useCases: [
        'OCR text processing',
        'Document summarization',
        'Code extraction and analysis',
        'Structured data extraction',
        'Task automation',
      ],
      strengths: [
        'Very fast inference',
        'Excellent instruction following',
        'Good coding capabilities',
        'Efficient memory usage',
        'Strong performance on benchmarks',
      ],
      limitations: [
        'Smaller context than Llama 3.1',
        'May hallucinate on complex topics',
        'Less creative than larger models',
      ],
      tags: ['fast', 'efficient', 'instruction', 'coding'],
      category: 'coding',
      downloadUrl: 'ollama://library/mistral:7b',
      license: 'Apache 2.0',
      homepage: 'https://mistral.ai/news/announcing-mistral-7b/',
      releaseDate: '2023-09-27',
      lastUpdated: '2024-05-22',
      isRecommended: true,
    });

    // Phi-3 Mini - Microsoft's compact high-performance model
    this.registerModel({
      id: 'phi-3-mini',
      name: 'phi3:mini',
      displayName: 'Phi-3 Mini (3.8B)',
      provider: 'microsoft',
      version: '3.0',
      parameters: '3.8B',
      size: {
        fp16: '7.6 GB',
        q4_0: '2.2 GB',
        q4_K_M: '2.4 GB',
        q8_0: '4.0 GB',
      },
      requirements: {
        minRAM: '8 GB',
        minVRAM: '4 GB',
        recommendedRAM: '12 GB',
        recommendedVRAM: '6 GB',
        diskSpace: '8 GB',
        cpuCores: 4,
      },
      performance: {
        tokensPerSecond: {
          cpu: '10-18 tokens/s',
          gpu: '35-70 tokens/s',
        },
        contextWindow: 4096,
        maxOutput: 2048,
      },
      capabilities: [
        'Text generation',
        'Code understanding',
        'Math reasoning',
        'Summarization',
        'Q&A',
        'Classification',
      ],
      useCases: [
        'Quick OCR analysis',
        'Mathematical formula extraction',
        'Code snippet analysis',
        'Technical document processing',
        'Edge deployment',
      ],
      strengths: [
        'Excellent performance for size',
        'Strong math and reasoning',
        'Fast inference',
        'Low resource requirements',
        'Well-optimized for CPU',
      ],
      limitations: [
        'Limited context window (4K)',
        'Not ideal for creative tasks',
        'Focused on reasoning over generation',
        'Less capable with long documents',
      ],
      tags: ['compact', 'efficient', 'math', 'reasoning', 'microsoft'],
      category: 'reasoning',
      downloadUrl: 'ollama://library/phi3:mini',
      license: 'MIT',
      homepage: 'https://azure.microsoft.com/en-us/products/phi-3',
      releaseDate: '2024-04-23',
      lastUpdated: '2024-04-23',
      isRecommended: true,
    });

    // Gemma 2B - Google's lightweight open model
    this.registerModel({
      id: 'gemma-2b',
      name: 'gemma:2b',
      displayName: 'Gemma 2B',
      provider: 'google',
      version: '2.0',
      parameters: '2B',
      size: {
        fp16: '5.0 GB',
        q4_0: '1.4 GB',
        q4_K_M: '1.6 GB',
        q8_0: '2.7 GB',
      },
      requirements: {
        minRAM: '6 GB',
        minVRAM: '3 GB',
        recommendedRAM: '8 GB',
        recommendedVRAM: '4 GB',
        diskSpace: '6 GB',
        cpuCores: 2,
      },
      performance: {
        tokensPerSecond: {
          cpu: '12-20 tokens/s',
          gpu: '35-70 tokens/s',
        },
        contextWindow: 8192,
        maxOutput: 2048,
      },
      capabilities: [
        'Text generation',
        'Summarization',
        'Translation',
        'Q&A',
        'Sentiment analysis',
        'Text classification',
      ],
      useCases: [
        'Fast OCR text summarization',
        'Multi-language processing',
        'Lightweight document analysis',
        'Mobile and edge deployment',
        'Real-time text processing',
      ],
      strengths: [
        'Very fast inference',
        'Small memory footprint',
        'Good multi-language support',
        'Efficient quantization',
        'Open and permissive license',
      ],
      limitations: [
        'Limited reasoning capabilities',
        'Not suitable for complex tasks',
        'Smaller context window',
        'Less capable than larger models',
      ],
      tags: ['lightweight', 'fast', 'multilingual', 'google', 'edge'],
      category: 'general',
      downloadUrl: 'ollama://library/gemma:2b',
      license: 'Gemma Terms of Use',
      homepage: 'https://ai.google.dev/gemma',
      releaseDate: '2024-02-21',
      lastUpdated: '2024-02-21',
      isRecommended: false,
    });

    // Initialize categories
    this.initializeCategories();
  }

  private registerModel(metadata: ModelMetadata): void {
    this.models.set(metadata.id, metadata);
  }

  private initializeCategories(): void {
    this.categories.set('general', {
      id: 'general',
      name: 'General Purpose',
      description: 'Versatile models suitable for a wide range of tasks including summarization, Q&A, and text generation',
      models: ['llama-3.2-1b', 'llama-3.2-3b', 'gemma-2b'],
    });

    this.categories.set('reasoning', {
      id: 'reasoning',
      name: 'Reasoning & Analysis',
      description: 'Models with strong reasoning capabilities, ideal for complex analysis and problem-solving',
      models: ['llama-3.1-8b', 'phi-3-mini'],
    });

    this.categories.set('coding', {
      id: 'coding',
      name: 'Code & Technical',
      description: 'Models optimized for code generation, analysis, and technical content',
      models: ['mistral-7b', 'llama-3.1-8b'],
    });
  }

  // Public API methods

  /**
   * Get all registered models
   */
  getAllModels(): ModelMetadata[] {
    return Array.from(this.models.values());
  }

  /**
   * Get model by ID
   */
  getModel(id: string): ModelMetadata | undefined {
    return this.models.get(id);
  }

  /**
   * Get models by category
   */
  getModelsByCategory(category: string): ModelMetadata[] {
    return this.getAllModels().filter(m => m.category === category);
  }

  /**
   * Get recommended models
   */
  getRecommendedModels(): ModelMetadata[] {
    return this.getAllModels().filter(m => m.isRecommended);
  }

  /**
   * Get models by tag
   */
  getModelsByTag(tag: string): ModelMetadata[] {
    return this.getAllModels().filter(m => m.tags.includes(tag));
  }

  /**
   * Get all categories
   */
  getCategories(): ModelCategory[] {
    return Array.from(this.categories.values());
  }

  /**
   * Get category by ID
   */
  getCategory(id: string): ModelCategory | undefined {
    return this.categories.get(id);
  }

  /**
   * Search models by name or description
   */
  searchModels(query: string): ModelMetadata[] {
    const lowerQuery = query.toLowerCase();
    return this.getAllModels().filter(m => 
      m.name.toLowerCase().includes(lowerQuery) ||
      m.displayName.toLowerCase().includes(lowerQuery) ||
      m.capabilities.some(c => c.toLowerCase().includes(lowerQuery)) ||
      m.useCases.some(u => u.toLowerCase().includes(lowerQuery))
    );
  }

  /**
   * Get models suitable for specific hardware
   */
  getModelsForHardware(availableRAM: number, availableVRAM?: number): ModelMetadata[] {
    return this.getAllModels().filter(m => {
      const minRAM = parseInt(m.requirements.minRAM);
      const hasEnoughRAM = availableRAM >= minRAM;
      
      if (availableVRAM && m.requirements.minVRAM) {
        const minVRAM = parseInt(m.requirements.minVRAM);
        return hasEnoughRAM && availableVRAM >= minVRAM;
      }
      
      return hasEnoughRAM;
    });
  }

  /**
   * Get estimated download size for a model with specific quantization
   */
  getDownloadSize(modelId: string, quantization: keyof ModelMetadata['size']): string | undefined {
    const model = this.getModel(modelId);
    return model?.size[quantization];
  }
}

// Singleton instance
export const modelRegistry = new ModelRegistryService();
