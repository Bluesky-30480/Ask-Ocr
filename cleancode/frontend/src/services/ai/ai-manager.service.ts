/**
 * AI Integration Manager
 * Coordinates multiple AI providers and manages request routing
 */

import type {
  AIProvider,
  AIRequest,
  AIResponse,
  AIServiceStrategy,
  MergedAIResult,
} from '@shared/types/ai.types';

export class AIIntegrationManager {
  private providers: Map<AIProvider, any> = new Map();
  private strategy: AIServiceStrategy;

  constructor(strategy?: Partial<AIServiceStrategy>) {
    this.strategy = {
      preferLocal: true,
      fallbackToRemote: true,
      parallelRequests: false,
      maxParallelRequests: 2,
      timeout: 30000,
      retryAttempts: 2,
      ...strategy,
    };
  }

  /**
   * Register an AI provider
   */
  registerProvider(provider: AIProvider, client: any): void {
    this.providers.set(provider, client);
    console.log(`Registered AI provider: ${provider}`);
  }

  /**
   * Unregister an AI provider
   */
  unregisterProvider(provider: AIProvider): void {
    this.providers.delete(provider);
    console.log(`Unregistered AI provider: ${provider}`);
  }

  /**
   * Check if a provider is available
   */
  isProviderAvailable(provider: AIProvider): boolean {
    return this.providers.has(provider);
  }

  /**
   * Get available providers
   */
  getAvailableProviders(): AIProvider[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Send request to AI provider with fallback strategy and retry logic
   */
  async sendRequest(request: AIRequest, preferredProvider?: AIProvider): Promise<AIResponse> {
    const providers = this.selectProviders(preferredProvider);

    if (providers.length === 0) {
      throw new Error('No AI providers available');
    }

    let lastError: Error | null = null;
    const maxRetries = this.strategy.retryAttempts;

    // Try each provider in order
    for (const provider of providers) {
      let retryCount = 0;

      while (retryCount <= maxRetries) {
        try {
          console.log(
            `Attempting AI request with provider: ${provider}${retryCount > 0 ? ` (retry ${retryCount}/${maxRetries})` : ''}`
          );

          const response = await this.executeRequestWithRetry(provider, request, retryCount);
          
          console.log(`AI request succeeded with provider: ${provider}`);
          return response;
        } catch (error) {
          const errorMessage = (error as Error).message || 'Unknown error';
          
          // Check if error is retryable
          const isRetryable = this.isRetryableError(error as Error);
          
          if (isRetryable && retryCount < maxRetries) {
            console.warn(
              `AI request failed with ${provider} (attempt ${retryCount + 1}/${maxRetries + 1}): ${errorMessage}. Retrying...`
            );
            
            // Exponential backoff: wait 2^retryCount seconds
            const backoffMs = Math.pow(2, retryCount) * 1000;
            await new Promise((resolve) => setTimeout(resolve, backoffMs));
            
            retryCount++;
          } else {
            console.warn(
              `AI request failed with ${provider}: ${errorMessage}${isRetryable ? ' (max retries reached)' : ' (non-retryable error)'}`
            );
            lastError = error as Error;
            break; // Move to next provider
          }
        }
      }
    }

    throw new Error(`All AI providers failed. Last error: ${lastError?.message || 'Unknown'}`);
  }

  /**
   * Send parallel requests to multiple providers and merge results
   */
  async sendParallelRequests(
    request: AIRequest,
    providers?: AIProvider[]
  ): Promise<MergedAIResult> {
    const selectedProviders = providers || this.getAvailableProviders();
    const maxProviders = Math.min(
      selectedProviders.length,
      this.strategy.maxParallelRequests
    );
    const targetProviders = selectedProviders.slice(0, maxProviders);

    console.log(`Sending parallel requests to: ${targetProviders.join(', ')}`);

    // Execute requests in parallel
    const promises = targetProviders.map((provider) =>
      this.executeRequest(provider, request).catch((error) => {
        console.warn(`Provider ${provider} failed:`, error);
        return null;
      })
    );

    const results = await Promise.all(promises);
    const validResults = results.filter((r): r is AIResponse => r !== null);

    if (validResults.length === 0) {
      throw new Error('All parallel AI requests failed');
    }

    // Merge results
    return this.mergeResults(validResults);
  }

  /**
   * Execute request with retry support
   */
  private async executeRequestWithRetry(
    provider: AIProvider,
    request: AIRequest,
    retryCount: number
  ): Promise<AIResponse> {
    const client = this.providers.get(provider);
    if (!client) {
      throw new Error(`Provider ${provider} not registered`);
    }

    // Increase timeout for retries
    const baseTimeout = this.strategy.timeout;
    const timeout = baseTimeout * (1 + retryCount * 0.5); // 50% increase per retry
    
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Request timeout after ${timeout}ms`)), timeout)
    );

    try {
      const response = await Promise.race([client.sendRequest(request), timeoutPromise]);
      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Execute request on specific provider (legacy method)
   */
  private async executeRequest(
    provider: AIProvider,
    request: AIRequest
  ): Promise<AIResponse> {
    return this.executeRequestWithRetry(provider, request, 0);
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: Error): boolean {
    const errorMessage = error.message.toLowerCase();

    // Retryable errors: network issues, timeouts, rate limits, server errors
    const retryablePatterns = [
      'timeout',
      'network',
      'econnreset',
      'econnrefused',
      'enotfound',
      '429', // Rate limit
      '500', // Internal server error
      '502', // Bad gateway
      '503', // Service unavailable
      '504', // Gateway timeout
      'fetch failed',
      'failed to fetch',
    ];

    return retryablePatterns.some((pattern) => errorMessage.includes(pattern));
  }

  /**
   * Select providers based on strategy
   */
  private selectProviders(preferredProvider?: AIProvider): AIProvider[] {
    const available = this.getAvailableProviders();

    if (available.length === 0) {
      return [];
    }

    // If preferred provider is specified and available, try it first
    if (preferredProvider && this.isProviderAvailable(preferredProvider)) {
      return [
        preferredProvider,
        ...available.filter((p) => p !== preferredProvider),
      ];
    }

    // Apply strategy
    if (this.strategy.preferLocal) {
      const local = available.filter((p) => p === 'local');
      const remote = available.filter((p) => p !== 'local');

      if (this.strategy.fallbackToRemote) {
        return [...local, ...remote];
      }
      return local;
    }

    return available;
  }

  /**
   * Merge results from multiple providers
   */
  private mergeResults(results: AIResponse[]): MergedAIResult {
    if (results.length === 0) {
      throw new Error('No results to merge');
    }

    // Primary result is the first (usually highest confidence)
    const primary = results[0];
    const secondary = results.slice(1);

    // Combine content
    const combined = this.combineContent(results);

    // Calculate overall confidence
    const confidence = this.calculateAverageConfidence(results);

    // Collect all sources
    const sources = this.collectSources(results);

    return {
      primary,
      secondary,
      combined,
      confidence,
      sources,
      timestamp: Date.now(),
    };
  }

  /**
   * Combine content from multiple responses
   */
  private combineContent(results: AIResponse[]): string {
    if (results.length === 1) {
      return results[0].content;
    }

    // Simple combination strategy - can be enhanced
    const contents = results.map((r) => {
      const label = r.provider.toUpperCase();
      return `### ${label} Response:
${r.content}`;
    });

    return contents.join('\n\n---\n\n');
  }

  /**
   * Calculate average confidence
   */
  private calculateAverageConfidence(results: AIResponse[]): number {
    const confidences = results
      .map((r) => r.confidence || 0.5)
      .filter((c) => c > 0);

    if (confidences.length === 0) return 0.5;

    return confidences.reduce((sum, c) => sum + c, 0) / confidences.length;
  }

  /**
   * Collect and deduplicate sources
   */
  private collectSources(results: AIResponse[]) {
    const allSources = results.flatMap((r) => r.sources || []);
    const uniqueSources = new Map();

    for (const source of allSources) {
      const key = source.url || source.title;
      if (!uniqueSources.has(key)) {
        uniqueSources.set(key, source);
      }
    }

    return Array.from(uniqueSources.values());
  }

  /**
   * Update strategy
   */
  updateStrategy(strategy: Partial<AIServiceStrategy>): void {
    this.strategy = { ...this.strategy, ...strategy };
    console.log('AI strategy updated:', this.strategy);
  }

  /**
   * Get current strategy
   */
  getStrategy(): AIServiceStrategy {
    return { ...this.strategy };
  }
}

// Export singleton instance
export const aiManager = new AIIntegrationManager();
