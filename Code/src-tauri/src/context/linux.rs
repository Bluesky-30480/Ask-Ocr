/**
 * Linux-specific context detection using X11 and D-Bus
 */

use super::{
    BrowserContextData, EditorContextData, FileExplorerContextData, OfficeContextData,
    TerminalContextData, WindowInfo,
};

/// Get the active window information
pub async fn get_active_window_info() -> Result<WindowInfo, String> {
    #[cfg(target_os = "linux")]
    {
        use x11_dl::xlib::{Xlib, XA_STRING};
        use std::ffi::CStr;
        use std::ptr;
        
        unsafe {
            // Load X11 library
            let xlib = Xlib::open().map_err(|e| format!("Failed to open Xlib: {}", e))?;
            
            // Open display
            let display = (xlib.XOpenDisplay)(ptr::null());
            if display.is_null() {
                return Err("Failed to open X display".to_string());
            }
            
            // Get root window
            let root = (xlib.XDefaultRootWindow)(display);
            
            // Get _NET_ACTIVE_WINDOW property
            let active_window_atom = (xlib.XInternAtom)(
                display,
                b"_NET_ACTIVE_WINDOW\0".as_ptr() as *const i8,
                0,
            );
            
            let mut actual_type = 0;
            let mut actual_format = 0;
            let mut n_items = 0;
            let mut bytes_after = 0;
            let mut prop: *mut u8 = ptr::null_mut();
            
            let status = (xlib.XGetWindowProperty)(
                display,
                root,
                active_window_atom,
                0,
                1,
                0,
                0, // AnyPropertyType
                &mut actual_type,
                &mut actual_format,
                &mut n_items,
                &mut bytes_after,
                &mut prop,
            );
            
            if status != 0 || prop.is_null() {
                (xlib.XCloseDisplay)(display);
                return Err("Failed to get active window".to_string());
            }
            
            let active_window = *(prop as *const u64);
            (xlib.XFree)(prop as *mut _);
            
            // Get window title (_NET_WM_NAME or WM_NAME)
            let wm_name_atom = (xlib.XInternAtom)(
                display,
                b"_NET_WM_NAME\0".as_ptr() as *const i8,
                0,
            );
            
            let mut title_prop: *mut u8 = ptr::null_mut();
            let status = (xlib.XGetWindowProperty)(
                display,
                active_window,
                wm_name_atom,
                0,
                1024,
                0,
                XA_STRING,
                &mut actual_type,
                &mut actual_format,
                &mut n_items,
                &mut bytes_after,
                &mut title_prop,
            );
            
            let window_title = if status == 0 && !title_prop.is_null() {
                let title = CStr::from_ptr(title_prop as *const i8)
                    .to_string_lossy()
                    .to_string();
                (xlib.XFree)(title_prop as *mut _);
                title
            } else {
                String::new()
            };
            
            // Get window class (WM_CLASS) for process name
            let mut class_prop: *mut u8 = ptr::null_mut();
            let status = (xlib.XGetWindowProperty)(
                display,
                active_window,
                (xlib.XInternAtom)(display, b"WM_CLASS\0".as_ptr() as *const i8, 0),
                0,
                1024,
                0,
                XA_STRING,
                &mut actual_type,
                &mut actual_format,
                &mut n_items,
                &mut bytes_after,
                &mut class_prop,
            );
            
            let process_name = if status == 0 && !class_prop.is_null() {
                let class = CStr::from_ptr(class_prop as *const i8)
                    .to_string_lossy()
                    .to_string();
                (xlib.XFree)(class_prop as *mut _);
                class
            } else {
                String::new()
            };
            
            // Get PID to find executable path
            let pid_atom = (xlib.XInternAtom)(
                display,
                b"_NET_WM_PID\0".as_ptr() as *const i8,
                0,
            );
            
            let mut pid_prop: *mut u8 = ptr::null_mut();
            let status = (xlib.XGetWindowProperty)(
                display,
                active_window,
                pid_atom,
                0,
                1,
                0,
                0,
                &mut actual_type,
                &mut actual_format,
                &mut n_items,
                &mut bytes_after,
                &mut pid_prop,
            );
            
            let executable = if status == 0 && !pid_prop.is_null() {
                let pid = *(pid_prop as *const u32);
                (xlib.XFree)(pid_prop as *mut _);
                
                // Read /proc/{pid}/exe symlink
                let exe_path = format!("/proc/{}/exe", pid);
                std::fs::read_link(&exe_path)
                    .ok()
                    .and_then(|p| p.to_str().map(|s| s.to_string()))
                    .unwrap_or_default()
            } else {
                String::new()
            };
            
            (xlib.XCloseDisplay)(display);
            
            Ok(WindowInfo {
                process_name,
                window_title,
                executable,
            })
        }
    }
    
    #[cfg(not(target_os = "linux"))]
    Err("This function is only available on Linux".to_string())
}

/// Get browser context
pub async fn get_browser_context(_process_name: &str) -> Result<BrowserContextData, String> {
    // On Linux, you could use D-Bus to communicate with browsers
    // Or use browser-specific remote debugging protocols
    
    Ok(BrowserContextData {
        url: None,
        title: None,
        selected_text: None,
    })
}

/// Get code editor context
pub async fn get_editor_context(_process_name: &str) -> Result<EditorContextData, String> {
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
    Ok(FileExplorerContextData {
        current_path: String::new(),
        selected_files: None,
    })
}

/// Get terminal context
pub async fn get_terminal_context(_process_name: &str) -> Result<TerminalContextData, String> {
    Ok(TerminalContextData {
        current_directory: None,
        last_command: None,
        shell_type: None,
    })
}

/// Get selected text using X11
pub async fn get_selected_text() -> Result<Option<String>, String> {
    #[cfg(target_os = "linux")]
    {
        use x11_dl::xlib::Xlib;
        use std::ptr;
        
        unsafe {
            let xlib = Xlib::open().map_err(|e| format!("Failed to open Xlib: {}", e))?;
            let display = (xlib.XOpenDisplay)(ptr::null());
            
            if display.is_null() {
                return Ok(None);
            }
            
            // Get PRIMARY selection (selected text)
            let primary_atom = (xlib.XInternAtom)(
                display,
                b"PRIMARY\0".as_ptr() as *const i8,
                0,
            );
            
            let root = (xlib.XDefaultRootWindow)(display);
            
            // This is a simplified version - full implementation would need
            // to handle INCR transfers and multiple formats
            
            (xlib.XCloseDisplay)(display);
            Ok(None)
        }
    }
    
    #[cfg(not(target_os = "linux"))]
    Err("This function is only available on Linux".to_string())
}
