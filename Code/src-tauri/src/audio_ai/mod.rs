use tauri::command;
use serde::{Deserialize, Serialize};
use std::process::Command;
use std::path::PathBuf;
use std::env;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use lazy_static::lazy_static;

// =============================================================================
// TYPES
// =============================================================================

#[derive(Debug, Serialize, Deserialize)]
pub struct ModelStatus {
    pub whisper_models: Vec<String>,
    pub diarization_installed: bool,
    pub denoiser_installed: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DownloadResult {
    pub success: bool,
    pub message: Option<String>,
    pub error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TranscriptionResult {
    pub success: bool,
    pub text: Option<String>,
    pub segments: Option<Vec<TranscriptionSegment>>,
    pub language: Option<String>,
    pub output_path: Option<String>,
    pub error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TranscriptionSegment {
    pub start: f64,
    pub end: f64,
    pub text: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DiarizationResult {
    pub success: bool,
    pub full_text: Option<String>,
    pub segments: Option<Vec<DiarizationSegment>>,
    pub speakers: Option<Vec<String>>,
    pub num_speakers: Option<usize>,
    pub speakers_data: Option<serde_json::Value>,
    pub error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DiarizationSegment {
    pub start: f64,
    pub end: f64,
    pub text: String,
    pub speaker: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ExportResult {
    pub success: bool,
    pub output_path: Option<String>,
    pub error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DenoiseResult {
    pub success: bool,
    pub output_path: Option<String>,
    pub error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FFmpegCommandResult {
    pub success: bool,
    pub output: Option<String>,
    pub error: Option<String>,
}

// Cancel flag for downloads
lazy_static! {
    static ref CANCEL_DOWNLOAD: Arc<AtomicBool> = Arc::new(AtomicBool::new(false));
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

fn get_python_executable() -> String {
    // Check for venv in various relative locations
    let venv_paths = [
        // Relative to src-tauri
        PathBuf::from("../.venv/Scripts/python.exe"),
        PathBuf::from("../../.venv/Scripts/python.exe"),
        PathBuf::from(".venv/Scripts/python.exe"),
        // Absolute paths for common locations
        PathBuf::from("F:/Ask_Ocr/Code/.venv/Scripts/python.exe"),
        PathBuf::from("F:/Ask_Ocr/Code/python_backend/.venv/Scripts/python.exe"),
    ];
    
    for venv_path in &venv_paths {
        if venv_path.exists() {
            println!("Found Python at: {:?}", venv_path);
            return venv_path.to_string_lossy().to_string();
        }
    }
    
    // Fallback to system Python
    println!("No venv found, using system python");
    "python".to_string()
}

fn get_audio_ai_script_path() -> Result<PathBuf, String> {
    let script_paths = [
        // Relative to src-tauri (when running from Code/src-tauri)
        PathBuf::from("../python_backend/audio_ai_helper.py"),
        PathBuf::from("../../python_backend/audio_ai_helper.py"),
        PathBuf::from("python_backend/audio_ai_helper.py"),
        // Absolute paths
        PathBuf::from("F:/Ask_Ocr/Code/python_backend/audio_ai_helper.py"),
    ];
    
    for path in &script_paths {
        if path.exists() {
            println!("Found audio_ai_helper.py at: {:?}", path);
            return Ok(path.clone());
        }
    }
    
    if let Ok(cwd) = env::current_dir() {
        println!("Current working directory: {:?}", cwd);
    }
    
    Err("Audio AI helper script not found".to_string())
}

fn run_python_audio_command(args: Vec<&str>) -> Result<String, String> {
    let python_exe = get_python_executable();
    let script_path = get_audio_ai_script_path()?;
    
    println!("Using python: {}", python_exe);
    println!("Script path: {:?}", script_path);
    println!("Args: {:?}", args);
    
    let mut cmd = Command::new(&python_exe);
    cmd.arg(&script_path);
    
    for arg in args {
        cmd.arg(arg);
    }
    
    let output = cmd.output()
        .map_err(|e| format!("Failed to execute command: {}", e))?;
    
    if output.status.success() {
        let stdout = String::from_utf8_lossy(&output.stdout).to_string();
        Ok(stdout)
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        let stdout = String::from_utf8_lossy(&output.stdout).to_string();
        Err(format!("Command failed: {}\n{}", stderr, stdout))
    }
}

// =============================================================================
// COMMANDS
// =============================================================================

/// Debug Python environment
#[command]
pub async fn debug_python_env() -> Result<serde_json::Value, String> {
    let output = run_python_audio_command(vec!["debug-env"])?;
    let result: serde_json::Value = serde_json::from_str(&output)
        .map_err(|e| format!("Failed to parse debug result: {}", e))?;
    Ok(result)
}

/// Check which AI models are installed
#[command]
pub async fn check_ai_models() -> Result<ModelStatus, String> {
    let output = run_python_audio_command(vec!["check-models"])?;
    let result: ModelStatus = serde_json::from_str(&output)
        .map_err(|e| format!("Failed to parse model status: {}", e))?;
    Ok(result)
}

/// Download Whisper model
#[command]
pub async fn download_whisper_model(model_name: String) -> Result<DownloadResult, String> {
    CANCEL_DOWNLOAD.store(false, Ordering::SeqCst);
    
    let output = run_python_audio_command(vec![
        "download-whisper",
        &model_name
    ])?;
    
    let result: DownloadResult = serde_json::from_str(&output)
        .map_err(|e| format!("Failed to parse download result: {}", e))?;
    Ok(result)
}

/// Download speaker diarization model
#[command]
pub async fn download_diarization_model() -> Result<DownloadResult, String> {
    CANCEL_DOWNLOAD.store(false, Ordering::SeqCst);
    
    let output = run_python_audio_command(vec![
        "download-diarization"
    ])?;
    
    let result: DownloadResult = serde_json::from_str(&output)
        .map_err(|e| format!("Failed to parse download result: {}", e))?;
    Ok(result)
}

/// Download denoiser model
#[command]
pub async fn download_denoiser_model() -> Result<DownloadResult, String> {
    CANCEL_DOWNLOAD.store(false, Ordering::SeqCst);
    
    let output = run_python_audio_command(vec![
        "download-denoiser"
    ])?;
    
    let result: DownloadResult = serde_json::from_str(&output)
        .map_err(|e| format!("Failed to parse download result: {}", e))?;
    Ok(result)
}

/// Cancel model download
#[command]
pub async fn cancel_model_download() -> Result<(), String> {
    CANCEL_DOWNLOAD.store(true, Ordering::SeqCst);
    Ok(())
}

/// Transcribe audio using Whisper
#[command]
pub async fn transcribe_audio(
    audio_path: String,
    model_name: Option<String>,
    language: Option<String>,
    output_format: Option<String>
) -> Result<TranscriptionResult, String> {
    let model = model_name.unwrap_or_else(|| "base".to_string());
    let format = output_format.unwrap_or_else(|| "srt".to_string());
    
    // Build params JSON
    let mut params = serde_json::json!({
        "model": model,
        "format": format
    });
    
    if let Some(lang) = &language {
        params["language"] = serde_json::json!(lang);
    }
    
    let params_str = params.to_string();
    
    let output = run_python_audio_command(vec![
        "transcribe",
        &audio_path,
        &params_str
    ])?;
    
    let result: TranscriptionResult = serde_json::from_str(&output)
        .map_err(|e| format!("Failed to parse transcription result: {}", e))?;
    Ok(result)
}

/// Transcribe audio with speaker diarization
#[command]
pub async fn transcribe_with_diarization(
    audio_path: String,
    model_name: Option<String>,
    language: Option<String>,
    num_speakers: Option<usize>,
    max_speakers: Option<usize>
) -> Result<DiarizationResult, String> {
    let model = model_name.unwrap_or_else(|| "base".to_string());
    
    // Build params JSON
    let mut params = serde_json::json!({
        "model": model
    });
    
    if let Some(lang) = &language {
        params["language"] = serde_json::json!(lang);
    }
    
    if let Some(num) = num_speakers {
        params["num_speakers"] = serde_json::json!(num);
    }
    
    if let Some(max) = max_speakers {
        params["max_speakers"] = serde_json::json!(max);
    }
    
    let params_str = params.to_string();
    
    let output = run_python_audio_command(vec![
        "transcribe-diarize",
        &audio_path,
        &params_str
    ])?;
    
    let result: DiarizationResult = serde_json::from_str(&output)
        .map_err(|e| format!("Failed to parse diarization result: {}", e))?;
    Ok(result)
}

/// Export SRT for a specific speaker
#[command]
pub async fn export_speaker_srt(
    diarization_result: DiarizationResult,
    speaker: String,
    output_path: String
) -> Result<ExportResult, String> {
    // Convert result to JSON and pass to Python
    let params = serde_json::json!({
        "diarization_result": diarization_result,
        "speaker": speaker,
        "output_path": output_path
    });
    let params_str = params.to_string();
    
    let output = run_python_audio_command(vec![
        "extract-speaker",
        "",  // audio_path not needed for SRT export
        &params_str
    ])?;
    
    let result: ExportResult = serde_json::from_str(&output)
        .map_err(|e| format!("Failed to parse export result: {}", e))?;
    Ok(result)
}

/// Export all speakers' SRTs to a directory
#[command]
pub async fn export_all_speakers_srt(
    diarization_result: DiarizationResult,
    output_dir: String,
    base_name: String
) -> Result<ExportResult, String> {
    let params = serde_json::json!({
        "diarization_result": diarization_result,
        "output_dir": output_dir,
        "base_name": base_name
    });
    let params_str = params.to_string();
    
    let output = run_python_audio_command(vec![
        "extract-speaker",
        "",
        &params_str
    ])?;
    
    let result: ExportResult = serde_json::from_str(&output)
        .map_err(|e| format!("Failed to parse export result: {}", e))?;
    Ok(result)
}

/// Extract audio for a specific speaker
#[command]
pub async fn extract_speaker_audio(
    audio_path: String,
    diarization_result: DiarizationResult,
    speaker: String,
    output_path: String,
    per_sentence: Option<bool>
) -> Result<ExportResult, String> {
    let per_sent = per_sentence.unwrap_or(false);
    
    let params = serde_json::json!({
        "diarization_result": diarization_result,
        "speaker": speaker,
        "output_path": output_path,
        "per_sentence": per_sent
    });
    let params_str = params.to_string();
    
    let output = run_python_audio_command(vec![
        "extract-speaker",
        &audio_path,
        &params_str
    ])?;
    
    let result: ExportResult = serde_json::from_str(&output)
        .map_err(|e| format!("Failed to parse export result: {}", e))?;
    Ok(result)
}

/// Remove background noise from audio
#[command]
pub async fn remove_background_noise(
    audio_path: String,
    output_path: String,
    method: Option<String>
) -> Result<DenoiseResult, String> {
    let denoise_method = method.unwrap_or_else(|| "denoiser".to_string());
    
    let output = run_python_audio_command(vec![
        "denoise",
        &audio_path,
        &output_path,
        &denoise_method
    ])?;
    
    let result: DenoiseResult = serde_json::from_str(&output)
        .map_err(|e| format!("Failed to parse denoise result: {}", e))?;
    Ok(result)
}

/// Remove noise using FFmpeg filters
#[command]
pub async fn denoise_audio_ffmpeg(
    input_path: String,
    output_dir: String,
    method: Option<String>,
    _strength: Option<i32>
) -> Result<DenoiseResult, String> {
    let denoise_method = method.unwrap_or_else(|| "ffmpeg".to_string());
    
    let output = run_python_audio_command(vec![
        "denoise",
        &input_path,
        &output_dir,
        &denoise_method
    ])?;
    
    let result: DenoiseResult = serde_json::from_str(&output)
        .map_err(|e| format!("Failed to parse denoise result: {}", e))?;
    Ok(result)
}

/// Run arbitrary FFmpeg command
#[command]
pub async fn run_ffmpeg_command(command: String) -> Result<FFmpegCommandResult, String> {
    // Security: Basic validation to prevent dangerous commands
    let cmd_lower = command.to_lowercase();
    let dangerous_patterns = ["rm ", "del ", "format ", "rmdir ", "rd "];
    for pattern in &dangerous_patterns {
        if cmd_lower.contains(pattern) {
            return Ok(FFmpegCommandResult {
                success: false,
                output: None,
                error: Some("Command contains forbidden patterns".to_string()),
            });
        }
    }
    
    // Run via Python to handle FFmpeg execution
    let output = run_python_audio_command(vec![
        "--action", "run_ffmpeg",
        "--command", &command
    ])?;
    
    let result: FFmpegCommandResult = serde_json::from_str(&output)
        .map_err(|e| format!("Failed to parse FFmpeg result: {}", e))?;
    Ok(result)
}

/// Generate FFmpeg command using AI (Ollama with DeepSeek R1 or best available model)
#[command]
pub async fn generate_ffmpeg_command(prompt: String) -> Result<String, String> {
    use crate::ollama;
    
    let system_prompt = r#"You are an FFmpeg command line expert. Your task is to generate a precise, valid FFmpeg command.

RULES:
1. Output ONLY the ffmpeg command, nothing else - no explanations, no markdown, no code blocks
2. Use {input} as placeholder for input file path
3. Use {output} as placeholder for output file path  
4. Always use proper codec settings for quality
5. Include progress output flags when appropriate
6. Handle edge cases like spaces in filenames

COMMON PATTERNS:
- Video conversion: ffmpeg -i {input} -c:v libx264 -crf 23 -c:a aac -b:a 192k {output}
- Audio extraction: ffmpeg -i {input} -vn -c:a libmp3lame -q:a 2 {output}
- Video compression: ffmpeg -i {input} -c:v libx265 -crf 28 -preset medium -c:a copy {output}
- Format conversion: ffmpeg -i {input} -c copy {output}
- Trim video: ffmpeg -ss START -i {input} -t DURATION -c copy {output}
- Scale video: ffmpeg -i {input} -vf "scale=WIDTH:HEIGHT" -c:a copy {output}

Generate the command for this request:"#;
    
    let full_prompt = format!("{}\n\n{}", system_prompt, prompt);
    
    // Try preferred models in order: deepseek-r1, qwen, llama, then any available
    let preferred_models = vec![
        "deepseek-r1:1.5b",
        "deepseek-r1:7b",
        "deepseek-r1:14b",
        "qwen2.5:3b",
        "qwen2.5:7b",
        "llama3.2:3b",
        "llama3.2:1b",
        "llama3.1:8b",
        "mistral:7b",
    ];
    
    // Get available models
    let available_models = ollama::ollama_list_models().await.unwrap_or_default();
    
    // Find the best available model
    let model_to_use = preferred_models
        .iter()
        .find(|&preferred| available_models.iter().any(|m| m.name.starts_with(preferred.split(':').next().unwrap_or(""))))
        .map(|s| s.to_string())
        .or_else(|| available_models.first().map(|m| m.name.clone()))
        .unwrap_or_else(|| "llama3.2:1b".to_string());
    
    println!("Using model for FFmpeg generation: {}", model_to_use);
    
    match ollama::ollama_generate(model_to_use, full_prompt).await {
        Ok(response) => {
            // Clean the response - extract just the ffmpeg command
            let cleaned = response
                .trim()
                .replace("```bash", "")
                .replace("```shell", "")
                .replace("```", "")
                .trim()
                .to_string();
            
            // Find the actual ffmpeg command line
            let command = cleaned
                .lines()
                .find(|line| {
                    let trimmed = line.trim();
                    trimmed.starts_with("ffmpeg") || trimmed.starts_with("ffprobe")
                })
                .map(|s| s.trim().to_string())
                .unwrap_or_else(|| cleaned.lines().next().unwrap_or(&cleaned).trim().to_string());
            
            Ok(command)
        }
        Err(e) => Err(format!("Failed to generate command: {}", e))
    }
}
