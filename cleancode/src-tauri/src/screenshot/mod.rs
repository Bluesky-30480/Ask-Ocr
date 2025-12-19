// Screenshot Capture Module
// Handles screen capture functionality for OCR

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager, WindowBuilder, WindowUrl};
use xcap::Monitor;
use image::DynamicImage;
use base64::{Engine as _, engine::general_purpose};
use std::process::Command;
use std::time::{Duration, Instant};
use std::thread;

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
    // Note: xcap doesn't have native window capture yet in this version
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
    // Create transparent overlay window
    let window_label = "screenshot_overlay";
    
    // Check if window already exists
    if let Some(window) = app.get_window(window_label) {
        window.show().map_err(|e| e.to_string())?;
        window.set_focus().map_err(|e| e.to_string())?;
        return Ok(());
    }

    // Create new fullscreen transparent window
    let window = WindowBuilder::new(
        &app,
        window_label,
        WindowUrl::App("index.html#/overlay".into()),
    )
    .title("Screenshot Overlay")
    .fullscreen(true)
    .transparent(true)
    .decorations(false)
    .always_on_top(true)
    .skip_taskbar(true)
    .resizable(false)
    .build()
    .map_err(|e| format!("Failed to create overlay window: {}", e))?;

    // Emit event to frontend to show overlay UI
    // We need to wait a bit for the window to be ready
    std::thread::sleep(std::time::Duration::from_millis(100));
    window.emit("screenshot-overlay-requested", ())
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

/// Capture using Windows Snipping Tool
#[tauri::command]
pub async fn capture_with_snipping_tool(_app: AppHandle) -> Result<ScreenshotResult, String> {
    #[cfg(target_os = "windows")]
    {
        // 1. Clear clipboard to ensure we get a new screenshot
        // We use a simple powershell command to clear since clipboard-win might be tricky with types
        let _ = Command::new("powershell")
            .args(&["-NoProfile", "-Command", "Set-Clipboard -Value ''"])
            .output();

        // 2. Launch Snipping Tool
        // "snippingtool /clip" launches the rectangular selection overlay directly
        Command::new("snippingtool")
            .arg("/clip")
            .spawn()
            .map_err(|e| format!("Failed to launch Snipping Tool: {}", e))?;

        // 3. Wait for clipboard to contain image
        wait_for_clipboard_image().await
    }

    #[cfg(not(target_os = "windows"))]
    {
        Err("Native snipping tool only supported on Windows".to_string())
    }
}

/// Capture using Windows Native URI Scheme (ms-screenclip)
/// This uses the modern Windows 10/11 API to trigger the region selector
#[tauri::command]
pub async fn capture_region_native(_app: AppHandle) -> Result<ScreenshotResult, String> {
    println!("[Rust] capture_region_native called");
    #[cfg(target_os = "windows")]
    {
        // 1. Clear clipboard
        println!("[Rust] Clearing clipboard...");
        let _ = Command::new("powershell")
            .args(&["-NoProfile", "-Command", "Set-Clipboard -Value ''"])
            .output();

        // 2. Launch Screen Snipping using protocol
        // This is the "API" way to trigger the system UI without launching the full app
        println!("[Rust] Launching ms-screenclip...");
        Command::new("cmd")
            .args(&["/C", "start", "ms-screenclip:?capturemode=rectangle"])
            .spawn()
            .map_err(|e| format!("Failed to launch Screen Snipping: {}", e))?;

        // 3. Wait for clipboard to contain image
        println!("[Rust] Waiting for clipboard image...");
        wait_for_clipboard_image().await
    }

    #[cfg(not(target_os = "windows"))]
    {
        Err("Native region capture only supported on Windows".to_string())
    }
}

async fn wait_for_clipboard_image() -> Result<ScreenshotResult, String> {
    // We'll poll for up to 60 seconds (user might take time to select)
    let start = Instant::now();
    let mut success = false;
    let mut image_data = None;
    
    // Initial delay to let snipping tool open
    thread::sleep(Duration::from_millis(1000));

    let mut attempt = 0;
    while start.elapsed() < Duration::from_secs(60) {
        attempt += 1;
        if attempt % 5 == 0 {
             println!("[Rust] Polling clipboard... ({}s elapsed)", start.elapsed().as_secs());
        }

        // Check if clipboard has image using PowerShell and get Base64
        let ps_script = r#"
            Add-Type -AssemblyName System.Windows.Forms
            if ([System.Windows.Forms.Clipboard]::ContainsImage()) {
                $ms = New-Object System.IO.MemoryStream
                $img = [System.Windows.Forms.Clipboard]::GetImage()
                $img.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
                $bytes = $ms.ToArray()
                $b64 = [Convert]::ToBase64String($bytes)
                Write-Output $b64
            }
        "#;

        // Use creation_flags to hide powershell window if possible, but standard Command doesn't expose it easily without os_specific
        // For now, standard spawn.
        let output = Command::new("powershell")
            .args(&["-NoProfile", "-Command", ps_script])
            .output();

        if let Ok(out) = output {
            let stdout = String::from_utf8_lossy(&out.stdout).trim().to_string();
            if !stdout.is_empty() {
                // We got the image!
                println!("[Rust] Image found in clipboard! Length: {}", stdout.len());
                image_data = Some(format!("data:image/png;base64,{}", stdout));
                success = true;
                
                // Clean up the duplicate file from Pictures/Screenshots
                cleanup_latest_screenshot();
                
                break;
            }
        } else {
             println!("[Rust] PowerShell command failed");
        }

        thread::sleep(Duration::from_millis(500));
    }

    if success {
            Ok(ScreenshotResult {
            success: true,
            image_data,
            image_path: None,
            error: None,
        })
    } else {
            println!("[Rust] Timed out waiting for clipboard image");
            Ok(ScreenshotResult {
            success: false,
            image_data: None,
            image_path: None,
            error: Some("Timed out waiting for screenshot or cancelled".to_string()),
        })
    }
}

// ============================================================================
// Internal Helper Functions
// ============================================================================

/// Internal function to capture screen
fn capture_screen_internal(region: Option<ScreenshotRegion>) -> Result<String, String> {
    // Get all monitors
    let monitors = Monitor::all().map_err(|e| format!("Failed to get monitors: {}", e))?;
    
    // Get primary monitor (first monitor)
    let monitor = monitors.first()
        .ok_or_else(|| "No monitors found".to_string())?;
    
    // Capture the screen
    let image = monitor.capture_image()
        .map_err(|e| format!("Failed to capture screen: {}", e))?;
    
    // Convert to DynamicImage (image is RgbaImage)
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
        image::ImageFormat::Png
    ).map_err(|e| format!("Failed to encode PNG: {}", e))?;
    
    // Convert to base64
    let base64_data = general_purpose::STANDARD.encode(&png_bytes);
    let data_url = format!("data:image/png;base64,{}", base64_data);
    
    Ok(data_url)
}

/// Helper to delete the latest screenshot from the user's Pictures/Screenshots folder
/// This prevents duplicates since we are saving the image to our own AppData folder
fn cleanup_latest_screenshot() {
    #[cfg(target_os = "windows")]
    {
        if let Ok(user_profile) = std::env::var("USERPROFILE") {
            let screenshots_dir = std::path::Path::new(&user_profile)
                .join("Pictures")
                .join("Screenshots");
            
            if screenshots_dir.exists() {
                if let Ok(entries) = std::fs::read_dir(screenshots_dir) {
                    let mut latest_file: Option<(std::path::PathBuf, std::time::SystemTime)> = None;
                    
                    for entry in entries.flatten() {
                        if let Ok(metadata) = entry.metadata() {
                            if let Ok(created) = metadata.created() {
                                if let Some((_, latest_time)) = latest_file {
                                    if created > latest_time {
                                        latest_file = Some((entry.path(), created));
                                    }
                                } else {
                                    latest_file = Some((entry.path(), created));
                                }
                            }
                        }
                    }
                    
                    if let Some((path, created)) = latest_file {
                        if let Ok(elapsed) = created.elapsed() {
                            // If created in the last 10 seconds
                            if elapsed.as_secs() < 10 {
                                println!("[Rust] Deleting duplicate screenshot: {:?}", path);
                                let _ = std::fs::remove_file(path);
                            }
                        }
                    }
                }
            }
        }
    }
}
