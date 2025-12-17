import React, { useState, useEffect } from 'react';
import './StatusBar.css';

interface StatusBarProps {
  connectionStatus: 'connected' | 'connecting' | 'disconnected' | 'error';
  modelStatus: 'ready' | 'loading' | 'error' | 'unavailable';
  currentModel?: string;
  processingCount?: number;
  onModelClick?: () => void;
  onConnectionClick?: () => void;
}

interface SystemStats {
  memoryUsage: number;
  cpuUsage: number;
  activeProcesses: number;
}

const StatusBar: React.FC<StatusBarProps> = ({
  connectionStatus,
  modelStatus,
  currentModel = 'Local AI',
  processingCount = 0,
  onModelClick,
  onConnectionClick,
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [systemStats, setSystemStats] = useState<SystemStats>({
    memoryUsage: 0,
    cpuUsage: 0,
    activeProcesses: 0,
  });
  const [showDetails, setShowDetails] = useState(false);

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Mock system stats - replace with actual system monitoring
  useEffect(() => {
    const updateStats = () => {
      setSystemStats({
        memoryUsage: Math.random() * 100,
        cpuUsage: Math.random() * 100,
        activeProcesses: Math.floor(Math.random() * 10) + 1,
      });
    };

    updateStats();
    const interval = setInterval(updateStats, 5000);

    return () => clearInterval(interval);
  }, []);

  const getConnectionStatusInfo = () => {
    switch (connectionStatus) {
      case 'connected':
        return {
          icon: '🟢',
          text: 'Connected',
          color: 'var(--color-success)',
        };
      case 'connecting':
        return {
          icon: '🟡',
          text: 'Connecting...',
          color: 'var(--color-warning)',
        };
      case 'disconnected':
        return {
          icon: '🔴',
          text: 'Disconnected',
          color: 'var(--color-error)',
        };
      case 'error':
        return {
          icon: '⚠️',
          text: 'Connection Error',
          color: 'var(--color-error)',
        };
      default:
        return {
          icon: '⚪',
          text: 'Unknown',
          color: 'var(--color-text-tertiary)',
        };
    }
  };

  const getModelStatusInfo = () => {
    switch (modelStatus) {
      case 'ready':
        return {
          icon: '✅',
          text: 'Ready',
          color: 'var(--color-success)',
        };
      case 'loading':
        return {
          icon: '⏳',
          text: 'Loading...',
          color: 'var(--color-warning)',
        };
      case 'error':
        return {
          icon: '❌',
          text: 'Error',
          color: 'var(--color-error)',
        };
      case 'unavailable':
        return {
          icon: '🚫',
          text: 'Unavailable',
          color: 'var(--color-text-tertiary)',
        };
      default:
        return {
          icon: '❓',
          text: 'Unknown',
          color: 'var(--color-text-tertiary)',
        };
    }
  };

  const connectionInfo = getConnectionStatusInfo();
  const modelInfo = getModelStatusInfo();

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatMemory = (bytes: number) => {
    return `${Math.round(bytes)}%`;
  };

  return (
    <div className="status-bar">
      {/* Left Section - Connection & Model Status */}
      <div className="status-section status-left">
        <button
          className="status-item clickable"
          onClick={onConnectionClick}
          title="Connection Status"
        >
          <span className="status-icon">{connectionInfo.icon}</span>
          <span className="status-text" style={{ color: connectionInfo.color }}>
            {connectionInfo.text}
          </span>
        </button>

        <div className="status-divider"></div>

        <button
          className="status-item clickable"
          onClick={onModelClick}
          title={`Model: ${currentModel}`}
        >
          <span className="status-icon">{modelInfo.icon}</span>
          <span className="status-text">
            <span className="model-name">{currentModel}</span>
            <span className="model-status" style={{ color: modelInfo.color }}>
              {modelInfo.text}
            </span>
          </span>
        </button>

        {processingCount > 0 && (
          <>
            <div className="status-divider"></div>
            <div className="status-item">
              <span className="status-icon">⚡</span>
              <span className="status-text">
                {processingCount} processing
              </span>
            </div>
          </>
        )}
      </div>

      {/* Center Section - System Stats */}
      <div className="status-section status-center">
        <button
          className="status-item clickable system-stats"
          onClick={() => setShowDetails(!showDetails)}
          title="System Performance"
        >
          <div className="stats-group">
            <span className="stat-label">CPU</span>
            <div className="stat-bar">
              <div 
                className="stat-fill cpu"
                style={{ width: `${systemStats.cpuUsage}%` }}
              ></div>
            </div>
            <span className="stat-value">{Math.round(systemStats.cpuUsage)}%</span>
          </div>
          
          <div className="stats-group">
            <span className="stat-label">RAM</span>
            <div className="stat-bar">
              <div 
                className="stat-fill memory"
                style={{ width: `${systemStats.memoryUsage}%` }}
              ></div>
            </div>
            <span className="stat-value">{formatMemory(systemStats.memoryUsage)}</span>
          </div>
        </button>

        {showDetails && (
          <div className="system-details">
            <div className="detail-item">
              <span>Active Processes:</span>
              <span>{systemStats.activeProcesses}</span>
            </div>
            <div className="detail-item">
              <span>Memory Usage:</span>
              <span>{formatMemory(systemStats.memoryUsage)}</span>
            </div>
            <div className="detail-item">
              <span>CPU Usage:</span>
              <span>{Math.round(systemStats.cpuUsage)}%</span>
            </div>
          </div>
        )}
      </div>

      {/* Right Section - Time & Actions */}
      <div className="status-section status-right">
        <div className="status-item">
          <span className="status-icon">🕐</span>
          <span className="status-text time">
            {formatTime(currentTime)}
          </span>
        </div>

        <div className="status-divider"></div>

        <button className="status-item clickable" title="Minimize to Tray">
          <span className="status-icon">📍</span>
        </button>

        <button className="status-item clickable" title="Settings">
          <span className="status-icon">⚙️</span>
        </button>
      </div>
    </div>
  );
};

export default StatusBar;
