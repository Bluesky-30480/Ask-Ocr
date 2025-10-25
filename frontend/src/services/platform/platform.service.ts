/**
 * Platform Detection and Management Service
 * Handles platform-specific differences for Windows, macOS, and Linux
 */

export type Platform = 'windows' | 'macos' | 'linux' | 'unknown';

export interface PlatformInfo {
  platform: Platform;
  arch: string;
  version: string;
  isWindows: boolean;
  isMacOS: boolean;
  isLinux: boolean;
}

export class PlatformService {
  private platformInfo: PlatformInfo | null = null;

  /**
   * Initialize platform detection
   */
  async initialize(): Promise<void> {
    const platform = await this.detectPlatform();
    const arch = await this.getArchitecture();
    const version = await this.getOSVersion();

    this.platformInfo = {
      platform,
      arch,
      version,
      isWindows: platform === 'windows',
      isMacOS: platform === 'macos',
      isLinux: platform === 'linux',
    };

    console.log('Platform detected:', this.platformInfo);
  }

  /**
   * Detect current platform
   */
  private async detectPlatform(): Promise<Platform> {
    // Try Tauri API first
    try {
      const { platform } = await import('@tauri-apps/api/os');
      const osPlatform = await platform();

      switch (osPlatform) {
        case 'win32':
          return 'windows';
        case 'darwin':
          return 'macos';
        case 'linux':
          return 'linux';
        default:
          return 'unknown';
      }
    } catch (error) {
      // Fallback to user agent detection
      const userAgent = navigator.userAgent.toLowerCase();

      if (userAgent.includes('win')) return 'windows';
      if (userAgent.includes('mac')) return 'macos';
      if (userAgent.includes('linux')) return 'linux';

      return 'unknown';
    }
  }

  /**
   * Get system architecture
   */
  private async getArchitecture(): Promise<string> {
    try {
      const { arch } = await import('@tauri-apps/api/os');
      return await arch();
    } catch (error) {
      return 'unknown';
    }
  }

  /**
   * Get OS version
   */
  private async getOSVersion(): Promise<string> {
    try {
      const { version } = await import('@tauri-apps/api/os');
      return await version();
    } catch (error) {
      return 'unknown';
    }
  }

  /**
   * Get platform information
   */
  getPlatformInfo(): PlatformInfo {
    if (!this.platformInfo) {
      throw new Error('Platform service not initialized. Call initialize() first.');
    }
    return { ...this.platformInfo };
  }

  /**
   * Check if running on Windows
   */
  isWindows(): boolean {
    return this.platformInfo?.isWindows ?? false;
  }

  /**
   * Check if running on macOS
   */
  isMacOS(): boolean {
    return this.platformInfo?.isMacOS ?? false;
  }

  /**
   * Check if running on Linux
   */
  isLinux(): boolean {
    return this.platformInfo?.isLinux ?? false;
  }

  /**
   * Get platform-specific path separator
   */
  getPathSeparator(): string {
    return this.isWindows() ? '\\' : '/';
  }

  /**
   * Get platform-specific modifier key (Ctrl/Cmd)
   */
  getModifierKey(): 'Ctrl' | 'Cmd' | 'Meta' {
    return this.isMacOS() ? 'Cmd' : 'Ctrl';
  }

  /**
   * Get platform-specific modifier key symbol
   */
  getModifierKeySymbol(): string {
    return this.isMacOS() ? '⌘' : 'Ctrl';
  }

  /**
   * Convert keyboard shortcut to platform-specific format
   */
  formatShortcut(shortcut: string): string {
    if (this.isMacOS()) {
      return shortcut
        .replace(/Ctrl/g, '⌘')
        .replace(/Alt/g, '⌥')
        .replace(/Shift/g, '⇧')
        .replace(/Enter/g, '↵');
    }
    return shortcut;
  }

  /**
   * Get platform-specific application data directory
   */
  async getAppDataPath(): Promise<string> {
    try {
      const { appDataDir } = await import('@tauri-apps/api/path');
      return await appDataDir();
    } catch (error) {
      console.error('Failed to get app data path:', error);
      throw error;
    }
  }

  /**
   * Get platform-specific documents directory
   */
  async getDocumentsPath(): Promise<string> {
    try {
      const { documentDir } = await import('@tauri-apps/api/path');
      return await documentDir();
    } catch (error) {
      console.error('Failed to get documents path:', error);
      throw error;
    }
  }

  /**
   * Get platform-specific downloads directory
   */
  async getDownloadsPath(): Promise<string> {
    try {
      const { downloadDir } = await import('@tauri-apps/api/path');
      return await downloadDir();
    } catch (error) {
      console.error('Failed to get downloads path:', error);
      throw error;
    }
  }

  /**
   * Get platform-specific config directory
   */
  async getConfigPath(): Promise<string> {
    try {
      const { configDir } = await import('@tauri-apps/api/path');
      return await configDir();
    } catch (error) {
      console.error('Failed to get config path:', error);
      throw error;
    }
  }

  /**
   * Check if platform supports feature
   */
  supportsFeature(feature: string): boolean {
    const features: Record<string, Platform[]> = {
      'global-shortcuts': ['windows', 'macos', 'linux'],
      'system-tray': ['windows', 'macos', 'linux'],
      'notifications': ['windows', 'macos', 'linux'],
      'transparency': ['windows', 'macos', 'linux'],
      'auto-launch': ['windows', 'macos', 'linux'],
      'touch-bar': ['macos'], // macOS only
      'jump-list': ['windows'], // Windows only
    };

    const supportedPlatforms = features[feature];
    if (!supportedPlatforms) return false;

    return supportedPlatforms.includes(this.platformInfo?.platform ?? 'unknown');
  }

  /**
   * Get platform-specific window decorations preference
   */
  getWindowDecorationsStyle(): 'native' | 'custom' {
    // macOS typically uses custom decorations for modern look
    // Windows can use both, but native is more familiar
    return this.isMacOS() ? 'custom' : 'native';
  }

  /**
   * Get platform-specific file dialog filters
   */
  getFileDialogFilters(): Array<{ name: string; extensions: string[] }> {
    return [
      { name: 'Text Files', extensions: ['txt'] },
      { name: 'PDF Files', extensions: ['pdf'] },
      { name: 'Markdown Files', extensions: ['md', 'markdown'] },
      { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'bmp'] },
      { name: 'All Files', extensions: ['*'] },
    ];
  }
}

// Export singleton instance
export const platformService = new PlatformService();
