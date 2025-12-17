/**
 * AI Provider Priority Strategy Service
 * Manages intelligent model selection with local-first approach and remote fallback
 */

import type { AIProvider } from '@shared/types/ai.types';
import { ollamaManager } from './ollama-manager.service';
import { modelRegistry } from './model-registry.service';
import { customModelService } from './custom-model.service';

export interface ProviderPriority {
  provider: AIProvider;
  priority: number; // 1-10, higher = more preferred
  enabled: boolean;
  maxTokens?: number;
  timeoutMs?: number;
  conditions?: {
    minConfidence?: number; // Only use if OCR confidence >= this
    maxTextLength?: number; // Only use if text length <= this
    requiresNetwork?: boolean; // Skip if offline
    requiresLocal?: boolean; // Skip if in local-only mode
  };
}

export interface StrategySettings {
  // Priority order
  priorities: ProviderPriority[];
  
  // Fallback behavior
  enableFallback: boolean;
  maxFallbackAttempts: number;
  fallbackDelayMs: number;
  
  // Parallel processing
  enableParallelRequests: boolean;
  maxParallelProviders: number;
  parallelTimeoutMs: number;
  
  // Local-first preferences
  preferLocal: boolean;
  localOnlyMode: boolean;
  localTimeoutMultiplier: number; // Give local models more time
  
  // Quality thresholds
  minAcceptableConfidence: number;
  minOCRConfidenceForRemote: number; // Don't use expensive APIs for low-quality OCR
  
  // Network awareness
  autoDetectNetwork: boolean;
  offlineGracePeriodMs: number;
  
  // Rate limiting
  respectRateLimits: boolean;
  backoffMultiplier: number;
}

export interface ProviderStatus {
  provider: AIProvider;
  isAvailable: boolean;
  isLocal: boolean;
  responseTime?: number; // Last response time in ms
  successRate: number; // 0-1
  lastError?: string;
  lastUsed?: number; // Timestamp
  rateLimit?: {
    remaining: number;
    resetAt: number;
  };
}

export interface SelectionResult {
  provider: AIProvider;
  model: string;
  reason: string;
  fallbackChain?: AIProvider[];
  isLocal: boolean;
  estimatedLatency?: number;
}

export class PriorityStrategyService {
  private settings: StrategySettings;
  private providerStatus = new Map<AIProvider, ProviderStatus>();
  private isOnline = true;
  private networkCheckInterval?: number;

  constructor() {
    this.settings = this.getDefaultSettings();
    this.initializeProviderStatus();
    this.startNetworkMonitoring();
  }

  /**
   * Get default strategy settings
   */
  private getDefaultSettings(): StrategySettings {
    return {
      priorities: [
        {
          provider: 'local',
          priority: 10,
          enabled: true,
          timeoutMs: 30000,
          conditions: {
            requiresLocal: false,
            requiresNetwork: false,
          },
        },
        {
          provider: 'openai',
          priority: 7,
          enabled: true,
          timeoutMs: 15000,
          conditions: {
            minConfidence: 0.7,
            requiresNetwork: true,
          },
        },
        {
          provider: 'perplexity',
          priority: 6,
          enabled: true,
          timeoutMs: 20000,
          conditions: {
            requiresNetwork: true,
          },
        },
      ],
      enableFallback: true,
      maxFallbackAttempts: 3,
      fallbackDelayMs: 1000,
      enableParallelRequests: false,
      maxParallelProviders: 2,
      parallelTimeoutMs: 25000,
      preferLocal: true,
      localOnlyMode: false,
      localTimeoutMultiplier: 1.5,
      minAcceptableConfidence: 0.5,
      minOCRConfidenceForRemote: 0.6,
      autoDetectNetwork: true,
      offlineGracePeriodMs: 5000,
      respectRateLimits: true,
      backoffMultiplier: 2,
    };
  }

  /**
   * Initialize provider status tracking
   */
  private initializeProviderStatus(): void {
    const providers: AIProvider[] = ['local', 'openai', 'perplexity', 'custom'];
    
    providers.forEach(provider => {
      this.providerStatus.set(provider, {
        provider,
        isAvailable: false,
        isLocal: provider === 'local' || provider === 'custom',
        successRate: 1.0,
      });
    });
  }

  /**
   * Select optimal provider based on strategy
   */
  async selectProvider(context: {
    taskType: 'summarize' | 'research' | 'question' | 'translate' | 'analyze';
    ocrConfidence?: number;
    textLength?: number;
    requiresNetwork?: boolean;
  }): Promise<SelectionResult> {
    // Check local-only mode
    if (this.settings.localOnlyMode) {
      return this.selectLocalProvider(context);
    }

    // Filter applicable providers
    const applicableProviders = this.getApplicableProviders(context);

    if (applicableProviders.length === 0) {
      throw new Error('No providers available for this task');
    }

    // Check if we should use parallel requests
    if (this.settings.enableParallelRequests && applicableProviders.length > 1) {
      return this.selectForParallelProcessing(applicableProviders, context);
    }

    // Single provider selection with fallback chain
    const selectedProvider = applicableProviders[0];
    const fallbackChain = applicableProviders.slice(1).map(p => p.provider);

    return {
      provider: selectedProvider.provider,
      model: await this.selectModelForProvider(selectedProvider.provider),
      reason: this.getSelectionReason(selectedProvider, context),
      fallbackChain,
      isLocal: this.isLocalProvider(selectedProvider.provider),
      estimatedLatency: this.estimateLatency(selectedProvider.provider),
    };
  }

  /**
   * Get applicable providers based on context and settings
   */
  private getApplicableProviders(context: {
    taskType: string;
    ocrConfidence?: number;
    textLength?: number;
    requiresNetwork?: boolean;
  }): ProviderPriority[] {
    return this.settings.priorities
      .filter(p => p.enabled)
      .filter(p => this.checkProviderConditions(p, context))
      .filter(p => this.isProviderAvailable(p.provider))
      .sort((a, b) => {
        // Sort by priority (higher first)
        if (b.priority !== a.priority) {
          return b.priority - a.priority;
        }
        
        // If same priority, prefer local
        if (this.settings.preferLocal) {
          const aIsLocal = this.isLocalProvider(a.provider);
          const bIsLocal = this.isLocalProvider(b.provider);
          if (aIsLocal !== bIsLocal) {
            return aIsLocal ? -1 : 1;
          }
        }
        
        // Otherwise, prefer higher success rate
        const aStatus = this.providerStatus.get(a.provider);
        const bStatus = this.providerStatus.get(b.provider);
        return (bStatus?.successRate || 0) - (aStatus?.successRate || 0);
      });
  }

  /**
   * Check if provider meets conditions for this context
   */
  private checkProviderConditions(
    provider: ProviderPriority,
    context: {
      ocrConfidence?: number;
      textLength?: number;
      requiresNetwork?: boolean;
    }
  ): boolean {
    const conditions = provider.conditions;
    if (!conditions) return true;

    // Check minimum confidence
    if (conditions.minConfidence && context.ocrConfidence !== undefined) {
      if (context.ocrConfidence < conditions.minConfidence) {
        return false;
      }
    }

    // Check max text length
    if (conditions.maxTextLength && context.textLength !== undefined) {
      if (context.textLength > conditions.maxTextLength) {
        return false;
      }
    }

    // Check network requirements
    if (conditions.requiresNetwork && !this.isOnline) {
      return false;
    }

    // Check local-only mode
    if (this.settings.localOnlyMode && conditions.requiresNetwork) {
      return false;
    }

    return true;
  }

  /**
   * Check if provider is currently available
   */
  private isProviderAvailable(provider: AIProvider): boolean {
    const status = this.providerStatus.get(provider);
    if (!status) return false;

    // Check if provider is marked as available
    if (!status.isAvailable) return false;

    // Check rate limits
    if (this.settings.respectRateLimits && status.rateLimit) {
      if (status.rateLimit.remaining <= 0 && Date.now() < status.rateLimit.resetAt) {
        return false;
      }
    }

    return true;
  }

  /**
   * Select local provider (Ollama or custom models)
   */
  private async selectLocalProvider(_context: any): Promise<SelectionResult> {
    // Check if Ollama is running
    const ollamaStatus = await ollamaManager.getStatus();
    
    if (!ollamaStatus.isInstalled) {
      throw new Error('Local-only mode enabled but no local models available');
    }

    const model = await this.selectModelForProvider('local');

    return {
      provider: 'local',
      model,
      reason: 'Local-only mode enabled',
      isLocal: true,
      estimatedLatency: 2000,
    };
  }

  /**
   * Select provider for parallel processing
   */
  private selectForParallelProcessing(
    providers: ProviderPriority[],
    _context: any
  ): SelectionResult {
    const selectedProviders = providers
      .slice(0, this.settings.maxParallelProviders)
      .map(p => p.provider);

    return {
      provider: selectedProviders[0], // Primary provider
      model: '',
      reason: 'Parallel processing enabled',
      fallbackChain: selectedProviders.slice(1),
      isLocal: false,
    };
  }

  /**
   * Select model for a specific provider
   */
  private async selectModelForProvider(provider: AIProvider): Promise<string> {
    switch (provider) {
      case 'local':
        // Get available Ollama models
        const ollamaModels = await ollamaManager.listModels();
        if (ollamaModels.length > 0) {
          // Prefer recommended models
          const recommended = ollamaModels.find(m => m.name.includes('llama3.2:3b'));
          return recommended?.name || ollamaModels[0].name;
        }
        
        // Check custom models
        const customModels = customModelService.getInstalledCustomModels();
        if (customModels.length > 0) {
          return customModels[0].name;
        }
        
        // Suggest a model from registry
        const registryModels = modelRegistry.getRecommendedModels();
        return registryModels[0]?.name || 'llama3.2:3b';

      case 'custom':
        // Use custom models
        const installed = customModelService.getInstalledCustomModels();
        return installed[0]?.name || 'custom-model';

      case 'openai':
        return 'gpt-3.5-turbo';

      case 'perplexity':
        return 'sonar-medium-online';

      default:
        return 'default';
    }
  }

  /**
   * Get selection reason description
   */
  private getSelectionReason(provider: ProviderPriority, context: any): string {
    const reasons: string[] = [];

    if (this.isLocalProvider(provider.provider)) {
      reasons.push('Local model (privacy-first)');
    }

    if (provider.priority >= 9) {
      reasons.push('Highest priority');
    }

    if (context.ocrConfidence && context.ocrConfidence < 0.7) {
      reasons.push('OCR quality acceptable');
    }

    if (!this.isOnline && this.isLocalProvider(provider.provider)) {
      reasons.push('Offline mode');
    }

    return reasons.join(', ') || 'Best available option';
  }

  /**
   * Check if provider is local
   */
  private isLocalProvider(provider: AIProvider): boolean {
    return provider === 'local' || provider === 'custom';
  }

  /**
   * Estimate latency for provider
   */
  private estimateLatency(provider: AIProvider): number {
    const status = this.providerStatus.get(provider);
    
    if (status?.responseTime) {
      return status.responseTime;
    }

    // Default estimates
    switch (provider) {
      case 'local':
      case 'custom':
        return 2000; // 2s for local
      case 'openai':
        return 1500; // 1.5s for OpenAI
      case 'perplexity':
        return 3000; // 3s for web search
      default:
        return 2000;
    }
  }

  /**
   * Update provider status
   */
  updateProviderStatus(
    provider: AIProvider,
    updates: Partial<ProviderStatus>
  ): void {
    const current = this.providerStatus.get(provider) || {
      provider,
      isAvailable: false,
      isLocal: provider === 'local' || provider === 'custom',
      successRate: 1.0,
    };

    this.providerStatus.set(provider, { ...current, ...updates });
  }

  /**
   * Record successful request
   */
  recordSuccess(provider: AIProvider, responseTimeMs: number): void {
    const status = this.providerStatus.get(provider);
    if (status) {
      status.responseTime = responseTimeMs;
      status.successRate = Math.min(1.0, status.successRate * 0.9 + 0.1);
      status.lastUsed = Date.now();
      status.lastError = undefined;
    }
  }

  /**
   * Record failed request
   */
  recordFailure(provider: AIProvider, error: string): void {
    const status = this.providerStatus.get(provider);
    if (status) {
      status.successRate = Math.max(0.0, status.successRate * 0.9);
      status.lastError = error;
      
      // Temporarily mark as unavailable if multiple failures
      if (status.successRate < 0.3) {
        status.isAvailable = false;
        
        // Re-enable after grace period
        setTimeout(() => {
          status.isAvailable = true;
          status.successRate = 0.5;
        }, this.settings.offlineGracePeriodMs);
      }
    }
  }

  /**
   * Update settings
   */
  updateSettings(updates: Partial<StrategySettings>): void {
    this.settings = { ...this.settings, ...updates };
  }

  /**
   * Get current settings
   */
  getSettings(): StrategySettings {
    return { ...this.settings };
  }

  /**
   * Toggle local-only mode
   */
  setLocalOnlyMode(enabled: boolean): void {
    this.settings.localOnlyMode = enabled;
  }

  /**
   * Check if in local-only mode
   */
  isLocalOnlyMode(): boolean {
    return this.settings.localOnlyMode;
  }

  /**
   * Get network status
   */
  isNetworkAvailable(): boolean {
    return this.isOnline;
  }

  /**
   * Start network monitoring
   */
  private startNetworkMonitoring(): void {
    if (!this.settings.autoDetectNetwork) return;

    // Initial check
    this.checkNetworkStatus();

    // Periodic checks
    this.networkCheckInterval = window.setInterval(() => {
      this.checkNetworkStatus();
    }, 30000); // Every 30 seconds
  }

  /**
   * Check network status
   */
  private async checkNetworkStatus(): Promise<void> {
    try {
      const wasOnline = this.isOnline;
      this.isOnline = navigator.onLine;

      // Try a quick ping to verify
      if (this.isOnline) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);

        try {
          await fetch('https://www.google.com/favicon.ico', {
            mode: 'no-cors',
            signal: controller.signal,
          });
          this.isOnline = true;
        } catch {
          this.isOnline = false;
        } finally {
          clearTimeout(timeout);
        }
      }

      // Update provider availability based on network status
      if (wasOnline !== this.isOnline) {
        this.updateProvidersOnNetworkChange();
      }
    } catch (error) {
      console.error('Network check failed:', error);
    }
  }

  /**
   * Update provider availability when network status changes
   */
  private updateProvidersOnNetworkChange(): void {
    this.providerStatus.forEach((status) => {
      if (!status.isLocal && !this.isOnline) {
        status.isAvailable = false;
      } else if (!status.isLocal && this.isOnline) {
        status.isAvailable = true;
      }
    });
  }

  /**
   * Stop network monitoring
   */
  destroy(): void {
    if (this.networkCheckInterval) {
      clearInterval(this.networkCheckInterval);
    }
  }

  /**
   * Get provider status
   */
  getProviderStatus(provider: AIProvider): ProviderStatus | undefined {
    return this.providerStatus.get(provider);
  }

  /**
   * Get all provider statuses
   */
  getAllProviderStatuses(): ProviderStatus[] {
    return Array.from(this.providerStatus.values());
  }
}

// Singleton instance
export const priorityStrategy = new PriorityStrategyService();
