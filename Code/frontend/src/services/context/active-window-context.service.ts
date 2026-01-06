/**
 * Active Window Context Detection Service
 * Detects the currently focused application and extracts relevant context
 * for context-aware AI assistance
 */

import { invoke } from '@tauri-apps/api/tauri';

export type ApplicationType =
  | 'browser'
  | 'code-editor'
  | 'office-word'
  | 'office-excel'
  | 'office-powerpoint'
  | 'email'
  | 'pdf-reader'
  | 'file-explorer'
  | 'terminal'
  | 'text-editor'
  | 'image-editor'
  | 'video-player'
  | 'chat'
  | 'unknown';

export interface ApplicationContext {
  // Application identification
  type: ApplicationType;
  name: string; // Application name (e.g., "Google Chrome", "VS Code")
  executable: string; // Process name (e.g., "chrome.exe", "code.exe")
  windowTitle: string; // Current window title
  
  // Context data (varies by application type)
  context: BrowserContext | CodeEditorContext | OfficeContext | FileExplorerContext | TerminalContext | GenericContext;
  
  // Selected/clipboard text
  selectedText?: string;
  
  // Metadata
  timestamp: number;
  confidence: number; // 0-1, how confident we are in the detection
}

export interface BrowserContext {
  type: 'browser';
  url?: string;
  pageTitle?: string;
  domain?: string;
  selectedText?: string;
  visibleText?: string; // Page content
}

export interface CodeEditorContext {
  type: 'code-editor';
  fileName?: string;
  filePath?: string;
  language?: string; // Programming language
  selectedCode?: string;
  cursorLine?: number;
  projectPath?: string;
}

export interface OfficeContext {
  type: 'office';
  documentType: 'word' | 'excel' | 'powerpoint';
  documentName?: string;
  documentPath?: string;
  selectedText?: string;
  currentSlide?: number; // For PowerPoint
  activeCell?: string; // For Excel
}

export interface FileExplorerContext {
  type: 'file-explorer';
  currentPath: string;
  selectedFiles?: string[];
  fileCount?: number;
}

export interface TerminalContext {
  type: 'terminal';
  currentDirectory?: string;
  lastCommand?: string;
  shellType?: string; // bash, zsh, powershell, cmd
}

export interface GenericContext {
  type: 'generic';
  selectedText?: string;
}

export interface ContextDetectionOptions {
  captureSelectedText?: boolean;
  captureClipboard?: boolean;
  useOCRFallback?: boolean;
  refreshRate?: number; // milliseconds
  privacyMode?: boolean; // Don't capture sensitive data
  disabledApps?: string[]; // Apps to ignore
}

export class ActiveWindowContextService {
  private currentContext: ApplicationContext | null = null;
  private detectionInterval?: number;
  private options: ContextDetectionOptions;
  private listeners: Array<(context: ApplicationContext) => void> = [];

  constructor(options: ContextDetectionOptions = {}) {
    this.options = {
      captureSelectedText: false,
      captureClipboard: false,
      useOCRFallback: false,
      refreshRate: 100, // 100ms
      privacyMode: false,
      disabledApps: [],
      ...options,
    };
  }

  /**
   * Start monitoring active window context
   */
  async startMonitoring(): Promise<void> {
    // Initial detection
    await this.detectContext();

    // Set up periodic detection
    this.detectionInterval = window.setInterval(async () => {
      await this.detectContext();
    }, this.options.refreshRate);
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.detectionInterval) {
      clearInterval(this.detectionInterval);
      this.detectionInterval = undefined;
    }
  }

  /**
   * Detect current application context
   */
  async detectContext(overrides?: Partial<ContextDetectionOptions>): Promise<ApplicationContext> {
    const opts = { ...this.options, ...overrides };
    try {
      // Get active window information from backend
      const windowInfo = await invoke<{
        processName: string;
        windowTitle: string;
        executable: string;
      }>('get_active_window_info');

      // Check if app is disabled
      if (opts.disabledApps?.includes(windowInfo.processName)) {
        return this.createUnknownContext(windowInfo);
      }

      // Classify application type
      const appType = this.classifyApplication(windowInfo.processName, windowInfo.windowTitle);

      // Extract context based on application type
      let context: ApplicationContext;

      switch (appType) {
        case 'browser':
          context = await this.extractBrowserContext(windowInfo);
          break;
        case 'code-editor':
          context = await this.extractCodeEditorContext(windowInfo);
          break;
        case 'office-word':
        case 'office-excel':
        case 'office-powerpoint':
          context = await this.extractOfficeContext(windowInfo, appType);
          break;
        case 'file-explorer':
          context = await this.extractFileExplorerContext(windowInfo);
          break;
        case 'terminal':
          context = await this.extractTerminalContext(windowInfo);
          break;
        default:
          context = await this.extractGenericContext(windowInfo);
      }

      // Capture selected text if enabled
      if (opts.captureSelectedText) {
        context.selectedText = await this.captureSelectedText(opts);
      }

      // Store and notify
      this.currentContext = context;
      this.notifyListeners(context);

      return context;
    } catch (error) {
      console.error('Context detection failed:', error);
      return this.createErrorContext();
    }
  }

  /**
   * Classify application based on process name and window title
   */
  private classifyApplication(processName: string, windowTitle: string): ApplicationType {
    const lower = processName.toLowerCase();
    const titleLower = windowTitle.toLowerCase();

    // Browser detection
    if (
      lower.includes('chrome') ||
      lower.includes('firefox') ||
      lower.includes('edge') ||
      lower.includes('safari') ||
      lower.includes('brave') ||
      lower.includes('opera')
    ) {
      return 'browser';
    }

    // Code editor detection
    if (
      lower.includes('code') ||
      lower.includes('vscode') ||
      lower.includes('sublime') ||
      lower.includes('atom') ||
      lower.includes('vim') ||
      lower.includes('emacs') ||
      lower.includes('intellij') ||
      lower.includes('pycharm') ||
      lower.includes('webstorm') ||
      lower.includes('visual studio')
    ) {
      return 'code-editor';
    }

    // Office applications
    if (lower.includes('winword') || lower.includes('word')) {
      return 'office-word';
    }
    if (lower.includes('excel')) {
      return 'office-excel';
    }
    if (lower.includes('powerpnt') || lower.includes('powerpoint')) {
      return 'office-powerpoint';
    }

    // Email clients
    if (
      lower.includes('outlook') ||
      lower.includes('thunderbird') ||
      lower.includes('mail')
    ) {
      return 'email';
    }

    // PDF readers
    if (
      lower.includes('acrobat') ||
      lower.includes('pdf') ||
      lower.includes('foxit') ||
      titleLower.includes('.pdf')
    ) {
      return 'pdf-reader';
    }

    // File explorer
    if (
      lower.includes('explorer') ||
      lower.includes('finder') ||
      lower.includes('nautilus') ||
      lower.includes('dolphin')
    ) {
      return 'file-explorer';
    }

    // Terminal/Command prompt
    if (
      lower.includes('terminal') ||
      lower.includes('cmd') ||
      lower.includes('powershell') ||
      lower.includes('bash') ||
      lower.includes('iterm') ||
      lower.includes('konsole')
    ) {
      return 'terminal';
    }

    // Text editors
    if (
      lower.includes('notepad') ||
      lower.includes('textedit') ||
      lower.includes('gedit')
    ) {
      return 'text-editor';
    }

    return 'unknown';
  }

  /**
   * Extract browser context
   */
  private async extractBrowserContext(windowInfo: any): Promise<ApplicationContext> {
    try {
      const browserData = await invoke<{
        url?: string;
        title?: string;
        selectedText?: string;
      }>('get_browser_context', {
        processName: windowInfo.processName,
      });

      const url = browserData.url || this.extractURLFromTitle(windowInfo.windowTitle);
      const domain = url ? new URL(url).hostname : undefined;

      return {
        type: 'browser',
        name: this.getBrowserName(windowInfo.processName),
        executable: windowInfo.executable,
        windowTitle: windowInfo.windowTitle,
        context: {
          type: 'browser',
          url,
          pageTitle: browserData.title || windowInfo.windowTitle,
          domain,
          selectedText: browserData.selectedText,
        },
        timestamp: Date.now(),
        confidence: url ? 0.9 : 0.6,
      };
    } catch (error) {
      // Fallback: parse from window title
      return this.createBrowserContextFromTitle(windowInfo);
    }
  }

  /**
   * Extract code editor context
   */
  private async extractCodeEditorContext(windowInfo: any): Promise<ApplicationContext> {
    try {
      const editorData = await invoke<{
        filePath?: string;
        fileName?: string;
        language?: string;
        selectedCode?: string;
        projectPath?: string;
      }>('get_editor_context', {
        processName: windowInfo.processName,
      });

      return {
        type: 'code-editor',
        name: this.getEditorName(windowInfo.processName),
        executable: windowInfo.executable,
        windowTitle: windowInfo.windowTitle,
        context: {
          type: 'code-editor',
          filePath: editorData.filePath,
          fileName: editorData.fileName || this.extractFileNameFromTitle(windowInfo.windowTitle),
          language: editorData.language || this.detectLanguageFromFileName(editorData.fileName),
          selectedCode: editorData.selectedCode,
          projectPath: editorData.projectPath,
        },
        timestamp: Date.now(),
        confidence: 0.85,
      };
    } catch (error) {
      // Fallback: parse from window title
      return this.createCodeEditorContextFromTitle(windowInfo);
    }
  }

  /**
   * Extract Office application context
   */
  private async extractOfficeContext(
    windowInfo: any,
    appType: ApplicationType
  ): Promise<ApplicationContext> {
    try {
      const officeData = await invoke<{
        documentPath?: string;
        documentName?: string;
        selectedText?: string;
        currentSlide?: number;
        activeCell?: string;
      }>('get_office_context', {
        processName: windowInfo.processName,
        appType,
      });

      const documentType = appType === 'office-word' ? 'word' : appType === 'office-excel' ? 'excel' : 'powerpoint';

      return {
        type: appType,
        name: this.getOfficeName(appType),
        executable: windowInfo.executable,
        windowTitle: windowInfo.windowTitle,
        context: {
          type: 'office',
          documentType,
          documentPath: officeData.documentPath,
          documentName: officeData.documentName || this.extractDocNameFromTitle(windowInfo.windowTitle),
          selectedText: officeData.selectedText,
          currentSlide: officeData.currentSlide,
          activeCell: officeData.activeCell,
        },
        timestamp: Date.now(),
        confidence: 0.8,
      };
    } catch (error) {
      return this.createOfficeContextFromTitle(windowInfo, appType);
    }
  }

  /**
   * Extract file explorer context
   */
  private async extractFileExplorerContext(windowInfo: any): Promise<ApplicationContext> {
    try {
      const explorerData = await invoke<{
        currentPath: string;
        selectedFiles?: string[];
      }>('get_file_explorer_context');

      return {
        type: 'file-explorer',
        name: 'File Explorer',
        executable: windowInfo.executable,
        windowTitle: windowInfo.windowTitle,
        context: {
          type: 'file-explorer',
          currentPath: explorerData.currentPath,
          selectedFiles: explorerData.selectedFiles,
          fileCount: explorerData.selectedFiles?.length || 0,
        },
        timestamp: Date.now(),
        confidence: 0.9,
      };
    } catch (error) {
      return this.createFileExplorerContextFromTitle(windowInfo);
    }
  }

  /**
   * Extract terminal context
   */
  private async extractTerminalContext(windowInfo: any): Promise<ApplicationContext> {
    try {
      const terminalData = await invoke<{
        currentDirectory?: string;
        lastCommand?: string;
        shellType?: string;
      }>('get_terminal_context', {
        processName: windowInfo.processName,
      });

      return {
        type: 'terminal',
        name: this.getTerminalName(windowInfo.processName),
        executable: windowInfo.executable,
        windowTitle: windowInfo.windowTitle,
        context: {
          type: 'terminal',
          currentDirectory: terminalData.currentDirectory,
          lastCommand: terminalData.lastCommand,
          shellType: terminalData.shellType || this.detectShellType(windowInfo.processName),
        },
        timestamp: Date.now(),
        confidence: 0.75,
      };
    } catch (error) {
      return this.createTerminalContextFromTitle(windowInfo);
    }
  }

  /**
   * Extract generic context
   */
  private async extractGenericContext(windowInfo: any): Promise<ApplicationContext> {
    return {
      type: 'unknown',
      name: windowInfo.processName,
      executable: windowInfo.executable,
      windowTitle: windowInfo.windowTitle,
      context: {
        type: 'generic',
      },
      timestamp: Date.now(),
      confidence: 0.5,
    };
  }

  /**
   * Capture selected text from active window
   */
  private async captureSelectedText(opts: ContextDetectionOptions): Promise<string | undefined> {
    try {
      // Try accessibility API first
      const text = await invoke<string | null>('get_selected_text');
      if (text) return text;

      // Fallback to clipboard monitoring
      if (opts.captureClipboard) {
        const clipboard = await navigator.clipboard.readText();
        return clipboard || undefined;
      }

      return undefined;
    } catch (error) {
      return undefined;
    }
  }

  /**
   * Get current context
   */
  getCurrentContext(): ApplicationContext | null {
    return this.currentContext;
  }

  /**
   * Add context change listener
   */
  addListener(callback: (context: ApplicationContext) => void): void {
    this.listeners.push(callback);
  }

  /**
   * Remove listener
   */
  removeListener(callback: (context: ApplicationContext) => void): void {
    this.listeners = this.listeners.filter(l => l !== callback);
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(context: ApplicationContext): void {
    this.listeners.forEach(listener => {
      try {
        listener(context);
      } catch (error) {
        console.error('Listener error:', error);
      }
    });
  }

  /**
   * Update options
   */
  updateOptions(options: Partial<ContextDetectionOptions>): void {
    this.options = { ...this.options, ...options };
    
    // Restart monitoring with new refresh rate
    if (options.refreshRate && this.detectionInterval) {
      this.stopMonitoring();
      this.startMonitoring();
    }
  }

  // Helper methods for fallback parsing

  private extractURLFromTitle(title: string): string | undefined {
    const urlMatch = title.match(/(https?:\/\/[^\s]+)/);
    return urlMatch ? urlMatch[1] : undefined;
  }

  private extractFileNameFromTitle(title: string): string | undefined {
    const fileMatch = title.match(/([^\\\/]+\.\w+)/);
    return fileMatch ? fileMatch[1] : undefined;
  }

  private extractDocNameFromTitle(title: string): string | undefined {
    // Office apps usually show "DocumentName - Application"
    const match = title.match(/^(.+?)\s*-\s*(Word|Excel|PowerPoint)/);
    return match ? match[1].trim() : undefined;
  }

  private detectLanguageFromFileName(fileName?: string): string | undefined {
    if (!fileName) return undefined;
    
    const ext = fileName.split('.').pop()?.toLowerCase();
    const langMap: Record<string, string> = {
      js: 'javascript',
      ts: 'typescript',
      tsx: 'typescript-react',
      jsx: 'javascript-react',
      py: 'python',
      java: 'java',
      cpp: 'cpp',
      c: 'c',
      cs: 'csharp',
      go: 'go',
      rs: 'rust',
      php: 'php',
      rb: 'ruby',
      swift: 'swift',
      kt: 'kotlin',
    };
    
    return ext ? langMap[ext] : undefined;
  }

  private detectShellType(processName: string): string {
    const lower = processName.toLowerCase();
    if (lower.includes('powershell')) return 'powershell';
    if (lower.includes('cmd')) return 'cmd';
    if (lower.includes('bash')) return 'bash';
    if (lower.includes('zsh')) return 'zsh';
    return 'unknown';
  }

  private getBrowserName(processName: string): string {
    const lower = processName.toLowerCase();
    if (lower.includes('chrome')) return 'Google Chrome';
    if (lower.includes('firefox')) return 'Mozilla Firefox';
    if (lower.includes('edge')) return 'Microsoft Edge';
    if (lower.includes('safari')) return 'Safari';
    if (lower.includes('brave')) return 'Brave';
    if (lower.includes('opera')) return 'Opera';
    return 'Browser';
  }

  private getEditorName(processName: string): string {
    const lower = processName.toLowerCase();
    if (lower.includes('code')) return 'VS Code';
    if (lower.includes('sublime')) return 'Sublime Text';
    if (lower.includes('atom')) return 'Atom';
    if (lower.includes('intellij')) return 'IntelliJ IDEA';
    if (lower.includes('pycharm')) return 'PyCharm';
    return 'Code Editor';
  }

  private getOfficeName(appType: ApplicationType): string {
    if (appType === 'office-word') return 'Microsoft Word';
    if (appType === 'office-excel') return 'Microsoft Excel';
    if (appType === 'office-powerpoint') return 'Microsoft PowerPoint';
    return 'Office Application';
  }

  private getTerminalName(processName: string): string {
    const lower = processName.toLowerCase();
    if (lower.includes('powershell')) return 'PowerShell';
    if (lower.includes('cmd')) return 'Command Prompt';
    if (lower.includes('iterm')) return 'iTerm';
    if (lower.includes('terminal')) return 'Terminal';
    return 'Terminal';
  }

  // Fallback context creators

  private createBrowserContextFromTitle(windowInfo: any): ApplicationContext {
    return {
      type: 'browser',
      name: this.getBrowserName(windowInfo.processName),
      executable: windowInfo.executable,
      windowTitle: windowInfo.windowTitle,
      context: {
        type: 'browser',
        pageTitle: windowInfo.windowTitle,
      },
      timestamp: Date.now(),
      confidence: 0.5,
    };
  }

  private createCodeEditorContextFromTitle(windowInfo: any): ApplicationContext {
    return {
      type: 'code-editor',
      name: this.getEditorName(windowInfo.processName),
      executable: windowInfo.executable,
      windowTitle: windowInfo.windowTitle,
      context: {
        type: 'code-editor',
        fileName: this.extractFileNameFromTitle(windowInfo.windowTitle),
      },
      timestamp: Date.now(),
      confidence: 0.5,
    };
  }

  private createOfficeContextFromTitle(windowInfo: any, appType: ApplicationType): ApplicationContext {
    const documentType = appType === 'office-word' ? 'word' : appType === 'office-excel' ? 'excel' : 'powerpoint';
    
    return {
      type: appType,
      name: this.getOfficeName(appType),
      executable: windowInfo.executable,
      windowTitle: windowInfo.windowTitle,
      context: {
        type: 'office',
        documentType,
        documentName: this.extractDocNameFromTitle(windowInfo.windowTitle),
      },
      timestamp: Date.now(),
      confidence: 0.5,
    };
  }

  private createFileExplorerContextFromTitle(windowInfo: any): ApplicationContext {
    return {
      type: 'file-explorer',
      name: 'File Explorer',
      executable: windowInfo.executable,
      windowTitle: windowInfo.windowTitle,
      context: {
        type: 'file-explorer',
        currentPath: windowInfo.windowTitle,
      },
      timestamp: Date.now(),
      confidence: 0.4,
    };
  }

  private createTerminalContextFromTitle(windowInfo: any): ApplicationContext {
    return {
      type: 'terminal',
      name: this.getTerminalName(windowInfo.processName),
      executable: windowInfo.executable,
      windowTitle: windowInfo.windowTitle,
      context: {
        type: 'terminal',
        shellType: this.detectShellType(windowInfo.processName),
      },
      timestamp: Date.now(),
      confidence: 0.5,
    };
  }

  private createUnknownContext(windowInfo: any): ApplicationContext {
    return {
      type: 'unknown',
      name: windowInfo.processName,
      executable: windowInfo.executable,
      windowTitle: windowInfo.windowTitle,
      context: {
        type: 'generic',
      },
      timestamp: Date.now(),
      confidence: 0.3,
    };
  }

  private createErrorContext(): ApplicationContext {
    return {
      type: 'unknown',
      name: 'Unknown',
      executable: '',
      windowTitle: '',
      context: {
        type: 'generic',
      },
      timestamp: Date.now(),
      confidence: 0,
    };
  }
}

// Singleton instance
export const activeWindowContext = new ActiveWindowContextService();
