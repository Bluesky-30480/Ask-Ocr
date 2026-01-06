import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { open } from '@tauri-apps/api/dialog';
import { 
  Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Repeat1,
  Volume2, VolumeX, Volume1, Music, Plus, Heart, List, Library, 
  Search, MoreHorizontal, Download, Disc3, Clock, Trash2, X,
  Link, Youtube, FileAudio, Loader2, ExternalLink
} from 'lucide-react';
import './MusicPlayer.css';

interface Song {
  id: number;
  title: string;
  artist?: string;
  album?: string;
  duration: number;
  filePath: string;
  originalPath?: string;
  isLiked: boolean;
  addedAt: number;
}

interface Playlist {
  id: number;
  name: string;
  createdAt: number;
}

interface DownloadProgress {
  status: 'idle' | 'searching' | 'downloading' | 'extracting' | 'success' | 'error';
  message: string;
  progress?: number;
}

type ViewType = 'library' | 'liked' | 'playlist';
type RepeatMode = 'off' | 'all' | 'one';
type DownloadTab = 'spotify' | 'youtube' | 'url';

export const MusicPlayer: React.FC = () => {
  // Data State
  const [allSongs, setAllSongs] = useState<Song[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [playlistSongs, setPlaylistSongs] = useState<Song[]>([]);
  const [currentView, setCurrentView] = useState<ViewType>('library');
  const [activePlaylistId, setActivePlaylistId] = useState<number | null>(null);
  
  // Player State
  const [queue, setQueue] = useState<Song[]>([]);
  const [currentSongIndex, setCurrentSongIndex] = useState<number>(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [prevVolume, setPrevVolume] = useState(0.7);
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('off');
  
  // UI State
  const [albumArt, setAlbumArt] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDraggingProgress, setIsDraggingProgress] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [contextMenu, setContextMenu] = useState<{songId: number; x: number; y: number} | null>(null);
  
  // Download Modal State
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [downloadTab, setDownloadTab] = useState<DownloadTab>('spotify');
  const [downloadUrl, setDownloadUrl] = useState('');
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress>({ status: 'idle', message: '' });

  const progressRef = useRef<HTMLDivElement>(null);

  // Current song derived state
  const currentSong = useMemo(() => queue[currentSongIndex], [queue, currentSongIndex]);

  // Load initial data
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await Promise.all([loadLibrary(), loadPlaylists()]);
      setIsLoading(false);
    };
    init();
  }, []);

  const loadLibrary = async () => {
    try {
      const songs = await invoke<Song[]>('get_all_songs');
      setAllSongs(songs);
    } catch (e) {
      console.error("Failed to load library:", e);
    }
  };

  const loadPlaylists = async () => {
    try {
      const lists = await invoke<Playlist[]>('get_playlists');
      setPlaylists(lists);
    } catch (e) {
      console.error("Failed to load playlists:", e);
    }
  };

  const loadPlaylistSongs = async (id: number) => {
    try {
      const songs = await invoke<Song[]>('get_playlist_songs', { playlistId: id });
      setPlaylistSongs(songs);
    } catch (e) {
      console.error("Failed to load playlist songs:", e);
    }
  };

  useEffect(() => {
    if (currentView === 'playlist' && activePlaylistId) {
      loadPlaylistSongs(activePlaylistId);
    }
  }, [currentView, activePlaylistId]);

  // Close context menu on outside click
  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    if (contextMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [contextMenu]);

  const handleImport = async () => {
    try {
      const selected = await open({
        multiple: true,
        filters: [{ name: 'Audio', extensions: ['mp3', 'wav', 'flac', 'ogg', 'm4a', 'aac'] }]
      });

      if (selected) {
        const paths = Array.isArray(selected) ? selected : [selected];
        await invoke('import_songs', { filePaths: paths });
        await loadLibrary();
      }
    } catch (e) {
      console.error("Failed to import songs:", e);
    }
  };

  const handleDownloadSubmit = async () => {
    if (!downloadUrl.trim()) return;
    
    const url = downloadUrl.trim();
    setDownloadProgress({ status: 'downloading', message: 'Starting download...' });
    
    try {
      if (downloadTab === 'spotify') {
        // Spotify URL download
        setDownloadProgress({ status: 'downloading', message: 'Downloading from Spotify...' });
        await invoke('download_spotify', { url });
      } else if (downloadTab === 'youtube') {
        // YouTube URL - extract audio
        setDownloadProgress({ status: 'extracting', message: 'Extracting audio from video...' });
        await invoke('download_youtube_audio', { url });
      } else {
        // Generic URL - try to extract audio
        setDownloadProgress({ status: 'extracting', message: 'Processing URL...' });
        await invoke('download_from_url', { url });
      }
      
      setDownloadProgress({ status: 'success', message: 'Download complete!' });
      await loadLibrary();
      
      // Reset after success
      setTimeout(() => {
        setDownloadUrl('');
        setDownloadProgress({ status: 'idle', message: '' });
      }, 2000);
    } catch (e) {
      console.error("Download failed:", e);
      setDownloadProgress({ status: 'error', message: String(e) });
    }
  };

  const getUrlPlaceholder = () => {
    switch (downloadTab) {
      case 'spotify': return 'https://open.spotify.com/track/... or playlist link';
      case 'youtube': return 'https://youtube.com/watch?v=... or youtu.be/...';
      case 'url': return 'Any video/audio URL to extract audio from';
    }
  };

  const handleCreatePlaylist = async () => {
    const name = prompt("Enter playlist name:");
    if (name?.trim()) {
      try {
        await invoke('create_playlist', { name: name.trim() });
        loadPlaylists();
      } catch (e) {
        console.error("Failed to create playlist:", e);
      }
    }
  };

  const handleDeletePlaylist = async (playlistId: number) => {
    if (confirm("Delete this playlist?")) {
      try {
        await invoke('delete_playlist', { playlistId });
        if (activePlaylistId === playlistId) {
          setCurrentView('library');
          setActivePlaylistId(null);
        }
        loadPlaylists();
      } catch (e) {
        console.error("Failed to delete playlist:", e);
      }
    }
  };

  const playSong = useCallback(async (song: Song, index: number, newQueue: Song[]) => {
    try {
      await invoke('play_audio', { path: song.filePath });
      setQueue(newQueue);
      setCurrentSongIndex(index);
      setDuration(song.duration);
      setCurrentTime(0);
      setIsPlaying(true);
      
      try {
        const art = await invoke<string | null>('get_album_art', { filePath: song.filePath });
        setAlbumArt(art);
      } catch {
        setAlbumArt(null);
      }
    } catch (e) {
      console.error("Playback failed:", e);
    }
  }, []);

  const handlePlayFromList = useCallback((index: number, list: Song[]) => {
    if (list[index]) {
      playSong(list[index], index, list);
    }
  }, [playSong]);

  const togglePlay = async () => {
    if (currentSongIndex === -1 && allSongs.length > 0) {
      handlePlayFromList(0, allSongs);
      return;
    }
    
    try {
      if (isPlaying) {
        await invoke('pause_audio');
      } else {
        await invoke('resume_audio');
      }
      setIsPlaying(!isPlaying);
    } catch (e) {
      console.error("Toggle play failed:", e);
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current || duration === 0) return;
    const rect = progressRef.current.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const newTime = percent * duration;
    setCurrentTime(newTime);
    invoke('seek_audio', { time: newTime }).catch(console.error);
  };

  const handleLike = async (song: Song) => {
    if (!song) return;
    try {
      const newStatus = await invoke<boolean>('toggle_like_song', { songId: song.id });
      const updateSong = (s: Song) => s.id === song.id ? { ...s, isLiked: newStatus } : s;
      
      setAllSongs(prev => prev.map(updateSong));
      setPlaylistSongs(prev => prev.map(updateSong));
      setQueue(prev => prev.map(updateSong));
    } catch (e) {
      console.error("Failed to toggle like:", e);
    }
  };

  const handleNext = useCallback(() => {
    if (queue.length === 0) return;
    
    if (repeatMode === 'one') {
      setCurrentTime(0);
      invoke('seek_audio', { time: 0 }).catch(console.error);
      return;
    }
    
    let nextIndex;
    if (isShuffle) {
      nextIndex = Math.floor(Math.random() * queue.length);
    } else {
      nextIndex = currentSongIndex + 1;
      if (nextIndex >= queue.length) {
        if (repeatMode === 'all') {
          nextIndex = 0;
        } else {
          setIsPlaying(false);
          return;
        }
      }
    }
    playSong(queue[nextIndex], nextIndex, queue);
  }, [queue, isShuffle, currentSongIndex, playSong, repeatMode]);

  const handlePrev = useCallback(() => {
    if (queue.length === 0) return;
    
    // If more than 3 seconds in, restart current song
    if (currentTime > 3) {
      setCurrentTime(0);
      invoke('seek_audio', { time: 0 }).catch(console.error);
      return;
    }
    
    let prevIndex;
    if (isShuffle) {
      prevIndex = Math.floor(Math.random() * queue.length);
    } else {
      prevIndex = (currentSongIndex - 1 + queue.length) % queue.length;
    }
    playSong(queue[prevIndex], prevIndex, queue);
  }, [queue, isShuffle, currentSongIndex, playSong, currentTime]);

  const cycleRepeat = () => {
    setRepeatMode(prev => {
      if (prev === 'off') return 'all';
      if (prev === 'all') return 'one';
      return 'off';
    });
  };

  const toggleMute = () => {
    if (volume > 0) {
      setPrevVolume(volume);
      setVolume(0);
      invoke('set_volume', { volume: 0 }).catch(console.error);
    } else {
      setVolume(prevVolume);
      invoke('set_volume', { volume: prevVolume }).catch(console.error);
    }
  };

  // Progress Timer
  useEffect(() => {
    let interval: number;
    if (isPlaying && !isDraggingProgress) {
      interval = window.setInterval(() => {
        setCurrentTime(prev => {
          if (prev >= duration - 0.5) {
            handleNext();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, duration, handleNext, isDraggingProgress]);

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAddToPlaylist = async (playlistId: number, songId: number) => {
    try {
      await invoke('add_song_to_playlist', { playlistId, songId });
      setContextMenu(null);
      if (currentView === 'playlist' && activePlaylistId === playlistId) {
        loadPlaylistSongs(playlistId);
      }
    } catch (e) {
      console.error("Failed to add to playlist:", e);
    }
  };

  const handleRemoveFromPlaylist = async (songId: number) => {
    if (!activePlaylistId) return;
    try {
      await invoke('remove_song_from_playlist', { playlistId: activePlaylistId, songId });
      loadPlaylistSongs(activePlaylistId);
      setContextMenu(null);
    } catch (e) {
      console.error("Failed to remove from playlist:", e);
    }
  };

  const filteredSongs = useMemo(() => {
    let songs: Song[] = [];
    if (currentView === 'library') songs = allSongs;
    else if (currentView === 'liked') songs = allSongs.filter(s => s.isLiked);
    else if (currentView === 'playlist') songs = playlistSongs;
    
    if (!searchQuery.trim()) return songs;
    
    const query = searchQuery.toLowerCase();
    return songs.filter(s => 
      s.title.toLowerCase().includes(query) ||
      s.artist?.toLowerCase().includes(query) ||
      s.album?.toLowerCase().includes(query)
    );
  }, [currentView, allSongs, playlistSongs, searchQuery]);

  const getViewTitle = () => {
    if (currentView === 'library') return 'Your Library';
    if (currentView === 'liked') return 'Liked Songs';
    return playlists.find(p => p.id === activePlaylistId)?.name || 'Playlist';
  };

  const getViewIcon = () => {
    if (currentView === 'library') return <Library size={24} />;
    if (currentView === 'liked') return <Heart size={24} />;
    return <List size={24} />;
  };

  const VolumeIcon = volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  return (
    <div className="mp-container">
      {/* Sidebar */}
      <aside className="mp-sidebar">
        <div className="mp-sidebar-section">
          <div className="mp-sidebar-title">Browse</div>
          <button 
            className={`mp-nav-item ${currentView === 'library' ? 'active' : ''}`}
            onClick={() => { setCurrentView('library'); setActivePlaylistId(null); }}
          >
            <Library size={18} />
            <span>Library</span>
            <span className="mp-nav-count">{allSongs.length}</span>
          </button>
          <button 
            className={`mp-nav-item ${currentView === 'liked' ? 'active' : ''}`}
            onClick={() => { setCurrentView('liked'); setActivePlaylistId(null); }}
          >
            <Heart size={18} />
            <span>Liked Songs</span>
            <span className="mp-nav-count">{allSongs.filter(s => s.isLiked).length}</span>
          </button>
        </div>

        <div className="mp-sidebar-section mp-playlists-section">
          <div className="mp-sidebar-title">
            <span>Playlists</span>
            <button className="mp-add-playlist" onClick={handleCreatePlaylist} title="Create Playlist">
              <Plus size={16} />
            </button>
          </div>
          <div className="mp-playlist-list">
            {playlists.map(pl => (
              <button 
                key={pl.id}
                className={`mp-nav-item ${activePlaylistId === pl.id ? 'active' : ''}`}
                onClick={() => { setCurrentView('playlist'); setActivePlaylistId(pl.id); }}
              >
                <Disc3 size={18} />
                <span>{pl.name}</span>
                <button 
                  className="mp-delete-playlist"
                  onClick={(e) => { e.stopPropagation(); handleDeletePlaylist(pl.id); }}
                  title="Delete"
                >
                  <Trash2 size={14} />
                </button>
              </button>
            ))}
            {playlists.length === 0 && (
              <div className="mp-empty-playlists">No playlists yet</div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="mp-main">
        {/* Header */}
        <header className="mp-header">
          <div className="mp-header-title">
            <div className="mp-header-icon">{getViewIcon()}</div>
            <div>
              <h1>{getViewTitle()}</h1>
              <span className="mp-song-count">{filteredSongs.length} songs</span>
            </div>
          </div>
          
          <div className="mp-header-actions">
            <div className="mp-search-wrapper">
              <Search size={16} />
              <input 
                type="text" 
                placeholder="Search songs, artists..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="mp-search-input"
              />
              {searchQuery && (
                <button className="mp-search-clear" onClick={() => setSearchQuery('')}>
                  <X size={14} />
                </button>
              )}
            </div>
            
            <button 
              className="mp-action-btn mp-btn-download" 
              onClick={() => setShowDownloadModal(true)}
            >
              <Download size={16} />
              <span>Download</span>
            </button>
            <button className="mp-action-btn" onClick={handleImport}>
              <Plus size={16} />
              <span>Import</span>
            </button>
          </div>
        </header>

        {/* Song List */}
        <div className="mp-song-list">
          {isLoading ? (
            <div className="mp-loading">
              <Disc3 size={48} className="mp-loading-icon" />
              <span>Loading your music...</span>
            </div>
          ) : filteredSongs.length === 0 ? (
            <div className="mp-empty">
              <Music size={64} />
              <h3>No songs found</h3>
              <p>Import some music or download from Spotify to get started!</p>
            </div>
          ) : (
            <>
              <div className="mp-list-header">
                <span className="mp-col-num">#</span>
                <span className="mp-col-title">Title</span>
                <span className="mp-col-artist">Artist</span>
                <span className="mp-col-album">Album</span>
                <span className="mp-col-duration"><Clock size={14} /></span>
                <span className="mp-col-actions"></span>
              </div>
              
              <div className="mp-tracks">
                {filteredSongs.map((song, idx) => (
                  <div 
                    key={song.id}
                    className={`mp-track ${currentSong?.id === song.id ? 'playing' : ''}`}
                    onClick={() => handlePlayFromList(idx, filteredSongs)}
                    onDoubleClick={() => handlePlayFromList(idx, filteredSongs)}
                  >
                    <span className="mp-col-num">
                      {currentSong?.id === song.id && isPlaying ? (
                        <div className="mp-playing-indicator">
                          <span></span><span></span><span></span>
                        </div>
                      ) : (
                        idx + 1
                      )}
                    </span>
                    <div className="mp-col-title">
                      <span className="mp-track-title">{song.title}</span>
                    </div>
                    <span className="mp-col-artist">{song.artist || 'Unknown'}</span>
                    <span className="mp-col-album">{song.album || '—'}</span>
                    <span className="mp-col-duration">{formatTime(song.duration)}</span>
                    <div className="mp-col-actions" onClick={e => e.stopPropagation()}>
                      <button 
                        className={`mp-like-btn ${song.isLiked ? 'liked' : ''}`}
                        onClick={() => handleLike(song)}
                      >
                        <Heart size={16} fill={song.isLiked ? 'currentColor' : 'none'} />
                      </button>
                      <button 
                        className="mp-more-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          const rect = e.currentTarget.getBoundingClientRect();
                          setContextMenu({ songId: song.id, x: rect.left - 180, y: rect.bottom + 4 });
                        }}
                      >
                        <MoreHorizontal size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </main>

      {/* Context Menu */}
      {contextMenu && (
        <div 
          className="mp-context-menu"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={e => e.stopPropagation()}
        >
          <div className="mp-context-header">Add to Playlist</div>
          {playlists.length === 0 ? (
            <div className="mp-context-empty">No playlists available</div>
          ) : (
            playlists.map(pl => (
              <button 
                key={pl.id} 
                className="mp-context-item"
                onClick={() => handleAddToPlaylist(pl.id, contextMenu.songId)}
              >
                <Disc3 size={14} />
                {pl.name}
              </button>
            ))
          )}
          {currentView === 'playlist' && activePlaylistId && (
            <>
              <div className="mp-context-divider" />
              <button 
                className="mp-context-item mp-context-danger"
                onClick={() => handleRemoveFromPlaylist(contextMenu.songId)}
              >
                <Trash2 size={14} />
                Remove from Playlist
              </button>
            </>
          )}
        </div>
      )}

      {/* Player Bar */}
      <footer className="mp-player-bar">
        {/* Now Playing */}
        <div className="mp-now-playing">
          <div className="mp-album-art">
            {albumArt ? (
              <img src={albumArt} alt="Album Art" />
            ) : (
              <div className="mp-art-placeholder">
                <Music size={24} />
              </div>
            )}
          </div>
          <div className="mp-track-info">
            <span className="mp-current-title">{currentSong?.title || 'No song playing'}</span>
            <span className="mp-current-artist">{currentSong?.artist || 'Select a song'}</span>
          </div>
          {currentSong && (
            <button 
              className={`mp-player-like ${currentSong.isLiked ? 'liked' : ''}`}
              onClick={() => handleLike(currentSong)}
            >
              <Heart size={18} fill={currentSong.isLiked ? 'currentColor' : 'none'} />
            </button>
          )}
        </div>

        {/* Center Controls */}
        <div className="mp-controls">
          <div className="mp-control-buttons">
            <button 
              className={`mp-ctrl-btn ${isShuffle ? 'active' : ''}`} 
              onClick={() => setIsShuffle(!isShuffle)}
              title="Shuffle"
            >
              <Shuffle size={18} />
            </button>
            <button className="mp-ctrl-btn" onClick={handlePrev} title="Previous">
              <SkipBack size={20} />
            </button>
            <button className="mp-ctrl-btn mp-play-btn" onClick={togglePlay}>
              {isPlaying ? <Pause size={24} /> : <Play size={24} />}
            </button>
            <button className="mp-ctrl-btn" onClick={handleNext} title="Next">
              <SkipForward size={20} />
            </button>
            <button 
              className={`mp-ctrl-btn ${repeatMode !== 'off' ? 'active' : ''}`} 
              onClick={cycleRepeat}
              title={`Repeat: ${repeatMode}`}
            >
              {repeatMode === 'one' ? <Repeat1 size={18} /> : <Repeat size={18} />}
            </button>
          </div>
          
          <div className="mp-progress">
            <span className="mp-time">{formatTime(currentTime)}</span>
            <div 
              className="mp-progress-bar"
              ref={progressRef}
              onClick={handleProgressClick}
              onMouseDown={() => setIsDraggingProgress(true)}
              onMouseUp={() => setIsDraggingProgress(false)}
              onMouseLeave={() => setIsDraggingProgress(false)}
            >
              <div 
                className="mp-progress-fill" 
                style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
              />
              <div 
                className="mp-progress-thumb"
                style={{ left: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
              />
            </div>
            <span className="mp-time">{formatTime(duration)}</span>
          </div>
        </div>

        {/* Volume */}
        <div className="mp-volume">
          <button className="mp-volume-btn" onClick={toggleMute}>
            <VolumeIcon size={18} />
          </button>
          <div className="mp-volume-slider">
            <input 
              type="range" 
              min="0" 
              max="1" 
              step="0.01" 
              value={volume}
              onChange={(e) => {
                const vol = parseFloat(e.target.value);
                setVolume(vol);
                invoke('set_volume', { volume: vol }).catch(console.error);
              }}
            />
            <div className="mp-volume-fill" style={{ width: `${volume * 100}%` }} />
          </div>
        </div>
      </footer>

      {/* Download Modal */}
      {showDownloadModal && (
        <div className="mp-modal-overlay" onClick={() => setShowDownloadModal(false)}>
          <div className="mp-modal" onClick={e => e.stopPropagation()}>
            <div className="mp-modal-header">
              <h2>Download Music</h2>
              <button className="mp-modal-close" onClick={() => setShowDownloadModal(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="mp-modal-tabs">
              <button 
                className={`mp-tab ${downloadTab === 'spotify' ? 'active' : ''}`}
                onClick={() => setDownloadTab('spotify')}
              >
                <Music size={16} />
                Spotify
              </button>
              <button 
                className={`mp-tab ${downloadTab === 'youtube' ? 'active' : ''}`}
                onClick={() => setDownloadTab('youtube')}
              >
                <Youtube size={16} />
                YouTube
              </button>
              <button 
                className={`mp-tab ${downloadTab === 'url' ? 'active' : ''}`}
                onClick={() => setDownloadTab('url')}
              >
                <Link size={16} />
                URL
              </button>
            </div>

            <div className="mp-modal-content">
              <div className="mp-download-info">
                {downloadTab === 'spotify' && (
                  <>
                    <FileAudio size={32} />
                    <p>Paste a Spotify track or playlist URL to download</p>
                  </>
                )}
                {downloadTab === 'youtube' && (
                  <>
                    <Youtube size={32} />
                    <p>Paste a YouTube video URL to extract audio</p>
                  </>
                )}
                {downloadTab === 'url' && (
                  <>
                    <ExternalLink size={32} />
                    <p>Paste any video URL to extract audio</p>
                  </>
                )}
              </div>

              <div className="mp-url-input-wrapper">
                <input
                  type="text"
                  value={downloadUrl}
                  onChange={(e) => setDownloadUrl(e.target.value)}
                  placeholder={getUrlPlaceholder()}
                  className="mp-url-input"
                  disabled={downloadProgress.status === 'downloading' || downloadProgress.status === 'extracting'}
                />
              </div>

              {downloadProgress.status !== 'idle' && (
                <div className={`mp-download-status ${downloadProgress.status}`}>
                  {(downloadProgress.status === 'downloading' || downloadProgress.status === 'extracting') && (
                    <Loader2 size={18} className="mp-spinner" />
                  )}
                  <span>{downloadProgress.message}</span>
                </div>
              )}

              <button 
                className="mp-download-btn"
                onClick={handleDownloadSubmit}
                disabled={!downloadUrl.trim() || downloadProgress.status === 'downloading' || downloadProgress.status === 'extracting'}
              >
                {downloadProgress.status === 'downloading' || downloadProgress.status === 'extracting' ? (
                  <>
                    <Loader2 size={18} className="mp-spinner" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Download size={18} />
                    Download
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
