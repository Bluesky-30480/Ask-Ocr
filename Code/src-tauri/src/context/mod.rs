/**
 * Context Detection Module
 * Platform-specific active window and application context detection
 */

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WindowInfo {
    pub process_name: String,
    pub window_title: String,
    pub executable: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BrowserContextData {
    pub url: Option<String>,
    pub title: Option<String>,
    pub selected_text: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EditorContextData {
    pub file_path: Option<String>,
    pub file_name: Option<String>,
    pub language: Option<String>,
    pub selected_code: Option<String>,
    pub project_path: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OfficeContextData {
    pub document_path: Option<String>,
    pub document_name: Option<String>,
    pub selected_text: Option<String>,
    pub current_slide: Option<i32>,
    pub active_cell: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileExplorerContextData {
    pub current_path: String,
    pub selected_files: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TerminalContextData {
    pub current_directory: Option<String>,
    pub last_command: Option<String>,
    pub shell_type: Option<String>,
}

// Platform-specific implementations
#[cfg(target_os = "windows")]
mod windows;

#[cfg(target_os = "macos")]
mod macos;

#[cfg(target_os = "linux")]
mod linux;

// Tauri commands
#[tauri::command]
pub async fn get_active_window_info() -> Result<WindowInfo, String> {
    #[cfg(target_os = "windows")]
    return windows::get_active_window_info().await;

    #[cfg(target_os = "macos")]
    return macos::get_active_window_info().await;

    #[cfg(target_os = "linux")]
    return linux::get_active_window_info().await;

    #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
    Err("Unsupported platform".to_string())
}

#[tauri::command]
pub async fn get_browser_context(process_name: String) -> Result<BrowserContextData, String> {
    #[cfg(target_os = "windows")]
    return windows::get_browser_context(&process_name).await;

    #[cfg(target_os = "macos")]
    return macos::get_browser_context(&process_name).await;

    #[cfg(target_os = "linux")]
    return linux::get_browser_context(&process_name).await;

    #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
    Err("Unsupported platform".to_string())
}

#[tauri::command]
pub async fn get_editor_context(process_name: String) -> Result<EditorContextData, String> {
    #[cfg(target_os = "windows")]
    return windows::get_editor_context(&process_name).await;

    #[cfg(target_os = "macos")]
    return macos::get_editor_context(&process_name).await;

    #[cfg(target_os = "linux")]
    return linux::get_editor_context(&process_name).await;

    #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
    Err("Unsupported platform".to_string())
}

#[tauri::command]
pub async fn get_office_context(
    process_name: String,
    app_type: String,
) -> Result<OfficeContextData, String> {
    #[cfg(target_os = "windows")]
    return windows::get_office_context(&process_name, &app_type).await;

    #[cfg(target_os = "macos")]
    return macos::get_office_context(&process_name, &app_type).await;

    #[cfg(target_os = "linux")]
    return linux::get_office_context(&process_name, &app_type).await;

    #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
    Err("Unsupported platform".to_string())
}

#[tauri::command]
pub async fn get_file_explorer_context() -> Result<FileExplorerContextData, String> {
    #[cfg(target_os = "windows")]
    return windows::get_file_explorer_context().await;

    #[cfg(target_os = "macos")]
    return macos::get_file_explorer_context().await;

    #[cfg(target_os = "linux")]
    return linux::get_file_explorer_context().await;

    #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
    Err("Unsupported platform".to_string())
}

#[tauri::command]
pub async fn get_terminal_context(process_name: String) -> Result<TerminalContextData, String> {
    #[cfg(target_os = "windows")]
    return windows::get_terminal_context(&process_name).await;

    #[cfg(target_os = "macos")]
    return macos::get_terminal_context(&process_name).await;

    #[cfg(target_os = "linux")]
    return linux::get_terminal_context(&process_name).await;

    #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
    Err("Unsupported platform".to_string())
}

#[tauri::command]
pub async fn get_selected_text() -> Result<Option<String>, String> {
    #[cfg(target_os = "windows")]
    return windows::get_selected_text().await;

    #[cfg(target_os = "macos")]
    return macos::get_selected_text().await;

    #[cfg(target_os = "linux")]
    return linux::get_selected_text().await;

    #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
    Err("Unsupported platform".to_string())
}
