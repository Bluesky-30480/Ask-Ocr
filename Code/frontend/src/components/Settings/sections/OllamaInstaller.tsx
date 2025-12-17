import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { listen } from '@tauri-apps/api/event';
import './OllamaInstaller.css';

interface InstallProgress {
  stage: string;
  progress: number;
  message: string;
  error?: string;
}

export const OllamaInstaller: React.FC = () => {
  const [isInstalled, setIsInstalled] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [progress, setProgress] = useState<InstallProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ollamaPath, setOllamaPath] = useState<string | null>(null);

  useEffect(() => {
    checkStatus();

    // Listen for installation progress
    const unlisten = listen<InstallProgress>('ollama-install-progress', (event) => {
      setProgress(event.payload);
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  const checkStatus = async () => {
    try {
      const installed = await invoke<boolean>('check_ollama_installed');
      setIsInstalled(installed);

      if (installed) {
        const path = await invoke<string | null>('get_ollama_path');
        setOllamaPath(path);

        const running = await invoke<boolean>('check_ollama_running');
        setIsRunning(running);
      }
    } catch (err) {
      console.error('Failed to check Ollama status:', err);
    }
  };

  const handleInstall = async () => {
    setIsInstalling(true);
    setError(null);
    setProgress(null);

    try {
      await invoke('install_ollama_one_click');
      
      // Wait a bit and check status
      setTimeout(async () => {
        await checkStatus();
        setIsInstalling(false);
      }, 2000);
    } catch (err) {
      setError(err as string);
      setIsInstalling(false);
    }
  };

  const handleStartService = async () => {
    try {
      await invoke('start_ollama_service');
      
      // Wait and check status
      setTimeout(async () => {
        await checkStatus();
      }, 2000);
    } catch (err) {
      setError(err as string);
    }
  };

  const getStageLabel = (stage: string) => {
    switch (stage) {
      case 'downloading':
        return 'Downloading Ollama...';
      case 'installing':
        return 'Installing Ollama...';
      case 'complete':
        return 'Installation Complete!';
      default:
        return stage;
    }
  };

  return (
    <div className="ollama-installer">
      <div className="installer-header">
        <h3>Ollama Local AI</h3>
        <p>Run AI models locally on your machine for maximum privacy</p>
      </div>

      {/* Status Display */}
      <div className="status-section">
        <div className="status-item">
          <span className="status-label">Installation Status:</span>
          <span className={`status-badge ${isInstalled ? 'status-success' : 'status-warning'}`}>
            {isInstalled ? '✓ Installed' : '✗ Not Installed'}
          </span>
        </div>

        {isInstalled && (
          <>
            <div className="status-item">
              <span className="status-label">Service Status:</span>
              <span className={`status-badge ${isRunning ? 'status-success' : 'status-error'}`}>
                {isRunning ? '● Running' : '○ Stopped'}
              </span>
            </div>

            {ollamaPath && (
              <div className="status-item">
                <span className="status-label">Installation Path:</span>
                <span className="status-path">{ollamaPath}</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Installation Progress */}
      {isInstalling && progress && (
        <div className="progress-section">
          <div className="progress-header">
            <span className="progress-label">{getStageLabel(progress.stage)}</span>
            <span className="progress-percent">{Math.round(progress.progress)}%</span>
          </div>
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${progress.progress}%` }}
            />
          </div>
          <p className="progress-message">{progress.message}</p>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="error-section">
          <div className="error-icon">⚠️</div>
          <div className="error-content">
            <h4>Installation Failed</h4>
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="action-buttons">
        {!isInstalled && (
          <button
            className="btn-primary btn-install"
            onClick={handleInstall}
            disabled={isInstalling}
          >
            {isInstalling ? 'Installing...' : '📥 Install Ollama'}
          </button>
        )}

        {isInstalled && !isRunning && (
          <button
            className="btn-secondary"
            onClick={handleStartService}
          >
            ▶️ Start Service
          </button>
        )}

        <button
          className="btn-secondary"
          onClick={checkStatus}
          disabled={isInstalling}
        >
          🔄 Refresh Status
        </button>
      </div>

      {/* Info Section */}
      <div className="info-section">
        <h4>About Ollama</h4>
        <ul>
          <li>✓ Run AI models completely offline</li>
          <li>✓ No data sent to external servers</li>
          <li>✓ Support for Llama, Mistral, and more</li>
          <li>✓ Free and open source</li>
        </ul>
        
        <div className="info-links">
          <a href="https://ollama.com" target="_blank" rel="noopener noreferrer">
            Learn More →
          </a>
        </div>
      </div>
    </div>
  );
};

export default OllamaInstaller;
