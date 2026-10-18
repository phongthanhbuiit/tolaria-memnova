use super::lines;
use serde_json::Value;

fn board_useful(source: &str) -> Result<bool, String> {
    if source.trim().is_empty() {
        return Ok(false);
    }
    let value: Value = serde_json::from_str(source).map_err(|_| "invalid-canvas")?;
    let object = value.as_object().ok_or("invalid-canvas")?;
    if object.is_empty() {
        return Ok(false);
    }
    let records = value
        .get("store")
        .or_else(|| value.get("records"))
        .or_else(|| value.pointer("/document/store"))
        .and_then(Value::as_object)
        .ok_or("unsupported-canvas")?;
    Ok(records
        .values()
        .any(|record| record.get("typeName").and_then(Value::as_str) == Some("shape")))
}

/// A board's JSON is storage, not mnemonic content. A shape makes an otherwise blank board useful.
pub fn useful_content(source: &str) -> Result<bool, String> {
    let mut useful = false;
    let mut fence = None;
    let mut board_start = None;
    let mut normal_fence_has_content = false;
    for line in lines::lines(source) {
        let candidate = lines::fence_at(line.text);
        if let Some(current) = fence {
            if lines::closes(candidate, current) {
                if let Some(start) = board_start.take() {
                    useful |= board_useful(&source[start..line.start])?;
                } else {
                    useful |= normal_fence_has_content;
                }
                fence = None;
            } else if board_start.is_none() && !line.text.trim().is_empty() {
                normal_fence_has_content = true;
            }
            continue;
        }
        if let Some(opening) = lines::opens(candidate) {
            let language = opening.info.split_whitespace().next().unwrap_or("");
            board_start = language.eq_ignore_ascii_case("tldraw").then_some(line.end);
            normal_fence_has_content = false;
            fence = Some(opening);
        } else {
            useful |= !line.text.trim().is_empty();
        }
    }
    if board_start.is_some() {
        return Err("unclosed-canvas".into());
    }
    Ok(useful || normal_fence_has_content)
}
