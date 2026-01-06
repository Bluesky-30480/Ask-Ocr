/**
 * Context-Aware AI Routing Service
 * Automatically routes AI requests to appropriate templates based on active window context
 */

import type {
  ApplicationContext,
  ApplicationType,
  BrowserContext,
  CodeEditorContext,
  OfficeContext,
} from './active-window-context.service';
import { enhancedPromptService } from '../ai/enhanced-prompt.service';

export type EnhancedTemplateId =
  | 'ocr_summarize'
  | 'ocr_qa'
  | 'ocr_technical'
  | 'ocr_academic'
  | 'ocr_business'
  | 'ocr_math'
  | 'ai_assistant';

export interface RoutingDecision {
  template: EnhancedTemplateId;
  reason: string;
  confidence: number;
  variables: Record<string, string>;
}

export interface RoutingRule {
  appTypes: ApplicationType[];
  condition?: (context: ApplicationContext) => boolean;
  template: EnhancedTemplateId;
  priority: number; // Higher = more priority
  reason: string;
}

export class ContextAwareRoutingService {
  private routingRules: RoutingRule[] = [];

  constructor() {
    this.initializeDefaultRules();
  }

  /**
   * Initialize default routing rules
   */
  private initializeDefaultRules(): void {
    this.routingRules = [
      // Browser → Web research / Q&A
      {
        appTypes: ['browser'],
        template: 'ocr_qa',
        priority: 80,
        reason: 'Browser detected - optimizing for web research and Q&A',
      },

      // Code Editor → Technical assistance
      {
        appTypes: ['code-editor'],
        template: 'ocr_technical',
        priority: 90,
        reason: 'Code editor detected - providing technical/programming assistance',
      },

      // Office Word → Business writing
      {
        appTypes: ['office-word'],
        template: 'ocr_business',
        priority: 85,
        reason: 'Word detected - optimizing for business writing and documentation',
      },

      // Office Excel → Data analysis
      {
        appTypes: ['office-excel'],
        condition: (ctx) => {
          const office = ctx.context as OfficeContext;
          return office.documentType === 'excel';
        },
        template: 'ocr_business',
        priority: 85,
        reason: 'Excel detected - providing data analysis and formatting assistance',
      },

      // Office PowerPoint → Presentation
      {
        appTypes: ['office-powerpoint'],
        template: 'ai_assistant',
        priority: 80,
        reason: 'PowerPoint detected - helping with presentation content and structure',
      },

      // PDF Reader → Academic/research
      {
        appTypes: ['pdf-reader'],
        template: 'ocr_academic',
        priority: 85,
        reason: 'PDF reader detected - optimizing for academic/research content',
      },

      // Email → Business communication
      {
        appTypes: ['email'],
        template: 'ocr_business',
        priority: 80,
        reason: 'Email client detected - assisting with professional communication',
      },

      // Terminal → Technical/command assistance
      {
        appTypes: ['terminal'],
        template: 'ocr_technical',
        priority: 85,
        reason: 'Terminal detected - providing command-line and scripting help',
      },

      // Text Editor → General writing
      {
        appTypes: ['text-editor'],
        template: 'ai_assistant',
        priority: 70,
        reason: 'Text editor detected - general writing assistance',
      },

      // Chat → Conversational
      {
        appTypes: ['chat'],
        template: 'ai_assistant',
        priority: 75,
        reason: 'Chat application detected - conversational assistance',
      },

      // Math content detection (cross-app)
      {
        appTypes: [
          'browser',
          'code-editor',
          'office-word',
          'pdf-reader',
          'text-editor',
          'unknown',
        ],
        condition: (ctx) => this.containsMathContent(ctx),
        template: 'ocr_math',
        priority: 95, // High priority if math is detected
        reason: 'Mathematical content detected - using LaTeX-optimized template',
      },

      // Code in clipboard (cross-app)
      {
        appTypes: [
          'browser',
          'text-editor',
          'office-word',
          'email',
          'chat',
          'unknown',
        ],
        condition: (ctx) => this.containsCodeContent(ctx),
        template: 'ocr_technical',
        priority: 92,
        reason: 'Code detected in content - providing technical assistance',
      },

      // Academic keywords (cross-app)
      {
        appTypes: ['browser', 'text-editor', 'office-word', 'pdf-reader'],
        condition: (ctx) => this.containsAcademicKeywords(ctx),
        template: 'ocr_academic',
        priority: 88,
        reason: 'Academic content detected - using research-focused template',
      },

      // Fallback for unknown apps
      {
        appTypes: ['unknown'],
        template: 'ai_assistant',
        priority: 50,
        reason: 'Unknown application - using general-purpose AI assistant',
      },
    ];

    // Sort by priority (descending)
    this.routingRules.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Route AI request based on application context
   */
  route(context: ApplicationContext, userQuery?: string): RoutingDecision {
    // Check for explicit file operation intent in query
    if (userQuery) {
      const lowerQuery = userQuery.toLowerCase();
      if (lowerQuery.includes('rename') || lowerQuery.includes('organize files') || lowerQuery.includes('change filename')) {
        return {
          template: 'ai_assistant',
          reason: 'File operation detected in query - using general assistant with file capabilities',
          confidence: 0.95,
          variables: {},
        };
      }
    }

    // Find matching rule with highest priority
    for (const rule of this.routingRules) {
      if (this.matchesRule(rule, context)) {
        const variables = this.extractVariables(context, userQuery);
        
        return {
          template: rule.template,
          reason: rule.reason,
          confidence: this.calculateConfidence(rule, context),
          variables,
        };
      }
    }

    // Fallback to general assistant
    return {
      template: 'ai_assistant',
      reason: 'No specific context matched - using general assistant',
      confidence: 0.5,
      variables: {},
    };
  }

  /**
   * Generate prompt using routed template
   */
  async generateContextAwarePrompt(
    context: ApplicationContext,
    userQuery: string,
    ocrText?: string,
    _conversationHistory?: Array<{ role: string; content: string }>
  ): Promise<{ systemPrompt: string; userPrompt: string }> {
    const decision = this.route(context, userQuery);
    
    // Add context-specific variables
    const appContext = this.formatContextDescription(context);

    // Generate prompt using enhanced prompt service
    return enhancedPromptService.generatePrompt(
      decision.template,
      {
        ocrText: ocrText || '',
        userQuery,
        additionalContext: appContext,
      },
    );
  }

  /**
   * Get routing suggestion for user
   */
  getRoutingSuggestion(context: ApplicationContext): string {
    const decision = this.route(context);
    const templateInfo = enhancedPromptService.getTemplate(decision.template);
    
    return `${decision.reason}

` +
           `Using: ${templateInfo?.name || decision.template}
` +
           `Confidence: ${Math.round(decision.confidence * 100)}%`;
  }

  /**
   * Check if rule matches context
   */
  private matchesRule(rule: RoutingRule, context: ApplicationContext): boolean {
    // Check app type
    if (!rule.appTypes.includes(context.type)) {
      return false;
    }

    // Check custom condition if present
    if (rule.condition && !rule.condition(context)) {
      return false;
    }

    return true;
  }

  /**
   * Calculate confidence score for routing decision
   */
  private calculateConfidence(rule: RoutingRule, context: ApplicationContext): number {
    let confidence = context.confidence; // Start with detection confidence

    // Boost for exact app type match
    if (rule.appTypes.length === 1 && rule.appTypes[0] === context.type) {
      confidence += 0.1;
    }

    // Boost for condition match
    if (rule.condition && rule.condition(context)) {
      confidence += 0.15;
    }

    // Priority affects confidence
    const priorityBonus = rule.priority / 200; // Max +0.5
    confidence += priorityBonus;

    return Math.min(confidence, 1.0); // Cap at 1.0
  }

  /**
   * Extract variables from context
   */
  private extractVariables(
    context: ApplicationContext,
    _userQuery?: string
  ): Record<string, string> {
    const variables: Record<string, string> = {};

    switch (context.type) {
      case 'browser': {
        const browser = context.context as BrowserContext;
        if (browser.url) variables.url = browser.url;
        if (browser.domain) variables.domain = browser.domain;
        if (browser.pageTitle) variables.page_title = browser.pageTitle;
        break;
      }

      case 'code-editor': {
        const editor = context.context as CodeEditorContext;
        if (editor.language) variables.language = editor.language;
        if (editor.fileName) variables.file_name = editor.fileName;
        if (editor.filePath) variables.file_path = editor.filePath;
        if (editor.selectedCode) variables.selected_code = editor.selectedCode;
        break;
      }

      case 'office-word':
      case 'office-excel':
      case 'office-powerpoint': {
        const office = context.context as OfficeContext;
        if (office.documentName) variables.document_name = office.documentName;
        if (office.documentType) variables.document_type = office.documentType;
        break;
      }
    }

    // Add selected text if available
    if (context.selectedText) {
      variables.selected_text = context.selectedText;
    }

    // Add window title
    variables.window_title = context.windowTitle;
    variables.app_name = context.name;

    return variables;
  }

  /**
   * Format context description for AI
   */
  private formatContextDescription(context: ApplicationContext): string {
    let description = `Application: ${context.name}`;

    switch (context.type) {
      case 'browser': {
        const browser = context.context as BrowserContext;
        if (browser.domain) {
          description += `
Website: ${browser.domain}`;
        }
        if (browser.pageTitle) {
          description += `
Page: ${browser.pageTitle}`;
        }
        break;
      }

      case 'code-editor': {
        const editor = context.context as CodeEditorContext;
        if (editor.fileName) {
          description += `
File: ${editor.fileName}`;
        }
        if (editor.language) {
          description += `
Language: ${editor.language}`;
        }
        break;
      }

      case 'office-word':
      case 'office-excel':
      case 'office-powerpoint': {
        const office = context.context as OfficeContext;
        if (office.documentName) {
          description += `
Document: ${office.documentName}`;
        }
        description += `
Type: ${office.documentType}`;
        break;
      }
    }

    if (context.selectedText) {
      description += `
Selected text: "${context.selectedText.substring(0, 100)}${context.selectedText.length > 100 ? '...' : ''}"`;
    }

    return description;
  }

  /**
   * Detect math content in context
   */
  private containsMathContent(context: ApplicationContext): boolean {
    const text = this.getTextFromContext(context);
    if (!text) return false;

    // Look for math indicators
    const mathPatterns = [
      /\$\$.+\$\$/s, // LaTeX display math
      /\$.+\$/g, // LaTeX inline math
      /\\[a-z]+\{/g, // LaTeX commands
      /∫|∑|∏|√|∂|∇|≈|≠|≤|≥|∞/g, // Math symbols
      /[a-z]\s*=\s*[a-z0-9()/+\-*^]+/gi, // Equations
      /\b(equation|formula|theorem|proof|calculate|derivative|integral)\b/gi,
    ];

    return mathPatterns.some(pattern => pattern.test(text));
  }

  /**
   * Detect code content in context
   */
  private containsCodeContent(context: ApplicationContext): boolean {
    const text = this.getTextFromContext(context);
    if (!text) return false;

    // Look for code indicators
    const codePatterns = [
      /```[\s\S]+```/g, // Code blocks
      /function\s+\w+\s*\(/g, // Function declarations
      /class\s+\w+/g, // Class declarations
      /import\s+.+from/g, // Import statements
      /const|let|var\s+\w+\s*=/g, // Variable declarations
      /(public|private|protected)\s+(class|void|int|string)/g, // Access modifiers
      /\w+\.\w+\(.*\)/g, // Method calls
      /if\s*\(.+\)\s*\{/g, // Control structures
    ];

    return codePatterns.some(pattern => pattern.test(text));
  }

  /**
   * Detect academic keywords in context
   */
  private containsAcademicKeywords(context: ApplicationContext): boolean {
    const text = this.getTextFromContext(context);
    if (!text) return false;

    const academicKeywords = [
      'abstract',
      'methodology',
      'hypothesis',
      'research',
      'study',
      'analysis',
      'conclusion',
      'introduction',
      'literature review',
      'discussion',
      'references',
      'citation',
      'bibliography',
      'et al',
      'journal',
      'proceedings',
    ];

    const lowerText = text.toLowerCase();
    const matchCount = academicKeywords.filter(keyword => 
      lowerText.includes(keyword)
    ).length;

    // Consider academic if 3+ keywords found
    return matchCount >= 3;
  }

  /**
   * Extract text from context for content analysis
   */
  private getTextFromContext(context: ApplicationContext): string {
    let text = context.windowTitle + ' ';

    if (context.selectedText) {
      text += context.selectedText + ' ';
    }

    switch (context.type) {
      case 'browser': {
        const browser = context.context as BrowserContext;
        if (browser.pageTitle) text += browser.pageTitle + ' ';
        if (browser.visibleText) text += browser.visibleText;
        break;
      }

      case 'code-editor': {
        const editor = context.context as CodeEditorContext;
        if (editor.selectedCode) text += editor.selectedCode;
        break;
      }

      case 'office-word':
      case 'office-excel':
      case 'office-powerpoint': {
        const office = context.context as OfficeContext;
        if (office.selectedText) text += office.selectedText;
        break;
      }
    }

    return text;
  }

  /**
   * Add custom routing rule
   */
  addRule(rule: RoutingRule): void {
    this.routingRules.push(rule);
    this.routingRules.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Remove rule by template
   */
  removeRule(template: EnhancedTemplateId): void {
    this.routingRules = this.routingRules.filter(r => r.template !== template);
  }

  /**
   * Get all rules
   */
  getRules(): RoutingRule[] {
    return [...this.routingRules];
  }

  /**
   * Override routing decision
   */
  forceTemplate(template: EnhancedTemplateId, reason: string = 'Manual override'): RoutingDecision {
    return {
      template,
      reason,
      confidence: 1.0,
      variables: {},
    };
  }
}

// Singleton instance
export const contextAwareRouting = new ContextAwareRoutingService();
