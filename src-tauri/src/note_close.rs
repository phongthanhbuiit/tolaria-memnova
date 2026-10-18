use serde::{Deserialize, Serialize};
use std::collections::BTreeSet;

#[derive(Clone, Copy, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum CloseTarget {
    App,
    Window,
}

#[derive(Clone, Debug, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct CloseRequest {
    pub token: String,
    pub target: CloseTarget,
}

struct Pending {
    request: CloseRequest,
    participants: BTreeSet<String>,
    awaiting: BTreeSet<String>,
}

#[derive(Default)]
pub struct CloseCoordinator {
    pending: Option<Pending>,
    pub exit_approved: bool,
}

pub enum CloseOutcome {
    Waiting,
    Cancelled(CloseRequest),
    Ready(CloseRequest),
}

impl CloseCoordinator {
    pub fn begin(&mut self, target: CloseTarget, labels: BTreeSet<String>) -> Option<CloseRequest> {
        if self.pending.is_some() || labels.is_empty() {
            return None;
        }
        let request = CloseRequest {
            token: uuid::Uuid::new_v4().to_string(),
            target,
        };
        self.pending = Some(Pending {
            request: request.clone(),
            participants: labels.clone(),
            awaiting: labels,
        });
        Some(request)
    }

    pub fn pending_for(&self, label: &str) -> Option<CloseRequest> {
        self.pending
            .as_ref()
            .filter(|p| p.participants.contains(label))
            .map(|p| p.request.clone())
    }

    pub fn cancel(&mut self, token: &str) -> Option<CloseRequest> {
        if self.pending.as_ref()?.request.token != token {
            return None;
        }
        self.pending.take().map(|p| p.request)
    }

    pub fn destroyed(&mut self, label: &str) -> Option<CloseRequest> {
        let token = self.pending_for(label)?.token;
        self.cancel(&token)
    }

    pub fn acknowledge(&mut self, token: &str, label: &str, saved: bool) -> CloseOutcome {
        let Some(pending) = self.pending.as_mut() else {
            return CloseOutcome::Waiting;
        };
        if pending.request.token != token || !pending.awaiting.contains(label) {
            return CloseOutcome::Waiting;
        }
        if !saved {
            return CloseOutcome::Cancelled(self.pending.take().unwrap().request);
        }
        pending.awaiting.remove(label);
        if !pending.awaiting.is_empty() {
            return CloseOutcome::Waiting;
        }
        let request = self.pending.take().unwrap().request;
        self.exit_approved = request.target == CloseTarget::App;
        CloseOutcome::Ready(request)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn start(target: CloseTarget, labels: &[&str]) -> (CloseCoordinator, CloseRequest) {
        let mut state = CloseCoordinator::default();
        let request = state
            .begin(target, labels.iter().map(|s| s.to_string()).collect())
            .unwrap();
        (state, request)
    }

    #[test]
    fn app_quit_waits_for_every_webview_and_ignores_stale_or_duplicate_acks() {
        let (mut s, r) = start(CloseTarget::App, &["main", "note-1", "ai-workspace"]);
        for (token, label) in [("stale", "main"), (&r.token, "intruder")] {
            assert!(matches!(
                s.acknowledge(token, label, true),
                CloseOutcome::Waiting
            ));
        }
        assert!(matches!(
            s.acknowledge(&r.token, "main", true),
            CloseOutcome::Waiting
        ));
        assert!(matches!(
            s.acknowledge(&r.token, "main", false),
            CloseOutcome::Waiting
        ));
        assert!(!s.exit_approved);
        assert!(matches!(
            s.acknowledge(&r.token, "ai-workspace", true),
            CloseOutcome::Waiting
        ));
        assert!(matches!(
            s.acknowledge(&r.token, "note-1", true),
            CloseOutcome::Ready(_)
        ));
        assert!(s.exit_approved);
    }

    #[test]
    fn failure_keeps_all_windows_open_and_retry_requires_fresh_acknowledgements() {
        let (mut s, r) = start(CloseTarget::App, &["main", "note-1"]);
        s.acknowledge(&r.token, "main", true);
        assert!(matches!(
            s.acknowledge(&r.token, "note-1", false),
            CloseOutcome::Cancelled(_)
        ));
        assert!(!s.exit_approved);
        let next = s
            .begin(CloseTarget::App, ["main".to_string()].into())
            .unwrap();
        assert_ne!(r.token, next.token);
        assert!(matches!(
            s.acknowledge(&r.token, "main", true),
            CloseOutcome::Waiting
        ));
        assert!(s.pending_for("main").is_some());
        assert!(matches!(
            s.acknowledge(&next.token, "main", true),
            CloseOutcome::Ready(_)
        ));
    }

    #[test]
    fn window_close_only_waits_for_its_owner_and_never_approves_app_exit() {
        let (mut s, r) = start(CloseTarget::Window, &["note-1"]);
        assert!(s.pending_for("main").is_none());
        assert!(s
            .begin(CloseTarget::App, ["main".to_string()].into())
            .is_none());
        assert!(matches!(
            s.acknowledge(&r.token, "note-1", true),
            CloseOutcome::Ready(_)
        ));
        assert!(!s.exit_approved);
    }

    #[test]
    fn timeout_and_destroy_cancel_instead_of_forcing_exit() {
        let (mut s, r) = start(CloseTarget::App, &["main", "note-1"]);
        assert!(s.cancel("old").is_none());
        assert!(s.cancel(&r.token).is_some());
        assert!(matches!(
            s.acknowledge(&r.token, "main", true),
            CloseOutcome::Waiting
        ));
        let next = s
            .begin(CloseTarget::App, ["main".to_string()].into())
            .unwrap();
        assert!(s.destroyed("other").is_none());
        assert_eq!(s.destroyed("main"), Some(next));
        assert!(!s.exit_approved);
    }
}
