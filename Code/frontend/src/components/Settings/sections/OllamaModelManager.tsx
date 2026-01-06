/**
 * Ollama Model Manager Section
 * Browse and install Ollama models
 */

import React, { useState, useEffect } from 'react';
import { ollamaManager } from '../../../services/ai/ollama-manager.service';
import { 
  Download, 
  Trash2, 
  RefreshCw, 
  Search, 
  Play, 
  AlertCircle, 
  CheckCircle2, 
  Box, 
  HardDrive
} from 'lucide-react';
import './settings.css';

interface ModelCardProps {
  model: any;
  isInstalled: boolean;
  isInstalling: boolean;
  installProgress: number;
  onInstall: (name: string) => void;
  onDelete: (name: string) => void;
  isRunning?: boolean;
}

const ModelCard: React.FC<ModelCardProps> = ({ 
  model, 
  isInstalled, 
  isInstalling, 
  installProgress, 
  onInstall, 
  onDelete,
  isRunning 
}) => {
  return (
    <div className="model-card">
      <div className="model-header">
        <div className="model-title-row">
          <h3>{model.name}</h3>
          {isInstalled && <span className="badge installed">Installed</span>}
        </div>
        <span className="model-size">{model.size}</span>
      </div>
      
      <div className="model-specs">
        <div className="spec-tag">{model.category}</div>
        <div className="spec-tag secondary">{model.parameter_size || 'Unknown params'}</div>
      </div>

      <p className="model-desc">{model.description}</p>
      
      {isInstalling ? (
        <div className="install-progress-container">
          <div className="progress-bar-bg">
            <div 
              className="progress-bar-fill" 
              style={{ width: `${installProgress}%` }}
            ></div>
          </div>
          <span className="progress-text">{installProgress}%</span>
        </div>
      ) : (
        <div className="model-actions">
          {isInstalled ? (
            <button 
              className="btn-icon danger" 
              onClick={() => onDelete(model.name)}
              title="Delete Model"
            >
              <Trash2 size={18} />
            </button>
          ) : (
            <button 
              className="btn-primary full-width"
              onClick={() => onInstall(model.name)}
              disabled={!isRunning}
            >
              <Download size={16} />
              <span>Install</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export const OllamaModelManager: React.FC = () => {
  const [status, setStatus] = useState<{ isInstalled: boolean; isRunning: boolean }>({
    isInstalled: false,
    isRunning: false,
  });
  const [installedModels, setInstalledModels] = useState<string[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'installed' | 'discover'>('installed');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Installation state
  const [installingModel, setInstallingModel] = useState<string | null>(null);
  const [installProgress, setInstallProgress] = useState<number>(0);

  useEffect(() => {
    refreshStatus();
  }, []);

  const refreshStatus = async () => {
    setIsRefreshing(true);
    try {
      const s = await ollamaManager.getStatus();
      setStatus({
        isInstalled: s.isInstalled,
        isRunning: s.isRunning,
      });
      
      if (s.isRunning) {
        const models = await ollamaManager.listModels();
        setInstalledModels(models.map((m: any) => m.name));
      }
    } catch (error) {
      console.error('Failed to refresh status:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleStartOllama = async () => {
    try {
      await ollamaManager.startOllama();
      // Poll for status change
      let attempts = 0;
      const interval = setInterval(async () => {
        const s = await ollamaManager.getStatus();
        if (s.isRunning) {
          setStatus(prev => ({ ...prev, isRunning: true }));
          clearInterval(interval);
          refreshStatus();
        }
        attempts++;
        if (attempts > 10) clearInterval(interval);
      }, 1000);
    } catch (error) {
      alert('Failed to start Ollama service. Please start it manually.');
    }
  };

  const handleInstallModel = async (modelName: string) => {
    if (!status.isRunning) return;
    
    setInstallingModel(modelName);
    setInstallProgress(0);

    try {
      await ollamaManager.downloadModel(modelName, (progress) => {
        setInstallProgress(Math.round(progress.progress));
      });
      await refreshStatus();
      // Switch to installed tab on success
      setActiveTab('installed');
    } catch (error) {
      alert(`Failed to install ${modelName}: ${error}`);
    } finally {
      setInstallingModel(null);
      setInstallProgress(0);
    }
  };

  const handleDeleteModel = async (modelName: string) => {
    if (!confirm(`Delete ${modelName}? This cannot be undone.`)) return;
    
    try {
      await ollamaManager.deleteModel(modelName);
      await refreshStatus();
    } catch (error) {
      alert(`Failed to delete model: ${error}`);
    }
  };

  const recommendedModels = ollamaManager.getRecommendedModels();
  
  // Filter logic
  const filteredRecommended = recommendedModels.filter(m => 
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const installedModelDetails = installedModels.map(name => {
    // Try to find details in recommended list, otherwise basic info
    const rec = recommendedModels.find(r => r.name === name);
    return rec || {
      name,
      description: 'Local custom model',
      size: 'Unknown',
      category: 'Custom',
      parameter_size: '?'
    };
  }).filter(m => 
    m.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="settings-section ollama-manager">
      <div className="section-header">
        <div>
          <h2>Model Manager</h2>
          <p className="section-description">Manage your local AI models powered by Ollama</p>
        </div>
        <button 
          className={`btn-icon ${isRefreshing ? 'spinning' : ''}`} 
          onClick={refreshStatus}
          title="Refresh Status"
        >
          <RefreshCw size={20} />
        </button>
      </div>

      {/* Status Banner */}
      <div className={`status-banner ${status.isRunning ? 'running' : 'stopped'}`}>
        <div className="status-icon">
          {status.isRunning ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
        </div>
        <div className="status-info">
          <h4>Ollama Service is {status.isRunning ? 'Running' : 'Stopped'}</h4>
          <p>{status.isRunning ? 'Ready to process requests' : 'Start the service to use AI features'}</p>
        </div>
        {!status.isRunning && status.isInstalled && (
          <button className="btn-secondary" onClick={handleStartOllama}>
            <Play size={16} /> Start Service
          </button>
        )}
        {!status.isInstalled && (
          <button className="btn-primary" onClick={() => ollamaManager.oneClickInstall()}>
            <Download size={16} /> Install Ollama
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="tabs-container">
        <button 
          className={`tab-btn ${activeTab === 'installed' ? 'active' : ''}`}
          onClick={() => setActiveTab('installed')}
        >
          <HardDrive size={18} />
          Installed ({installedModels.length})
        </button>
        <button 
          className={`tab-btn ${activeTab === 'discover' ? 'active' : ''}`}
          onClick={() => setActiveTab('discover')}
        >
          <Search size={18} />
          Discover Models
        </button>
      </div>

      {/* Search Bar */}
      <div className="search-bar-container">
        <Search className="search-icon" size={18} />
        <input 
          type="text" 
          placeholder="Search models..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
      </div>

      {/* Content Area */}
      <div className="models-grid-container">
        {activeTab === 'installed' ? (
          installedModelDetails.length > 0 ? (
            <div className="models-grid">
              {installedModelDetails.map(model => (
                <ModelCard
                  key={model.name}
                  model={model}
                  isInstalled={true}
                  isInstalling={false}
                  installProgress={0}
                  onInstall={() => {}}
                  onDelete={handleDeleteModel}
                  isRunning={status.isRunning}
                />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <Box size={48} />
              <p>No models installed yet</p>
              <button className="btn-link" onClick={() => setActiveTab('discover')}>
                Browse available models
              </button>
            </div>
          )
        ) : (
          <div className="models-grid">
            {filteredRecommended.map(model => {
              const isInstalled = installedModels.includes(model.name);
              const isInstalling = installingModel === model.name;
              
              return (
                <ModelCard
                  key={model.name}
                  model={model}
                  isInstalled={isInstalled}
                  isInstalling={isInstalling}
                  installProgress={installProgress}
                  onInstall={handleInstallModel}
                  onDelete={handleDeleteModel}
                  isRunning={status.isRunning}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
