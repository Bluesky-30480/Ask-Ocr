// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// Modules
mod shortcuts;
mod screenshot;
mod database;

use shortcuts::ShortcutState;
use database::Database;
use tauri::Manager;

// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! Welcome to Ask OCR!", name)
}

fn main() {
    tauri::Builder::default()
        .manage(ShortcutState::new())
        .setup(|app| {
            // Initialize database
            let db_path = database::get_database_path(&app.handle());
            let db = Database::new(db_path)
                .expect("Failed to initialize database");
            app.manage(db);
            Ok(())
        })
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
            // Database commands - OCR Records
            database::create_ocr_record,
            database::get_ocr_record,
            database::get_all_ocr_records,
            database::update_ocr_record,
            database::delete_ocr_record,
            // Database commands - Model Records
            database::create_model_record,
            database::get_all_model_records,
            database::delete_model_record,
            // Database commands - Settings
            database::set_setting,
            database::get_setting,
            database::get_all_settings,
            database::delete_setting,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
