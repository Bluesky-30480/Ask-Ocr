/**
 * Conversation Memory Service
 * Manages multi-turn conversation history and context for enhanced AI interactions
 */

import type { ConversationMemory } from './enhanced-prompt.service';

export interface ConversationSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ConversationMemory[];
  context: {
    ocrText?: string;
    documentId?: string;
    templateId?: string;
    domain?: string;
  };
  metadata: {
    totalMessages: number;
    lastActivity: string;
    tags?: string[];
    isArchived?: boolean;
  };
}

export interface ConversationSummary {
  keyTopics: string[];
  mainQuestions: string[];
  importantAnswers: string[];
  unresolved: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
}

export interface MemoryContext {
  recentMessages: ConversationMemory[];
  summary: ConversationSummary;
  relevantHistory: ConversationMemory[];
  contextualCues: string[];
}

export class ConversationMemoryService {
  private readonly STORAGE_KEY = 'conversation_sessions';
  private readonly MAX_SESSIONS = 100;
  private readonly MAX_MESSAGES_PER_SESSION = 50;

  private sessions = new Map<string, ConversationSession>();

  constructor() {
    this.loadFromStorage();
  }

  /**
   * Create a new conversation session
   */
  createSession(
    title?: string,
    context?: ConversationSession['context']
  ): string {
    const id = this.generateSessionId();
    const now = new Date().toISOString();

    const session: ConversationSession = {
      id,
      title: title || 'New Conversation',
      createdAt: now,
      updatedAt: now,
      messages: [],
      context: context || {},
      metadata: {
        totalMessages: 0,
        lastActivity: now,
        tags: [],
        isArchived: false,
      },
    };

    this.sessions.set(id, session);
    this.saveToStorage();
    return id;
  }

  /**
   * Add message to conversation
   */
  addMessage(
    sessionId: string,
    role: 'user' | 'assistant',
    content: string,
    metadata?: { templateId?: string; confidence?: number; processingTime?: number }
  ): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    const message: ConversationMemory = {
      role,
      content,
      timestamp: Date.now(),
      ...metadata,
    };

    session.messages.push(message);
    session.metadata.totalMessages = session.messages.length;
    session.metadata.lastActivity = new Date().toISOString();
    session.updatedAt = new Date().toISOString();

    // Auto-generate title from first user message
    if (session.messages.length === 1 && role === 'user') {
      session.title = this.generateTitleFromMessage(content);
    }

    // Limit message history
    if (session.messages.length > this.MAX_MESSAGES_PER_SESSION) {
      session.messages = session.messages.slice(-this.MAX_MESSAGES_PER_SESSION);
    }

    this.saveToStorage();
    return true;
  }

  /**
   * Get conversation session
   */
  getSession(sessionId: string): ConversationSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Get all sessions
   */
  getAllSessions(): ConversationSession[] {
    return Array.from(this.sessions.values())
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  /**
   * Get recent sessions
   */
  getRecentSessions(limit: number = 10): ConversationSession[] {
    return this.getAllSessions()
      .filter(s => !s.metadata.isArchived)
      .slice(0, limit);
  }

  /**
   * Delete session
   */
  deleteSession(sessionId: string): boolean {
    const deleted = this.sessions.delete(sessionId);
    if (deleted) {
      this.saveToStorage();
    }
    return deleted;
  }

  /**
   * Archive session
   */
  archiveSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    session.metadata.isArchived = true;
    session.updatedAt = new Date().toISOString();
    this.saveToStorage();
    return true;
  }

  /**
   * Update session title
   */
  updateSessionTitle(sessionId: string, title: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    session.title = title;
    session.updatedAt = new Date().toISOString();
    this.saveToStorage();
    return true;
  }

  /**
   * Get memory context for prompt generation
   */
  getMemoryContext(
    sessionId: string,
    maxRecentMessages: number = 10,
    includeSystemMessages: boolean = false
  ): MemoryContext {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return {
        recentMessages: [],
        summary: this.createEmptySummary(),
        relevantHistory: [],
        contextualCues: [],
      };
    }

    // Get recent messages
    let recentMessages = session.messages.slice(-maxRecentMessages);
    if (!includeSystemMessages) {
      recentMessages = recentMessages.filter(m => m.role === 'user' || m.role === 'assistant');
    }

    // Generate conversation summary
    const summary = this.generateConversationSummary(session.messages);

    // Find relevant historical messages (beyond recent)
    const relevantHistory = this.findRelevantHistory(
      session.messages,
      recentMessages,
      5
    );

    // Generate contextual cues
    const contextualCues = this.generateContextualCues(session);

    return {
      recentMessages,
      summary,
      relevantHistory,
      contextualCues,
    };
  }

  /**
   * Format memory context for prompt injection
   */
  formatMemoryForPrompt(
    memoryContext: MemoryContext,
    includeFullHistory: boolean = false
  ): string {
    const parts: string[] = [];

    // Add conversation summary if available
    if (memoryContext.summary.keyTopics.length > 0) {
      parts.push('CONVERSATION SUMMARY:');
      parts.push(`Key topics discussed: ${memoryContext.summary.keyTopics.join(', ')}`);
      
      if (memoryContext.summary.unresolved.length > 0) {
        parts.push(`Unresolved questions: ${memoryContext.summary.unresolved.join(', ')}`);
      }
      parts.push('');
    }

    // Add contextual cues
    if (memoryContext.contextualCues.length > 0) {
      parts.push('CONTEXT CUES:');
      memoryContext.contextualCues.forEach(cue => parts.push(`- ${cue}`));
      parts.push('');
    }

    // Add recent conversation history
    if (memoryContext.recentMessages.length > 0) {
      parts.push('RECENT CONVERSATION:');
      memoryContext.recentMessages.forEach(msg => {
        const role = msg.role === 'user' ? 'User' : 'Assistant';
        const timestamp = new Date(msg.timestamp).toLocaleTimeString();
        parts.push(`[${timestamp}] ${role}: ${msg.content}`);
      });
      parts.push('');
    }

    // Add relevant historical context if requested
    if (includeFullHistory && memoryContext.relevantHistory.length > 0) {
      parts.push('RELEVANT HISTORY:');
      memoryContext.relevantHistory.forEach(msg => {
        const role = msg.role === 'user' ? 'User' : 'Assistant';
        parts.push(`${role}: ${msg.content.substring(0, 100)}...`);
      });
      parts.push('');
    }

    return parts.join('\n');
  }

  /**
   * Search conversations
   */
  searchConversations(query: string): ConversationSession[] {
    const searchTerm = query.toLowerCase();
    
    return this.getAllSessions().filter(session => {
      // Search in title
      if (session.title.toLowerCase().includes(searchTerm)) {
        return true;
      }

      // Search in messages
      return session.messages.some(msg => 
        msg.content.toLowerCase().includes(searchTerm)
      );
    });
  }

  /**
   * Get conversation statistics
   */
  getStatistics(): {
    totalSessions: number;
    totalMessages: number;
    averageMessagesPerSession: number;
    mostActiveDay: string;
    topTopics: string[];
  } {
    const sessions = this.getAllSessions();
    const totalSessions = sessions.length;
    const totalMessages = sessions.reduce((sum, s) => sum + s.metadata.totalMessages, 0);
    const averageMessagesPerSession = totalSessions > 0 ? totalMessages / totalSessions : 0;

    // Find most active day
    const dayActivity = new Map<string, number>();
    sessions.forEach(session => {
      const day = session.createdAt.split('T')[0];
      dayActivity.set(day, (dayActivity.get(day) || 0) + 1);
    });

    const mostActiveDay = Array.from(dayActivity.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

    // Extract top topics (simplified)
    const topTopics = this.extractTopTopics(sessions);

    return {
      totalSessions,
      totalMessages,
      averageMessagesPerSession: Math.round(averageMessagesPerSession * 10) / 10,
      mostActiveDay,
      topTopics,
    };
  }

  /**
   * Export conversation
   */
  exportConversation(sessionId: string, format: 'json' | 'txt' | 'md' = 'json'): string {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');

    switch (format) {
      case 'json':
        return JSON.stringify(session, null, 2);
      
      case 'txt':
        return this.formatAsText(session);
      
      case 'md':
        return this.formatAsMarkdown(session);
      
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  /**
   * Import conversation
   */
  importConversation(data: string, _format: 'json' = 'json'): string {
    try {
      const session: ConversationSession = JSON.parse(data);
      
      // Validate session structure
      if (!this.validateSessionStructure(session)) {
        throw new Error('Invalid session structure');
      }

      // Generate new ID to avoid conflicts
      const newId = this.generateSessionId();
      session.id = newId;
      session.title = `${session.title} (Imported)`;

      this.sessions.set(newId, session);
      this.saveToStorage();
      
      return newId;
    } catch (err) {
      throw new Error(`Import failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate conversation summary
   */
  private generateConversationSummary(messages: ConversationMemory[]): ConversationSummary {
    if (messages.length === 0) {
      return this.createEmptySummary();
    }

    const userMessages = messages.filter(m => m.role === 'user');
    const assistantMessages = messages.filter(m => m.role === 'assistant');

    // Extract key topics (simplified keyword extraction)
    const keyTopics = this.extractKeywords(
      messages.map(m => m.content).join(' ')
    ).slice(0, 5);

    // Extract main questions
    const mainQuestions = userMessages
      .filter(m => m.content.includes('?'))
      .map(m => m.content.split('?')[0] + '?')
      .slice(0, 3);

    // Extract important answers (first sentence of longer responses)
    const importantAnswers = assistantMessages
      .filter(m => m.content.length > 100)
      .map(m => m.content.split('.')[0] + '.')
      .slice(0, 3);

    // Find unresolved questions (questions without follow-up)
    const unresolved = this.findUnresolvedQuestions(messages).slice(0, 2);

    // Determine sentiment (simplified)
    const sentiment = this.analyzeSentiment(messages);

    return {
      keyTopics,
      mainQuestions,
      importantAnswers,
      unresolved,
      sentiment,
    };
  }

  /**
   * Find relevant historical messages
   */
  private findRelevantHistory(
    allMessages: ConversationMemory[],
    recentMessages: ConversationMemory[],
    maxResults: number
  ): ConversationMemory[] {
    const recentContent = recentMessages.map(m => m.content.toLowerCase()).join(' ');
    const recentTimestamps = new Set(recentMessages.map(m => m.timestamp));

    // Find messages not in recent that have keyword overlap
    const candidates = allMessages
      .filter(m => !recentTimestamps.has(m.timestamp))
      .map(msg => ({
        message: msg,
        relevance: this.calculateRelevance(msg.content.toLowerCase(), recentContent),
      }))
      .filter(item => item.relevance > 0.1)
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, maxResults);

    return candidates.map(item => item.message);
  }

  /**
   * Generate contextual cues
   */
  private generateContextualCues(session: ConversationSession): string[] {
    const cues: string[] = [];

    // Add context from session metadata
    if (session.context.domain) {
      cues.push(`Domain: ${session.context.domain}`);
    }

    if (session.context.ocrText) {
      cues.push('OCR text is available for reference');
    }

    // Add temporal context
    const daysSinceCreated = Math.floor(
      (Date.now() - new Date(session.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceCreated === 0) {
      cues.push('This is a new conversation started today');
    } else if (daysSinceCreated === 1) {
      cues.push('This conversation was started yesterday');
    } else if (daysSinceCreated < 7) {
      cues.push(`This conversation was started ${daysSinceCreated} days ago`);
    }

    // Add message count context
    if (session.metadata.totalMessages > 20) {
      cues.push('This is an extended conversation with detailed history');
    } else if (session.metadata.totalMessages > 5) {
      cues.push('This conversation has some history');
    }

    return cues;
  }

  /**
   * Helper methods
   */
  private createEmptySummary(): ConversationSummary {
    return {
      keyTopics: [],
      mainQuestions: [],
      importantAnswers: [],
      unresolved: [],
      sentiment: 'neutral',
    };
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateTitleFromMessage(content: string): string {
    // Extract first meaningful phrase (up to 50 chars)
    const cleaned = content.replace(/[^\w\s]/g, '').trim();
    const words = cleaned.split(/\s+/).slice(0, 8);
    let title = words.join(' ');
    
    if (title.length > 50) {
      title = title.substring(0, 47) + '...';
    }
    
    return title || 'New Conversation';
  }

  private extractKeywords(text: string): string[] {
    // Simple keyword extraction
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3);

    const frequency = new Map<string, number>();
    words.forEach(word => {
      frequency.set(word, (frequency.get(word) || 0) + 1);
    });

    return Array.from(frequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
  }

  private findUnresolvedQuestions(messages: ConversationMemory[]): string[] {
    const questions: string[] = [];
    
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      if (msg.role === 'user' && msg.content.includes('?')) {
        // Check if there's a relevant answer in the next few messages
        const hasAnswer = messages
          .slice(i + 1, i + 3)
          .some(m => m.role === 'assistant' && m.content.length > 50);
        
        if (!hasAnswer) {
          questions.push(msg.content.split('?')[0] + '?');
        }
      }
    }

    return questions;
  }

  private analyzeSentiment(messages: ConversationMemory[]): 'positive' | 'neutral' | 'negative' {
    // Simple sentiment analysis based on keywords
    const text = messages.map(m => m.content).join(' ').toLowerCase();
    
    const positiveWords = ['good', 'great', 'excellent', 'perfect', 'thanks', 'helpful'];
    const negativeWords = ['bad', 'wrong', 'error', 'problem', 'issue', 'difficult'];
    
    const positiveCount = positiveWords.filter(word => text.includes(word)).length;
    const negativeCount = negativeWords.filter(word => text.includes(word)).length;
    
    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  private calculateRelevance(text1: string, text2: string): number {
    const words1 = new Set(text1.split(/\s+/));
    const words2 = new Set(text2.split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  private extractTopTopics(sessions: ConversationSession[]): string[] {
    const allText = sessions
      .flatMap(s => s.messages.map(m => m.content))
      .join(' ');
    
    return this.extractKeywords(allText).slice(0, 5);
  }

  private formatAsText(session: ConversationSession): string {
    const lines: string[] = [];
    
    lines.push(`Conversation: ${session.title}`);
    lines.push(`Created: ${new Date(session.createdAt).toLocaleString()}`);
    lines.push(`Messages: ${session.metadata.totalMessages}`);
    lines.push('');
    lines.push('-'.repeat(50));
    lines.push('');
    
    session.messages.forEach(msg => {
      const timestamp = new Date(msg.timestamp).toLocaleString();
      const role = msg.role === 'user' ? 'User' : 'Assistant';
      lines.push(`[${timestamp}] ${role}:`);
      lines.push(msg.content);
      lines.push('');
    });
    
    return lines.join('\n');
  }

  private formatAsMarkdown(session: ConversationSession): string {
    const lines: string[] = [];
    
    lines.push(`# ${session.title}`);
    lines.push('');
    lines.push(`**Created:** ${new Date(session.createdAt).toLocaleString()}`);
    lines.push(`**Messages:** ${session.metadata.totalMessages}`);
    lines.push('');
    
    session.messages.forEach(msg => {
      const timestamp = new Date(msg.timestamp).toLocaleString();
      const role = msg.role === 'user' ? '👤 User' : '🤖 Assistant';
      lines.push(`## ${role} - ${timestamp}`);
      lines.push('');
      lines.push(msg.content);
      lines.push('');
    });
    
    return lines.join('\n');
  }

  private validateSessionStructure(session: any): boolean {
    return (
      typeof session.id === 'string' &&
      typeof session.title === 'string' &&
      typeof session.createdAt === 'string' &&
      Array.isArray(session.messages) &&
      typeof session.metadata === 'object'
    );
  }

  private saveToStorage(): void {
    try {
      // Limit total sessions
      if (this.sessions.size > this.MAX_SESSIONS) {
        const sessions = this.getAllSessions();
        const toDelete = sessions.slice(this.MAX_SESSIONS);
        toDelete.forEach(session => this.sessions.delete(session.id));
      }

      const sessionsArray = Array.from(this.sessions.entries());
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(sessionsArray));
    } catch (err) {
      console.error('Failed to save conversation sessions:', err);
    }
  }

  private loadFromStorage(): void {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      if (data) {
        const sessionsArray = JSON.parse(data);
        this.sessions = new Map(sessionsArray);
      }
    } catch (err) {
      console.error('Failed to load conversation sessions:', err);
    }
  }
}

// Singleton instance
export const conversationMemoryService = new ConversationMemoryService();