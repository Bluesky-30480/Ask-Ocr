// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// Modules
mod shortcuts;
mod screenshot;

use shortcuts::ShortcutState;

// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! Welcome to Ask OCR!", name)
}

fn main() {
    tauri::Builder::default()
        .manage(ShortcutState::new())
        .invoke_handler(tauri::generate_handler![
            greet,
            // Shortcut commands
            shortcuts::register_shortcut,
            shortcuts::unregister_shortcut,
            shortcuts::unregister_all_shortcuts,
            shortcuts::get_registered_shortcuts,
            shortcuts::is_shortcut_available,
            shortcuts::update_shortcut,
            // Screenshot commands
            screenshot::capture_fullscreen,
            screenshot::capture_window,
            screenshot::capture_region,
            screenshot::show_screenshot_overlay,
            screenshot::hide_screenshot_overlay,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
