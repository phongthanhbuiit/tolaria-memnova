//! Display-only removal of closed drawing fences. Source Markdown remains untouched.
struct ContainerLine<'a> {
    text: &'a str,
    quotes: usize,
    listed: bool,
    prefix_len: usize,
}

fn after_list_marker(text: &str) -> Option<&str> {
    let bytes = text.as_bytes();
    let marker_len = match bytes.first()? {
        b'-' | b'+' | b'*' => 1,
        b'0'..=b'9' => {
            let digits = bytes
                .iter()
                .take_while(|byte| byte.is_ascii_digit())
                .count();
            if digits > 9 || !matches!(bytes.get(digits), Some(b'.' | b')')) {
                return None;
            }
            digits + 1
        }
        _ => return None,
    };
    matches!(bytes.get(marker_len), Some(b' ' | b'\t'))
        .then(|| text[marker_len..].trim_start_matches([' ', '\t']))
}

fn without_containers(line: &str) -> ContainerLine<'_> {
    let mut text = line;
    let mut quotes = 0;
    let mut listed = false;
    loop {
        let trimmed = text.trim_start_matches([' ', '\t']);
        if let Some(rest) = trimmed.strip_prefix('>') {
            quotes += 1;
            text = rest.strip_prefix([' ', '\t']).unwrap_or(rest);
        } else if let Some(rest) = after_list_marker(trimmed) {
            listed = true;
            text = rest;
        } else {
            break;
        }
    }
    ContainerLine {
        text,
        quotes,
        listed,
        prefix_len: line.len() - text.len(),
    }
}

struct Fence<'a> {
    marker: &'a str,
    info: &'a str,
    quotes: usize,
    listed: bool,
    indent: usize,
}

fn opening(line: &str, allow_indented: bool) -> Option<Fence<'_>> {
    let line = without_containers(line);
    let rest = line.text.trim_start_matches([' ', '\t']);
    let spaces = line.text.len() - rest.len();
    if !allow_indented
        && line.quotes == 0
        && !line.listed
        && (spaces > 3 || line.text[..spaces].contains('\t'))
    {
        return None;
    }

    let marker = *rest.as_bytes().first()?;
    if !matches!(marker, b'`' | b'~') {
        return None;
    }
    let length = rest.bytes().take_while(|byte| *byte == marker).count();
    (length >= 3).then(|| Fence {
        marker: &rest[..length],
        info: rest[length..].trim(),
        quotes: line.quotes,
        listed: line.listed,
        indent: line.prefix_len + spaces,
    })
}

fn closes(line: &str, fence: &Fence<'_>) -> bool {
    opening(line, fence.listed).is_some_and(|candidate| {
        candidate.quotes == fence.quotes
            && !candidate.listed
            && candidate.info.is_empty()
            && candidate.marker.starts_with(fence.marker)
    })
}

fn leaves_container(line: &str, fence: &Fence<'_>) -> bool {
    if fence.quotes == 0 && !fence.listed {
        return false;
    }
    let line = without_containers(line);
    let text = line.text.trim_start();
    line.quotes < fence.quotes
        || (fence.listed
            && !text.is_empty()
            && (line.listed || line.prefix_len + line.text.len() - text.len() < fence.indent))
}

fn is_drawing(fence: &Fence<'_>) -> bool {
    let lang = fence.info.split_whitespace().next().unwrap_or("");
    ["excalidraw", "whiteboard", concat!("tl", "draw")]
        .iter()
        .any(|drawing| lang.eq_ignore_ascii_case(drawing))
}

pub(super) fn snippet_markdown(content: &str) -> String {
    let lines: Vec<&str> = content.lines().collect();
    let mut visible = Vec::new();
    let mut index = 0;
    while index < lines.len() {
        let Some(fence) = opening(lines[index], false) else {
            visible.push(lines[index]);
            index += 1;
            continue;
        };
        let end = (index + 1..lines.len())
            .find(|&next| leaves_container(lines[next], &fence) || closes(lines[next], &fence))
            .unwrap_or(lines.len());
        let closed = end < lines.len() && !leaves_container(lines[end], &fence);
        let next = if closed { end + 1 } else { end };
        if !closed || !is_drawing(&fence) {
            visible.extend_from_slice(&lines[index..next]);
        }
        index = next;
    }
    visible.join("\n")
}
