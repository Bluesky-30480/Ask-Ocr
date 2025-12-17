/**
 * Universal AI Service
 * Unified interface for all AI providers with intelligent routing and fallback
 */

import type { AIRequest, AIResponse } from '@shared/types/ai.types';
import type { ApplicationContext } from '../context/active-window-context.service';
import type { EnhancedTemplateId } from '../context/context-aware-routing.service';
import { contextAwareRouting } from '../context/context-aware-routing.service';
import { priorityStrategy } from './priority-strategy.service';
import { enhancedPromptService } from './enhanced-prompt.service';
import { OpenAIClient } from './openai-client.service';
import { ollamaManager } from './ollama-manager.service';

export interface UniversalAIRequest {
  query: string;
  context?: ApplicationContext;
  ocrText?: string;
  conversationHistory?: Array<{ role: string; content: string }>;
  
  // Optional overrides
  forceProvider?: 'local' | 'custom' | 'openai' | 'perplexity';
  forceModel?: string;
  forceTemplate?: EnhancedTemplateId;
  temperature?: number;
  maxTokens?: number;
}

export interface UniversalAIResponse {
  content: string;
  provider: string;
  model: string;
  template: EnhancedTemplateId;
  confidence: number;
  routingReason?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  timestamp: number;
}

export interface StreamChunk {
  content: string;
  done: boolean;
}

export class UniversalAIService {
  private openaiClient?: OpenAIClient;
  private streamCallbacks: Map<string, (chunk: StreamChunk) => void> = new Map();

  /**
   * Initialize AI service with API keys
   */
  async initialize(config: { openaiApiKey?: string }): Promise<void> {
    if (config.openaiApiKey) {
      this.openaiClient = new OpenAIClient({
        apiKey: config.openaiApiKey,
      });
    }
  }

  /**
   * Send AI request with automatic provider selection and routing
   */
  async sendRequest(request: UniversalAIRequest): Promise<UniversalAIResponse> {
    // Step 1: Determine template based on context
    let template: EnhancedTemplateId;
    let routingReason: string;

    if (request.forceTemplate) {
      template = request.forceTemplate;
      routingReason = 'User override';
    } else if (request.context) {
      const routing = contextAwareRouting.route(request.context, request.query);
      template = routing.template;
      routingReason = routing.reason;
    } else {
      template = 'ai_assistant';
      routingReason = 'Default template (no context)';
    }

    // Step 2: Generate enhanced prompt
    const promptContext = {
      ocrText: request.ocrText || '',
      userQuery: request.query,
      additionalContext: request.context 
        ? this.formatContextForPrompt(request.context)
        : undefined,
    };

    const { systemPrompt, userPrompt } = enhancedPromptService.generatePrompt(
      template,
      promptContext
    );

    // Step 3: Select provider
    let provider: 'local' | 'custom' | 'openai' | 'perplexity';
    let model: string;

    if (request.forceProvider) {
      provider = request.forceProvider;
      // Use forced model or default for forced provider
      model = request.forceModel || 'default';
    } else {
      // Map template to task type
      const taskType = this.mapTemplateToTaskType(template);
      
      const selection = await priorityStrategy.selectProvider({
        taskType,
        textLength: request.query.length + (request.ocrText?.length || 0),
        requiresNetwork: template === 'ocr_qa', // Q&A may need web search
      });
      
      provider = selection.provider;
      model = selection.model || 'default';
    }

    // Step 4: Send request to selected provider
    try {
      const aiRequest: AIRequest = {
        prompt: userPrompt,
        systemPrompt,
        temperature: request.temperature,
        maxTokens: request.maxTokens,
        model,
      };

      const response = await this.sendToProvider(provider, aiRequest);

      return {
        content: response.content,
        provider: response.provider,
        model: response.model,
        template,
        confidence: response.confidence || 0.8,
        routingReason,
        usage: response.usage,
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error(`Provider ${provider} failed:`, error);
      
      // Try fallback providers
      const fallback = await this.tryFallbackProviders(provider, {
        systemPrompt,
        prompt: userPrompt,
        temperature: request.temperature,
        maxTokens: request.maxTokens,
      });

      if (fallback) {
        return {
          content: fallback.content,
          provider: fallback.provider,
          model: fallback.model,
          template,
          confidence: (fallback.confidence || 0.8) * 0.9, // Reduce confidence for fallback
          routingReason: `${routingReason} (fallback from ${provider})`,
          usage: fallback.usage,
          timestamp: Date.now(),
        };
      }

      throw new Error(`All AI providers failed: ${(error as Error).message}`);
    }
  }

  /**
   * Send streaming request
   */
  async sendStreamingRequest(
    request: UniversalAIRequest,
    onChunk: (chunk: StreamChunk) => void
  ): Promise<UniversalAIResponse> {
    const requestId = `stream-${Date.now()}`;
    this.streamCallbacks.set(requestId, onChunk);

    try {
      // For now, fallback to non-streaming
      // TODO: Implement actual streaming for supported providers
      const response = await this.sendRequest(request);
      
      // Simulate streaming by chunking the response
      const words = response.content.split(' ');
      for (let i = 0; i < words.length; i++) {
        const chunk = words[i] + (i < words.length - 1 ? ' ' : '');
        onChunk({ content: chunk, done: false });
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      onChunk({ content: '', done: true });
      
      return response;
    } finally {
      this.streamCallbacks.delete(requestId);
    }
  }

  /**
   * Send request to specific provider
   */
  private async sendToProvider(
    provider: 'local' | 'custom' | 'openai' | 'perplexity',
    request: AIRequest
  ): Promise<AIResponse> {
    switch (provider) {
      case 'local':
      case 'custom':
        return await this.sendToOllama(request);
      
      case 'openai':
        if (!this.openaiClient) {
          throw new Error('OpenAI client not initialized');
        }
        return await this.openaiClient.sendRequest(request);
      
      case 'perplexity':
        // TODO: Implement Perplexity client
        throw new Error('Perplexity provider not implemented yet');
      
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  }

  /**
   * Send request to Ollama
   */
  private async sendToOllama(request: AIRequest): Promise<AIResponse> {
    // Check if Ollama is running
    const isRunning = await ollamaManager.isOllamaRunning();
    if (!isRunning) {
      throw new Error('Ollama is not running');
    }

    // Build messages
    const messages: Array<{ role: string; content: string }> = [];
    
    if (request.systemPrompt) {
      messages.push({ role: 'system', content: request.systemPrompt });
    }
    
    if (request.context) {
      messages.push({ role: 'system', content: `Context: ${request.context}` });
    }
    
    messages.push({ role: 'user', content: request.prompt });

    try {
      const response = await fetch('http://localhost:11434/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: request.model || 'llama2',
          messages,
          stream: false,
          options: {
            temperature: request.temperature ?? 0.7,
            num_predict: request.maxTokens ?? 1000,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        provider: 'local',
        model: request.model || 'llama2',
        content: data.message?.content || '',
        confidence: 0.85,
        usage: {
          promptTokens: data.prompt_eval_count || 0,
          completionTokens: data.eval_count || 0,
          totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0),
        },
        timestamp: Date.now(),
      };
    } catch (error) {
      throw new Error(`Ollama request failed: ${(error as Error).message}`);
    }
  }

  /**
   * Try fallback providers
   */
  private async tryFallbackProviders(
    failedProvider: string,
    request: AIRequest
  ): Promise<AIResponse | null> {
    const providers: Array<'local' | 'custom' | 'openai' | 'perplexity'> = [
      'local',
      'openai',
      'custom',
      'perplexity',
    ];

    for (const provider of providers) {
      if (provider === failedProvider) continue;

      try {
        console.log(`Trying fallback provider: ${provider}`);
        return await this.sendToProvider(provider, request);
      } catch (error) {
        console.warn(`Fallback provider ${provider} failed:`, error);
        continue;
      }
    }

    return null;
  }

  /**
   * Format context for prompt
   */
  private formatContextForPrompt(context: ApplicationContext): string {
    let description = `You are assisting the user in ${context.name}`;

    switch (context.type) {
      case 'browser': {
        const browser = context.context as any;
        if (browser.domain) {
          description += ` while browsing ${browser.domain}`;
        }
        break;
      }
      case 'code-editor': {
        const editor = context.context as any;
        if (editor.fileName) {
          description += ` while editing ${editor.fileName}`;
        }
        if (editor.language) {
          description += ` (${editor.language})`;
        }
        break;
      }
      case 'office-word':
      case 'office-excel':
      case 'office-powerpoint': {
        const office = context.context as any;
        if (office.documentName) {
          description += ` while working on ${office.documentName}`;
        }
        break;
      }
    }

    if (context.selectedText) {
      description += `

Selected text: "${context.selectedText.substring(0, 200)}${
        context.selectedText.length > 200 ? '...' : ''
      }"`;
    }

    return description;
  }

  /**
   * Map template to task type for priority strategy
   */
  private mapTemplateToTaskType(
    template: EnhancedTemplateId
  ): 'summarize' | 'research' | 'question' | 'translate' | 'analyze' {
    switch (template) {
      case 'ocr_summarize':
        return 'summarize';
      case 'ocr_qa':
      case 'ai_assistant':
        return 'question';
      case 'ocr_technical':
      case 'ocr_academic':
      case 'ocr_business':
      case 'ocr_math':
        return 'analyze';
      default:
        return 'question';
    }
  }

  /**
   * Get provider status
   */
  async getProviderStatus() {
    const ollamaRunning = await ollamaManager.isOllamaRunning();
    const openaiAvailable = !!this.openaiClient;

    return {
      local: ollamaRunning,
      openai: openaiAvailable,
      custom: false, // TODO: Check custom models
      perplexity: false, // TODO: Implement Perplexity
    };
  }

  /**
   * Test connection to all providers
   */
  async testConnections() {
    const results: Record<string, boolean> = {};

    // Test Ollama
    try {
      results.local = await ollamaManager.isOllamaRunning();
    } catch {
      results.local = false;
    }

    // Test OpenAI
    if (this.openaiClient) {
      try {
        results.openai = await this.openaiClient.testConnection();
      } catch {
        results.openai = false;
      }
    } else {
      results.openai = false;
    }

    return results;
  }

  /**
   * Simple chat interface for Quick Chat component
   * Simplified wrapper around sendRequest() for basic chat interactions
   */
  async chat(
    message: string,
    provider: 'local' | 'openai' | 'perplexity' = 'local',
    model?: string
  ): Promise<{ text: string; provider: string; model: string }> {
    try {
      const response = await this.sendRequest({
        query: message,
        forceProvider: provider,
        forceModel: model,
        forceTemplate: 'ai_assistant',
      });

      return {
        text: response.content,
        provider: response.provider,
        model: response.model,
      };
    } catch (error) {
      console.error('Chat error:', error);
      throw new Error(
        error instanceof Error ? error.message : 'Failed to get chat response'
      );
    }
  }
}

// Singleton instance
export const universalAI = new UniversalAIService();
