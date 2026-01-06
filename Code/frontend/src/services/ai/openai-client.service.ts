/**
 * OpenAI API Client
 * Handles communication with OpenAI API for text completion and chat
 */

import type { AIRequest, AIResponse } from '@shared/types/ai.types';

export interface OpenAIConfig {
  apiKey: string;
  baseUrl?: string;
  model?: string;
  organization?: string;
}

export interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
}

export interface OpenAIChatCompletionRequest {
  model: string;
  messages: OpenAIMessage[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stream?: boolean;
}

export interface OpenAIChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class OpenAIClient {
  private config: OpenAIConfig;
  private baseUrl: string;
  private requestCount: number = 0;
  private lastRequestTime: number = 0;
  private rateLimitDelay: number = 1000; // 1 second between requests

  constructor(config: OpenAIConfig) {
    this.config = config;
    this.baseUrl = config.baseUrl || 'https://api.openai.com/v1';
  }

  /**
   * Update API configuration
   */
  updateConfig(config: Partial<OpenAIConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Send request to OpenAI (implementation of AIProvider interface)
   */
  async sendRequest(request: AIRequest): Promise<AIResponse> {
    // Rate limiting
    await this.enforceRateLimit();

    const messages: OpenAIMessage[] = [];

    // Add system prompt if provided
    if (request.systemPrompt) {
      messages.push({
        role: 'system',
        content: request.systemPrompt,
      });
    }

    // Add context if provided
    if (request.context) {
      messages.push({
        role: 'system',
        content: `Context: ${request.context}`,
      });
    }

    // Add user prompt
    let userContent: string | Array<any> = request.prompt;

    if (request.attachments && request.attachments.length > 0) {
      const hasImages = request.attachments.some(a => a.type === 'image');
      
      if (hasImages) {
        userContent = [{ type: 'text', text: request.prompt }];
        
        for (const attachment of request.attachments) {
          if (attachment.type === 'image') {
            userContent.push({
              type: 'image_url',
              image_url: {
                url: attachment.data.startsWith('data:') ? attachment.data : `data:${attachment.mimeType};base64,${attachment.data}`
              }
            });
          } else if (attachment.type === 'document') {
             (userContent[0] as any).text += `\n\n--- File: ${attachment.filename} ---\n${attachment.data}\n--- End File ---`;
          }
        }
      } else {
        for (const attachment of request.attachments) {
          if (attachment.type === 'document') {
            userContent += `\n\n--- File: ${attachment.filename} ---\n${attachment.data}\n--- End File ---`;
          }
        }
      }
    }

    messages.push({
      role: 'user',
      content: userContent,
    });

    const model = request.model || this.config.model || 'gpt-3.5-turbo';

    const requestBody: OpenAIChatCompletionRequest = {
      model,
      messages,
      temperature: request.temperature ?? 0.7,
      max_tokens: request.maxTokens ?? 1000,
      stream: request.streaming ?? false,
    };

    try {
      const response = await this.chatCompletion(requestBody);

      return {
        provider: 'openai',
        model: response.model,
        content: response.choices[0]?.message?.content || '',
        confidence: this.calculateConfidence(response),
        usage: {
          promptTokens: response.usage.prompt_tokens,
          completionTokens: response.usage.completion_tokens,
          totalTokens: response.usage.total_tokens,
        },
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error('OpenAI API error:', error);
      throw new Error(`OpenAI request failed: ${(error as Error).message}`);
    }
  }

  /**
   * Chat completion request
   */
  private async chatCompletion(
    request: OpenAIChatCompletionRequest
  ): Promise<OpenAIChatCompletionResponse> {
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.config.apiKey}`,
    };

    if (this.config.organization) {
      (headers as any)['OpenAI-Organization'] = this.config.organization;
    }

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `OpenAI API error: ${response.status} ${response.statusText} - ${
          errorData.error?.message || 'Unknown error'
        }`
      );
    }

    return response.json();
  }

  /**
   * Enforce rate limiting between requests
   */
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.rateLimitDelay) {
      const delay = this.rateLimitDelay - timeSinceLastRequest;
      console.log(`Rate limiting: waiting ${delay}ms`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    this.lastRequestTime = Date.now();
    this.requestCount++;
  }

  /**
   * Calculate confidence score from response
   */
  private calculateConfidence(response: OpenAIChatCompletionResponse): number {
    const choice = response.choices[0];
    if (!choice) return 0.5;

    // Higher confidence for complete responses
    if (choice.finish_reason === 'stop') {
      return 0.9;
    }

    // Lower confidence for length-limited responses
    if (choice.finish_reason === 'length') {
      return 0.7;
    }

    // Default confidence
    return 0.75;
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
        prompt: 'Test connection',
        maxTokens: 10,
      });
      return response.content.length > 0;
    } catch (error) {
      console.error('OpenAI connection test failed:', error);
      return false;
    }
  }
}
