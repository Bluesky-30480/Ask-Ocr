use tauri::command;
use serde::{Serialize, Deserialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct OcrResult {
    pub text: String,
    pub language: String,
    pub confidence: f64, // 0.0 to 1.0
}

#[cfg(target_os = "windows")]
mod windows_ocr {
    use super::*;
    use windows::{
        Media::Ocr::OcrEngine,
        Globalization::Language,
        Graphics::Imaging::BitmapDecoder,
        Storage::Streams::{InMemoryRandomAccessStream, DataWriter},
    };
    use base64::{Engine as _, engine::general_purpose};

    pub async fn recognize_text(base64_image: &str) -> Result<OcrResult, String> {
        println!("[Rust] recognize_text called. Image length: {}", base64_image.len());
        
        // 1. Decode Base64 to bytes
        let image_bytes = general_purpose::STANDARD
            .decode(base64_image)
            .map_err(|e| format!("Failed to decode base64: {}", e))?;
        println!("[Rust] Base64 decoded. Bytes: {}", image_bytes.len());

        // 2. Create InMemoryRandomAccessStream
        let stream = InMemoryRandomAccessStream::new()
            .map_err(|e| format!("Failed to create stream: {}", e))?;
        
        let writer = DataWriter::CreateDataWriter(&stream)
            .map_err(|e| format!("Failed to create data writer: {}", e))?;
        
        writer.WriteBytes(&image_bytes)
            .map_err(|e| format!("Failed to write bytes: {}", e))?;
        
        writer.StoreAsync()
            .map_err(|e| format!("Failed to store async: {}", e))?
            .await
            .map_err(|e| format!("Failed to await store: {}", e))?;
            
        writer.FlushAsync()
            .map_err(|e| format!("Failed to flush async: {}", e))?
            .await
            .map_err(|e| format!("Failed to await flush: {}", e))?;
            
        writer.DetachStream()
            .map_err(|e| format!("Failed to detach stream: {}", e))?;
            
        stream.Seek(0)
            .map_err(|e| format!("Failed to seek stream: {}", e))?;
        
        println!("[Rust] Stream created and populated");

        // 3. Create BitmapDecoder from stream
        let decoder = BitmapDecoder::CreateAsync(&stream)
            .map_err(|e| format!("Failed to create decoder: {}", e))?
            .await
            .map_err(|e| format!("Failed to await decoder: {}", e))?;
        
        println!("[Rust] BitmapDecoder created");

        // 4. Get SoftwareBitmap
        let bitmap = decoder.GetSoftwareBitmapAsync()
            .map_err(|e| format!("Failed to get software bitmap: {}", e))?
            .await
            .map_err(|e| format!("Failed to await software bitmap: {}", e))?;
        
        println!("[Rust] SoftwareBitmap obtained");

        // 5. Initialize OcrEngine
        // Try to use user's preferred language, fallback to English
        let lang = Language::CreateLanguage(&windows::core::HSTRING::from("en-US"))
            .map_err(|e| format!("Failed to create language: {}", e))?;
            
        // TryCreateFromLanguage returns Result<OcrEngine>, not Result<Option<OcrEngine>>
        // But we need to handle if it fails (e.g. language not installed)
        let engine = match OcrEngine::TryCreateFromLanguage(&lang) {
            Ok(e) => e,
            Err(_) => {
                println!("[Rust] Failed to create OCR engine for en-US, trying profile languages");
                // Fallback to user profile languages
                OcrEngine::TryCreateFromUserProfileLanguages()
                    .map_err(|e| format!("Failed to create OCR engine from profile: {}", e))?
            }
        };
        
        println!("[Rust] OcrEngine initialized");

        // 6. Recognize
        println!("[Rust] Starting recognition...");
        let result = engine.RecognizeAsync(&bitmap)
            .map_err(|e| format!("Failed to recognize: {}", e))?
            .await
            .map_err(|e| format!("Failed to await recognize: {}", e))?;
        
        println!("[Rust] Recognition complete");

        // 7. Extract text
        let text = result.Text()
            .map_err(|e| format!("Failed to get text: {}", e))?
            .to_string();
        
        println!("[Rust] Text extracted: {} chars", text.len());

        // Calculate average confidence (if lines exist)
        // Windows OCR doesn't give a single global confidence, but we can iterate lines/words
        // For now, just return 1.0 if successful
        
        Ok(OcrResult {
            text,
            language: "en".to_string(), // Windows OCR auto-detects but we forced/requested en-US or profile
            confidence: 1.0,
        })
    }
}

#[cfg(not(target_os = "windows"))]
mod windows_ocr {
    use super::*;
    pub async fn recognize_text(_base64_image: &str) -> Result<OcrResult, String> {
        Err("Windows Native OCR is only available on Windows".to_string())
    }
}

#[command]
pub async fn perform_ocr_native(image_data: String) -> Result<OcrResult, String> {
    // Remove data:image/png;base64, prefix if present
    let base64_clean = if let Some(idx) = image_data.find(',') {
        &image_data[idx + 1..]
    } else {
        &image_data
    };

    windows_ocr::recognize_text(base64_clean).await
}
