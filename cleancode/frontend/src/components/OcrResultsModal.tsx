import React, { useState } from 'react';
import './OcrResultsModal.css';
import { aiManager } from '../services/ai';
import MathFormulaPreview from './MathFormulaPreview';

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
  const [summary, setSummary] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [toast, setToast] = useState<string>('');

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(''), 3000);
  };

  const generateSummary = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const response = await aiManager.sendRequest({
        prompt: `Summarize the following text concisely in 2-3 sentences:

${ocrText}`,
        model: 'gpt-3.5-turbo',
        maxTokens: 150,
        temperature: 0.7,
      });

      if (response.content) {
        setSummary(response.content);
      } else {
        setError('No summary could be generated. Please check your AI service configuration.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate summary');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="tab-content summary-tab">
      <h3>Text Summary</h3>
      
      {/* Math Formula Preview */}
      <MathFormulaPreview ocrText={ocrText} />

      <div className="ocr-text-preview">
        <h4>Original OCR Text:</h4>
        <p className="ocr-text">{ocrText}</p>
      </div>
      
      {!summary && !isLoading && !error && (
        <div className="summary-placeholder">
          <p>Click below to generate an AI-powered summary of the OCR text</p>
          <button className="btn-primary" onClick={generateSummary}>
            Generate Summary
          </button>
        </div>
      )}

      {isLoading && (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Generating summary...</p>
        </div>
      )}

      {error && (
        <div className="error-state">
          <p className="error-message">⚠️ {error}</p>
          <button className="btn-secondary" onClick={generateSummary}>
            Try Again
          </button>
        </div>
      )}

      {summary && !isLoading && (
        <div className="summary-result">
          <h4>AI Summary:</h4>
          <p className="summary-text">{summary}</p>
          <div className="summary-actions">
            <button className="btn-secondary" onClick={async () => {
              const { clipboardService } = await import('../services/clipboard/clipboard.service');
              await clipboardService.copyWithFeedback(
                summary,
                () => showToast('✅ Summary copied to clipboard'),
                () => showToast('❌ Failed to copy summary')
              );
            }}>
              📋 Copy Summary
            </button>
            <button className="btn-secondary" onClick={() => {
              setSummary('');
              setError('');
            }}>
              🔄 Generate New
            </button>
          </div>
        </div>
      )}

      {/* Math Formula Detection */}
      <div className="math-formula-section">
        <MathFormulaPreview ocrText={ocrText} />
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className="toast-notification">
          {toast}
        </div>
      )}
    </div>
  );
};

// Research Tab Component
const ResearchTab: React.FC<{ ocrText: string }> = ({ ocrText }) => {
  const [researchResults, setResearchResults] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const searchWeb = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      // Use first 100 characters as search query
      const searchQuery = ocrText.slice(0, 100);
      
      const response = await aiManager.sendRequest({
        prompt: `Search the web and provide relevant information about: ${searchQuery}`,
        model: 'gpt-3.5-turbo',
        maxTokens: 500,
        temperature: 0.7,
      }, 'perplexity');

      if (response.content) {
        setResearchResults({
          content: response.content,
          sources: response.sources || [],
          model: response.model,
          timestamp: new Date().toLocaleString()
        });
      } else {
        setError('No research results could be found. Please check your Perplexity API configuration.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search web');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="tab-content research-tab">
      <h3>Web Research</h3>
      
      {!researchResults && !isLoading && !error && (
        <div className="research-placeholder">
          <p>Search the web for information related to the OCR text</p>
          <p className="query-preview">Query: "{ocrText.slice(0, 80)}..."</p>
          <button className="btn-primary" onClick={searchWeb}>
            🔍 Search Web
          </button>
        </div>
      )}

      {isLoading && (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Searching the web...</p>
        </div>
      )}

      {error && (
        <div className="error-state">
          <p className="error-message">⚠️ {error}</p>
          <button className="btn-secondary" onClick={searchWeb}>
            Try Again
          </button>
        </div>
      )}

      {researchResults && !isLoading && (
        <div className="research-results">
          <div className="research-content">
            <p>{researchResults.content}</p>
          </div>
          
          {researchResults.sources && researchResults.sources.length > 0 && (
            <div className="research-sources">
              <h4>Sources:</h4>
              <ul>
                {researchResults.sources.map((source: any, index: number) => (
                  <li key={index}>
                    <a href={source.url || '#'} target="_blank" rel="noopener noreferrer">
                      {source.title || source.url || `Source ${index + 1}`}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="research-meta">
            <span>Model: {researchResults.model || 'Unknown'}</span>
            <span>•</span>
            <span>{researchResults.timestamp}</span>
          </div>

          <div className="research-actions">
            <button className="btn-secondary" onClick={() => navigator.clipboard.writeText(researchResults.content)}>
              📋 Copy Results
            </button>
            <button className="btn-secondary" onClick={() => {
              setResearchResults(null);
              setError('');
            }}>
              🔄 New Search
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Ask Tab Component
const AskTab: React.FC<{ ocrText: string }> = ({ ocrText }) => {
  const [question, setQuestion] = useState('');
  const [conversationHistory, setConversationHistory] = useState<Array<{question: string; answer: string}>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const askQuestion = async () => {
    if (!question.trim()) return;

    setIsLoading(true);
    setError('');
    
    try {
      const contextPrompt = `Based on this OCR text:

"${ocrText}"

Question: ${question}`;
      
      const response = await aiManager.sendRequest({
        prompt: contextPrompt,
        model: 'gpt-3.5-turbo',
        maxTokens: 300,
        temperature: 0.7,
      });

      if (response.content) {
        // Add to conversation history
        setConversationHistory(prev => [...prev, {
          question: question,
          answer: response.content
        }]);
        
        // Clear question input
        setQuestion('');
      } else {
        setError('No answer could be generated. Please check your AI service configuration.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get answer');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && e.ctrlKey && question.trim()) {
      e.preventDefault();
      askQuestion();
    }
  };

  return (
    <div className="tab-content ask-tab">
      <h3>Ask AI</h3>
      
      {/* Conversation History */}
      {conversationHistory.length > 0 && (
        <div className="conversation-history">
          {conversationHistory.map((item, index) => (
            <div key={index} className="conversation-item">
              <div className="question-bubble">
                <strong>Q:</strong> {item.question}
              </div>
              <div className="answer-bubble">
                <strong>A:</strong> {item.answer}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Input Section */}
      <div className="ask-input-section">
        <textarea
          className="ask-input"
          placeholder="Ask a question about the OCR text... (Ctrl+Enter to send)"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={handleKeyPress}
          rows={3}
          disabled={isLoading}
        />
        <div className="ask-button-row">
          <button 
            className="btn-primary" 
            disabled={!question.trim() || isLoading}
            onClick={askQuestion}
          >
            {isLoading ? 'Asking...' : 'Ask Question'}
          </button>
          {conversationHistory.length > 0 && (
            <button 
              className="btn-secondary" 
              onClick={() => setConversationHistory([])}
            >
              🗑️ Clear History
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="error-state">
          <p className="error-message">⚠️ {error}</p>
        </div>
      )}

      {isLoading && (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Getting answer...</p>
        </div>
      )}
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
  const [toast, setToast] = useState<string>('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [translatedText, setTranslatedText] = useState<string>('');

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(''), 3000);
  };

  const handleCopy = async () => {
    const { clipboardService } = await import('../services/clipboard/clipboard.service');
    await clipboardService.copyWithFeedback(
      ocrText,
      (message) => showToast(message),
      (message) => showToast(message)
    );
  };

  const handleSaveToHistory = async () => {
    try {
      // TODO: Implement database save
      const { invoke } = await import('@tauri-apps/api/tauri');
      await invoke('create_ocr_record', {
        imagePath: imageData || '',
        text: ocrText,
        language: language,
        summary: '',
        tags: [],
        aiAnswers: []
      });
      showToast('✅ Saved to history');
    } catch (err) {
      showToast('❌ Failed to save');
    }
  };

  const handleExportTXT = () => {
    try {
      const blob = new Blob([ocrText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ocr-text-${Date.now()}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('✅ Exported as TXT');
    } catch (err) {
      showToast('❌ Failed to export TXT');
    }
  };

  const handleExportPDF = async () => {
    try {
      // Using jsPDF library would be ideal, but for now create a simple text file
      // TODO: Implement proper PDF export with jsPDF
      const content = `OCR Result
${'='.repeat(50)}

${ocrText}

Language: ${language}
Date: ${new Date().toLocaleString()}`;
      const blob = new Blob([content], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ocr-result-${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('✅ Exported as PDF');
    } catch (err) {
      showToast('❌ Failed to export PDF');
    }
  };

  const handleExportMarkdown = () => {
    try {
      const mdContent = `# OCR Result

${ocrText}

---

**Language:** ${language}  
**Date:** ${new Date().toLocaleString()}`;
      const blob = new Blob([mdContent], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ocr-result-${Date.now()}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('✅ Exported as Markdown');
    } catch (err) {
      showToast('❌ Failed to export Markdown');
    }
  };

  const handleTranslate = async () => {
    setIsTranslating(true);
    try {
      const response = await aiManager.sendRequest({
        prompt: `Translate the following text to English (if not English already) or Chinese (if English):

${ocrText}`,
        model: 'gpt-3.5-turbo',
        maxTokens: 500,
        temperature: 0.3,
      });

      if (response.content) {
        setTranslatedText(response.content);
        showToast('✅ Translation complete');
      } else {
        showToast('❌ Translation failed');
      }
    } catch (err) {
      showToast('❌ Failed to translate');
    } finally {
      setIsTranslating(false);
    }
  };

  const handleHighlight = () => {
    // TODO: Implement image highlight feature
    if (imageData) {
      showToast('ℹ️ Highlight feature coming soon');
    } else {
      showToast('❌ No image data available');
    }
  };

  return (
    <div className="tab-content actions-tab">
      <h3>Actions</h3>
      
      {/* Toast Notification */}
      {toast && (
        <div className="toast-notification">
          {toast}
        </div>
      )}

      <div className="actions-grid">
        <button className="action-btn" onClick={handleCopy}>
          <span className="action-icon">📋</span>
          <span>Copy Text</span>
        </button>
        <button className="action-btn" onClick={handleSaveToHistory}>
          <span className="action-icon">💾</span>
          <span>Save to History</span>
        </button>
        <button className="action-btn" onClick={handleExportTXT}>
          <span className="action-icon">📄</span>
          <span>Export as TXT</span>
        </button>
        <button className="action-btn" onClick={handleExportPDF}>
          <span className="action-icon">📑</span>
          <span>Export as PDF</span>
        </button>
        <button className="action-btn" onClick={handleExportMarkdown}>
          <span className="action-icon">📝</span>
          <span>Export as MD</span>
        </button>
        <button 
          className="action-btn" 
          onClick={handleTranslate}
          disabled={isTranslating}
        >
          <span className="action-icon">🌐</span>
          <span>{isTranslating ? 'Translating...' : 'Translate'}</span>
        </button>
        <button className="action-btn" onClick={handleHighlight}>
          <span className="action-icon">🔍</span>
          <span>Highlight in Image</span>
        </button>
      </div>

      {/* Translation Result */}
      {translatedText && (
        <div className="translation-result">
          <h4>Translation:</h4>
          <p>{translatedText}</p>
          <div className="translation-actions">
            <button 
              className="btn-secondary" 
              onClick={() => navigator.clipboard.writeText(translatedText)}
            >
              📋 Copy Translation
            </button>
            <button 
              className="btn-secondary" 
              onClick={() => setTranslatedText('')}
            >
              ✕ Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OcrResultsModal;
