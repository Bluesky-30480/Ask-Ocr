/**
 * Universal AI Assistant - Floating Window Component
 * Context-aware AI assistant accessible from any application
 */

import React, { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { appWindow } from '@tauri-apps/api/window';
import {
  activeWindowContext,
  type ApplicationContext,
  type ApplicationType,
} from '../../services/context/active-window-context.service';
import {
  contextAwareRouting,
  type RoutingDecision,
} from '../../services/context/context-aware-routing.service';
import { universalAI } from '../../services/ai/universal-ai.service';
import './UniversalAssistant.css';

import { screenshotManager } from '../../services/shortcuts/screenshot-manager.service';
import type { AIAttachment } from '@shared/types/ai.types';
import { FileSearch } from './FileSearch';
import { fileSearchService, type SearchResult } from '../../services/file-search.service';

import { FileOperationsPreview, type FileOperation } from './FileOperationsPreview';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  attachments?: AIAttachment[];
}

const APP_TYPE_ICONS: Record<ApplicationType, string> = {
  browser: '🌐',
  'code-editor': '💻',
  'office-word': '📝',
  'office-excel': '📊',
  'office-powerpoint': '📽️',
  email: '✉️',
  'pdf-reader': '📄',
  'file-explorer': '📁',
  terminal: '⚡',
  'text-editor': '📃',
  'image-editor': '🎨',
  'video-player': '🎬',
  chat: '💬',
  unknown: '❓',
};

const APP_TYPE_LABELS: Record<ApplicationType, string> = {
  browser: 'Web Research',
  'code-editor': 'Code Assistant',
  'office-word': 'Writing Helper',
  'office-excel': 'Data Analysis',
  'office-powerpoint': 'Presentation',
  email: 'Email Assistant',
  'pdf-reader': 'Document Reader',
  'file-explorer': 'File Manager',
  terminal: 'Terminal Helper',
  'text-editor': 'Text Editor',
  'image-editor': 'Image Editor',
  'video-player': 'Media Player',
  chat: 'Chat Assistant',
  unknown: 'General Assistant',
};

export const UniversalAssistant: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 100, y: 100 });
  const [_size, _setSize] = useState({ width: 400, height: 500 });
  const [context, setContext] = useState<ApplicationContext | null>(null);
  const [routing, setRouting] = useState<RoutingDecision | null>(null);
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  // const [showSettings, setShowSettings] = useState(false);
  const [attachments, setAttachments] = useState<AIAttachment[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [showFileSearch, setShowFileSearch] = useState(false);
  const [pendingOperations, setPendingOperations] = useState<FileOperation[]>([]);
  const [isExecutingOps, setIsExecutingOps] = useState(false);

  const dragRef = useRef<{ startX: number; startY: number } | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize AI service
  useEffect(() => {
    const initializeAI = async () => {
      try {
        // Load all API keys from local storage
        const openaiKey = localStorage.getItem('openai_api_key');
        const geminiKey = localStorage.getItem('gemini_api_key');
        const anthropicKey = localStorage.getItem('anthropic_api_key');
        const deepseekKey = localStorage.getItem('deepseek_api_key');
        const grokKey = localStorage.getItem('grok_api_key');
        const perplexityKey = localStorage.getItem('perplexity_api_key');
        
        await universalAI.initialize({ 
          openaiApiKey: openaiKey || undefined,
          geminiApiKey: geminiKey || undefined,
          claudeApiKey: anthropicKey || undefined,
          deepseekApiKey: deepseekKey || undefined,
          grokApiKey: grokKey || undefined,
          perplexityApiKey: perplexityKey || undefined
        });
        
        // Test connections
        const status = await universalAI.getProviderStatus();
        console.log('AI Provider Status:', status);
      } catch (error) {
        console.error('Failed to initialize AI service:', error);
      }
    };

    initializeAI();
  }, []);

  // Initialize context monitoring
  useEffect(() => {
    activeWindowContext.startMonitoring();

    const handleContextChange = (newContext: ApplicationContext) => {
      setContext(newContext);
      
      // Update routing decision
      const decision = contextAwareRouting.route(newContext);
      setRouting(decision);
    };

    activeWindowContext.addListener(handleContextChange);

    // Initial detection
    activeWindowContext.detectContext().then((ctx) => {
      setContext(ctx);
      const decision = contextAwareRouting.route(ctx);
      setRouting(decision);
    });

    return () => {
      activeWindowContext.removeListener(handleContextChange);
      activeWindowContext.stopMonitoring();
    };
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Register global hotkey (Ctrl+Shift+A)
  useEffect(() => {
    const registerHotkey = async () => {
      try {
        await invoke('register_shortcut', {
          id: 'universal-assistant',
          shortcut: 'Ctrl+Shift+A',
          description: 'Toggle Universal AI Assistant',
        });
      } catch (error) {
        console.error('Failed to register hotkey:', error);
      }
    };

    registerHotkey();

    // Listen for hotkey events
    const unlisten = appWindow.listen('shortcut-pressed', (event: any) => {
      if (event.payload.id === 'universal-assistant') {
        setIsVisible((prev) => !prev);
      }
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  // Handle window visibility
  useEffect(() => {
    if (isVisible) {
      appWindow.setAlwaysOnTop(true);
      appWindow.setFocus();
      inputRef.current?.focus();

      // Refresh context with text capture when opening
      activeWindowContext.detectContext({ captureSelectedText: true }).then((ctx) => {
        setContext(ctx);
        const decision = contextAwareRouting.route(ctx);
        setRouting(decision);
      });
    } else {
      appWindow.setAlwaysOnTop(false);
    }
  }, [isVisible]);

  // Handle dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.drag-handle')) {
      setIsDragging(true);
      dragRef.current = {
        startX: e.clientX - position.x,
        startY: e.clientY - position.y,
      };
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging && dragRef.current) {
      setPosition({
        x: e.clientX - dragRef.current.startX,
        y: e.clientY - dragRef.current.startY,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    dragRef.current = null;
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging]);

  const handleCaptureWindow = async () => {
    setIsCapturing(true);
    // Hide assistant window temporarily to capture the underlying window
    setIsVisible(false);
    
    // Wait for window to hide
    setTimeout(async () => {
      try {
        const result = await screenshotManager.captureWindow();
        if (result.success && result.imageData) {
          const newAttachment: AIAttachment = {
            type: 'image',
            data: result.imageData,
            mimeType: 'image/png',
            filename: `screenshot_${Date.now()}.png`
          };
          setAttachments(prev => [...prev, newAttachment]);
        }
      } catch (error) {
        console.error('Failed to capture window:', error);
      } finally {
        setIsVisible(true);
        setIsCapturing(false);
      }
    }, 300);
  };

  const handleCaptureRegion = async () => {
    setIsCapturing(true);
    setIsVisible(false);
    
    try {
      // Use native region capture if available, or custom overlay
      // For now, let's use the custom overlay flow
      await screenshotManager.showOverlay(async (region) => {
        const result = await screenshotManager.captureRegion(region);
        if (result.success && result.imageData) {
          const newAttachment: AIAttachment = {
            type: 'image',
            data: result.imageData,
            mimeType: 'image/png',
            filename: `region_${Date.now()}.png`
          };
          setAttachments(prev => [...prev, newAttachment]);
        }
        setIsVisible(true);
        setIsCapturing(false);
        await screenshotManager.hideOverlay();
      });
    } catch (error) {
      console.error('Failed to capture region:', error);
      setIsVisible(true);
      setIsCapturing(false);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleFileSelect = async (files: SearchResult[]) => {
    setShowFileSearch(false);
    setIsLoading(true);

    try {
      const newAttachments: AIAttachment[] = [];
      
      for (const file of files) {
        if (file.is_dir) continue;
        
        try {
          const content = await fileSearchService.readFileContent(file.path);
          const metadata = await fileSearchService.getFileMetadata(file.path);
          
          newAttachments.push({
            type: 'document',
            data: content,
            mimeType: metadata.mime_type || 'text/plain',
            filename: file.name,
            metadata: { ...metadata, path: file.path } as any
          });
        } catch (e) {
          console.error(`Failed to read file ${file.name}:`, e);
        }
      }
      
      setAttachments(prev => [...prev, ...newAttachments]);
    } catch (error) {
      console.error('Failed to process files:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const executeFileOperations = async () => {
    setIsExecutingOps(true);
    try {
      const results: string[] = [];
      for (const op of pendingOperations) {
        if (op.type === 'rename') {
          try {
            await invoke('rename_file', { path: op.path, newName: op.newName });
            results.push(`✅ Renamed ${op.originalName} to ${op.newName}`);
          } catch (e) {
            results.push(`❌ Failed to rename ${op.originalName}: ${e}`);
          }
        }
      }
      
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Operation completed:\n${results.join('\n')}`,
        timestamp: Date.now()
      }]);
      
      setPendingOperations([]);
    } catch (error) {
      console.error('Failed to execute operations:', error);
    } finally {
      setIsExecutingOps(false);
    }
  };

  // Handle query submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!query.trim() && attachments.length === 0) || !context) return;

    const userMessage: Message = {
      role: 'user',
      content: query,
      timestamp: Date.now(),
      attachments: [...attachments]
    };

    setMessages((prev) => [...prev, userMessage]);
    setQuery('');
    setAttachments([]);
    setIsLoading(true);

    try {
      // Send to Universal AI service with context-aware routing
      const response = await universalAI.sendRequest({
        query: userMessage.content,
        context,
        conversationHistory: messages.map((m) => ({ 
          role: m.role, 
          content: m.content 
        })),
        attachments: userMessage.attachments
      });

      const assistantMessage: Message = {
        role: 'assistant',
        content: response.content,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      
      // Check for file operations in the response
      const jsonMatch = response.content.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        try {
          const data = JSON.parse(jsonMatch[1]);
          if (data.operations && Array.isArray(data.operations)) {
            const ops: FileOperation[] = [];
            
            for (const op of data.operations) {
              if (op.type === 'rename' && op.originalName && op.newName) {
                // Find the file in the attachments to get the full path
                const attachment = userMessage.attachments?.find(a => a.filename === op.originalName);
                if (attachment && attachment.metadata && attachment.metadata.path) {
                  ops.push({
                    type: 'rename',
                    path: attachment.metadata.path,
                    originalName: op.originalName,
                    newName: op.newName
                  });
                }
              }
            }

            if (ops.length > 0) {
              setPendingOperations(ops);
            }
          }
        } catch (e) {
          console.error('Failed to parse JSON from AI response', e);
        }
      }

      // Update routing display with actual result
      if (response.routingReason) {
        console.log(`AI Response from ${response.provider}/${response.model}: ${response.routingReason}`);
      }
    } catch (error) {
      console.error('AI request failed:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: `Sorry, I encountered an error: ${(error as Error).message}

Please check that your AI services are configured and running.`,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle minimize/maximize
  const toggleMinimize = () => {
    setIsMinimized((prev) => !prev);
  };

  if (!isVisible) return null;

  return (
    <div
      className={`universal-assistant ${isMinimized ? 'minimized' : ''}`}
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        width: isMinimized ? 'auto' : _size.width,
        height: isMinimized ? 'auto' : _size.height,
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Header */}
      <div className="assistant-header drag-handle">
        <div className="context-indicator">
          <span className="app-icon">{context ? APP_TYPE_ICONS[context.type] : '❓'}</span>
          <div className="context-info">
            <div className="app-name">{context?.name || 'Unknown'}</div>
            <div className="assistant-mode">
              {context ? APP_TYPE_LABELS[context.type] : 'General'}
            </div>
          </div>
        </div>

        <div className="header-actions">
          <button
            className="settings-btn"
            onClick={() => console.log('Settings clicked')}
            title="AI Settings"
          >
            ⚙️
          </button>
          <button
            className="minimize-btn"
            onClick={toggleMinimize}
            title={isMinimized ? 'Maximize' : 'Minimize'}
          >
            {isMinimized ? '▢' : '−'}
          </button>
          <button
            className="close-btn"
            onClick={() => setIsVisible(false)}
            title="Close (Ctrl+Shift+A)"
          >
            ✕
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Routing Info */}
          {routing && (
            <div className="routing-info">
              <span className="routing-badge">{routing.template}</span>
              <span className="confidence">
                {Math.round(routing.confidence * 100)}% confident
              </span>
            </div>
          )}

          {/* Messages */}
          <div className="messages-container">
            {messages.length === 0 && (
              <div className="welcome-message">
                <h3>👋 Universal AI Assistant</h3>
                <p>
                  I'm context-aware and will adapt to your active application.
                  <br />
                  Currently optimized for: <strong>{context?.name || 'General use'}</strong>
                </p>
                <div className="quick-tips">
                  <p>Try asking me to:</p>
                  <ul>
                    {context?.type === 'browser' && <li>Summarize this webpage</li>}
                    {context?.type === 'code-editor' && <li>Explain this code</li>}
                    {context?.type === 'office-word' && <li>Improve this paragraph</li>}
                    {context?.type === 'terminal' && <li>Explain this command</li>}
                    <li>Help with my current task</li>
                  </ul>
                </div>
              </div>
            )}

            {messages.map((msg, idx) => (
              <div key={idx} className={`message ${msg.role}`}>
                <div className="message-content">
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="message-attachments">
                      {msg.attachments.map((att, i) => (
                        <div key={i} className="attachment-preview">
                          {att.type === 'image' && (
                            <img src={att.data} alt="Attachment" />
                          )}
                          {att.type === 'document' && (
                            <div className="document-preview">
                              <span className="doc-icon">📄</span>
                              <div className="doc-info">
                                <span className="doc-name">{att.filename}</span>
                                {att.metadata && (
                                  <span className="doc-meta">
                                    {att.metadata.line_count ? `${att.metadata.line_count} lines` : ''}
                                    {att.metadata.width ? `${att.metadata.width}x${att.metadata.height}` : ''}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {msg.content}
                </div>
                <div className="message-time">
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="message assistant loading">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form className="input-container" onSubmit={handleSubmit}>
            {attachments.length > 0 && (
              <div className="input-attachments">
                {attachments.map((_, i) => (
                  <div key={i} className="attachment-chip">
                    <span>📷 Image</span>
                    <button type="button" onClick={() => removeAttachment(i)}>×</button>
                  </div>
                ))}
              </div>
            )}
            <div className="input-actions">
              <button 
                type="button" 
                className="action-btn" 
                onClick={handleCaptureWindow}
                title="Capture Active Window"
                disabled={isCapturing}
              >
                🔲
              </button>
              <button 
                type="button" 
                className="action-btn" 
                onClick={handleCaptureRegion}
                title="Capture Region"
                disabled={isCapturing}
              >
                ✂️
              </button>
              <button 
                type="button" 
                className="action-btn" 
                onClick={() => setShowFileSearch(true)}
                title="Search Files"
                disabled={isCapturing}
              >
                🔍
              </button>
            </div>
            <textarea
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Ask anything about ${context?.name || 'your work'}...`}
              rows={2}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
            />
            <button type="submit" disabled={(!query.trim() && attachments.length === 0) || isLoading}>
              {isLoading ? '⏳' : '➤'}
            </button>
          </form>

          {/* Context Details */}
          {context && (
            <div className="context-details">
              <details>
                <summary>Context Details</summary>
                <pre>{JSON.stringify(context, null, 2)}</pre>
              </details>
            </div>
          )}
        </>
      )}

      {/* File Search Overlay */}
      {showFileSearch && (
        <FileSearch 
          onClose={() => setShowFileSearch(false)} 
          onFileSelect={handleFileSelect} 
        />
      )}

      {/* File Operations Preview */}
      {pendingOperations.length > 0 && (
        <FileOperationsPreview
          operations={pendingOperations}
          onConfirm={executeFileOperations}
          onCancel={() => setPendingOperations([])}
          isExecuting={isExecutingOps}
        />
      )}
    </div>
  );
};
