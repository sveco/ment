use std::fs;
use std::path::PathBuf;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone)]
pub struct AppConfig {
    pub api_key: String,
    pub model: String,
    pub instructions_path: String
}

impl Default for AppConfig {
    fn default() -> Self {
        let instructions = dirs::config_dir()
            .unwrap_or_else(|| std::path::PathBuf::from("."))
            .join("ment")
            .join("instructions.md");
        Self {
            api_key: String::new(),
            model: "claude-sonnet-4-6".to_string(),
            instructions_path: instructions.to_string_lossy().to_string(),
        }
    }
}

pub fn config_path() -> PathBuf {
    let base = dirs::config_dir().unwrap_or_else(|| PathBuf::from("."));
    base.join("ment").join("config.json")
}

pub fn load_config() -> AppConfig {
    let path = config_path();
    if path.exists() {
        let text = fs::read_to_string(&path).unwrap_or_default();
        serde_json::from_str(&text).unwrap_or_default()
    } else {
        AppConfig::default()
    }
}

pub fn save_config(config: &AppConfig) -> Result<(), String> {
    let path = config_path();
    fs::create_dir_all(path.parent().unwrap()).map_err(|e| e.to_string())?;
    let text = serde_json::to_string_pretty(config).map_err(|e| e.to_string())?;
    fs::write(&path, text).map_err(|e| e.to_string())?;
    Ok(())
}