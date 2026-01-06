import React, { useState } from 'react';
import {
  ArrowLeft, FileVideo, FileAudio, Upload, RefreshCw, Play, Check,
  AlertCircle, FolderOpen, X, Scissors, Merge, Film, Volume2,
  VolumeX, Minimize2, Settings
} from 'lucide-react';
import { invoke } from '@tauri-apps/api/tauri';
import { open, save } from '@tauri-apps/api/dialog';
import './MediaHelper.css';

interface MediaToolsPanelProps {
  onBack: () => void;
}

type TabType = 'convert' | 'merge' | 'mux' | 'extract' | 'compress' | 'trim' | 'denoise';

interface FileItem {
  path: string;
  name: string;
  type: 'video' | 'audio' | 'unknown';
}

interface OperationResult {
  success: boolean;
  message?: string;
  outputPath?: string;
  error?: string;
}

export const MediaToolsPanel: React.FC<MediaToolsPanelProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<TabType>('convert');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<OperationResult | null>(null);
  
  // File states
  const [selectedFiles, setSelectedFiles] = useState<FileItem[]>([]);
  const [videoFile, setVideoFile] = useState<FileItem | null>(null);
  const [audioFile, setAudioFile] = useState<FileItem | null>(null);
  
  // Convert options
  const [outputFormat, setOutputFormat] = useState<string>('mp4');
  const [videoCodec, setVideoCodec] = useState<string>('copy');
  const [audioCodec, setAudioCodec] = useState<string>('copy');
  const [resolution, setResolution] = useState<string>('original');
  const [fps, setFps] = useState<string>('original');
  
  // Compress options
  const [compressionLevel, setCompressionLevel] = useState<string>('medium');
  const [targetSize, setTargetSize] = useState<string>('');
  
  // Trim options
  const [startTime, setStartTime] = useState<string>('00:00:00');
  const [endTime, setEndTime] = useState<string>('00:00:10');
  
  // Denoise options
  const [denoiseMethod, setDenoiseMethod] = useState<string>('highpass');
  const [denoiseStrength, setDenoiseStrength] = useState<number>(50);

  const getFileType = (path: string): 'video' | 'audio' | 'unknown' => {
    const ext = path.split('.').pop()?.toLowerCase() || '';
    if (['mp4', 'mkv', 'avi', 'mov', 'wmv', 'webm', 'flv'].includes(ext)) return 'video';
    if (['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac', 'wma'].includes(ext)) return 'audio';
    return 'unknown';
  };

  const selectFiles = async (multiple: boolean = true) => {
    try {
      const selected = await open({
        multiple,
        filters: [{
          name: 'Media Files',
          extensions: ['mp4', 'mkv', 'avi', 'mov', 'wmv', 'webm', 'flv', 'mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac']
        }]
      });

      if (selected) {
        const paths = Array.isArray(selected) ? selected : [selected];
        const files: FileItem[] = paths.map(path => ({
          path,
          name: path.split(/[\\/]/).pop() || 'Unknown',
          type: getFileType(path)
        }));
        setSelectedFiles(files);
        setResult(null);
      }
    } catch (err) {
      console.error('Failed to select files:', err);
    }
  };

  const selectVideoFile = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: 'Video Files', extensions: ['mp4', 'mkv', 'avi', 'mov', 'wmv', 'webm', 'flv'] }]
      });

      if (selected && typeof selected === 'string') {
        setVideoFile({
          path: selected,
          name: selected.split(/[\\/]/).pop() || 'Unknown',
          type: 'video'
        });
      }
    } catch (err) {
      console.error('Failed to select video:', err);
    }
  };

  const selectAudioFile = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: 'Audio Files', extensions: ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac'] }]
      });

      if (selected && typeof selected === 'string') {
        setAudioFile({
          path: selected,
          name: selected.split(/[\\/]/).pop() || 'Unknown',
          type: 'audio'
        });
      }
    } catch (err) {
      console.error('Failed to select audio:', err);
    }
  };

  const handleConvert = async () => {
    if (selectedFiles.length === 0) return;
    setIsProcessing(true);
    setResult(null);

    try {
      const outputDir = await open({ directory: true, title: 'Select output directory' });
      if (!outputDir) { setIsProcessing(false); return; }

      const results = await Promise.all(selectedFiles.map(file => 
        invoke<OperationResult>('convert_media', {
          inputPath: file.path,
          outputDir,
          format: outputFormat,
          videoCodec: videoCodec !== 'copy' ? videoCodec : null,
          audioCodec: audioCodec !== 'copy' ? audioCodec : null,
          resolution: resolution !== 'original' ? resolution : null,
          fps: fps !== 'original' ? parseInt(fps) : null
        })
      ));

      const allSuccess = results.every(r => r.success);
      setResult({
        success: allSuccess,
        message: allSuccess 
          ? `Successfully converted ${results.length} file(s)` 
          : `${results.filter(r => r.success).length}/${results.length} files converted`,
        outputPath: outputDir as string
      });
    } catch (err) {
      setResult({ success: false, error: String(err) });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMerge = async () => {
    if (selectedFiles.length < 2) return;
    setIsProcessing(true);
    setResult(null);

    try {
      const outputPath = await save({
        defaultPath: 'merged_output.mp4',
        filters: [{ name: 'Video', extensions: ['mp4', 'mkv'] }]
      });

      if (!outputPath) { setIsProcessing(false); return; }

      const result = await invoke<OperationResult>('merge_media_files', {
        inputPaths: selectedFiles.map(f => f.path),
        outputPath
      });

      setResult(result);
    } catch (err) {
      setResult({ success: false, error: String(err) });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMux = async () => {
    if (!videoFile || !audioFile) return;
    setIsProcessing(true);
    setResult(null);

    try {
      const outputPath = await save({
        defaultPath: 'muxed_output.mp4',
        filters: [{ name: 'Video', extensions: ['mp4', 'mkv'] }]
      });

      if (!outputPath) { setIsProcessing(false); return; }

      const result = await invoke<OperationResult>('mux_video_audio', {
        videoPath: videoFile.path,
        audioPath: audioFile.path,
        outputPath
      });

      setResult(result);
    } catch (err) {
      setResult({ success: false, error: String(err) });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExtractAudio = async () => {
    if (selectedFiles.length === 0) return;
    setIsProcessing(true);
    setResult(null);

    try {
      const outputDir = await open({ directory: true, title: 'Select output directory' });
      if (!outputDir) { setIsProcessing(false); return; }

      const results = await Promise.all(selectedFiles.map(file => 
        invoke<OperationResult>('extract_audio_from_video', {
          inputPath: file.path,
          outputDir,
          format: 'mp3'
        })
      ));

      const allSuccess = results.every(r => r.success);
      setResult({
        success: allSuccess,
        message: allSuccess 
          ? `Extracted audio from ${results.length} file(s)` 
          : `${results.filter(r => r.success).length}/${results.length} extractions succeeded`,
        outputPath: outputDir as string
      });
    } catch (err) {
      setResult({ success: false, error: String(err) });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCompress = async () => {
    if (selectedFiles.length === 0) return;
    setIsProcessing(true);
    setResult(null);

    try {
      const outputDir = await open({ directory: true, title: 'Select output directory' });
      if (!outputDir) { setIsProcessing(false); return; }

      const results = await Promise.all(selectedFiles.map(file => 
        invoke<OperationResult>('compress_media', {
          inputPath: file.path,
          outputDir,
          compressionLevel,
          targetSizeMb: targetSize ? parseInt(targetSize) : null
        })
      ));

      const allSuccess = results.every(r => r.success);
      setResult({
        success: allSuccess,
        message: allSuccess 
          ? `Compressed ${results.length} file(s)` 
          : `${results.filter(r => r.success).length}/${results.length} compressions succeeded`,
        outputPath: outputDir as string
      });
    } catch (err) {
      setResult({ success: false, error: String(err) });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTrim = async () => {
    if (selectedFiles.length === 0) return;
    setIsProcessing(true);
    setResult(null);

    try {
      const outputDir = await open({ directory: true, title: 'Select output directory' });
      if (!outputDir) { setIsProcessing(false); return; }

      const results = await Promise.all(selectedFiles.map(file => 
        invoke<OperationResult>('trim_media', {
          inputPath: file.path,
          outputDir,
          startTime,
          endTime
        })
      ));

      const allSuccess = results.every(r => r.success);
      setResult({
        success: allSuccess,
        message: allSuccess 
          ? `Trimmed ${results.length} file(s)` 
          : `${results.filter(r => r.success).length}/${results.length} trims succeeded`,
        outputPath: outputDir as string
      });
    } catch (err) {
      setResult({ success: false, error: String(err) });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDenoise = async () => {
    if (selectedFiles.length === 0) return;
    setIsProcessing(true);
    setResult(null);

    try {
      const outputDir = await open({ directory: true, title: 'Select output directory' });
      if (!outputDir) { setIsProcessing(false); return; }

      const results = await Promise.all(selectedFiles.map(file => 
        invoke<OperationResult>('denoise_audio_ffmpeg', {
          inputPath: file.path,
          outputDir,
          method: denoiseMethod,
          strength: denoiseStrength
        })
      ));

      const allSuccess = results.every(r => r.success);
      setResult({
        success: allSuccess,
        message: allSuccess 
          ? `Denoised ${results.length} file(s)` 
          : `${results.filter(r => r.success).length}/${results.length} denoise operations succeeded`,
        outputPath: outputDir as string
      });
    } catch (err) {
      setResult({ success: false, error: String(err) });
    } finally {
      setIsProcessing(false);
    }
  };

  const openFileLocation = async (path: string) => {
    try {
      await invoke('show_in_folder', { path });
    } catch (err) {
      console.error('Failed to open folder:', err);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const tabs = [
    { id: 'convert' as TabType, label: 'Convert', icon: <RefreshCw size={16} /> },
    { id: 'merge' as TabType, label: 'Merge', icon: <Merge size={16} /> },
    { id: 'mux' as TabType, label: 'Mux', icon: <Film size={16} /> },
    { id: 'extract' as TabType, label: 'Extract Audio', icon: <Volume2 size={16} /> },
    { id: 'compress' as TabType, label: 'Compress', icon: <Minimize2 size={16} /> },
    { id: 'trim' as TabType, label: 'Trim', icon: <Scissors size={16} /> },
    { id: 'denoise' as TabType, label: 'Denoise', icon: <VolumeX size={16} /> },
  ];

  return (
    <div className="panel-container">
      {/* Header */}
      <div className="panel-header">
        <button className="back-button" onClick={onBack}>
          <ArrowLeft size={20} />
        </button>
        <div className="panel-title-section">
          <h2>
            <FileVideo size={24} style={{ color: '#3b82f6' }} />
            Media Tools
          </h2>
          <p>Convert, merge, compress, and process media files</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="panel-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`panel-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => { setActiveTab(tab.id); setResult(null); }}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="panel-content-area">
        {/* File Selection for most tabs */}
        {activeTab !== 'mux' && (
          <div className="section">
            <div className="section-title">
              <Upload size={18} />
              Input Files
            </div>
            
            {selectedFiles.length === 0 ? (
              <div className="drop-zone" onClick={() => selectFiles(activeTab === 'merge')}>
                <Upload size={40} />
                <p>Click to select {activeTab === 'merge' ? 'multiple files' : 'file(s)'}</p>
                <span className="hint">Supports MP4, MKV, AVI, MP3, WAV, etc.</span>
              </div>
            ) : (
              <div className="file-list">
                {selectedFiles.map((file, index) => (
                  <div key={index} className="file-item">
                    {file.type === 'video' ? <FileVideo size={20} /> : <FileAudio size={20} />}
                    <span className="file-name">{file.name}</span>
                    <button className="btn btn-icon btn-secondary" onClick={() => removeFile(index)}>
                      <X size={14} />
                    </button>
                  </div>
                ))}
                <button className="btn btn-secondary" onClick={() => selectFiles(activeTab === 'merge')}>
                  <Upload size={16} /> Add More
                </button>
              </div>
            )}
          </div>
        )}

        {/* Convert Tab */}
        {activeTab === 'convert' && (
          <>
            <div className="section">
              <div className="section-title">
                <Settings size={18} />
                Conversion Settings
              </div>

              <div className="form-group">
                <label className="form-label">Output Format</label>
                <select className="form-select" value={outputFormat} onChange={(e) => setOutputFormat(e.target.value)}>
                  <optgroup label="Video">
                    <option value="mp4">MP4</option>
                    <option value="mkv">MKV</option>
                    <option value="avi">AVI</option>
                    <option value="webm">WebM</option>
                    <option value="mov">MOV</option>
                  </optgroup>
                  <optgroup label="Audio">
                    <option value="mp3">MP3</option>
                    <option value="wav">WAV</option>
                    <option value="ogg">OGG</option>
                    <option value="flac">FLAC</option>
                    <option value="aac">AAC</option>
                  </optgroup>
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Video Codec</label>
                  <select className="form-select" value={videoCodec} onChange={(e) => setVideoCodec(e.target.value)}>
                    <option value="copy">Copy (No re-encode)</option>
                    <option value="libx264">H.264</option>
                    <option value="libx265">H.265 (HEVC)</option>
                    <option value="libvpx-vp9">VP9</option>
                    <option value="libsvtav1">AV1</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Audio Codec</label>
                  <select className="form-select" value={audioCodec} onChange={(e) => setAudioCodec(e.target.value)}>
                    <option value="copy">Copy (No re-encode)</option>
                    <option value="aac">AAC</option>
                    <option value="libmp3lame">MP3</option>
                    <option value="libvorbis">Vorbis</option>
                    <option value="flac">FLAC</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Resolution</label>
                  <select className="form-select" value={resolution} onChange={(e) => setResolution(e.target.value)}>
                    <option value="original">Original</option>
                    <option value="3840x2160">4K (3840x2160)</option>
                    <option value="1920x1080">1080p (1920x1080)</option>
                    <option value="1280x720">720p (1280x720)</option>
                    <option value="854x480">480p (854x480)</option>
                    <option value="640x360">360p (640x360)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Frame Rate</label>
                  <select className="form-select" value={fps} onChange={(e) => setFps(e.target.value)}>
                    <option value="original">Original</option>
                    <option value="60">60 FPS</option>
                    <option value="30">30 FPS</option>
                    <option value="24">24 FPS</option>
                  </select>
                </div>
              </div>
            </div>

            <button 
              className="btn btn-primary" 
              style={{ width: '100%' }}
              onClick={handleConvert}
              disabled={selectedFiles.length === 0 || isProcessing}
            >
              {isProcessing ? (
                <><RefreshCw className="spin" size={18} /> Converting...</>
              ) : (
                <><Play size={18} /> Convert Files</>
              )}
            </button>
          </>
        )}

        {/* Merge Tab */}
        {activeTab === 'merge' && (
          <>
            <div className="section">
              <div className="section-title">
                <Merge size={18} />
                Merge Options
              </div>
              <p className="hint">Files will be merged in the order shown. Drag to reorder.</p>
            </div>

            <button 
              className="btn btn-primary" 
              style={{ width: '100%' }}
              onClick={handleMerge}
              disabled={selectedFiles.length < 2 || isProcessing}
            >
              {isProcessing ? (
                <><RefreshCw className="spin" size={18} /> Merging...</>
              ) : (
                <><Merge size={18} /> Merge Files</>
              )}
            </button>
          </>
        )}

        {/* Mux Tab */}
        {activeTab === 'mux' && (
          <>
            <div className="section">
              <div className="section-title">
                <FileVideo size={18} />
                Video File
              </div>
              
              {!videoFile ? (
                <div className="drop-zone small" onClick={selectVideoFile}>
                  <FileVideo size={32} />
                  <p>Select video file</p>
                </div>
              ) : (
                <div className="file-item">
                  <FileVideo size={20} />
                  <span className="file-name">{videoFile.name}</span>
                  <button className="btn btn-icon btn-secondary" onClick={() => setVideoFile(null)}>
                    <X size={14} />
                  </button>
                </div>
              )}
            </div>

            <div className="section">
              <div className="section-title">
                <FileAudio size={18} />
                Audio File
              </div>
              
              {!audioFile ? (
                <div className="drop-zone small" onClick={selectAudioFile}>
                  <FileAudio size={32} />
                  <p>Select audio file</p>
                </div>
              ) : (
                <div className="file-item">
                  <FileAudio size={20} />
                  <span className="file-name">{audioFile.name}</span>
                  <button className="btn btn-icon btn-secondary" onClick={() => setAudioFile(null)}>
                    <X size={14} />
                  </button>
                </div>
              )}
            </div>

            <button 
              className="btn btn-primary" 
              style={{ width: '100%' }}
              onClick={handleMux}
              disabled={!videoFile || !audioFile || isProcessing}
            >
              {isProcessing ? (
                <><RefreshCw className="spin" size={18} /> Muxing...</>
              ) : (
                <><Film size={18} /> Mux Video + Audio</>
              )}
            </button>
          </>
        )}

        {/* Extract Audio Tab */}
        {activeTab === 'extract' && (
          <>
            <div className="section">
              <div className="section-title">
                <Settings size={18} />
                Extract Settings
              </div>
              <p className="hint">Audio will be extracted as MP3 from video files</p>
            </div>

            <button 
              className="btn btn-primary" 
              style={{ width: '100%' }}
              onClick={handleExtractAudio}
              disabled={selectedFiles.length === 0 || isProcessing}
            >
              {isProcessing ? (
                <><RefreshCw className="spin" size={18} /> Extracting...</>
              ) : (
                <><Volume2 size={18} /> Extract Audio</>
              )}
            </button>
          </>
        )}

        {/* Compress Tab */}
        {activeTab === 'compress' && (
          <>
            <div className="section">
              <div className="section-title">
                <Settings size={18} />
                Compression Settings
              </div>

              <div className="form-group">
                <label className="form-label">Compression Level</label>
                <select className="form-select" value={compressionLevel} onChange={(e) => setCompressionLevel(e.target.value)}>
                  <option value="light">Light (Higher Quality)</option>
                  <option value="medium">Medium (Balanced)</option>
                  <option value="heavy">Heavy (Smaller Size)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Target Size (MB) - Optional</label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="Leave empty for automatic"
                  value={targetSize}
                  onChange={(e) => setTargetSize(e.target.value)}
                />
              </div>
            </div>

            <button 
              className="btn btn-primary" 
              style={{ width: '100%' }}
              onClick={handleCompress}
              disabled={selectedFiles.length === 0 || isProcessing}
            >
              {isProcessing ? (
                <><RefreshCw className="spin" size={18} /> Compressing...</>
              ) : (
                <><Minimize2 size={18} /> Compress Files</>
              )}
            </button>
          </>
        )}

        {/* Trim Tab */}
        {activeTab === 'trim' && (
          <>
            <div className="section">
              <div className="section-title">
                <Scissors size={18} />
                Trim Settings
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Start Time</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="HH:MM:SS"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">End Time</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="HH:MM:SS"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <button 
              className="btn btn-primary" 
              style={{ width: '100%' }}
              onClick={handleTrim}
              disabled={selectedFiles.length === 0 || isProcessing}
            >
              {isProcessing ? (
                <><RefreshCw className="spin" size={18} /> Trimming...</>
              ) : (
                <><Scissors size={18} /> Trim Files</>
              )}
            </button>
          </>
        )}

        {/* Denoise Tab */}
        {activeTab === 'denoise' && (
          <>
            <div className="section">
              <div className="section-title">
                <Settings size={18} />
                Denoise Settings
              </div>

              <div className="form-group">
                <label className="form-label">Method</label>
                <select className="form-select" value={denoiseMethod} onChange={(e) => setDenoiseMethod(e.target.value)}>
                  <option value="highpass">High-Pass Filter (Removes low rumble)</option>
                  <option value="lowpass">Low-Pass Filter (Removes high hiss)</option>
                  <option value="bandpass">Band-Pass Filter (Voice focus)</option>
                  <option value="anlmdn">Non-Local Means (Best quality, slow)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Strength: {denoiseStrength}%</label>
                <input
                  type="range"
                  className="form-range"
                  min="0"
                  max="100"
                  value={denoiseStrength}
                  onChange={(e) => setDenoiseStrength(parseInt(e.target.value))}
                />
              </div>
            </div>

            <button 
              className="btn btn-primary" 
              style={{ width: '100%' }}
              onClick={handleDenoise}
              disabled={selectedFiles.length === 0 || isProcessing}
            >
              {isProcessing ? (
                <><RefreshCw className="spin" size={18} /> Processing...</>
              ) : (
                <><VolumeX size={18} /> Remove Noise</>
              )}
            </button>
          </>
        )}

        {/* Result */}
        {result && (
          <div className={`result-card ${result.success ? 'success' : 'error'}`} style={{ marginTop: '1rem' }}>
            {result.success ? (
              <>
                <Check size={20} />
                <div className="result-info">
                  <strong>Operation Complete</strong>
                  <span>{result.message}</span>
                </div>
                {result.outputPath && (
                  <button className="btn btn-icon btn-secondary" onClick={() => openFileLocation(result.outputPath!)}>
                    <FolderOpen size={16} />
                  </button>
                )}
              </>
            ) : (
              <>
                <AlertCircle size={20} />
                <div className="result-info">
                  <strong>Operation Failed</strong>
                  <span>{result.error}</span>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MediaToolsPanel;
