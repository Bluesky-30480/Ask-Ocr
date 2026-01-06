/**
 * MediaHelper Settings - Settings for Audio-Text, Media Tools, and FFmpeg Advanced
 */

import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { open } from '@tauri-apps/api/dialog';
import {
  Mic, FileVideo, Terminal, Download, Check,
  RefreshCw, Trash2, FolderOpen, Settings, Info
} from 'lucide-react';

type MediaSection = 'audio-text' | 'media-tools' | 'ffmpeg';

interface MediaHelperSettingsProps {
  activeSection: MediaSection;
}

interface ModelStatus {
  whisper_models: string[];
  diarization_installed: boolean;
  denoiser_installed: boolean;
}

interface Setting {
  key: string;
  value: string;
}

const WHISPER_MODELS = [
  { id: 'tiny', name: 'Tiny', size: '~75MB', description: 'Fastest, least accurate' },
  { id: 'base', name: 'Base', size: '~145MB', description: 'Good balance for most use cases' },
  { id: 'small', name: 'Small', size: '~465MB', description: 'Better accuracy' },
  { id: 'medium', name: 'Medium', size: '~1.5GB', description: 'High accuracy' },
  { id: 'large', name: 'Large', size: '~3GB', description: 'Best accuracy, slowest' },
];

export const MediaHelperSettings: React.FC<MediaHelperSettingsProps> = ({ activeSection }) => {
  // Model status
  const [modelStatus, setModelStatus] = useState<ModelStatus | null>(null);
  const [isLoadingModels, setIsLoadingModels] = useState(true);
  const [downloadingModel, setDownloadingModel] = useState<string | null>(null);
  
  // Audio-Text settings
  const [defaultWhisperModel, setDefaultWhisperModel] = useState('base');
  const [defaultLanguage, setDefaultLanguage] = useState('auto');
  const [huggingfaceToken, setHuggingfaceToken] = useState('');
  const [autoDownloadModels, setAutoDownloadModels] = useState(true);
  
  // Media Tools settings
  const [defaultOutputFormat, setDefaultOutputFormat] = useState('mp4');
  const [defaultVideoCodec, setDefaultVideoCodec] = useState('libx264');
  const [defaultAudioCodec, setDefaultAudioCodec] = useState('aac');
  const [defaultOutputDir, setDefaultOutputDir] = useState('');
  const [preserveMetadata, setPreserveMetadata] = useState(true);
  
  // FFmpeg settings
  const [ffmpegPath, setFfmpegPath] = useState('');
  const [ffprobePath, setFfprobePath] = useState('');
  const [defaultCrf, setDefaultCrf] = useState('23');
  const [defaultPreset, setDefaultPreset] = useState('medium');
  const [saveCommandHistory, setSaveCommandHistory] = useState(true);
  const [maxHistoryItems, setMaxHistoryItems] = useState(50);

  useEffect(() => {
    loadSettings();
    checkModels();
  }, []);

  const loadSettings = async () => {
    try {
      // Load all settings from database
      const settings: Setting[] = await invoke('get_all_settings');
      
      settings.forEach((setting) => {
        switch (setting.key) {
          case 'media_default_whisper_model': setDefaultWhisperModel(setting.value); break;
          case 'media_default_language': setDefaultLanguage(setting.value); break;
          case 'media_huggingface_token': setHuggingfaceToken(setting.value); break;
          case 'media_auto_download_models': setAutoDownloadModels(setting.value === 'true'); break;
          case 'media_default_output_format': setDefaultOutputFormat(setting.value); break;
          case 'media_default_video_codec': setDefaultVideoCodec(setting.value); break;
          case 'media_default_audio_codec': setDefaultAudioCodec(setting.value); break;
          case 'media_default_output_dir': setDefaultOutputDir(setting.value); break;
          case 'media_preserve_metadata': setPreserveMetadata(setting.value === 'true'); break;
          case 'media_ffmpeg_path': setFfmpegPath(setting.value); break;
          case 'media_ffprobe_path': setFfprobePath(setting.value); break;
          case 'media_default_crf': setDefaultCrf(setting.value); break;
          case 'media_default_preset': setDefaultPreset(setting.value); break;
          case 'media_save_command_history': setSaveCommandHistory(setting.value === 'true'); break;
          case 'media_max_history_items': setMaxHistoryItems(parseInt(setting.value) || 50); break;
        }
      });
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  };

  const saveSetting = async (key: string, value: string) => {
    try {
      await invoke('set_setting', { key: `media_${key}`, value });
    } catch (err) {
      console.error('Failed to save setting:', err);
    }
  };

  const checkModels = async () => {
    setIsLoadingModels(true);
    try {
      const status = await invoke<ModelStatus>('check_ai_models');
      setModelStatus(status);
    } catch (err) {
      console.error('Failed to check models:', err);
    } finally {
      setIsLoadingModels(false);
    }
  };

  const downloadModel = async (type: string, name?: string) => {
    const modelId = name ? `whisper_${name}` : type;
    setDownloadingModel(modelId);

    try {
      if (type === 'whisper') {
        await invoke('download_whisper_model', { modelName: name });
      } else if (type === 'diarization') {
        await invoke('download_diarization_model');
      } else if (type === 'denoiser') {
        await invoke('download_denoiser_model');
      }
      
      await checkModels();
    } catch (err) {
      console.error('Failed to download model:', err);
    } finally {
      setDownloadingModel(null);
    }
  };

  const selectDirectory = async (setter: (value: string) => void, settingKey: string) => {
    try {
      const selected = await open({ directory: true, title: 'Select directory' });
      if (selected && typeof selected === 'string') {
        setter(selected);
        saveSetting(settingKey, selected);
      }
    } catch (err) {
      console.error('Failed to select directory:', err);
    }
  };

  const selectFile = async (setter: (value: string) => void, settingKey: string) => {
    try {
      const selected = await open({ multiple: false, title: 'Select file' });
      if (selected && typeof selected === 'string') {
        setter(selected);
        saveSetting(settingKey, selected);
      }
    } catch (err) {
      console.error('Failed to select file:', err);
    }
  };

  // Render Audio-Text Settings
  if (activeSection === 'audio-text') {
    return (
      <div className="settings-section-content">
        {/* AI Models */}
        <div className="settings-card">
          <div className="card-header">
            <div className="card-icon" style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6' }}>
              <Mic size={20} />
            </div>
            <div className="card-title">
              <h3>AI Models</h3>
              <p>Manage transcription and diarization models</p>
            </div>
            <button className="btn-icon" onClick={checkModels} disabled={isLoadingModels}>
              <RefreshCw size={18} className={isLoadingModels ? 'spin' : ''} />
            </button>
          </div>

          <div className="card-content">
            {/* Whisper Models */}
            <div className="setting-group">
              <label>Whisper Models</label>
              <p className="setting-description">Speech-to-text transcription models</p>
              
              <div className="model-grid">
                {WHISPER_MODELS.map((model) => {
                  const isInstalled = modelStatus?.whisper_models.includes(model.id);
                  const isDownloading = downloadingModel === `whisper_${model.id}`;
                  
                  return (
                    <div key={model.id} className={`model-card ${isInstalled ? 'installed' : ''}`}>
                      <div className="model-info">
                        <div className="model-name">{model.name}</div>
                        <div className="model-meta">
                          <span className="model-size">{model.size}</span>
                          <span className="model-desc">{model.description}</span>
                        </div>
                      </div>
                      <div className="model-status">
                        {isInstalled ? (
                          <span className="status-badge success">
                            <Check size={14} /> Installed
                          </span>
                        ) : isDownloading ? (
                          <span className="status-badge downloading">
                            <RefreshCw size={14} className="spin" /> Downloading...
                          </span>
                        ) : (
                          <button 
                            className="btn-download" 
                            onClick={() => downloadModel('whisper', model.id)}
                          >
                            <Download size={14} /> Download
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Speaker Diarization */}
            <div className="setting-group">
              <label>Speaker Diarization</label>
              <p className="setting-description">Detect and separate different speakers</p>
              
              <div className="model-card single">
                <div className="model-info">
                  <div className="model-name">pyannote/speaker-diarization</div>
                  <div className="model-meta">
                    <span className="model-size">~500MB</span>
                    <span className="model-desc">Requires HuggingFace token</span>
                  </div>
                </div>
                <div className="model-status">
                  {modelStatus?.diarization_installed ? (
                    <span className="status-badge success">
                      <Check size={14} /> Installed
                    </span>
                  ) : downloadingModel === 'diarization' ? (
                    <span className="status-badge downloading">
                      <RefreshCw size={14} className="spin" /> Downloading...
                    </span>
                  ) : (
                    <button 
                      className="btn-download" 
                      onClick={() => downloadModel('diarization')}
                    >
                      <Download size={14} /> Download
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Denoiser */}
            <div className="setting-group">
              <label>Audio Denoiser</label>
              <p className="setting-description">AI-powered background noise removal</p>
              
              <div className="model-card single">
                <div className="model-info">
                  <div className="model-name">Facebook Denoiser</div>
                  <div className="model-meta">
                    <span className="model-size">~200MB</span>
                    <span className="model-desc">Deep learning denoising</span>
                  </div>
                </div>
                <div className="model-status">
                  {modelStatus?.denoiser_installed ? (
                    <span className="status-badge success">
                      <Check size={14} /> Installed
                    </span>
                  ) : downloadingModel === 'denoiser' ? (
                    <span className="status-badge downloading">
                      <RefreshCw size={14} className="spin" /> Downloading...
                    </span>
                  ) : (
                    <button 
                      className="btn-download" 
                      onClick={() => downloadModel('denoiser')}
                    >
                      <Download size={14} /> Download
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Default Settings */}
        <div className="settings-card">
          <div className="card-header">
            <div className="card-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
              <Settings size={20} />
            </div>
            <div className="card-title">
              <h3>Default Settings</h3>
              <p>Configure default transcription options</p>
            </div>
          </div>

          <div className="card-content">
            <div className="setting-group">
              <label>Default Whisper Model</label>
              <select 
                value={defaultWhisperModel}
                onChange={(e) => { setDefaultWhisperModel(e.target.value); saveSetting('default_whisper_model', e.target.value); }}
              >
                {WHISPER_MODELS.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>

            <div className="setting-group">
              <label>Default Language</label>
              <select 
                value={defaultLanguage}
                onChange={(e) => { setDefaultLanguage(e.target.value); saveSetting('default_language', e.target.value); }}
              >
                <option value="auto">Auto Detect</option>
                <option value="en">English</option>
                <option value="zh">Chinese</option>
                <option value="ja">Japanese</option>
                <option value="ko">Korean</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
              </select>
            </div>

            <div className="setting-group">
              <label>HuggingFace Token</label>
              <p className="setting-description">Required for speaker diarization model</p>
              <input 
                type="password"
                value={huggingfaceToken}
                onChange={(e) => { setHuggingfaceToken(e.target.value); saveSetting('huggingface_token', e.target.value); }}
                placeholder="hf_xxxxxxxxxxxxxxxxx"
              />
              <a href="https://huggingface.co/settings/tokens" target="_blank" rel="noopener noreferrer" className="help-link">
                Get token from HuggingFace
              </a>
            </div>

            <div className="setting-group checkbox">
              <label>
                <input 
                  type="checkbox"
                  checked={autoDownloadModels}
                  onChange={(e) => { setAutoDownloadModels(e.target.checked); saveSetting('auto_download_models', String(e.target.checked)); }}
                />
                <span>Auto-download missing models</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render Media Tools Settings
  if (activeSection === 'media-tools') {
    return (
      <div className="settings-section-content">
        <div className="settings-card">
          <div className="card-header">
            <div className="card-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
              <FileVideo size={20} />
            </div>
            <div className="card-title">
              <h3>Output Settings</h3>
              <p>Default output options for media conversion</p>
            </div>
          </div>

          <div className="card-content">
            <div className="setting-group">
              <label>Default Output Directory</label>
              <div className="input-with-button">
                <input 
                  type="text"
                  value={defaultOutputDir}
                  onChange={(e) => setDefaultOutputDir(e.target.value)}
                  placeholder="Same as source file"
                />
                <button onClick={() => selectDirectory(setDefaultOutputDir, 'default_output_dir')}>
                  <FolderOpen size={16} />
                </button>
              </div>
            </div>

            <div className="setting-group">
              <label>Default Output Format</label>
              <select 
                value={defaultOutputFormat}
                onChange={(e) => { setDefaultOutputFormat(e.target.value); saveSetting('default_output_format', e.target.value); }}
              >
                <optgroup label="Video">
                  <option value="mp4">MP4</option>
                  <option value="mkv">MKV</option>
                  <option value="webm">WebM</option>
                  <option value="avi">AVI</option>
                </optgroup>
                <optgroup label="Audio">
                  <option value="mp3">MP3</option>
                  <option value="wav">WAV</option>
                  <option value="flac">FLAC</option>
                </optgroup>
              </select>
            </div>

            <div className="setting-row">
              <div className="setting-group">
                <label>Default Video Codec</label>
                <select 
                  value={defaultVideoCodec}
                  onChange={(e) => { setDefaultVideoCodec(e.target.value); saveSetting('default_video_codec', e.target.value); }}
                >
                  <option value="copy">Copy (No re-encode)</option>
                  <option value="libx264">H.264</option>
                  <option value="libx265">H.265 (HEVC)</option>
                  <option value="libvpx-vp9">VP9</option>
                </select>
              </div>

              <div className="setting-group">
                <label>Default Audio Codec</label>
                <select 
                  value={defaultAudioCodec}
                  onChange={(e) => { setDefaultAudioCodec(e.target.value); saveSetting('default_audio_codec', e.target.value); }}
                >
                  <option value="copy">Copy (No re-encode)</option>
                  <option value="aac">AAC</option>
                  <option value="libmp3lame">MP3</option>
                  <option value="flac">FLAC</option>
                </select>
              </div>
            </div>

            <div className="setting-group checkbox">
              <label>
                <input 
                  type="checkbox"
                  checked={preserveMetadata}
                  onChange={(e) => { setPreserveMetadata(e.target.checked); saveSetting('preserve_metadata', String(e.target.checked)); }}
                />
                <span>Preserve metadata when converting</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render FFmpeg Settings
  if (activeSection === 'ffmpeg') {
    return (
      <div className="settings-section-content">
        <div className="settings-card">
          <div className="card-header">
            <div className="card-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
              <Terminal size={20} />
            </div>
            <div className="card-title">
              <h3>FFmpeg Configuration</h3>
              <p>Configure FFmpeg paths and defaults</p>
            </div>
          </div>

          <div className="card-content">
            <div className="setting-group">
              <label>FFmpeg Path</label>
              <p className="setting-description">Leave empty to use system PATH</p>
              <div className="input-with-button">
                <input 
                  type="text"
                  value={ffmpegPath}
                  onChange={(e) => setFfmpegPath(e.target.value)}
                  placeholder="ffmpeg (uses system PATH)"
                />
                <button onClick={() => selectFile(setFfmpegPath, 'ffmpeg_path')}>
                  <FolderOpen size={16} />
                </button>
              </div>
            </div>

            <div className="setting-group">
              <label>FFprobe Path</label>
              <div className="input-with-button">
                <input 
                  type="text"
                  value={ffprobePath}
                  onChange={(e) => setFfprobePath(e.target.value)}
                  placeholder="ffprobe (uses system PATH)"
                />
                <button onClick={() => selectFile(setFfprobePath, 'ffprobe_path')}>
                  <FolderOpen size={16} />
                </button>
              </div>
            </div>

            <div className="setting-row">
              <div className="setting-group">
                <label>Default CRF (Quality)</label>
                <p className="setting-description">Lower = better quality, larger file</p>
                <input 
                  type="number"
                  value={defaultCrf}
                  min="0"
                  max="51"
                  onChange={(e) => { setDefaultCrf(e.target.value); saveSetting('default_crf', e.target.value); }}
                />
              </div>

              <div className="setting-group">
                <label>Default Preset</label>
                <p className="setting-description">Encoding speed vs compression</p>
                <select 
                  value={defaultPreset}
                  onChange={(e) => { setDefaultPreset(e.target.value); saveSetting('default_preset', e.target.value); }}
                >
                  <option value="ultrafast">Ultrafast</option>
                  <option value="superfast">Superfast</option>
                  <option value="veryfast">Veryfast</option>
                  <option value="faster">Faster</option>
                  <option value="fast">Fast</option>
                  <option value="medium">Medium</option>
                  <option value="slow">Slow</option>
                  <option value="slower">Slower</option>
                  <option value="veryslow">Veryslow</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="settings-card">
          <div className="card-header">
            <div className="card-icon" style={{ background: 'rgba(107, 114, 128, 0.1)', color: '#6b7280' }}>
              <Settings size={20} />
            </div>
            <div className="card-title">
              <h3>Terminal Settings</h3>
              <p>Smart terminal preferences</p>
            </div>
          </div>

          <div className="card-content">
            <div className="setting-group checkbox">
              <label>
                <input 
                  type="checkbox"
                  checked={saveCommandHistory}
                  onChange={(e) => { setSaveCommandHistory(e.target.checked); saveSetting('save_command_history', String(e.target.checked)); }}
                />
                <span>Save command history</span>
              </label>
            </div>

            {saveCommandHistory && (
              <div className="setting-group">
                <label>Maximum History Items</label>
                <input 
                  type="number"
                  value={maxHistoryItems}
                  min="10"
                  max="200"
                  onChange={(e) => { setMaxHistoryItems(parseInt(e.target.value)); saveSetting('max_history_items', e.target.value); }}
                />
              </div>
            )}

            <button 
              className="btn-danger"
              onClick={() => {
                localStorage.removeItem('ffmpeg_history');
                alert('Command history cleared');
              }}
            >
              <Trash2 size={16} />
              Clear Command History
            </button>
          </div>
        </div>

        <div className="settings-card info-card">
          <div className="card-header">
            <div className="card-icon" style={{ background: 'rgba(96, 165, 250, 0.1)', color: '#60a5fa' }}>
              <Info size={20} />
            </div>
            <div className="card-title">
              <h3>AI Command Generation</h3>
              <p>Uses local Ollama for command suggestions</p>
            </div>
          </div>

          <div className="card-content">
            <p className="info-text">
              The FFmpeg Advanced panel includes an AI assistant that can generate FFmpeg commands 
              from natural language descriptions. This feature uses your locally installed Ollama 
              models, ensuring your data stays private.
            </p>
            <p className="info-text">
              For best results, ensure you have a model like <code>llama3.2:1b</code> or 
              <code>codellama</code> installed via the Model Manager.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
