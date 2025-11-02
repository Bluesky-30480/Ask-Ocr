/**
 * Enhanced Prompt Engineering Service
 * Advanced prompt templates with OCR-specific optimizations and context awareness
 */

import type { PromptTemplate, PromptContext } from './prompt-engineering.service';
import { promptTemplateManager } from './prompt-template-manager.service';
import { promptOptimizerService, type OCRQualityMetrics, type PromptOptimization } from './prompt-optimizer.service';
import { conversationMemoryService, type ConversationSession, type MemoryContext } from './conversation-memory.service';

export interface EnhancedPromptTemplate extends PromptTemplate {
  // OCR-specific enhancements
  ocrPrePrompt?: string; // Special instructions for OCR text handling
  errorCorrectionHints?: string; // Hints for common OCR errors
  formattingInstructions?: string; // Output formatting guidelines
  
  // Context awareness
  requiresContext: boolean;
  multiTurnSupport: boolean;
  memoryDepth?: number; // How many previous turns to remember
  
  // Quality controls
  minConfidenceThreshold?: number; // Minimum OCR confidence to use this template
  maxTokens?: number;
  temperature?: number;
  
  // Domain-specific
  domain?: 'general' | 'technical' | 'academic' | 'business' | 'math' | 'code';
  examples?: string[]; // Few-shot examples
}

export interface ConversationMemory {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface EnhancedPromptContext extends PromptContext {
  // Enhanced OCR data
  ocrQuality?: 'high' | 'medium' | 'low';
  detectedLanguages?: string[];
  hasFormulas?: boolean;
  hasCode?: boolean;
  hasTable?: boolean;
  
  // Conversation history
  conversationHistory?: ConversationMemory[];
  sessionId?: string; // For accessing conversation memory
  
  // User preferences
  preferredOutputFormat?: 'markdown' | 'json' | 'plain' | 'html';
  verbosity?: 'concise' | 'balanced' | 'detailed';
}

export class EnhancedPromptService {
  private templates = new Map<string, EnhancedPromptTemplate>();

  constructor() {
    this.initializeEnhancedTemplates();
    this.registerBuiltInTemplates();
  }

  /**
   * Initialize enhanced prompt templates with OCR-specific optimizations
   */
  private initializeEnhancedTemplates(): void {
    // Enhanced OCR Summarization
    this.templates.set('ocr_summarize', {
      type: 'summarize',
      name: 'OCR Text Summarization',
      systemPrompt: `You are an expert at processing OCR-extracted text. You understand that OCR text may contain:
- Recognition errors (e.g., "rn" mistaken for "m", "0" for "O")
- Formatting issues (missing line breaks, extra spaces)
- Mixed encodings or character set problems

Your task is to:
1. Intelligently interpret the text despite potential OCR errors
2. Correct obvious mistakes based on context
3. Create a clear, accurate summary of the content
4. Highlight any uncertainties or ambiguous sections`,
      ocrPrePrompt: `The following text was extracted via OCR and may contain recognition errors. Please interpret it intelligently:`,
      errorCorrectionHints: `Common OCR errors to watch for:
- Letter confusion: O/0, I/l/1, S/5, rn/m, vv/w, cl/d
- Punctuation errors: periods as commas, quotes as apostrophes
- Word breaks: compound words split or joined incorrectly
- Case mixing: random capitalization`,
      formattingInstructions: `Provide the summary in this format:
**Main Topic:** [Brief topic description]
**Key Points:** [Bullet list of 3-5 main points]
**Details:** [2-3 sentences of important context]
**Uncertainties:** [Note any unclear or ambiguous parts]`,
      userPromptTemplate: `{{ocrPrePrompt}}

{{ocrText}}

{{formattingInstructions}}`,
      description: 'Summarize OCR text with error awareness',
      variables: ['ocrText'],
      requiresContext: false,
      multiTurnSupport: false,
      minConfidenceThreshold: 0,
      maxTokens: 500,
      temperature: 0.3,
      domain: 'general',
    });

    // Enhanced Question Answering with Context Retention
    this.templates.set('ocr_qa', {
      type: 'question',
      name: 'OCR Q&A with Context',
      systemPrompt: `You are an intelligent Q&A assistant specialized in answering questions about OCR-extracted documents. 

Key capabilities:
- Understand questions in context of previous conversation
- Handle follow-up questions naturally
- Correct OCR errors when interpreting the source text
- Provide specific, accurate answers with evidence from the text
- Ask clarifying questions if the query is ambiguous

Guidelines:
- Always cite the relevant part of the OCR text when answering
- If the OCR text doesn't contain the answer, clearly state this
- Maintain conversation context across multiple questions
- Be concise but comprehensive`,
      ocrPrePrompt: `I will ask questions about the following OCR-extracted text. Please answer based on this context, correcting any obvious OCR errors:`,
      formattingInstructions: `Answer format:
**Answer:** [Direct answer to the question]
**Evidence:** [Quoted relevant text from the OCR]
**Confidence:** [High/Medium/Low based on text clarity]
**Note:** [Any clarifications or limitations]`,
      userPromptTemplate: `{{ocrPrePrompt}}

---OCR TEXT---
{{ocrText}}
---END OCR TEXT---

{{conversationHistory}}

Current question: {{userQuery}}

{{formattingInstructions}}`,
      description: 'Answer questions with conversation memory',
      variables: ['ocrText', 'userQuery', 'conversationHistory'],
      requiresContext: true,
      multiTurnSupport: true,
      memoryDepth: 5,
      minConfidenceThreshold: 0.5,
      maxTokens: 400,
      temperature: 0.4,
      domain: 'general',
    });

    // Technical Document OCR Processing
    this.templates.set('ocr_technical', {
      type: 'analyze',
      name: 'Technical Document Analysis',
      systemPrompt: `You are a technical document analyst specialized in processing OCR text from technical materials (code, documentation, specifications).

Special considerations:
- Preserve code formatting and indentation
- Recognize programming language syntax even with OCR errors
- Identify technical terms, APIs, and function names
- Detect version numbers, package names, and dependencies
- Handle mathematical formulas and scientific notation`,
      ocrPrePrompt: `The following is OCR text from a technical document. Please analyze it while being aware of common OCR issues with code and technical content:`,
      errorCorrectionHints: `Technical OCR challenges:
- Code: Brackets [], braces {}, parentheses () often confused
- Operators: = vs ==, - vs --, | vs l
- Underscores: Often missing or misplaced
- Camel case: May be split incorrectly
- Comments: // vs //, # vs //`,
      formattingInstructions: `Analysis format:
**Document Type:** [Code/Documentation/API/Specification]
**Language/Technology:** [Identified language or framework]
**Main Topics:** [Key technical concepts]
**Code Snippets:** [Extracted code blocks with syntax highlighting]
**Technical Terms:** [List of APIs, functions, packages mentioned]
**Issues Found:** [Any unclear or corrupted sections]`,
      userPromptTemplate: `{{ocrPrePrompt}}

\`\`\`
{{ocrText}}
\`\`\`

{{formattingInstructions}}`,
      description: 'Analyze technical documents and code',
      variables: ['ocrText'],
      requiresContext: false,
      multiTurnSupport: false,
      minConfidenceThreshold: 0.6,
      maxTokens: 800,
      temperature: 0.2,
      domain: 'technical',
    });

    // Academic Paper OCR Processing
    this.templates.set('ocr_academic', {
      type: 'analyze',
      name: 'Academic Document Analysis',
      systemPrompt: `You are an academic document analyst. You excel at processing OCR text from research papers, theses, and academic materials.

Expertise areas:
- Understanding academic structure (abstract, introduction, methodology, results, conclusion)
- Recognizing citations and references
- Interpreting mathematical formulas and equations
- Identifying research methodology and statistical data
- Extracting key findings and contributions`,
      ocrPrePrompt: `This is OCR text from an academic document. Please analyze it with attention to academic structure and terminology:`,
      formattingInstructions: `Analysis format:
**Title:** [Document title if present]
**Type:** [Research paper/Thesis/Review/Conference paper]
**Field:** [Academic discipline]
**Key Concepts:** [Main research topics]
**Methodology:** [Research methods used]
**Findings:** [Key results and conclusions]
**Citations:** [Referenced works mentioned]
**Mathematical Content:** [Formulas and equations found]`,
      userPromptTemplate: `{{ocrPrePrompt}}

{{ocrText}}

{{formattingInstructions}}`,
      description: 'Analyze academic papers and research documents',
      variables: ['ocrText'],
      requiresContext: false,
      multiTurnSupport: false,
      minConfidenceThreshold: 0.7,
      maxTokens: 700,
      temperature: 0.3,
      domain: 'academic',
    });

    // Business Document OCR Processing
    this.templates.set('ocr_business', {
      type: 'extract',
      name: 'Business Document Extraction',
      systemPrompt: `You are a business document processor. You specialize in extracting structured information from business documents like invoices, contracts, reports, and emails.

Focus on:
- Contact information (names, emails, phones, addresses)
- Financial data (amounts, currencies, dates)
- Important dates and deadlines
- Action items and responsibilities
- Legal terms and conditions`,
      ocrPrePrompt: `Extract structured information from this business document (OCR text):`,
      formattingInstructions: `Extract in JSON format:
{
  "document_type": "invoice|contract|report|email|other",
  "parties": ["names of involved parties"],
  "dates": ["important dates with context"],
  "financial": {
    "amounts": ["monetary values with description"],
    "currency": "detected currency"
  },
  "contacts": {
    "emails": [],
    "phones": [],
    "addresses": []
  },
  "action_items": ["tasks or requirements"],
  "key_terms": ["important clauses or conditions"],
  "summary": "one-sentence document summary"
}`,
      userPromptTemplate: `{{ocrPrePrompt}}

{{ocrText}}

{{formattingInstructions}}`,
      description: 'Extract structured data from business documents',
      variables: ['ocrText'],
      requiresContext: false,
      multiTurnSupport: false,
      minConfidenceThreshold: 0.6,
      maxTokens: 600,
      temperature: 0.1,
      domain: 'business',
    });

    // Math Formula OCR Processing
    this.templates.set('ocr_math', {
      type: 'math',
      name: 'Mathematical Content Analysis',
      systemPrompt: `You are a mathematics expert specialized in interpreting OCR text containing mathematical formulas, equations, and notation.

Capabilities:
- Recognize mathematical notation despite OCR errors
- Convert recognized formulas to LaTeX
- Explain mathematical concepts and steps
- Solve equations when requested
- Identify mathematical domains (algebra, calculus, statistics, etc.)`,
      ocrPrePrompt: `This text contains mathematical content extracted via OCR. Please interpret formulas carefully:`,
      errorCorrectionHints: `Math OCR challenges:
- Superscripts/subscripts often on same line
- Fractions: / vs proper fraction bars
- Greek letters: π, α, β, θ, Σ, ∫ may be garbled
- Operators: × vs x, ÷ vs /, ≠ vs !=
- Parentheses: ( ) [ ] { } may be confused`,
      formattingInstructions: `Response format:
**Detected Formulas:** [List formulas in LaTeX]
**Mathematical Domain:** [Algebra/Calculus/Statistics/etc.]
**Explanations:** [Explain what each formula represents]
**Solutions:** [If solvable, show steps]
**Uncertainty:** [Note any unclear mathematical notation]`,
      userPromptTemplate: `{{ocrPrePrompt}}

{{ocrText}}

{{formattingInstructions}}`,
      description: 'Analyze and interpret mathematical content',
      variables: ['ocrText'],
      requiresContext: false,
      multiTurnSupport: true,
      memoryDepth: 3,
      minConfidenceThreshold: 0.6,
      maxTokens: 600,
      temperature: 0.2,
      domain: 'math',
    });

    // AI Assistant Pre-Prompts
    this.templates.set('ai_assistant', {
      type: 'custom',
      name: 'AI Assistant with Task Classification',
      systemPrompt: `You are an intelligent AI assistant that helps users work with OCR-extracted text. 

Your workflow:
1. Classify the user's intent (summarize, extract, translate, analyze, answer question, etc.)
2. Assess the OCR text quality
3. Apply appropriate processing strategy
4. Provide helpful, formatted output

You adapt your approach based on:
- User's request type
- OCR text quality and confidence
- Content domain (technical, academic, business, general)
- Conversation context`,
      ocrPrePrompt: `I have OCR-extracted text and need your assistance. The text quality is {{ocrQuality}}.`,
      formattingInstructions: `First, classify the task:
- If summarization: Provide concise summary
- If question: Answer with evidence from text
- If extraction: Return structured data
- If translation: Provide accurate translation
- If analysis: Give detailed insights

Always indicate confidence level and any OCR-related uncertainties.`,
      userPromptTemplate: `{{ocrPrePrompt}}

---TEXT---
{{ocrText}}
---END TEXT---

User request: {{userQuery}}

{{conversationHistory}}

{{formattingInstructions}}`,
      description: 'Intelligent assistant with automatic task classification',
      variables: ['ocrText', 'ocrQuality', 'userQuery', 'conversationHistory'],
      requiresContext: true,
      multiTurnSupport: true,
      memoryDepth: 10,
      minConfidenceThreshold: 0,
      maxTokens: 800,
      temperature: 0.5,
      domain: 'general',
    });
  }

  /**
   * Generate enhanced prompt with all context and dynamic optimization
   */
  generatePrompt(
    templateId: string,
    context: EnhancedPromptContext,
    enableOptimization: boolean = true
  ): { systemPrompt: string; userPrompt: string; optimization?: PromptOptimization } {
    let template = this.getTemplate(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    let optimization: PromptOptimization | undefined;

    // Apply dynamic optimization if enabled and OCR text is available
    if (enableOptimization && context.ocrText) {
      const ocrMetrics = promptOptimizerService.analyzeOCRQuality(
        context.ocrText,
        context.confidence
      );

      // Only optimize if there are quality issues or specific content types
      if (this.shouldOptimize(ocrMetrics)) {
        optimization = promptOptimizerService.optimizePrompt(template, context, ocrMetrics);
        template = optimization.optimizedTemplate;
      }
    }

    // Build system prompt
    let systemPrompt = template.systemPrompt;

    // Build user prompt with variable substitution
    let userPrompt = template.userPromptTemplate;

    // Substitute OCR pre-prompt
    if (template.ocrPrePrompt) {
      userPrompt = userPrompt.replace('{{ocrPrePrompt}}', template.ocrPrePrompt);
    }

    // Substitute OCR text
    userPrompt = userPrompt.replace('{{ocrText}}', context.ocrText || '');

    // Substitute user query
    userPrompt = userPrompt.replace('{{userQuery}}', context.userQuery || '');

    // Substitute OCR quality
    const ocrQuality = context.ocrQuality || this.assessOCRQuality(context.confidence);
    userPrompt = userPrompt.replace('{{ocrQuality}}', ocrQuality);

    // Add conversation history if supported
    if (template.multiTurnSupport) {
      let historyText = '';
      
      if (context.sessionId) {
        // Use conversation memory service for rich context
        const memoryContext = conversationMemoryService.getMemoryContext(
          context.sessionId,
          template.memoryDepth || 10,
          false
        );
        historyText = conversationMemoryService.formatMemoryForPrompt(memoryContext, true);
      } else if (context.conversationHistory) {
        // Fallback to simple history formatting
        historyText = this.formatConversationHistory(
          context.conversationHistory,
          template.memoryDepth || 5
        );
      }
      
      userPrompt = userPrompt.replace('{{conversationHistory}}', historyText);
    } else {
      userPrompt = userPrompt.replace('{{conversationHistory}}', '');
    }

    // Add formatting instructions
    if (template.formattingInstructions) {
      userPrompt = userPrompt.replace('{{formattingInstructions}}', template.formattingInstructions);
    }

    // Clean up extra newlines
    userPrompt = userPrompt.replace(/\n{3,}/g, '\n\n');

    const result: { systemPrompt: string; userPrompt: string; optimization?: PromptOptimization } = {
      systemPrompt,
      userPrompt,
    };

    if (optimization) {
      result.optimization = optimization;
    }

    return result;
  }

  /**
   * Assess OCR quality based on confidence score
   */
  private assessOCRQuality(confidence?: number): 'high' | 'medium' | 'low' {
    if (!confidence) return 'medium';
    if (confidence >= 0.85) return 'high';
    if (confidence >= 0.65) return 'medium';
    return 'low';
  }

  /**
   * Format conversation history for context
   */
  private formatConversationHistory(
    history: ConversationMemory[],
    maxDepth: number
  ): string {
    const recentHistory = history.slice(-maxDepth);
    
    if (recentHistory.length === 0) return '';

    const formatted = recentHistory
      .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
      .join('\n\n');

    return `
---PREVIOUS CONVERSATION---
${formatted}
---END PREVIOUS CONVERSATION---
`;
  }

  /**
   * Get template by ID (includes custom templates)
   */
  getTemplate(templateId: string): EnhancedPromptTemplate | undefined {
    // First check built-in templates
    const builtInTemplate = this.templates.get(templateId);
    if (builtInTemplate) {
      return builtInTemplate;
    }

    // Then check custom templates
    const customTemplate = promptTemplateManager.getTemplate(templateId);
    if (customTemplate) {
      // Convert CustomPromptTemplate to EnhancedPromptTemplate
      return {
        ...customTemplate,
        type: 'custom',
        variables: this.extractVariables(customTemplate.userPromptTemplate),
      };
    }

    return undefined;
  }

  /**
   * Get all templates (includes custom templates)
   */
  getAllTemplates(): EnhancedPromptTemplate[] {
    const builtInTemplates = Array.from(this.templates.values());
    const customTemplates = promptTemplateManager.getAllTemplates().map(t => ({
      ...t,
      type: 'custom' as const,
      variables: this.extractVariables(t.userPromptTemplate),
    }));

    return [...builtInTemplates, ...customTemplates];
  }

  /**
   * Get templates by domain
   */
  getTemplatesByDomain(domain: EnhancedPromptTemplate['domain']): EnhancedPromptTemplate[] {
    return this.getAllTemplates().filter(t => t.domain === domain);
  }

  /**
   * Register built-in templates with the template manager
   */
  private registerBuiltInTemplates(): void {
    // Add built-in templates to appropriate categories
    const categories = promptTemplateManager.getCategories();
    
    for (const [templateId, template] of this.templates) {
      const categoryId = template.domain || 'general';
      const category = categories.find(c => c.id === categoryId);
      
      if (category && !category.templates.includes(templateId)) {
        promptTemplateManager.addTemplateToCategory(templateId, categoryId);
      }
    }
  }

  /**
   * Determine if prompt optimization should be applied
   */
  private shouldOptimize(metrics: OCRQualityMetrics): boolean {
    return (
      metrics.confidence < 0.8 || // Low confidence
      metrics.estimatedErrors > 3 || // High error rate
      metrics.hasFormulas || // Mathematical content
      metrics.hasCode || // Code content
      metrics.readabilityScore < 0.7 || // Poor readability
      metrics.languageConfidence < 0.8 || // Uncertain language
      metrics.textLength > 1500 || // Very long text
      metrics.textLength < 30 // Very short text
    );
  }

  /**
   * Extract variables from template string
   */
  private extractVariables(template: string): string[] {
    const matches = template.match(/\{\{(\w+)\}\}/g);
    if (!matches) return [];
    
    return matches.map(match => match.replace(/[{}]/g, ''));
  }

  /**
   * Recommend template based on context
   */
  recommendTemplate(context: EnhancedPromptContext): string {
    // Check for specific content types
    if (context.hasCode || context.ocrText?.includes('function') || context.ocrText?.includes('class ')) {
      return 'ocr_technical';
    }
    
    if (context.hasFormulas || context.ocrText?.match(/[∫∑∏√πα-ωΑ-Ω]/)) {
      return 'ocr_math';
    }

    if (context.ocrText?.match(/abstract|introduction|methodology|conclusion/i)) {
      return 'ocr_academic';
    }

    if (context.ocrText?.match(/invoice|contract|agreement|terms|payment/i)) {
      return 'ocr_business';
    }

    // Check user query intent
    if (context.userQuery) {
      const query = context.userQuery.toLowerCase();
      if (query.includes('summarize') || query.includes('summary')) {
        return 'ocr_summarize';
      }
      if (query.includes('what') || query.includes('how') || query.includes('why') || query.includes('?')) {
        return 'ocr_qa';
      }
    }

    // Default to AI assistant for general queries
    return 'ai_assistant';
  }

  /**
   * Analyze OCR quality for a given text
   */
  analyzeOCRQuality(text: string, confidence?: number): OCRQualityMetrics {
    return promptOptimizerService.analyzeOCRQuality(text, confidence);
  }

  /**
   * Get optimization recommendations for OCR text
   */
  getOptimizationRecommendations(text: string, confidence?: number): string[] {
    const metrics = this.analyzeOCRQuality(text, confidence);
    return promptOptimizerService.getOptimizationRecommendations(metrics);
  }

  /**
   * Preview optimization for a template and context
   */
  previewOptimization(
    templateId: string,
    context: EnhancedPromptContext
  ): PromptOptimization | null {
    const template = this.getTemplate(templateId);
    if (!template || !context.ocrText) return null;

    const ocrMetrics = promptOptimizerService.analyzeOCRQuality(
      context.ocrText,
      context.confidence
    );

    if (!this.shouldOptimize(ocrMetrics)) return null;

    return promptOptimizerService.optimizePrompt(template, context, ocrMetrics);
  }

  /**
   * Get quality assessment for OCR text
   */
  getQualityAssessment(text: string, confidence?: number): {
    overall: 'excellent' | 'good' | 'fair' | 'poor';
    metrics: OCRQualityMetrics;
    recommendations: string[];
  } {
    const metrics = this.analyzeOCRQuality(text, confidence);
    const recommendations = this.getOptimizationRecommendations(text, confidence);

    let overall: 'excellent' | 'good' | 'fair' | 'poor';
    
    if (metrics.confidence >= 0.9 && metrics.readabilityScore >= 0.8 && metrics.estimatedErrors <= 2) {
      overall = 'excellent';
    } else if (metrics.confidence >= 0.75 && metrics.readabilityScore >= 0.6 && metrics.estimatedErrors <= 5) {
      overall = 'good';
    } else if (metrics.confidence >= 0.6 && metrics.readabilityScore >= 0.4 && metrics.estimatedErrors <= 10) {
      overall = 'fair';
    } else {
      overall = 'poor';
    }

    return { overall, metrics, recommendations };
  }

  /**
   * Create a new conversation session
   */
  createConversationSession(
    title?: string,
    context?: { ocrText?: string; documentId?: string; templateId?: string; domain?: string }
  ): string {
    return conversationMemoryService.createSession(title, context);
  }

  /**
   * Add message to conversation
   */
  addConversationMessage(
    sessionId: string,
    role: 'user' | 'assistant',
    content: string,
    metadata?: { templateId?: string; confidence?: number; processingTime?: number }
  ): boolean {
    return conversationMemoryService.addMessage(sessionId, role, content, metadata);
  }

  /**
   * Get conversation session
   */
  getConversationSession(sessionId: string): ConversationSession | undefined {
    return conversationMemoryService.getSession(sessionId);
  }

  /**
   * Get all conversation sessions
   */
  getAllConversationSessions(): ConversationSession[] {
    return conversationMemoryService.getAllSessions();
  }

  /**
   * Get recent conversation sessions
   */
  getRecentConversationSessions(limit?: number): ConversationSession[] {
    return conversationMemoryService.getRecentSessions(limit);
  }

  /**
   * Delete conversation session
   */
  deleteConversationSession(sessionId: string): boolean {
    return conversationMemoryService.deleteSession(sessionId);
  }

  /**
   * Search conversations
   */
  searchConversations(query: string): ConversationSession[] {
    return conversationMemoryService.searchConversations(query);
  }

  /**
   * Export conversation
   */
  exportConversation(sessionId: string, format: 'json' | 'txt' | 'md' = 'json'): string {
    return conversationMemoryService.exportConversation(sessionId, format);
  }

  /**
   * Get conversation statistics
   */
  getConversationStatistics() {
    return conversationMemoryService.getStatistics();
  }

  /**
   * Generate enhanced prompt with conversation context
   */
  generateConversationPrompt(
    templateId: string,
    sessionId: string,
    userQuery: string,
    ocrText?: string,
    enableOptimization: boolean = true
  ): { systemPrompt: string; userPrompt: string; optimization?: PromptOptimization } {
    const session = conversationMemoryService.getSession(sessionId);
    
    const context: EnhancedPromptContext = {
      ocrText: ocrText || session?.context.ocrText || '',
      userQuery,
      sessionId,
      confidence: 0.8, // Default confidence
    };

    // Add session context if available
    if (session) {
      context.confidence = 0.9; // Higher confidence with session context
      if (session.context.domain) {
        // Use domain-specific settings
      }
    }

    return this.generatePrompt(templateId, context, enableOptimization);
  }

  /**
   * Continue conversation with memory
   */
  continueConversation(
    sessionId: string,
    userMessage: string,
    templateId?: string
  ): {
    prompt: { systemPrompt: string; userPrompt: string; optimization?: PromptOptimization };
    memoryContext: MemoryContext;
  } {
    // Add user message to conversation
    this.addConversationMessage(sessionId, 'user', userMessage);

    // Get memory context
    const memoryContext = conversationMemoryService.getMemoryContext(sessionId, 10, false);

    // Determine template based on conversation context
    const finalTemplateId = templateId || this.recommendTemplateFromMemory(memoryContext);

    // Generate prompt with full context
    const prompt = this.generateConversationPrompt(
      finalTemplateId,
      sessionId,
      userMessage
    );

    return { prompt, memoryContext };
  }

  /**
   * Recommend template based on conversation memory
   */
  private recommendTemplateFromMemory(memoryContext: MemoryContext): string {
    // Analyze conversation topics to recommend appropriate template
    const topics = memoryContext.summary.keyTopics;
    
    if (topics.some(topic => ['math', 'formula', 'equation'].includes(topic))) {
      return 'ocr_math';
    }
    
    if (topics.some(topic => ['code', 'programming', 'function'].includes(topic))) {
      return 'ocr_technical';
    }
    
    if (topics.some(topic => ['research', 'paper', 'study'].includes(topic))) {
      return 'ocr_academic';
    }
    
    if (topics.some(topic => ['business', 'contract', 'invoice'].includes(topic))) {
      return 'ocr_business';
    }

    // Check for question patterns in recent messages
    const hasQuestions = memoryContext.recentMessages.some(msg => 
      msg.role === 'user' && msg.content.includes('?')
    );
    
    if (hasQuestions) {
      return 'ocr_qa';
    }

    // Default to AI assistant for general conversation
    return 'ai_assistant';
  }
}

// Singleton instance
export const enhancedPromptService = new EnhancedPromptService();
