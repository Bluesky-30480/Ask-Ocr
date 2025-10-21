// Screenshot Capture Module
// Handles screen capture functionality for OCR

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};
use screenshots::Screen;
use image::DynamicImage;
use base64::{Engine as _, engine::general_purpose};

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
    match capture_screen_internal(None) {
        Ok(image_data) => Ok(ScreenshotResult {
            success: true,
            image_data: Some(image_data),
            image_path: None,
            error: None,
        }),
        Err(e) => Ok(ScreenshotResult {
            success: false,
            image_data: None,
            image_path: None,
            error: Some(e),
        }),
    }
}

/// Capture active window
#[tauri::command]
pub async fn capture_window(_app: AppHandle) -> Result<ScreenshotResult, String> {
    // Note: screenshots-rs doesn't have native window capture
    // We'll capture fullscreen - in production could use platform-specific APIs
    match capture_screen_internal(None) {
        Ok(image_data) => Ok(ScreenshotResult {
            success: true,
            image_data: Some(image_data),
            image_path: None,
            error: None,
        }),
        Err(e) => Ok(ScreenshotResult {
            success: false,
            image_data: None,
            image_path: None,
            error: Some(format!("Failed to capture window: {}", e)),
        }),
    }
}

/// Capture specific region
#[tauri::command]
pub async fn capture_region(
    _app: AppHandle,
    region: ScreenshotRegion,
) -> Result<ScreenshotResult, String> {
    println!(
        "Capturing region: x={}, y={}, w={}, h={}",
        region.x, region.y, region.width, region.height
    );

    match capture_screen_internal(Some(region)) {
        Ok(image_data) => Ok(ScreenshotResult {
            success: true,
            image_data: Some(image_data),
            image_path: None,
            error: None,
        }),
        Err(e) => Ok(ScreenshotResult {
            success: false,
            image_data: None,
            image_path: None,
            error: Some(format!("Failed to capture region: {}", e)),
        }),
    }
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

// ============================================================================
// Internal Helper Functions
// ============================================================================

/// Internal function to capture screen
fn capture_screen_internal(region: Option<ScreenshotRegion>) -> Result<String, String> {
    // Get all screens
    let screens = Screen::all().map_err(|e| format!("Failed to get screens: {}", e))?;
    
    // Get primary screen (first screen)
    let screen = screens.first()
        .ok_or_else(|| "No screens found".to_string())?;
    
    // Capture the screen
    let image = screen.capture()
        .map_err(|e| format!("Failed to capture screen: {}", e))?;
    
    // Convert to DynamicImage (image is already ImageBuffer<Rgba<u8>, Vec<u8>>)
    let mut dynamic_image = DynamicImage::ImageRgba8(image);
    
    // Crop to region if specified
    if let Some(reg) = region {
        dynamic_image = dynamic_image.crop(
            reg.x as u32,
            reg.y as u32,
            reg.width,
            reg.height
        );
    }
    
    // Convert to PNG bytes
    let mut png_bytes: Vec<u8> = Vec::new();
    dynamic_image.write_to(
        &mut std::io::Cursor::new(&mut png_bytes),
        image::ImageOutputFormat::Png
    ).map_err(|e| format!("Failed to encode PNG: {}", e))?;
    
    // Convert to base64
    let base64_data = general_purpose::STANDARD.encode(&png_bytes);
    let data_url = format!("data:image/png;base64,{}", base64_data);
    
    Ok(data_url)
}
