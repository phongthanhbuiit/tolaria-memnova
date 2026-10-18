#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(super) enum Checkpoint {
    Prepared,
    Staged,
    Renamed,
    FileWritten,
    Transaction,
    Applied,
    Compacted,
}

#[derive(Default)]
pub(super) struct NoteWriteHooks {
    #[cfg(test)]
    stop: Option<Checkpoint>,
    #[cfg(test)]
    io_failure: bool,
}

impl NoteWriteHooks {
    pub(super) fn checkpoint(&self, checkpoint: Checkpoint) -> Result<(), String> {
        #[cfg(test)]
        if self.stop == Some(checkpoint) {
            return Err(format!("Injected interruption at {checkpoint:?}"));
        }
        let _ = checkpoint;
        Ok(())
    }
    pub(super) fn before_io(&self) -> Result<(), String> {
        #[cfg(test)]
        if self.io_failure {
            return Err("Injected filesystem write failure".into());
        }
        Ok(())
    }
    #[cfg(test)]
    pub(super) fn stop_at(stop: Checkpoint) -> Self {
        Self {
            stop: Some(stop),
            io_failure: false,
        }
    }
    #[cfg(test)]
    pub(super) fn fail_io() -> Self {
        Self {
            stop: None,
            io_failure: true,
        }
    }
}
