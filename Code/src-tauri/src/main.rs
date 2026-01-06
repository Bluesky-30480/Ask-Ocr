// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// Modules
mod shortcuts;
mod screenshot;
mod database;
mod context;
mod tray;
mod window_manager;
mod ollama;
mod ocr;
mod file_search;
mod file_operations;
mod file_helpers;
mod music;
mod player;
mod audio_ai;

use shortcuts::ShortcutState;
use database::Database;
use tauri::Manager;

// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! Welcome to Bluesky!", name)
}

fn main() {
    // Create system tray
    let system_tray = tray::create_system_tray();
    
    tauri::Builder::default()
        .system_tray(system_tray)
        .on_system_tray_event(tray::handle_system_tray_event)
        .manage(ShortcutState::new())
        .manage(player::AudioPlayer::new())
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
            screenshot::capture_with_snipping_tool,
            screenshot::capture_region_native,
            screenshot::show_screenshot_overlay,
            screenshot::hide_screenshot_overlay,
            // Window management
            window_manager::create_ocr_popup,
            window_manager::update_ocr_popup,
            window_manager::close_popup,
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
            // Database commands - Migrations
            database::get_database_version,
            database::get_migration_history,
            // Context detection commands
            context::get_active_window_info,
            context::get_browser_context,
            context::get_editor_context,
            context::get_office_context,
            context::get_file_explorer_context,
            context::get_terminal_context,
            context::get_selected_text,
            // System tray commands
            tray::tray_set_tooltip,
            tray::tray_set_offline_mode,
            tray::tray_update_recent_captures,
            tray::show_main_window,
            tray::hide_main_window,
            tray::toggle_main_window,
            // Window manager commands
            window_manager::create_ocr_popup,
            window_manager::close_popup,
            // OCR commands
            ocr::perform_ocr_native,
            // Ollama commands
            ollama::check_ollama_installed,
            // File Search commands
            file_search::search_files,
            file_search::read_file_content,
            // File Operations commands
            file_operations::rename_file,
            file_search::get_file_metadata,
            // File Helpers
            file_helpers::convert_media_file,
            file_helpers::get_media_info,
            file_helpers::mux_streams,
            file_helpers::merge_files,
            file_helpers::extract_audio,
            file_helpers::compress_video,
            file_helpers::trim_video,
            file_helpers::batch_convert,
            file_helpers::show_in_folder,
            // Music commands
            music::scan_music_folder,
            music::get_album_art,
            music::download_spotify,
            // Audio Player commands
            player::play_audio,
            player::pause_audio,
            player::resume_audio,
            player::stop_audio,
            player::set_volume,
            player::seek_audio,
            music::import_songs,
            database::add_song_to_db,
            database::get_all_songs,
            database::create_playlist,
            database::get_playlists,
            database::add_song_to_playlist,
            database::get_playlist_songs,
            database::toggle_like_song,
            ollama::get_ollama_path,
            ollama::check_ollama_running,
            ollama::start_ollama_service,
            ollama::download_ollama,
            ollama::install_ollama,
            ollama::install_ollama_one_click,
            ollama::verify_ollama_installation,
            ollama::ollama_list_models,
            ollama::ollama_pull_model,
            ollama::ollama_delete_model,
            ollama::ollama_generate,
            ollama::ollama_generate_stream,
            // Audio AI commands
            audio_ai::debug_python_env,
            audio_ai::check_ai_models,
            audio_ai::download_whisper_model,
            audio_ai::download_diarization_model,
            audio_ai::download_denoiser_model,
            audio_ai::cancel_model_download,
            audio_ai::transcribe_audio,
            audio_ai::transcribe_with_diarization,
            audio_ai::export_speaker_srt,
            audio_ai::export_all_speakers_srt,
            audio_ai::extract_speaker_audio,
            audio_ai::remove_background_noise,
            audio_ai::denoise_audio_ffmpeg,
            audio_ai::run_ffmpeg_command,
            audio_ai::generate_ffmpeg_command,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
