use super::legacy_markdown;
use std::{
    collections::{HashMap, HashSet},
    fs,
    path::Path,
};

/// One readonly identity scan per boundary; ambiguity belongs to its own UUID.
pub(super) struct SourceCatalog {
    pub(super) sources: HashMap<String, (String, String)>,
    duplicates: HashSet<String>,
}
impl SourceCatalog {
    pub(super) fn scan(root: &Path) -> Result<Self, String> {
        let mut result = HashMap::new();
        let mut duplicates = std::collections::HashSet::new();
        let walker = walkdir::WalkDir::new(root)
            .follow_links(false)
            .into_iter()
            .filter_entry(|entry| {
                entry.depth() == 0 || !entry.file_name().to_string_lossy().starts_with('.')
            });
        for entry in walker {
            let entry = entry.map_err(|error| error.to_string())?;
            if !entry.file_type().is_file()
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
            let source = fs::read_to_string(entry.path()).map_err(|error| error.to_string())?;
            let Ok((metadata, _)) = legacy_markdown::frontmatter(&source) else {
                continue;
            };
            let Ok(Some(id)) = legacy_markdown::page_id(&metadata) else {
                continue;
            };
            let relative = entry
                .path()
                .strip_prefix(root)
                .map_err(|error| error.to_string())?
                .to_string_lossy()
                .replace(std::path::MAIN_SEPARATOR, "/");
            let title = legacy_markdown::title(&metadata, &source, &relative);
            if duplicates.contains(&id) {
                continue;
            }
            if result.insert(id.clone(), (relative, title)).is_some() {
                result.remove(&id);
                duplicates.insert(id);
            }
        }
        Ok(Self {
            sources: result,
            duplicates,
        })
    }
    pub(super) fn matches(&self, id: &str, path: &str) -> bool {
        self.sources.get(id).is_some_and(|(found, _)| found == path)
    }
    pub(super) fn strict(self) -> Result<HashMap<String, (String, String)>, String> {
        if !self.duplicates.is_empty() {
            return Err(
                "Duplicate lesson identities; resolve the copied page before continuing".into(),
            );
        }
        Ok(self.sources)
    }
}
