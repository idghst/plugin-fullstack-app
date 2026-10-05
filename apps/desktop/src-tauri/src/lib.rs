#[tauri::command]
fn platform_name() -> &'static str { std::env::consts::OS }

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![platform_name])
        .run(tauri::generate_context!())
        .expect("Project Studio could not start");
}
