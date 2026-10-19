//! Display-only removal of closed durable canvas payloads; never a note writer.
struct Fence<'a> {
    marker: &'a str,
    info: &'a str,
}

fn opening(line: &str) -> Option<Fence<'_>> {
    let spaces = line.bytes().take_while(|byte| *byte == b' ').count();
    if spaces > 3 {
        return None;
    }
    let rest = &line[spaces..];
    let character = *rest.as_bytes().first()?;
    if character != b'`' && character != b'~' {
        return None;
    }
    let length = rest.bytes().take_while(|byte| *byte == character).count();
    (length >= 3).then(|| Fence {
        marker: &rest[..length],
        info: rest[length..].trim(),
    })
}

fn closes(line: &str, fence: &Fence<'_>) -> bool {
    opening(line).is_some_and(|candidate| {
        candidate.info.is_empty()
            && candidate.marker.as_bytes()[0] == fence.marker.as_bytes()[0]
            && candidate.marker.len() >= fence.marker.len()
    })
}

pub(super) fn snippet_markdown(content: &str) -> String {
    let lines: Vec<&str> = content.lines().collect();
    let mut visible = Vec::new();
    let mut index = 0;
    while index < lines.len() {
        let Some(fence) = opening(lines[index]) else {
            visible.push(lines[index]);
            index += 1;
            continue;
        };
        let Some(end) = (index + 1..lines.len()).find(|&next| closes(lines[next], &fence)) else {
            visible.extend_from_slice(&lines[index..]);
            break;
        };
        if !fence
            .info
            .split_whitespace()
            .next()
            .unwrap_or("")
            .eq_ignore_ascii_case("tldraw")
        {
            visible.extend_from_slice(&lines[index..=end]);
        }
        index = end + 1;
    }
    visible.join("\n")
}
