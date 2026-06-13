mod config;

use futures_util::StreamExt;
use reqwest::Client;
use serde_json::json;
use tauri::{AppHandle, Emitter};

#[tauri::command]
fn get_api_key() -> String {
    config::load_config().api_key
}

#[tauri::command]
fn set_api_key(key: String) -> Result<(), String> {
    let mut cfg = config::load_config();
    cfg.api_key = key;
    config::save_config(&cfg)
}

#[tauri::command]
fn get_instructions() -> String {
    let config = config::load_config();
    let path = std::path::PathBuf::from(&config.instructions_path);
    if path.exists() {
        std::fs::read_to_string(&path).unwrap_or_default()
    } else {
        String::new()
    }
}

#[tauri::command]
fn get_system_prompt() -> String {
    let base = dirs::config_dir().unwrap_or_else(|| std::path::PathBuf::from("."));
    let path = base.join("ment").join("system_prompt.md");
    if path.exists() {
        std::fs::read_to_string(&path).unwrap_or_default()
    } else {
        let default = include_str!("../prompts/system_prompt.md").to_string();
        let _ = std::fs::create_dir_all(path.parent().unwrap());
        let _ = std::fs::write(&path, &default);
        default
    }
}

#[tauri::command]
async fn stream_completion(
    app: AppHandle,
    context: String,
    instruction: String,
    instructions: String,
) -> Result<(), String> {
    let config = config::load_config();
    if config.api_key.is_empty() {
        return Err("API key not set".to_string());
    }

    let base_prompt = get_system_prompt();
    let system = format!(
        "{}\n\nPersonal instructions from the user:\n{}",
        base_prompt,
        if instructions.is_empty() { "None provided.".to_string() } else { instructions }
    );

    let client = Client::new();
    let body = json!({
        "model": config.model,
        "max_tokens": 1024,
        "stream": true,
        "system": system,
        "messages": [
            {
                "role": "user",
                "content": format!(
                    "Block of text:\n{}\n\nInstruction: {}",
                    context,
                    if instruction.is_empty() {
                        "Format this into clean markdown.".to_string()
                    } else {
                        instruction
                    }
                )
            }
        ]
    });

    let response = client
        .post("https://api.anthropic.com/v1/messages")
        .header("x-api-key", &config.api_key)
        .header("anthropic-version", "2023-06-01")
        .header("content-type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !response.status().is_success() {
        let err = response.text().await.unwrap_or_default();
        return Err(err);
    }

    let mut stream = response.bytes_stream();

    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| e.to_string())?;
        let text = String::from_utf8_lossy(&chunk);

        for line in text.lines() {
            if let Some(data) = line.strip_prefix("data: ") {
                if data == "[DONE]" {
                    app.emit("ai://done", ()).ok();
                    return Ok(());
                }
                if let Ok(json) = serde_json::from_str::<serde_json::Value>(data) {
                    if let Some(token) = json["delta"]["text"].as_str() {
                        app.emit("ai://token", token).ok();
                    }
                }
            }
        }
    }

    app.emit("ai://done", ()).ok();
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            get_api_key,
            set_api_key,
            get_instructions,
            get_system_prompt,
            stream_completion
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}