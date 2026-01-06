/**
 * Quick Chat Component - Advanced AI Chat Interface
 * Features: Model picker, file uploads, deep think, web search, math formulas, streaming
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { universalAI } from '../../services/ai/universal-ai.service';
import { ollamaManager } from '../../services/ai/ollama-manager.service';
import { writeTextFile, readTextFile, createDir, exists, BaseDirectory } from '@tauri-apps/api/fs';
import type { AIAttachment } from '@shared/types/ai.types';
import { 
  Plus, Send, Paperclip, FileText, Trash2, Edit3, Check, X, 
  ChevronDown, Bot, User, Sparkles, Globe, Brain, Eye, EyeOff, 
  Download, MessageSquare, Copy, RotateCcw, Loader2
} from 'lucide-react';
import './QuickChat.css';

// Type definition for model properties
interface ModelDefinition {
  id: string;
  name: string;
  vision?: boolean;
  deepThink?: boolean;
  webSearch?: boolean;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  thinking?: string;
  timestamp: number;
  model?: string;
  attachments?: AIAttachment[];
  isError?: boolean;
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
  model?: string;
}

interface ModelInfo {
  value: string;
  label: string;
  group: string;
  provider: string;
  supportsVision?: boolean;
  supportsWebSearch?: boolean;
  supportsDeepThink?: boolean;
}

const DATA_DIR = 'blueskyapp/ask';
const HISTORY_FILE = 'chat_history.json';

const WEB_SEARCH_MODELS = ['perplexity', 'sonar'];
const DEEP_THINK_MODELS = ['deepseek', 'claude-3-opus', 'gpt-4', 'o1'];
const VISION_MODELS = ['gpt-4o', 'gpt-4-vision', 'gemini', 'claude-3', 'llava'];

interface QuickChatProps {
  initialText?: string;
}

export const QuickChat: React.FC<QuickChatProps> = ({ initialText }) => {
  // Session State
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  
  // Input State
  const [inputText, setInputText] = useState(initialText || '');
  const [attachments, setAttachments] = useState<AIAttachment[]>([]);
  
  // Model State
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [availableModels, setAvailableModels] = useState<ModelInfo[]>([]);
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  
  // UI State
  const [isLoading, setIsLoading] = useState(false);
  const [showThinking, setShowThinking] = useState(false);
  const [deepThinkEnabled, setDeepThinkEnabled] = useState(false);
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [isInstallingModel, setIsInstallingModel] = useState(false);
  const [installProgress, setInstallProgress] = useState('');
  const [streamingContent, setStreamingContent] = useState('');
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const sessionsRef = useRef(sessions);

  useEffect(() => {
    sessionsRef.current = sessions;
  }, [sessions]);

  // Current model capabilities
  const modelCapabilities = useMemo(() => {
    const model = availableModels.find(m => m.value === selectedModel);
    const modelLower = selectedModel.toLowerCase();
    return {
      supportsVision: model?.supportsVision || VISION_MODELS.some(v => modelLower.includes(v)),
      supportsWebSearch: model?.supportsWebSearch || WEB_SEARCH_MODELS.some(v => modelLower.includes(v)),
      supportsDeepThink: model?.supportsDeepThink || DEEP_THINK_MODELS.some(v => modelLower.includes(v)),
    };
  }, [selectedModel, availableModels]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [inputText]);

  // Handle initial text
  useEffect(() => {
    if (initialText && modelsLoaded) {
      createNewSession(initialText);
      const timer = setTimeout(() => handleSendMessage(initialText), 100);
      return () => clearTimeout(timer);
    }
  }, [initialText, modelsLoaded]);

  // Initialize
  useEffect(() => {
    initializeStorage();
    loadModels();

    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsModelDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  const initializeStorage = async () => {
    try {
      const dirExists = await exists(DATA_DIR, { dir: BaseDirectory.AppData });
      if (!dirExists) {
        await createDir(DATA_DIR, { dir: BaseDirectory.AppData, recursive: true });
      }
      loadSessions();
    } catch {
      loadSessionsFromLocalStorage();
    }
  };

  const loadModels = async () => {
    universalAI.initialize({
      openaiApiKey: localStorage.getItem('openai_api_key') || '',
      geminiApiKey: localStorage.getItem('gemini_api_key') || '',
      claudeApiKey: localStorage.getItem('claude_api_key') || '',
      deepseekApiKey: localStorage.getItem('deepseek_api_key') || '',
      grokApiKey: localStorage.getItem('grok_api_key') || '',
      perplexityApiKey: localStorage.getItem('perplexity_api_key') || '',
    });

    const models: ModelInfo[] = [];

    const cloudProviders = [
      {
        key: 'openai_api_key',
        provider: 'openai',
        group: 'OpenAI',
        models: [
          { id: 'gpt-4o', name: 'GPT-4o', vision: true, deepThink: true },
          { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', deepThink: true },
          { id: 'gpt-4', name: 'GPT-4', deepThink: true },
          { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
        ]
      },
      {
        key: 'gemini_api_key',
        provider: 'gemini',
        group: 'Google Gemini',
        models: [
          { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', vision: true },
          { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', vision: true },
          { id: 'gemini-pro', name: 'Gemini Pro' },
        ]
      },
      {
        key: 'claude_api_key',
        provider: 'claude',
        group: 'Anthropic Claude',
        models: [
          { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', vision: true, deepThink: true },
          { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet', vision: true },
          { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', vision: true },
        ]
      },
      {
        key: 'deepseek_api_key',
        provider: 'deepseek',
        group: 'DeepSeek',
        models: [
          { id: 'deepseek-chat', name: 'DeepSeek Chat', deepThink: true },
          { id: 'deepseek-coder', name: 'DeepSeek Coder', deepThink: true },
        ]
      },
      {
        key: 'grok_api_key',
        provider: 'grok',
        group: 'xAI Grok',
        models: [{ id: 'grok-1', name: 'Grok-1' }]
      },
      {
        key: 'perplexity_api_key',
        provider: 'perplexity',
        group: 'Perplexity',
        models: [
          { id: 'llama-3-sonar-large-32k-online', name: 'Sonar Large (Web)', webSearch: true },
          { id: 'llama-3-sonar-small-32k-online', name: 'Sonar Small (Web)', webSearch: true },
        ]
      }
    ];

    for (const cp of cloudProviders) {
      if (localStorage.getItem(cp.key)) {
        let modelsList: ModelDefinition[] = cp.models;
        
        if (['openai', 'gemini', 'deepseek', 'grok'].includes(cp.provider)) {
          try {
            const fetched = await universalAI.listModels(cp.provider);
            if (fetched?.length > 0) {
              modelsList = fetched.map(m => {
                const originalModel = (cp.models as ModelDefinition[]).find(cm => cm.id === m.id);
                return { 
                  id: m.id, 
                  name: m.name,
                  vision: originalModel?.vision,
                  deepThink: originalModel?.deepThink,
                  webSearch: originalModel?.webSearch
                };
              });
            }
          } catch {
            console.warn(`Could not fetch models for ${cp.provider}`);
          }
        }

        modelsList.forEach(m => {
          models.push({
            value: m.id,
            label: m.name,
            group: cp.group,
            provider: cp.provider,
            supportsVision: m.vision,
            supportsDeepThink: m.deepThink,
            supportsWebSearch: m.webSearch
          });
        });
      }
    }

    try {
      const localModels = await ollamaManager.listModels();
      localModels.forEach(m => {
        const parts = [];
        if (m.details?.parameter_size) parts.push(m.details.parameter_size);
        if (m.details?.quantization_level) parts.push(m.details.quantization_level);
        const label = parts.length > 0 ? `${m.name} (${parts.join(', ')})` : m.name;
        
        models.push({ 
          value: m.name, 
          label, 
          group: 'Local (Ollama)', 
          provider: 'local',
          supportsVision: m.name.includes('llava') || m.name.includes('vision'),
          supportsDeepThink: m.name.includes('deepseek') || m.name.includes('mixtral')
        });
      });
    } catch {
      console.warn('Failed to load local models');
    }

    setAvailableModels(models);
    setModelsLoaded(true);

    if (models.length > 0) {
      const savedModel = localStorage.getItem('quickchat_selected_model');
      if (savedModel && models.some(m => m.value === savedModel)) {
        setSelectedModel(savedModel);
      } else {
        const firstLocal = models.find(m => m.group === 'Local (Ollama)');
        setSelectedModel(firstLocal?.value || models[0].value);
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
        
        if (parsed.length > 0 && !initialText) {
          setCurrentSessionId(parsed[0].id);
          setMessages(parsed[0].messages);
        }
      } else {
        loadSessionsFromLocalStorage();
      }
    } catch {
      loadSessionsFromLocalStorage();
    }
  };

  const loadSessionsFromLocalStorage = () => {
    const saved = localStorage.getItem('quick_chat_sessions');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSessions(parsed);
        if (parsed.length > 0 && !initialText) {
          setCurrentSessionId(parsed[0].id);
          setMessages(parsed[0].messages);
        }
      } catch { /* ignore */ }
    }
  };

  const saveSessions = async (updated: ChatSession[]) => {
    setSessions(updated);
    try {
      const filePath = `${DATA_DIR}/${HISTORY_FILE}`;
      await writeTextFile(filePath, JSON.stringify(updated, null, 2), { dir: BaseDirectory.AppData });
    } catch { /* ignore */ }
    localStorage.setItem('quick_chat_sessions', JSON.stringify(updated));
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

    const updated = [newSession, ...sessions];
    saveSessions(updated);
    setCurrentSessionId(newSession.id);
    setMessages([]);
    setInputText(prefillText || '');
    setAttachments([]);
  };

  const switchSession = (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (session) {
      setCurrentSessionId(sessionId);
      setMessages(session.messages);
      if (session.model) setSelectedModel(session.model);
    }
  };

  const deleteSession = (sessionId: string) => setDeleteConfirmId(sessionId);

  const confirmDelete = () => {
    if (!deleteConfirmId) return;
    
    const updated = sessions.filter(s => s.id !== deleteConfirmId);
    saveSessions(updated);
    
    if (currentSessionId === deleteConfirmId) {
      if (updated.length > 0) {
        setCurrentSessionId(updated[0].id);
        setMessages(updated[0].messages);
      } else {
        setCurrentSessionId(null);
        setMessages([]);
      }
    }
    setDeleteConfirmId(null);
  };

  const startEditing = (session: ChatSession, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSessionId(session.id);
    setEditTitle(session.title);
  };

  const saveTitle = () => {
    if (editingSessionId && editTitle.trim()) {
      const updated = sessions.map(s => 
        s.id === editingSessionId ? { ...s, title: editTitle.trim() } : s
      );
      saveSessions(updated);
    }
    setEditingSessionId(null);
    setEditTitle('');
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    
    const newAttachments: AIAttachment[] = [];
    
    for (const file of Array.from(e.target.files)) {
      try {
        const reader = new FileReader();
        const dataUrl = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

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
      } catch { /* ignore */ }
    }

    setAttachments([...attachments, ...newAttachments]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const copyMessage = async (content: string, id: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMessageId(id);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch { /* ignore */ }
  };

  const regenerateMessage = async () => {
    if (messages.length < 2) return;
    
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
    if (!lastUserMsg) return;
    
    const newMessages = messages.slice(0, -1);
    setMessages(newMessages);
    
    await handleSendMessage(lastUserMsg.content, newMessages);
  };

  const installModel = async (modelName: string) => {
    setIsInstallingModel(true);
    setInstallProgress(`Installing ${modelName}...`);
    
    try {
      // Use ollama downloadModel method
      await ollamaManager.downloadModel(modelName, (progress) => {
        if (progress.status === 'downloading') {
          const percent = progress.totalBytes > 0 
            ? Math.round((progress.downloadedBytes / progress.totalBytes) * 100) 
            : 0;
          setInstallProgress(`Downloading ${modelName}: ${percent}%`);
        } else if (progress.status === 'verifying') {
          setInstallProgress(`Verifying ${modelName}...`);
        }
      });
      setInstallProgress(`${modelName} installed successfully!`);
      await loadModels();
      setTimeout(() => {
        setIsInstallingModel(false);
        setInstallProgress('');
      }, 2000);
    } catch (e) {
      setInstallProgress(`Failed to install: ${e}`);
      setTimeout(() => {
        setIsInstallingModel(false);
        setInstallProgress('');
      }, 3000);
    }
  };

  // Clean thinking tags from content
  const cleanContent = (content: string): { clean: string; thinking: string } => {
    let thinking = '';
    let clean = content;
    
    // Extract thinking content
    const thinkingMatch = content.match(/<thinking>([\s\S]*?)<\/thinking>/i);
    if (thinkingMatch) {
      thinking = thinkingMatch[1].trim();
      clean = content.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '').trim();
    }
    
    // Remove other markers
    clean = clean
      .replace(/\*thinking:[\s\S]*?\*output:/gi, '')
      .replace(/\*\/thinking[\s\S]*?\*\/output/gi, '')
      .replace(/<output>/gi, '')
      .replace(/<\/output>/gi, '')
      .trim();
    
    return { clean, thinking };
  };

  const handleSendMessage = async (contentOverride?: string, existingMessages?: Message[]) => {
    const text = contentOverride ?? inputText;
    if ((!text.trim() && attachments.length === 0) || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text.trim(),
      timestamp: Date.now(),
      attachments: attachments.length > 0 ? [...attachments] : undefined
    };

    const baseMessages = existingMessages ?? messages;
    const newMessages = [...baseMessages, userMessage];
    setMessages(newMessages);
    if (!contentOverride) setInputText('');
    const currentAttachments = [...attachments];
    setAttachments([]);
    setIsLoading(true);
    setStreamingContent('');

    const assistantId = (Date.now() + 1).toString();
    const assistantMessage: Message = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      model: selectedModel
    };
    setMessages([...newMessages, assistantMessage]);

    try {
      const modelInfo = availableModels.find(m => m.value === selectedModel);
      let provider: 'local' | 'openai' | 'perplexity' | 'gemini' | 'claude' | 'deepseek' | 'grok' = 'local';
      let modelName = selectedModel;

      if (modelInfo) {
        provider = modelInfo.provider as typeof provider;
        modelName = modelInfo.value;
      }

      let currentContent = '';
      let currentThinking = '';

      // Add system prompt for deep think mode
      let systemPrompt = '';
      if (deepThinkEnabled && modelCapabilities.supportsDeepThink) {
        systemPrompt = 'Think deeply and step by step. Show your reasoning process.';
      }
      if (webSearchEnabled && modelCapabilities.supportsWebSearch) {
        systemPrompt += ' Search the web for current information when needed.';
      }

      await universalAI.sendStreamingRequest({
        query: systemPrompt ? `${systemPrompt}\n\n${userMessage.content}` : userMessage.content,
        forceProvider: provider,
        forceModel: modelName,
        forceTemplate: 'ai_assistant',
        attachments: currentAttachments,
      }, (chunk) => {
        if (chunk.content) {
          currentContent += chunk.content;
          const { clean, thinking } = cleanContent(currentContent);
          setStreamingContent(clean);
          if (thinking) currentThinking = thinking;
        }
        if (chunk.thinking) {
          currentThinking += chunk.thinking;
        }
      });

      const { clean: finalContent, thinking: finalThinking } = cleanContent(currentContent);
      
      const finalMessage = {
        ...assistantMessage,
        content: finalContent,
        thinking: currentThinking || finalThinking
      };
      
      setMessages([...newMessages, finalMessage]);
      setStreamingContent('');

      // Save session
      const currentSessions = sessionsRef.current;
      const finalMessages = [...newMessages, finalMessage];

      if (currentSessionId) {
        let title = currentSessions.find(s => s.id === currentSessionId)?.title || 'New Chat';
        
        if (baseMessages.length === 0) {
          title = text.substring(0, 40) + (text.length > 40 ? '...' : '');
          generateTitle(text).then(t => {
            if (t) {
              const latest = sessionsRef.current;
              const updated = latest.map(s => s.id === currentSessionId ? { ...s, title: t } : s);
              saveSessions(updated);
            }
          });
        }

        const updated = currentSessions.map(s => 
          s.id === currentSessionId 
            ? { ...s, messages: finalMessages, updatedAt: Date.now(), title, model: selectedModel }
            : s
        );
        saveSessions(updated);
      } else {
        const newSession: ChatSession = {
          id: Date.now().toString(),
          title: text.substring(0, 40),
          messages: finalMessages,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          model: selectedModel
        };
        saveSessions([newSession, ...currentSessions]);
        setCurrentSessionId(newSession.id);
      }
    } catch (error) {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Failed to get response'}`,
        timestamp: Date.now(),
        isError: true
      };
      setMessages([...newMessages, errorMsg]);
    } finally {
      setIsLoading(false);
      setStreamingContent('');
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
      const models = await ollamaManager.listModels();
      // Prefer deepseek-r1 for title generation, fallback to other models
      const preferredModels = ['deepseek-r1', 'deepseek', 'llama', 'qwen', 'mistral', 'phi'];
      let targetModel = '';
      
      for (const preferred of preferredModels) {
        const found = models.find(m => m.name.toLowerCase().includes(preferred));
        if (found) {
          targetModel = found.name;
          break;
        }
      }
      
      if (!targetModel && models.length > 0) {
        targetModel = models[0].name;
      }
      
      if (targetModel) {
        const response = await ollamaManager.generate(
          targetModel, 
          `Create a very short 3-5 word title for this message. Only respond with the title, no quotes or explanation: "${content.substring(0, 100)}"`
        );
        return response.replace(/["']/g, '').trim().substring(0, 50);
      }
    } catch { /* ignore */ }
    return content.substring(0, 40);
  };

  // Group models by provider
  const groupedModels = useMemo(() => {
    const groups: Record<string, ModelInfo[]> = {};
    availableModels.forEach(m => {
      if (!groups[m.group]) groups[m.group] = [];
      groups[m.group].push(m);
    });
    return groups;
  }, [availableModels]);

  const selectedModelInfo = availableModels.find(m => m.value === selectedModel);

  return (
    <div className="qc-container">
      {/* Delete Modal */}
      {deleteConfirmId && (
        <div className="qc-modal-overlay" onClick={() => setDeleteConfirmId(null)}>
          <div className="qc-modal" onClick={e => e.stopPropagation()}>
            <div className="qc-modal-icon delete">
              <Trash2 size={24} />
            </div>
            <h3>Delete Chat?</h3>
            <p>This action cannot be undone.</p>
            <div className="qc-modal-actions">
              <button className="qc-btn secondary" onClick={() => setDeleteConfirmId(null)}>
                Cancel
              </button>
              <button className="qc-btn danger" onClick={confirmDelete}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <aside className="qc-sidebar">
        <div className="qc-sidebar-header">
          <button className="qc-new-chat" onClick={() => createNewSession()}>
            <Plus size={18} />
            <span>New Chat</span>
          </button>
        </div>

        <div className="qc-sessions">
          <div className="qc-sessions-label">Chat History</div>
          {sessions.map(session => (
            <div
              key={session.id}
              className={`qc-session ${currentSessionId === session.id ? 'active' : ''}`}
              onClick={() => switchSession(session.id)}
            >
              <MessageSquare size={16} className="qc-session-icon" />
              <div className="qc-session-content">
                {editingSessionId === session.id ? (
                  <input
                    className="qc-session-edit"
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    onBlur={saveTitle}
                    onKeyDown={e => e.key === 'Enter' && saveTitle()}
                    onClick={e => e.stopPropagation()}
                    autoFocus
                  />
                ) : (
                  <>
                    <span className="qc-session-title">{session.title || 'New Chat'}</span>
                    <span className="qc-session-date">
                      {new Date(session.updatedAt).toLocaleDateString()}
                    </span>
                  </>
                )}
              </div>
              {editingSessionId !== session.id && (
                <div className="qc-session-actions">
                  <button onClick={e => startEditing(session, e)} title="Rename">
                    <Edit3 size={14} />
                  </button>
                  <button 
                    onClick={e => { e.stopPropagation(); deleteSession(session.id); }}
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Quick Install */}
        <div className="qc-sidebar-footer">
          {isInstallingModel ? (
            <div className="qc-install-progress">
              <Loader2 size={14} className="spin" />
              <span>{installProgress}</span>
            </div>
          ) : (
            <div className="qc-quick-install">
              <span>Quick Install</span>
              <div className="qc-install-btns">
                {/* Show recommended models that are NOT installed */}
                {['llama3.2:3b', 'qwen2.5:3b', 'deepseek-r1:1.5b', 'mistral:7b', 'gemma2:2b', 'phi3:mini']
                  .filter(m => !availableModels.some(am => am.value === m || am.value.startsWith(m.split(':')[0])))
                  .slice(0, 3)
                  .map(m => (
                  <button 
                    key={m} 
                    onClick={() => installModel(m)}
                    title={`Install ${m}`}
                  >
                    <Download size={12} />
                    {m.split(':')[0]}
                  </button>
                ))}
                {/* If all recommended are installed, show message */}
                {['llama3.2:3b', 'qwen2.5:3b', 'deepseek-r1:1.5b', 'mistral:7b', 'gemma2:2b', 'phi3:mini']
                  .filter(m => !availableModels.some(am => am.value === m || am.value.startsWith(m.split(':')[0])))
                  .length === 0 && (
                  <span className="qc-all-installed">✓ All recommended installed</span>
                )}
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main Area */}
      <main className="qc-main">
        {/* Header */}
        <header className="qc-header">
          {/* Model Selector */}
          <div className="qc-model-selector" ref={dropdownRef}>
            <button 
              className={`qc-model-trigger ${isModelDropdownOpen ? 'open' : ''}`}
              onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
            >
              <div className="qc-model-info">
                <Bot size={16} />
                <span>{selectedModelInfo?.label || selectedModel || 'Select Model'}</span>
              </div>
              <ChevronDown size={16} className={`chevron ${isModelDropdownOpen ? 'open' : ''}`} />
            </button>
            
            {isModelDropdownOpen && (
              <div className="qc-model-dropdown">
                {Object.entries(groupedModels).map(([group, models]) => (
                  <div key={group} className="qc-model-group">
                    <div className="qc-model-group-label">{group}</div>
                    {models.map(m => (
                      <button
                        key={m.value}
                        className={`qc-model-option ${selectedModel === m.value ? 'active' : ''}`}
                        onClick={() => {
                          setSelectedModel(m.value);
                          localStorage.setItem('quickchat_selected_model', m.value);
                          setIsModelDropdownOpen(false);
                        }}
                      >
                        <span className="qc-model-name">{m.label}</span>
                        <div className="qc-model-badges">
                          {m.supportsVision && <span className="badge vision" title="Vision">👁</span>}
                          {m.supportsWebSearch && <span className="badge web" title="Web Search">🌐</span>}
                          {m.supportsDeepThink && <span className="badge think" title="Deep Think">🧠</span>}
                        </div>
                        {selectedModel === m.value && <Check size={14} className="check" />}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Feature Toggles */}
          <div className="qc-toggles">
            {modelCapabilities.supportsDeepThink && (
              <button 
                className={`qc-toggle ${deepThinkEnabled ? 'active' : ''}`}
                onClick={() => setDeepThinkEnabled(!deepThinkEnabled)}
                title="Deep Think Mode"
              >
                <Brain size={16} />
                <span>Deep Think</span>
              </button>
            )}
            {modelCapabilities.supportsWebSearch && (
              <button 
                className={`qc-toggle ${webSearchEnabled ? 'active' : ''}`}
                onClick={() => setWebSearchEnabled(!webSearchEnabled)}
                title="Web Search"
              >
                <Globe size={16} />
                <span>Web Search</span>
              </button>
            )}
            <button 
              className={`qc-toggle ${showThinking ? 'active' : ''}`}
              onClick={() => setShowThinking(!showThinking)}
              title="Show Thinking Process"
            >
              {showThinking ? <Eye size={16} /> : <EyeOff size={16} />}
              <span>Thinking</span>
            </button>
          </div>
        </header>

        {/* Messages */}
        <div className="qc-messages">
          {messages.length === 0 && !isLoading ? (
            <div className="qc-welcome">
              <div className="qc-welcome-icon">
                <Sparkles size={48} />
              </div>
              <h2>How can I help you today?</h2>
              <p>Ask me anything, upload files, or start a conversation.</p>
              <div className="qc-suggestions">
                {[
                  'Explain quantum computing',
                  'Write a Python function',
                  'Analyze this image',
                  'Help me debug code'
                ].map(s => (
                  <button key={s} onClick={() => setInputText(s)} className="qc-suggestion">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div key={msg.id} className={`qc-message ${msg.role} ${msg.isError ? 'error' : ''}`}>
                <div 
                  className={`qc-message-avatar ${msg.role === 'assistant' && msg.thinking ? 'has-thinking' : ''}`}
                  onClick={() => msg.role === 'assistant' && msg.thinking && setShowThinking(!showThinking)}
                  title={msg.role === 'assistant' && msg.thinking ? 'Click to toggle thinking process' : undefined}
                >
                  {msg.role === 'user' ? <User size={18} /> : <Bot size={18} />}
                  {msg.role === 'assistant' && msg.thinking && (
                    <span className="thinking-indicator">{showThinking ? '▼' : '▶'}</span>
                  )}
                </div>
                <div className="qc-message-body">
                  {/* Thinking Block */}
                  {msg.thinking && showThinking && (
                    <div className="qc-thinking">
                      <div className="qc-thinking-header">
                        <Brain size={14} />
                        <span>Thinking Process</span>
                      </div>
                      <div className="qc-thinking-content">{msg.thinking}</div>
                    </div>
                  )}
                  
                  {/* Attachments */}
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="qc-message-attachments">
                      {msg.attachments.map((att, i) => (
                        <div key={i} className="qc-msg-attachment">
                          {att.type === 'image' ? (
                            <img 
                              src={`data:${att.mimeType};base64,${att.data}`} 
                              alt={att.filename || 'Image'} 
                            />
                          ) : (
                            <div className="qc-file-preview">
                              <FileText size={20} />
                              <span>{att.filename}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Content */}
                  <div className="qc-message-content">
                    {msg.role === 'assistant' && !msg.content && idx === messages.length - 1 && isLoading ? (
                      streamingContent ? (
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {streamingContent}
                        </ReactMarkdown>
                      ) : (
                        <div className="qc-typing">
                          <span></span><span></span><span></span>
                        </div>
                      )
                    ) : (
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        components={{
                          code({ inline, className, children, ...props }: any) {
                            const match = /language-(\w+)/.exec(className || '');
                            return !inline && match ? (
                              <div className="qc-code-block">
                                <div className="qc-code-header">
                                  <span>{match[1]}</span>
                                  <button onClick={() => copyMessage(String(children), `code-${msg.id}`)}>
                                    {copiedMessageId === `code-${msg.id}` ? <Check size={12} /> : <Copy size={12} />}
                                  </button>
                                </div>
                                <pre {...props}>
                                  <code className={className}>{children}</code>
                                </pre>
                              </div>
                            ) : (
                              <code className={className} {...props}>{children}</code>
                            );
                          }
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    )}
                  </div>

                  {/* Message Meta */}
                  <div className="qc-message-meta">
                    {msg.model && <span className="qc-msg-model">{msg.model}</span>}
                    <span className="qc-msg-time">{new Date(msg.timestamp).toLocaleTimeString()}</span>
                    {msg.role === 'assistant' && msg.content && (
                      <div className="qc-msg-actions">
                        <button onClick={() => copyMessage(msg.content, msg.id)} title="Copy">
                          {copiedMessageId === msg.id ? <Check size={12} /> : <Copy size={12} />}
                        </button>
                        {idx === messages.length - 1 && (
                          <button onClick={regenerateMessage} title="Regenerate" disabled={isLoading}>
                            <RotateCcw size={12} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="qc-input-area">
          {/* Attachments Preview */}
          {attachments.length > 0 && (
            <div className="qc-attachments">
              {attachments.map((att, idx) => (
                <div key={idx} className="qc-attachment">
                  {att.type === 'image' ? (
                    <img src={`data:${att.mimeType};base64,${att.data}`} alt="" />
                  ) : (
                    <FileText size={16} />
                  )}
                  <span>{att.filename}</span>
                  <button onClick={() => removeAttachment(idx)}>
                    <X size={12} />
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
              accept="image/*,.pdf,.txt,.md,.json,.csv"
            />
            
            <button 
              className="qc-input-btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              title="Attach file"
            >
              <Paperclip size={18} />
            </button>

            <textarea
              ref={textareaRef}
              className="qc-input"
              placeholder="Message Bluesky AI..."
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={handleKeyPress}
              rows={1}
              disabled={isLoading}
            />

            <button
              className="qc-send-btn"
              onClick={() => handleSendMessage()}
              disabled={(!inputText.trim() && attachments.length === 0) || isLoading}
            >
              {isLoading ? <Loader2 size={18} className="spin" /> : <Send size={18} />}
            </button>
          </div>

          <div className="qc-disclaimer">
            AI can make mistakes. Please verify important information.
          </div>
        </div>
      </main>
    </div>
  );
};
