import React, { useState, useEffect } from 'react';
import './ModelInstallPathSelector.css';
import { invoke } from '@tauri-apps/api/tauri';

export interface PathInfo {
  path: string;
  exists: boolean;
  isWritable: boolean;
  availableSpace: number; // bytes
  totalSpace: number; // bytes
  isValid: boolean;
  error?: string;
}

export interface ModelInstallPathSelectorProps {
  onPathSelected: (path: string) => void;
  requiredSpace: number; // bytes
  initialPath?: string;
}

const ModelInstallPathSelector: React.FC<ModelInstallPathSelectorProps> = ({
  onPathSelected,
  requiredSpace,
  initialPath,
}) => {
  const [selectedPath, setSelectedPath] = useState<string>(initialPath || '');
  const [pathInfo, setPathInfo] = useState<PathInfo | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [useCustomPath, setUseCustomPath] = useState(false);

  // Platform-specific default paths
  const getDefaultPath = (): string => {
    const platform = window.navigator.platform.toLowerCase();
    
    if (platform.includes('win')) {
      return '%APPDATA%\\AskOcr\\models';
    } else if (platform.includes('mac')) {
      return '~/Library/Application Support/AskOcr/models';
    } else {
      return '~/.local/share/askoocr/models';
    }
  };

  const [defaultPath] = useState(getDefaultPath());

  useEffect(() => {
    // Check default path on mount
    if (!selectedPath) {
      setSelectedPath(defaultPath);
      checkPath(defaultPath);
    }
  }, []);

  useEffect(() => {
    if (selectedPath) {
      checkPath(selectedPath);
    }
  }, [selectedPath]);

  /**
   * Check if path is valid and has sufficient space
   */
  const checkPath = async (path: string): Promise<void> => {
    setIsChecking(true);

    try {
      const result = await invoke<PathInfo>('check_install_path', {
        path,
        requiredSpace,
      });

      setPathInfo(result);

      // Notify parent if path is valid
      if (result.isValid) {
        onPathSelected(path);
      }
    } catch (error) {
      setPathInfo({
        path,
        exists: false,
        isWritable: false,
        availableSpace: 0,
        totalSpace: 0,
        isValid: false,
        error: error instanceof Error ? error.message : 'Failed to check path',
      });
    } finally {
      setIsChecking(false);
    }
  };

  /**
   * Browse for custom path
   */
  const browseForPath = async (): Promise<void> => {
    try {
      const selected = await invoke<string>('select_directory', {
        title: 'Select Model Installation Directory',
        defaultPath: selectedPath || defaultPath,
      });

      if (selected) {
        setSelectedPath(selected);
        setUseCustomPath(true);
      }
    } catch (error) {
      console.error('Failed to select directory:', error);
    }
  };

  /**
   * Reset to default path
   */
  const resetToDefault = (): void => {
    setSelectedPath(defaultPath);
    setUseCustomPath(false);
  };

  /**
   * Format bytes for display
   */
  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) {
      return `${bytes} B`;
    } else if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    } else if (bytes < 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    } else {
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    }
  };

  /**
   * Get storage usage percentage
   */
  const getStoragePercentage = (): number => {
    if (!pathInfo || pathInfo.totalSpace === 0) return 0;
    const used = pathInfo.totalSpace - pathInfo.availableSpace;
    return (used / pathInfo.totalSpace) * 100;
  };

  /**
   * Check if available space is sufficient
   */
  const hasEnoughSpace = (): boolean => {
    if (!pathInfo) return false;
    return pathInfo.availableSpace >= requiredSpace;
  };

  type SpaceWarningLevel = 'ok' | 'warning' | 'critical';

  /**
   * Get warning level for available space
   */
  const getSpaceWarningLevel = (): SpaceWarningLevel => {
    if (!pathInfo) return 'ok';
    
    const minRecommendedSpace = 10 * 1024 * 1024 * 1024; // 10 GB
    
    if (pathInfo.availableSpace < requiredSpace) {
      return 'critical';
    } else if (pathInfo.availableSpace < minRecommendedSpace) {
      return 'warning';
    }
    
    return 'ok';
  };

  return (
    <div className="model-install-path-selector">
      <h3>Installation Location</h3>
      
      {/* Path Selection Mode */}
      <div className="path-mode-selector">
        <label className={!useCustomPath ? 'active' : ''}>
          <input
            type="radio"
            checked={!useCustomPath}
            onChange={() => resetToDefault()}
          />
          <span>Use default location</span>
        </label>
        
        <label className={useCustomPath ? 'active' : ''}>
          <input
            type="radio"
            checked={useCustomPath}
            onChange={() => setUseCustomPath(true)}
          />
          <span>Choose custom location</span>
        </label>
      </div>

      {/* Path Display */}
      <div className="path-display">
        <div className="path-input-group">
          <input
            type="text"
            value={selectedPath}
            onChange={(e) => setSelectedPath(e.target.value)}
            placeholder="Select installation path..."
            disabled={!useCustomPath}
            className={`input-control ${pathInfo?.isValid ? 'valid' : 'invalid'}`}
          />
          <button
            className="button-control secondary"
            onClick={browseForPath}
            disabled={isChecking}
          >
            📁 Browse
          </button>
        </div>

        {/* Path Info Display */}
        {isChecking && (
          <div className="path-checking">
            <div className="spinner-small"></div>
            <span>Checking path...</span>
          </div>
        )}

        {pathInfo && !isChecking && (
          <div className={`path-info ${pathInfo.isValid ? 'valid' : 'invalid'}`}>
            {/* Validation Status */}
            <div className="validation-status">
              {pathInfo.isValid ? (
                <span className="status-success">✓ Valid installation path</span>
              ) : (
                <span className="status-error">✗ Invalid path: {pathInfo.error}</span>
              )}
            </div>

            {/* Storage Information */}
            {pathInfo.isValid && (
              <div className="storage-info">
                <div className="storage-header">
                  <h4>Storage Information</h4>
                  <span className={`space-indicator ${getSpaceWarningLevel()}`}>
                    {formatBytes(pathInfo.availableSpace)} available
                  </span>
                </div>

                {/* Storage Bar */}
                <div className="storage-bar">
                  <div
                    className="storage-used"
                    style={{ width: `${getStoragePercentage()}%` }}
                  ></div>
                  <div
                    className="storage-required"
                    style={{
                      width: `${(requiredSpace / pathInfo.totalSpace) * 100}%`,
                      left: `${getStoragePercentage()}%`
                    }}
                  ></div>
                </div>

                <div className="storage-labels">
                  <span>Used: {formatBytes(pathInfo.totalSpace - pathInfo.availableSpace)}</span>
                  <span>Required: {formatBytes(requiredSpace)}</span>
                  <span>Total: {formatBytes(pathInfo.totalSpace)}</span>
                </div>

                {/* Space Warnings */}
                {!hasEnoughSpace() && (
                  <div className="space-warning critical">
                    ⚠️ Insufficient disk space. Need {formatBytes(requiredSpace - pathInfo.availableSpace)} more.
                  </div>
                )}

                {hasEnoughSpace() && getSpaceWarningLevel() === 'warning' && (
                  <div className="space-warning warning">
                    ⚠️ Less than 10 GB remaining. Consider freeing up disk space for optimal performance.
                  </div>
                )}

                {/* Permissions Info */}
                <div className="permissions-info">
                  <div className="permission-item">
                    <span className={pathInfo.exists ? 'success' : 'warning'}>
                      {pathInfo.exists ? '✓' : '○'} Directory {pathInfo.exists ? 'exists' : 'will be created'}
                    </span>
                  </div>
                  <div className="permission-item">
                    <span className={pathInfo.isWritable ? 'success' : 'error'}>
                      {pathInfo.isWritable ? '✓' : '✗'} Write permission
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Platform-Specific Default Paths Info */}
      <div className="default-paths-info">
        <h4>Default Locations by Platform</h4>
        <div className="platform-paths">
          <div className="platform-path">
            <strong>Windows:</strong>
            <code>%APPDATA%\AskOcr\models</code>
          </div>
          <div className="platform-path">
            <strong>macOS:</strong>
            <code>~/Library/Application Support/AskOcr/models</code>
          </div>
          <div className="platform-path">
            <strong>Linux:</strong>
            <code>~/.local/share/askoocr/models</code>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModelInstallPathSelector;
