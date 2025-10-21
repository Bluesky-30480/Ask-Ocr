// Database Module
// Handles SQLite database operations for OCR records, models, and settings

use rusqlite::{Connection, Result as SqlResult, params};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::AppHandle;

// Database connection wrapper
pub struct Database {
    conn: Mutex<Connection>,
}

impl Database {
    /// Initialize database with schema
    pub fn new(db_path: PathBuf) -> SqlResult<Self> {
        let conn = Connection::open(db_path)?;
        
        // Create tables
        conn.execute(
            "CREATE TABLE IF NOT EXISTS ocr_record (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER NOT NULL,
                image_path TEXT,
                image_data TEXT,
                text TEXT NOT NULL,
                language TEXT NOT NULL,
                summary TEXT,
                tags TEXT,
                ai_answers TEXT,
                confidence REAL,
                processing_time INTEGER,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL
            )",
            [],
        )?;

        conn.execute(
            "CREATE TABLE IF NOT EXISTS model_record (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                path TEXT NOT NULL,
                version TEXT NOT NULL,
                hash TEXT NOT NULL,
                installed_at INTEGER NOT NULL,
                size_bytes INTEGER,
                model_type TEXT NOT NULL,
                is_active INTEGER NOT NULL DEFAULT 0,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL
            )",
            [],
        )?;

        conn.execute(
            "CREATE TABLE IF NOT EXISTS settings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                key TEXT NOT NULL UNIQUE,
                value TEXT NOT NULL,
                value_type TEXT NOT NULL,
                category TEXT,
                description TEXT,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL
            )",
            [],
        )?;

        // Create indexes for performance
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_ocr_timestamp ON ocr_record(timestamp DESC)",
            [],
        )?;

        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_ocr_language ON ocr_record(language)",
            [],
        )?;

        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key)",
            [],
        )?;

        Ok(Database {
            conn: Mutex::new(conn),
        })
    }
}

// ============================================================================
// Data Models
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OcrRecord {
    pub id: Option<i64>,
    pub timestamp: i64,
    pub image_path: Option<String>,
    pub image_data: Option<String>,
    pub text: String,
    pub language: String,
    pub summary: Option<String>,
    pub tags: Option<String>,
    pub ai_answers: Option<String>,
    pub confidence: Option<f64>,
    pub processing_time: Option<i64>,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelRecord {
    pub id: Option<i64>,
    pub name: String,
    pub path: String,
    pub version: String,
    pub hash: String,
    pub installed_at: i64,
    pub size_bytes: Option<i64>,
    pub model_type: String,
    pub is_active: bool,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Setting {
    pub id: Option<i64>,
    pub key: String,
    pub value: String,
    pub value_type: String,
    pub category: Option<String>,
    pub description: Option<String>,
    pub created_at: i64,
    pub updated_at: i64,
}

// ============================================================================
// CRUD Operations - OCR Records
// ============================================================================

#[tauri::command]
pub fn create_ocr_record(
    state: tauri::State<Database>,
    record: OcrRecord,
) -> Result<i64, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    
    conn.execute(
        "INSERT INTO ocr_record (
            timestamp, image_path, image_data, text, language,
            summary, tags, ai_answers, confidence, processing_time,
            created_at, updated_at
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
        params![
            record.timestamp,
            record.image_path,
            record.image_data,
            record.text,
            record.language,
            record.summary,
            record.tags,
            record.ai_answers,
            record.confidence,
            record.processing_time,
            record.created_at,
            record.updated_at,
        ],
    ).map_err(|e| e.to_string())?;

    Ok(conn.last_insert_rowid())
}

#[tauri::command]
pub fn get_ocr_record(
    state: tauri::State<Database>,
    id: i64,
) -> Result<OcrRecord, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    
    let mut stmt = conn.prepare(
        "SELECT id, timestamp, image_path, image_data, text, language,
                summary, tags, ai_answers, confidence, processing_time,
                created_at, updated_at
         FROM ocr_record WHERE id = ?1"
    ).map_err(|e| e.to_string())?;

    let record = stmt.query_row([id], |row| {
        Ok(OcrRecord {
            id: Some(row.get(0)?),
            timestamp: row.get(1)?,
            image_path: row.get(2)?,
            image_data: row.get(3)?,
            text: row.get(4)?,
            language: row.get(5)?,
            summary: row.get(6)?,
            tags: row.get(7)?,
            ai_answers: row.get(8)?,
            confidence: row.get(9)?,
            processing_time: row.get(10)?,
            created_at: row.get(11)?,
            updated_at: row.get(12)?,
        })
    }).map_err(|e| e.to_string())?;

    Ok(record)
}

#[tauri::command]
pub fn get_all_ocr_records(
    state: tauri::State<Database>,
    limit: Option<i64>,
    offset: Option<i64>,
) -> Result<Vec<OcrRecord>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    
    let limit = limit.unwrap_or(100);
    let offset = offset.unwrap_or(0);

    let mut stmt = conn.prepare(
        "SELECT id, timestamp, image_path, image_data, text, language,
                summary, tags, ai_answers, confidence, processing_time,
                created_at, updated_at
         FROM ocr_record
         ORDER BY timestamp DESC
         LIMIT ?1 OFFSET ?2"
    ).map_err(|e| e.to_string())?;

    let records = stmt.query_map(params![limit, offset], |row| {
        Ok(OcrRecord {
            id: Some(row.get(0)?),
            timestamp: row.get(1)?,
            image_path: row.get(2)?,
            image_data: row.get(3)?,
            text: row.get(4)?,
            language: row.get(5)?,
            summary: row.get(6)?,
            tags: row.get(7)?,
            ai_answers: row.get(8)?,
            confidence: row.get(9)?,
            processing_time: row.get(10)?,
            created_at: row.get(11)?,
            updated_at: row.get(12)?,
        })
    }).map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>()
    .map_err(|e| e.to_string())?;

    Ok(records)
}

#[tauri::command]
pub fn update_ocr_record(
    state: tauri::State<Database>,
    id: i64,
    record: OcrRecord,
) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    
    conn.execute(
        "UPDATE ocr_record SET
            summary = ?1, tags = ?2, ai_answers = ?3, updated_at = ?4
         WHERE id = ?5",
        params![
            record.summary,
            record.tags,
            record.ai_answers,
            record.updated_at,
            id,
        ],
    ).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn delete_ocr_record(
    state: tauri::State<Database>,
    id: i64,
) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    
    conn.execute("DELETE FROM ocr_record WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;

    Ok(())
}

// ============================================================================
// CRUD Operations - Model Records
// ============================================================================

#[tauri::command]
pub fn create_model_record(
    state: tauri::State<Database>,
    record: ModelRecord,
) -> Result<i64, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    
    conn.execute(
        "INSERT INTO model_record (
            name, path, version, hash, installed_at,
            size_bytes, model_type, is_active, created_at, updated_at
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
        params![
            record.name,
            record.path,
            record.version,
            record.hash,
            record.installed_at,
            record.size_bytes,
            record.model_type,
            record.is_active as i64,
            record.created_at,
            record.updated_at,
        ],
    ).map_err(|e| e.to_string())?;

    Ok(conn.last_insert_rowid())
}

#[tauri::command]
pub fn get_all_model_records(
    state: tauri::State<Database>,
) -> Result<Vec<ModelRecord>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    
    let mut stmt = conn.prepare(
        "SELECT id, name, path, version, hash, installed_at,
                size_bytes, model_type, is_active, created_at, updated_at
         FROM model_record
         ORDER BY installed_at DESC"
    ).map_err(|e| e.to_string())?;

    let records = stmt.query_map([], |row| {
        Ok(ModelRecord {
            id: Some(row.get(0)?),
            name: row.get(1)?,
            path: row.get(2)?,
            version: row.get(3)?,
            hash: row.get(4)?,
            installed_at: row.get(5)?,
            size_bytes: row.get(6)?,
            model_type: row.get(7)?,
            is_active: row.get::<_, i64>(8)? != 0,
            created_at: row.get(9)?,
            updated_at: row.get(10)?,
        })
    }).map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>()
    .map_err(|e| e.to_string())?;

    Ok(records)
}

#[tauri::command]
pub fn delete_model_record(
    state: tauri::State<Database>,
    id: i64,
) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    
    conn.execute("DELETE FROM model_record WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;

    Ok(())
}

// ============================================================================
// CRUD Operations - Settings
// ============================================================================

#[tauri::command]
pub fn set_setting(
    state: tauri::State<Database>,
    setting: Setting,
) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    
    conn.execute(
        "INSERT OR REPLACE INTO settings (
            key, value, value_type, category, description,
            created_at, updated_at
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![
            setting.key,
            setting.value,
            setting.value_type,
            setting.category,
            setting.description,
            setting.created_at,
            setting.updated_at,
        ],
    ).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn get_setting(
    state: tauri::State<Database>,
    key: String,
) -> Result<Setting, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    
    let mut stmt = conn.prepare(
        "SELECT id, key, value, value_type, category, description,
                created_at, updated_at
         FROM settings WHERE key = ?1"
    ).map_err(|e| e.to_string())?;

    let setting = stmt.query_row([key], |row| {
        Ok(Setting {
            id: Some(row.get(0)?),
            key: row.get(1)?,
            value: row.get(2)?,
            value_type: row.get(3)?,
            category: row.get(4)?,
            description: row.get(5)?,
            created_at: row.get(6)?,
            updated_at: row.get(7)?,
        })
    }).map_err(|e| e.to_string())?;

    Ok(setting)
}

#[tauri::command]
pub fn get_all_settings(
    state: tauri::State<Database>,
    category: Option<String>,
) -> Result<Vec<Setting>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    
    if let Some(cat) = category {
        let mut stmt = conn.prepare(
            "SELECT id, key, value, value_type, category, description,
                    created_at, updated_at
             FROM settings WHERE category = ?1
             ORDER BY key"
        ).map_err(|e| e.to_string())?;

        let settings: Vec<Setting> = stmt.query_map([cat], |row| {
            Ok(Setting {
                id: Some(row.get(0)?),
                key: row.get(1)?,
                value: row.get(2)?,
                value_type: row.get(3)?,
                category: row.get(4)?,
                description: row.get(5)?,
                created_at: row.get(6)?,
                updated_at: row.get(7)?,
            })
        }).map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

        Ok(settings)
    } else {
        let mut stmt = conn.prepare(
            "SELECT id, key, value, value_type, category, description,
                    created_at, updated_at
             FROM settings
             ORDER BY key"
        ).map_err(|e| e.to_string())?;

        let settings: Vec<Setting> = stmt.query_map([], |row| {
            Ok(Setting {
                id: Some(row.get(0)?),
                key: row.get(1)?,
                value: row.get(2)?,
                value_type: row.get(3)?,
                category: row.get(4)?,
                description: row.get(5)?,
                created_at: row.get(6)?,
                updated_at: row.get(7)?,
            })
        }).map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

        Ok(settings)
    }
}

#[tauri::command]
pub fn delete_setting(
    state: tauri::State<Database>,
    key: String,
) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    
    conn.execute("DELETE FROM settings WHERE key = ?1", params![key])
        .map_err(|e| e.to_string())?;

    Ok(())
}

/// Initialize database path (called from main.rs)
pub fn get_database_path(app: &AppHandle) -> PathBuf {
    let app_data_dir = app.path_resolver()
        .app_data_dir()
        .expect("Failed to get app data directory");
    
    std::fs::create_dir_all(&app_data_dir)
        .expect("Failed to create app data directory");
    
    app_data_dir.join("askocr.db")
}
