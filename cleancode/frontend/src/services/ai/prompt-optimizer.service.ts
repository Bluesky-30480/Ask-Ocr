/**
 * Dynamic Prompt Optimization Service
 * Optimizes prompts based on OCR quality, content analysis, and context
 */

import type { EnhancedPromptTemplate, EnhancedPromptContext } from './enhanced-prompt.service';

export interface OCRQualityMetrics {
  confidence: number; // 0-1
  textLength: number;
  hasSpecialCharacters: boolean;
  hasNumbers: boolean;
  hasFormulas: boolean;
  hasCode: boolean;
  languageConfidence: number;
  estimatedErrors: number;
  readabilityScore: number; // 0-1
}

export interface PromptOptimization {
  originalTemplate: EnhancedPromptTemplate;
  optimizedTemplate: EnhancedPromptTemplate;
  optimizations: string[];
  confidenceBoost: number; // Expected improvement in response quality
  reasoning: string;
}

export class PromptOptimizerService {
  /**
   * Analyze OCR text quality and extract metrics
   */
  analyzeOCRQuality(text: string, confidence?: number): OCRQualityMetrics {
    const textLength = text.length;
    
    // Detect special characters and patterns
    const hasSpecialCharacters = /[^\w\s.,!?;:'"()-]/.test(text);
    const hasNumbers = /\d/.test(text);
    const hasFormulas = /[∫∑∏√πα-ωΑ-Ω]|[=+\-*/^]/.test(text);
    const hasCode = /[{}[\]();]|function|class|var|let|const|if|for|while/.test(text);
    
    // Estimate language confidence based on common patterns
    const languageConfidence = this.estimateLanguageConfidence(text);
    
    // Estimate OCR errors based on common patterns
    const estimatedErrors = this.estimateOCRErrors(text);
    
    // Calculate readability score
    const readabilityScore = this.calculateReadabilityScore(text);
    
    return {
      confidence: confidence || 0.8,
      textLength,
      hasSpecialCharacters,
      hasNumbers,
      hasFormulas,
      hasCode,
      languageConfidence,
      estimatedErrors,
      readabilityScore,
    };
  }

  /**
   * Optimize prompt template based on OCR quality
   */
  optimizePrompt(
    template: EnhancedPromptTemplate,
    context: EnhancedPromptContext,
    ocrMetrics: OCRQualityMetrics
  ): PromptOptimization {
    const optimizations: string[] = [];
    let optimizedTemplate = { ...template };
    let confidenceBoost = 0;

    // Low confidence OCR optimizations
    if (ocrMetrics.confidence < 0.7) {
      optimizedTemplate = this.addLowConfidenceOptimizations(optimizedTemplate, ocrMetrics);
      optimizations.push('Added low-confidence OCR handling');
      confidenceBoost += 0.15;
    }

    // High error rate optimizations
    if (ocrMetrics.estimatedErrors > 5) {
      optimizedTemplate = this.addErrorCorrectionOptimizations(optimizedTemplate, ocrMetrics);
      optimizations.push('Enhanced error correction instructions');
      confidenceBoost += 0.1;
    }

    // Content-specific optimizations
    if (ocrMetrics.hasFormulas) {
      optimizedTemplate = this.addFormulaOptimizations(optimizedTemplate);
      optimizations.push('Added mathematical notation handling');
      confidenceBoost += 0.12;
    }

    if (ocrMetrics.hasCode) {
      optimizedTemplate = this.addCodeOptimizations(optimizedTemplate);
      optimizations.push('Added code syntax awareness');
      confidenceBoost += 0.1;
    }

    // Length-based optimizations
    if (ocrMetrics.textLength > 2000) {
      optimizedTemplate = this.addLongTextOptimizations(optimizedTemplate);
      optimizations.push('Optimized for long text processing');
      confidenceBoost += 0.08;
    } else if (ocrMetrics.textLength < 50) {
      optimizedTemplate = this.addShortTextOptimizations(optimizedTemplate);
      optimizations.push('Optimized for short text processing');
      confidenceBoost += 0.05;
    }

    // Language confidence optimizations
    if (ocrMetrics.languageConfidence < 0.8) {
      optimizedTemplate = this.addLanguageOptimizations(optimizedTemplate, context);
      optimizations.push('Added multi-language support');
      confidenceBoost += 0.07;
    }

    // Readability optimizations
    if (ocrMetrics.readabilityScore < 0.6) {
      optimizedTemplate = this.addReadabilityOptimizations(optimizedTemplate);
      optimizations.push('Enhanced unclear text handling');
      confidenceBoost += 0.09;
    }

    // Context-aware optimizations
    if (context.conversationHistory && context.conversationHistory.length > 0) {
      optimizedTemplate = this.addContextOptimizations(optimizedTemplate, context);
      optimizations.push('Enhanced conversation context');
      confidenceBoost += 0.06;
    }

    const reasoning = this.generateOptimizationReasoning(ocrMetrics, optimizations);

    return {
      originalTemplate: template,
      optimizedTemplate,
      optimizations,
      confidenceBoost: Math.min(confidenceBoost, 0.5), // Cap at 50% improvement
      reasoning,
    };
  }

  /**
   * Add optimizations for low confidence OCR
   */
  private addLowConfidenceOptimizations(
    template: EnhancedPromptTemplate,
    metrics: OCRQualityMetrics
  ): EnhancedPromptTemplate {
    const lowConfidenceInstructions = `
IMPORTANT: The following text was extracted via OCR with ${(metrics.confidence * 100).toFixed(0)}% confidence. 
This means there may be recognition errors. Please:

1. Read the text carefully and interpret it intelligently
2. Correct obvious OCR mistakes based on context
3. If something seems unclear, mention your uncertainty
4. Focus on the overall meaning rather than exact character accuracy
5. Common OCR errors to watch for:
   - Letter confusion: O/0, I/l/1, S/5, rn/m, vv/w, cl/d
   - Missing or extra spaces
   - Punctuation errors
   - Case mixing (random capitalization)

`;

    return {
      ...template,
      systemPrompt: template.systemPrompt + '\n\n' + lowConfidenceInstructions,
      ocrPrePrompt: (template.ocrPrePrompt || '') + '\n' + lowConfidenceInstructions,
    };
  }

  /**
   * Add error correction optimizations
   */
  private addErrorCorrectionOptimizations(
    template: EnhancedPromptTemplate,
    metrics: OCRQualityMetrics
  ): EnhancedPromptTemplate {
    const errorCorrectionHints = `
ERROR CORRECTION GUIDANCE:
The text appears to have approximately ${metrics.estimatedErrors} potential OCR errors.
Please apply intelligent error correction:

- Look for words that don't make sense in context
- Check for common letter substitutions (rn→m, vv→w, etc.)
- Verify technical terms and proper nouns
- Ensure punctuation makes grammatical sense
- Fix obvious spacing issues

When correcting errors, maintain the original meaning and structure.
`;

    return {
      ...template,
      errorCorrectionHints: (template.errorCorrectionHints || '') + '\n' + errorCorrectionHints,
    };
  }

  /**
   * Add formula-specific optimizations
   */
  private addFormulaOptimizations(template: EnhancedPromptTemplate): EnhancedPromptTemplate {
    const formulaInstructions = `
MATHEMATICAL CONTENT DETECTED:
This text contains mathematical formulas or equations. Special considerations:

- Superscripts and subscripts may appear on the same line (x^2 instead of x²)
- Greek letters may be garbled (π→n, α→a, β→b, etc.)
- Mathematical operators may be confused (×→x, ÷→/, ≠→!=)
- Fractions may use / instead of proper fraction notation
- Parentheses, brackets, and braces may be confused

Please interpret mathematical notation carefully and convert to proper format when possible.
`;

    return {
      ...template,
      systemPrompt: template.systemPrompt + '\n\n' + formulaInstructions,
    };
  }

  /**
   * Add code-specific optimizations
   */
  private addCodeOptimizations(template: EnhancedPromptTemplate): EnhancedPromptTemplate {
    const codeInstructions = `
CODE CONTENT DETECTED:
This text appears to contain programming code. OCR challenges with code:

- Indentation may be lost or incorrect
- Brackets [], braces {}, parentheses () often confused
- Operators: = vs ==, - vs --, | vs l, & vs 8
- Underscores often missing or misplaced
- Comments: // vs //, # vs //
- String quotes may be incorrect

Please preserve code structure and syntax as much as possible.
`;

    return {
      ...template,
      systemPrompt: template.systemPrompt + '\n\n' + codeInstructions,
    };
  }

  /**
   * Add optimizations for long text
   */
  private addLongTextOptimizations(template: EnhancedPromptTemplate): EnhancedPromptTemplate {
    const longTextInstructions = `
LONG TEXT PROCESSING:
This is a lengthy document (${template.maxTokens ? 'may exceed token limit' : 'substantial content'}).
Please:

- Focus on the most important information
- Provide structured summaries
- Break down complex information into sections
- Prioritize key points over minor details
`;

    return {
      ...template,
      systemPrompt: template.systemPrompt + '\n\n' + longTextInstructions,
      maxTokens: Math.max(template.maxTokens || 500, 800), // Increase token limit
    };
  }

  /**
   * Add optimizations for short text
   */
  private addShortTextOptimizations(template: EnhancedPromptTemplate): EnhancedPromptTemplate {
    const shortTextInstructions = `
SHORT TEXT PROCESSING:
This is a brief text snippet. Please:

- Extract maximum value from limited content
- Provide concise but complete analysis
- Don't over-elaborate on minimal information
- Focus on accuracy over verbosity
`;

    return {
      ...template,
      systemPrompt: template.systemPrompt + '\n\n' + shortTextInstructions,
      maxTokens: Math.min(template.maxTokens || 500, 300), // Reduce token limit
    };
  }

  /**
   * Add language-specific optimizations
   */
  private addLanguageOptimizations(
    template: EnhancedPromptTemplate,
    _context: EnhancedPromptContext
  ): EnhancedPromptTemplate {
    const languageInstructions = `
MULTI-LANGUAGE CONTENT:
The text may contain multiple languages or unclear language detection.
Please:

- Identify the primary language(s) in the text
- Handle mixed-language content appropriately
- Be aware of language-specific OCR challenges
- Provide translations if requested
`;

    return {
      ...template,
      systemPrompt: template.systemPrompt + '\n\n' + languageInstructions,
    };
  }

  /**
   * Add readability optimizations
   */
  private addReadabilityOptimizations(template: EnhancedPromptTemplate): EnhancedPromptTemplate {
    const readabilityInstructions = `
LOW READABILITY DETECTED:
The text appears to have readability issues (unclear structure, poor formatting).
Please:

- Reorganize information for clarity
- Fix formatting and structure issues
- Clarify ambiguous statements
- Improve overall coherence
`;

    return {
      ...template,
      systemPrompt: template.systemPrompt + '\n\n' + readabilityInstructions,
    };
  }

  /**
   * Add context-aware optimizations
   */
  private addContextOptimizations(
    template: EnhancedPromptTemplate,
    _context: EnhancedPromptContext
  ): EnhancedPromptTemplate {
    const contextInstructions = `
CONVERSATION CONTEXT AVAILABLE:
Previous conversation history is available. Please:

- Reference relevant previous exchanges
- Maintain consistency with earlier responses
- Build upon established context
- Avoid repeating information already covered
`;

    return {
      ...template,
      systemPrompt: template.systemPrompt + '\n\n' + contextInstructions,
    };
  }

  /**
   * Estimate language confidence based on text patterns
   */
  private estimateLanguageConfidence(text: string): number {
    // Simple heuristic based on character patterns
    const englishPattern = /[a-zA-Z]/g;
    const englishMatches = text.match(englishPattern)?.length || 0;
    const totalChars = text.replace(/\s/g, '').length;
    
    if (totalChars === 0) return 0.5;
    
    const englishRatio = englishMatches / totalChars;
    
    // Check for common English words
    const commonWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
    const wordMatches = commonWords.filter(word => 
      text.toLowerCase().includes(word)
    ).length;
    
    const wordBonus = Math.min(wordMatches * 0.1, 0.3);
    
    return Math.min(englishRatio + wordBonus, 1.0);
  }

  /**
   * Estimate number of OCR errors based on patterns
   */
  private estimateOCRErrors(text: string): number {
    let errorCount = 0;
    
    // Common OCR error patterns
    const errorPatterns = [
      /\brn\b/g, // 'rn' mistaken for 'm'
      /\bvv\b/g, // 'vv' mistaken for 'w'
      /\bcl\b/g, // 'cl' mistaken for 'd'
      /\b[0O]{2,}\b/g, // Multiple O/0 confusion
      /[A-Z]{3,}/g, // Excessive capitalization
      /\s{2,}/g, // Multiple spaces
      /[.,]{2,}/g, // Multiple punctuation
      /\b\w{1,2}\b/g, // Very short "words" (potential fragments)
    ];
    
    errorPatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        errorCount += matches.length;
      }
    });
    
    // Adjust based on text length
    const textLength = text.length;
    const errorRate = errorCount / Math.max(textLength / 100, 1);
    
    return Math.round(errorRate);
  }

  /**
   * Calculate readability score
   */
  private calculateReadabilityScore(text: string): number {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = text.split(/\s+/).filter(w => w.length > 0);
    
    if (sentences.length === 0 || words.length === 0) return 0.5;
    
    const avgWordsPerSentence = words.length / sentences.length;
    const avgCharsPerWord = text.replace(/\s/g, '').length / words.length;
    
    // Simple readability heuristic
    let score = 1.0;
    
    // Penalize very long sentences
    if (avgWordsPerSentence > 25) score -= 0.2;
    if (avgWordsPerSentence > 40) score -= 0.2;
    
    // Penalize very long words
    if (avgCharsPerWord > 8) score -= 0.1;
    if (avgCharsPerWord > 12) score -= 0.2;
    
    // Check for proper sentence structure
    const properSentences = sentences.filter(s => 
      s.trim().length > 10 && /[a-zA-Z]/.test(s)
    ).length;
    
    const structureScore = properSentences / sentences.length;
    score *= structureScore;
    
    return Math.max(Math.min(score, 1.0), 0.0);
  }

  /**
   * Generate reasoning for optimizations
   */
  private generateOptimizationReasoning(
    metrics: OCRQualityMetrics,
    _optimizations: string[]
  ): string {
    const reasons: string[] = [];
    
    if (metrics.confidence < 0.7) {
      reasons.push(`Low OCR confidence (${(metrics.confidence * 100).toFixed(0)}%) requires error-aware processing`);
    }
    
    if (metrics.estimatedErrors > 5) {
      reasons.push(`High estimated error count (${metrics.estimatedErrors}) needs correction guidance`);
    }
    
    if (metrics.hasFormulas) {
      reasons.push('Mathematical content detected, added formula-specific handling');
    }
    
    if (metrics.hasCode) {
      reasons.push('Code content detected, added syntax-aware processing');
    }
    
    if (metrics.textLength > 2000) {
      reasons.push('Long text requires structured processing and increased token limits');
    } else if (metrics.textLength < 50) {
      reasons.push('Short text needs focused, concise processing');
    }
    
    if (metrics.languageConfidence < 0.8) {
      reasons.push('Uncertain language detection requires multi-language support');
    }
    
    if (metrics.readabilityScore < 0.6) {
      reasons.push('Poor readability requires structure and clarity improvements');
    }
    
    return reasons.join('. ') + '.';
  }

  /**
   * Get optimization recommendations
   */
  getOptimizationRecommendations(metrics: OCRQualityMetrics): string[] {
    const recommendations: string[] = [];
    
    if (metrics.confidence < 0.6) {
      recommendations.push('Consider re-scanning with higher quality settings');
    }
    
    if (metrics.estimatedErrors > 10) {
      recommendations.push('Manual review recommended due to high error rate');
    }
    
    if (metrics.readabilityScore < 0.4) {
      recommendations.push('Source document may need preprocessing (rotation, contrast adjustment)');
    }
    
    if (metrics.textLength < 20) {
      recommendations.push('Very short text - consider if full document was captured');
    }
    
    return recommendations;
  }
}

// Singleton instance
export const promptOptimizerService = new PromptOptimizerService();