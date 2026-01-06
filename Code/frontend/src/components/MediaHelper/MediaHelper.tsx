import React, { useState } from 'react';
import { 
  Mic, FileAudio, Terminal, ChevronRight
} from 'lucide-react';
import { AudioTextHelper } from './AudioTextHelper';
import { MediaToolsPanel } from './MediaToolsPanel';
import { FFmpegAdvanced } from './FFmpegAdvanced';
import './MediaHelper.css';

type PanelType = 'audio-text' | 'media-tools' | 'ffmpeg-advanced';

interface PanelInfo {
  id: PanelType;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  color: string;
  features: string[];
}

export const MediaHelper: React.FC = () => {
  const [activePanel, setActivePanel] = useState<PanelType | null>(null);

  const panels: PanelInfo[] = [
    {
      id: 'audio-text',
      title: 'Audio–Text Helper',
      subtitle: 'AI-Powered Transcription & Speaker Detection',
      icon: <Mic size={32} />,
      color: '#8b5cf6',
      features: [
        'Speech-to-text transcription',
        'Multi-speaker detection',
        'Export SRT/TXT per speaker',
        'Extract speaker audio',
        'Background noise removal'
      ]
    },
    {
      id: 'media-tools',
      title: 'Media Helper',
      subtitle: 'Convert, Merge, Mux & Process Media',
      icon: <FileAudio size={32} />,
      color: '#3b82f6',
      features: [
        'Format conversion',
        'File merging & muxing',
        'Audio extraction',
        'Video compression',
        'Noise removal'
      ]
    },
    {
      id: 'ffmpeg-advanced',
      title: 'FFmpeg GUI (Advanced)',
      subtitle: 'Full FFmpeg Control with Smart Terminal',
      icon: <Terminal size={32} />,
      color: '#10b981',
      features: [
        'Complete FFmpeg settings',
        'Smart terminal interface',
        'Command search',
        'AI command assistance',
        'Preset management'
      ]
    }
  ];

  if (activePanel) {
    return (
      <div className="media-helper-container">
        {activePanel === 'audio-text' && (
          <AudioTextHelper onBack={() => setActivePanel(null)} />
        )}
        {activePanel === 'media-tools' && (
          <MediaToolsPanel onBack={() => setActivePanel(null)} />
        )}
        {activePanel === 'ffmpeg-advanced' && (
          <FFmpegAdvanced onBack={() => setActivePanel(null)} />
        )}
      </div>
    );
  }

  return (
    <div className="media-helper-container">
      <div className="media-helper-header">
        <h1>
          <span className="gradient-text">Media Helper</span>
        </h1>
        <p>Powerful media processing tools powered by AI and FFmpeg</p>
      </div>

      <div className="panels-grid">
        {panels.map((panel) => (
          <div
            key={panel.id}
            className="panel-card"
            onClick={() => setActivePanel(panel.id)}
            style={{ '--panel-color': panel.color } as React.CSSProperties}
          >
            <div className="panel-card-header">
              <div className="panel-icon" style={{ background: `${panel.color}20`, color: panel.color }}>
                {panel.icon}
              </div>
              <ChevronRight className="panel-arrow" size={24} />
            </div>
            
            <div className="panel-card-content">
              <h2>{panel.title}</h2>
              <p className="panel-subtitle">{panel.subtitle}</p>
              
              <ul className="panel-features">
                {panel.features.map((feature, i) => (
                  <li key={i}>
                    <span className="feature-dot" style={{ background: panel.color }} />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            <div className="panel-glow" style={{ background: `radial-gradient(circle at center, ${panel.color}15 0%, transparent 70%)` }} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default MediaHelper;
