/**
 * Quick Chat Component
 * ChatGPT-like interface with model selection and file-system persistence
 */

import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { universalAI } from '../../services/ai/universal-ai.service';
import { ollamaManager } from '../../services/ai/ollama-manager.service';
import { writeTextFile, readTextFile, createDir, exists, BaseDirectory } from '@tauri-apps/api/fs';
import type { AIAttachment } from '@shared/types/ai.types';
import './QuickChat.css';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  thinking?: string;
  timestamp: number;
  model?: string;
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
  model?: string;
}

const DATA_DIR = 'blueskyapp/ask';
const HISTORY_FILE = 'chat_history.json';

interface QuickChatProps {
  initialText?: string;
}

export const QuickChat: React.FC<QuickChatProps> = ({ initialText }) => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState(initialText || '');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>('local');
  const [availableModels, setAvailableModels] = useState<{ value: string; label: string; group: string; provider: string }[]>([]);
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [attachments, setAttachments] = useState<AIAttachment[]>([]);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [showThinking, setShowThinking] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Ref to track sessions for async operations to avoid stale closures
  const sessionsRef = useRef(sessions);
  useEffect(() => {
    sessionsRef.current = sessions;
  }, [sessions]);

  // Handle initial text (Auto-send)
  useEffect(() => {
    if (initialText && modelsLoaded) {
      // If initialText is provided (e.g. from OCR), we start a FRESH session state
      setCurrentSessionId(null);
      setMessages([]);
      setInputText(initialText);
      
      // Auto-send the message
      // We use a timeout to ensure state is settled and to allow the UI to render the initial state first
      const timer = setTimeout(() => {
        handleSendMessage(initialText);
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [initialText, modelsLoaded]);

  // Initialize
  useEffect(() => {
    initializeStorage();
    loadModels();

    // Click outside listener for dropdown
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsModelDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const initializeStorage = async () => {
    try {
      // Check if directory exists
      const dirExists = await exists(DATA_DIR, { dir: BaseDirectory.AppData });
      if (!dirExists) {
        await createDir(DATA_DIR, { dir: BaseDirectory.AppData, recursive: true });
      }
      loadSessions();
    } catch (error) {
      console.error('Failed to initialize storage:', error);
      // Fallback to localStorage if FS fails
      loadSessionsFromLocalStorage();
    }
  };

  const loadModels = async () => {
    // Initialize AI service with keys from storage to ensure we can fetch models
    universalAI.initialize({
      openaiApiKey: localStorage.getItem('openai_api_key') || '',
      geminiApiKey: localStorage.getItem('gemini_api_key') || '',
      claudeApiKey: localStorage.getItem('claude_api_key') || '',
      deepseekApiKey: localStorage.getItem('deepseek_api_key') || '',
      grokApiKey: localStorage.getItem('grok_api_key') || '',
      perplexityApiKey: localStorage.getItem('perplexity_api_key') || '',
    });

    const models: { value: string; label: string; group: string; provider: string }[] = [];

    // Cloud Models Configuration
    const cloudProviders = [
      {
        key: 'openai_api_key',
        provider: 'openai',
        group: 'OpenAI',
        models: [
          { id: 'gpt-4o', name: 'GPT-4o' },
          { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
          { id: 'gpt-4', name: 'GPT-4' },
          { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
        ]
      },
      {
        key: 'gemini_api_key',
        provider: 'gemini',
        group: 'Google Gemini',
        models: [
          { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
          { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
          { id: 'gemini-pro', name: 'Gemini Pro' },
        ]
      },
      {
        key: 'claude_api_key',
        provider: 'claude',
        group: 'Anthropic Claude',
        models: [
          { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus' },
          { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet' },
          { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku' },
        ]
      },
      {
        key: 'deepseek_api_key',
        provider: 'deepseek',
        group: 'DeepSeek',
        models: [
          { id: 'deepseek-chat', name: 'DeepSeek Chat' },
          { id: 'deepseek-coder', name: 'DeepSeek Coder' },
        ]
      },
      {
        key: 'grok_api_key',
        provider: 'grok',
        group: 'xAI Grok',
        models: [
          { id: 'grok-1', name: 'Grok-1' },
        ]
      },
      {
        key: 'perplexity_api_key',
        provider: 'perplexity',
        group: 'Perplexity',
        models: [
          { id: 'llama-3-sonar-large-32k-online', name: 'Sonar Large Online' },
          { id: 'llama-3-sonar-small-32k-online', name: 'Sonar Small Online' },
          { id: 'llama-3-70b-instruct', name: 'Llama 3 70B' },
        ]
      }
    ];

    // Add configured cloud models
    for (const cp of cloudProviders) {
      if (localStorage.getItem(cp.key)) {
        let modelsList = cp.models;
        
        // Try to auto-fetch newest models for supported providers
        if (['openai', 'gemini', 'deepseek', 'grok'].includes(cp.provider)) {
            try {
                const fetched = await universalAI.listModels(cp.provider);
                if (fetched && fetched.length > 0) {
                    modelsList = fetched;
                }
            } catch (e) {
                console.warn(`Could not fetch models for ${cp.provider}, using defaults`);
            }
        }

        modelsList.forEach(model => {
          models.push({
            value: model.id,
            label: model.name,
            group: cp.group,
            provider: cp.provider
          });
        });
      }
    }

    try {
      const localModels = await ollamaManager.listModels();
      if (localModels.length > 0) {
        localModels.forEach(m => {
          let label = m.name;
          // Add parameter size and quantization info if available
          if (m.details) {
            const parts = [];
            if (m.details.parameter_size) parts.push(m.details.parameter_size);
            if (m.details.quantization_level) parts.push(m.details.quantization_level);
            
            if (parts.length > 0) {
              label = `${m.name} (${parts.join(', ')})`;
            }
          }
          
          models.push({ value: m.name, label: label, group: 'Local', provider: 'local' });
        });
      }
    } catch (error) {
      console.error('Failed to load models:', error);
    }
    
    setAvailableModels(models);
    setModelsLoaded(true);

    // Update selection if current selection is invalid or default 'local'
    const isCurrentValid = models.some(m => m.value === selectedModel);
    if ((!isCurrentValid || selectedModel === 'local') && models.length > 0) {
        // Prefer a local model if available, otherwise first cloud model
        const firstLocal = models.find(m => m.group === 'Local');
        if (firstLocal) {
            setSelectedModel(firstLocal.value);
        } else {
            setSelectedModel(models[0].value);
        }
    }
  };

  const loadSessions = async () => {
    try {
      const filePath = `${DATA_DIR}/${HISTORY_FILE}`;
      const fileExists = await exists(filePath, { dir: BaseDirectory.AppData });
      
      if (fileExists) {
        const content = await readTextFile(filePath, { dir: BaseDirectory.AppData });
        const parsed = JSON.parse(content);
        setSessions(parsed);
        
        // Only restore last session if we DON'T have initialText
        if (parsed.length > 0 && !initialText) {
          setCurrentSessionId(parsed[0].id);
          setMessages(parsed[0].messages);
        }
      } else {
        // Try migration from localStorage
        loadSessionsFromLocalStorage();
      }
    } catch (error) {
      console.error('Failed to load sessions from disk:', error);
      loadSessionsFromLocalStorage();
    }
  };

  const loadSessionsFromLocalStorage = () => {
    const savedSessions = localStorage.getItem('quick_chat_sessions');
    if (savedSessions) {
      try {
        const parsed = JSON.parse(savedSessions);
        setSessions(parsed);
        // Only restore last session if we DON'T have initialText
        if (parsed.length > 0 && !initialText) {
          setCurrentSessionId(parsed[0].id);
          setMessages(parsed[0].messages);
        }
      } catch (error) {
        console.error('Failed to load chat sessions from local storage:', error);
      }
    }
  };

  const saveSessions = async (updatedSessions: ChatSession[]) => {
    setSessions(updatedSessions);
    
    // Save to disk
    try {
      const filePath = `${DATA_DIR}/${HISTORY_FILE}`;
      await writeTextFile(filePath, JSON.stringify(updatedSessions, null, 2), { dir: BaseDirectory.AppData });
    } catch (error) {
      console.error('Failed to save sessions to disk:', error);
    }

    // Backup to localStorage
    localStorage.setItem('quick_chat_sessions', JSON.stringify(updatedSessions));
  };

  const createNewSession = (prefillText?: string) => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: 'New Chat',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      model: selectedModel
    };

    const updatedSessions = [newSession, ...sessions];
    saveSessions(updatedSessions);
    setCurrentSessionId(newSession.id);
    setMessages([]);
    if (prefillText) {
        setInputText(prefillText);
    } else {
        setInputText('');
    }
  };

  const switchSession = (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (session) {
      setCurrentSessionId(sessionId);
      setMessages(session.messages);
      if (session.model) {
        setSelectedModel(session.model);
      }
    }
  };

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const deleteSession = (sessionId: string) => {
    setDeleteConfirmId(sessionId);
  };

  const confirmDelete = () => {
    if (!deleteConfirmId) return;
    
    const updatedSessions = sessions.filter(s => s.id !== deleteConfirmId);
    saveSessions(updatedSessions);
    
    if (currentSessionId === deleteConfirmId) {
      if (updatedSessions.length > 0) {
        setCurrentSessionId(updatedSessions[0].id);
        setMessages(updatedSessions[0].messages);
      } else {
        setCurrentSessionId(null);
        setMessages([]);
      }
    }
    
    setDeleteConfirmId(null);
  };

  const cancelDelete = () => {
    setDeleteConfirmId(null);
  };

  const startEditing = (session: ChatSession, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSessionId(session.id);
    setEditTitle(session.title);
  };

  const saveTitle = () => {
    if (editingSessionId && editTitle.trim()) {
      const updatedSessions = sessions.map(s => 
        s.id === editingSessionId ? { ...s, title: editTitle.trim() } : s
      );
      saveSessions(updatedSessions);
    }
    setEditingSessionId(null);
    setEditTitle('');
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveTitle();
    } else if (e.key === 'Escape') {
      setEditingSessionId(null);
      setEditTitle('');
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newAttachments: AIAttachment[] = [];
      
      for (let i = 0; i < e.target.files.length; i++) {
        const file = e.target.files[i];
        const reader = new FileReader();

        try {
          const dataUrl = await new Promise<string>((resolve, reject) => {
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });

          // Extract base64 data (remove data:image/png;base64, prefix)
          const base64Data = dataUrl.split(',')[1];
          
          let type: 'image' | 'document' | 'audio' | 'video' = 'document';
          if (file.type.startsWith('image/')) type = 'image';
          else if (file.type.startsWith('audio/')) type = 'audio';
          else if (file.type.startsWith('video/')) type = 'video';

          newAttachments.push({
            type,
            data: base64Data,
            mimeType: file.type,
            filename: file.name
          });
        } catch (error) {
          console.error('Error reading file:', error);
        }
      }

      setAttachments([...attachments, ...newAttachments]);
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    const newAttachments = [...attachments];
    newAttachments.splice(index, 1);
    setAttachments(newAttachments);
  };

  const handleSendMessage = async (contentOverride?: string) => {
    const textToSend = contentOverride !== undefined ? contentOverride : inputText;
    
    if ((!textToSend.trim() && attachments.length === 0) || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: textToSend.trim(),
      timestamp: Date.now(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    if (contentOverride === undefined) {
        setInputText('');
    }
    const currentAttachments = [...attachments];
    setAttachments([]);
    setIsLoading(true);

    // Create placeholder for assistant message
    const assistantMessageId = (Date.now() + 1).toString();
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      model: selectedModel
    };
    setMessages([...newMessages, assistantMessage]);

    try {
      // Determine provider and model name
      const selectedModelObj = availableModels.find(m => m.value === selectedModel);
      let provider: 'local' | 'openai' | 'perplexity' | 'gemini' | 'claude' | 'deepseek' | 'grok' = 'local';
      let modelName = selectedModel;

      if (selectedModelObj) {
        provider = selectedModelObj.provider as any;
        // For cloud providers, the value IS the model name
        modelName = selectedModelObj.value;
      } else if (['openai', 'perplexity', 'gemini', 'claude', 'deepseek', 'grok'].includes(selectedModel)) {
        // Fallback for legacy behavior or direct provider selection
        provider = selectedModel as any;
        modelName = ''; 
      }

      let currentContent = '';
      let currentThinking = '';

      await universalAI.sendStreamingRequest({
        query: userMessage.content,
        forceProvider: provider,
        forceModel: modelName,
        forceTemplate: 'ai_assistant',
        attachments: currentAttachments,
      }, (chunk) => {
        if (chunk.content) currentContent += chunk.content;
        if (chunk.thinking) currentThinking += chunk.thinking;
        
        setMessages(prev => prev.map(m => 
          m.id === assistantMessageId 
            ? { ...m, content: currentContent, thinking: currentThinking } 
            : m
        ));
      });

      // Update session
      // Use sessionsRef.current to ensure we have the latest sessions list
      const currentSessionsList = sessionsRef.current;
      
      // Final message state
      const finalAssistantMessage = {
          ...assistantMessage,
          content: currentContent,
          thinking: currentThinking
      };
      
      const finalMessages = [...newMessages, finalAssistantMessage];

      if (currentSessionId) {
        // Generate title if it's the first message exchange
        let sessionTitle = currentSessionsList.find(s => s.id === currentSessionId)?.title || 'New Chat';
        
        // Check if this is the first message in the session (messages is empty before this send)
        if (messages.length === 0) {
             // Try to generate a better title using local model
             try {
                 // Use the first 50 chars as fallback
                 sessionTitle = userMessage.content.substring(0, 50);
                 
                 // Fire and forget title generation
                 generateTitle(userMessage.content).then(title => {
                     if (title) {
                         // We need to read the latest sessions again inside the callback
                         const latestSessions = sessionsRef.current;
                         const updated = latestSessions.map(s => 
                             s.id === currentSessionId ? { ...s, title: title } : s
                         );
                         saveSessions(updated);
                     }
                 });
             } catch (e) {
                 console.warn('Failed to initiate title generation', e);
             }
        }

        const updatedSessions = currentSessionsList.map(s => {
          if (s.id === currentSessionId) {
            return {
              ...s,
              messages: finalMessages,
              updatedAt: Date.now(),
              title: sessionTitle,
              model: selectedModel
            };
          }
          return s;
        });
        saveSessions(updatedSessions);
      } else {
        // Create new session with these messages
        const newSession: ChatSession = {
            id: Date.now().toString(),
            title: userMessage.content.substring(0, 30),
            messages: finalMessages,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            model: selectedModel
        };
        
        const updatedSessions = [newSession, ...currentSessionsList];
        saveSessions(updatedSessions);
        setCurrentSessionId(newSession.id);
        
        // Trigger title generation for this new session
        generateTitle(userMessage.content).then(title => {
             if (title) {
                 const latestSessions = sessionsRef.current;
                 const updated = latestSessions.map(s => 
                     s.id === newSession.id ? { ...s, title: title } : s
                 );
                 saveSessions(updated);
             }
        });
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Failed to get response'}`,
        timestamp: Date.now(),
      };
      setMessages([...newMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const generateTitle = async (content: string): Promise<string> => {
      try {
          // Use a lightweight local model for titling if possible, or just the current one
          // We'll ask for a very short summary
          const prompt = `Summarize this into a short chat title (max 5 words): "${content.substring(0, 200)}"`;
          
          // Use ollama directly for this background task to avoid messing with main chat state
          // We try to find a small model
          const models = await ollamaManager.listModels();
          const smallModel = models.find(m => m.name.includes('llama') || m.name.includes('mistral') || m.name.includes('phi'))?.name || models[0]?.name;
          
          if (smallModel) {
              const response = await ollamaManager.generate(smallModel, prompt);
              return response.replace(/["']/g, '').trim();
          }
          return content.substring(0, 30);
      } catch (e) {
          console.warn('Title generation failed:', e);
          return content.substring(0, 30);
      }
  };

  return (
    <div className="quick-chat-container">
      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="delete-confirmation-overlay" onClick={cancelDelete}>
          <div className="delete-confirmation-dialog" onClick={(e) => e.stopPropagation()}>
            <h3>Delete Chat?</h3>
            <p>Are you sure you want to delete this chat session? This action cannot be undone.</p>
            <div className="delete-confirmation-actions">
              <button className="btn-cancel" onClick={cancelDelete}>
                Cancel
              </button>
              <button className="btn-delete" onClick={confirmDelete}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <div className="qc-sidebar">
        <div className="qc-sidebar-header">
          <button type="button" className="qc-new-chat-btn" onClick={() => createNewSession()}>
            <span className="icon">+</span> New Chat
          </button>
        </div>

        <div className="qc-sessions-list">
          <div className="qc-list-header">History</div>
          {sessions.map((session) => (
            <div
              key={session.id}
              className={`qc-session-item ${currentSessionId === session.id ? 'active' : ''}`}
              onClick={() => switchSession(session.id)}
            >
              <span className="qc-session-icon">💬</span>
              <div className="qc-session-info">
                {editingSessionId === session.id ? (
                  <input
                    type="text"
                    className="qc-session-edit-input"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onBlur={saveTitle}
                    onKeyDown={handleEditKeyDown}
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <>
                    <div className="qc-session-title" onDoubleClick={(e) => startEditing(session, e)}>
                      {session.title || 'New Chat'}
                    </div>
                    <div className="qc-session-date">
                      {new Date(session.updatedAt).toLocaleDateString()}
                    </div>
                  </>
                )}
              </div>
              
              {editingSessionId !== session.id && (
                <div className="qc-session-actions">
                  <button
                    className="qc-action-btn edit"
                    onClick={(e) => startEditing(session, e)}
                    title="Rename"
                  >
                    ✎
                  </button>
                  <button
                    className="qc-action-btn delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSession(session.id);
                    }}
                    title="Delete"
                  >
                    ×
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="qc-main">
        <div className="qc-header">
          <div className="qc-model-selector" ref={dropdownRef}>
            <button 
              className={`qc-model-trigger ${isModelDropdownOpen ? 'active' : ''}`}
              onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
            >
              <span className="qc-current-model">
                {availableModels.find(m => m.value === selectedModel)?.label || selectedModel}
              </span>
              <span className="qc-chevron">▼</span>
            </button>
            
            {isModelDropdownOpen && (
              <div className="qc-model-dropdown">
                {/* Group by provider/group */}
                {Array.from(new Set(availableModels.map(m => m.group))).map(group => (
                  <div key={group}>
                    <div className="qc-dropdown-group-label">{group}</div>
                    {availableModels.filter(m => m.group === group).map(m => (
                      <button
                        key={m.value}
                        className={`qc-model-option ${selectedModel === m.value ? 'selected' : ''}`}
                        onClick={() => {
                          setSelectedModel(m.value);
                          setIsModelDropdownOpen(false);
                        }}
                      >
                        {m.label}
                        {selectedModel === m.value && <span className="qc-check">✓</span>}
                      </button>
                    ))}
                    <div className="qc-dropdown-divider"></div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="qc-messages-container">
          {messages.length === 0 ? (
            <div className="qc-welcome">
              <div className="qc-welcome-icon">🤖</div>
              <h2>How can I help you today?</h2>
            </div>
          ) : (
            messages.map((message) => (
              <div key={message.id} className={`qc-message-wrapper ${message.role}`}>
                <div className="qc-message-avatar">
                  {message.role === 'user' ? '👤' : '🤖'}
                </div>
                <div className="qc-message-content">
                  {/* Show typing indicator if content is empty and it's the last message from assistant */}
                  {message.role === 'assistant' && !message.content && !message.thinking && isLoading && messages[messages.length - 1].id === message.id ? (
                    <div className="qc-typing-indicator">
                      <span></span><span></span><span></span>
                    </div>
                  ) : (
                    <>
                      {message.thinking && (
                        <div className="qc-thinking-block">
                          <div 
                            className="qc-thinking-header" 
                            onClick={() => setShowThinking(!showThinking)}
                          >
                            <span>🧠 Thinking Process</span>
                            <span>{showThinking ? '▼' : '▶'}</span>
                          </div>
                          {showThinking && (
                            <div className="qc-thinking-content">
                              {message.thinking}
                            </div>
                          )}
                        </div>
                      )}
                      <div className="qc-message-bubble">
                        <ReactMarkdown 
                          remarkPlugins={[remarkGfm]}
                          components={{
                            code({node, inline, className, children, ...props}: any) {
                              const match = /language-(\w+)/.exec(className || '')
                              return !inline && match ? (
                                <div className="code-block">
                                  <div className="code-header">{match[1]}</div>
                                  <pre className={className} {...props}>
                                    <code>{children}</code>
                                  </pre>
                                </div>
                              ) : (
                                <code className={className} {...props}>
                                  {children}
                                </code>
                              )
                            }
                          }}
                        >
                          {message.content}
                        </ReactMarkdown>
                      </div>
                    </>
                  )}
                  <div className="qc-message-meta">
                    {message.model && <span className="qc-model-badge">{message.model}</span>}
                    <span className="qc-time">{new Date(message.timestamp).toLocaleTimeString()}</span>
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="qc-input-container">
          {attachments.length > 0 && (
            <div className="qc-attachments-preview">
              {attachments.map((att, index) => (
                <div key={index} className="qc-attachment-item">
                  <span className="qc-attachment-icon">
                    {att.type === 'image' ? '🖼️' : '📄'}
                  </span>
                  <span className="qc-attachment-name">{att.filename || 'File'}</span>
                  <button 
                    className="qc-attachment-remove"
                    onClick={() => removeAttachment(index)}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="qc-input-wrapper">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              style={{ display: 'none' }}
              multiple
            />
            <button
              className="qc-attach-btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              title="Attach files"
            >
              📎
            </button>
            <textarea
              className="qc-input"
              placeholder="Message Ask OCR..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyPress}
              disabled={isLoading}
              rows={1}
              style={{ height: 'auto', minHeight: '44px', maxHeight: '200px' }}
            />
            <button
              className="qc-send-btn"
              onClick={() => handleSendMessage()}
              disabled={(!inputText.trim() && attachments.length === 0) || isLoading}
            >
              ➤
            </button>
          </div>
          <div className="qc-footer-text">
            AI can make mistakes. Please verify important information.
          </div>
        </div>
      </div>
    </div>
  );
};

// End of QuickChat component
