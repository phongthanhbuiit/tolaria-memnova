use crate::note_close::{CloseCoordinator, CloseOutcome, CloseRequest, CloseTarget};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::{Emitter, Manager};

#[derive(Default)]
struct NativeClose {
    coordinator: CloseCoordinator,
    exit_code: i32,
    timer: Option<tauri::async_runtime::JoinHandle<()>>,
}

#[derive(Default)]
pub struct NoteCloseState(Mutex<NativeClose>);

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CloseAcknowledgement {
    token: String,
    saved: bool,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct CloseCancelled {
    request: CloseRequest,
    reason: &'static str,
}

fn stop_timer(state: &mut NativeClose) {
    if let Some(timer) = state.timer.take() {
        timer.abort();
    }
}

fn notify_cancelled(app: &tauri::AppHandle, request: CloseRequest, reason: &'static str) {
    let _ = app.emit("note-close-cancelled", CloseCancelled { request, reason });
}

fn cancel(app: &tauri::AppHandle, token: &str, reason: &'static str) {
    let state = app.state::<NoteCloseState>();
    let request = {
        let mut guard = state.0.lock().unwrap();
        let request = guard.coordinator.cancel(token);
        if request.is_some() {
            stop_timer(&mut guard);
        }
        request
    };
    if let Some(request) = request {
        notify_cancelled(app, request, reason);
    }
}

fn request_close(app: &tauri::AppHandle, target: CloseTarget, label: Option<&str>, code: i32) {
    let windows = app.webview_windows();
    let labels = windows
        .keys()
        .filter(|key| label.map_or(true, |label| key.as_str() == label))
        .cloned()
        .collect();
    let state = app.state::<NoteCloseState>();
    let request = {
        let mut guard = state.0.lock().unwrap();
        let Some(request) = guard.coordinator.begin(target, labels) else {
            return;
        };
        guard.exit_code = code;
        let timeout_app = app.clone();
        let token = request.token.clone();
        guard.timer = Some(tauri::async_runtime::spawn(async move {
            tokio::time::sleep(std::time::Duration::from_secs(30)).await;
            cancel(&timeout_app, &token, "timeout");
        }));
        request
    };
    for (label, window) in windows {
        let awaiting = state
            .0
            .lock()
            .unwrap()
            .coordinator
            .pending_for(&label)
            .is_some();
        if awaiting && window.emit("note-close-requested", &request).is_err() {
            cancel(app, &request.token, "window");
            break;
        }
    }
}

#[tauri::command]
pub fn pending_note_close(
    window: tauri::WebviewWindow,
    state: tauri::State<'_, NoteCloseState>,
) -> Option<CloseRequest> {
    state
        .0
        .lock()
        .unwrap()
        .coordinator
        .pending_for(window.label())
}

#[tauri::command]
pub fn acknowledge_note_close(
    window: tauri::WebviewWindow,
    state: tauri::State<'_, NoteCloseState>,
    acknowledgement: CloseAcknowledgement,
) {
    let (outcome, exit_code) = {
        let mut guard = state.0.lock().unwrap();
        let outcome = guard.coordinator.acknowledge(
            &acknowledgement.token,
            window.label(),
            acknowledgement.saved,
        );
        if !matches!(outcome, CloseOutcome::Waiting) {
            stop_timer(&mut guard);
        }
        (outcome, guard.exit_code)
    };
    match outcome {
        CloseOutcome::Waiting => {}
        CloseOutcome::Cancelled(request) => notify_cancelled(window.app_handle(), request, "save"),
        CloseOutcome::Ready(request) => match request.target {
            CloseTarget::App => window.app_handle().exit(exit_code),
            CloseTarget::Window => {
                if window.destroy().is_err() {
                    notify_cancelled(window.app_handle(), request, "window");
                }
            }
        },
    }
}

#[tauri::command]
pub fn retry_note_close(window: tauri::WebviewWindow, target: CloseTarget) -> Result<(), String> {
    match target {
        CloseTarget::App => window.app_handle().exit(0),
        CloseTarget::Window => window.close().map_err(|e| e.to_string())?,
    }
    Ok(())
}

pub fn handle_run_event(app: &tauri::AppHandle, event: &tauri::RunEvent) {
    match event {
        tauri::RunEvent::ExitRequested { api, code, .. } => {
            // Tauri cannot veto its special restart exit; normal quit/close is guarded here.
            if *code == Some(tauri::RESTART_EXIT_CODE) {
                return;
            }
            if app
                .state::<NoteCloseState>()
                .0
                .lock()
                .unwrap()
                .coordinator
                .exit_approved
                || app.webview_windows().is_empty()
            {
                return;
            }
            api.prevent_exit();
            request_close(app, CloseTarget::App, None, code.unwrap_or(0));
        }
        tauri::RunEvent::WindowEvent {
            label,
            event: tauri::WindowEvent::CloseRequested { api, .. },
            ..
        } => {
            api.prevent_close();
            request_close(app, CloseTarget::Window, Some(label), 0);
        }
        tauri::RunEvent::WindowEvent {
            label,
            event: tauri::WindowEvent::Destroyed,
            ..
        } => {
            let request = {
                let state = app.state::<NoteCloseState>();
                let mut guard = state.0.lock().unwrap();
                let request = guard.coordinator.destroyed(label);
                if request.is_some() {
                    stop_timer(&mut guard);
                }
                request
            };
            if let Some(request) = request {
                notify_cancelled(app, request, "window");
            }
        }
        _ => {}
    }
}
