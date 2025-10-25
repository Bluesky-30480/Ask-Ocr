/**
 * Platform Testing Service
 * Comprehensive cross-platform compatibility testing and validation
 */

import { platformService } from './platform.service';
import { shortcutMapper } from './shortcut-mapper.service';

export interface PlatformTestResult {
  testName: string;
  platform: string;
  passed: boolean;
  message: string;
  details?: any;
}

export class PlatformTesterService {
  private results: PlatformTestResult[] = [];

  /**
   * Run all platform compatibility tests
   */
  public async runAllTests(): Promise<PlatformTestResult[]> {
    this.results = [];

    await this.testPlatformDetection();
    await this.testPathGeneration();
    await this.testShortcutMapping();
    await this.testKeyModifiers();
    await this.testFileOperations();
    await this.testSystemIntegration();

    return this.results;
  }

  /**
   * Test platform detection accuracy
   */
  private async testPlatformDetection(): Promise<void> {
    try {
      const platform = platformService.getCurrentPlatform();
      const isWin = platformService.isWindows();
      const isMac = platformService.isMacOS();
      const isLinux = platformService.isLinux();

      // Only one should be true
      const count = [isWin, isMac, isLinux].filter(Boolean).length;

      this.addResult({
        testName: 'Platform Detection',
        platform: platform,
        passed: count === 1,
        message: count === 1 ? 'Platform detected correctly' : 'Multiple platforms detected',
        details: { platform, isWin, isMac, isLinux }
      });
    } catch (error) {
      this.addResult({
        testName: 'Platform Detection',
        platform: 'unknown',
        passed: false,
        message: `Error: ${error}`
      });
    }
  }

  /**
   * Test platform-specific path generation
   */
  private async testPathGeneration(): Promise<void> {
    try {
      const platform = platformService.getCurrentPlatform();
      const testPaths = {
        appData: await platformService.getAppDataPath(),
        userData: await platformService.getUserDataPath(),
        temp: await platformService.getTempPath(),
        documents: await platformService.getDocumentsPath()
      };

      // Verify paths are platform-appropriate
      let pathsValid = true;
      let invalidPaths: string[] = [];

      if (platformService.isWindows()) {
        // Windows paths should contain backslashes or use forward slashes
        Object.entries(testPaths).forEach(([key, path]) => {
          if (!path.includes('\\') && !path.includes('/')) {
            pathsValid = false;
            invalidPaths.push(key);
          }
        });
      } else {
        // Unix-like paths should start with /
        Object.entries(testPaths).forEach(([key, path]) => {
          if (!path.startsWith('/') && !path.startsWith('~')) {
            pathsValid = false;
            invalidPaths.push(key);
          }
        });
      }

      this.addResult({
        testName: 'Path Generation',
        platform,
        passed: pathsValid,
        message: pathsValid ? 'All paths valid for platform' : `Invalid paths: ${invalidPaths.join(', ')}`,
        details: testPaths
      });
    } catch (error) {
      this.addResult({
        testName: 'Path Generation',
        platform: platformService.getCurrentPlatform(),
        passed: false,
        message: `Error: ${error}`
      });
    }
  }

  /**
   * Test shortcut mapping for current platform
   */
  private async testShortcutMapping(): Promise<void> {
    try {
      const platform = platformService.getCurrentPlatform();
      const testShortcuts = [
        'copy',
        'paste',
        'save',
        'quit',
        'newWindow',
        'closeWindow'
      ];

      let allMapped = true;
      const mappingResults: Record<string, any> = {};

      testShortcuts.forEach(action => {
        const shortcut = shortcutMapper.getShortcut(action as any);
        mappingResults[action] = shortcut;
        if (!shortcut) {
          allMapped = false;
        }
      });

      // Verify platform-specific modifiers
      const copyShortcut = shortcutMapper.getShortcut('copy');
      let modifierCorrect = false;

      if (copyShortcut) {
        const shortcutKey = copyShortcut.shortcut;
        
        if (platformService.isMacOS()) {
          modifierCorrect = shortcutKey.includes('Cmd') || shortcutKey.includes('Command');
        } else {
          modifierCorrect = shortcutKey.includes('Ctrl') || shortcutKey.includes('Control');
        }
      }

      this.addResult({
        testName: 'Shortcut Mapping',
        platform,
        passed: allMapped && modifierCorrect,
        message: allMapped && modifierCorrect 
          ? 'All shortcuts mapped with correct modifiers' 
          : 'Some shortcuts missing or incorrect modifiers',
        details: mappingResults
      });
    } catch (error) {
      this.addResult({
        testName: 'Shortcut Mapping',
        platform: platformService.getCurrentPlatform(),
        passed: false,
        message: `Error: ${error}`
      });
    }
  }

  /**
   * Test key modifier detection
   */
  private async testKeyModifiers(): Promise<void> {
    try {
      const platform = platformService.getCurrentPlatform();
      const primaryModifier = platformService.getPrimaryModifier();
      const secondaryModifier = platformService.getSecondaryModifier();

      let modifiersCorrect = true;

      if (platformService.isMacOS()) {
        modifiersCorrect = primaryModifier === 'Cmd' && secondaryModifier === 'Option';
      } else {
        modifiersCorrect = primaryModifier === 'Ctrl' && secondaryModifier === 'Alt';
      }

      this.addResult({
        testName: 'Key Modifiers',
        platform,
        passed: modifiersCorrect,
        message: modifiersCorrect 
          ? 'Modifiers correct for platform' 
          : 'Incorrect modifiers',
        details: { primaryModifier, secondaryModifier }
      });
    } catch (error) {
      this.addResult({
        testName: 'Key Modifiers',
        platform: platformService.getCurrentPlatform(),
        passed: false,
        message: `Error: ${error}`
      });
    }
  }

  /**
   * Test file operation compatibility
   */
  private async testFileOperations(): Promise<void> {
    try {
      const platform = platformService.getCurrentPlatform();
      
      // Test path separator
      const separator = platformService.getPathSeparator();
      const expectedSeparator = platformService.isWindows() ? '\\' : '/';
      const separatorCorrect = separator === expectedSeparator;

      // Test home directory
      const homeDir = await platformService.getHomeDirectory();
      const homeDirValid = Boolean(homeDir && homeDir.length > 0);

      this.addResult({
        testName: 'File Operations',
        platform,
        passed: Boolean(separatorCorrect && homeDirValid),
        message: separatorCorrect && homeDirValid 
          ? 'File operations compatible' 
          : 'File operation issues detected',
        details: { 
          separator, 
          expectedSeparator, 
          homeDir,
          separatorCorrect,
          homeDirValid
        }
      });
    } catch (error) {
      this.addResult({
        testName: 'File Operations',
        platform: platformService.getCurrentPlatform(),
        passed: false,
        message: `Error: ${error}`
      });
    }
  }

  /**
   * Test system integration features
   */
  private async testSystemIntegration(): Promise<void> {
    try {
      const platform = platformService.getCurrentPlatform();
      
      // Test clipboard availability
      const clipboardAvailable = typeof navigator.clipboard !== 'undefined';
      
      // Test notification support
      const notificationsAvailable = 'Notification' in window;

      // Test file system access
      const fileSystemAvailable = 'showOpenFilePicker' in window || 'showSaveFilePicker' in window;

      const allAvailable = clipboardAvailable && notificationsAvailable;

      this.addResult({
        testName: 'System Integration',
        platform,
        passed: allAvailable,
        message: allAvailable 
          ? 'All system integrations available' 
          : 'Some integrations unavailable',
        details: {
          clipboardAvailable,
          notificationsAvailable,
          fileSystemAvailable
        }
      });
    } catch (error) {
      this.addResult({
        testName: 'System Integration',
        platform: platformService.getCurrentPlatform(),
        passed: false,
        message: `Error: ${error}`
      });
    }
  }

  /**
   * Add a test result
   */
  private addResult(result: PlatformTestResult): void {
    this.results.push(result);
    console.log(`[Platform Test] ${result.testName}: ${result.passed ? 'PASS' : 'FAIL'} - ${result.message}`);
  }

  /**
   * Get test summary
   */
  public getTestSummary(): { total: number; passed: number; failed: number; passRate: number } {
    const total = this.results.length;
    const passed = this.results.filter(r => r.passed).length;
    const failed = total - passed;
    const passRate = total > 0 ? (passed / total) * 100 : 0;

    return { total, passed, failed, passRate };
  }

  /**
   * Generate test report
   */
  public generateReport(): string {
    const summary = this.getTestSummary();
    const platform = platformService.getCurrentPlatform();

    let report = `# Platform Compatibility Test Report\n\n`;
    report += `**Platform**: ${platform}\n`;
    report += `**Date**: ${new Date().toISOString()}\n`;
    report += `**Pass Rate**: ${summary.passRate.toFixed(2)}%\n\n`;

    report += `## Summary\n`;
    report += `- Total Tests: ${summary.total}\n`;
    report += `- Passed: ${summary.passed}\n`;
    report += `- Failed: ${summary.failed}\n\n`;

    report += `## Test Results\n\n`;

    this.results.forEach(result => {
      const status = result.passed ? '✅ PASS' : '❌ FAIL';
      report += `### ${result.testName} - ${status}\n`;
      report += `**Message**: ${result.message}\n`;
      if (result.details) {
        report += `**Details**: \`\`\`json\n${JSON.stringify(result.details, null, 2)}\n\`\`\`\n`;
      }
      report += `\n`;
    });

    return report;
  }
}

// Export singleton instance
export const platformTester = new PlatformTesterService();
