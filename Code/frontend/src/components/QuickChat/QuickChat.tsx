/**
 * Quick Chat Component
 * ChatGPT-like interface with model selection and file-system persistence
 */

import React, { useState, useEffect, useRef } from 'react';
import { universalAI } from '../../services/ai/universal-ai.service';
import { ollamaManager } from '../../services/ai/ollama-manager.service';
import { writeTextFile, readTextFile, createDir, exists, BaseDirectory } from '@tauri-apps/api/fs';
import './QuickChat.css';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
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

export const QuickChat: React.FC = () => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>('local');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize
  useEffect(() => {
    initializeStorage();
    loadModels();
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
    try {
      const models = await ollamaManager.listModels();
      const modelNames = models.map(m => m.name);
      
      // Default to first available model if 'local' is selected
      if (selectedModel === 'local' && modelNames.length > 0) {
        setSelectedModel(modelNames[0]);
      }
    } catch (error) {
      console.error('Failed to load models:', error);
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
        if (parsed.length > 0) {
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
        if (parsed.length > 0) {
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

  const createNewSession = () => {
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

  const deleteSession = (sessionId: string) => {
    if (confirm('Delete this chat session?')) {
      const updatedSessions = sessions.filter(s => s.id !== sessionId);
      saveSessions(updatedSessions);
      
      if (currentSessionId === sessionId) {
        if (updatedSessions.length > 0) {
          setCurrentSessionId(updatedSessions[0].id);
          setMessages(updatedSessions[0].messages);
        } else {
          setCurrentSessionId(null);
          setMessages([]);
        }
      }
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputText.trim(),
      timestamp: Date.now(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputText('');
    setIsLoading(true);

    try {
      // Pass the selected model to the chat function
      // If selectedModel is one of the known providers, use it as provider, otherwise treat as model for 'local' provider
      let provider: 'local' | 'openai' | 'perplexity' = 'local';
      let modelName = selectedModel;

      if (selectedModel === 'openai' || selectedModel === 'perplexity') {
        provider = selectedModel;
        modelName = ''; // Let provider choose default or handle it
      }

      const response = await universalAI.chat(userMessage.content, provider, modelName);
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.text,
        timestamp: Date.now(),
        model: response.model
      };

      const updatedMessages = [...newMessages, assistantMessage];
      setMessages(updatedMessages);

      // Update session
      if (currentSessionId) {
        const updatedSessions = sessions.map(s => {
          if (s.id === currentSessionId) {
            return {
              ...s,
              messages: updatedMessages,
              updatedAt: Date.now(),
              title: s.messages.length === 0 ? userMessage.content.substring(0, 30) : s.title,
              model: selectedModel
            };
          }
          return s;
        });
        saveSessions(updatedSessions);
      } else {
        // Should not happen if we force create session on start, but just in case
        createNewSession();
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

  return (
    <div className="quick-chat-container">
      {/* Sidebar */}
      <div className="qc-sidebar">
        <div className="qc-sidebar-header">
          <button className="qc-new-chat-btn" onClick={createNewSession}>
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
                <div className="qc-session-title">{session.title || 'New Chat'}</div>
                <div className="qc-session-date">
                  {new Date(session.updatedAt).toLocaleDateString()}
                </div>
              </div>
              <button
                className="qc-delete-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteSession(session.id);
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="qc-main">
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
                  <div className="qc-message-bubble">
                    {message.content}
                  </div>
                  <div className="qc-message-meta">
                    {message.model && <span className="qc-model-badge">{message.model}</span>}
                    <span className="qc-time">{new Date(message.timestamp).toLocaleTimeString()}</span>
                  </div>
                </div>
              </div>
            ))
          )}
          {isLoading && (
            <div className="qc-message-wrapper assistant">
              <div className="qc-message-avatar">🤖</div>
              <div className="qc-message-content">
                <div className="qc-typing-indicator">
                  <span></span><span></span><span></span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="qc-input-container">
          <div className="qc-input-wrapper">
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
              onClick={handleSendMessage}
              disabled={!inputText.trim() || isLoading}
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
