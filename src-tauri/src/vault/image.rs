use std::fs;
use std::path::Path;
use std::time::UNIX_EPOCH;

/// Check if a character is safe for use in filenames (alphanumeric, dot, dash, underscore).
fn is_safe_filename_char(c: char) -> bool {
    c.is_alphanumeric() || matches!(c, '.' | '-' | '_')
}

/// Sanitize a filename by replacing unsafe characters with underscores.
fn sanitize_filename(name: &str) -> String {
    name.chars()
        .map(|c| if is_safe_filename_char(c) { c } else { '_' })
        .collect()
}

/// Image file extensions considered valid for drag-drop import.
const IMAGE_EXTENSIONS: &[&str] = &["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "tiff"];

/// Audio file extensions supported for browser-pick import.
pub const AUDIO_EXTENSIONS: &[&str] = &["mp3", "wav", "ogg", "m4a", "aac", "flac", "opus", "webm"];

/// Prepare the attachments directory and generate a unique target path.
fn prepare_attachment_path(vault_path: &str, filename: &str) -> Result<std::path::PathBuf, String> {
    let attachments_dir = Path::new(vault_path).join("attachments");
    fs::create_dir_all(&attachments_dir)
        .map_err(|e| format!("Failed to create attachments directory: {}", e))?;

    let timestamp = std::time::SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or(0);
    let unique_name = format!("{}-{}", timestamp, sanitize_filename(filename));
    Ok(attachments_dir.join(unique_name))
}

/// Save an uploaded image to the vault's attachments directory.
/// Returns the absolute path to the saved file.
pub fn save_image(vault_path: &str, filename: &str, data: &str) -> Result<String, String> {
    use base64::Engine;

    let target_path = prepare_attachment_path(vault_path, filename)?;

    let bytes = base64::engine::general_purpose::STANDARD
        .decode(data)
        .map_err(|e| format!("Invalid base64 data: {}", e))?;

    fs::write(&target_path, bytes).map_err(|e| format!("Failed to write image: {}", e))?;

    Ok(target_path.to_string_lossy().to_string())
}

/// Copy an image file from a source path into the vault's attachments directory.
/// Used for Tauri native drag-drop which provides absolute file paths.
/// Returns the absolute path to the saved file.
pub fn copy_image_to_vault(vault_path: &str, source_path: &str) -> Result<String, String> {
    let source = Path::new(source_path);
    if !source.exists() {
        return Err(format!("Source file does not exist: {}", source_path));
    }

    let ext = source
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();
    if !IMAGE_EXTENSIONS.contains(&ext.as_str()) {
        return Err(format!("Not a supported image format: {}", source_path));
    }

    let filename = source
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("image");
    let target_path = prepare_attachment_path(vault_path, filename)?;

    fs::copy(source, &target_path).map_err(|e| format!("Failed to copy image: {}", e))?;

    Ok(target_path.to_string_lossy().to_string())
}

/// Copy an audio file from a source path into the vault's attachments directory.
/// Returns the **filename only** (e.g. `1234567-word.mp3`) so the caller can
/// store it directly as the `audio` frontmatter property.
pub fn copy_audio_to_vault(vault_path: &str, source_path: &str) -> Result<String, String> {
    let source = Path::new(source_path);
    if !source.exists() {
        return Err(format!("Source file does not exist: {}", source_path));
    }

    let ext = source
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();
    if !AUDIO_EXTENSIONS.contains(&ext.as_str()) {
        return Err(format!("Not a supported audio format: {}", source_path));
    }

    let filename = source
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("audio");
    let target_path = prepare_attachment_path(vault_path, filename)?;

    // Extract the saved filename (includes the timestamp prefix added by prepare_attachment_path).
    let saved_filename = target_path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or(filename)
        .to_string();

    fs::copy(source, &target_path).map_err(|e| format!("Failed to copy audio: {}", e))?;

    Ok(saved_filename)
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[test]
    fn test_sanitize_filename_safe_chars() {
        assert_eq!(sanitize_filename("photo.png"), "photo.png");
        assert_eq!(sanitize_filename("my-image_01.jpg"), "my-image_01.jpg");
    }

    #[test]
    fn test_sanitize_filename_unsafe_chars() {
        assert_eq!(sanitize_filename("my file (1).png"), "my_file__1_.png");
        assert_eq!(sanitize_filename("path/to/img.png"), "path_to_img.png");
    }

    #[test]
    fn test_save_image_creates_file() {
        use base64::Engine;

        let dir = TempDir::new().unwrap();
        let vault_path = dir.path().to_str().unwrap();
        let data = base64::engine::general_purpose::STANDARD.encode(b"fake image data");

        let result = save_image(vault_path, "test.png", &data);
        assert!(result.is_ok());

        let saved_path = result.unwrap();
        assert!(std::path::Path::new(&saved_path).exists());
        assert!(saved_path.contains("attachments"));
        assert!(saved_path.contains("test.png"));

        let content = fs::read(&saved_path).unwrap();
        assert_eq!(content, b"fake image data");
    }

    #[test]
    fn test_save_image_creates_attachments_dir() {
        use base64::Engine;

        let dir = TempDir::new().unwrap();
        let vault_path = dir.path().to_str().unwrap();
        let attachments = dir.path().join("attachments");
        assert!(!attachments.exists());

        let data = base64::engine::general_purpose::STANDARD.encode(b"test");
        save_image(vault_path, "img.png", &data).unwrap();
        assert!(attachments.exists());
    }

    #[test]
    fn test_save_image_invalid_base64() {
        let dir = TempDir::new().unwrap();
        let vault_path = dir.path().to_str().unwrap();

        let result = save_image(vault_path, "test.png", "not-valid-base64!!!");
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Invalid base64"));
    }

    #[test]
    fn test_copy_image_to_vault_success() {
        let dir = TempDir::new().unwrap();
        let vault_path = dir.path().to_str().unwrap();

        // Create a source image file
        let source_path = dir.path().join("source.png");
        fs::write(&source_path, b"fake png data").unwrap();

        let result = copy_image_to_vault(vault_path, source_path.to_str().unwrap());
        assert!(result.is_ok());

        let saved_path = result.unwrap();
        assert!(std::path::Path::new(&saved_path).exists());
        assert!(saved_path.contains("attachments"));
        assert!(saved_path.contains("source.png"));

        let content = fs::read(&saved_path).unwrap();
        assert_eq!(content, b"fake png data");
    }

    #[test]
    fn test_copy_image_to_vault_nonexistent_source() {
        let dir = TempDir::new().unwrap();
        let vault_path = dir.path().to_str().unwrap();

        let result = copy_image_to_vault(vault_path, "/nonexistent/photo.png");
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("does not exist"));
    }

    #[test]
    fn test_copy_image_to_vault_rejects_non_image() {
        let dir = TempDir::new().unwrap();
        let vault_path = dir.path().to_str().unwrap();

        let source_path = dir.path().join("document.pdf");
        fs::write(&source_path, b"fake pdf").unwrap();

        let result = copy_image_to_vault(vault_path, source_path.to_str().unwrap());
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Not a supported image"));
    }

    #[test]
    fn test_copy_image_to_vault_accepts_all_extensions() {
        let dir = TempDir::new().unwrap();
        let vault_path = dir.path().to_str().unwrap();

        for ext in &["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "tiff"] {
            let source_path = dir.path().join(format!("img.{}", ext));
            fs::write(&source_path, b"data").unwrap();
            let result = copy_image_to_vault(vault_path, source_path.to_str().unwrap());
            assert!(result.is_ok(), "failed for extension: {}", ext);
        }
    }

    #[test]
    fn test_copy_audio_to_vault_returns_filename_not_path() {
        let dir = TempDir::new().unwrap();
        let vault_path = dir.path().to_str().unwrap();

        let source_path = dir.path().join("word.mp3");
        fs::write(&source_path, b"fake audio").unwrap();

        let result = copy_audio_to_vault(vault_path, source_path.to_str().unwrap());
        assert!(result.is_ok());

        let filename = result.unwrap();
        // Must be just the filename, not a full path
        assert!(!filename.contains('/'), "expected filename only, got: {filename}");
        assert!(!filename.contains('\\'), "expected filename only, got: {filename}");
        assert!(filename.ends_with("word.mp3"), "expected .mp3 suffix, got: {filename}");
    }

    #[test]
    fn test_copy_audio_to_vault_file_exists_in_attachments() {
        let dir = TempDir::new().unwrap();
        let vault_path = dir.path().to_str().unwrap();

        let source_path = dir.path().join("hello.wav");
        fs::write(&source_path, b"wav data").unwrap();

        let filename = copy_audio_to_vault(vault_path, source_path.to_str().unwrap()).unwrap();

        let saved = dir.path().join("attachments").join(&filename);
        assert!(saved.exists(), "expected file at {saved:?}");
        assert_eq!(fs::read(&saved).unwrap(), b"wav data");
    }

    #[test]
    fn test_copy_audio_to_vault_nonexistent_source() {
        let dir = TempDir::new().unwrap();
        let vault_path = dir.path().to_str().unwrap();

        let result = copy_audio_to_vault(vault_path, "/nonexistent/word.mp3");
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("does not exist"));
    }

    #[test]
    fn test_copy_audio_to_vault_rejects_non_audio() {
        let dir = TempDir::new().unwrap();
        let vault_path = dir.path().to_str().unwrap();

        let source_path = dir.path().join("document.pdf");
        fs::write(&source_path, b"fake pdf").unwrap();

        let result = copy_audio_to_vault(vault_path, source_path.to_str().unwrap());
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Not a supported audio format"));
    }

    #[test]
    fn test_copy_audio_to_vault_accepts_all_extensions() {
        let dir = TempDir::new().unwrap();
        let vault_path = dir.path().to_str().unwrap();

        for ext in &["mp3", "wav", "ogg", "m4a", "aac", "flac", "opus", "webm"] {
            let source_path = dir.path().join(format!("sound.{}", ext));
            fs::write(&source_path, b"data").unwrap();
            let result = copy_audio_to_vault(vault_path, source_path.to_str().unwrap());
            assert!(result.is_ok(), "failed for extension: {}", ext);
        }
    }
}

