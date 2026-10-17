//! Debug QA can isolate application preferences without changing the user's HOME.
use std::{ffi::OsString, path::PathBuf};

pub(crate) fn directory() -> Result<PathBuf, String> {
    #[cfg(debug_assertions)]
    let override_root = std::env::var_os("MEMNOVA_CONFIG_HOME");
    #[cfg(not(debug_assertions))]
    let override_root = None;
    resolve(dirs::config_dir(), override_root)
}

fn resolve(default: Option<PathBuf>, override_root: Option<OsString>) -> Result<PathBuf, String> {
    if let Some(value) = override_root {
        let path = PathBuf::from(value);
        if !path.is_absolute() {
            return Err("MEMNOVA_CONFIG_HOME must be an absolute directory".into());
        }
        return Ok(path);
    }
    default.ok_or_else(|| "Could not determine config directory".into())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn selects_an_absolute_qa_root_without_mutating_process_environment() {
        let root = tempfile::tempdir().unwrap();
        assert_eq!(
            resolve(None, Some(root.path().as_os_str().into())).unwrap(),
            root.path()
        );
        assert!(resolve(None, Some("relative".into())).is_err());
        assert!(resolve(None, None).is_err());
        assert_eq!(
            resolve(Some(root.path().into()), None).unwrap(),
            root.path()
        );
    }
}
