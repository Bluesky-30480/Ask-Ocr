// Shortcut Management Module
// Handles global keyboard shortcut registration and conflict detection

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Mutex;
use tauri::{AppHandle, GlobalShortcutManager, Manager};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ShortcutConfig {
    pub id: String,
    pub accelerator: String,
    pub description: String,
    pub enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ShortcutRegistrationResult {
    pub success: bool,
    pub shortcut_id: String,
    pub error: Option<String>,
}

// Global state to track registered shortcuts
pub struct ShortcutState {
    pub shortcuts: Mutex<HashMap<String, ShortcutConfig>>,
}

impl ShortcutState {
    pub fn new() -> Self {
        Self {
            shortcuts: Mutex::new(HashMap::new()),
        }
    }
}

/// Register a global shortcut
#[tauri::command]
pub fn register_shortcut(
    app: AppHandle,
    shortcut_id: String,
    accelerator: String,
    description: String,
) -> Result<ShortcutRegistrationResult, String> {
    let mut manager = app.global_shortcut_manager();
    let state: tauri::State<ShortcutState> = app.state();

    // Check if shortcut is already registered
    if manager.is_registered(&accelerator).map_err(|e| e.to_string())? {
        return Ok(ShortcutRegistrationResult {
            success: false,
            shortcut_id: shortcut_id.clone(),
            error: Some(format!("Shortcut '{}' is already registered", accelerator)),
        });
    }

    // Clone values for the closure
    let app_clone = app.clone();
    let shortcut_id_clone = shortcut_id.clone();

    // Register the shortcut
    manager
        .register(&accelerator, move || {
            // Emit event to frontend when shortcut is triggered
            app_clone
                .emit_all("shortcut-triggered", &shortcut_id_clone)
                .unwrap();
        })
        .map_err(|e| format!("Failed to register shortcut: {}", e))?;

    // Store shortcut config in state
    let config = ShortcutConfig {
        id: shortcut_id.clone(),
        accelerator: accelerator.clone(),
        description,
        enabled: true,
    };

    state
        .shortcuts
        .lock()
        .unwrap()
        .insert(shortcut_id.clone(), config);

    Ok(ShortcutRegistrationResult {
        success: true,
        shortcut_id,
        error: None,
    })
}

/// Unregister a global shortcut
#[tauri::command]
pub fn unregister_shortcut(app: AppHandle, shortcut_id: String) -> Result<bool, String> {
    let mut manager = app.global_shortcut_manager();
    let state: tauri::State<ShortcutState> = app.state();

    // Get the accelerator from state
    let accelerator = {
        let shortcuts = state.shortcuts.lock().unwrap();
        shortcuts
            .get(&shortcut_id)
            .map(|config| config.accelerator.clone())
    };

    if let Some(acc) = accelerator {
        // Unregister the shortcut
        manager
            .unregister(&acc)
            .map_err(|e| format!("Failed to unregister shortcut: {}", e))?;

        // Remove from state
        state.shortcuts.lock().unwrap().remove(&shortcut_id);

        Ok(true)
    } else {
        Err(format!("Shortcut '{}' not found", shortcut_id))
    }
}

/// Unregister all shortcuts
#[tauri::command]
pub fn unregister_all_shortcuts(app: AppHandle) -> Result<usize, String> {
    let mut manager = app.global_shortcut_manager();
    let state: tauri::State<ShortcutState> = app.state();

    // Get all accelerators
    let accelerators: Vec<String> = {
        let shortcuts = state.shortcuts.lock().unwrap();
        shortcuts
            .values()
            .map(|config| config.accelerator.clone())
            .collect()
    };

    let count = accelerators.len();

    // Unregister each shortcut
    for acc in accelerators {
        manager
            .unregister(&acc)
            .map_err(|e| format!("Failed to unregister shortcut {}: {}", acc, e))?;
    }

    // Clear state
    state.shortcuts.lock().unwrap().clear();

    Ok(count)
}

/// Get all registered shortcuts
#[tauri::command]
pub fn get_registered_shortcuts(app: AppHandle) -> Result<Vec<ShortcutConfig>, String> {
    let state: tauri::State<ShortcutState> = app.state();
    let shortcuts = state.shortcuts.lock().unwrap();

    Ok(shortcuts.values().cloned().collect())
}

/// Check if a shortcut is available (not already registered)
#[tauri::command]
pub fn is_shortcut_available(app: AppHandle, accelerator: String) -> Result<bool, String> {
    let manager = app.global_shortcut_manager();

    Ok(!manager
        .is_registered(&accelerator)
        .map_err(|e| e.to_string())?)
}

/// Update an existing shortcut (unregister old, register new)
#[tauri::command]
pub fn update_shortcut(
    app: AppHandle,
    shortcut_id: String,
    new_accelerator: String,
) -> Result<ShortcutRegistrationResult, String> {
    // Unregister the old shortcut
    unregister_shortcut(app.clone(), shortcut_id.clone())?;

    // Get the description from the old config (before it was removed)
    let description = format!("Updated shortcut for {}", shortcut_id);

    // Register with new accelerator
    register_shortcut(app, shortcut_id, new_accelerator, description)
}
