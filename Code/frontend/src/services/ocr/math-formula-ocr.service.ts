/**
 * Math Formula OCR Service
 * Detects and converts mathematical formulas from OCR text to LaTeX
 */

export interface MathFormula {
  original: string;
  latex: string;
  position: { start: number; end: number };
  confidence: number;
  type: 'inline' | 'display';
}

export interface MathOCRResult {
  text: string;
  formulas: MathFormula[];
  hasFormulas: boolean;
}

export class MathFormulaOCRService {
  /**
   * Detect and extract mathematical formulas from OCR text
   */
  async detectFormulas(text: string): Promise<MathOCRResult> {
    // Check if text contains mathematical content
    if (!this.hasMathematicalContent(text)) {
      return {
        text,
        formulas: [],
        hasFormulas: false,
      };
    }

    // Extract formulas using various methods
    const detectedFormulas = [
      ...this.extractExplicitFormulas(text),
      ...this.extractImplicitFormulas(text),
    ];

    // Remove duplicates and sort by position
    const uniqueFormulas = this.deduplicateFormulas(detectedFormulas);
    
    return {
      text,
      formulas: uniqueFormulas,
      hasFormulas: uniqueFormulas.length > 0,
    };
  }

  /**
   * Convert mathematical expression to LaTeX
   */
  convertToLaTeX(expression: string): string {
    let latex = expression;

    // Convert superscripts (x^2 → x^{2})
    latex = latex.replace(/\^(\d+|[a-z])/gi, '^{$1}');
    
    // Convert subscripts (x_1 → x_{1})
    latex = latex.replace(/_(\d+|[a-z])/gi, '_{$1}');
    
    // Convert fractions (1/2 → \frac{1}{2})
    latex = latex.replace(/(\d+)\/(\d+)/g, '\\frac{$1}{$2}');
    
    // Convert square roots (√x → \sqrt{x})
    latex = latex.replace(/√(\d+|\([^)]+\))/g, (_match, content) => {
      const inner = content.startsWith('(') ? content.slice(1, -1) : content;
      return `\\sqrt{${inner}}`;
    });
    
    // Convert exponents (e^x → e^{x})
    latex = latex.replace(/e\^([^\s]+)/gi, 'e^{$1}');
    
    // Convert mathematical symbols
    latex = latex.replace(/∫/g, '\\int');
    latex = latex.replace(/∑/g, '\\sum');
    latex = latex.replace(/∏/g, '\\prod');
    latex = latex.replace(/∞/g, '\\infty');
    latex = latex.replace(/±/g, '\\pm');
    latex = latex.replace(/×/g, '\\times');
    latex = latex.replace(/÷/g, '\\div');
    latex = latex.replace(/≤/g, '\\leq');
    latex = latex.replace(/≥/g, '\\geq');
    latex = latex.replace(/≠/g, '\
eq');
    latex = latex.replace(/≈/g, '\\approx');
    
    // Convert Greek letters
    latex = latex.replace(/\balpha\b/gi, '\\alpha');
    latex = latex.replace(/\bbeta\b/gi, '\\beta');
    latex = latex.replace(/\bgamma\b/gi, '\\gamma');
    latex = latex.replace(/\bdelta\b/gi, '\\delta');
    latex = latex.replace(/\bepsilon\b/gi, '\\epsilon');
    latex = latex.replace(/\btheta\b/gi, '\\theta');
    latex = latex.replace(/\blambda\b/gi, '\\lambda');
    latex = latex.replace(/\bmu\b/gi, '\\mu');
    latex = latex.replace(/\bpi\b/gi, '\\pi');
    latex = latex.replace(/\bsigma\b/gi, '\\sigma');
    latex = latex.replace(/\bomega\b/gi, '\\omega');

    return latex;
  }

  /**
   * Convert OCR text with formulas to LaTeX document
   */
  convertTextWithFormulasToLaTeX(text: string, formulas: MathFormula[]): string {
    let result = text;
    
    // Sort formulas by position (reverse order to maintain indices)
    const sortedFormulas = [...formulas].sort((a, b) => b.position.start - a.position.start);
    
    // Replace each formula with LaTeX
    for (const formula of sortedFormulas) {
      const before = result.substring(0, formula.position.start);
      const after = result.substring(formula.position.end);
      
      const latexFormula = formula.type === 'display'
        ? `$$${formula.latex}$$`
        : `$${formula.latex}$`;
      
      result = before + latexFormula + after;
    }
    
    return result;
  }

  /**
   * Check if text contains mathematical content
   */
  private hasMathematicalContent(text: string): boolean {
    // Check for mathematical symbols
    const mathSymbols = /[∫∑∏±×÷≤≥≠≈√∞^_]/;
    if (mathSymbols.test(text)) return true;

    // Check for equations
    const equationPattern = /[a-z0-9]\s*[+\-*/=]\s*[a-z0-9]/i;
    if (equationPattern.test(text)) return true;

    // Check for fractions
    const fractionPattern = /\d+\/\d+/;
    if (fractionPattern.test(text)) return true;

    // Check for exponents
    const exponentPattern = /[a-z]\^[0-9]/i;
    if (exponentPattern.test(text)) return true;

    return false;
  }

  /**
   * Extract explicitly marked formulas (between delimiters)
   */
  private extractExplicitFormulas(text: string): MathFormula[] {
    const formulas: MathFormula[] = [];

    // LaTeX-style delimiters: $...$ or $$...$$
    const displayMathRegex = /\$\$([^$]+)\$\$/g;
    const inlineMathRegex = /\$([^$]+)\$/g;

    // Display math
    let match;
    while ((match = displayMathRegex.exec(text)) !== null) {
      formulas.push({
        original: match[1],
        latex: match[1],
        position: { start: match.index, end: match.index + match[0].length },
        confidence: 1.0,
        type: 'display',
      });
    }

    // Inline math
    while ((match = inlineMathRegex.exec(text)) !== null) {
      formulas.push({
        original: match[1],
        latex: match[1],
        position: { start: match.index, end: match.index + match[0].length },
        confidence: 1.0,
        type: 'inline',
      });
    }

    return formulas;
  }

  /**
   * Extract implicit formulas (detected patterns)
   */
  private extractImplicitFormulas(text: string): MathFormula[] {
    const formulas: MathFormula[] = [];

    // Detect quadratic equations: ax^2 + bx + c = 0
    const quadraticRegex = /([a-z])\^2\s*[+\-]\s*\d*[a-z]\s*[+\-]\s*\d+\s*=\s*0/gi;
    let match;
    while ((match = quadraticRegex.exec(text)) !== null) {
      const latex = this.convertToLaTeX(match[0]);
      formulas.push({
        original: match[0],
        latex,
        position: { start: match.index, end: match.index + match[0].length },
        confidence: 0.9,
        type: 'inline',
      });
    }

    // Detect fractions
    const fractionRegex = /\d+\/\d+/g;
    while ((match = fractionRegex.exec(text)) !== null) {
      const latex = this.convertToLaTeX(match[0]);
      formulas.push({
        original: match[0],
        latex,
        position: { start: match.index, end: match.index + match[0].length },
        confidence: 0.95,
        type: 'inline',
      });
    }

    // Detect expressions with superscripts
    const superscriptRegex = /[a-z]\^[0-9]+/gi;
    while ((match = superscriptRegex.exec(text)) !== null) {
      const latex = this.convertToLaTeX(match[0]);
      formulas.push({
        original: match[0],
        latex,
        position: { start: match.index, end: match.index + match[0].length },
        confidence: 0.85,
        type: 'inline',
      });
    }

    // Detect square roots
    const sqrtRegex = /√\d+/g;
    while ((match = sqrtRegex.exec(text)) !== null) {
      const latex = this.convertToLaTeX(match[0]);
      formulas.push({
        original: match[0],
        latex,
        position: { start: match.index, end: match.index + match[0].length },
        confidence: 0.9,
        type: 'inline',
      });
    }

    return formulas;
  }

  /**
   * Remove duplicate formulas
   */
  private deduplicateFormulas(formulas: MathFormula[]): MathFormula[] {
    const unique = new Map<string, MathFormula>();

    for (const formula of formulas) {
      const key = `${formula.position.start}-${formula.position.end}`;
      const existing = unique.get(key);

      if (!existing || formula.confidence > existing.confidence) {
        unique.set(key, formula);
      }
    }

    return Array.from(unique.values()).sort((a, b) => a.position.start - b.position.start);
  }

  /**
   * Validate LaTeX syntax (basic validation)
   */
  validateLaTeX(latex: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check balanced braces
    const openBraces = (latex.match(/\{/g) || []).length;
    const closeBraces = (latex.match(/\}/g) || []).length;
    if (openBraces !== closeBraces) {
      errors.push('Unbalanced braces');
    }

    // Check balanced parentheses
    const openParens = (latex.match(/\(/g) || []).length;
    const closeParens = (latex.match(/\)/g) || []).length;
    if (openParens !== closeParens) {
      errors.push('Unbalanced parentheses');
    }

    // Check balanced brackets
    const openBrackets = (latex.match(/\[/g) || []).length;
    const closeBrackets = (latex.match(/\]/g) || []).length;
    if (openBrackets !== closeBrackets) {
      errors.push('Unbalanced brackets');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Preview formulas with common examples
   */
  getCommonFormulas(): Array<{ name: string; latex: string; description: string }> {
    return [
      {
        name: 'Quadratic Formula',
        latex: 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}',
        description: 'Solution to ax² + bx + c = 0',
      },
      {
        name: 'Pythagorean Theorem',
        latex: 'a^2 + b^2 = c^2',
        description: 'Relationship in right triangles',
      },
      {
        name: 'Euler\'s Identity',
        latex: 'e^{i\\pi} + 1 = 0',
        description: 'Most beautiful equation',
      },
      {
        name: 'Integral',
        latex: '\\int_a^b f(x)dx',
        description: 'Definite integral',
      },
      {
        name: 'Summation',
        latex: '\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}',
        description: 'Sum of first n integers',
      },
      {
        name: 'Derivative',
        latex: '\\frac{d}{dx}(x^n) = nx^{n-1}',
        description: 'Power rule',
      },
    ];
  }
}

// Singleton instance
export const mathFormulaOCR = new MathFormulaOCRService();
