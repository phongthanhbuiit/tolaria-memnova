mod config;
mod lines;
mod patch;
pub use config::{MemoryBack, MemoryConfig, MemoryFace, MemoryIssue};
pub use patch::{patch_config, patch_face};
use serde::Serialize;

#[derive(Clone, Copy, Debug, Serialize)]
pub struct MemoryRange {
    pub start: usize,
    pub end: usize,
}

#[derive(Clone, Debug, Serialize)]
pub struct MemoryRanges {
    pub front: MemoryRange,
    pub back: Option<MemoryRange>,
    pub marker: Option<MemoryRange>,
}

#[derive(Debug)]
pub struct MemoryDocument {
    pub front: String,
    pub back: String,
    pub config: Option<MemoryConfig>,
    pub page_id: Option<String>,
    pub issues: Vec<MemoryIssue>,
    pub ranges: MemoryRanges,
    header: Option<lines::Header>,
}

fn ranges(body_start: usize, length: usize, boundary: Option<lines::Line<'_>>) -> MemoryRanges {
    let mut ranges = MemoryRanges {
        front: MemoryRange {
            start: body_start,
            end: length,
        },
        back: None,
        marker: None,
    };
    if let Some(boundary) = boundary {
        ranges.front.end = boundary.start;
        ranges.back = Some(MemoryRange {
            start: boundary.end,
            end: length,
        });
        ranges.marker = Some(MemoryRange {
            start: boundary.start,
            end: boundary.end,
        });
    }
    ranges
}

fn metadata_lines<'a>(
    lines: &[lines::Line<'a>],
    header: Option<lines::Header>,
) -> Vec<lines::Line<'a>> {
    lines
        .iter()
        .filter(|line| {
            header.is_some_and(|head| {
                line.start >= head.content_start && line.start < head.content_end
            })
        })
        .copied()
        .collect()
}

pub fn parse_document(source: &str) -> MemoryDocument {
    let lines = lines::lines(source);
    let header = lines::header(&lines);
    let body_start = match header {
        Ok(Some(header)) => header.body_start,
        Ok(None) => {
            if source.starts_with('\u{feff}') {
                3
            } else {
                0
            }
        }
        Err(()) => 0,
    };
    let meta_lines = metadata_lines(&lines, header.ok().flatten());
    let mut metadata = config::metadata(&meta_lines);
    let mut body_lines = lines::lines(&source[body_start..]);
    for line in &mut body_lines {
        line.start += body_start;
        line.end += body_start;
    }
    let boundaries = if header.is_err() {
        metadata.issues.push(MemoryIssue::UnclosedFrontmatter);
        Vec::new()
    } else {
        lines::boundaries(&body_lines)
    };
    if boundaries.len() > 1 {
        metadata.issues.push(MemoryIssue::AmbiguousBackMarker);
    }
    let boundary = if boundaries.len() == 1 {
        boundaries.first().copied()
    } else {
        None
    };
    let ranges = ranges(body_start, source.len(), boundary);
    MemoryDocument {
        front: source[ranges.front.start..ranges.front.end].into(),
        back: ranges
            .back
            .map(|range| source[range.start..range.end].to_string())
            .unwrap_or_default(),
        config: metadata.config,
        page_id: metadata.page_id,
        issues: metadata.issues,
        ranges,
        header: header.ok().flatten(),
    }
}

fn editable(source: &str) -> Result<MemoryDocument, String> {
    let document = parse_document(source);
    if document.issues.is_empty() {
        Ok(document)
    } else {
        Err(format!(
            "Invalid note-memory document: {:?}",
            document.issues
        ))
    }
}
mod readiness;
pub use readiness::useful_content;
