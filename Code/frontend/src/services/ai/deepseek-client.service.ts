/**
 * DeepSeek API Client
 * Handles communication with DeepSeek API (including R1 reasoning model)
 */

import type { AIRequest, AIResponse } from '@shared/types/ai.types';

export interface DeepSeekConfig {
  apiKey: string;
  model?: string;
}

export class DeepSeekClient {
  private config: DeepSeekConfig;
  private baseUrl = 'https://api.deepseek.com/v1';

  constructor(config: DeepSeekConfig) {
    this.config = config;
  }

  async sendRequest(request: AIRequest): Promise<AIResponse> {
    const model = request.model || this.config.model || 'deepseek-chat';
    const url = `${this.baseUrl}/chat/completions`;

    const messages: any[] = [];

    if (request.systemPrompt) {
      messages.push({
        role: 'system',
        content: request.systemPrompt
      });
    }

    messages.push({
      role: 'user',
      content: request.prompt
    });

    const payload: any = {
      model,
      messages,
      temperature: request.temperature || 0.7,
      max_tokens: request.maxTokens || 4096,
    };

    // Enable deep thinking for R1 model
    if (request.enableDeepThinking && model.includes('reasoner')) {
      payload.reasoning_effort = 'high';
      payload.max_reasoning_tokens = request.thinkingBudget || 32000;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`DeepSeek API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const message = data.choices?.[0]?.message;

    return {
      provider: 'deepseek',
      model,
      content: message?.content || '',
      thinkingProcess: message?.reasoning_content || undefined,
      usage: {
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0,
        thinkingTokens: data.usage?.reasoning_tokens || 0,
      },
      timestamp: Date.now(),
    };
  }
}
