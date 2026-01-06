use std::fs;
use std::path::Path;
use tauri::command;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileOperationResult {
    pub success: bool,
    pub message: Option<String>,
    pub path: String,
}

#[command]
pub async fn rename_file(path: String, new_name: String) -> Result<FileOperationResult, String> {
    let old_path = Path::new(&path);
    if !old_path.exists() {
        return Err("File not found".to_string());
    }

    let parent = old_path.parent().ok_or("Invalid path")?;
    let new_path = parent.join(&new_name);

    if new_path.exists() {
        return Err("A file with that name already exists".to_string());
    }

    match fs::rename(old_path, &new_path) {
        Ok(_) => Ok(FileOperationResult {
            success: true,
            message: None,
            path: new_path.to_string_lossy().to_string(),
        }),
        Err(e) => Err(format!("Failed to rename file: {}", e)),
    }
}
