use super::lines::Line;
use regex::Regex;
use serde::{Deserialize, Serialize};
use std::{collections::BTreeMap, sync::OnceLock};

pub(super) const CONFIG_KEYS: [&str; 5] = [
    "_memnova_learning_version",
    "_memnova_learning_enabled",
    "_memnova_back_kind",
    "_memnova_back_page_id",
    "_memnova_back_face",
];

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum MemoryFace {
    Front,
    Back,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(
    tag = "kind",
    rename_all = "lowercase",
    rename_all_fields = "camelCase",
    deny_unknown_fields
)]
pub enum MemoryBack {
    Inline,
    Page { page_id: String, face: MemoryFace },
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct MemoryConfig {
    pub version: u32,
    pub enabled: bool,
    pub back: MemoryBack,
}

impl MemoryConfig {
    pub fn inline(enabled: bool) -> Self {
        Self {
            version: 1,
            enabled,
            back: MemoryBack::Inline,
        }
    }

    pub(super) fn valid(&self) -> bool {
        self.version == 1
            && match &self.back {
                MemoryBack::Inline => true,
                MemoryBack::Page { page_id, .. } => valid_uuid(page_id),
            }
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "kebab-case")]
pub enum MemoryIssue {
    UnclosedFrontmatter,
    AmbiguousBackMarker,
    UnsupportedVersion,
    InvalidConfig,
    InvalidSystemField,
    DuplicateSystemField,
}

pub(super) struct Metadata {
    pub config: Option<MemoryConfig>,
    pub page_id: Option<String>,
    pub issues: Vec<MemoryIssue>,
}

pub(super) fn scalar(value: &str) -> &str {
    let comment = value.char_indices().find(|(index, ch)| {
        *ch == '#'
            && value[..*index]
                .chars()
                .next_back()
                .is_some_and(char::is_whitespace)
    });
    let clean = value[..comment.map(|(index, _)| index).unwrap_or(value.len())].trim();
    for quote in ['\'', '"'] {
        if let Some(inner) = clean
            .strip_prefix(quote)
            .and_then(|text| text.strip_suffix(quote))
        {
            return inner;
        }
    }
    clean
}

fn valid_uuid(value: &str) -> bool {
    uuid::Uuid::parse_str(value).is_ok_and(|id| id.to_string().eq_ignore_ascii_case(value))
}

fn fields(lines: &[Line<'_>]) -> (BTreeMap<String, String>, Vec<MemoryIssue>) {
    static KEY: OnceLock<Regex> = OnceLock::new();
    let key_pattern = KEY.get_or_init(|| {
        Regex::new(r#"^\s*["']?(_memnova_\w+)["']?\s*:"#).expect("static owned key regex")
    });
    let mut values = BTreeMap::new();
    let mut issues = Vec::new();
    for line in lines {
        let Some(key) = key_pattern
            .captures(line.text)
            .and_then(|captures| captures.get(1))
        else {
            continue;
        };
        let key = key.as_str();
        if key != "_memnova_page_id" && !CONFIG_KEYS.contains(&key) {
            continue;
        }
        if !line.text.starts_with(&format!("{key}:")) {
            if !issues.contains(&MemoryIssue::InvalidSystemField) {
                issues.push(MemoryIssue::InvalidSystemField);
            }
            continue;
        }
        if values
            .insert(
                key.to_string(),
                line.text[key.len() + 1..].trim().to_string(),
            )
            .is_some()
            && !issues.contains(&MemoryIssue::DuplicateSystemField)
        {
            issues.push(MemoryIssue::DuplicateSystemField);
        }
    }
    (values, issues)
}

fn back(values: &BTreeMap<String, String>) -> Option<MemoryBack> {
    let kind = scalar(
        values
            .get("_memnova_back_kind")
            .map(String::as_str)
            .unwrap_or(""),
    );
    if kind == "inline" {
        return (!values.contains_key("_memnova_back_page_id")
            && !values.contains_key("_memnova_back_face"))
        .then_some(MemoryBack::Inline);
    }
    let page_id = scalar(
        values
            .get("_memnova_back_page_id")
            .map(String::as_str)
            .unwrap_or(""),
    );
    let face = match scalar(
        values
            .get("_memnova_back_face")
            .map(String::as_str)
            .unwrap_or(""),
    ) {
        "front" => MemoryFace::Front,
        "back" => MemoryFace::Back,
        _ => return None,
    };
    (kind == "page" && valid_uuid(page_id)).then(|| MemoryBack::Page {
        page_id: page_id.to_lowercase(),
        face,
    })
}

fn bare_value(value: Option<&String>) -> Option<&str> {
    value.map(|raw| {
        let clean = scalar(raw);
        if raw.trim().starts_with(['\'', '"']) {
            raw.as_str()
        } else {
            clean
        }
    })
}

fn read_config(values: &BTreeMap<String, String>) -> Result<MemoryConfig, MemoryIssue> {
    let version = bare_value(values.get("_memnova_learning_version"));
    if let Some(version) = version {
        if version != "1"
            && version.starts_with(['1', '2', '3', '4', '5', '6', '7', '8', '9'])
            && version.bytes().all(|byte| byte.is_ascii_digit())
        {
            return Err(MemoryIssue::UnsupportedVersion);
        }
    }
    let enabled = match bare_value(values.get("_memnova_learning_enabled")) {
        Some("true") => true,
        Some("false") => false,
        _ => return Err(MemoryIssue::InvalidConfig),
    };
    if version != Some("1") {
        return Err(MemoryIssue::InvalidConfig);
    }
    Ok(MemoryConfig {
        version: 1,
        enabled,
        back: back(values).ok_or(MemoryIssue::InvalidConfig)?,
    })
}

pub(super) fn metadata(lines: &[Line<'_>]) -> Metadata {
    let (values, mut issues) = fields(lines);
    let page_id = values
        .get("_memnova_page_id")
        .map(|raw| scalar(raw).to_lowercase());
    if page_id.as_ref().is_some_and(|id| !valid_uuid(id)) {
        issues.push(MemoryIssue::InvalidSystemField);
    }
    let mut config = None;
    if issues.is_empty() && CONFIG_KEYS.iter().any(|key| values.contains_key(*key)) {
        match read_config(&values) {
            Ok(value) => config = Some(value),
            Err(issue) => issues.push(issue),
        }
    }
    Metadata {
        config,
        page_id,
        issues,
    }
}

pub(super) fn config_values(config: &MemoryConfig) -> Vec<(&'static str, String)> {
    let mut fields = vec![
        (CONFIG_KEYS[0], config.version.to_string()),
        (CONFIG_KEYS[1], config.enabled.to_string()),
        (
            CONFIG_KEYS[2],
            if matches!(config.back, MemoryBack::Inline) {
                "inline"
            } else {
                "page"
            }
            .into(),
        ),
    ];
    if let MemoryBack::Page { page_id, face } = &config.back {
        fields.push((CONFIG_KEYS[3], page_id.clone()));
        fields.push((
            CONFIG_KEYS[4],
            if *face == MemoryFace::Front {
                "front"
            } else {
                "back"
            }
            .into(),
        ));
    }
    fields
}
