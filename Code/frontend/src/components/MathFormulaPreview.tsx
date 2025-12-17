import React, { useState, useEffect } from 'react';
import { mathFormulaOCR } from '../services/ocr/math-formula-ocr.service';
import type { MathFormula } from '../services/ocr/math-formula-ocr.service';
import './MathFormulaPreview.css';

interface MathFormulaPreviewProps {
  ocrText: string;
}

const MathFormulaPreview: React.FC<MathFormulaPreviewProps> = ({ ocrText }) => {
  const [formulas, setFormulas] = useState<MathFormula[]>([]);
  const [isDetecting, setIsDetecting] = useState(false);
  const [convertedText, setConvertedText] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    detectFormulas();
  }, [ocrText]);

  const detectFormulas = async () => {
    setIsDetecting(true);
    try {
      const result = await mathFormulaOCR.detectFormulas(ocrText);
      setFormulas(result.formulas);
      
      if (result.hasFormulas) {
        const latexText = mathFormulaOCR.convertTextWithFormulasToLaTeX(
          result.text,
          result.formulas
        );
        setConvertedText(latexText);
      }
    } catch (error) {
      console.error('Failed to detect formulas:', error);
    } finally {
      setIsDetecting(false);
    }
  };

  const copyLatex = (latex: string) => {
    navigator.clipboard.writeText(latex);
    // Could add toast notification here
  };

  const copyAllLatex = () => {
    navigator.clipboard.writeText(convertedText);
  };

  if (isDetecting) {
    return (
      <div className="math-preview-loading">
        <div className="spinner-small"></div>
        <span>Detecting mathematical formulas...</span>
      </div>
    );
  }

  if (formulas.length === 0) {
    return (
      <div className="math-preview-empty">
        <p>ℹ️ No mathematical formulas detected in the OCR text.</p>
        <details className="math-help">
          <summary>Supported Math Symbols</summary>
          <div className="math-symbols-grid">
            <div><code>^</code> Superscript (x^2)</div>
            <div><code>_</code> Subscript (x_1)</div>
            <div><code>/</code> Fraction (1/2)</div>
            <div><code>√</code> Square root</div>
            <div><code>∫</code> Integral</div>
            <div><code>∑</code> Summation</div>
            <div><code>±</code> Plus-minus</div>
            <div><code>×</code> Multiply</div>
            <div><code>≤ ≥</code> Inequalities</div>
          </div>
        </details>
      </div>
    );
  }

  return (
    <div className="math-formula-preview">
      <div className="math-header">
        <h4>📐 Detected Formulas ({formulas.length})</h4>
        <button
          className="btn-toggle-preview"
          onClick={() => setShowPreview(!showPreview)}
        >
          {showPreview ? '🔼 Hide Preview' : '🔽 Show Preview'}
        </button>
      </div>

      {showPreview && (
        <>
          {/* Individual Formulas */}
          <div className="formulas-list">
            {formulas.map((formula, index) => (
              <div key={index} className="formula-item">
                <div className="formula-header">
                  <span className="formula-index">#{index + 1}</span>
                  <span className="formula-type">{formula.type}</span>
                </div>
                
                <div className="formula-content">
                  <div className="formula-section">
                    <label>Original:</label>
                    <code>{formula.original}</code>
                  </div>
                  
                  <div className="formula-section">
                    <label>LaTeX:</label>
                    <div className="latex-display">
                      <code>{formula.latex}</code>
                      <button
                        className="btn-copy-small"
                        onClick={() => copyLatex(formula.latex)}
                        title="Copy LaTeX"
                      >
                        📋
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Converted Text with LaTeX */}
          <div className="converted-text-section">
            <div className="section-header">
              <h5>Full Text with LaTeX Formulas</h5>
              <button
                className="btn-secondary"
                onClick={copyAllLatex}
              >
                📋 Copy All LaTeX
              </button>
            </div>
            <pre className="latex-preview">{convertedText}</pre>
          </div>

          {/* Common Formulas Reference */}
          <details className="common-formulas">
            <summary>📚 Common Formula Examples</summary>
            <div className="formula-examples">
              {mathFormulaOCR.getCommonFormulas().map((example, index) => (
                <div key={index} className="example-item">
                  <strong>{example.name}:</strong>
                  <code>{example.latex}</code>
                  <span className="example-desc">{example.description}</span>
                </div>
              ))}
            </div>
          </details>
        </>
      )}
    </div>
  );
};

export default MathFormulaPreview;
