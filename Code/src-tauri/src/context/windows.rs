/**
 * Windows-specific context detection using Win32 APIs
 */

use super::{
    BrowserContextData, EditorContextData, FileExplorerContextData, OfficeContextData,
    TerminalContextData, WindowInfo,
};
use std::ffi::OsString;
use std::os::windows::ffi::OsStringExt;
use std::ptr::null_mut;
use winapi::shared::minwindef::MAX_PATH;
use winapi::um::winuser::{
    GetForegroundWindow, GetWindowTextW, GetWindowThreadProcessId, SendInput, INPUT, INPUT_KEYBOARD, VK_CONTROL, 
    KEYEVENTF_KEYUP,
};
use winapi::um::processthreadsapi::OpenProcess;
use winapi::um::psapi::{GetModuleFileNameExW, GetProcessImageFileNameW};
use winapi::um::winnt::{PROCESS_QUERY_INFORMATION, PROCESS_VM_READ};

/// Get the active window information
pub async fn get_active_window_info() -> Result<WindowInfo, String> {
    unsafe {
        // Get foreground window handle
        let hwnd = GetForegroundWindow();
        if hwnd.is_null() {
            return Err("No foreground window found".to_string());
        }

        // Get window title
        let mut title_buffer: [u16; 512] = [0; 512];
        let title_len = GetWindowTextW(hwnd, title_buffer.as_mut_ptr(), 512);
        let window_title = if title_len > 0 {
            OsString::from_wide(&title_buffer[..title_len as usize])
                .to_string_lossy()
                .to_string()
        } else {
            String::new()
        };

        // Get process ID
        let mut process_id: u32 = 0;
        GetWindowThreadProcessId(hwnd, &mut process_id);

        // Open process to get executable path
        let process_handle = OpenProcess(
            PROCESS_QUERY_INFORMATION | PROCESS_VM_READ,
            0,
            process_id,
        );

        if process_handle.is_null() {
            return Err("Failed to open process".to_string());
        }

        // Get executable path
        let mut exe_buffer: [u16; MAX_PATH] = [0; MAX_PATH];
        let exe_len = GetModuleFileNameExW(
            process_handle,
            null_mut(),
            exe_buffer.as_mut_ptr(),
            MAX_PATH as u32,
        );

        let executable = if exe_len > 0 {
            OsString::from_wide(&exe_buffer[..exe_len as usize])
                .to_string_lossy()
                .to_string()
        } else {
            // Fallback to GetProcessImageFileNameW
            let img_len = GetProcessImageFileNameW(
                process_handle,
                exe_buffer.as_mut_ptr(),
                MAX_PATH as u32,
            );
            if img_len > 0 {
                OsString::from_wide(&exe_buffer[..img_len as usize])
                    .to_string_lossy()
                    .to_string()
            } else {
                String::new()
            }
        };

        // Extract process name from executable path
        let process_name = executable
            .split('\\')
            .last()
            .unwrap_or("")
            .to_string();

        winapi::um::handleapi::CloseHandle(process_handle);

        Ok(WindowInfo {
            process_name,
            window_title,
            executable,
        })
    }
}

/// Get browser context (URL, title, etc.)
pub async fn get_browser_context(process_name: &str) -> Result<BrowserContextData, String> {
    let process_lower = process_name.to_lowercase();

    // For Chrome-based browsers, try to extract URL from window title
    // Format is usually: "Page Title - Google Chrome" or "URL - Google Chrome"
    if process_lower.contains("chrome") || process_lower.contains("edge") || process_lower.contains("brave") {
        // In real implementation, you would use Chrome DevTools Protocol
        // or browser-specific automation APIs
        // For now, return basic data that can be extracted from window title
        return Ok(BrowserContextData {
            url: None,
            title: None,
            selected_text: None,
        });
    }

    Ok(BrowserContextData {
        url: None,
        title: None,
        selected_text: None,
    })
}

/// Get code editor context
pub async fn get_editor_context(process_name: &str) -> Result<EditorContextData, String> {
    let _process_lower = process_name.to_lowercase();

    // For VS Code, the window title usually contains the file path
    // Format: "filename.ext - Folder Name - Visual Studio Code"
    // In a full implementation, you'd use VS Code's remote API or automation

    Ok(EditorContextData {
        file_path: None,
        file_name: None,
        language: None,
        selected_code: None,
        project_path: None,
    })
}

/// Get Office application context
pub async fn get_office_context(
    _process_name: &str,
    _app_type: &str,
) -> Result<OfficeContextData, String> {
    // In a full implementation, you would use Office COM automation
    // to get document details, selected text, etc.

    Ok(OfficeContextData {
        document_path: None,
        document_name: None,
        selected_text: None,
        current_slide: None,
        active_cell: None,
    })
}

/// Get File Explorer context
pub async fn get_file_explorer_context() -> Result<FileExplorerContextData, String> {
    // In a full implementation, you would use Shell COM objects
    // to get the current folder path and selected files
    // Example: IShellWindows interface

    Ok(FileExplorerContextData {
        current_path: String::new(),
        selected_files: None,
    })
}

/// Get terminal context
pub async fn get_terminal_context(_process_name: &str) -> Result<TerminalContextData, String> {
    // For Windows Terminal or PowerShell, you could potentially read
    // the current directory from the process environment

    Ok(TerminalContextData {
        current_directory: None,
        last_command: None,
        shell_type: None,
    })
}

/// Get selected text from active window
pub async fn get_selected_text() -> Result<Option<String>, String> {
    // Try using clipboard method as it's the most reliable for "selected text" across apps
    // although it is invasive (clears clipboard temporarily)
    get_selected_text_via_clipboard().await
}

/// Helper function to send Ctrl+C and read clipboard
/// Note: This is invasive and should be used carefully
#[allow(dead_code)]
pub async fn get_selected_text_via_clipboard() -> Result<Option<String>, String> {
    use clipboard_win::{get_clipboard_string, set_clipboard_string};
    use std::thread;
    use std::time::Duration;

    // Save current clipboard
    let old_clipboard = get_clipboard_string().ok();

    // Clear clipboard
    let _ = set_clipboard_string("");

    // Simulate Ctrl+C
    unsafe {
        let mut inputs: [INPUT; 4] = std::mem::zeroed();

        // Ctrl Down
        inputs[0].type_ = INPUT_KEYBOARD;
        inputs[0].u.ki_mut().wVk = VK_CONTROL as u16;

        // C Down
        inputs[1].type_ = INPUT_KEYBOARD;
        inputs[1].u.ki_mut().wVk = 0x43; // 'C' key

        // C Up
        inputs[2].type_ = INPUT_KEYBOARD;
        inputs[2].u.ki_mut().wVk = 0x43;
        inputs[2].u.ki_mut().dwFlags = KEYEVENTF_KEYUP;

        // Ctrl Up
        inputs[3].type_ = INPUT_KEYBOARD;
        inputs[3].u.ki_mut().wVk = VK_CONTROL as u16;
        inputs[3].u.ki_mut().dwFlags = KEYEVENTF_KEYUP;

        SendInput(4, inputs.as_mut_ptr(), std::mem::size_of::<INPUT>() as i32);
    }

    // Wait for clipboard update (retry a few times)
    let mut new_text = None;
    for _ in 0..20 { // Wait up to 1 second (20 * 50ms)
        thread::sleep(Duration::from_millis(50));
        if let Ok(text) = get_clipboard_string() {
            if !text.is_empty() {
                new_text = Some(text);
                break;
            }
        }
    }

    // Restore old clipboard
    if let Some(old) = old_clipboard {
        let _ = set_clipboard_string(&old);
    }

    Ok(new_text)
}
