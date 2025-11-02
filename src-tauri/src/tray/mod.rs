/**
 * System Tray Module
 * Handles system tray icon, menu, and interactions
 */

use tauri::{
    AppHandle, CustomMenuItem, Manager, SystemTray, SystemTrayEvent, SystemTrayMenu,
    SystemTrayMenuItem, SystemTraySubmenu, Window,
};

/// Initialize system tray
pub fn create_system_tray() -> SystemTray {
    // Create menu items
    let show_hide = CustomMenuItem::new("show_hide".to_string(), "Show/Hide Window");
    let screenshot = CustomMenuItem::new("screenshot".to_string(), "Take Screenshot")
        .accelerator("Ctrl+Shift+S");
    let history = CustomMenuItem::new("history".to_string(), "Open History")
        .accelerator("Ctrl+H");
    let separator1 = SystemTrayMenuItem::Separator;
    
    // Recent captures submenu
    let recent_empty = CustomMenuItem::new("recent_empty".to_string(), "No recent captures").disabled();
    let recent_submenu = SystemTrayMenu::new()
        .add_item(recent_empty);
    let recent = SystemTraySubmenu::new("Recent Captures", recent_submenu);
    
    let separator2 = SystemTrayMenuItem::Separator;
    
    // Settings and model management
    let settings = CustomMenuItem::new("settings".to_string(), "Settings")
        .accelerator("Ctrl+,");
    let offline_mode = CustomMenuItem::new("offline_mode".to_string(), "Local-only Mode");
    let models = CustomMenuItem::new("models".to_string(), "Model Management");
    
    let separator3 = SystemTrayMenuItem::Separator;
    
    // Updates and help
    let updates = CustomMenuItem::new("updates".to_string(), "Check for Updates");
    let about = CustomMenuItem::new("about".to_string(), "About");
    
    let separator4 = SystemTrayMenuItem::Separator;
    let quit = CustomMenuItem::new("quit".to_string(), "Quit Ask OCR");
    
    // Build the menu
    let tray_menu = SystemTrayMenu::new()
        .add_item(show_hide)
        .add_item(screenshot)
        .add_item(history)
        .add_native_item(separator1)
        .add_submenu(recent)
        .add_native_item(separator2)
        .add_item(settings)
        .add_item(offline_mode)
        .add_item(models)
        .add_native_item(separator3)
        .add_item(updates)
        .add_item(about)
        .add_native_item(separator4)
        .add_item(quit);
    
    SystemTray::new().with_menu(tray_menu)
}

/// Handle system tray events
pub fn handle_system_tray_event(app: &AppHandle, event: SystemTrayEvent) {
    match event {
        SystemTrayEvent::LeftClick {
            position: _,
            size: _,
            ..
        } => {
            // On left click, show/hide main window
            if let Some(window) = app.get_window("main") {
                if window.is_visible().unwrap_or(false) {
                    let _ = window.hide();
                } else {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
        }
        SystemTrayEvent::MenuItemClick { id, .. } => {
            match id.as_str() {
                "show_hide" => {
                    if let Some(window) = app.get_window("main") {
                        if window.is_visible().unwrap_or(false) {
                            let _ = window.hide();
                        } else {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                }
                "screenshot" => {
                    // Trigger screenshot capture
                    if let Some(window) = app.get_window("main") {
                        let _ = window.emit("tray-screenshot", ());
                    }
                }
                "history" => {
                    // Open history page
                    if let Some(window) = app.get_window("main") {
                        let _ = window.show();
                        let _ = window.set_focus();
                        let _ = window.emit("navigate-to-history", ());
                    }
                }
                "settings" => {
                    // Open settings page
                    if let Some(window) = app.get_window("main") {
                        let _ = window.show();
                        let _ = window.set_focus();
                        let _ = window.emit("navigate-to-settings", ());
                    }
                }
                "offline_mode" => {
                    // Toggle offline mode
                    if let Some(window) = app.get_window("main") {
                        let _ = window.emit("toggle-offline-mode", ());
                    }
                }
                "models" => {
                    // Open model management
                    if let Some(window) = app.get_window("main") {
                        let _ = window.show();
                        let _ = window.set_focus();
                        let _ = window.emit("navigate-to-models", ());
                    }
                }
                "updates" => {
                    // Check for updates
                    if let Some(window) = app.get_window("main") {
                        let _ = window.emit("check-updates", ());
                    }
                }
                "about" => {
                    // Show about dialog
                    if let Some(window) = app.get_window("main") {
                        let _ = window.show();
                        let _ = window.set_focus();
                        let _ = window.emit("navigate-to-about", ());
                    }
                }
                "quit" => {
                    std::process::exit(0);
                }
                _ => {}
            }
        }
        _ => {}
    }
}

/// Tauri commands for tray management

#[tauri::command]
pub fn tray_set_tooltip(app: AppHandle, tooltip: String) -> Result<(), String> {
    app.tray_handle()
        .set_tooltip(&tooltip)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn tray_set_offline_mode(app: AppHandle, enabled: bool) -> Result<(), String> {
    let tray = app.tray_handle();
    let item = tray.get_item("offline_mode");
    
    if enabled {
        item.set_title("Local-only Mode ✓")
            .map_err(|e| e.to_string())?;
    } else {
        item.set_title("Local-only Mode")
            .map_err(|e| e.to_string())?;
    }
    
    Ok(())
}

#[tauri::command]
pub fn tray_update_recent_captures(
    app: AppHandle,
    _captures: Vec<RecentCapture>,
) -> Result<(), String> {
    let _tray = app.tray_handle();
    
    // Note: Tauri v1 doesn't support dynamic submenu updates
    // This would require rebuilding the entire tray menu
    // For now, we'll just acknowledge the request
    // In Tauri v2, this can be properly implemented
    
    Ok(())
}

#[tauri::command]
pub fn show_main_window(window: Window) -> Result<(), String> {
    window.show().map_err(|e| e.to_string())?;
    window.set_focus().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn hide_main_window(window: Window) -> Result<(), String> {
    window.hide().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn toggle_main_window(window: Window) -> Result<(), String> {
    if window.is_visible().map_err(|e| e.to_string())? {
        window.hide().map_err(|e| e.to_string())?;
    } else {
        window.show().map_err(|e| e.to_string())?;
        window.set_focus().map_err(|e| e.to_string())?;
    }
    Ok(())
}

// Helper struct for recent captures
#[derive(serde::Serialize, serde::Deserialize)]
pub struct RecentCapture {
    pub id: i64,
    pub timestamp: String,
    pub text: String,
}
