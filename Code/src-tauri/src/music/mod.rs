use lofty::prelude::*;
use lofty::read_from_path;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use tauri::{command, AppHandle, State};
use base64::{Engine as _, engine::general_purpose};
use crate::database::{Database, Song};
use chrono::Utc;
use std::process::Command;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AudioTrack {
    path: String,
    filename: String,
    title: Option<String>,
    artist: Option<String>,
    album: Option<String>,
    duration_seconds: u64,
}

#[derive(Debug, Serialize, Deserialize)]
struct DownloadResult {
    success: bool,
    files: Option<Vec<String>>,
    error: Option<String>,
}

#[command]
pub fn scan_music_folder(folder_path: String) -> Result<Vec<AudioTrack>, String> {
    let mut tracks = Vec::new();
    let path = Path::new(&folder_path);

    if !path.exists() || !path.is_dir() {
        return Err("Invalid directory".to_string());
    }

    // Ignore errors during traversal to keep going
    let _ = visit_dirs(path, &mut tracks);
    Ok(tracks)
}

fn visit_dirs(dir: &Path, tracks: &mut Vec<AudioTrack>) -> std::io::Result<()> {
    if let Ok(entries) = fs::read_dir(dir) {
        for entry in entries {
            if let Ok(entry) = entry {
                let path = entry.path();
                if path.is_dir() {
                    let _ = visit_dirs(&path, tracks);
                } else {
                    if let Some(ext) = path.extension() {
                        let ext_str = ext.to_string_lossy().to_lowercase();
                        if ["mp3", "wav", "flac", "ogg", "m4a"].contains(&ext_str.as_str()) {
                            // Try to read metadata, if fails, just use filename
                            match read_from_path(&path) {
                                Ok(tagged_file) => {
                                    let tag = tagged_file.primary_tag();
                                    let properties = tagged_file.properties();
                                    
                                    let title = tag.and_then(|t| t.title().map(|s| s.to_string()));
                                    let artist = tag.and_then(|t| t.artist().map(|s| s.to_string()));
                                    let album = tag.and_then(|t| t.album().map(|s| s.to_string()));
                                    let duration = properties.duration().as_secs();

                                    tracks.push(AudioTrack {
                                        path: path.to_string_lossy().to_string(),
                                        filename: path.file_name().unwrap_or_default().to_string_lossy().to_string(),
                                        title,
                                        artist,
                                        album,
                                        duration_seconds: duration,
                                    });
                                },
                                Err(_) => {
                                    // If metadata fails, still add the file
                                    tracks.push(AudioTrack {
                                        path: path.to_string_lossy().to_string(),
                                        filename: path.file_name().unwrap_or_default().to_string_lossy().to_string(),
                                        title: None,
                                        artist: None,
                                        album: None,
                                        duration_seconds: 0,
                                    });
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    Ok(())
}

#[command]
pub fn get_album_art(file_path: String) -> Result<Option<String>, String> {
    let path = Path::new(&file_path);
    if let Ok(tagged_file) = read_from_path(path) {
        if let Some(tag) = tagged_file.primary_tag() {
            if let Some(picture) = tag.pictures().first() {
                let base64_data = general_purpose::STANDARD.encode(picture.data());
                // Simple mime type mapping or default
                let mime = match picture.mime_type() {
                    Some(m) => m.to_string(),
                    None => "image/jpeg".to_string(),
                };
                return Ok(Some(format!("data:{};base64,{}", mime, base64_data)));
            }
        }
    }
    Ok(None)
}

fn process_import(
    songs_dir: &Path,
    conn: &rusqlite::Connection,
    file_paths: Vec<String>
) -> Result<Vec<Song>, String> {
    let mut imported_songs = Vec::new();

    for path_str in file_paths {
        let path = Path::new(&path_str);
        if !path.exists() { continue; }

        // Check if already exists
        let exists: bool = conn.query_row(
            "SELECT EXISTS(SELECT 1 FROM songs WHERE original_path = ?1)",
            rusqlite::params![path_str],
            |row| row.get(0),
        ).unwrap_or(false);

        if exists {
            continue;
        }

        let filename = path.file_name().unwrap_or_default().to_string_lossy().to_string();
        // Create a unique filename to avoid collisions
        let unique_filename = format!("{}_{}", Utc::now().timestamp_micros(), filename);
        let dest_path = songs_dir.join(&unique_filename);

        // Copy file
        fs::copy(path, &dest_path).map_err(|e| e.to_string())?;

        // Extract metadata
        let mut title = None;
        let mut artist = None;
        let mut album = None;
        let mut duration = 0;

        if let Ok(tagged_file) = read_from_path(&dest_path) {
            let tag = tagged_file.primary_tag();
            let properties = tagged_file.properties();
            
            title = tag.and_then(|t| t.title().map(|s| s.to_string()));
            artist = tag.and_then(|t| t.artist().map(|s| s.to_string()));
            album = tag.and_then(|t| t.album().map(|s| s.to_string()));
            duration = properties.duration().as_secs() as i64;
        }

        // Insert into DB
        conn.execute(
            "INSERT INTO songs (
                title, artist, album, duration, file_path, original_path, is_liked, added_at
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            rusqlite::params![
                title.clone().unwrap_or(filename.clone()), // Default title to filename
                artist,
                album,
                duration,
                dest_path.to_string_lossy().to_string(),
                path_str,
                0, // is_liked
                Utc::now().timestamp_millis(),
            ],
        ).map_err(|e| e.to_string())?;

        let id = conn.last_insert_rowid();

        imported_songs.push(Song {
            id: Some(id),
            title: Some(title.unwrap_or(filename)),
            artist,
            album,
            duration: Some(duration),
            file_path: dest_path.to_string_lossy().to_string(),
            original_path: Some(path_str),
            is_liked: false,
            added_at: Utc::now().timestamp_millis(),
        });
    }

    Ok(imported_songs)
}

#[command]
pub fn import_songs(
    app: AppHandle,
    state: State<Database>,
    file_paths: Vec<String>
) -> Result<Vec<Song>, String> {
    let app_dir = app.path_resolver().app_data_dir().ok_or("Failed to get app data dir")?;
    let songs_dir = app_dir.join("songs");
    
    if !songs_dir.exists() {
        fs::create_dir_all(&songs_dir).map_err(|e| e.to_string())?;
    }

    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    process_import(&songs_dir, &conn, file_paths)
}

#[command]
pub async fn download_spotify(
    app: AppHandle,
    state: State<'_, Database>,
    url: String
) -> Result<Vec<Song>, String> {
    let app_dir = app.path_resolver().app_data_dir().ok_or("Failed to get app data dir")?;
    let downloads_dir = app_dir.join("downloads");
    let songs_dir = app_dir.join("songs");
    
    if !downloads_dir.exists() {
        fs::create_dir_all(&downloads_dir).map_err(|e| e.to_string())?;
    }
    if !songs_dir.exists() {
        fs::create_dir_all(&songs_dir).map_err(|e| e.to_string())?;
    }

    // Locate python script
    // In dev, it's at ../python_backend/downloader.py relative to src-tauri
    let script_path = Path::new("../python_backend/downloader.py");
    let abs_script_path = if script_path.exists() {
        script_path.canonicalize().map_err(|e| e.to_string())?
    } else {
        // Fallback for different CWD or prod structure
        // Try to find it in the resources dir or sidecar location if we were using sidecar
        // For now, just try a relative path that might work if CWD is project root
        let p = Path::new("python_backend/downloader.py");
        if p.exists() {
            p.canonicalize().map_err(|e| e.to_string())?
        } else {
             return Err("Could not find downloader.py".to_string());
        }
    };

    // Determine python executable
    // Prefer local venv if available
    let mut python_exe = "python".to_string();
    
    let venv_python_win = Path::new("../.venv/Scripts/python.exe");
    let venv_python_unix = Path::new("../.venv/bin/python");
    
    if venv_python_win.exists() {
        if let Ok(path) = venv_python_win.canonicalize() {
            python_exe = path.to_string_lossy().to_string();
        }
    } else if venv_python_unix.exists() {
        if let Ok(path) = venv_python_unix.canonicalize() {
            python_exe = path.to_string_lossy().to_string();
        }
    }

    // Run python script
    let output = Command::new(python_exe)
        .arg(&abs_script_path)
        .arg(&url)
        .arg(&downloads_dir)
        .output()
        .map_err(|e| format!("Failed to execute python script: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Python script failed: {}", stderr));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let result: DownloadResult = serde_json::from_str(&stdout)
        .map_err(|e| format!("Failed to parse python output: {}. Output: {}", e, stdout))?;

    if !result.success {
        return Err(result.error.unwrap_or("Unknown error".to_string()));
    }

    let files = result.files.ok_or("No files returned".to_string())?;
    
    // Import the downloaded files
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let imported = process_import(&songs_dir, &conn, files)?;

    Ok(imported)
}

