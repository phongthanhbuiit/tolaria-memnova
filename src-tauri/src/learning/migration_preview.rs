use super::legacy_markdown::{self, LegacyPage};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{collections::HashMap, fs, path::Path};

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MigrationIssue {
    pub path: String,
    pub code: String,
    pub severity: String,
    pub detail: String,
}

#[derive(Clone, Debug, Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MigrationPreview {
    pub page_count: usize,
    pub card_count: usize,
    pub active_cards: usize,
    pub draft_cards: usize,
    pub suspended_cards: usize,
    pub whole_page_cards: usize,
    pub fingerprint: String,
    pub issues: Vec<MigrationIssue>,
    pub pages: Vec<LegacyPage>,
}

impl MigrationIssue {
    fn error(path: &str, code: &str, detail: impl ToString) -> Self {
        Self {
            path: path.into(),
            code: code.into(),
            severity: "error".into(),
            detail: detail.to_string(),
        }
    }
    fn warning(path: &str, code: &str, detail: &str) -> Self {
        Self {
            path: path.into(),
            code: code.into(),
            severity: "warning".into(),
            detail: detail.into(),
        }
    }
}

fn read_page(root: &Path, relative: &str, issues: &mut Vec<MigrationIssue>) -> Option<LegacyPage> {
    let absolute = root.join(relative);
    let source = match fs::read_to_string(&absolute) {
        Ok(source) => source,
        Err(error) => {
            issues.push(MigrationIssue::error(relative, "unreadablePage", error));
            return None;
        }
    };
    let (metadata, body) = match legacy_markdown::frontmatter(&source) {
        Ok(value) => value,
        Err(error) => {
            issues.push(MigrationIssue::error(relative, "invalidFrontmatter", error));
            return None;
        }
    };
    let existing_id = match legacy_markdown::page_id(&metadata) {
        Ok(id) => id,
        Err(error) => {
            issues.push(MigrationIssue::error(relative, "invalidPageId", error));
            None
        }
    };
    let title = legacy_markdown::title(&metadata, &source, relative);
    let card = match legacy_markdown::card(&metadata, body, &title) {
        Ok(value) => value,
        Err(error) => {
            issues.push(MigrationIssue::error(relative, "invalidSchedule", error));
            None
        }
    };
    if body.matches("<!-- FLASHCARD:BACK -->").count() > 1 {
        issues.push(MigrationIssue::warning(
            relative,
            "multipleBackMarkers",
            "Only the first legacy marker is a separator; later markers remain answer content",
        ));
    }
    let fingerprint = format!("{:x}", Sha256::digest(source.as_bytes()));
    Some(LegacyPage {
        path: relative.into(),
        title,
        existing_id,
        fingerprint,
        card,
    })
}

fn is_markdown(path: &Path) -> bool {
    path.extension()
        .and_then(|extension| extension.to_str())
        .is_some_and(|extension| {
            extension.eq_ignore_ascii_case("md") || extension.eq_ignore_ascii_case("markdown")
        })
}

struct SourcePages {
    pages: Vec<LegacyPage>,
    issues: Vec<MigrationIssue>,
    total: usize,
}

fn visible_directory(entry: &walkdir::DirEntry) -> bool {
    entry.depth() == 0
        || !entry.file_type().is_dir()
        || !entry.file_name().to_string_lossy().starts_with('.')
}

fn collect_pages(root: &Path) -> Result<SourcePages, String> {
    let mut result = SourcePages {
        pages: Vec::new(),
        issues: Vec::new(),
        total: 0,
    };
    let walker = walkdir::WalkDir::new(root)
        .follow_links(false)
        .into_iter()
        .filter_entry(visible_directory);
    for entry in walker {
        let entry = match entry {
            Ok(entry) => entry,
            Err(error) => {
                result
                    .issues
                    .push(MigrationIssue::error("", "unreadableDirectory", error));
                continue;
            }
        };
        let relative = entry
            .path()
            .strip_prefix(root)
            .map_err(|error| error.to_string())?
            .to_string_lossy()
            .replace(std::path::MAIN_SEPARATOR, "/");
        if entry.file_type().is_symlink() {
            result.issues.push(MigrationIssue::error(
                &relative,
                "unsafeLink",
                "Symbolic links are not followed during migration",
            ));
            continue;
        }
        if !entry.file_type().is_file()
            || entry.file_name().to_string_lossy().starts_with('.')
            || !is_markdown(entry.path())
        {
            continue;
        }
        result.total += 1;
        if let Some(page) = read_page(root, &relative, &mut result.issues) {
            result.pages.push(page);
        }
    }
    result
        .pages
        .sort_by(|left, right| left.path.cmp(&right.path));
    Ok(result)
}

fn verify_unique_ids(pages: &[LegacyPage], issues: &mut Vec<MigrationIssue>) {
    let mut identities = HashMap::new();
    for page in pages {
        if let Some(id) = &page.existing_id {
            if let Some(previous) = identities.insert(id, &page.path) {
                issues.push(MigrationIssue::error(
                    &page.path,
                    "duplicatePageId",
                    format!("Also used by {previous}"),
                ));
            }
        }
    }
}

fn source_fingerprint(pages: &[LegacyPage]) -> String {
    let mut hasher = Sha256::new();
    for page in pages {
        hasher.update(page.path.as_bytes());
        hasher.update([0]);
        hasher.update(page.fingerprint.as_bytes());
        hasher.update([0]);
    }
    format!("{:x}", hasher.finalize())
}

fn summarize(source: SourcePages) -> MigrationPreview {
    let mut preview = MigrationPreview {
        page_count: source.total,
        fingerprint: source_fingerprint(&source.pages),
        pages: source.pages,
        issues: source.issues,
        ..MigrationPreview::default()
    };
    for card in preview.pages.iter().filter_map(|page| page.card.as_ref()) {
        preview.card_count += 1;
        match card.draft.status.as_str() {
            "active" => preview.active_cards += 1,
            "suspended" => preview.suspended_cards += 1,
            _ => preview.draft_cards += 1,
        }
        preview.whole_page_cards += usize::from(card.draft.answer_mode == "page");
    }
    preview
}

pub(super) fn scan_legacy(root: &Path) -> Result<MigrationPreview, String> {
    let root = root.canonicalize().map_err(|error| error.to_string())?;
    let mut source = collect_pages(&root)?;
    verify_unique_ids(&source.pages, &mut source.issues);
    Ok(summarize(source))
}

pub fn preview_migration(
    root: &Path,
    _legacy_log: Option<&Path>,
) -> Result<MigrationPreview, String> {
    scan_legacy(root)
}
