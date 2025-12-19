/**
 * xAI Grok API Client
 * Handles communication with Grok API
 */

import type { AIRequest, AIResponse } from '@shared/types/ai.types';

export interface GrokConfig {
  apiKey: string;
  model?: string;
}

export class GrokClient {
  private config: GrokConfig;
  private baseUrl = 'https://api.x.ai/v1';

  constructor(config: GrokConfig) {
    this.config = config;
  }

  async sendRequest(request: AIRequest): Promise<AIResponse> {
    const model = request.model || this.config.model || 'grok-beta';
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

    // Enable web search if requested
    if (request.enableWebSearch) {
      payload.tools = [{
        type: 'web_search'
      }];
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
      throw new Error(`Grok API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const message = data.choices?.[0]?.message;

    // Extract sources if web search was used
    const sources = message?.tool_calls?.filter((t: any) => t.type === 'web_search')
      .flatMap((t: any) => t.results || []) || [];

    return {
      provider: 'grok',
      model,
      content: message?.content || '',
      sources: sources.map((s: any) => ({
        title: s.title,
        url: s.url,
        snippet: s.snippet
      })),
      usage: {
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0,
      },
      timestamp: Date.now(),
    };
  }
}
