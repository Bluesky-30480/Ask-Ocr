import React, { useState } from 'react';
import './OcrResultsModal.css';

interface OcrResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  ocrText: string;
  imageData?: string;
  language?: string;
}

type TabType = 'summary' | 'research' | 'ask' | 'actions';

const OcrResultsModal: React.FC<OcrResultsModalProps> = ({
  isOpen,
  onClose,
  ocrText,
  imageData,
  language = 'eng'
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('summary');

  // Close on Escape key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Tab' && !e.shiftKey && !e.ctrlKey) {
        // Cycle through tabs with Tab key
        e.preventDefault();
        const tabs: TabType[] = ['summary', 'research', 'ask', 'actions'];
        const currentIndex = tabs.indexOf(activeTab);
        const nextIndex = (currentIndex + 1) % tabs.length;
        setActiveTab(tabs[nextIndex]);
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, activeTab, onClose]);

  if (!isOpen) return null;

  return (
    <div className="ocr-modal-overlay" onClick={onClose}>
      <div className="ocr-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="ocr-modal-header">
          <h2 className="ocr-modal-title">OCR Results</h2>
          <button 
            className="ocr-modal-close" 
            onClick={onClose}
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="ocr-modal-tabs">
          <button
            className={`ocr-tab ${activeTab === 'summary' ? 'active' : ''}`}
            onClick={() => setActiveTab('summary')}
          >
            Summary
          </button>
          <button
            className={`ocr-tab ${activeTab === 'research' ? 'active' : ''}`}
            onClick={() => setActiveTab('research')}
          >
            Research
          </button>
          <button
            className={`ocr-tab ${activeTab === 'ask' ? 'active' : ''}`}
            onClick={() => setActiveTab('ask')}
          >
            Ask
          </button>
          <button
            className={`ocr-tab ${activeTab === 'actions' ? 'active' : ''}`}
            onClick={() => setActiveTab('actions')}
          >
            Actions
          </button>
        </div>

        {/* Tab Content */}
        <div className="ocr-modal-content">
          {activeTab === 'summary' && (
            <SummaryTab ocrText={ocrText} />
          )}
          {activeTab === 'research' && (
            <ResearchTab ocrText={ocrText} />
          )}
          {activeTab === 'ask' && (
            <AskTab ocrText={ocrText} />
          )}
          {activeTab === 'actions' && (
            <ActionsTab 
              ocrText={ocrText} 
              imageData={imageData}
              language={language}
            />
          )}
        </div>

        {/* Keyboard Shortcuts Help */}
        <div className="ocr-modal-footer">
          <span className="keyboard-hint">
            <kbd>Esc</kbd> Close · <kbd>Tab</kbd> Switch tabs · <kbd>Ctrl+C</kbd> Copy · <kbd>Ctrl+S</kbd> Save
          </span>
        </div>
      </div>
    </div>
  );
};

// Summary Tab Component
const SummaryTab: React.FC<{ ocrText: string }> = ({ ocrText }) => {
  return (
    <div className="tab-content summary-tab">
      <h3>Text Summary</h3>
      <div className="ocr-text-preview">
        <h4>Original OCR Text:</h4>
        <p className="ocr-text">{ocrText}</p>
      </div>
      <div className="summary-placeholder">
        <p>AI summary will appear here...</p>
        <button className="btn-primary">Generate Summary</button>
      </div>
    </div>
  );
};

// Research Tab Component
const ResearchTab: React.FC<{ ocrText: string }> = ({ ocrText }) => {
  // TODO: Use ocrText for web research query
  return (
    <div className="tab-content research-tab">
      <h3>Web Research</h3>
      <div className="research-placeholder">
        <p>Web search results for: "{ocrText.slice(0, 50)}..."</p>
        <button className="btn-primary">Search Web</button>
      </div>
    </div>
  );
};

// Ask Tab Component
const AskTab: React.FC<{ ocrText: string }> = ({ ocrText }) => {
  const [question, setQuestion] = useState('');

  // TODO: Send question + ocrText to AI service
  console.log('OCR Context:', ocrText);

  return (
    <div className="tab-content ask-tab">
      <h3>Ask AI</h3>
      <div className="ask-input-section">
        <textarea
          className="ask-input"
          placeholder="Ask a question about the OCR text..."
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          rows={3}
        />
        <button className="btn-primary" disabled={!question.trim()}>
          Ask Question
        </button>
      </div>
      <div className="ask-response-section">
        <p className="placeholder-text">AI response will appear here...</p>
      </div>
    </div>
  );
};

// Actions Tab Component
interface ActionsTabProps {
  ocrText: string;
  imageData?: string;
  language: string;
}

const ActionsTab: React.FC<ActionsTabProps> = ({ ocrText, imageData, language }) => {
  const handleCopy = () => {
    navigator.clipboard.writeText(ocrText);
    // TODO: Show toast notification
  };

  // TODO: Use imageData for highlight feature
  // TODO: Use language for translation feature
  console.log('Image data available:', !!imageData, 'Language:', language);

  return (
    <div className="tab-content actions-tab">
      <h3>Actions</h3>
      <div className="actions-grid">
        <button className="action-btn" onClick={handleCopy}>
          <span className="action-icon">📋</span>
          <span>Copy Text</span>
        </button>
        <button className="action-btn">
          <span className="action-icon">💾</span>
          <span>Save to History</span>
        </button>
        <button className="action-btn">
          <span className="action-icon">📄</span>
          <span>Export as TXT</span>
        </button>
        <button className="action-btn">
          <span className="action-icon">📑</span>
          <span>Export as PDF</span>
        </button>
        <button className="action-btn">
          <span className="action-icon">🌐</span>
          <span>Translate</span>
        </button>
        <button className="action-btn">
          <span className="action-icon">🔍</span>
          <span>Highlight in Image</span>
        </button>
      </div>
    </div>
  );
};

export default OcrResultsModal;
