/**
 * Ollama Model Manager Section
 * Browse and install Ollama models
 */

import React, { useState, useEffect } from 'react';
import { ollamaManager } from '../../../services/ai/ollama-manager.service';
import './settings.css';

export const OllamaModelManager: React.FC = () => {
  const [ollamaStatus, setOllamaStatus] = useState<{ isInstalled: boolean; isRunning: boolean }>({
    isInstalled: false,
    isRunning: false,
  });
  const [installedModels, setInstalledModels] = useState<string[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [installingModel, setInstallingModel] = useState<string | null>(null);
  const [installProgress, setInstallProgress] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  useEffect(() => {
    checkOllamaStatus();
    loadInstalledModels();
  }, []);

  const checkOllamaStatus = async () => {
    try {
      const status = await ollamaManager.getStatus();
      setOllamaStatus({
        isInstalled: status.isInstalled,
        isRunning: status.isRunning,
      });
    } catch (error) {
      console.error('Failed to check Ollama status:', error);
    }
  };

  const loadInstalledModels = async () => {
    try {
      const models = await ollamaManager.listModels();
      setInstalledModels(models.map((m: any) => m.name));
    } catch (error) {
      console.error('Failed to load installed models:', error);
      setInstalledModels([]);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await checkOllamaStatus();
    await loadInstalledModels();
    setIsRefreshing(false);
  };

  const handleInstallModel = async (modelName: string) => {
    if (!ollamaStatus.isRunning) {
      alert('Ollama is not running. Please start Ollama first.');
      return;
    }

    setInstallingModel(modelName);
    setInstallProgress(0);
    
    try {
      // Use the model name for Ollama (e.g., "llama3.2:1b")
      await ollamaManager.downloadModel(modelName, (progress) => {
        setInstallProgress(Math.round(progress.progress));
      });
      
      alert(`Model "${modelName}" installed successfully!`);
      await loadInstalledModels();
    } catch (error) {
      console.error('Failed to install model:', error);
      alert(`Failed to install model: ${error}`);
    } finally {
      setInstallingModel(null);
      setInstallProgress(0);
    }
  };

  const handleDeleteModel = async (modelName: string) => {
    if (!confirm(`Are you sure you want to delete model "${modelName}"?`)) {
      return;
    }

    try {
      await ollamaManager.deleteModel(modelName);
      alert(`Model "${modelName}" deleted successfully!`);
      await loadInstalledModels();
    } catch (error) {
      console.error('Failed to delete model:', error);
      alert(`Failed to delete model: ${error}`);
    }
  };

  const handleInstallOllama = async () => {
    const url = 'https://ollama.com/download';
    window.open(url, '_blank');
  };

  const categories = [
    { id: 'all', name: 'All Models' },
    { id: 'normal', name: 'Normal (Chat)' },
    { id: 'thinking', name: 'Thinking (Reasoning)' },
    { id: 'websearch', name: 'Web Search Capable' },
    { id: 'coding', name: 'Coding' },
  ];

  // Use recommended models from service instead of registry for now to match the requested categories
  const recommendedModels = ollamaManager.getRecommendedModels();
  
  const filteredModels = recommendedModels.filter(model => {
    const matchesSearch = model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         model.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'all' || model.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="settings-section">
      <h2>Ollama Model Manager</h2>
      <p className="section-description">
        Browse and install local AI models using Ollama
      </p>

      {/* Ollama Status */}
      <div className="setting-group">
        <label>Ollama Status</label>
        <div className="status-panel">
          <div className="status-item">
            <span>Installation:</span>
            {ollamaStatus.isInstalled ? (
              <span className="status-badge installed">✓ Installed</span>
            ) : (
              <div>
                <span className="status-badge not-installed">✗ Not Installed</span>
                <button className="btn-small" onClick={handleInstallOllama}>
                  Download Ollama
                </button>
              </div>
            )}
          </div>
          <div className="status-item">
            <span>Service:</span>
            {ollamaStatus.isRunning ? (
              <span className="status-badge running">● Running</span>
            ) : (
              <span className="status-badge stopped">○ Stopped</span>
            )}
          </div>
          <button 
            className="btn-small" 
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Installed Models */}
      {ollamaStatus.isInstalled && (
        <div className="setting-group">
          <label>Installed Models ({installedModels.length})</label>
          {installedModels.length > 0 ? (
            <div className="installed-models-list">
              {installedModels.map(modelName => (
                <div key={modelName} className="installed-model-item">
                  <span className="model-name">{modelName}</span>
                  <button
                    className="btn-small btn-danger"
                    onClick={() => handleDeleteModel(modelName)}
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="info-box">
              <p>No models installed. Browse available models below to install one.</p>
            </div>
          )}
        </div>
      )}

      {/* Model Browser */}
      {ollamaStatus.isInstalled && (
        <>
          <div className="setting-group">
            <label>Browse Popular Models</label>
            <div className="model-browser-controls">
              <input
                type="text"
                className="search-input"
                placeholder="Search models..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <select 
                className="category-filter"
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
              >
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="models-grid">
            {filteredModels.map(model => {
              const isInstalled = installedModels.includes(model.name);
              const isThisModelInstalling = installingModel === model.name;
              const isAnyInstalling = installingModel !== null;
              
              return (
                <div key={model.name} className="model-card">
                  <div className="model-header">
                    <h3>{model.name}</h3>
                    {isInstalled && <span className="badge installed">Installed</span>}
                  </div>
                  
                  <div className="model-specs">
                    <div className="spec-item">
                      <span className="spec-label">Size:</span>
                      <span className="spec-value">{model.size}</span>
                    </div>
                    <div className="spec-item">
                      <span className="spec-label">Category:</span>
                      <span className="spec-value capitalize">{model.category}</span>
                    </div>
                  </div>

                  <div className="model-description">
                    <p>{model.description}</p>
                    <small>{model.useCase}</small>
                  </div>

                  {isThisModelInstalling && (
                    <div className="install-progress-container">
                      <div className="progress-bar-bg">
                        <div 
                          className="progress-bar-fill" 
                          style={{ width: `${installProgress}%` }}
                        ></div>
                      </div>
                      <span className="progress-text">{installProgress}%</span>
                    </div>
                  )}

                  <div className="model-actions">
                    {!isInstalled && !isThisModelInstalling && (
                      <button
                        className="btn-small btn-primary"
                        onClick={() => handleInstallModel(model.name)}
                        disabled={isAnyInstalling || !ollamaStatus.isRunning}
                      >
                        Install
                      </button>
                    )}
                    {isThisModelInstalling && (
                      <button className="btn-small btn-primary" disabled>
                        Installing...
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
