use super::{
    config::{config_values, scalar, CONFIG_KEYS},
    editable, lines, MemoryConfig, MemoryFace,
};

fn newline(source: &str) -> &'static str {
    if source.contains("\r\n") {
        "\r\n"
    } else {
        "\n"
    }
}

fn append_back(source: &str, content: &str) -> Result<String, String> {
    let eol = newline(source);
    let separator = if source.ends_with('\n') {
        eol.to_string()
    } else {
        format!("{eol}{eol}")
    };
    let next = format!("{source}{separator}{}{eol}{content}", lines::MARKER);
    if editable(&next)?.ranges.marker.is_none() {
        return Err("invalid-face-boundary".into());
    }
    Ok(next)
}

fn replace_face(
    source: &str,
    document: &super::MemoryDocument,
    face: MemoryFace,
    content: &str,
) -> Result<String, String> {
    let range = match face {
        MemoryFace::Front => document.ranges.front,
        MemoryFace::Back => document.ranges.back.ok_or("Missing reverse face")?,
    };
    let suffix = if face == MemoryFace::Front
        && document.ranges.marker.is_some()
        && !content.is_empty()
        && !content.ends_with('\n')
    {
        newline(source)
    } else {
        ""
    };
    let next = format!(
        "{}{content}{suffix}{}",
        &source[..range.start],
        &source[range.end..]
    );
    let parsed = editable(&next)?;
    if face == MemoryFace::Front
        && document.ranges.marker.is_some() != parsed.ranges.marker.is_some()
    {
        return Err("invalid-face-boundary".into());
    }
    Ok(next)
}

pub fn patch_face(
    source: &str,
    face: MemoryFace,
    content: &str,
    create_back: bool,
) -> Result<String, String> {
    let document = editable(source)?;
    let current = match face {
        MemoryFace::Front => &document.front,
        MemoryFace::Back => &document.back,
    };
    if current == content && !(create_back && document.ranges.back.is_none()) {
        return Ok(source.into());
    }
    if face == MemoryFace::Back && document.ranges.back.is_none() {
        return append_back(source, content);
    }
    replace_face(source, &document, face, content)
}

fn take_value(values: &mut Vec<(&'static str, String)>, key: &str) -> Option<String> {
    let index = values.iter().position(|(name, _)| *name == key)?;
    Some(values.remove(index).1)
}

fn header_line(
    source: &str,
    line: lines::Line<'_>,
    values: &mut Vec<(&'static str, String)>,
) -> String {
    let Some((key, raw)) = line.text.split_once(':') else {
        return source[line.start..line.end].into();
    };
    if !CONFIG_KEYS.contains(&key) {
        return source[line.start..line.end].into();
    }
    let Some(value) = take_value(values, key) else {
        return String::new();
    };
    let current = scalar(raw);
    let matches = if key == "_memnova_back_page_id" {
        current.eq_ignore_ascii_case(&value)
    } else {
        current == value
    };
    if matches {
        return source[line.start..line.end].into();
    }
    let comment = raw.char_indices().find(|(index, ch)| {
        *ch == '#'
            && raw[..*index]
                .chars()
                .next_back()
                .is_some_and(char::is_whitespace)
    });
    let tail = comment
        .map(|(index, _)| {
            let prefix = &raw[..index];
            &raw[prefix.trim_end().len()..]
        })
        .unwrap_or("");
    format!(
        "{key}: {value}{tail}{}",
        &source[line.start + line.text.len()..line.end]
    )
}

fn patch_header(source: &str, config: &MemoryConfig) -> String {
    let mut values = config_values(config);
    let mut output: String = lines::lines(source)
        .into_iter()
        .map(|line| header_line(source, line, &mut values))
        .collect();
    for (key, value) in values {
        output.push_str(&format!("{key}: {value}{}", newline(source)));
    }
    output
}

pub fn patch_config(source: &str, config: &MemoryConfig) -> Result<String, String> {
    if !config.valid() {
        return Err("invalid-config".into());
    }
    let document = editable(source)?;
    if document.config.as_ref().map(config_values).as_ref() == Some(&config_values(config)) {
        return Ok(source.into());
    }
    let next = if let Some(header) = document.header {
        format!(
            "{}{}{}",
            &source[..header.content_start],
            patch_header(&source[header.content_start..header.content_end], config),
            &source[header.content_end..]
        )
    } else {
        let prefix = if source.starts_with('\u{feff}') {
            "\u{feff}"
        } else {
            ""
        };
        let eol = newline(source);
        format!(
            "{prefix}---{eol}{}---{eol}{}",
            patch_header("", config).replace('\n', eol),
            &source[prefix.len()..]
        )
    };
    editable(&next)?;
    Ok(next)
}
