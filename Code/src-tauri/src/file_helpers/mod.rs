use tauri::command;
use serde::{Deserialize, Serialize};
use std::process::Command;
use std::path::PathBuf;
use std::env;

// =============================================================================
// TYPES
// =============================================================================

#[derive(Debug, Serialize, Deserialize)]
pub struct ConversionResult {
    pub success: bool,
    pub output_path: Option<String>,
    pub error: Option<String>,
    pub file_size: Option<u64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MediaInfo {
    pub success: bool,
    pub file_path: Option<String>,
    pub file_name: Option<String>,
    pub file_size: Option<u64>,
    pub duration: Option<f64>,
    pub bit_rate: Option<u64>,
    pub format_name: Option<String>,
    pub format_long_name: Option<String>,
    pub streams: Option<MediaStreams>,
    pub error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MediaStreams {
    pub video: Vec<VideoStream>,
    pub audio: Vec<AudioStream>,
    pub subtitle: Vec<SubtitleStream>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct VideoStream {
    pub index: Option<i32>,
    pub codec_name: Option<String>,
    pub codec_long_name: Option<String>,
    pub width: Option<i32>,
    pub height: Option<i32>,
    pub fps: Option<f64>,
    pub pix_fmt: Option<String>,
    pub bit_rate: Option<String>,
    pub duration: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AudioStream {
    pub index: Option<i32>,
    pub codec_name: Option<String>,
    pub codec_long_name: Option<String>,
    pub sample_rate: Option<String>,
    pub channels: Option<i32>,
    pub channel_layout: Option<String>,
    pub bit_rate: Option<String>,
    pub duration: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SubtitleStream {
    pub index: Option<i32>,
    pub codec_name: Option<String>,
    pub language: Option<String>,
    pub title: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MuxResult {
    pub success: bool,
    pub output_path: Option<String>,
    pub file_size: Option<u64>,
    pub error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MergeResult {
    pub success: bool,
    pub output_path: Option<String>,
    pub file_size: Option<u64>,
    pub merged_count: Option<usize>,
    pub error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CompressionResult {
    pub success: bool,
    pub output_path: Option<String>,
    pub original_size: Option<u64>,
    pub compressed_size: Option<u64>,
    pub compression_ratio: Option<f64>,
    pub error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BatchResult {
    pub success: bool,
    pub total: usize,
    pub success_count: usize,
    pub fail_count: usize,
    pub results: Vec<BatchItemResult>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BatchItemResult {
    pub input: String,
    pub result: ConversionResult,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MuxParams {
    pub video_file: Option<String>,
    pub audio_files: Vec<String>,
    pub subtitle_files: Vec<String>,
    pub output_path: String,
    pub options: Option<MuxOptions>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MuxOptions {
    pub video_codec: Option<String>,
    pub audio_codec: Option<String>,
    pub subtitle_codec: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ConvertOptions {
    pub quality: Option<i32>,
    pub bitrate: Option<String>,
    pub video_codec: Option<String>,
    pub crf: Option<i32>,
    pub preset: Option<String>,
    pub fps: Option<i32>,
    pub scale: Option<i32>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MergeOptions {
    pub video_codec: Option<String>,
    pub audio_codec: Option<String>,
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

fn get_python_executable() -> String {
    let venv_paths = [
        PathBuf::from("../../.venv/Scripts/python.exe"),
        PathBuf::from("../.venv/Scripts/python.exe"),
        PathBuf::from(".venv/Scripts/python.exe"),
    ];
    
    for venv_path in &venv_paths {
        if venv_path.exists() {
            return venv_path.to_string_lossy().to_string();
        }
    }
    
    "python".to_string()
}

fn get_script_path() -> Result<PathBuf, String> {
    let script_paths = [
        PathBuf::from("../python_backend/media_helper.py"),
        PathBuf::from("../../python_backend/media_helper.py"),
        PathBuf::from("python_backend/media_helper.py"),
    ];
    
    for path in &script_paths {
        if path.exists() {
            return Ok(path.clone());
        }
    }
    
    if let Ok(cwd) = env::current_dir() {
        println!("Current working directory: {:?}", cwd);
    }
    
    Err("Media helper script not found".to_string())
}

fn run_python_command(args: Vec<&str>) -> Result<String, String> {
    let python_exe = get_python_executable();
    let script_path = get_script_path()?;
    
    println!("Using python: {}", python_exe);
    println!("Script path: {:?}", script_path);
    println!("Args: {:?}", args);
    
    let mut cmd = Command::new(&python_exe);
    cmd.arg(&script_path);
    
    for arg in args {
        cmd.arg(arg);
    }
    
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }
    
    let output = cmd.output()
        .map_err(|e| format!("Failed to execute python script: {}", e))?;
    
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Python script error: {}", stderr));
    }
    
    let stdout = String::from_utf8_lossy(&output.stdout);
    Ok(stdout.trim().to_string())
}

// =============================================================================
// COMMANDS
// =============================================================================

/// Get detailed media information
#[command]
pub async fn get_media_info(file_path: String) -> Result<MediaInfo, String> {
    let output = run_python_command(vec!["info", &file_path])?;
    
    serde_json::from_str(&output)
        .map_err(|e| format!("Failed to parse media info: {}. Output: {}", e, output))
}

/// Convert media file to different format
#[command]
pub async fn convert_media_file(
    file_path: String, 
    target_format: String,
    options: Option<ConvertOptions>
) -> Result<ConversionResult, String> {
    let args = if let Some(opts) = options {
        let opts_json = serde_json::to_string(&opts)
            .map_err(|e| format!("Failed to serialize options: {}", e))?;
        vec!["convert".to_string(), file_path, target_format, opts_json]
    } else {
        vec!["convert".to_string(), file_path, target_format]
    };
    
    let args_refs: Vec<&str> = args.iter().map(|s| s.as_str()).collect();
    let output = run_python_command(args_refs)?;
    
    serde_json::from_str(&output)
        .map_err(|e| format!("Failed to parse result: {}. Output: {}", e, output))
}

/// Mux video, audio, and subtitle streams
#[command]
pub async fn mux_streams(params: MuxParams) -> Result<MuxResult, String> {
    let params_json = serde_json::to_string(&params)
        .map_err(|e| format!("Failed to serialize params: {}", e))?;
    
    let output = run_python_command(vec!["mux", &params_json])?;
    
    serde_json::from_str(&output)
        .map_err(|e| format!("Failed to parse result: {}. Output: {}", e, output))
}

/// Merge multiple media files
#[command]
pub async fn merge_files(
    output_path: String,
    input_files: Vec<String>,
    options: Option<MergeOptions>
) -> Result<MergeResult, String> {
    let files_json = serde_json::to_string(&input_files)
        .map_err(|e| format!("Failed to serialize files: {}", e))?;
    
    let args = if let Some(opts) = options {
        let opts_json = serde_json::to_string(&opts)
            .map_err(|e| format!("Failed to serialize options: {}", e))?;
        vec!["merge".to_string(), output_path, files_json, opts_json]
    } else {
        vec!["merge".to_string(), output_path, files_json]
    };
    
    let args_refs: Vec<&str> = args.iter().map(|s| s.as_str()).collect();
    let output = run_python_command(args_refs)?;
    
    serde_json::from_str(&output)
        .map_err(|e| format!("Failed to parse result: {}. Output: {}", e, output))
}

/// Extract audio from video file
#[command]
pub async fn extract_audio(
    input_path: String,
    output_format: Option<String>,
    audio_stream: Option<i32>
) -> Result<ConversionResult, String> {
    let format = output_format.unwrap_or_else(|| "mp3".to_string());
    
    let mut args = vec!["extract-audio".to_string(), input_path, format];
    
    if let Some(stream) = audio_stream {
        let opts = serde_json::json!({"audio_stream": stream});
        args.push(opts.to_string());
    }
    
    let args_refs: Vec<&str> = args.iter().map(|s| s.as_str()).collect();
    let output = run_python_command(args_refs)?;
    
    serde_json::from_str(&output)
        .map_err(|e| format!("Failed to parse result: {}. Output: {}", e, output))
}

/// Compress video
#[command]
pub async fn compress_video(
    input_path: String,
    crf: Option<i32>,
    preset: Option<String>,
    resolution: Option<String>
) -> Result<CompressionResult, String> {
    let crf_str = crf.unwrap_or(28).to_string();
    let preset_val = preset.unwrap_or_else(|| "medium".to_string());
    
    let mut args = vec![
        "compress".to_string(),
        input_path,
        crf_str,
        preset_val,
    ];
    
    if let Some(res) = resolution {
        args.push(res);
    }
    
    let args_refs: Vec<&str> = args.iter().map(|s| s.as_str()).collect();
    let output = run_python_command(args_refs)?;
    
    serde_json::from_str(&output)
        .map_err(|e| format!("Failed to parse result: {}. Output: {}", e, output))
}

/// Trim video to specific time range
#[command]
pub async fn trim_video(
    input_path: String,
    start_time: String,
    end_time: Option<String>
) -> Result<ConversionResult, String> {
    let mut args = vec!["trim".to_string(), input_path, start_time];
    
    if let Some(end) = end_time {
        args.push(end);
    }
    
    let args_refs: Vec<&str> = args.iter().map(|s| s.as_str()).collect();
    let output = run_python_command(args_refs)?;
    
    serde_json::from_str(&output)
        .map_err(|e| format!("Failed to parse result: {}. Output: {}", e, output))
}

/// Batch convert multiple files
#[command]
pub async fn batch_convert(
    target_format: String,
    input_files: Vec<String>,
    options: Option<ConvertOptions>
) -> Result<BatchResult, String> {
    let files_json = serde_json::to_string(&input_files)
        .map_err(|e| format!("Failed to serialize files: {}", e))?;
    
    let args = if let Some(opts) = options {
        let opts_json = serde_json::to_string(&opts)
            .map_err(|e| format!("Failed to serialize options: {}", e))?;
        vec!["batch-convert".to_string(), target_format, files_json, opts_json]
    } else {
        vec!["batch-convert".to_string(), target_format, files_json]
    };
    
    let args_refs: Vec<&str> = args.iter().map(|s| s.as_str()).collect();
    let output = run_python_command(args_refs)?;
    
    serde_json::from_str(&output)
        .map_err(|e| format!("Failed to parse result: {}. Output: {}", e, output))
}

/// Show file in folder (cross-platform)
#[command]
pub async fn show_in_folder(path: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        Command::new("explorer")
            .args(["/select,", &path])
            .spawn()
            .map_err(|e| format!("Failed to open folder: {}", e))?;
    }
    
    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .args(["-R", &path])
            .spawn()
            .map_err(|e| format!("Failed to open folder: {}", e))?;
    }
    
    #[cfg(target_os = "linux")]
    {
        if let Some(parent) = PathBuf::from(&path).parent() {
            Command::new("xdg-open")
                .arg(parent)
                .spawn()
                .map_err(|e| format!("Failed to open folder: {}", e))?;
        }
    }
    
    Ok(())
}
