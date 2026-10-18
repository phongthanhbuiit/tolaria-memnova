use super::lines;
use regex::Regex;
use serde_json::Value;
use std::{
    collections::{BTreeMap, BTreeSet},
    sync::OnceLock,
};

fn masked_line(source: &str, context: &mut lines::InlineContext) -> String {
    static TOKENS: OnceLock<Regex> = OnceLock::new();
    let tokens =
        TOKENS.get_or_init(|| Regex::new(r"<!--|-->|`+").expect("static media token regex"));
    let mut output = String::new();
    let mut cursor = 0;
    for token in tokens.find_iter(source) {
        let visible = !context.comment && context.ticks == 0;
        let before = &source[cursor..token.start()];
        if visible {
            output.push_str(before);
        } else {
            output.push_str(&" ".repeat(before.len()));
        }
        if lines::escaped(source, token.start()) {
            output.push_str(token.as_str());
        } else {
            output.push_str(&" ".repeat(token.len()));
            lines::advance_inline(token.as_str(), context);
        }
        cursor = token.end();
    }
    if !context.comment && context.ticks == 0 {
        output.push_str(&source[cursor..]);
    } else {
        output.push_str(&" ".repeat(source.len() - cursor));
    }
    output
}
fn board_sources(source: &str) -> Result<Vec<String>, String> {
    if source.trim().is_empty() {
        return Ok(Vec::new());
    }
    let value: Value = serde_json::from_str(source).map_err(|_| "invalid-canvas")?;
    if value.as_object().is_some_and(|object| object.is_empty()) {
        return Ok(Vec::new());
    }
    let records = value
        .get("store")
        .or_else(|| value.get("records"))
        .or_else(|| value.pointer("/document/store"))
        .and_then(Value::as_object)
        .ok_or("unsupported-canvas")?;
    let mut used = BTreeSet::new();
    for record in records
        .values()
        .filter(|record| record["typeName"] == "shape")
    {
        if let Some(id) = record.pointer("/props/assetId").and_then(Value::as_str) {
            used.insert(id);
        } else if ["image", "video", "bookmark"]
            .iter()
            .any(|kind| record["type"] == *kind)
        {
            return Err("missing-board-asset".into());
        }
    }
    used.into_iter()
        .map(|id| {
            let asset = records
                .get(id)
                .or_else(|| records.values().find(|record| record["id"] == id))
                .ok_or("missing-board-asset")?;
            asset
                .pointer("/props/src")
                .and_then(Value::as_str)
                .filter(|source| !source.is_empty())
                .map(String::from)
                .ok_or_else(|| "missing-board-asset-source".into())
        })
        .collect()
}
fn visible_source(source: &str) -> Result<(String, Vec<String>), String> {
    let mut context = lines::InlineContext::default();
    let mut fence = None;
    let mut board = None;
    let mut visible = String::new();
    let mut urls = Vec::new();
    let mut indentation = super::indent::CodeIndent::default();
    for line in lines::lines(source) {
        let candidate = lines::fence_at(line.text);
        if let Some(current) = fence {
            if lines::closes(candidate, current) {
                if let Some(start) = board.take() {
                    urls.extend(board_sources(&source[start..line.start])?);
                }
                fence = None;
                indentation.boundary();
            }
            visible.push('\n');
            continue;
        }
        if !context.comment && context.ticks == 0 {
            if indentation.masks(line.text) {
                visible.push('\n');
                continue;
            }
            if let Some(opening) = lines::opens(candidate) {
                if opening
                    .info
                    .split_whitespace()
                    .next()
                    .is_some_and(|language| language.eq_ignore_ascii_case("tldraw"))
                {
                    board = Some(line.end);
                }
                fence = Some(opening);
                indentation.boundary();
                visible.push('\n');
                continue;
            }
        }
        visible.push_str(&masked_line(line.text, &mut context));
        visible.push('\n');
    }
    if board.is_some() {
        return Err("unclosed-canvas".into());
    }
    Ok((visible, urls))
}
fn destination_end(source: &str, start: usize) -> Option<usize> {
    let bytes = source.as_bytes();
    let mut depth = 1;
    let mut index = start;
    let mut angle = false;
    let mut quote = None;
    while index < bytes.len() {
        let byte = bytes[index];
        if byte == b'\\' {
            index += 2;
            continue;
        }
        if let Some(current) = quote {
            if byte == current {
                quote = None;
            }
        } else if angle {
            if byte == b'>' {
                angle = false;
            }
        } else if byte == b'<' {
            angle = true;
        } else if [b'"', b'\''].contains(&byte)
            && index > start
            && bytes[index - 1].is_ascii_whitespace()
        {
            quote = Some(byte);
        } else if byte == b'(' {
            depth += 1;
        } else if byte == b')' {
            depth -= 1;
            if depth == 0 {
                return Some(index);
            }
        }
        index += 1;
    }
    None
}
fn destination(source: &str) -> String {
    let source = source.trim();
    let url = if let Some(source) = source.strip_prefix('<') {
        source.split('>').next().unwrap_or(source)
    } else {
        source
            .split(" \"")
            .next()
            .unwrap_or(source)
            .split(" '")
            .next()
            .unwrap_or(source)
    };
    url.replace("\\(", "(")
        .replace("\\)", ")")
        .replace("\\ ", " ")
}
fn media_extension(url: &str) -> bool {
    let path = url
        .split(['?', '#'])
        .next()
        .unwrap_or(url)
        .to_ascii_lowercase();
    [
        "png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "avif", "mp3", "wav", "ogg", "m4a",
        "flac", "mp4", "webm", "mov", "pdf",
    ]
    .iter()
    .any(|extension| path.ends_with(&format!(".{extension}")))
}
fn markdown_sources(visible: &str) -> Vec<String> {
    static LINKS: OnceLock<Regex> = OnceLock::new();
    let links =
        LINKS.get_or_init(|| Regex::new(r"!?\[[^\]\n]*\]\(").expect("static media link regex"));
    let mut urls = Vec::new();
    for prefix in links.find_iter(visible) {
        if lines::escaped(visible, prefix.start()) {
            continue;
        }
        if let Some(end) = destination_end(visible, prefix.end()) {
            let url = destination(&visible[prefix.end()..end]);
            if prefix.as_str().starts_with('!') || media_extension(&url) {
                urls.push(url);
            }
        }
    }
    urls
}
fn reference_sources(visible: &str) -> Vec<String> {
    static DEFINITION: OnceLock<Regex> = OnceLock::new();
    static REFERENCES: OnceLock<Regex> = OnceLock::new();
    let definition = DEFINITION.get_or_init(|| {
        Regex::new(r"(?m)^ {0,3}\[([^\]\n]+)\]:\s*(.+)$").expect("static media definition regex")
    });
    let references = REFERENCES.get_or_init(|| {
        Regex::new(r"!\[([^\]\n]*)\](?:\[([^\]\n]*)\])?").expect("static image reference regex")
    });
    let normalize = |name: &str| {
        name.split_whitespace()
            .collect::<Vec<_>>()
            .join(" ")
            .to_lowercase()
    };
    let definitions: BTreeMap<_, _> = definition
        .captures_iter(visible)
        .map(|capture| (normalize(&capture[1]), destination(&capture[2])))
        .collect();
    references
        .captures_iter(visible)
        .filter(|capture| {
            !lines::escaped(visible, capture.get(0).expect("complete match").start())
                && !visible[capture.get(0).expect("complete match").end()..].starts_with('(')
        })
        .filter_map(|capture| {
            let name = capture
                .get(2)
                .filter(|name| !name.as_str().is_empty())
                .map(|name| name.as_str())
                .unwrap_or(&capture[1]);
            definitions.get(&normalize(name)).cloned()
        })
        .collect()
}
/// Collect explicit media only, never note links or transclusion targets.
pub fn media_sources(source: &str) -> Result<Vec<String>, String> {
    let (visible, mut urls) = visible_source(source)?;
    urls.extend(markdown_sources(&visible));
    urls.extend(reference_sources(&visible));
    static HTML: OnceLock<Regex> = OnceLock::new();
    let html = HTML.get_or_init(|| {
        Regex::new(r#"(?i)<(?:img|audio|video|source)\b[^>]*\bsrc\s*=\s*["']([^"']+)["']"#)
            .expect("static media HTML regex")
    });
    urls.extend(
        html.captures_iter(&visible)
            .map(|capture| capture[1].to_string()),
    );
    urls.sort();
    urls.dedup();
    if urls.len() > 10_000 {
        return Err("media-dependency-limit".into());
    }
    Ok(urls)
}
