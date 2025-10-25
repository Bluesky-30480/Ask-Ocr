/**
 * AI Services Index
 * Central export point for all AI-related services
 */

export { AIIntegrationManager, aiManager } from './ai-manager.service';
export { OpenAIClient } from './openai-client.service';
export { PerplexityClient } from './perplexity-client.service';
export { PromptEngineeringService, promptService } from './prompt-engineering.service';
export { OllamaManagerService, ollamaManager } from './ollama-manager.service';

export type { PromptType, PromptTemplate, PromptContext } from './prompt-engineering.service';
export type { OpenAIConfig } from './openai-client.service';
export type { PerplexityConfig } from './perplexity-client.service';
export type { OllamaModel, ModelDownloadProgress, OllamaStatus } from './ollama-manager.service';

// AI types
export type {
  AIProvider,
  AIModelConfig,
  AIRequest,
  AIResponse,
  AISource,
  MergedAIResult,
  AIServiceStrategy,
} from '@shared/types/ai.types';
