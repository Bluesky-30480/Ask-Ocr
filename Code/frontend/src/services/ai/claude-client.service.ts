/**
 * Anthropic Claude API Client
 * Handles communication with Claude API
 */

import type { AIRequest, AIResponse } from '@shared/types/ai.types';

export interface ClaudeConfig {
  apiKey: string;
  model?: string;
}

export class ClaudeClient {
  private config: ClaudeConfig;
  private baseUrl = 'https://api.anthropic.com/v1';

  constructor(config: ClaudeConfig) {
    this.config = config;
  }

  async sendRequest(request: AIRequest): Promise<AIResponse> {
    const model = request.model || this.config.model || 'claude-3-5-sonnet-20241022';
    const url = `${this.baseUrl}/messages`;

    const content: any[] = [];

    // Add text
    content.push({
      type: 'text',
      text: request.prompt
    });

    // Add image attachments
    if (request.attachments) {
      for (const attachment of request.attachments) {
        if (attachment.type === 'image') {
          content.push({
            type: 'image',
            source: {
              type: 'base64',
              media_type: attachment.mimeType,
              data: attachment.data
            }
          });
        } else if (attachment.type === 'document') {
          content.push({
            type: 'document',
            source: {
              type: 'base64',
              media_type: attachment.mimeType,
              data: attachment.data
            }
          });
        }
      }
    }

    const payload: any = {
      model,
      max_tokens: request.maxTokens || 4096,
      temperature: request.temperature || 0.7,
      messages: [{
        role: 'user',
        content
      }]
    };

    // Add system prompt if provided
    if (request.systemPrompt) {
      payload.system = request.systemPrompt;
    }

    // Enable extended thinking for Claude 3.5 Sonnet
    if (request.enableDeepThinking && model.includes('sonnet')) {
      payload.thinking = {
        type: 'enabled',
        budget_tokens: request.thinkingBudget || 10000
      };
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Claude API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const textContent = data.content.find((c: any) => c.type === 'text');
    const thinkingContent = data.content.find((c: any) => c.type === 'thinking');

    return {
      provider: 'claude',
      model,
      content: textContent?.text || '',
      thinkingProcess: thinkingContent?.thinking || undefined,
      usage: {
        promptTokens: data.usage?.input_tokens || 0,
        completionTokens: data.usage?.output_tokens || 0,
        totalTokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
      },
      timestamp: Date.now(),
    };
  }
}
