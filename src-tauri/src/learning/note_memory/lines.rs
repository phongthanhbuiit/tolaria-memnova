use regex::Regex;
use std::sync::OnceLock;

pub(super) const MARKER: &str = "<!-- FLASHCARD:BACK -->";

#[derive(Clone, Copy, Debug)]
pub(super) struct Line<'a> {
    pub start: usize,
    pub end: usize,
    pub text: &'a str,
}

#[derive(Clone, Copy, Debug)]
pub(super) struct Header {
    pub content_start: usize,
    pub content_end: usize,
    pub body_start: usize,
}

#[derive(Clone, Copy)]
struct Fence<'a> {
    character: u8,
    length: usize,
    info: &'a str,
}

#[derive(Default)]
struct InlineContext {
    comment: bool,
    ticks: usize,
}

pub(super) fn lines(source: &str) -> Vec<Line<'_>> {
    let mut start = 0;
    source
        .split_inclusive('\n')
        .map(|raw| {
            let end = start + raw.len();
            let text = raw
                .strip_suffix('\n')
                .map(|line| line.strip_suffix('\r').unwrap_or(line))
                .unwrap_or(raw);
            let line = Line { start, end, text };
            start = end;
            line
        })
        .collect()
}

pub(super) fn header(lines: &[Line<'_>]) -> Result<Option<Header>, ()> {
    let Some(first) = lines.first() else {
        return Ok(None);
    };
    if first.text.trim_start_matches('\u{feff}').trim_end() != "---" {
        return Ok(None);
    }
    let closing = lines
        .iter()
        .skip(1)
        .find(|line| line.text.trim_end() == "---")
        .ok_or(())?;
    Ok(Some(Header {
        content_start: first.end,
        content_end: closing.start,
        body_start: closing.end,
    }))
}

fn fence_at(text: &str) -> Option<Fence<'_>> {
    let spaces = text.bytes().take_while(|byte| *byte == b' ').count();
    if spaces > 3 {
        return None;
    }
    let rest = &text[spaces..];
    let character = *rest.as_bytes().first()?;
    if ![b'`', b'~'].contains(&character) {
        return None;
    }
    let length = rest.bytes().take_while(|byte| *byte == character).count();
    (length >= 3).then(|| Fence {
        character,
        length,
        info: &rest[length..],
    })
}

fn escaped(source: &str, offset: usize) -> bool {
    source.as_bytes()[..offset]
        .iter()
        .rev()
        .take_while(|byte| **byte == b'\\')
        .count()
        % 2
        == 1
}

fn advance_inline(source: &str, context: &mut InlineContext) {
    static TOKENS: OnceLock<Regex> = OnceLock::new();
    let tokens = TOKENS.get_or_init(|| Regex::new(r"<!--|-->|`+").expect("static token regex"));
    for token in tokens.find_iter(source) {
        if escaped(source, token.start()) {
            continue;
        }
        let text = token.as_str();
        if context.comment {
            if text == "-->" {
                context.comment = false;
            }
        } else if context.ticks != 0 {
            if text.starts_with('`') && text.len() == context.ticks {
                context.ticks = 0;
            }
        } else if text == "<!--" {
            context.comment = true;
        } else if text.starts_with('`') {
            context.ticks = text.len();
        }
    }
}

fn closes(candidate: Option<Fence<'_>>, current: Fence<'_>) -> bool {
    candidate.is_some_and(|next| {
        next.character == current.character
            && next.length >= current.length
            && next.info.trim().is_empty()
    })
}

fn opens(candidate: Option<Fence<'_>>) -> Option<Fence<'_>> {
    candidate.filter(|next| next.character != b'`' || !next.info.contains('`'))
}

pub(super) fn boundaries<'a>(lines: &[Line<'a>]) -> Vec<Line<'a>> {
    let mut found = Vec::new();
    let mut context = InlineContext::default();
    let mut fence = None;
    for line in lines {
        let candidate = fence_at(line.text);
        if let Some(current) = fence {
            if closes(candidate, current) {
                fence = None;
            }
            continue;
        }
        if !context.comment && context.ticks == 0 {
            if let Some(opening) = opens(candidate) {
                fence = Some(opening);
                continue;
            }
            if line.text.trim_end() == MARKER {
                found.push(*line);
                continue;
            }
        }
        advance_inline(line.text, &mut context);
    }
    found
}
