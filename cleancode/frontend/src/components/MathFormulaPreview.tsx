import React, { useState, useEffect } from 'react';
import { mathFormulaOCR } from '../services/ocr/math-formula-ocr.service';
import type { MathFormula } from '../services/ocr/math-formula-ocr.service';
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';
import './MathFormulaPreview.css';

interface MathFormulaPreviewProps {
  ocrText: string;
}

const MathFormulaPreview: React.FC<MathFormulaPreviewProps> = ({ ocrText }) => {
  const [formulas, setFormulas] = useState<MathFormula[]>([]);
  const [isDetecting, setIsDetecting] = useState(false);
  const [convertedText, setConvertedText] = useState('');
  const [showPreview, setShowPreview] = useState(true); // Default to true if formulas found

  useEffect(() => {
    const detectFormulas = async () => {
      setIsDetecting(true);
      try {
        const result = await mathFormulaOCR.detectFormulas(ocrText);
        setFormulas(result.formulas);
        
        if (result.hasFormulas) {
          // The text returned by detectFormulas is already the "repaired" text with LaTeX
          setConvertedText(result.text);
          setShowPreview(true);
        }
      } catch (error) {
        console.error('Failed to detect formulas:', error);
      } finally {
        setIsDetecting(false);
      }
    };

    detectFormulas();
  }, [ocrText]);

  const copyAllLatex = () => {
    navigator.clipboard.writeText(convertedText);
  };

  if (isDetecting) {
    return (
      <div className="math-preview-loading">
        <div className="spinner-small"></div>
        <span>Analyzing math formulas with AI...</span>
      </div>
    );
  }

  if (formulas.length === 0) {
    return null; // Don't show anything if no math detected
  }

  return (
    <div className="math-formula-preview">
      <div className="math-header">
        <h4>📐 Math Formulas Detected</h4>
        <div className="math-actions">
            <button className="btn-copy-latex" onClick={copyAllLatex}>
                Copy LaTeX
            </button>
            <button
            className="btn-toggle-preview"
            onClick={() => setShowPreview(!showPreview)}
            >
            {showPreview ? 'Hide' : 'Show'}
            </button>
        </div>
      </div>

      {showPreview && (
        <div className="formulas-content">
            {/* Render the full text with mixed math/text */}
            <div className="math-rendered-view">
                {convertedText.split(/(\$\$[\s\S]*?\$\$|\$[^$]+\$)/g).map((part, i) => {
                    if (part.startsWith('$$') && part.endsWith('$$')) {
                        return <BlockMath key={i} math={part.slice(2, -2)} />;
                    } else if (part.startsWith('$') && part.endsWith('$')) {
                        return <InlineMath key={i} math={part.slice(1, -1)} />;
                    } else {
                        return <span key={i}>{part}</span>;
                    }
                })}
            </div>
        </div>
      )}
    </div>
  );
};

export default MathFormulaPreview;
