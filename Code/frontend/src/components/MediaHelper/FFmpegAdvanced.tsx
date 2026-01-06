import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowLeft, Terminal, Play, Search, Copy, Check, AlertCircle,
  Settings, FileVideo, FileAudio, Upload, History, Sparkles,
  RefreshCw, Code2, BookOpen, Zap, FolderOpen
} from 'lucide-react';
import { invoke } from '@tauri-apps/api/tauri';
import { open, save } from '@tauri-apps/api/dialog';
import './MediaHelper.css';

interface FFmpegAdvancedProps {
  onBack: () => void;
}

interface CommandResult {
  success: boolean;
  output?: string;
  error?: string;
  duration?: number;
}

interface PresetCommand {
  name: string;
  description: string;
  command: string;
  category: string;
}

type TabType = 'gui' | 'terminal' | 'presets';

const PRESET_COMMANDS: PresetCommand[] = [
  // Conversion
  { name: 'Convert to MP4 (H.264)', description: 'Convert any video to MP4 with H.264 codec', command: 'ffmpeg -i {input} -c:v libx264 -c:a aac {output}.mp4', category: 'Conversion' },
  { name: 'Convert to WebM (VP9)', description: 'Convert to WebM with VP9 codec for web', command: 'ffmpeg -i {input} -c:v libvpx-vp9 -c:a libopus {output}.webm', category: 'Conversion' },
  { name: 'Video to GIF', description: 'Convert video clip to animated GIF', command: 'ffmpeg -i {input} -vf "fps=10,scale=320:-1:flags=lanczos" {output}.gif', category: 'Conversion' },
  { name: 'Extract Audio MP3', description: 'Extract audio as MP3 from video', command: 'ffmpeg -i {input} -vn -acodec libmp3lame -q:a 2 {output}.mp3', category: 'Conversion' },
  { name: 'Extract Audio FLAC', description: 'Extract audio as lossless FLAC', command: 'ffmpeg -i {input} -vn -acodec flac {output}.flac', category: 'Conversion' },
  
  // Compression
  { name: 'Compress Video (CRF 23)', description: 'Compress video with good quality/size balance', command: 'ffmpeg -i {input} -c:v libx264 -crf 23 -c:a copy {output}.mp4', category: 'Compression' },
  { name: 'Compress Video (CRF 28)', description: 'Higher compression, smaller file', command: 'ffmpeg -i {input} -c:v libx264 -crf 28 -c:a copy {output}.mp4', category: 'Compression' },
  { name: 'Two-Pass Encode', description: 'Best quality compression for target size', command: 'ffmpeg -i {input} -c:v libx264 -b:v 1M -pass 1 -f null NUL && ffmpeg -i {input} -c:v libx264 -b:v 1M -pass 2 {output}.mp4', category: 'Compression' },
  
  // Editing
  { name: 'Trim Video', description: 'Cut video from start to end time', command: 'ffmpeg -i {input} -ss 00:00:00 -to 00:00:30 -c copy {output}.mp4', category: 'Editing' },
  { name: 'Remove Audio', description: 'Create video without audio track', command: 'ffmpeg -i {input} -an -c:v copy {output}.mp4', category: 'Editing' },
  { name: 'Remove Video', description: 'Keep only audio from video', command: 'ffmpeg -i {input} -vn -c:a copy {output}.m4a', category: 'Editing' },
  { name: 'Rotate 90° CW', description: 'Rotate video 90 degrees clockwise', command: 'ffmpeg -i {input} -vf "transpose=1" {output}.mp4', category: 'Editing' },
  { name: 'Flip Horizontal', description: 'Mirror video horizontally', command: 'ffmpeg -i {input} -vf "hflip" {output}.mp4', category: 'Editing' },
  { name: 'Scale to 1080p', description: 'Resize video to 1920x1080', command: 'ffmpeg -i {input} -vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2" {output}.mp4', category: 'Editing' },
  { name: 'Change Speed 2x', description: 'Make video play 2x faster', command: 'ffmpeg -i {input} -filter:v "setpts=0.5*PTS" -filter:a "atempo=2.0" {output}.mp4', category: 'Editing' },
  
  // Audio Processing
  { name: 'Normalize Audio', description: 'Normalize audio volume levels', command: 'ffmpeg -i {input} -af "loudnorm=I=-16:TP=-1.5:LRA=11" {output}.mp3', category: 'Audio' },
  { name: 'Increase Volume', description: 'Boost audio volume by 150%', command: 'ffmpeg -i {input} -af "volume=1.5" {output}.mp3', category: 'Audio' },
  { name: 'High-Pass Filter', description: 'Remove low frequency noise', command: 'ffmpeg -i {input} -af "highpass=f=200" {output}.mp3', category: 'Audio' },
  { name: 'Noise Reduction', description: 'Apply noise reduction filter', command: 'ffmpeg -i {input} -af "anlmdn=s=7:p=0.002:r=0.002" {output}.mp3', category: 'Audio' },
  { name: 'Change Sample Rate', description: 'Resample to 44.1kHz', command: 'ffmpeg -i {input} -ar 44100 {output}.mp3', category: 'Audio' },
  
  // Subtitles
  { name: 'Burn Subtitles', description: 'Hardcode subtitles into video', command: 'ffmpeg -i {input} -vf "subtitles={subtitle}" {output}.mp4', category: 'Subtitles' },
  { name: 'Extract Subtitles', description: 'Extract embedded subtitles to SRT', command: 'ffmpeg -i {input} -map 0:s:0 {output}.srt', category: 'Subtitles' },
  { name: 'Add Subtitle Track', description: 'Add external SRT as subtitle stream', command: 'ffmpeg -i {input} -i {subtitle} -c copy -c:s mov_text {output}.mp4', category: 'Subtitles' },
  
  // Advanced
  { name: 'Screenshot at Time', description: 'Extract frame as image at timestamp', command: 'ffmpeg -i {input} -ss 00:00:05 -frames:v 1 {output}.png', category: 'Advanced' },
  { name: 'Create Thumbnail Grid', description: 'Create contact sheet of video', command: 'ffmpeg -i {input} -vf "select=not(mod(n\\,100)),scale=160:-1,tile=4x4" -frames:v 1 {output}.png', category: 'Advanced' },
  { name: 'Concat Videos', description: 'Join multiple videos end to end', command: 'ffmpeg -f concat -safe 0 -i filelist.txt -c copy {output}.mp4', category: 'Advanced' },
  { name: 'Add Watermark', description: 'Overlay image watermark on video', command: 'ffmpeg -i {input} -i watermark.png -filter_complex "overlay=W-w-10:H-h-10" {output}.mp4', category: 'Advanced' },
  { name: 'Get Media Info', description: 'Show detailed media information', command: 'ffprobe -v quiet -print_format json -show_format -show_streams {input}', category: 'Advanced' },
];

export const FFmpegAdvanced: React.FC<FFmpegAdvancedProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<TabType>('gui');
  const [command, setCommand] = useState<string>('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<CommandResult | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [copied, setCopied] = useState(false);
  
  // GUI Builder state
  const [inputFile, setInputFile] = useState<string>('');
  const [outputFile, setOutputFile] = useState<string>('');
  const [videoCodec, setVideoCodec] = useState<string>('copy');
  const [audioCodec, setAudioCodec] = useState<string>('copy');
  const [videoBitrate, setVideoBitrate] = useState<string>('');
  const [audioBitrate, setAudioBitrate] = useState<string>('');
  const [resolution, setResolution] = useState<string>('');
  const [fps, setFps] = useState<string>('');
  const [crf, setCrf] = useState<string>('23');
  const [startTime, setStartTime] = useState<string>('');
  const [endTime, setEndTime] = useState<string>('');
  const [customFilters, setCustomFilters] = useState<string>('');
  const [extraArgs, setExtraArgs] = useState<string>('');
  
  // AI Assistant
  const [aiPrompt, setAiPrompt] = useState<string>('');
  const [isAiGenerating, setIsAiGenerating] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Load command history from localStorage
    const saved = localStorage.getItem('ffmpeg_history');
    if (saved) {
      setCommandHistory(JSON.parse(saved));
    }
  }, []);

  const saveHistory = (newCommand: string) => {
    const updated = [newCommand, ...commandHistory.filter(c => c !== newCommand)].slice(0, 50);
    setCommandHistory(updated);
    localStorage.setItem('ffmpeg_history', JSON.stringify(updated));
  };

  const buildCommand = (): string => {
    if (!inputFile) return '';

    let parts = ['ffmpeg'];
    
    // Input
    if (startTime) parts.push(`-ss ${startTime}`);
    parts.push(`-i "${inputFile}"`);
    if (endTime) parts.push(`-to ${endTime}`);
    
    // Video codec
    if (videoCodec === 'none') {
      parts.push('-vn');
    } else if (videoCodec !== 'copy') {
      parts.push(`-c:v ${videoCodec}`);
      if (crf && ['libx264', 'libx265', 'libvpx-vp9'].includes(videoCodec)) {
        parts.push(`-crf ${crf}`);
      }
      if (videoBitrate) parts.push(`-b:v ${videoBitrate}`);
      if (resolution) parts.push(`-s ${resolution}`);
      if (fps) parts.push(`-r ${fps}`);
    } else {
      parts.push('-c:v copy');
    }
    
    // Audio codec
    if (audioCodec === 'none') {
      parts.push('-an');
    } else if (audioCodec !== 'copy') {
      parts.push(`-c:a ${audioCodec}`);
      if (audioBitrate) parts.push(`-b:a ${audioBitrate}`);
    } else {
      parts.push('-c:a copy');
    }
    
    // Filters
    if (customFilters) parts.push(`-vf "${customFilters}"`);
    
    // Extra args
    if (extraArgs) parts.push(extraArgs);
    
    // Output
    parts.push(`"${outputFile || 'output.mp4'}"`);
    
    return parts.join(' ');
  };

  const selectInputFile = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: 'Media Files', extensions: ['mp4', 'mkv', 'avi', 'mov', 'webm', 'mp3', 'wav', 'flac', 'm4a', 'ogg', 'aac', 'wma', 'wmv', 'ts', 'm2ts'] }]
      });
      if (selected && typeof selected === 'string') {
        setInputFile(selected);
        // Smart auto-generate output filename based on video/audio codec selection
        const baseName = selected.replace(/\.[^.]+$/, '');
        const inputExt = selected.split('.').pop()?.toLowerCase() || '';
        
        // Determine output extension based on codecs
        let outExt = 'mp4';
        if (videoCodec === 'none' || audioCodec === 'libmp3lame') {
          outExt = 'mp3';
        } else if (videoCodec === 'libvpx-vp9') {
          outExt = 'webm';
        } else if (audioCodec === 'flac') {
          outExt = 'flac';
        } else if (['mp3', 'wav', 'flac', 'm4a', 'ogg', 'aac'].includes(inputExt) && videoCodec === 'none') {
          outExt = inputExt;
        }
        
        setOutputFile(`${baseName}_output.${outExt}`);
      }
    } catch (err) {
      console.error('Failed to select file:', err);
    }
  };

  const selectOutputFile = async () => {
    try {
      // Determine default extension based on current settings
      let defaultExt = 'mp4';
      if (videoCodec === 'none') {
        defaultExt = audioCodec === 'libmp3lame' ? 'mp3' : 'm4a';
      } else if (videoCodec === 'libvpx-vp9') {
        defaultExt = 'webm';
      }
      
      const selected = await save({
        defaultPath: outputFile || `output.${defaultExt}`,
        filters: [
          { name: 'Video', extensions: ['mp4', 'mkv', 'avi', 'webm', 'mov'] },
          { name: 'Audio', extensions: ['mp3', 'wav', 'flac', 'm4a', 'ogg'] },
          { name: 'All', extensions: ['*'] }
        ]
      });
      if (selected) {
        setOutputFile(selected);
      }
    } catch (err) {
      console.error('Failed to select output:', err);
    }
  };

  const selectOutputDirectory = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false
      });
      if (selected && typeof selected === 'string') {
        // Generate filename based on input
        const inputBaseName = inputFile ? inputFile.split(/[\\/]/).pop()?.replace(/\.[^.]+$/, '') || 'output' : 'output';
        let ext = 'mp4';
        if (videoCodec === 'none') ext = audioCodec === 'libmp3lame' ? 'mp3' : 'm4a';
        else if (videoCodec === 'libvpx-vp9') ext = 'webm';
        
        setOutputFile(`${selected}/${inputBaseName}_output.${ext}`);
      }
    } catch (err) {
      console.error('Failed to select directory:', err);
    }
  };

  const runCommand = async () => {
    const cmdToRun = activeTab === 'gui' ? buildCommand() : command;
    if (!cmdToRun.trim()) return;

    setIsRunning(true);
    setResult(null);
    saveHistory(cmdToRun);

    try {
      const startTime = Date.now();
      const result = await invoke<CommandResult>('run_ffmpeg_command', { command: cmdToRun });
      result.duration = Date.now() - startTime;
      setResult(result);
    } catch (err) {
      setResult({ success: false, error: String(err) });
    } finally {
      setIsRunning(false);
    }
  };

  const usePreset = (preset: PresetCommand) => {
    setCommand(preset.command);
    setActiveTab('terminal');
  };

  const copyCommand = async () => {
    const cmdToCopy = activeTab === 'gui' ? buildCommand() : command;
    await navigator.clipboard.writeText(cmdToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      runCommand();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (historyIndex < commandHistory.length - 1) {
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        setCommand(commandHistory[newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setCommand(commandHistory[newIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setCommand('');
      }
    }
  };

  const generateWithAI = async () => {
    if (!aiPrompt.trim()) return;
    setIsAiGenerating(true);

    try {
      const result = await invoke<string>('generate_ffmpeg_command', { prompt: aiPrompt });
      setCommand(result);
      setActiveTab('terminal');
    } catch (err) {
      console.error('AI generation failed:', err);
    } finally {
      setIsAiGenerating(false);
    }
  };

  const categories = ['All', ...Array.from(new Set(PRESET_COMMANDS.map(p => p.category)))];
  
  const filteredPresets = PRESET_COMMANDS.filter(preset => {
    const matchesCategory = selectedCategory === 'All' || preset.category === selectedCategory;
    const matchesSearch = !searchQuery || 
      preset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      preset.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      preset.command.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const tabs = [
    { id: 'gui' as TabType, label: 'GUI Builder', icon: <Settings size={16} /> },
    { id: 'terminal' as TabType, label: 'Smart Terminal', icon: <Terminal size={16} /> },
    { id: 'presets' as TabType, label: 'Presets', icon: <BookOpen size={16} /> },
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
            <Terminal size={24} style={{ color: '#10b981' }} />
            FFmpeg Advanced
          </h2>
          <p>Full control over FFmpeg with GUI builder and smart terminal</p>
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
        {/* GUI Builder Tab */}
        {activeTab === 'gui' && (
          <>
            {/* Input/Output Section */}
            <div className="section">
              <div className="section-title">
                <FileVideo size={18} />
                Input / Output
              </div>
              
              <div className="form-group">
                <label className="form-label">Input File</label>
                <div className="input-with-button">
                  <input
                    type="text"
                    className="form-input"
                    value={inputFile}
                    onChange={(e) => setInputFile(e.target.value)}
                    placeholder="Select or enter input file path"
                  />
                  <button className="btn btn-secondary" onClick={selectInputFile}>
                    <Upload size={16} />
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Output File</label>
                <div className="input-with-button">
                  <input
                    type="text"
                    className="form-input"
                    value={outputFile}
                    onChange={(e) => setOutputFile(e.target.value)}
                    placeholder="Select or enter output file path"
                  />
                  <button className="btn btn-secondary" onClick={selectOutputFile} title="Save as file">
                    <FolderOpen size={16} />
                  </button>
                  <button className="btn btn-secondary" onClick={selectOutputDirectory} title="Select output directory">
                    📁
                  </button>
                </div>
              </div>
            </div>

            {/* Video Settings */}
            <div className="section">
              <div className="section-title">
                <FileVideo size={18} />
                Video Settings
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Video Codec</label>
                  <select className="form-select" value={videoCodec} onChange={(e) => setVideoCodec(e.target.value)}>
                    <option value="copy">Copy (No re-encode)</option>
                    <option value="libx264">H.264 (libx264)</option>
                    <option value="libx265">H.265/HEVC (libx265)</option>
                    <option value="libvpx-vp9">VP9 (libvpx-vp9)</option>
                    <option value="libsvtav1">AV1 (libsvtav1)</option>
                    <option value="none">No Video (-vn)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">CRF (Quality)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={crf}
                    onChange={(e) => setCrf(e.target.value)}
                    placeholder="18-28"
                    min="0"
                    max="51"
                    disabled={['copy', 'none'].includes(videoCodec)}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Resolution</label>
                  <select className="form-select" value={resolution} onChange={(e) => setResolution(e.target.value)}>
                    <option value="">Original</option>
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
                    <option value="">Original</option>
                    <option value="60">60 FPS</option>
                    <option value="30">30 FPS</option>
                    <option value="24">24 FPS</option>
                    <option value="15">15 FPS</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Video Bitrate</label>
                <input
                  type="text"
                  className="form-input"
                  value={videoBitrate}
                  onChange={(e) => setVideoBitrate(e.target.value)}
                  placeholder="e.g., 2M, 5000k"
                  disabled={['copy', 'none'].includes(videoCodec)}
                />
              </div>
            </div>

            {/* Audio Settings */}
            <div className="section">
              <div className="section-title">
                <FileAudio size={18} />
                Audio Settings
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Audio Codec</label>
                  <select className="form-select" value={audioCodec} onChange={(e) => setAudioCodec(e.target.value)}>
                    <option value="copy">Copy (No re-encode)</option>
                    <option value="aac">AAC</option>
                    <option value="libmp3lame">MP3 (libmp3lame)</option>
                    <option value="libvorbis">Vorbis</option>
                    <option value="libopus">Opus</option>
                    <option value="flac">FLAC</option>
                    <option value="none">No Audio (-an)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Audio Bitrate</label>
                  <input
                    type="text"
                    className="form-input"
                    value={audioBitrate}
                    onChange={(e) => setAudioBitrate(e.target.value)}
                    placeholder="e.g., 192k, 320k"
                    disabled={['copy', 'none'].includes(audioCodec)}
                  />
                </div>
              </div>
            </div>

            {/* Timing */}
            <div className="section">
              <div className="section-title">
                <Zap size={18} />
                Timing (Optional)
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Start Time</label>
                  <input
                    type="text"
                    className="form-input"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    placeholder="HH:MM:SS or seconds"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">End Time / Duration</label>
                  <input
                    type="text"
                    className="form-input"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    placeholder="HH:MM:SS or seconds"
                  />
                </div>
              </div>
            </div>

            {/* Advanced Options */}
            <div className="section">
              <div className="section-title">
                <Code2 size={18} />
                Advanced Options
              </div>

              <div className="form-group">
                <label className="form-label">Video Filters (-vf)</label>
                <input
                  type="text"
                  className="form-input"
                  value={customFilters}
                  onChange={(e) => setCustomFilters(e.target.value)}
                  placeholder="e.g., scale=1280:-1,transpose=1"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Extra Arguments</label>
                <input
                  type="text"
                  className="form-input"
                  value={extraArgs}
                  onChange={(e) => setExtraArgs(e.target.value)}
                  placeholder="Additional FFmpeg arguments"
                />
              </div>
            </div>

            {/* Generated Command Preview */}
            <div className="section">
              <div className="section-title">
                <Terminal size={18} />
                Generated Command
              </div>
              <div className="command-preview">
                <code>{buildCommand() || 'Select an input file to generate command'}</code>
                {buildCommand() && (
                  <button className="btn btn-icon btn-secondary" onClick={copyCommand}>
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                )}
              </div>
            </div>

            <button 
              className="btn btn-primary" 
              style={{ width: '100%' }}
              onClick={runCommand}
              disabled={!inputFile || isRunning}
            >
              {isRunning ? (
                <><RefreshCw className="spin" size={18} /> Running...</>
              ) : (
                <><Play size={18} /> Run Command</>
              )}
            </button>
          </>
        )}

        {/* Terminal Tab */}
        {activeTab === 'terminal' && (
          <>
            {/* AI Assistant */}
            <div className="section">
              <div className="section-title">
                <Sparkles size={18} />
                AI Command Generator
              </div>
              
              <div className="input-with-button">
                <input
                  type="text"
                  className="form-input"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="Describe what you want to do, e.g., 'convert mp4 to gif with 10fps'"
                  onKeyDown={(e) => e.key === 'Enter' && generateWithAI()}
                />
                <button 
                  className="btn btn-secondary" 
                  onClick={generateWithAI}
                  disabled={isAiGenerating}
                >
                  {isAiGenerating ? <RefreshCw className="spin" size={16} /> : <Sparkles size={16} />}
                </button>
              </div>
            </div>

            {/* Command Input */}
            <div className="section">
              <div className="section-title">
                <Terminal size={18} />
                Command
              </div>
              
              <div className="terminal-input-area">
                <span className="terminal-prompt">$</span>
                <input
                  ref={inputRef}
                  type="text"
                  className="terminal-input"
                  value={command}
                  onChange={(e) => setCommand(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Enter FFmpeg command..."
                  autoFocus
                />
              </div>

              <div className="terminal-actions">
                <button className="btn btn-secondary" onClick={copyCommand} disabled={!command}>
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  Copy
                </button>
                <button 
                  className="btn btn-primary" 
                  onClick={runCommand}
                  disabled={!command.trim() || isRunning}
                >
                  {isRunning ? (
                    <><RefreshCw className="spin" size={16} /> Running...</>
                  ) : (
                    <><Play size={16} /> Run</>
                  )}
                </button>
              </div>
            </div>

            {/* Output */}
            {result && (
              <div className="section">
                <div className="section-title">
                  {result.success ? <Check size={18} /> : <AlertCircle size={18} />}
                  Output {result.duration && <span className="hint">({(result.duration / 1000).toFixed(1)}s)</span>}
                </div>
                <div className={`terminal-output ${result.success ? 'success' : 'error'}`}>
                  <pre>{result.success ? result.output : result.error}</pre>
                </div>
              </div>
            )}

            {/* History */}
            {commandHistory.length > 0 && (
              <div className="section">
                <div className="section-title">
                  <History size={18} />
                  Recent Commands
                </div>
                <div className="command-history">
                  {commandHistory.slice(0, 10).map((cmd, index) => (
                    <div 
                      key={index} 
                      className="history-item"
                      onClick={() => setCommand(cmd)}
                    >
                      <code>{cmd}</code>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Presets Tab */}
        {activeTab === 'presets' && (
          <>
            {/* Search */}
            <div className="section">
              <div className="search-bar">
                <Search size={18} />
                <input
                  type="text"
                  className="search-input"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search presets..."
                />
              </div>
            </div>

            {/* Categories */}
            <div className="category-pills">
              {categories.map(cat => (
                <button
                  key={cat}
                  className={`category-pill ${selectedCategory === cat ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Presets List */}
            <div className="presets-grid">
              {filteredPresets.map((preset, index) => (
                <div key={index} className="preset-card" onClick={() => usePreset(preset)}>
                  <div className="preset-header">
                    <span className="preset-name">{preset.name}</span>
                    <span className="preset-category">{preset.category}</span>
                  </div>
                  <p className="preset-description">{preset.description}</p>
                  <code className="preset-command">{preset.command}</code>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default FFmpegAdvanced;
