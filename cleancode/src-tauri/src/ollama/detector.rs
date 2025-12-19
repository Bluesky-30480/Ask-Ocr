use std::process::Command;

/// Check if Ollama is installed on the system
#[tauri::command]
pub fn check_ollama_installed() -> bool {
    #[cfg(target_os = "windows")]
    {
        check_ollama_windows()
    }

    #[cfg(target_os = "macos")]
    {
        check_ollama_macos()
    }

    #[cfg(target_os = "linux")]
    {
        check_ollama_linux()
    }
}

#[cfg(target_os = "windows")]
fn check_ollama_windows() -> bool {
    // Check if ollama.exe exists in PATH
    if let Ok(output) = Command::new("where").arg("ollama").output() {
        if output.status.success() {
            return true;
        }
    }

    // Check common installation paths
    let user_profile_path = format!(r"{}\AppData\Local\Programs\Ollama\ollama.exe", 
                                     std::env::var("USERPROFILE").unwrap_or_default());
    
    let common_paths = vec![
        r"C:\Program Files\Ollama\ollama.exe",
        r"C:\Program Files (x86)\Ollama\ollama.exe",
        &user_profile_path,
    ];

    for path in common_paths {
        if std::path::Path::new(&path).exists() {
            return true;
        }
    }

    false
}

#[cfg(target_os = "macos")]
fn check_ollama_macos() -> bool {
    // Check if ollama exists in PATH
    if let Ok(output) = Command::new("which").arg("ollama").output() {
        if output.status.success() {
            return true;
        }
    }

    // Check if Ollama.app exists
    let app_path = "/Applications/Ollama.app";
    if std::path::Path::new(app_path).exists() {
        return true;
    }

    // Check user Applications folder
    if let Ok(home) = std::env::var("HOME") {
        let user_app_path = format!("{}/Applications/Ollama.app", home);
        if std::path::Path::new(&user_app_path).exists() {
            return true;
        }
    }

    false
}

#[cfg(target_os = "linux")]
fn check_ollama_linux() -> bool {
    // Check if ollama exists in PATH
    if let Ok(output) = Command::new("which").arg("ollama").output() {
        if output.status.success() {
            return true;
        }
    }

    // Check common installation paths
    let common_paths = vec![
        "/usr/local/bin/ollama",
        "/usr/bin/ollama",
        format!("{}/.local/bin/ollama", 
                std::env::var("HOME").unwrap_or_default()),
    ];

    for path in common_paths {
        if std::path::Path::new(&path).exists() {
            return true;
        }
    }

    false
}

/// Get Ollama installation path
#[tauri::command]
pub fn get_ollama_path() -> Option<String> {
    #[cfg(target_os = "windows")]
    {
        get_ollama_path_windows()
    }

    #[cfg(target_os = "macos")]
    {
        get_ollama_path_macos()
    }

    #[cfg(target_os = "linux")]
    {
        get_ollama_path_linux()
    }
}

#[cfg(target_os = "windows")]
fn get_ollama_path_windows() -> Option<String> {
    if let Ok(output) = Command::new("where").arg("ollama").output() {
        if output.status.success() {
            if let Ok(path) = String::from_utf8(output.stdout) {
                return Some(path.trim().to_string());
            }
        }
    }
    None
}

#[cfg(target_os = "macos")]
fn get_ollama_path_macos() -> Option<String> {
    if let Ok(output) = Command::new("which").arg("ollama").output() {
        if output.status.success() {
            if let Ok(path) = String::from_utf8(output.stdout) {
                return Some(path.trim().to_string());
            }
        }
    }
    None
}

#[cfg(target_os = "linux")]
fn get_ollama_path_linux() -> Option<String> {
    if let Ok(output) = Command::new("which").arg("ollama").output() {
        if output.status.success() {
            if let Ok(path) = String::from_utf8(output.stdout) {
                return Some(path.trim().to_string());
            }
        }
    }
    None
}

/// Check if Ollama service is running
#[tauri::command]
pub async fn check_ollama_running() -> bool {
    // Try to connect to Ollama API
    match reqwest::get("http://localhost:11434/").await {
        Ok(response) => response.status().is_success(),
        Err(_) => false,
    }
}

/// Start Ollama service
#[tauri::command]
pub fn start_ollama_service() -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        start_ollama_windows()
    }

    #[cfg(target_os = "macos")]
    {
        start_ollama_macos()
    }

    #[cfg(target_os = "linux")]
    {
        start_ollama_linux()
    }
}

#[cfg(target_os = "windows")]
fn start_ollama_windows() -> Result<(), String> {
    // Try to start Ollama service
    match Command::new("net").args(&["start", "Ollama"]).output() {
        Ok(output) => {
            if output.status.success() {
                Ok(())
            } else {
                // If service doesn't exist, try to run ollama.exe directly
                match Command::new("ollama").arg("serve").spawn() {
                    Ok(_) => Ok(()),
                    Err(e) => Err(format!("Failed to start Ollama: {}", e)),
                }
            }
        }
        Err(e) => Err(format!("Failed to start Ollama service: {}", e)),
    }
}

#[cfg(target_os = "macos")]
fn start_ollama_macos() -> Result<(), String> {
    // Try to open Ollama.app
    match Command::new("open").arg("-a").arg("Ollama").spawn() {
        Ok(_) => Ok(()),
        Err(e) => {
            // Try to run ollama serve directly
            match Command::new("ollama").arg("serve").spawn() {
                Ok(_) => Ok(()),
                Err(_) => Err(format!("Failed to start Ollama: {}", e)),
            }
        }
    }
}

#[cfg(target_os = "linux")]
fn start_ollama_linux() -> Result<(), String> {
    // Try to start ollama service
    match Command::new("systemctl").args(&["--user", "start", "ollama"]).output() {
        Ok(output) => {
            if output.status.success() {
                Ok(())
            } else {
                // Try to run ollama serve directly
                match Command::new("ollama").arg("serve").spawn() {
                    Ok(_) => Ok(()),
                    Err(e) => Err(format!("Failed to start Ollama: {}", e)),
                }
            }
        }
        Err(e) => Err(format!("Failed to start Ollama service: {}", e)),
    }
}
