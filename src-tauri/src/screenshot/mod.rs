// Screenshot Capture Module
// Handles screen capture functionality for OCR

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScreenshotRegion {
    pub x: i32,
    pub y: i32,
    pub width: u32,
    pub height: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScreenshotResult {
    pub success: bool,
    pub image_data: Option<String>, // base64 encoded
    pub image_path: Option<String>,
    pub error: Option<String>,
}

#[allow(dead_code)] // Will be used for screenshot mode selection UI
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum ScreenshotMode {
    #[serde(rename = "fullscreen")]
    Fullscreen,
    #[serde(rename = "window")]
    Window,
    #[serde(rename = "region")]
    Region { region: ScreenshotRegion },
}

/// Capture full screen
#[tauri::command]
pub async fn capture_fullscreen(_app: AppHandle) -> Result<ScreenshotResult, String> {
    // TODO: Implement actual screenshot capture
    // For now, return a placeholder
    // 
    // Implementation notes:
    // - Use screenshots-rs crate or similar for cross-platform capture
    // - Convert captured image to base64
    // - Handle multi-monitor scenarios
    // - Consider DPI scaling on Windows
    
    Ok(ScreenshotResult {
        success: false,
        image_data: None,
        image_path: None,
        error: Some("Screenshot capture not yet implemented".to_string()),
    })
}

/// Capture active window
#[tauri::command]
pub async fn capture_window(_app: AppHandle) -> Result<ScreenshotResult, String> {
    // TODO: Implement window capture
    // 
    // Implementation notes:
    // - Get active window handle
    // - Capture window contents
    // - Handle window decorations (optional)
    // - Support both Windows and macOS window APIs
    
    Ok(ScreenshotResult {
        success: false,
        image_data: None,
        image_path: None,
        error: Some("Window capture not yet implemented".to_string()),
    })
}

/// Capture specific region
#[tauri::command]
pub async fn capture_region(
    _app: AppHandle,
    region: ScreenshotRegion,
) -> Result<ScreenshotResult, String> {
    // TODO: Implement region capture
    // 
    // Implementation notes:
    // - Show selection UI overlay
    // - Capture specified region
    // - Handle coordinates across multiple monitors
    // - Return base64 encoded image
    
    println!(
        "Capturing region: x={}, y={}, w={}, h={}",
        region.x, region.y, region.width, region.height
    );

    Ok(ScreenshotResult {
        success: false,
        image_data: None,
        image_path: None,
        error: Some("Region capture not yet implemented".to_string()),
    })
}

/// Show screenshot overlay for region selection
#[tauri::command]
pub async fn show_screenshot_overlay(app: AppHandle) -> Result<(), String> {
    // TODO: Create transparent overlay window
    // 
    // Implementation notes:
    // - Create new frameless, transparent window
    // - Cover entire screen (or all screens)
    // - Handle mouse events for region selection
    // - Draw selection rectangle
    // - Emit event when selection is complete
    
    println!("Screenshot overlay requested");
    
    // For now, just emit an event to frontend
    app.emit_all("screenshot-overlay-requested", ())
        .map_err(|e| e.to_string())?;

    Ok(())
}

/// Hide screenshot overlay
#[tauri::command]
pub async fn hide_screenshot_overlay(app: AppHandle) -> Result<(), String> {
    app.emit_all("screenshot-overlay-close", ())
        .map_err(|e| e.to_string())?;

    Ok(())
}
