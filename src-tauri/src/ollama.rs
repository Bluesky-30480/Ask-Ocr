use serde::{Deserialize, Serialize};
use std::process::Command;
use tauri::State;
use crate::database::Database;

#[derive(Debug, Serialize, Deserialize)]
pub struct OllamaStatus {
    pub installed: bool,
    pub running: bool,
    pub version: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct OllamaModel {
    pub name: String,
    pub size: String,
    pub modified: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ModelDownloadProgress {
    pub status: String,
    pub digest: String,
    pub total: u64,
    pub completed: u64,
}

/// Check if Ollama is installed on the system
#[tauri::command]
pub fn check_ollama_installed() -> Result<bool, String> {
    #[cfg(target_os = "windows")]
    {
        // Check if ollama.exe exists in PATH or common installation directories
        let check_cmd = Command::new("where")
            .arg("ollama")
            .output();
        
        if let Ok(output) = check_cmd {
            return Ok(output.status.success());
        }
        
        // Check common Windows installation paths
        let common_paths = vec![
            "C:\\Program Files\\Ollama\\ollama.exe",
            "C:\\Program Files (x86)\\Ollama\\ollama.exe",
            format!("{}\\AppData\\Local\\Programs\\Ollama\\ollama.exe", std::env::var("USERPROFILE").unwrap_or_default()),
        ];
        
        for path in common_paths {
            if std::path::Path::new(&path).exists() {
                return Ok(true);
            }
        }
        
        Ok(false)
    }
    
    #[cfg(target_os = "macos")]
    {
        // Check if ollama exists in PATH
        let check_cmd = Command::new("which")
            .arg("ollama")
            .output();
        
        if let Ok(output) = check_cmd {
            return Ok(output.status.success());
        }
        
        // Check common macOS installation paths
        let common_paths = vec![
            "/usr/local/bin/ollama",
            "/opt/homebrew/bin/ollama",
            format!("{}/.ollama/bin/ollama", std::env::var("HOME").unwrap_or_default()),
        ];
        
        for path in common_paths {
            if std::path::Path::new(&path).exists() {
                return Ok(true);
            }
        }
        
        Ok(false)
    }
    
    #[cfg(target_os = "linux")]
    {
        // Check if ollama exists in PATH
        let check_cmd = Command::new("which")
            .arg("ollama")
            .output();
        
        if let Ok(output) = check_cmd {
            return Ok(output.status.success());
        }
        
        // Check common Linux installation paths
        let common_paths = vec![
            "/usr/local/bin/ollama",
            "/usr/bin/ollama",
            format!("{}/.local/bin/ollama", std::env::var("HOME").unwrap_or_default()),
        ];
        
        for path in common_paths {
            if std::path::Path::new(&path).exists() {
                return Ok(true);
            }
        }
        
        Ok(false)
    }
}

/// Check if Ollama service is currently running
#[tauri::command]
pub fn check_ollama_running() -> Result<bool, String> {
    // Try to connect to Ollama API (default: http://localhost:11434)
    let client = reqwest::blocking::Client::new();
    match client.get("http://localhost:11434/api/tags").send() {
        Ok(response) => Ok(response.status().is_success()),
        Err(_) => Ok(false),
    }
}

/// Get Ollama version
#[tauri::command]
pub fn get_ollama_version() -> Result<String, String> {
    let output = Command::new("ollama")
        .arg("--version")
        .output()
        .map_err(|e| format!("Failed to execute ollama: {}", e))?;
    
    if !output.status.success() {
        return Err("Failed to get Ollama version".to_string());
    }
    
    let version = String::from_utf8_lossy(&output.stdout)
        .trim()
        .to_string();
    
    Ok(version)
}

/// Get comprehensive Ollama status
#[tauri::command]
pub fn get_ollama_status() -> Result<OllamaStatus, String> {
    let installed = check_ollama_installed()?;
    let running = if installed {
        check_ollama_running()?
    } else {
        false
    };
    let version = if installed && running {
        get_ollama_version().ok()
    } else {
        None
    };
    
    Ok(OllamaStatus {
        installed,
        running,
        version,
    })
}

/// Start Ollama service
#[tauri::command]
pub fn start_ollama_service() -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        // On Windows, start Ollama as a background process
        Command::new("cmd")
            .args(&["/C", "start", "", "ollama", "serve"])
            .spawn()
            .map_err(|e| format!("Failed to start Ollama: {}", e))?;
        
        Ok("Ollama service started".to_string())
    }
    
    #[cfg(not(target_os = "windows"))]
    {
        // On macOS/Linux, start Ollama in background
        Command::new("ollama")
            .arg("serve")
            .spawn()
            .map_err(|e| format!("Failed to start Ollama: {}", e))?;
        
        Ok("Ollama service started".to_string())
    }
}

/// Stop Ollama service
#[tauri::command]
pub fn stop_ollama_service() -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        Command::new("taskkill")
            .args(&["/F", "/IM", "ollama.exe"])
            .output()
            .map_err(|e| format!("Failed to stop Ollama: {}", e))?;
        
        Ok("Ollama service stopped".to_string())
    }
    
    #[cfg(not(target_os = "windows"))]
    {
        Command::new("pkill")
            .arg("ollama")
            .output()
            .map_err(|e| format!("Failed to stop Ollama: {}", e))?;
        
        Ok("Ollama service stopped".to_string())
    }
}

/// List installed Ollama models
#[tauri::command]
pub fn ollama_list_models() -> Result<Vec<OllamaModel>, String> {
    let output = Command::new("ollama")
        .arg("list")
        .output()
        .map_err(|e| format!("Failed to list models: {}", e))?;
    
    if !output.status.success() {
        return Err("Failed to list Ollama models".to_string());
    }
    
    let output_str = String::from_utf8_lossy(&output.stdout);
    let mut models = Vec::new();
    
    // Parse the output (skip header line)
    for line in output_str.lines().skip(1) {
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() >= 3 {
            models.push(OllamaModel {
                name: parts[0].to_string(),
                size: parts[1].to_string(),
                modified: parts[2..].join(" "),
            });
        }
    }
    
    Ok(models)
}

/// Pull/download an Ollama model
#[tauri::command]
pub async fn ollama_pull_model(model_name: String) -> Result<String, String> {
    let output = Command::new("ollama")
        .args(&["pull", &model_name])
        .output()
        .map_err(|e| format!("Failed to pull model: {}", e))?;
    
    if !output.status.success() {
        let error = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Failed to pull model: {}", error));
    }
    
    Ok(format!("Model {} downloaded successfully", model_name))
}

/// Delete an Ollama model
#[tauri::command]
pub async fn ollama_delete_model(
    model_name: String,
    db: State<'_, Database>
) -> Result<String, String> {
    // Delete from Ollama
    let output = Command::new("ollama")
        .args(&["rm", &model_name])
        .output()
        .map_err(|e| format!("Failed to delete model: {}", e))?;
    
    if !output.status.success() {
        let error = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Failed to delete model: {}", error));
    }
    
    // Delete from database (find by model_path which contains model name)
    let all_models = db.get_all_model_records()
        .map_err(|e| format!("Failed to get models from database: {}", e))?;
    
    for model in all_models {
        if model.model_path.contains(&model_name) {
            db.delete_model_record(model.id)
                .map_err(|e| format!("Failed to delete model from database: {}", e))?;
        }
    }
    
    Ok(format!("Model {} deleted successfully", model_name))
}

/// Generate response using Ollama model
#[tauri::command]
pub async fn ollama_generate(
    model_name: String,
    prompt: String,
    system_prompt: Option<String>,
) -> Result<String, String> {
    let client = reqwest::Client::new();
    
    #[derive(Serialize)]
    struct GenerateRequest {
        model: String,
        prompt: String,
        system: Option<String>,
        stream: bool,
    }
    
    #[derive(Deserialize)]
    struct GenerateResponse {
        response: String,
    }
    
    let request = GenerateRequest {
        model: model_name,
        prompt,
        system: system_prompt,
        stream: false,
    };
    
    let response = client
        .post("http://localhost:11434/api/generate")
        .json(&request)
        .send()
        .await
        .map_err(|e| format!("Failed to generate response: {}", e))?;
    
    if !response.status().is_success() {
        return Err(format!("Ollama API error: {}", response.status()));
    }
    
    let result: GenerateResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;
    
    Ok(result.response)
}

/// Get model information
#[tauri::command]
pub async fn ollama_get_model_info(model_name: String) -> Result<String, String> {
    let client = reqwest::Client::new();
    
    #[derive(Serialize)]
    struct ShowRequest {
        name: String,
    }
    
    let request = ShowRequest {
        name: model_name.clone(),
    };
    
    let response = client
        .post("http://localhost:11434/api/show")
        .json(&request)
        .send()
        .await
        .map_err(|e| format!("Failed to get model info: {}", e))?;
    
    if !response.status().is_success() {
        return Err(format!("Failed to get model info: {}", response.status()));
    }
    
    let info = response
        .text()
        .await
        .map_err(|e| format!("Failed to read response: {}", e))?;
    
    Ok(info)
}

/// Get Ollama resource usage
#[tauri::command]
pub fn get_ollama_resource_usage() -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        let output = Command::new("tasklist")
            .args(&["/FI", "IMAGENAME eq ollama.exe", "/FO", "CSV"])
            .output()
            .map_err(|e| format!("Failed to get resource usage: {}", e))?;
        
        let output_str = String::from_utf8_lossy(&output.stdout);
        Ok(output_str.to_string())
    }
    
    #[cfg(not(target_os = "windows"))]
    {
        let output = Command::new("ps")
            .args(&["-C", "ollama", "-o", "pid,pcpu,pmem,vsz,rss,comm"])
            .output()
            .map_err(|e| format!("Failed to get resource usage: {}", e))?;
        
        let output_str = String::from_utf8_lossy(&output.stdout);
        Ok(output_str.to_string())
    }
}
