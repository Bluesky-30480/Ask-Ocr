import React, { useState, useEffect } from 'react';
import './AboutPage.css';

export interface AboutPageProps {
  onClose?: () => void;
  className?: string;
}

interface SystemInfo {
  os: string;
  arch: string;
  version: string;
  buildDate: string;
}

interface ModelInfo {
  name: string;
  size: string;
  status: 'installed' | 'downloading' | 'available';
  progress?: number;
}

interface License {
  name: string;
  version: string;
  license: string;
  url: string;
}

export const AboutPage: React.FC<AboutPageProps> = ({
  onClose,
  className = '',
}) => {
  const [activeTab, setActiveTab] = useState<'about' | 'models' | 'licenses'>('about');
  const [systemInfo] = useState<SystemInfo>({
    os: 'Windows 11',
    arch: 'x64',
    version: '1.0.0',
    buildDate: new Date().toISOString().split('T')[0],
  });

  const [models] = useState<ModelInfo[]>([
    { name: 'Llama 3.2', size: '2.0 GB', status: 'installed' },
    { name: 'Mistral 7B', size: '4.1 GB', status: 'installed' },
    { name: 'CodeLlama', size: '3.8 GB', status: 'available' },
    { name: 'GPT-4 (OpenAI)', size: 'Cloud', status: 'installed' },
    { name: 'Perplexity AI', size: 'Cloud', status: 'installed' },
  ]);

  const licenses: License[] = [
    { name: 'React', version: '19.0.0', license: 'MIT', url: 'https://reactjs.org/' },
    { name: 'TypeScript', version: '5.3.3', license: 'Apache-2.0', url: 'https://www.typescriptlang.org/' },
    { name: 'Tauri', version: '2.0.0', license: 'MIT/Apache-2.0', url: 'https://tauri.app/' },
    { name: 'Vite', version: '5.0.0', license: 'MIT', url: 'https://vitejs.dev/' },
    { name: 'Ollama', version: '0.1.0', license: 'MIT', url: 'https://ollama.ai/' },
  ];

  useEffect(() => {
    // Load system info from Tauri backend
    // This would normally call a Tauri command
    // invoke('get_system_info').then(setSystemInfo);
  }, []);

  const renderAboutTab = () => (
    <div className="about-tab">
      <div className="about-section">
        <h3>About Ask OCR</h3>
        <p>
          Ask OCR is a powerful desktop application that combines optical character recognition
          with advanced AI capabilities. Extract text from images, translate content, and interact
          with AI assistants - all in one seamless experience.
        </p>

        <h4>Key Features</h4>
        <ul className="feature-list">
          <li>🔍 Advanced OCR with multiple language support</li>
          <li>🤖 Universal AI assistant with context awareness</li>
          <li>🌐 Real-time translation for 100+ languages</li>
          <li>⚡ Lightning-fast screenshot capture</li>
          <li>📊 Smart text analysis and formatting</li>
          <li>🔒 Privacy-first with local processing options</li>
        </ul>
      </div>

      <div className="about-section">
        <h3>System Information</h3>
        <div className="info-grid">
          <div className="info-item">
            <span className="info-label">Operating System:</span>
            <span className="info-value">{systemInfo.os}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Architecture:</span>
            <span className="info-value">{systemInfo.arch}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Version:</span>
            <span className="info-value">{systemInfo.version}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Build Date:</span>
            <span className="info-value">{systemInfo.buildDate}</span>
          </div>
        </div>
      </div>

      <div className="about-section">
        <h3>Contact & Support</h3>
        <div className="contact-links">
          <a href="https://github.com/askocr" className="contact-link" target="_blank" rel="noopener noreferrer">
            <span className="link-icon">📧</span>
            GitHub Repository
          </a>
          <a href="https://askocr.com/docs" className="contact-link" target="_blank" rel="noopener noreferrer">
            <span className="link-icon">📚</span>
            Documentation
          </a>
          <a href="https://askocr.com/privacy" className="contact-link" target="_blank" rel="noopener noreferrer">
            <span className="link-icon">🔒</span>
            Privacy Policy
          </a>
        </div>
      </div>
    </div>
  );

  const renderModelsTab = () => (
    <div className="models-tab">
      <div className="models-header">
        <h3>Installed AI Models</h3>
        <p>Manage your local and cloud AI models</p>
      </div>

      <div className="models-list">
        {models.map((model) => (
          <div key={model.name} className={`model-item status-${model.status}`}>
            <div className="model-info">
              <div className="model-name">{model.name}</div>
              <div className="model-size">{model.size}</div>
            </div>

            <div className="model-status">
              {model.status === 'installed' && (
                <span className="status-badge installed">✓ Installed</span>
              )}
              {model.status === 'downloading' && (
                <div className="download-progress">
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{ width: `${model.progress}%` }}
                    />
                  </div>
                  <span className="progress-text">{model.progress}%</span>
                </div>
              )}
              {model.status === 'available' && (
                <button className="btn-download">Download</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderLicensesTab = () => (
    <div className="licenses-tab">
      <div className="licenses-header">
        <h3>Open Source Licenses</h3>
        <p>Ask OCR is built with amazing open source software</p>
      </div>

      <div className="licenses-list">
        {licenses.map((license) => (
          <div key={license.name} className="license-item">
            <div className="license-info">
              <div className="license-name">{license.name}</div>
              <div className="license-version">v{license.version}</div>
            </div>

            <div className="license-details">
              <span className="license-type">{license.license}</span>
              <a
                href={license.url}
                className="license-link"
                target="_blank"
                rel="noopener noreferrer"
              >
                Visit Website →
              </a>
            </div>
          </div>
        ))}
      </div>

      <div className="licenses-footer">
        <p>
          This software is provided under the MIT License. See the{' '}
          <a href="https://github.com/askocr/license" target="_blank" rel="noopener noreferrer">
            LICENSE
          </a>{' '}
          file for details.
        </p>
      </div>
    </div>
  );

  return (
    <div className={`about-page ${className}`}>
      <div className="about-header">
        <div className="app-logo">
          <div className="logo-icon">
            <span style={{ fontSize: '32px' }}>🔍</span>
          </div>
          <div className="logo-text">
            <h1>Ask OCR</h1>
            <p>AI-Powered Text Recognition</p>
          </div>
        </div>

        <div className="version-info">
          <div className="version">v{systemInfo.version}</div>
          <div className="build-date">Build: {systemInfo.buildDate}</div>
        </div>

        {onClose && (
          <button className="close-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        )}
      </div>

      <div className="about-nav">
        <button
          className={`nav-tab ${activeTab === 'about' ? 'active' : ''}`}
          onClick={() => setActiveTab('about')}
        >
          About
        </button>
        <button
          className={`nav-tab ${activeTab === 'models' ? 'active' : ''}`}
          onClick={() => setActiveTab('models')}
        >
          Models
        </button>
        <button
          className={`nav-tab ${activeTab === 'licenses' ? 'active' : ''}`}
          onClick={() => setActiveTab('licenses')}
        >
          Licenses
        </button>
      </div>

      <div className="about-content">
        {activeTab === 'about' && renderAboutTab()}
        {activeTab === 'models' && renderModelsTab()}
        {activeTab === 'licenses' && renderLicensesTab()}
      </div>
    </div>
  );
};

export default AboutPage;
