/**
 * Google Gemini API Client
 * Handles communication with Google Gemini API
 */

import type { AIRequest, AIResponse } from '@shared/types/ai.types';

export interface GeminiConfig {
  apiKey: string;
  model?: string;
}

export class GeminiClient {
  private config: GeminiConfig;
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta';

  constructor(config: GeminiConfig) {
    this.config = config;
  }

  async sendRequest(request: AIRequest): Promise<AIResponse> {
    const model = request.model || this.config.model || 'gemini-pro';
    const url = `${this.baseUrl}/models/${model}:generateContent?key=${this.config.apiKey}`;

    const parts: any[] = [];
    
    // Add text content
    if (request.systemPrompt) {
      parts.push({ text: request.systemPrompt + '\n\n' });
    }
    parts.push({ text: request.prompt });

    // Add attachments (images for Gemini)
    if (request.attachments) {
      for (const attachment of request.attachments) {
        if (attachment.type === 'image') {
          parts.push({
            inlineData: {
              mimeType: attachment.mimeType,
              data: attachment.data
            }
          });
        }
      }
    }

    const payload: any = {
      contents: [{
        parts
      }],
      generationConfig: {
        temperature: request.temperature || 0.7,
        maxOutputTokens: request.maxTokens || 2048,
      },
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' }
      ]
    };

    // Enable web search if requested (Gemini 1.5 Pro+)
    if (request.enableWebSearch && model.includes('1.5')) {
      payload['tools'] = [{ googleSearchRetrieval: {} }];
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Gemini API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // Extract sources if web search was used
    const sources = data.candidates?.[0]?.groundingMetadata?.webSearchQueries || [];

    return {
      provider: 'gemini',
      model,
      content,
      usage: {
        promptTokens: data.usageMetadata?.promptTokenCount || 0,
        completionTokens: data.usageMetadata?.candidatesTokenCount || 0,
        totalTokens: data.usageMetadata?.totalTokenCount || 0,
      },
      sources: sources.map((s: any) => ({ title: s, url: s })),
      timestamp: Date.now(),
    };
  }
}
