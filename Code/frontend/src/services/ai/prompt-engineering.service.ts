/**
 * Prompt Engineering System
 * Manages prompt templates for OCR text processing and AI interactions
 */

export type PromptType =
  | 'summarize'
  | 'research'
  | 'question'
  | 'translate'
  | 'extract'
  | 'analyze'
  | 'math'
  | 'custom';

export interface PromptTemplate {
  type: PromptType;
  name: string;
  systemPrompt: string;
  userPromptTemplate: string;
  description: string;
  variables: string[];
}

export interface PromptContext {
  ocrText: string;
  language?: string;
  confidence?: number;
  userQuery?: string;
  additionalContext?: string;
}

export class PromptEngineeringService {
  private templates: Map<PromptType, PromptTemplate> = new Map();

  constructor() {
    this.initializeDefaultTemplates();
  }

  /**
   * Initialize default prompt templates
   */
  private initializeDefaultTemplates(): void {
    // Summarize template
    this.templates.set('summarize', {
      type: 'summarize',
      name: 'Text Summarization',
      systemPrompt: `You are an expert text summarizer. Create clear, concise summaries that capture the main points and key information from the provided text. Focus on the most important details.`,
      userPromptTemplate: `Please provide a comprehensive summary of the following text:

{{ocrText}}`,
      description: 'Generate a concise summary of OCR text',
      variables: ['ocrText'],
    });

    // Research template
    this.templates.set('research', {
      type: 'research',
      name: 'Web Research',
      systemPrompt: `You are a research assistant with access to web search. Provide accurate, well-sourced information with citations. Focus on recent, reliable sources.`,
      userPromptTemplate: `Based on this text, research and provide detailed information:

{{ocrText}}

Additional query: {{userQuery}}`,
      description: 'Research topics from OCR text with web sources',
      variables: ['ocrText', 'userQuery'],
    });

    // Question answering template
    this.templates.set('question', {
      type: 'question',
      name: 'Question Answering',
      systemPrompt: `You are a helpful assistant that answers questions based on provided context. Give clear, accurate answers supported by the text.`,
      userPromptTemplate: `Context:
{{ocrText}}

Question: {{userQuery}}

Please answer the question based on the context above.`,
      description: 'Answer questions about OCR text',
      variables: ['ocrText', 'userQuery'],
    });

    // Translation template
    this.templates.set('translate', {
      type: 'translate',
      name: 'Translation',
      systemPrompt: `You are a professional translator. Provide accurate translations while preserving the original meaning, tone, and context.`,
      userPromptTemplate: `Translate the following text from {{language}} to English:

{{ocrText}}`,
      description: 'Translate OCR text to another language',
      variables: ['ocrText', 'language'],
    });

    // Information extraction template
    this.templates.set('extract', {
      type: 'extract',
      name: 'Information Extraction',
      systemPrompt: `You are an information extraction specialist. Extract structured information from text, including names, dates, locations, emails, phone numbers, and other relevant data.`,
      userPromptTemplate: `Extract all relevant information from this text in a structured format:

{{ocrText}}`,
      description: 'Extract structured information from OCR text',
      variables: ['ocrText'],
    });

    // Content analysis template
    this.templates.set('analyze', {
      type: 'analyze',
      name: 'Content Analysis',
      systemPrompt: `You are a content analyst. Analyze the text for key themes, sentiment, entities, and important patterns. Provide insights and observations.`,
      userPromptTemplate: `Analyze the following text and provide insights:

{{ocrText}}`,
      description: 'Analyze OCR text for themes and patterns',
      variables: ['ocrText'],
    });

    // Math OCR template
    this.templates.set('math', {
      type: 'math',
      name: 'Math Problem Solving',
      systemPrompt: `You are a mathematics expert. Help solve math problems, explain solutions step-by-step, and convert mathematical notation to standard formats when needed.`,
      userPromptTemplate: `Help with this math problem or equation:

{{ocrText}}

Provide a step-by-step solution and explanation.`,
      description: 'Solve math problems from OCR text',
      variables: ['ocrText'],
    });
  }

  /**
   * Build a prompt from template and context
   */
  buildPrompt(type: PromptType, context: PromptContext): {
    systemPrompt: string;
    userPrompt: string;
  } {
    const template = this.templates.get(type);
    if (!template) {
      throw new Error(`Unknown prompt type: ${type}`);
    }

    // Build system prompt
    const systemPrompt = template.systemPrompt;

    // Build user prompt by replacing variables
    let userPrompt = template.userPromptTemplate;

    // Replace OCR text
    userPrompt = userPrompt.replace(/\{\{ocrText\}\}/g, context.ocrText || '');

    // Replace language
    if (context.language) {
      userPrompt = userPrompt.replace(/\{\{language\}\}/g, context.language);
    }

    // Replace user query
    if (context.userQuery) {
      userPrompt = userPrompt.replace(/\{\{userQuery\}\}/g, context.userQuery);
    }

    // Add confidence note if low
    if (context.confidence !== undefined && context.confidence < 0.7) {
      userPrompt += `

(Note: OCR confidence is ${(context.confidence * 100).toFixed(0)}%, text may contain errors)`;
    }

    // Add additional context if provided
    if (context.additionalContext) {
      userPrompt += `

Additional context: ${context.additionalContext}`;
    }

    return {
      systemPrompt,
      userPrompt,
    };
  }

  /**
   * Get a specific template
   */
  getTemplate(type: PromptType): PromptTemplate | undefined {
    return this.templates.get(type);
  }

  /**
   * Get all available templates
   */
  getAllTemplates(): PromptTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Register a custom template
   */
  registerTemplate(template: PromptTemplate): void {
    this.templates.set(template.type, template);
    console.log(`Registered prompt template: ${template.name}`);
  }

  /**
   * Build a custom prompt
   */
  buildCustomPrompt(
    systemPrompt: string,
    userPrompt: string,
    context: PromptContext
  ): {
    systemPrompt: string;
    userPrompt: string;
  } {
    // Replace variables in custom prompts
    let processedUserPrompt = userPrompt
      .replace(/\{\{ocrText\}\}/g, context.ocrText || '')
      .replace(/\{\{language\}\}/g, context.language || 'unknown')
      .replace(/\{\{userQuery\}\}/g, context.userQuery || '');

    if (context.additionalContext) {
      processedUserPrompt += `

Additional context: ${context.additionalContext}`;
    }

    return {
      systemPrompt,
      userPrompt: processedUserPrompt,
    };
  }

  /**
   * Enhance OCR text prompt with metadata
   */
  enhanceWithMetadata(prompt: string, context: PromptContext): string {
    let enhanced = prompt;

    // Add language info
    if (context.language) {
      enhanced = `Language: ${context.language}

${enhanced}`;
    }

    // Add confidence warning
    if (context.confidence !== undefined && context.confidence < 0.8) {
      enhanced = `[OCR Confidence: ${(context.confidence * 100).toFixed(0)}% - May contain errors]

${enhanced}`;
    }

    return enhanced;
  }

  /**
   * Generate a prompt for multi-modal input (future: image + text)
   */
  buildMultiModalPrompt(
    type: PromptType,
    context: PromptContext,
    imageData?: string
  ): {
    systemPrompt: string;
    userPrompt: string;
    imageData?: string;
  } {
    const { systemPrompt, userPrompt } = this.buildPrompt(type, context);

    return {
      systemPrompt,
      userPrompt,
      imageData,
    };
  }
}

// Export singleton instance
export const promptService = new PromptEngineeringService();
