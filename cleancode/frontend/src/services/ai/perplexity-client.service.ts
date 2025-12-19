/**
 * Perplexity API Client
 * Handles web search with AI-powered answers and source citations
 */

import type { AIRequest, AIResponse, AISource } from '@shared/types/ai.types';

export interface PerplexityConfig {
  apiKey: string;
  baseUrl?: string;
  model?: string;
}

export interface PerplexityMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface PerplexityChatRequest {
  model: string;
  messages: PerplexityMessage[];
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  return_citations?: boolean;
  return_images?: boolean;
  search_domain_filter?: string[];
  search_recency_filter?: string;
}

export interface PerplexityCitation {
  number: number;
  url: string;
  text: string;
}

export interface PerplexityChatResponse {
  id: string;
  model: string;
  created: number;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  citations?: string[];
  object: string;
  choices: Array<{
    index: number;
    finish_reason: string;
    message: {
      role: string;
      content: string;
    };
    delta?: {
      role?: string;
      content?: string;
    };
  }>;
}

export class PerplexityClient {
  private config: PerplexityConfig;
  private baseUrl: string;
  private requestCount: number = 0;
  private lastRequestTime: number = 0;
  private rateLimitDelay: number = 1500; // 1.5 seconds between requests

  constructor(config: PerplexityConfig) {
    this.config = config;
    this.baseUrl = config.baseUrl || 'https://api.perplexity.ai';
  }

  /**
   * Update API configuration
   */
  updateConfig(config: Partial<PerplexityConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Send request to Perplexity (implementation of AIProvider interface)
   */
  async sendRequest(request: AIRequest): Promise<AIResponse> {
    // Rate limiting
    await this.enforceRateLimit();

    const messages: PerplexityMessage[] = [];

    // Add system prompt if provided (for context)
    if (request.systemPrompt) {
      messages.push({
        role: 'system',
        content: request.systemPrompt,
      });
    }

    // Build user message with context
    let userContent = request.prompt;
    if (request.context) {
      userContent = `Based on this context:

${request.context}

${request.prompt}`;
    }

    messages.push({
      role: 'user',
      content: userContent,
    });

    const model = request.model || this.config.model || 'llama-3.1-sonar-small-128k-online';

    const requestBody: PerplexityChatRequest = {
      model,
      messages,
      temperature: request.temperature ?? 0.2,
      max_tokens: request.maxTokens ?? 1000,
      return_citations: true,
      return_images: false,
    };

    try {
      const response = await this.chatCompletion(requestBody);

      // Parse citations from response
      const sources = this.extractSources(response);

      return {
        provider: 'perplexity',
        model: response.model,
        content: response.choices[0]?.message?.content || '',
        confidence: 0.85, // Perplexity with sources has high confidence
        usage: {
          promptTokens: response.usage.prompt_tokens,
          completionTokens: response.usage.completion_tokens,
          totalTokens: response.usage.total_tokens,
        },
        sources,
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error('Perplexity API error:', error);
      throw new Error(`Perplexity request failed: ${(error as Error).message}`);
    }
  }

  /**
   * Chat completion with web search
   */
  private async chatCompletion(
    request: PerplexityChatRequest
  ): Promise<PerplexityChatResponse> {
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.config.apiKey}`,
    };

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Perplexity API error: ${response.status} ${response.statusText} - ${
          errorData.error?.message || 'Unknown error'
        }`
      );
    }

    return response.json();
  }

  /**
   * Extract sources from response
   */
  private extractSources(response: PerplexityChatResponse): AISource[] {
    if (!response.citations || response.citations.length === 0) {
      return [];
    }

    return response.citations.map((url, index) => ({
      title: this.extractTitle(url),
      url,
      relevance: 1 - index * 0.1, // Decrease relevance with position
    }));
  }

  /**
   * Extract title from URL
   */
  private extractTitle(url: string): string {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.replace('www.', '');
      const pathParts = urlObj.pathname.split('/').filter((p) => p);
      
      if (pathParts.length > 0) {
        const lastPart = pathParts[pathParts.length - 1];
        return `${hostname} - ${lastPart.replace(/-|_/g, ' ')}`;
      }
      
      return hostname;
    } catch {
      return url;
    }
  }

  /**
   * Enforce rate limiting between requests
   */
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.rateLimitDelay) {
      const delay = this.rateLimitDelay - timeSinceLastRequest;
      console.log(`Perplexity rate limiting: waiting ${delay}ms`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    this.lastRequestTime = Date.now();
    this.requestCount++;
  }

  /**
   * Set rate limit delay (in milliseconds)
   */
  setRateLimitDelay(delay: number): void {
    this.rateLimitDelay = delay;
  }

  /**
   * Get request statistics
   */
  getStats() {
    return {
      requestCount: this.requestCount,
      lastRequestTime: this.lastRequestTime,
      rateLimitDelay: this.rateLimitDelay,
    };
  }

  /**
   * Test API key validity
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.sendRequest({
        prompt: 'What is 2+2?',
        maxTokens: 50,
      });
      return response.content.length > 0;
    } catch (error) {
      console.error('Perplexity connection test failed:', error);
      return false;
    }
  }
}
