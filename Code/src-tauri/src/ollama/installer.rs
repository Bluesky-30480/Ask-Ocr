use std::path::PathBuf;
use std::fs;
use std::process::Command;
use serde::{Deserialize, Serialize};
use tauri::Window;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InstallProgress {
    pub stage: String,
    pub progress: f32,
    pub message: String,
    pub error: Option<String>,
}

/// Get the Ollama download URL for the current platform
fn get_ollama_download_url() -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        Ok("https://ollama.com/download/OllamaSetup.exe".to_string())
    }

    #[cfg(target_os = "macos")]
    {
        // Detect architecture
        let arch = std::env::consts::ARCH;
        if arch == "aarch64" {
            Ok("https://ollama.com/download/Ollama-darwin-arm64.zip".to_string())
        } else {
            Ok("https://ollama.com/download/Ollama-darwin.zip".to_string())
        }
    }

    #[cfg(target_os = "linux")]
    {
        // Linux uses a shell script installer
        Ok("https://ollama.com/install.sh".to_string())
    }

    #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
    {
        Err("Unsupported platform".to_string())
    }
}

/// Get the temporary download path
fn get_download_path() -> Result<PathBuf, String> {
    let temp_dir = std::env::temp_dir();
    
    #[cfg(target_os = "windows")]
    let filename = "OllamaSetup.exe";
    
    #[cfg(target_os = "macos")]
    let filename = "Ollama-darwin.zip";
    
    #[cfg(target_os = "linux")]
    let filename = "ollama-install.sh";
    
    Ok(temp_dir.join(filename))
}

/// Download Ollama installer with progress tracking
#[tauri::command]
pub async fn download_ollama(window: Window) -> Result<String, String> {
    let url = get_ollama_download_url()?;
    let download_path = get_download_path()?;

    // Emit initial progress
    let _ = window.emit("ollama-install-progress", InstallProgress {
        stage: "downloading".to_string(),
        progress: 0.0,
        message: "Starting download...".to_string(),
        error: None,
    });

    // Create HTTP client
    let client = reqwest::Client::new();
    
    // Start download
    let response = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("Failed to start download: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("Download failed with status: {}", response.status()));
    }

    // Get total size
    let total_size = response.content_length().unwrap_or(0);

    // Download with progress
    let mut file = fs::File::create(&download_path)
        .map_err(|e| format!("Failed to create file: {}", e))?;

    let mut downloaded: u64 = 0;
    let mut stream = response.bytes_stream();

    use futures_util::StreamExt;
    use std::io::Write;

    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| format!("Error reading chunk: {}", e))?;
        
        file.write_all(&chunk)
            .map_err(|e| format!("Error writing to file: {}", e))?;

        downloaded += chunk.len() as u64;

        // Calculate progress
        let progress = if total_size > 0 {
            (downloaded as f32 / total_size as f32) * 100.0
        } else {
            0.0
        };

        // Emit progress every 1%
        if downloaded % (total_size / 100).max(1) == 0 || downloaded == total_size {
            let _ = window.emit("ollama-install-progress", InstallProgress {
                stage: "downloading".to_string(),
                progress,
                message: format!("Downloaded {} / {} MB", 
                    downloaded / 1_000_000, 
                    total_size / 1_000_000),
                error: None,
            });
        }
    }

    // Emit completion
    let _ = window.emit("ollama-install-progress", InstallProgress {
        stage: "downloading".to_string(),
        progress: 100.0,
        message: "Download complete".to_string(),
        error: None,
    });

    Ok(download_path.to_string_lossy().to_string())
}

/// Install Ollama from downloaded installer
#[tauri::command]
pub async fn install_ollama(window: Window, installer_path: String) -> Result<(), String> {
    let path = PathBuf::from(&installer_path);

    if !path.exists() {
        return Err("Installer file not found".to_string());
    }

    // Emit progress
    let _ = window.emit("ollama-install-progress", InstallProgress {
        stage: "installing".to_string(),
        progress: 0.0,
        message: "Starting installation...".to_string(),
        error: None,
    });

    #[cfg(target_os = "windows")]
    {
        install_ollama_windows(&window, &path).await?;
    }

    #[cfg(target_os = "macos")]
    {
        install_ollama_macos(&window, &path).await?;
    }

    #[cfg(target_os = "linux")]
    {
        install_ollama_linux(&window, &path).await?;
    }

    // Emit completion
    let _ = window.emit("ollama-install-progress", InstallProgress {
        stage: "complete".to_string(),
        progress: 100.0,
        message: "Installation complete!".to_string(),
        error: None,
    });

    // Clean up installer file
    let _ = fs::remove_file(&path);

    Ok(())
}

#[cfg(target_os = "windows")]
async fn install_ollama_windows(window: &Window, installer_path: &PathBuf) -> Result<(), String> {
    // Run installer silently
    let output = Command::new(installer_path)
        .args(&["/S"]) // Silent install flag
        .output()
        .map_err(|e| format!("Failed to run installer: {}", e))?;

    if !output.status.success() {
        return Err(format!("Installation failed: {}", 
            String::from_utf8_lossy(&output.stderr)));
    }

    // Wait a bit for installation to complete
    tokio::time::sleep(tokio::time::Duration::from_secs(5)).await;

    let _ = window.emit("ollama-install-progress", InstallProgress {
        stage: "installing".to_string(),
        progress: 80.0,
        message: "Installation complete, starting service...".to_string(),
        error: None,
    });

    // Try to start the service
    let _ = Command::new("net")
        .args(&["start", "Ollama"])
        .output();

    Ok(())
}

#[cfg(target_os = "macos")]
async fn install_ollama_macos(window: &Window, installer_path: &PathBuf) -> Result<(), String> {
    // Extract ZIP file
    let output = Command::new("unzip")
        .args(&["-o", installer_path.to_str().unwrap(), "-d", "/Applications"])
        .output()
        .map_err(|e| format!("Failed to extract: {}", e))?;

    if !output.status.success() {
        return Err(format!("Extraction failed: {}", 
            String::from_utf8_lossy(&output.stderr)));
    }

    let _ = window.emit("ollama-install-progress", InstallProgress {
        stage: "installing".to_string(),
        progress: 80.0,
        message: "Installation complete, starting Ollama...".to_string(),
        error: None,
    });

    // Try to start Ollama
    let _ = Command::new("open")
        .args(&["-a", "Ollama"])
        .spawn();

    Ok(())
}

#[cfg(target_os = "linux")]
async fn install_ollama_linux(window: &Window, installer_path: &PathBuf) -> Result<(), String> {
    // Make script executable
    let _ = Command::new("chmod")
        .args(&["+x", installer_path.to_str().unwrap()])
        .output();

    // Run install script
    let output = Command::new("sh")
        .arg(installer_path)
        .output()
        .map_err(|e| format!("Failed to run installer: {}", e))?;

    if !output.status.success() {
        return Err(format!("Installation failed: {}", 
            String::from_utf8_lossy(&output.stderr)));
    }

    let _ = window.emit("ollama-install-progress", InstallProgress {
        stage: "installing".to_string(),
        progress: 80.0,
        message: "Installation complete, starting service...".to_string(),
        error: None,
    });

    // Try to start Ollama service
    let _ = Command::new("systemctl")
        .args(&["--user", "start", "ollama"])
        .output();

    Ok(())
}

/// One-click install: Download and install Ollama
#[tauri::command]
pub async fn install_ollama_one_click(window: Window) -> Result<(), String> {
    // Download
    let installer_path = download_ollama(window.clone()).await?;

    // Install
    install_ollama(window, installer_path).await?;

    Ok(())
}

/// Verify Ollama installation
#[tauri::command]
pub async fn verify_ollama_installation() -> Result<bool, String> {
    // Check if Ollama is installed
    let installed = super::detector::check_ollama_installed();
    
    if !installed {
        return Ok(false);
    }

    // Check if service is running
    let running = super::detector::check_ollama_running().await;

    Ok(running)
}
