import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Mic, Upload, FileAudio, Users, Download, Play, 
  Settings, Check, AlertCircle, RefreshCw,
  VolumeX, FileText, Music, FolderOpen, X
} from 'lucide-react';
import { invoke } from '@tauri-apps/api/tauri';
import { open, save } from '@tauri-apps/api/dialog';
import './MediaHelper.css';

interface AudioTextHelperProps {
  onBack: () => void;
}

interface ModelStatus {
  whisper_models: string[];
  diarization_installed: boolean;
  denoiser_installed: boolean;
}

interface DownloadProgress {
  status: 'idle' | 'downloading' | 'complete' | 'error';
  progress: number;
  message: string;
  model: string;
}

interface TranscriptionResult {
  success: boolean;
  text?: string;
  segments?: any[];
  language?: string;
  output_path?: string;
  error?: string;
}

interface DiarizationResult {
  success: boolean;
  full_text?: string;
  segments?: any[];
  speakers?: string[];
  num_speakers?: number;
  speakers_data?: Record<string, any[]>;
  error?: string;
}

interface Speaker {
  id: string;
  name: string;
  color: string;
  segments: any[];
  duration: number;
}

type TabType = 'transcribe' | 'diarization' | 'extract' | 'denoise';

export const AudioTextHelper: React.FC<AudioTextHelperProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<TabType>('transcribe');
  const [_modelStatus, setModelStatus] = useState<ModelStatus | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  
  // File state
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  
  // Transcription state
  const [whisperModel, setWhisperModel] = useState<string>('base');
  const [language, setLanguage] = useState<string>('auto');
  const [outputFormat, setOutputFormat] = useState<string>('srt');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionResult, setTranscriptionResult] = useState<TranscriptionResult | null>(null);
  
  // Diarization state
  const [numSpeakers, setNumSpeakers] = useState<number | null>(null);
  const [maxSpeakers, setMaxSpeakers] = useState<number>(10);
  const [isDiarizing, setIsDiarizing] = useState(false);
  const [diarizationResult, setDiarizationResult] = useState<DiarizationResult | null>(null);
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [selectedSpeaker, setSelectedSpeaker] = useState<string | null>(null);
  
  // Export options
  const [exportPerSentence, setExportPerSentence] = useState(false);
  const [removeNoise, setRemoveNoise] = useState(false);
  
  // Denoise state
  const [denoiseMethod, setDenoiseMethod] = useState<string>('denoiser');
  const [isDenoising, setIsDenoising] = useState(false);
  const [denoiseResult, setDenoiseResult] = useState<any>(null);

  const speakerColors = [
    '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
    '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'
  ];

  useEffect(() => {
    checkModels();
  }, []);

  const checkModels = async () => {
    try {
      const status = await invoke<ModelStatus>('check_ai_models');
      setModelStatus(status);
      
      // If no whisper models installed, start downloading base model
      if (status.whisper_models.length === 0) {
        downloadModel('whisper', 'base');
      }
    } catch (err) {
      console.error('Failed to check models:', err);
    }
  };

  const downloadModel = async (type: string, name?: string) => {
    setIsDownloading(true);
    setDownloadProgress({
      status: 'downloading',
      progress: 0,
      message: `Downloading ${type} model...`,
      model: type
    });

    try {
      if (type === 'whisper') {
        await invoke('download_whisper_model', { modelName: name || 'base' });
      } else if (type === 'diarization') {
        await invoke('download_diarization_model');
      } else if (type === 'denoiser') {
        await invoke('download_denoiser_model');
      }

      setDownloadProgress({
        status: 'complete',
        progress: 100,
        message: 'Download complete!',
        model: type
      });

      // Refresh model status
      await checkModels();
    } catch (err) {
      setDownloadProgress({
        status: 'error',
        progress: 0,
        message: String(err),
        model: type
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const cancelDownload = async () => {
    try {
      await invoke('cancel_model_download');
      setIsDownloading(false);
      setDownloadProgress(null);
    } catch (err) {
      console.error('Failed to cancel download:', err);
    }
  };

  const selectFile = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{
          name: 'Media Files',
          extensions: ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'mp4', 'mkv', 'avi', 'mov', 'webm']
        }]
      });

      if (selected && typeof selected === 'string') {
        setSelectedFile(selected);
        setFileName(selected.split(/[\\/]/).pop() || 'Unknown');
        setTranscriptionResult(null);
        setDiarizationResult(null);
        setSpeakers([]);
      }
    } catch (err) {
      console.error('Failed to select file:', err);
    }
  };

  const handleTranscribe = async () => {
    if (!selectedFile) return;

    setIsTranscribing(true);
    setTranscriptionResult(null);

    try {
      const result = await invoke<TranscriptionResult>('transcribe_audio', {
        audioPath: selectedFile,
        modelName: whisperModel,
        language: language === 'auto' ? null : language,
        outputFormat
      });

      setTranscriptionResult(result);
    } catch (err) {
      setTranscriptionResult({ success: false, error: String(err) });
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleDiarization = async () => {
    if (!selectedFile) return;

    setIsDiarizing(true);
    setDiarizationResult(null);
    setSpeakers([]);

    try {
      const result = await invoke<DiarizationResult>('transcribe_with_diarization', {
        audioPath: selectedFile,
        modelName: whisperModel,
        language: language === 'auto' ? null : language,
        numSpeakers: numSpeakers,
        maxSpeakers: maxSpeakers
      });

      setDiarizationResult(result);

      if (result.success && result.speakers_data) {
        const speakersList: Speaker[] = Object.entries(result.speakers_data).map(([id, segments], index) => ({
          id,
          name: `Speaker ${index + 1}`,
          color: speakerColors[index % speakerColors.length],
          segments: segments as any[],
          duration: (segments as any[]).reduce((sum, s) => sum + (s.end - s.start), 0)
        }));
        setSpeakers(speakersList);
      }
    } catch (err) {
      setDiarizationResult({ success: false, error: String(err) });
    } finally {
      setIsDiarizing(false);
    }
  };

  const exportSpeakerSRT = async (speaker: Speaker) => {
    try {
      const outputPath = await save({
        defaultPath: `${speaker.name.replace(/\s+/g, '_')}.srt`,
        filters: [{ name: 'SRT Subtitle', extensions: ['srt'] }]
      });

      if (outputPath) {
        await invoke('export_speaker_srt', {
          diarizationResult,
          speaker: speaker.id,
          outputPath
        });
      }
    } catch (err) {
      console.error('Failed to export SRT:', err);
    }
  };

  const exportAllSpeakersSRT = async () => {
    try {
      const outputDir = await open({
        directory: true,
        title: 'Select output directory'
      });

      if (outputDir && typeof outputDir === 'string') {
        await invoke('export_all_speakers_srt', {
          diarizationResult,
          outputDir,
          baseName: fileName.replace(/\.[^.]+$/, '')
        });
      }
    } catch (err) {
      console.error('Failed to export SRTs:', err);
    }
  };

  const extractSpeakerAudio = async (speaker: Speaker) => {
    if (!selectedFile) return;

    try {
      const outputPath = await save({
        defaultPath: `${speaker.name.replace(/\s+/g, '_')}.mp3`,
        filters: [{ name: 'MP3 Audio', extensions: ['mp3'] }]
      });

      if (outputPath) {
        await invoke('extract_speaker_audio', {
          audioPath: selectedFile,
          diarizationResult,
          speaker: speaker.id,
          outputPath,
          perSentence: exportPerSentence
        });
      }
    } catch (err) {
      console.error('Failed to extract audio:', err);
    }
  };

  const handleDenoise = async () => {
    if (!selectedFile) return;

    setIsDenoising(true);
    setDenoiseResult(null);

    try {
      const outputPath = await save({
        defaultPath: fileName.replace(/(\.[^.]+)$/, '_denoised$1'),
        filters: [{ name: 'Audio', extensions: ['mp3', 'wav'] }]
      });

      if (outputPath) {
        const result = await invoke('remove_background_noise', {
          audioPath: selectedFile,
          outputPath,
          method: denoiseMethod
        });

        setDenoiseResult(result);
      }
    } catch (err) {
      setDenoiseResult({ success: false, error: String(err) });
    } finally {
      setIsDenoising(false);
    }
  };

  const openFileLocation = async (path: string) => {
    try {
      await invoke('show_in_folder', { path });
    } catch (err) {
      console.error('Failed to open folder:', err);
    }
  };

  const tabs = [
    { id: 'transcribe' as TabType, label: 'Transcribe', icon: <FileText size={16} /> },
    { id: 'diarization' as TabType, label: 'Speaker Detection', icon: <Users size={16} /> },
    { id: 'extract' as TabType, label: 'Extract Audio', icon: <Music size={16} /> },
    { id: 'denoise' as TabType, label: 'Remove Noise', icon: <VolumeX size={16} /> },
  ];

  // Show download overlay if models are downloading
  if (isDownloading && downloadProgress) {
    return (
      <div className="panel-container">
        <div className="model-download-overlay">
          <div className="download-spinner" />
          <div className="download-status">
            <h3>Downloading Required Models</h3>
            <p>{downloadProgress.message}</p>
          </div>
          <div className="download-progress-bar">
            <div 
              className="download-progress-fill" 
              style={{ width: `${downloadProgress.progress}%` }} 
            />
          </div>
          <button className="cancel-download-btn" onClick={cancelDownload}>
            Cancel Download
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="panel-container">
      {/* Header */}
      <div className="panel-header">
        <button className="back-button" onClick={onBack}>
          <ArrowLeft size={20} />
        </button>
        <div className="panel-title-section">
          <h2>
            <Mic size={24} style={{ color: '#8b5cf6' }} />
            Audio–Text Helper
          </h2>
          <p>AI-powered transcription and speaker detection</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="panel-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`panel-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="panel-content-area">
        {/* File Selection - Shared across tabs */}
        <div className="section">
          <div className="section-title">
            <FileAudio size={18} />
            Input File
          </div>
          
          {!selectedFile ? (
            <div className="drop-zone" onClick={selectFile}>
              <Upload size={40} />
              <p>Click to select audio or video file</p>
              <span className="hint">Supports MP3, WAV, MP4, MKV, etc.</span>
            </div>
          ) : (
            <div className="result-card info">
              <FileAudio size={20} />
              <div className="result-info">
                <strong>{fileName}</strong>
                <span>Ready for processing</span>
              </div>
              <button className="btn btn-icon btn-secondary" onClick={() => { setSelectedFile(null); setTranscriptionResult(null); setDiarizationResult(null); }}>
                <X size={16} />
              </button>
            </div>
          )}
        </div>

        {/* Transcribe Tab */}
        {activeTab === 'transcribe' && (
          <>
            <div className="section">
              <div className="section-title">
                <Settings size={18} />
                Transcription Settings
              </div>
              
              <div className="form-group">
                <label className="form-label">Whisper Model</label>
                <select 
                  className="form-select" 
                  value={whisperModel}
                  onChange={(e) => setWhisperModel(e.target.value)}
                >
                  <option value="tiny">Tiny (Fast, Less Accurate)</option>
                  <option value="base">Base (Balanced)</option>
                  <option value="small">Small (Better Quality)</option>
                  <option value="medium">Medium (High Quality)</option>
                  <option value="large">Large (Best Quality, Slow)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Language</label>
                <select 
                  className="form-select"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
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

              <div className="form-group">
                <label className="form-label">Output Format</label>
                <div className="btn-group">
                  {['srt', 'txt', 'json'].map(fmt => (
                    <button
                      key={fmt}
                      className={`btn btn-secondary ${outputFormat === fmt ? 'active' : ''}`}
                      onClick={() => setOutputFormat(fmt)}
                      style={outputFormat === fmt ? { background: 'rgba(96, 165, 250, 0.2)', borderColor: '#60a5fa' } : {}}
                    >
                      {fmt.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button 
              className="btn btn-primary" 
              style={{ width: '100%' }}
              onClick={handleTranscribe}
              disabled={!selectedFile || isTranscribing}
            >
              {isTranscribing ? (
                <><RefreshCw className="spin" size={18} /> Transcribing...</>
              ) : (
                <><Play size={18} /> Start Transcription</>
              )}
            </button>

            {transcriptionResult && (
              <div className={`result-card ${transcriptionResult.success ? 'success' : 'error'}`} style={{ marginTop: '1rem' }}>
                {transcriptionResult.success ? (
                  <>
                    <Check size={20} />
                    <div className="result-info">
                      <strong>Transcription Complete</strong>
                      <span>Language: {transcriptionResult.language}</span>
                    </div>
                    {transcriptionResult.output_path && (
                      <button className="btn btn-icon btn-secondary" onClick={() => openFileLocation(transcriptionResult.output_path!)}>
                        <FolderOpen size={16} />
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <AlertCircle size={20} />
                    <div className="result-info">
                      <strong>Transcription Failed</strong>
                      <span>{transcriptionResult.error}</span>
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        )}

        {/* Diarization Tab */}
        {activeTab === 'diarization' && (
          <>
            <div className="section">
              <div className="section-title">
                <Users size={18} />
                Speaker Detection Settings
              </div>
              
              <div className="form-group">
                <div className="checkbox-group">
                  <input
                    type="checkbox"
                    className="checkbox-input"
                    id="autoDetectSpeakers"
                    checked={numSpeakers === null}
                    onChange={(e) => setNumSpeakers(e.target.checked ? null : 2)}
                  />
                  <label className="checkbox-label" htmlFor="autoDetectSpeakers">
                    Auto-detect number of speakers
                  </label>
                </div>
              </div>

              {numSpeakers !== null && (
                <div className="form-group">
                  <label className="form-label">Number of Speakers</label>
                  <div className="number-stepper">
                    <button className="stepper-btn" onClick={() => setNumSpeakers(Math.max(1, (numSpeakers || 2) - 1))}>-</button>
                    <input 
                      className="stepper-value" 
                      type="number" 
                      value={numSpeakers || 2}
                      onChange={(e) => setNumSpeakers(parseInt(e.target.value) || 2)}
                    />
                    <button className="stepper-btn" onClick={() => setNumSpeakers(Math.min(10, (numSpeakers || 2) + 1))}>+</button>
                  </div>
                </div>
              )}

              {numSpeakers === null && (
                <div className="form-group">
                  <label className="form-label">Maximum Speakers to Detect</label>
                  <div className="number-stepper">
                    <button className="stepper-btn" onClick={() => setMaxSpeakers(Math.max(2, maxSpeakers - 1))}>-</button>
                    <input 
                      className="stepper-value" 
                      type="number" 
                      value={maxSpeakers}
                      onChange={(e) => setMaxSpeakers(parseInt(e.target.value) || 10)}
                    />
                    <button className="stepper-btn" onClick={() => setMaxSpeakers(Math.min(20, maxSpeakers + 1))}>+</button>
                  </div>
                </div>
              )}
            </div>

            <button 
              className="btn btn-primary" 
              style={{ width: '100%' }}
              onClick={handleDiarization}
              disabled={!selectedFile || isDiarizing}
            >
              {isDiarizing ? (
                <><RefreshCw className="spin" size={18} /> Analyzing Speakers...</>
              ) : (
                <><Users size={18} /> Detect Speakers</>
              )}
            </button>

            {diarizationResult?.success && speakers.length > 0 && (
              <div className="section" style={{ marginTop: '1rem' }}>
                <div className="section-title">
                  <Users size={18} />
                  Detected Speakers ({speakers.length})
                </div>

                <div className="speaker-list">
                  {speakers.map((speaker) => (
                    <div 
                      key={speaker.id} 
                      className={`speaker-item ${selectedSpeaker === speaker.id ? 'selected' : ''}`}
                      onClick={() => setSelectedSpeaker(speaker.id)}
                    >
                      <div className="speaker-avatar" style={{ background: `${speaker.color}20`, color: speaker.color }}>
                        {speaker.name.charAt(0)}
                      </div>
                      <div className="speaker-info">
                        <div className="speaker-name">{speaker.name}</div>
                        <div className="speaker-stats">
                          {speaker.segments.length} segments • {Math.round(speaker.duration)}s
                        </div>
                      </div>
                      <div className="speaker-actions">
                        <button className="btn btn-icon btn-secondary" onClick={(e) => { e.stopPropagation(); exportSpeakerSRT(speaker); }} title="Export SRT">
                          <FileText size={14} />
                        </button>
                        <button className="btn btn-icon btn-secondary" onClick={(e) => { e.stopPropagation(); extractSpeakerAudio(speaker); }} title="Extract Audio">
                          <Music size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="btn-group" style={{ marginTop: '1rem' }}>
                  <button className="btn btn-secondary" onClick={exportAllSpeakersSRT}>
                    <Download size={16} /> Export All SRTs
                  </button>
                </div>
              </div>
            )}

            {diarizationResult && !diarizationResult.success && (
              <div className="result-card error" style={{ marginTop: '1rem' }}>
                <AlertCircle size={20} />
                <div className="result-info">
                  <strong>Speaker Detection Failed</strong>
                  <span>{diarizationResult.error}</span>
                </div>
              </div>
            )}
          </>
        )}

        {/* Extract Audio Tab */}
        {activeTab === 'extract' && (
          <>
            {speakers.length > 0 ? (
              <>
                <div className="section">
                  <div className="section-title">
                    <Settings size={18} />
                    Export Options
                  </div>

                  <div className="form-group">
                    <div className="checkbox-group">
                      <input
                        type="checkbox"
                        className="checkbox-input"
                        id="perSentence"
                        checked={exportPerSentence}
                        onChange={(e) => setExportPerSentence(e.target.checked)}
                      />
                      <label className="checkbox-label" htmlFor="perSentence">
                        Export as separate files per sentence
                      </label>
                    </div>
                  </div>

                  <div className="form-group">
                    <div className="checkbox-group">
                      <input
                        type="checkbox"
                        className="checkbox-input"
                        id="removeNoise"
                        checked={removeNoise}
                        onChange={(e) => setRemoveNoise(e.target.checked)}
                      />
                      <label className="checkbox-label" htmlFor="removeNoise">
                        Remove background noise before export
                      </label>
                    </div>
                  </div>
                </div>

                <div className="section">
                  <div className="section-title">
                    <Users size={18} />
                    Select Speaker to Extract
                  </div>

                  <div className="speaker-list">
                    {speakers.map((speaker) => (
                      <div 
                        key={speaker.id} 
                        className={`speaker-item ${selectedSpeaker === speaker.id ? 'selected' : ''}`}
                        onClick={() => setSelectedSpeaker(speaker.id)}
                      >
                        <div className="speaker-avatar" style={{ background: `${speaker.color}20`, color: speaker.color }}>
                          {speaker.name.charAt(0)}
                        </div>
                        <div className="speaker-info">
                          <div className="speaker-name">{speaker.name}</div>
                          <div className="speaker-stats">
                            {speaker.segments.length} segments • {Math.round(speaker.duration)}s
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <button 
                  className="btn btn-primary" 
                  style={{ width: '100%' }}
                  onClick={() => selectedSpeaker && extractSpeakerAudio(speakers.find(s => s.id === selectedSpeaker)!)}
                  disabled={!selectedSpeaker}
                >
                  <Music size={18} /> Extract Selected Speaker Audio
                </button>
              </>
            ) : (
              <div className="result-card info">
                <Users size={20} />
                <div className="result-info">
                  <strong>No Speakers Detected</strong>
                  <span>Run speaker detection first to extract individual audio</span>
                </div>
              </div>
            )}
          </>
        )}

        {/* Denoise Tab */}
        {activeTab === 'denoise' && (
          <>
            <div className="section">
              <div className="section-title">
                <Settings size={18} />
                Noise Removal Settings
              </div>

              <div className="form-group">
                <label className="form-label">Method</label>
                <select 
                  className="form-select"
                  value={denoiseMethod}
                  onChange={(e) => setDenoiseMethod(e.target.value)}
                >
                  <option value="denoiser">AI Denoiser (Best Quality)</option>
                  <option value="ffmpeg">FFmpeg Filters (Faster)</option>
                </select>
              </div>
            </div>

            <button 
              className="btn btn-primary" 
              style={{ width: '100%' }}
              onClick={handleDenoise}
              disabled={!selectedFile || isDenoising}
            >
              {isDenoising ? (
                <><RefreshCw className="spin" size={18} /> Removing Noise...</>
              ) : (
                <><VolumeX size={18} /> Remove Background Noise</>
              )}
            </button>

            {denoiseResult && (
              <div className={`result-card ${denoiseResult.success ? 'success' : 'error'}`} style={{ marginTop: '1rem' }}>
                {denoiseResult.success ? (
                  <>
                    <Check size={20} />
                    <div className="result-info">
                      <strong>Noise Removal Complete</strong>
                      <span>Audio cleaned successfully</span>
                    </div>
                    {denoiseResult.output_path && (
                      <button className="btn btn-icon btn-secondary" onClick={() => openFileLocation(denoiseResult.output_path)}>
                        <FolderOpen size={16} />
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <AlertCircle size={20} />
                    <div className="result-info">
                      <strong>Noise Removal Failed</strong>
                      <span>{denoiseResult.error}</span>
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AudioTextHelper;
