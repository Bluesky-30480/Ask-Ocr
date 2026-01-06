// File Search Module
// Handles file system search using native system capabilities

use serde::{Deserialize, Serialize};
use std::process::Command;
use std::fs;
use std::path::Path;
use std::io::BufRead;
use tauri::command;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileMetadata {
    pub mime_type: String,
    pub width: Option<u32>,
    pub height: Option<u32>,
    pub line_count: Option<usize>,
    pub word_count: Option<usize>,
    pub created: Option<u64>,
    pub accessed: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchResult {
    pub path: String,
    pub name: String,
    pub size: u64,
    pub modified: u64,
    pub is_dir: bool,
    pub snippet: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileSearchOptions {
    pub query: String,
    pub path: Option<String>, // Root path to search in
    pub max_results: usize,
    pub file_types: Option<Vec<String>>, // e.g. ["pdf", "txt"]
}

#[command]
pub async fn search_files(options: FileSearchOptions) -> Result<Vec<SearchResult>, String> {
    #[cfg(target_os = "windows")]
    return search_windows(options);

    #[cfg(target_os = "macos")]
    return search_macos(options);

    #[cfg(target_os = "linux")]
    return search_linux(options);

    #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
    Err("Unsupported platform".to_string())
}

#[command]
pub async fn read_file_content(path: String) -> Result<String, String> {
    let file_path = Path::new(&path);
    
    if !file_path.exists() {
        return Err("File not found".to_string());
    }

    // Check file size (limit to 5MB for text)
    let metadata = fs::metadata(file_path).map_err(|e| e.to_string())?;
    if metadata.len() > 5 * 1024 * 1024 {
        return Err("File too large (max 5MB)".to_string());
    }

    // Try to read as string
    match fs::read_to_string(file_path) {
        Ok(content) => Ok(content),
        Err(_) => {
            // If not UTF-8, maybe return base64? 
            // For now, let's just say we only support text files for analysis
            Err("Could not read file as text (binary or encoding issue)".to_string())
        }
    }
}

#[command]
pub async fn get_file_metadata(path: String) -> Result<FileMetadata, String> {
    let file_path = Path::new(&path);
    if !file_path.exists() {
        return Err("File not found".to_string());
    }

    let metadata = fs::metadata(file_path).map_err(|e| e.to_string())?;
    
    // Basic timestamps
    let created = metadata.created().ok()
        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
        .map(|d| d.as_secs());
        
    let accessed = metadata.accessed().ok()
        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
        .map(|d| d.as_secs());

    // Determine type and extract specific metadata
    let extension = file_path.extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();

    let mut width = None;
    let mut height = None;
    let mut line_count = None;
    let mut word_count = None;
    let mut mime_type = "application/octet-stream".to_string();

    match extension.as_str() {
        "jpg" | "jpeg" | "png" | "gif" | "bmp" | "webp" => {
            mime_type = format!("image/{}", extension);
            if let Ok(img) = image::open(file_path) {
                width = Some(img.width());
                height = Some(img.height());
            }
        },
        "txt" | "md" | "rs" | "ts" | "js" | "json" | "html" | "css" | "py" | "c" | "cpp" | "h" => {
            mime_type = "text/plain".to_string();
            if let Ok(file) = fs::File::open(file_path) {
                let reader = std::io::BufReader::new(file);
                let lines: Vec<String> = reader.lines().filter_map(Result::ok).collect();
                line_count = Some(lines.len());
                word_count = Some(lines.iter().map(|l| l.split_whitespace().count()).sum());
            }
        },
        _ => {}
    }

    Ok(FileMetadata {
        mime_type,
        width,
        height,
        line_count,
        word_count,
        created,
        accessed,
    })
}

#[cfg(target_os = "windows")]
fn search_windows(options: FileSearchOptions) -> Result<Vec<SearchResult>, String> {
    // Use PowerShell to search
    // This is a basic implementation using Get-ChildItem
    // For better performance, we should use Windows Search Index via OLE/COM, but that's complex in Rust without a crate
    
    let path = options.path.unwrap_or_else(|| "C:\\Users".to_string());
    let query = options.query;
    
    // Construct PowerShell command
    // Get-ChildItem -Path "path" -Recurse -ErrorAction SilentlyContinue | Where-Object { $_.Name -like "*query*" } | Select-Object -First 20 FullName, Name, Length, LastWriteTime, PSIsContainer
    
    let ps_script = format!(
        "Get-ChildItem -Path '{}' -Recurse -ErrorAction SilentlyContinue | Where-Object {{ $_.Name -like '*{}*' }} | Select-Object -First {} FullName, Name, Length, LastWriteTime, PSIsContainer | ConvertTo-Json",
        path, query, options.max_results
    );

    let output = Command::new("powershell")
        .args(&["-NoProfile", "-Command", &ps_script])
        .output()
        .map_err(|e| format!("Failed to execute PowerShell: {}", e))?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    if stdout.trim().is_empty() {
        return Ok(Vec::new());
    }

    // Parse JSON output
    // Note: PowerShell ConvertTo-Json might return a single object or an array
    let results: Vec<serde_json::Value> = serde_json::from_str(&stdout)
        .or_else(|_| {
            // Try parsing as single object and wrap in vec
            serde_json::from_str::<serde_json::Value>(&stdout).map(|v| vec![v])
        })
        .map_err(|e| format!("Failed to parse JSON: {}", e))?;

    let mut search_results = Vec::new();
    for item in results {
        let path = item["FullName"].as_str().unwrap_or("").to_string();
        let name = item["Name"].as_str().unwrap_or("").to_string();
        let size = item["Length"].as_u64().unwrap_or(0);
        
        // Parse date string from PowerShell (e.g. "/Date(1634567890000)/")
        let modified_raw = item["LastWriteTime"].as_str().unwrap_or("");
        let modified = parse_powershell_date(modified_raw);
        
        let is_dir = item["PSIsContainer"].as_bool().unwrap_or(false);

        search_results.push(SearchResult {
            path,
            name,
            size,
            modified,
            is_dir,
            snippet: None,
        });
    }

    Ok(search_results)
}

#[cfg(target_os = "windows")]
fn parse_powershell_date(date_str: &str) -> u64 {
    // Format: /Date(1634567890000)/ (Windows PowerShell 5.1)
    if date_str.starts_with("/Date(") && date_str.ends_with(")/") {
        let timestamp_str = &date_str[6..date_str.len() - 2];
        return timestamp_str.parse::<u64>().unwrap_or(0) / 1000; // Convert ms to seconds
    }
    
    // Format: 2023-10-27T10:00:00Z (PowerShell Core / 7+)
    // Simple ISO 8601 parser fallback or just return 0 if complex
    // For now, let's try to parse if it looks like a date
    if let Ok(dt) = chrono::DateTime::parse_from_rfc3339(date_str) {
        return dt.timestamp() as u64;
    }

    0
}

#[cfg(target_os = "macos")]
fn search_macos(options: FileSearchOptions) -> Result<Vec<SearchResult>, String> {
    // Use mdfind (Spotlight)
    let query = options.query;
    
    let mut cmd = Command::new("mdfind");
    if let Some(ref p) = options.path {
        cmd.arg("-onlyin").arg(p);
    }
    
    // mdfind query syntax: "kMDItemDisplayName == '*query*'c" for case-insensitive name search
    // or just "query" for content search
    // Let's do name search for now to match Windows implementation
    let name_query = format!("kMDItemDisplayName == '*{}*'c", query);
    cmd.arg(name_query);

    let output = cmd.output().map_err(|e| format!("Failed to execute mdfind: {}", e))?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let paths: Vec<&str> = stdout.lines().take(options.max_results).collect();

    let mut search_results = Vec::new();
    for path_str in paths {
        let path = std::path::Path::new(path_str);
        if path.exists() {
            let metadata = std::fs::metadata(path).ok();
            let name = path.file_name().unwrap_or_default().to_string_lossy().to_string();
            let size = metadata.as_ref().map(|m| m.len()).unwrap_or(0);
            let modified = metadata.as_ref()
                .and_then(|m| m.modified().ok())
                .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                .map(|d| d.as_millis() as u64)
                .unwrap_or(0);
            let is_dir = path.is_dir();

            search_results.push(SearchResult {
                path: path_str.to_string(),
                name,
                size,
                modified,
                is_dir,
                snippet: None,
            });
        }
    }

    Ok(search_results)
}

#[cfg(target_os = "linux")]
fn search_linux(options: FileSearchOptions) -> Result<Vec<SearchResult>, String> {
    // Use locate or find
    // locate is faster but requires updated db
    // find is slower but real-time
    
    let path = options.path.unwrap_or_else(|| String::from("."));
    let query = options.query;
    
    // find path -name "*query*"
    let output = Command::new("find")
        .arg(&path)
        .arg("-name")
        .arg(format!("*{}*", query))
        .arg("-maxdepth")
        .arg("5") // Limit depth for performance
        .output()
        .map_err(|e| format!("Failed to execute find: {}", e))?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let paths: Vec<&str> = stdout.lines().take(options.max_results).collect();

    let mut search_results = Vec::new();
    for path_str in paths {
        let path = std::path::Path::new(path_str);
        let metadata = std::fs::metadata(path).ok();
        let name = path.file_name().unwrap_or_default().to_string_lossy().to_string();
        let size = metadata.as_ref().map(|m| m.len()).unwrap_or(0);
        let modified = metadata.as_ref()
            .and_then(|m| m.modified().ok())
            .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
            .map(|d| d.as_millis() as u64)
            .unwrap_or(0);
        let is_dir = path.is_dir();

        search_results.push(SearchResult {
            path: path_str.to_string(),
            name,
            size,
            modified,
            is_dir,
            snippet: None,
        });
    }

    Ok(search_results)
}
