use super::{
    identity::reject_symlink,
    migration_plan::content_hash,
    note_write::{Checkpoint, NoteWriteHooks, PreparedWrite},
    store::checked_page_path,
};
use std::{fs, io::Write, path::Path};

pub(super) fn valid_hash(hash: &str) -> bool {
    hash.len() == 64
        && hash
            .bytes()
            .all(|byte| byte.is_ascii_digit() || (b'a'..=b'f').contains(&byte))
}

pub(super) fn replace_source(
    root: &Path,
    prepared: &PreparedWrite,
    hooks: &NoteWriteHooks,
) -> Result<(), String> {
    hooks.before_io()?;
    let path = checked_page_path(root, &prepared.path)?;
    let parent = path.parent().ok_or("Note source has no parent directory")?;
    let source = prepared
        .after_source
        .as_deref()
        .ok_or("Note write source is missing")?;
    let permissions = fs::metadata(&path)
        .map_err(|error| error.to_string())?
        .permissions();
    let mut staged = tempfile::NamedTempFile::new_in(parent).map_err(|error| error.to_string())?;
    staged
        .as_file()
        .set_permissions(permissions)
        .map_err(|error| error.to_string())?;
    staged
        .write_all(source.as_bytes())
        .map_err(|error| error.to_string())?;
    staged
        .as_file()
        .sync_all()
        .map_err(|error| error.to_string())?;
    hooks.checkpoint(Checkpoint::Staged)?;
    reject_symlink(&path)?;
    if checked_page_path(root, &prepared.path)? != path
        || content_hash(&fs::read_to_string(&path).map_err(|error| error.to_string())?)
            != prepared.before_hash
    {
        return Err("Note source changed before atomic replacement".into());
    }
    staged.persist(&path).map_err(|error| error.to_string())?;
    #[cfg(unix)]
    fs::File::open(parent)
        .and_then(|directory| directory.sync_all())
        .map_err(|error| error.to_string())?;
    Ok(())
}

pub(super) fn current_hash(root: &Path, relative: &str) -> Result<String, String> {
    let path = checked_page_path(root, relative)?;
    Ok(content_hash(
        &fs::read_to_string(path).map_err(|error| error.to_string())?,
    ))
}
