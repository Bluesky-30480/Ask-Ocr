import React, { useState } from 'react';
import { 
  FileAudio, FileVideo, ArrowRight, Upload, Check, AlertCircle, 
  RefreshCw, FolderOpen, Layers, ChevronDown, Scissors,
  Combine, Volume2, Minimize2, Info, Trash2, Plus, GripVertical,
  Clock, Film, Music, Subtitles, X
} from 'lucide-react';
import { invoke } from '@tauri-apps/api/tauri';
import { open, save } from '@tauri-apps/api/dialog';
import './FileHelpers.css';

// =============================================================================
// TYPES
// =============================================================================

interface ConversionResult {
  success: boolean;
  output_path?: string;
  error?: string;
  file_size?: number;
}

interface MediaInfo {
  success: boolean;
  file_path?: string;
  file_name?: string;
  file_size?: number;
  duration?: number;
  bit_rate?: number;
  format_name?: string;
  format_long_name?: string;
  streams?: {
    video: VideoStream[];
    audio: AudioStream[];
    subtitle: SubtitleStream[];
  };
  error?: string;
}

interface VideoStream {
  index?: number;
  codec_name?: string;
  codec_long_name?: string;
  width?: number;
  height?: number;
  fps?: number;
  pix_fmt?: string;
}

interface AudioStream {
  index?: number;
  codec_name?: string;
  codec_long_name?: string;
  sample_rate?: string;
  channels?: number;
  channel_layout?: string;
}

interface SubtitleStream {
  index?: number;
  codec_name?: string;
  language?: string;
  title?: string;
}

interface MergeResult {
  success: boolean;
  output_path?: string;
  file_size?: number;
  merged_count?: number;
  error?: string;
}

interface CompressionResult {
  success: boolean;
  output_path?: string;
  original_size?: number;
  compressed_size?: number;
  compression_ratio?: number;
  error?: string;
}

type TabType = 'convert' | 'merge' | 'mux' | 'extract' | 'compress' | 'trim';

interface FileItem {
  id: string;
  path: string;
  name: string;
  info?: MediaInfo;
}

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

const formatFileSize = (bytes?: number): string => {
  if (!bytes) return '0 B';
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
};

const formatDuration = (seconds?: number): string => {
  if (!seconds) return '00:00';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const FileHelpers: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('convert');
  
  // Convert state
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [fileInfo, setFileInfo] = useState<MediaInfo | null>(null);
  const [targetFormat, setTargetFormat] = useState<string>('mp3');
  const [isConverting, setIsConverting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ConversionResult | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [isFormatDropdownOpen, setIsFormatDropdownOpen] = useState(false);

  // Merge state
  const [mergeFiles, setMergeFiles] = useState<FileItem[]>([]);
  const [mergeResult, setMergeResult] = useState<MergeResult | null>(null);
  const [isMerging, setIsMerging] = useState(false);

  // Mux state
  const [muxVideoFile, setMuxVideoFile] = useState<FileItem | null>(null);
  const [muxAudioFiles, setMuxAudioFiles] = useState<FileItem[]>([]);
  const [muxSubtitleFiles, setMuxSubtitleFiles] = useState<FileItem[]>([]);
  const [muxResult, setMuxResult] = useState<ConversionResult | null>(null);
  const [isMuxing, setIsMuxing] = useState(false);

  // Extract audio state
  const [extractFile, setExtractFile] = useState<string | null>(null);
  const [extractFileName, setExtractFileName] = useState<string>('');
  const [extractFormat, setExtractFormat] = useState<string>('mp3');
  const [extractResult, setExtractResult] = useState<ConversionResult | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);

  // Compress state
  const [compressFile, setCompressFile] = useState<string | null>(null);
  const [compressFileName, setCompressFileName] = useState<string>('');
  const [compressCrf, setCompressCrf] = useState<number>(28);
  const [compressPreset, setCompressPreset] = useState<string>('medium');
  const [compressResolution, setCompressResolution] = useState<string>('');
  const [compressResult, setCompressResult] = useState<CompressionResult | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);

  // Trim state
  const [trimFile, setTrimFile] = useState<string | null>(null);
  const [trimFileName, setTrimFileName] = useState<string>('');
  const [trimStart, setTrimStart] = useState<string>('00:00:00');
  const [trimEnd, setTrimEnd] = useState<string>('00:00:10');
  const [trimResult, setTrimResult] = useState<ConversionResult | null>(null);
  const [isTrimming, setIsTrimming] = useState(false);

  // =============================================================================
  // CONVERT TAB HANDLERS
  // =============================================================================

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      // @ts-ignore - Tauri exposes path property
      const path = e.dataTransfer.files[0].path;
      if (path) {
        setSelectedFile(path);
        setFileName(e.dataTransfer.files[0].name);
        setResult(null);
        loadMediaInfo(path);
      }
    }
  };

  const loadMediaInfo = async (filePath: string) => {
    try {
      const info = await invoke<MediaInfo>('get_media_info', { filePath });
      setFileInfo(info);
    } catch (err) {
      console.error('Failed to get media info:', err);
    }
  };

  const selectFile = async (setter: (path: string) => void, nameSetter: (name: string) => void) => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{
          name: 'Media Files',
          extensions: ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'mp4', 'mkv', 'avi', 'mov', 'webm', 'srt', 'ass', 'vtt']
        }]
      });

      if (selected && typeof selected === 'string') {
        setter(selected);
        const name = selected.split(/[\\/]/).pop() || 'Unknown file';
        nameSetter(name);
        setResult(null);
        if (activeTab === 'convert') {
          loadMediaInfo(selected);
        }
      }
    } catch (err) {
      console.error('Failed to select file:', err);
    }
  };

  const handleConvert = async () => {
    if (!selectedFile) return;

    setIsConverting(true);
    setProgress(0);
    setResult(null);

    const progressInterval = setInterval(() => {
      setProgress(prev => prev >= 90 ? prev : prev + 5);
    }, 500);

    try {
      const res = await invoke<ConversionResult>('convert_media_file', {
        filePath: selectedFile,
        targetFormat: targetFormat,
        options: null
      });

      clearInterval(progressInterval);
      setProgress(100);
      setResult(res);
    } catch (err) {
      clearInterval(progressInterval);
      setResult({ success: false, error: String(err) });
    } finally {
      setIsConverting(false);
    }
  };

  // =============================================================================
  // MERGE TAB HANDLERS
  // =============================================================================

  const addMergeFiles = async () => {
    try {
      const selected = await open({
        multiple: true,
        filters: [{
          name: 'Media Files',
          extensions: ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'mp4', 'mkv', 'avi', 'mov', 'webm']
        }]
      });

      if (selected) {
        const files = Array.isArray(selected) ? selected : [selected];
        const newItems: FileItem[] = files.map(path => ({
          id: `${Date.now()}-${Math.random()}`,
          path,
          name: path.split(/[\\/]/).pop() || 'Unknown'
        }));
        setMergeFiles(prev => [...prev, ...newItems]);
      }
    } catch (err) {
      console.error('Failed to select files:', err);
    }
  };

  const removeMergeFile = (id: string) => {
    setMergeFiles(prev => prev.filter(f => f.id !== id));
  };

  const handleMerge = async () => {
    if (mergeFiles.length < 2) return;

    setIsMerging(true);
    setMergeResult(null);

    try {
      const outputPath = await save({
        filters: [{
          name: 'Video',
          extensions: ['mp4', 'mkv', 'webm']
        }]
      });

      if (!outputPath) {
        setIsMerging(false);
        return;
      }

      const res = await invoke<MergeResult>('merge_files', {
        outputPath,
        inputFiles: mergeFiles.map(f => f.path),
        options: null
      });

      setMergeResult(res);
    } catch (err) {
      setMergeResult({ success: false, error: String(err) });
    } finally {
      setIsMerging(false);
    }
  };

  // =============================================================================
  // MUX TAB HANDLERS
  // =============================================================================

  const selectMuxVideo = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: 'Video', extensions: ['mp4', 'mkv', 'avi', 'mov', 'webm'] }]
      });

      if (selected && typeof selected === 'string') {
        const info = await invoke<MediaInfo>('get_media_info', { filePath: selected });
        setMuxVideoFile({
          id: Date.now().toString(),
          path: selected,
          name: selected.split(/[\\/]/).pop() || 'Video',
          info
        });
      }
    } catch (err) {
      console.error('Failed to select video:', err);
    }
  };

  const addMuxAudio = async () => {
    try {
      const selected = await open({
        multiple: true,
        filters: [{ name: 'Audio', extensions: ['mp3', 'wav', 'aac', 'm4a', 'flac', 'ogg'] }]
      });

      if (selected) {
        const files = Array.isArray(selected) ? selected : [selected];
        const newItems: FileItem[] = files.map(path => ({
          id: `${Date.now()}-${Math.random()}`,
          path,
          name: path.split(/[\\/]/).pop() || 'Audio'
        }));
        setMuxAudioFiles(prev => [...prev, ...newItems]);
      }
    } catch (err) {
      console.error('Failed to select audio:', err);
    }
  };

  const addMuxSubtitle = async () => {
    try {
      const selected = await open({
        multiple: true,
        filters: [{ name: 'Subtitles', extensions: ['srt', 'ass', 'vtt', 'sub'] }]
      });

      if (selected) {
        const files = Array.isArray(selected) ? selected : [selected];
        const newItems: FileItem[] = files.map(path => ({
          id: `${Date.now()}-${Math.random()}`,
          path,
          name: path.split(/[\\/]/).pop() || 'Subtitle'
        }));
        setMuxSubtitleFiles(prev => [...prev, ...newItems]);
      }
    } catch (err) {
      console.error('Failed to select subtitles:', err);
    }
  };

  const handleMux = async () => {
    if (!muxVideoFile && muxAudioFiles.length === 0) return;

    setIsMuxing(true);
    setMuxResult(null);

    try {
      const outputPath = await save({
        filters: [{ name: 'Video', extensions: ['mkv', 'mp4'] }]
      });

      if (!outputPath) {
        setIsMuxing(false);
        return;
      }

      const res = await invoke<ConversionResult>('mux_streams', {
        params: {
          video_file: muxVideoFile?.path || null,
          audio_files: muxAudioFiles.map(f => f.path),
          subtitle_files: muxSubtitleFiles.map(f => f.path),
          output_path: outputPath,
          options: null
        }
      });

      setMuxResult(res);
    } catch (err) {
      setMuxResult({ success: false, error: String(err) });
    } finally {
      setIsMuxing(false);
    }
  };

  // =============================================================================
  // EXTRACT AUDIO HANDLERS
  // =============================================================================

  const handleExtractAudio = async () => {
    if (!extractFile) return;

    setIsExtracting(true);
    setExtractResult(null);

    try {
      const res = await invoke<ConversionResult>('extract_audio', {
        inputPath: extractFile,
        outputFormat: extractFormat,
        audioStream: null
      });

      setExtractResult(res);
    } catch (err) {
      setExtractResult({ success: false, error: String(err) });
    } finally {
      setIsExtracting(false);
    }
  };

  // =============================================================================
  // COMPRESS HANDLERS
  // =============================================================================

  const handleCompress = async () => {
    if (!compressFile) return;

    setIsCompressing(true);
    setCompressResult(null);

    try {
      const res = await invoke<CompressionResult>('compress_video', {
        inputPath: compressFile,
        crf: compressCrf,
        preset: compressPreset,
        resolution: compressResolution || null
      });

      setCompressResult(res);
    } catch (err) {
      setCompressResult({ success: false, error: String(err) });
    } finally {
      setIsCompressing(false);
    }
  };

  // =============================================================================
  // TRIM HANDLERS
  // =============================================================================

  const handleTrim = async () => {
    if (!trimFile) return;

    setIsTrimming(true);
    setTrimResult(null);

    try {
      const res = await invoke<ConversionResult>('trim_video', {
        inputPath: trimFile,
        startTime: trimStart,
        endTime: trimEnd
      });

      setTrimResult(res);
    } catch (err) {
      setTrimResult({ success: false, error: String(err) });
    } finally {
      setIsTrimming(false);
    }
  };

  // =============================================================================
  // COMMON HANDLERS
  // =============================================================================

  const openFileLocation = async (path: string) => {
    try {
      await invoke('show_in_folder', { path });
    } catch (err) {
      console.error('Failed to open folder:', err);
    }
  };

  // =============================================================================
  // RENDER
  // =============================================================================

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'convert', label: 'Convert', icon: <RefreshCw size={16} /> },
    { id: 'merge', label: 'Merge', icon: <Combine size={16} /> },
    { id: 'mux', label: 'Mux', icon: <Layers size={16} /> },
    { id: 'extract', label: 'Extract Audio', icon: <Volume2 size={16} /> },
    { id: 'compress', label: 'Compress', icon: <Minimize2 size={16} /> },
    { id: 'trim', label: 'Trim', icon: <Scissors size={16} /> },
  ];

  const audioFormats = ['mp3', 'm4a', 'wav', 'flac', 'ogg', 'aac'];
  const videoFormats = ['mp4', 'mkv', 'webm', 'avi', 'mov'];

  return (
    <div className="file-helpers-container">
      {/* Header */}
      <div className="file-helpers-header">
        <div className="header-content">
          <h1>
            <span className="gradient-text">Media Tools</span>
          </h1>
          <p>Powerful FFmpeg-based media operations</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="tab-navigation">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {/* ============== CONVERT TAB ============== */}
        {activeTab === 'convert' && (
          <div className="panel-content">
            <div className="panel-section">
              {!selectedFile ? (
                <div 
                  className={`drop-zone ${dragActive ? 'active' : ''}`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => selectFile(setSelectedFile, setFileName)}
                >
                  <Upload size={48} />
                  <p>Drop file here or click to browse</p>
                  <span className="hint">Supports audio & video files</span>
                </div>
              ) : (
                <div className="selected-file-card">
                  <div className="file-icon-large">
                    {fileName.match(/\.(mp4|mkv|avi|mov|webm)$/i) ? <FileVideo size={32} /> : <FileAudio size={32} />}
                  </div>
                  <div className="file-info-content">
                    <div className="file-name-large" title={selectedFile}>{fileName}</div>
                    {fileInfo?.success && (
                      <div className="file-meta">
                        <span><Clock size={12} /> {formatDuration(fileInfo.duration)}</span>
                        <span><Info size={12} /> {formatFileSize(fileInfo.file_size)}</span>
                        {fileInfo.streams?.video[0] && (
                          <span><Film size={12} /> {fileInfo.streams.video[0].width}x{fileInfo.streams.video[0].height}</span>
                        )}
                      </div>
                    )}
                  </div>
                  <button className="icon-btn-small" onClick={() => { setSelectedFile(null); setFileInfo(null); setResult(null); }}>
                    <X size={16} />
                  </button>
                </div>
              )}
            </div>

            <div className="panel-section">
              <label className="section-label">Output Format</label>
              <div className="format-selector">
                <button 
                  className="format-dropdown-trigger"
                  onClick={() => setIsFormatDropdownOpen(!isFormatDropdownOpen)}
                >
                  <span className="format-badge">{targetFormat.toUpperCase()}</span>
                  <ChevronDown size={16} />
                </button>
                {isFormatDropdownOpen && (
                  <div className="format-dropdown">
                    <div className="format-group">
                      <div className="format-group-label">Audio</div>
                      {audioFormats.map(fmt => (
                        <button
                          key={fmt}
                          className={`format-option ${targetFormat === fmt ? 'selected' : ''}`}
                          onClick={() => { setTargetFormat(fmt); setIsFormatDropdownOpen(false); }}
                        >
                          {fmt.toUpperCase()}
                        </button>
                      ))}
                    </div>
                    <div className="format-group">
                      <div className="format-group-label">Video</div>
                      {videoFormats.map(fmt => (
                        <button
                          key={fmt}
                          className={`format-option ${targetFormat === fmt ? 'selected' : ''}`}
                          onClick={() => { setTargetFormat(fmt); setIsFormatDropdownOpen(false); }}
                        >
                          {fmt.toUpperCase()}
                        </button>
                      ))}
                    </div>
                    <div className="format-group">
                      <div className="format-group-label">Other</div>
                      <button
                        className={`format-option ${targetFormat === 'gif' ? 'selected' : ''}`}
                        onClick={() => { setTargetFormat('gif'); setIsFormatDropdownOpen(false); }}
                      >
                        GIF
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <button 
              className="primary-button"
              onClick={handleConvert}
              disabled={!selectedFile || isConverting}
            >
              {isConverting ? (
                <><RefreshCw className="spin" size={18} /> Converting...</>
              ) : (
                <><ArrowRight size={18} /> Convert</>
              )}
            </button>

            {isConverting && (
              <div className="progress-section">
                <div className="progress-bar"><div className="progress-fill" style={{ width: `${progress}%` }} /></div>
                <span className="progress-text">{progress}%</span>
              </div>
            )}

            {result && (
              <div className={`result-card ${result.success ? 'success' : 'error'}`}>
                {result.success ? (
                  <>
                    <Check size={20} />
                    <div className="result-info">
                      <strong>Conversion Complete</strong>
                      <span className="result-path">{result.output_path?.split(/[\\/]/).pop()}</span>
                    </div>
                    <button className="icon-btn-small" onClick={() => result.output_path && openFileLocation(result.output_path)}>
                      <FolderOpen size={16} />
                    </button>
                  </>
                ) : (
                  <>
                    <AlertCircle size={20} />
                    <div className="result-info">
                      <strong>Conversion Failed</strong>
                      <span className="error-msg">{result.error}</span>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* ============== MERGE TAB ============== */}
        {activeTab === 'merge' && (
          <div className="panel-content">
            <div className="panel-section">
              <div className="section-header">
                <label className="section-label">Files to Merge</label>
                <button className="add-button" onClick={addMergeFiles}>
                  <Plus size={14} /> Add Files
                </button>
              </div>
              
              {mergeFiles.length === 0 ? (
                <div className="empty-state" onClick={addMergeFiles}>
                  <Combine size={32} />
                  <p>Click to add files to merge</p>
                  <span className="hint">Files will be concatenated in order</span>
                </div>
              ) : (
                <div className="file-list">
                  {mergeFiles.map((file, index) => (
                    <div key={file.id} className="file-list-item">
                      <span className="file-order">{index + 1}</span>
                      <GripVertical size={14} className="drag-handle" />
                      <span className="file-list-name">{file.name}</span>
                      <button className="icon-btn-tiny" onClick={() => removeMergeFile(file.id)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button 
              className="primary-button"
              onClick={handleMerge}
              disabled={mergeFiles.length < 2 || isMerging}
            >
              {isMerging ? (
                <><RefreshCw className="spin" size={18} /> Merging...</>
              ) : (
                <><Combine size={18} /> Merge Files</>
              )}
            </button>

            {mergeResult && (
              <div className={`result-card ${mergeResult.success ? 'success' : 'error'}`}>
                {mergeResult.success ? (
                  <>
                    <Check size={20} />
                    <div className="result-info">
                      <strong>Merged {mergeResult.merged_count} Files</strong>
                      <span className="result-path">{mergeResult.output_path?.split(/[\\/]/).pop()}</span>
                    </div>
                    <button className="icon-btn-small" onClick={() => mergeResult.output_path && openFileLocation(mergeResult.output_path)}>
                      <FolderOpen size={16} />
                    </button>
                  </>
                ) : (
                  <>
                    <AlertCircle size={20} />
                    <div className="result-info">
                      <strong>Merge Failed</strong>
                      <span className="error-msg">{mergeResult.error}</span>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* ============== MUX TAB ============== */}
        {activeTab === 'mux' && (
          <div className="panel-content">
            <div className="panel-section">
              <div className="section-header">
                <label className="section-label"><Film size={14} /> Video Track</label>
              </div>
              {!muxVideoFile ? (
                <div className="mini-drop-zone" onClick={selectMuxVideo}>
                  <Plus size={16} /> Select Video
                </div>
              ) : (
                <div className="file-list-item">
                  <FileVideo size={16} />
                  <span className="file-list-name">{muxVideoFile.name}</span>
                  <button className="icon-btn-tiny" onClick={() => setMuxVideoFile(null)}>
                    <X size={14} />
                  </button>
                </div>
              )}
            </div>

            <div className="panel-section">
              <div className="section-header">
                <label className="section-label"><Music size={14} /> Audio Tracks</label>
                <button className="add-button-small" onClick={addMuxAudio}>
                  <Plus size={12} /> Add
                </button>
              </div>
              {muxAudioFiles.length === 0 ? (
                <div className="mini-drop-zone" onClick={addMuxAudio}>
                  <Plus size={16} /> Add Audio Tracks
                </div>
              ) : (
                <div className="file-list compact">
                  {muxAudioFiles.map((file, index) => (
                    <div key={file.id} className="file-list-item">
                      <span className="file-order">{index + 1}</span>
                      <FileAudio size={14} />
                      <span className="file-list-name">{file.name}</span>
                      <button className="icon-btn-tiny" onClick={() => setMuxAudioFiles(prev => prev.filter(f => f.id !== file.id))}>
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="panel-section">
              <div className="section-header">
                <label className="section-label"><Subtitles size={14} /> Subtitles</label>
                <button className="add-button-small" onClick={addMuxSubtitle}>
                  <Plus size={12} /> Add
                </button>
              </div>
              {muxSubtitleFiles.length === 0 ? (
                <div className="mini-drop-zone" onClick={addMuxSubtitle}>
                  <Plus size={16} /> Add Subtitles
                </div>
              ) : (
                <div className="file-list compact">
                  {muxSubtitleFiles.map((file, index) => (
                    <div key={file.id} className="file-list-item">
                      <span className="file-order">{index + 1}</span>
                      <Subtitles size={14} />
                      <span className="file-list-name">{file.name}</span>
                      <button className="icon-btn-tiny" onClick={() => setMuxSubtitleFiles(prev => prev.filter(f => f.id !== file.id))}>
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button 
              className="primary-button"
              onClick={handleMux}
              disabled={(!muxVideoFile && muxAudioFiles.length === 0) || isMuxing}
            >
              {isMuxing ? (
                <><RefreshCw className="spin" size={18} /> Muxing...</>
              ) : (
                <><Layers size={18} /> Mux Streams</>
              )}
            </button>

            {muxResult && (
              <div className={`result-card ${muxResult.success ? 'success' : 'error'}`}>
                {muxResult.success ? (
                  <>
                    <Check size={20} />
                    <div className="result-info">
                      <strong>Muxing Complete</strong>
                      <span className="result-path">{muxResult.output_path?.split(/[\\/]/).pop()}</span>
                    </div>
                    <button className="icon-btn-small" onClick={() => muxResult.output_path && openFileLocation(muxResult.output_path)}>
                      <FolderOpen size={16} />
                    </button>
                  </>
                ) : (
                  <>
                    <AlertCircle size={20} />
                    <div className="result-info">
                      <strong>Mux Failed</strong>
                      <span className="error-msg">{muxResult.error}</span>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* ============== EXTRACT AUDIO TAB ============== */}
        {activeTab === 'extract' && (
          <div className="panel-content">
            <div className="panel-section">
              {!extractFile ? (
                <div 
                  className="drop-zone"
                  onClick={() => selectFile(setExtractFile, setExtractFileName)}
                >
                  <FileVideo size={48} />
                  <p>Select a video file</p>
                  <span className="hint">Audio will be extracted from the video</span>
                </div>
              ) : (
                <div className="selected-file-card">
                  <div className="file-icon-large"><FileVideo size={32} /></div>
                  <div className="file-info-content">
                    <div className="file-name-large">{extractFileName}</div>
                  </div>
                  <button className="icon-btn-small" onClick={() => { setExtractFile(null); setExtractResult(null); }}>
                    <X size={16} />
                  </button>
                </div>
              )}
            </div>

            <div className="panel-section">
              <label className="section-label">Audio Format</label>
              <div className="button-group">
                {['mp3', 'm4a', 'wav', 'flac'].map(fmt => (
                  <button
                    key={fmt}
                    className={`option-button ${extractFormat === fmt ? 'active' : ''}`}
                    onClick={() => setExtractFormat(fmt)}
                  >
                    {fmt.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <button 
              className="primary-button"
              onClick={handleExtractAudio}
              disabled={!extractFile || isExtracting}
            >
              {isExtracting ? (
                <><RefreshCw className="spin" size={18} /> Extracting...</>
              ) : (
                <><Volume2 size={18} /> Extract Audio</>
              )}
            </button>

            {extractResult && (
              <div className={`result-card ${extractResult.success ? 'success' : 'error'}`}>
                {extractResult.success ? (
                  <>
                    <Check size={20} />
                    <div className="result-info">
                      <strong>Audio Extracted</strong>
                      <span className="result-path">{extractResult.output_path?.split(/[\\/]/).pop()}</span>
                    </div>
                    <button className="icon-btn-small" onClick={() => extractResult.output_path && openFileLocation(extractResult.output_path)}>
                      <FolderOpen size={16} />
                    </button>
                  </>
                ) : (
                  <>
                    <AlertCircle size={20} />
                    <div className="result-info">
                      <strong>Extraction Failed</strong>
                      <span className="error-msg">{extractResult.error}</span>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* ============== COMPRESS TAB ============== */}
        {activeTab === 'compress' && (
          <div className="panel-content">
            <div className="panel-section">
              {!compressFile ? (
                <div 
                  className="drop-zone"
                  onClick={() => selectFile(setCompressFile, setCompressFileName)}
                >
                  <FileVideo size={48} />
                  <p>Select a video file to compress</p>
                  <span className="hint">Reduce file size with minimal quality loss</span>
                </div>
              ) : (
                <div className="selected-file-card">
                  <div className="file-icon-large"><FileVideo size={32} /></div>
                  <div className="file-info-content">
                    <div className="file-name-large">{compressFileName}</div>
                  </div>
                  <button className="icon-btn-small" onClick={() => { setCompressFile(null); setCompressResult(null); }}>
                    <X size={16} />
                  </button>
                </div>
              )}
            </div>

            <div className="panel-section">
              <label className="section-label">Quality (CRF: {compressCrf})</label>
              <input
                type="range"
                min="18"
                max="40"
                value={compressCrf}
                onChange={(e) => setCompressCrf(Number(e.target.value))}
                className="slider"
              />
              <div className="slider-labels">
                <span>Higher Quality</span>
                <span>Smaller Size</span>
              </div>
            </div>

            <div className="panel-section">
              <label className="section-label">Encoding Speed</label>
              <div className="button-group">
                {['ultrafast', 'fast', 'medium', 'slow'].map(preset => (
                  <button
                    key={preset}
                    className={`option-button ${compressPreset === preset ? 'active' : ''}`}
                    onClick={() => setCompressPreset(preset)}
                  >
                    {preset.charAt(0).toUpperCase() + preset.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="panel-section">
              <label className="section-label">Resolution (optional)</label>
              <input
                type="text"
                className="text-input"
                placeholder="e.g., 1280:720 or -1:720"
                value={compressResolution}
                onChange={(e) => setCompressResolution(e.target.value)}
              />
            </div>

            <button 
              className="primary-button"
              onClick={handleCompress}
              disabled={!compressFile || isCompressing}
            >
              {isCompressing ? (
                <><RefreshCw className="spin" size={18} /> Compressing...</>
              ) : (
                <><Minimize2 size={18} /> Compress Video</>
              )}
            </button>

            {compressResult && (
              <div className={`result-card ${compressResult.success ? 'success' : 'error'}`}>
                {compressResult.success ? (
                  <>
                    <Check size={20} />
                    <div className="result-info">
                      <strong>Compression Complete</strong>
                      <span className="result-path">
                        {formatFileSize(compressResult.original_size)} → {formatFileSize(compressResult.compressed_size)} 
                        ({compressResult.compression_ratio}%)
                      </span>
                    </div>
                    <button className="icon-btn-small" onClick={() => compressResult.output_path && openFileLocation(compressResult.output_path)}>
                      <FolderOpen size={16} />
                    </button>
                  </>
                ) : (
                  <>
                    <AlertCircle size={20} />
                    <div className="result-info">
                      <strong>Compression Failed</strong>
                      <span className="error-msg">{compressResult.error}</span>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* ============== TRIM TAB ============== */}
        {activeTab === 'trim' && (
          <div className="panel-content">
            <div className="panel-section">
              {!trimFile ? (
                <div 
                  className="drop-zone"
                  onClick={() => selectFile(setTrimFile, setTrimFileName)}
                >
                  <Scissors size={48} />
                  <p>Select a video file to trim</p>
                  <span className="hint">Cut specific portions from the video</span>
                </div>
              ) : (
                <div className="selected-file-card">
                  <div className="file-icon-large"><FileVideo size={32} /></div>
                  <div className="file-info-content">
                    <div className="file-name-large">{trimFileName}</div>
                  </div>
                  <button className="icon-btn-small" onClick={() => { setTrimFile(null); setTrimResult(null); }}>
                    <X size={16} />
                  </button>
                </div>
              )}
            </div>

            <div className="time-inputs">
              <div className="time-input-group">
                <label className="section-label">Start Time</label>
                <input
                  type="text"
                  className="text-input time-input"
                  placeholder="00:00:00"
                  value={trimStart}
                  onChange={(e) => setTrimStart(e.target.value)}
                />
              </div>
              <div className="time-input-group">
                <label className="section-label">End Time</label>
                <input
                  type="text"
                  className="text-input time-input"
                  placeholder="00:00:10"
                  value={trimEnd}
                  onChange={(e) => setTrimEnd(e.target.value)}
                />
              </div>
            </div>

            <button 
              className="primary-button"
              onClick={handleTrim}
              disabled={!trimFile || isTrimming}
            >
              {isTrimming ? (
                <><RefreshCw className="spin" size={18} /> Trimming...</>
              ) : (
                <><Scissors size={18} /> Trim Video</>
              )}
            </button>

            {trimResult && (
              <div className={`result-card ${trimResult.success ? 'success' : 'error'}`}>
                {trimResult.success ? (
                  <>
                    <Check size={20} />
                    <div className="result-info">
                      <strong>Trim Complete</strong>
                      <span className="result-path">{trimResult.output_path?.split(/[\\/]/).pop()}</span>
                    </div>
                    <button className="icon-btn-small" onClick={() => trimResult.output_path && openFileLocation(trimResult.output_path)}>
                      <FolderOpen size={16} />
                    </button>
                  </>
                ) : (
                  <>
                    <AlertCircle size={20} />
                    <div className="result-info">
                      <strong>Trim Failed</strong>
                      <span className="error-msg">{trimResult.error}</span>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
