use super::{
    note_conversion_intent::{
        ConversionBackChoice, ConversionFaceChoice, ConversionMemoryChoice, ConversionSources,
        NoteConversionRequest,
    },
    note_conversion_models::{NoteConversionCandidate, NoteConversionPage},
    note_media::MediaSnapshot,
    note_memory::{
        parse_document, patch_config, patch_face, useful_content, MemoryBack, MemoryConfig,
        MemoryFace,
    },
};
use rusqlite::Connection;
use std::path::Path;

pub(super) fn selected_card<'a>(
    page: &'a NoteConversionPage,
    id: &str,
) -> Result<&'a NoteConversionCandidate, String> {
    page.candidates
        .iter()
        .find(|candidate| candidate.card.id == id && candidate.card.status != "trashed")
        .ok_or_else(|| "invalid-conversion-card-choice".into())
}
fn selected_face(
    page: &NoteConversionPage,
    choice: &ConversionFaceChoice,
    face: MemoryFace,
) -> Result<String, String> {
    match choice {
        ConversionFaceChoice::Markdown {} => Ok(match face {
            MemoryFace::Front => page.front.clone(),
            MemoryFace::Back => page.back.clone().unwrap_or_default(),
        }),
        ConversionFaceChoice::Card { card_id } => {
            let candidate = selected_card(page, card_id)?;
            if face == MemoryFace::Back && candidate.card.answer_mode != "inline" {
                return Err("choose-explicit-whole-page-mnemonic".into());
            }
            Ok(if face == MemoryFace::Front {
                candidate.card.front.clone()
            } else {
                candidate.card.back.clone()
            })
        }
    }
}
pub(super) fn selected_document(
    source: &str,
    page: &NoteConversionPage,
    request: &NoteConversionRequest,
) -> Result<String, String> {
    let back = match &request.back {
        ConversionBackChoice::Inline { .. } => MemoryBack::Inline,
        ConversionBackChoice::Page { page_id, face } => {
            if page_id == &request.page_id {
                return Err("self-source".into());
            }
            uuid::Uuid::parse_str(page_id).map_err(|_| "invalid-back-source-id")?;
            MemoryBack::Page {
                page_id: page_id.clone(),
                face: *face,
            }
        }
    };
    let configured = patch_config(
        source,
        &MemoryConfig {
            version: 1,
            enabled: true,
            back,
        },
    )?;
    let front = selected_face(page, &request.front, MemoryFace::Front)?;
    let mut updated = patch_face(&configured, MemoryFace::Front, &front, false)?;
    if let ConversionBackChoice::Inline { source } = &request.back {
        updated = patch_face(
            &updated,
            MemoryFace::Back,
            &selected_face(page, source, MemoryFace::Back)?,
            true,
        )?;
    }
    Ok(updated)
}
pub(super) fn selected_sources(
    connection: &Connection,
    root: &Path,
    path: &str,
    source: &str,
    back: &ConversionBackChoice,
) -> Result<ConversionSources, String> {
    let document = parse_document(source);
    if !document.issues.is_empty() {
        return Err("invalid-conversion-source".into());
    }
    let mut media = MediaSnapshot::default();
    let front_media = media.collect(root, path, &document.front)?;
    let linked = match back {
        ConversionBackChoice::Inline { .. } => None,
        ConversionBackChoice::Page { page_id, face } => Some(super::note_snapshot::preview_face(
            connection, root, page_id, *face, &mut media,
        )?),
    };
    let content = linked
        .as_ref()
        .map(|page| page.content.as_str())
        .unwrap_or(&document.back);
    let back_media = match &linked {
        Some(page) => page.media.clone(),
        None => media.collect(root, path, content)?,
    };
    let front_ready = useful_content(&document.front)?;
    let back_ready = useful_content(content)?;
    Ok(ConversionSources {
        front_media,
        back_media,
        linked,
        ready: front_ready && back_ready,
    })
}

pub(super) struct SelectedConversion {
    pub page: NoteConversionPage,
    pub before: String,
    pub after: String,
    pub sources: ConversionSources,
    pub card_id: String,
    pub schedule: super::Schedule,
}
pub(super) fn prepare_selection(
    store: &super::Store,
    request: &NoteConversionRequest,
) -> Result<SelectedConversion, String> {
    let preview = super::preview_note_conversion(&store.root, Some(&store.library_id))?;
    if preview.state != "ready" {
        return Err("conversion-requires-ready-library".into());
    }
    let page = preview
        .pages
        .into_iter()
        .find(|page| page.page_id.as_deref() == Some(&request.page_id))
        .ok_or("missing-conversion-page")?;
    if page.fingerprint != request.expected_fingerprint
        || page.active_session_count != 0
        || ![
            "matching",
            "conflict",
            "multiple",
            "wholePage",
            "trashed",
            "legacyMarkdown",
        ]
        .contains(&page.classification.as_str())
    {
        return Err("conversion-preview-changed-or-session-active".into());
    }
    let before =
        std::fs::read_to_string(store.page_path(&page.path)?).map_err(|error| error.to_string())?;
    let after = selected_document(&before, &page, request)?;
    let sources = selected_sources(&store.conn, &store.root, &page.path, &after, &request.back)?;
    let (card_id, schedule) = memory_identity(&page, &request.memory)?;
    Ok(SelectedConversion {
        page,
        before,
        after,
        sources,
        card_id,
        schedule,
    })
}

fn memory_identity(
    page: &NoteConversionPage,
    choice: &ConversionMemoryChoice,
) -> Result<(String, super::Schedule), String> {
    Ok(match choice {
        ConversionMemoryChoice::Reuse { card_id, .. } => {
            let card = selected_card(page, card_id)?;
            card.card
                .revision
                .checked_add(1)
                .ok_or("conversion-card-revision-overflow")?;
            (card_id.clone(), card.card.schedule.clone())
        }
        ConversionMemoryChoice::Fresh {} => {
            (uuid::Uuid::new_v4().to_string(), super::Schedule::fresh())
        }
    })
}
