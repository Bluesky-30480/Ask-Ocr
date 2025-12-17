/**
 * AI Integration Types
 * Shared types for AI service integrations
 */

// AI Provider types
export type AIProvider = 'openai' | 'perplexity' | 'local' | 'custom';

// AI Model configuration
export interface AIModelConfig {
  provider: AIProvider;
  model: string;
  apiKey?: string;
  baseUrl?: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
}

// AI Request
export interface AIRequest {
  prompt: string;
  context?: string;
  systemPrompt?: string;
  model?: string;
  streaming?: boolean;
  maxTokens?: number;
  temperature?: number;
}

// AI Response
export interface AIResponse {
  provider: AIProvider;
  model: string;
  content: string;
  confidence?: number;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  sources?: AISource[];
  timestamp: number;
  error?: string;
}

// Source attribution
export interface AISource {
  title: string;
  url?: string;
  snippet?: string;
  relevance?: number;
}

// Merged AI Result
export interface MergedAIResult {
  primary: AIResponse;
  secondary?: AIResponse[];
  combined: string;
  confidence: number;
  sources: AISource[];
  timestamp: number;
}

// AI Service Strategy
export interface AIServiceStrategy {
  preferLocal: boolean;
  fallbackToRemote: boolean;
  parallelRequests: boolean;
  maxParallelRequests: number;
  timeout: number;
  retryAttempts: number;
}
