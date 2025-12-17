use tauri::Window;
use serde::{Deserialize, Serialize};
use reqwest::Client;
use futures_util::StreamExt;

#[derive(Debug, Serialize, Deserialize)]
pub struct OllamaModel {
    pub name: String,
    pub size: u64,
    pub digest: String,
    pub modified_at: String,
    pub details: Option<OllamaModelDetails>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct OllamaModelDetails {
    pub format: String,
    pub family: String,
    pub families: Option<Vec<String>>,
    pub parameter_size: String,
    pub quantization_level: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct OllamaListResponse {
    models: Vec<OllamaModel>,
}

#[derive(Debug, Serialize, Deserialize)]
struct PullRequest {
    name: String,
    stream: bool,
}

#[derive(Debug, Deserialize)]
struct PullResponse {
    status: String,
    digest: Option<String>,
    total: Option<u64>,
    completed: Option<u64>,
    error: Option<String>,
}

#[derive(Debug, Serialize, Clone)]
struct DownloadProgress {
    status: String,
    progress: f64,
    downloaded_bytes: u64,
    total_bytes: u64,
    error: Option<String>,
}

#[tauri::command]
pub async fn ollama_list_models() -> Result<Vec<OllamaModel>, String> {
    let client = Client::new();
    let res = client.get("http://localhost:11434/api/tags")
        .send()
        .await
        .map_err(|e| format!("Failed to connect to Ollama: {}", e))?;

    if !res.status().is_success() {
        return Err(format!("Ollama API error: {}", res.status()));
    }

    let response: OllamaListResponse = res.json()
        .await
        .map_err(|e| format!("Failed to parse Ollama response: {}", e))?;

    Ok(response.models)
}

#[tauri::command]
pub async fn ollama_pull_model(window: Window, model_name: String) -> Result<(), String> {
    let client = Client::new();
    let request = PullRequest {
        name: model_name.clone(),
        stream: true,
    };

    let mut stream = client.post("http://localhost:11434/api/pull")
        .json(&request)
        .send()
        .await
        .map_err(|e| format!("Failed to start pull: {}", e))?
        .bytes_stream();

    while let Some(item) = stream.next().await {
        let chunk = item.map_err(|e| format!("Stream error: {}", e))?;
        let chunk_str = String::from_utf8_lossy(&chunk);
        
        // Ollama might send multiple JSON objects in one chunk
        for line in chunk_str.lines() {
            if line.trim().is_empty() { continue; }
            
            if let Ok(response) = serde_json::from_str::<PullResponse>(line) {
                if let Some(error) = response.error {
                    return Err(error);
                }

                let mut progress = 0.0;
                let mut downloaded = 0;
                let mut total = 0;

                if let (Some(c), Some(t)) = (response.completed, response.total) {
                    if t > 0 {
                        progress = (c as f64 / t as f64) * 100.0;
                        downloaded = c;
                        total = t;
                    }
                }

                let progress_event = DownloadProgress {
                    status: response.status,
                    progress,
                    downloaded_bytes: downloaded,
                    total_bytes: total,
                    error: None,
                };

                // Emit event to frontend
                // Event name: "ollama-download-progress-{model_name}"
                // But dynamic event names are harder to listen to. 
                // Better to use a generic event with model name in payload.
                // However, the frontend service expects a callback.
                // Let's emit "ollama-progress" with model name.
                
                window.emit("ollama-progress", serde_json::json!({
                    "model": model_name,
                    "data": progress_event
                })).map_err(|e| format!("Failed to emit event: {}", e))?;
            }
        }
    }

    Ok(())
}

#[derive(Debug, Serialize, Deserialize)]
struct DeleteRequest {
    name: String,
}

#[tauri::command]
pub async fn ollama_delete_model(model_name: String) -> Result<(), String> {
    let client = Client::new();
    let request = DeleteRequest {
        name: model_name,
    };

    let res = client.delete("http://localhost:11434/api/delete")
        .json(&request)
        .send()
        .await
        .map_err(|e| format!("Failed to connect to Ollama: {}", e))?;

    if !res.status().is_success() {
        return Err(format!("Ollama API error: {}", res.status()));
    }

    Ok(())
}
