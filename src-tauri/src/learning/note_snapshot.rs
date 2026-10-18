use super::{
    cards::read_card,
    migration_plan::content_hash,
    note_lifecycle::NoteLearningState,
    note_media::MediaSnapshot,
    note_memory::{parse_document, MemoryBack, MemoryFace},
    note_memory_view::{memory_view, read_note_source},
    note_storage::read_note_binding,
    Card, NoteMediaDependency, Store, StudyItem, StudyPage,
};
use rusqlite::Connection;
use serde::Serialize;
use std::path::Path;

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NoteBackSource {
    pub page_id: String,
    pub path: String,
    pub face: MemoryFace,
}
#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NoteStudyDetails {
    pub back_source: NoteBackSource,
    pub properties_raw: String,
    pub front_media: Vec<NoteMediaDependency>,
    pub back_media: Vec<NoteMediaDependency>,
    pub fingerprint: String,
}
#[derive(Clone, Debug, Serialize)]
#[serde(tag = "kind", rename_all = "lowercase")]
pub enum StudyContent {
    Legacy,
    Note { details: Option<NoteStudyDetails> },
}
#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NoteFacePreview {
    pub page_id: String,
    pub path: String,
    pub face: MemoryFace,
    pub content: String,
    pub fingerprint: String,
    pub media: Vec<NoteMediaDependency>,
}

pub(super) struct ResolvedStudy {
    pub page: StudyPage,
    pub answer_page: Option<StudyPage>,
    pub content: StudyContent,
}

struct SourceDocument {
    id: String,
    path: String,
    raw: String,
    document: super::note_memory::MemoryDocument,
}
impl SourceDocument {
    fn read(connection: &Connection, root: &Path, id: &str) -> Result<Self, String> {
        let (path, raw) = read_note_source(connection, root, id)?;
        let document = parse_document(&raw);
        if !document.issues.is_empty() {
            return Err("invalid-source-document".into());
        }
        Ok(Self {
            id: id.into(),
            path,
            raw,
            document,
        })
    }
    fn face(&self, face: MemoryFace) -> Result<&str, String> {
        match face {
            MemoryFace::Front => Ok(&self.document.front),
            MemoryFace::Back => {
                if self.document.ranges.back.is_none() {
                    return Err("missing-source-back".into());
                }
                if matches!(
                    self.document.config.as_ref().map(|config| &config.back),
                    Some(MemoryBack::Page { .. })
                ) {
                    return Err("recursive-back-source".into());
                }
                Ok(&self.document.back)
            }
        }
    }
    fn back_choice(&self) -> Result<(String, MemoryFace), String> {
        let config = self
            .document
            .config
            .as_ref()
            .ok_or("missing-note-configuration")?;
        if !config.enabled {
            return Err("note-disabled".into());
        }
        match &config.back {
            MemoryBack::Inline => Ok((self.id.clone(), MemoryFace::Back)),
            MemoryBack::Page { page_id, face } => {
                if page_id == &self.id {
                    return Err("self-source".into());
                }
                Ok((page_id.clone(), *face))
            }
        }
    }
    fn fingerprint(
        &self,
        face: MemoryFace,
        media: &[NoteMediaDependency],
    ) -> Result<String, String> {
        let descriptor = serde_json::json!({"source":content_hash(&self.raw),"path":self.path,"face":face,"media":media});
        Ok(content_hash(
            &serde_json::to_string(&descriptor).map_err(|error| error.to_string())?,
        ))
    }
    fn page(
        &self,
        connection: &Connection,
        face: MemoryFace,
        media: &[NoteMediaDependency],
    ) -> Result<StudyPage, String> {
        let title = connection
            .query_row("SELECT title FROM pages WHERE id=?1", [&self.id], |row| {
                row.get(0)
            })
            .map_err(|error| error.to_string())?;
        Ok(StudyPage {
            id: self.id.clone(),
            path: self.path.clone(),
            title,
            content: self.face(face)?.into(),
            fingerprint: self.fingerprint(face, media)?,
        })
    }
    fn unchanged(&self, root: &Path) -> Result<(), String> {
        let actual = std::fs::read_to_string(super::store::checked_page_path(root, &self.path)?)
            .map_err(|error| error.to_string())?;
        if actual != self.raw {
            return Err("source-changed-during-snapshot".into());
        }
        Ok(())
    }
}
fn snapshot_faces(
    connection: &Connection,
    root: &Path,
    owner: &SourceDocument,
    reverse: &SourceDocument,
    back_face: MemoryFace,
) -> Result<ResolvedStudy, String> {
    let front = owner.face(MemoryFace::Front)?;
    let back = reverse.face(back_face)?;
    if !super::note_memory::useful_content(front)? || !super::note_memory::useful_content(back)? {
        return Err("note-source-not-ready".into());
    }
    let mut media = MediaSnapshot::default();
    let front_media = media.collect(root, &owner.path, front)?;
    let back_media = media.collect(root, &reverse.path, back)?;
    let page = owner.page(connection, MemoryFace::Front, &front_media)?;
    let answer = reverse.page(connection, back_face, &back_media)?;
    let details = NoteStudyDetails {
        back_source: NoteBackSource {
            page_id: reverse.id.clone(),
            path: reverse.path.clone(),
            face: back_face,
        },
        properties_raw: owner.raw[..owner.document.ranges.front.start].into(),
        fingerprint: content_hash(&format!("{}\0{}", page.fingerprint, answer.fingerprint)),
        front_media,
        back_media,
    };
    owner.unchanged(root)?;
    if owner.id != reverse.id {
        reverse.unchanged(root)?;
    }
    Ok(ResolvedStudy {
        page,
        answer_page: Some(answer),
        content: StudyContent::Note {
            details: Some(details),
        },
    })
}
fn note_snapshot(
    connection: &Connection,
    root: &Path,
    card: &Card,
) -> Result<ResolvedStudy, String> {
    let view = memory_view(connection, root, &card.page_id, None)?;
    if view.state != NoteLearningState::Ready {
        return Err(format!("note-source-not-ready: {:?}", view.state));
    }
    if view.binding.ok_or("missing-note-binding")?.card_id != card.id {
        return Err("note-binding-changed".into());
    }
    let owner = SourceDocument::read(connection, root, &card.page_id)?;
    let (back_id, back_face) = owner.back_choice()?;
    let linked = if back_id == owner.id {
        None
    } else {
        Some(SourceDocument::read(connection, root, &back_id)?)
    };
    snapshot_faces(
        connection,
        root,
        &owner,
        linked.as_ref().unwrap_or(&owner),
        back_face,
    )
}

pub(super) fn bound_note_card(connection: &Connection, card: &Card) -> Result<bool, String> {
    Ok(read_note_binding(connection, &card.page_id)?
        .is_some_and(|binding| binding.card_id == card.id))
}
pub(super) fn resolve_study(
    connection: &Connection,
    root: &Path,
    card: &Card,
) -> Result<ResolvedStudy, String> {
    super::note_guard::require_note_page_writable(connection, &card.page_id)?;
    if bound_note_card(connection, card)? {
        return note_snapshot(connection, root, card);
    }
    Ok(ResolvedStudy {
        page: super::study_source::study_page(connection, root, card)?,
        answer_page: super::study_source::answer_page(connection, root, card)?,
        content: StudyContent::Legacy,
    })
}
fn legacy_session_item(connection: &Connection, root: &Path, card: Card) -> StudyItem {
    let (page, mut source_error) = match super::study_source::study_page(connection, root, &card) {
        Ok(page) => (Some(page), None),
        Err(error) => (None, Some(error)),
    };
    if source_error.is_none() {
        source_error =
            super::note_guard::require_note_page_writable(connection, &card.page_id).err();
    }
    let answer_page = if page.is_some() && source_error.is_none() {
        match super::study_source::answer_page(connection, root, &card) {
            Ok(page) => page,
            Err(error) => {
                source_error = Some(error);
                None
            }
        }
    } else {
        None
    };
    StudyItem {
        card,
        page,
        answer_page,
        source_error,
        content: StudyContent::Legacy,
    }
}

pub(super) fn session_item(
    connection: &Connection,
    root: &Path,
    card: Card,
) -> Result<StudyItem, String> {
    if !bound_note_card(connection, &card)? {
        return Ok(legacy_session_item(connection, root, card));
    }
    let (page, answer_page, content, source_error) = match resolve_study(connection, root, &card) {
        Ok(resolved) => (
            Some(resolved.page),
            resolved.answer_page,
            resolved.content,
            None,
        ),
        Err(error) => (
            None,
            None,
            StudyContent::Note { details: None },
            Some(error),
        ),
    };
    Ok(StudyItem {
        card,
        page,
        answer_page,
        content,
        source_error,
    })
}

impl Store {
    /// A preview reads one static face; it never starts/reviews/enables the source.
    pub fn read_note_face(
        &self,
        page_id: &str,
        face: MemoryFace,
    ) -> Result<NoteFacePreview, String> {
        let source = SourceDocument::read(&self.conn, &self.root, page_id)?;
        let sources = super::pages::source_ids(&self.root)?;
        if sources.get(page_id).map(|(path, _)| path.as_str()) != Some(source.path.as_str()) {
            return Err("identity-conflict".into());
        }
        let content = source.face(face)?.to_string();
        let media = MediaSnapshot::default().collect(&self.root, &source.path, &content)?;
        let fingerprint = source.fingerprint(face, &media)?;
        source.unchanged(&self.root)?;
        Ok(NoteFacePreview {
            page_id: page_id.into(),
            path: source.path,
            face,
            content,
            fingerprint,
            media,
        })
    }
    pub fn read_note_study_content(
        &self,
        card_id: &str,
    ) -> Result<(StudyPage, Option<StudyPage>, StudyContent), String> {
        let card = read_card(&self.conn, card_id)?;
        let resolved = resolve_study(&self.conn, &self.root, &card)?;
        Ok((resolved.page, resolved.answer_page, resolved.content))
    }
}
