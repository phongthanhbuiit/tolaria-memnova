use super::{migration_plan::content_hash, note_memory::parse_document};
use std::{collections::BTreeMap, fs, path::Path};

pub(super) struct SourceCatalog {
    pub files: BTreeMap<String, Option<String>>,
    identities: BTreeMap<String, Vec<String>>,
}
impl SourceCatalog {
    pub fn read(root: &Path) -> Result<Self, String> {
        let mut files = BTreeMap::new();
        let mut identities: BTreeMap<String, Vec<String>> = BTreeMap::new();
        let walker = walkdir::WalkDir::new(root)
            .follow_links(false)
            .into_iter()
            .filter_entry(|entry| {
                entry.depth() == 0 || !entry.file_name().to_string_lossy().starts_with('.')
            });
        for entry in walker {
            let entry = entry.map_err(|error| error.to_string())?;
            if entry.file_type().is_dir()
                || !entry
                    .path()
                    .extension()
                    .and_then(|ext| ext.to_str())
                    .is_some_and(|ext| {
                        ext.eq_ignore_ascii_case("md") || ext.eq_ignore_ascii_case("markdown")
                    })
            {
                continue;
            }
            let path = entry
                .path()
                .strip_prefix(root)
                .map_err(|error| error.to_string())?
                .to_str()
                .ok_or("invalid-source-path")?
                .replace(std::path::MAIN_SEPARATOR, "/");
            let raw = if entry.file_type().is_file() {
                super::store::checked_page_path(root, &path)
                    .ok()
                    .and_then(|path| fs::read_to_string(path).ok())
            } else {
                None
            };
            if let Some(id) = raw
                .as_ref()
                .and_then(|source| parse_document(source).page_id)
            {
                identities.entry(id).or_default().push(path.clone());
            }
            files.insert(path, raw);
        }
        Ok(Self { files, identities })
    }
    pub fn duplicate(&self, id: &str) -> bool {
        self.identities
            .get(id)
            .is_some_and(|paths| paths.len() != 1)
    }
    pub fn verify(&self, root: &Path) -> Result<(), String> {
        for (path, captured) in &self.files {
            if let Some(raw) = captured {
                let file = super::store::checked_page_path(root, path)?;
                if content_hash(&fs::read_to_string(file).map_err(|error| error.to_string())?)
                    != content_hash(raw)
                {
                    return Err("preview-source-changed".into());
                }
            }
        }
        Ok(())
    }
}
