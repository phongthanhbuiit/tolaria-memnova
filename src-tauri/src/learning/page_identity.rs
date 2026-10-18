use super::legacy_markdown;

/// Insert only the owned identity line. Existing YAML comments, quoting,
/// mixed line endings, BOM and Markdown bytes are kept verbatim.
pub(super) fn with_page_id(source: &str, id: &str) -> Result<String, String> {
    let id = uuid::Uuid::parse_str(id)
        .map_err(|_| "Invalid page identity")?
        .to_string();
    let (metadata, body) = legacy_markdown::frontmatter(source)?;
    if let Some(existing) = legacy_markdown::page_id(&metadata)? {
        if existing != id {
            return Err("A page identity cannot be reassigned".into());
        }
        return Ok(source.into());
    }
    let candidate = source.strip_prefix('\u{feff}').unwrap_or(source);
    let line_ending = if candidate.contains("\r\n") {
        "\r\n"
    } else {
        "\n"
    };
    let line = format!("_memnova_page_id: {id}{line_ending}");
    if candidate.starts_with("---\n") || candidate.starts_with("---\r\n") {
        let body_start = source.len() - body.len();
        let offset = source[..body_start]
            .rfind("\n---")
            .ok_or("Malformed frontmatter delimiter")?
            + 1;
        return Ok(format!(
            "{}{}{}",
            &source[..offset],
            line,
            &source[offset..]
        ));
    }
    let bom = if source.starts_with('\u{feff}') {
        "\u{feff}"
    } else {
        ""
    };
    Ok(format!(
        "{bom}---{line_ending}{line}---{line_ending}{candidate}"
    ))
}

/// A duplicate owns fresh memory, while every non-identity byte remains unchanged.
pub(super) fn fresh_page_id(source: &str) -> Result<String, String> {
    let document = super::note_memory::parse_document(source);
    let next = uuid::Uuid::new_v4().to_string();
    let Some(previous) = document.page_id else {
        return with_page_id(source, &next);
    };
    let header = &source[..document.ranges.front.start];
    let mut offset = 0;
    for line in header.split_inclusive('\n') {
        if let Some(value) = line.strip_prefix("_memnova_page_id:") {
            // Match only this owned scalar, never a reference or the body.
            let start = offset + line.len() - value.len()
                + value
                    .to_lowercase()
                    .find(&previous.to_lowercase())
                    .ok_or("Invalid page identity scalar")?;
            return Ok(format!(
                "{}{}{}",
                &source[..start],
                next,
                &source[start + previous.len()..]
            ));
        }
        offset += line.len();
    }
    Err("Invalid page identity header".into())
}
