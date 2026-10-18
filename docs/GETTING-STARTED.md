# Getting Started

How to navigate the codebase, run the app, and find what you need.

## Prerequisites

- **Node.js** 18+ and **pnpm**
- **Rust** 1.77.2+ (for the Tauri backend)
- **git** CLI (required by the git integration features)

### Linux system dependencies

If you run the desktop app on Linux, install Tauri's WebKit2GTK 4.1 dependencies first:

- Arch / Manjaro:
  ```bash
  sudo pacman -S --needed webkit2gtk-4.1 base-devel curl wget file openssl \
    appmenu-gtk-module libappindicator-gtk3 librsvg
  ```
- Debian / Ubuntu (22.04+):
  ```bash
  sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file \
    libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev \
    libsoup-3.0-dev patchelf
  ```
- Fedora 38+:
  ```bash
  sudo dnf install webkit2gtk4.1-devel openssl-devel curl wget file \
    libappindicator-gtk3-devel librsvg2-devel
  ```

### Linux AppImage Wayland troubleshooting

On some Wayland systems, the Linux AppImage may fail to launch with:

```text
Could not create default EGL display: EGL_BAD_PARAMETER. Aborting...
```

Recent Tolaria Linux builds automatically disable unstable WebKitGTK rendering paths on Wayland and AppImage launches. AppImage launches also retry startup with an architecture-matching system Wayland client library when they detect this class of AppImage + Wayland environment. If you are running an older build, use this workaround:

```bash
WEBKIT_DISABLE_COMPOSITING_MODE=1 WEBKIT_DISABLE_DMABUF_RENDERER=1 LD_PRELOAD=/usr/lib64/libwayland-client.so.0 ./Tolaria*.AppImage
```

If your distribution stores the 64-bit library elsewhere, use that path instead, for example `/usr/lib/x86_64-linux-gnu/libwayland-client.so.0`. On 64-bit Fedora, avoid `/usr/lib/libwayland-client.so.0`; that path can point at a 32-bit library and be ignored by the loader with a wrong ELF class warning.

### Linux AppImage packaging checks

Linux release CI currently uses Tauri's stock linuxdeploy AppImage output plugin:

```bash
pnpm tauri build --target x86_64-unknown-linux-gnu --bundles deb,rpm,appimage
```

Release validation verifies that the Linux job produced an AppImage, at least one installer bundle, and updater signature artifacts. Windows release jobs import the CI code-signing certificate, build NSIS with a generated Tauri Authenticode signing config, and verify the app executable plus installer signatures before upload. The experimental AppImage output-plugin shim in `scripts/appimage-launcher-tools.mjs` is retained for local investigation, but it is not wired into release packaging because linuxdeploy currently exits before sealing the AppImage when the shim is pre-seeded in Tauri's tools cache.

## Quick Start

```bash
# Install dependencies
pnpm install

# Run in browser (no Rust needed — uses mock data)
pnpm dev
# Open http://localhost:5173

# Run with Tauri (full app, requires Rust)
pnpm tauri dev

# Run tests
pnpm test    # Vitest unit tests
cargo test   # Rust tests (from src-tauri/)

# Or, run Rust tests from root project directory
cargo test --manifest-path src-tauri/Cargo.toml

# E2E tests
pnpm playwright:smoke       # Curated Playwright core smoke lane (~5 min)
pnpm playwright:regression  # Full Playwright regression suite
```

## Starter Vaults And Remotes

`create_getting_started_vault` clones the public starter repo and then removes every git remote from the new local copy. That means Getting Started vaults open local-only by default. Users connect a compatible remote later through the bottom-bar `No remote` chip or the command palette, both of which feed the same `AddRemoteModal` and `git_add_remote` backend flow.

Linux AppImage builds still use the user's system `git` and `node`. Before Tolaria spawns those Git or MCP Node subprocesses, it removes AppImage loader overrides such as `LD_LIBRARY_PATH`, `LD_PRELOAD`, and `GIT_EXEC_PATH` so HTTPS clone helpers and MCP tooling use the host library stack instead of bundled AppImage libraries.

## Multiple Vaults At The Same Time

The `settings.multi_workspace_enabled` flag turns the registered vault list into a unified graph. When enabled, `useVaultLoader` loads every available mounted vault, annotates entries with workspace provenance, and lets note lists, quick open, keyword search, backlinks, and wikilink navigation span those vaults.

The selected/default vault remains the write target for new notes and Type documents when `defaultWorkspacePath` points at an available mounted vault. Git status, changes, AutoGit checkpointing, and sync operate across the active mounted repository set, while history, diff, repair, and file operations still resolve explicit repository roots from the selected surface or entry provenance. Saved Views are listed from every mounted vault with source-vault identity, so duplicate view filenames remain separate and edits persist back to the view's owning vault.

The bottom-left `VaultMenu` exposes quick include/exclude controls and a `Manage vaults` entry. The Vaults settings section owns the full identity controls: display name, short label, read-only alias, accent color, removal, and default destination for new notes.

## Directory Structure

```
tolaria/
├── src/                          # React frontend
│   ├── main.tsx                  # Entry point (renders <App />)
│   ├── App.tsx                   # Root component — wires layout + state hooks
│   ├── App.css                   # App shell layout styles
│   ├── types.ts                  # Shared TS types (VaultEntry, Settings, etc.)
│   ├── mock-tauri.ts             # Mock Tauri layer for browser testing
│   ├── theme.json                # Editor typography theme configuration
│   ├── index.css                 # Semantic app theme variables + Tailwind setup
│   │
│   ├── components/               # UI components (~100 files)
│   │   ├── Sidebar.tsx           # Left panel: filters + type groups
│   │   ├── SidebarParts.tsx      # Sidebar subcomponents
│   │   ├── NoteList.tsx          # Second panel: filtered note list
│   │   ├── NoteItem.tsx          # Individual note item
│   │   ├── PulseView.tsx         # Git activity feed (replaces NoteList)
│   │   ├── Editor.tsx            # Third panel: editor orchestration
│   │   ├── EditorContent.tsx     # Editor content area
│   │   ├── EditorRightPanel.tsx  # Right panel toggle
│   │   ├── editorSchema.tsx      # BlockNote schema + wikilink type
│   │   ├── RawEditorView.tsx     # CodeMirror raw editor
│   │   ├── Inspector.tsx         # Fourth panel: metadata + relationships
│   │   ├── DynamicPropertiesPanel.tsx  # Editable frontmatter properties
│   │   ├── AiWorkspace.tsx       # Multi-chat AI workspace orchestration (docked or native window)
│   │   ├── AiWorkspaceChrome.tsx # AI workspace header and vault-guidance chrome
│   │   ├── AiWorkspaceResizeHandles.tsx # AI workspace edge resize handles
│   │   ├── AiPanel.tsx           # AI transcript/composer surface (selected target + per-vault permission mode)
│   │   ├── AiMessage.tsx         # Agent message display
│   │   ├── AiActionCard.tsx      # Agent tool action cards
│   │   ├── AiAgentsOnboardingPrompt.tsx # First-launch AI agent installer prompt
│   │   ├── SearchPanel.tsx       # Search interface
│   │   ├── SettingsPanel.tsx     # App settings
│   │   ├── StatusBar.tsx         # Bottom bar: vault picker + sync
│   │   ├── CommandPalette.tsx    # Cmd+K command launcher
│   │   ├── BreadcrumbBar.tsx     # Breadcrumb + word count + actions
│   │   ├── WelcomeScreen.tsx     # Onboarding screen
│   │   ├── LinuxTitlebar.tsx     # Linux/Windows custom window chrome + controls
│   │   ├── LinuxMenuButton.tsx   # Linux titlebar menu mirroring app commands
│   │   ├── CloneVaultModal.tsx   # Clone a vault from any git URL
│   │   ├── AddRemoteModal.tsx    # Connect a local-only vault to a remote later
│   │   ├── ConflictResolverModal.tsx # Git conflict resolution
│   │   ├── CommitDialog.tsx      # Git commit modal
│   │   ├── CreateNoteDialog.tsx  # New note modal
│   │   ├── CreateTypeDialog.tsx  # New type modal
│   │   ├── UpdateBanner.tsx      # In-app update notification
│   │   ├── inspector/            # Inspector sub-panels
│   │   │   ├── BacklinksPanel.tsx
│   │   │   ├── RelationshipsPanel.tsx
│   │   │   ├── GitHistoryPanel.tsx
│   │   │   └── ...
│   │   └── ui/                   # shadcn/ui primitives
│   │       ├── button.tsx, dialog.tsx, input.tsx, ...
│   │
│   ├── hooks/                    # Custom React hooks (~90 files)
│   │   ├── useVaultLoader.ts     # Loads vault entries + content
│   │   ├── useVaultSwitcher.ts   # Multi-vault management
│   │   ├── useVaultConfig.ts     # Per-vault UI settings
│   │   ├── useNoteActions.ts     # Composes creation + rename + frontmatter
│   │   ├── useNoteCreation.ts    # Note/type creation
│   │   ├── useNoteRename.ts     # Note renaming + wikilink updates
│   │   ├── useCliAiAgent.ts      # Selected AI agent state + normalized session pipeline
│   │   ├── aiAgentPermissionMode.ts # Safe/Power User mode normalization + labels
│   │   ├── useAiAgentsStatus.ts  # Claude/Codex/OpenCode/Pi/Gemini/Kiro availability polling
│   │   ├── useAiAgentPreferences.ts # Default-agent persistence + cycling
│   │   ├── useAiActivity.ts      # MCP UI bridge listener
│   │   ├── useAutoSync.ts        # Auto git pull/push
│   │   ├── useConflictResolver.ts # Git conflict handling
│   │   ├── useEditorSave.ts      # Auto-save with debounce
│   │   ├── useTheme.ts           # Flatten theme.json → CSS vars
│   │   ├── useUnifiedSearch.ts   # Keyword search
│   │   ├── useNoteSearch.ts      # Note search
│   │   ├── useCommandRegistry.ts # Command palette registry
│   │   ├── useAppCommands.ts     # App-level commands
│   │   ├── useAppKeyboard.ts     # Keyboard shortcuts
│   │   ├── appCommandCatalog.ts  # Shortcut combos + command metadata
│   │   ├── appCommandDispatcher.ts # Shared shortcut/menu command IDs + dispatch
│   │   ├── useSettings.ts        # App settings
│   │   ├── useGettingStartedClone.ts # Shared Getting Started clone action
│   │   ├── useOnboarding.ts      # First-launch flow
│   │   ├── useCodeMirror.ts      # CodeMirror raw editor
│   │   ├── useMcpBridge.ts       # MCP WebSocket client
│   │   ├── useMcpStatus.ts       # Explicit external AI tool connection status + connect/disconnect actions
│   │   ├── useUpdater.ts         # In-app updates
│   │   └── ...
│   │
│   ├── utils/                    # Pure utility functions (~48 files)
│   │   ├── wikilinks.ts          # Wikilink preprocessing pipeline
│   │   ├── frontmatter.ts        # TypeScript YAML parser
│   │   ├── plainTextPaste.ts     # Shared Paste without Formatting command target registry
│   │   ├── platform.ts           # Runtime platform + Linux chrome gating helpers
│   │   ├── ai-agent.ts           # Agent stream utilities
│   │   ├── ai-chat.ts            # Token estimation utilities
│   │   ├── ai-context.ts         # Context snapshot builder
│   │   ├── noteListHelpers.ts    # Sorting, filtering, date formatting
│   │   ├── wikilink.ts           # Wikilink resolution
│   │   ├── configMigration.ts    # localStorage → vault config migration
│   │   ├── iconRegistry.ts       # Phosphor icon registry
│   │   ├── propertyTypes.ts      # Property type definitions
│   │   ├── vaultListStore.ts     # Vault list persistence
│   │   ├── vaultConfigStore.ts   # Vault config store
│   │   └── ...
│   │
│   ├── lib/
│   │   ├── aiAgents.ts           # Shared agent registry + status helpers
│   │   ├── appUpdater.ts         # Frontend wrapper around channel-aware updater commands
│   │   ├── i18n.ts               # App-owned localization runtime and locale resolution
│   │   ├── locales/              # JSON locale catalogs (English source + translated locales)
│   │   ├── releaseChannel.ts     # Alpha/stable normalization helpers
│   │   └── utils.ts              # Tailwind merge + cn() helper
│   │
│   └── test/
│       └── setup.ts              # Vitest test environment setup
│
├── src-tauri/                    # Rust backend
│   ├── Cargo.toml                # Rust dependencies
│   ├── build.rs                  # Tauri build script
│   ├── tauri.conf.json           # Tauri app configuration
│   ├── capabilities/             # Tauri v2 security capabilities
│   ├── src/
│   │   ├── main.rs               # Entry point (calls lib::run())
│   │   ├── lib.rs                # Tauri setup + command registration
│   │   ├── commands/             # Tauri command handlers (split into modules)
│   │   ├── vault/                # Vault module
│   │   │   ├── mod.rs            # Core types, parse_md_file, scan_vault
│   │   │   ├── cache.rs          # Git-based incremental caching
│   │   │   ├── parsing.rs        # Text processing + title extraction
│   │   │   ├── rename.rs         # Rename + cross-vault wikilink update
│   │   │   ├── image.rs          # Image attachment saving
│   │   │   ├── migration.rs      # Frontmatter migration
│   │   │   └── getting_started.rs # Getting Started vault clone orchestration
│   │   ├── frontmatter/          # Frontmatter module
│   │   │   ├── mod.rs, yaml.rs, ops.rs
│   │   ├── git/                  # Git module
│   │   │   ├── mod.rs, command.rs, remote_config.rs, commit.rs, status.rs
│   │   │   ├── history.rs, clone.rs, connect.rs, conflict.rs, remote.rs, pulse.rs
│   │   ├── telemetry.rs          # Sentry init + path scrubber
│   │   ├── search.rs             # Keyword search (walkdir-based)
│   │   ├── ai_agents.rs          # CLI-agent request normalization + adapter dispatch
│   │   ├── cli_agent_runtime.rs  # Shared CLI-agent runtime process/prompt/MCP helpers
│   │   ├── claude_cli.rs         # Claude CLI adapter
│   │   ├── codex_cli.rs          # Codex CLI adapter
│   │   ├── pi_cli.rs             # Pi CLI adapter
│   │   ├── kiro_cli.rs           # Kiro CLI adapter
│   │   ├── mcp.rs                # MCP server lifecycle + explicit config registration/removal
│   │   ├── app_updater.rs        # Alpha/stable updater metadata resolution
│   │   ├── settings.rs           # App settings persistence
│   │   ├── vault_config.rs       # Per-vault UI config
│   │   ├── vault_list.rs         # Vault list persistence
│   │   └── menu.rs               # Native macOS menu bar
│   └── icons/                    # App icons
│
├── mcp-server/                   # MCP bridge (Node.js or Bun)
│   ├── index.js                  # MCP server entry (stdio tools)
│   ├── vault.js                  # Vault file operations
│   ├── ws-bridge.js              # WebSocket bridge (ports 9710, 9711)
│   ├── test.js                   # MCP server tests
│   └── package.json
│
├── e2e/                          # Playwright E2E tests (~26 specs)
├── tests/smoke/                  # Playwright specs (full regression + @smoke subset)
├── design/                       # Per-task design files
├── demo-vault-v2/                # Curated local QA fixture for native/dev flows
├── scripts/                      # Build/utility scripts
│
├── package.json                  # Frontend dependencies + scripts
├── lara.yaml                     # Lara CLI locale sync configuration
├── vite.config.ts                # Vite bundler config
├── tsconfig.json                 # TypeScript config
├── playwright.config.ts          # Full Playwright regression config
├── playwright.smoke.config.ts    # Curated pre-push Playwright config
├── ui-design.pen                 # Master design file
├── AGENTS.md                     # Canonical shared instructions for coding agents
├── CLAUDE.md                     # Claude Code compatibility shim importing AGENTS.md as an organized Note
└── docs/                         # This documentation
```

## Key Files to Know

### Fixtures

- `demo-vault-v2/` is the small checked-in QA fixture used for native/manual Tolaria flows. It is intentionally curated around a handful of search, relationship, project-navigation, and attachment scenarios.
- `tests/fixtures/test-vault/` is the deterministic Playwright fixture copied into temp directories for isolated integration and smoke tests.
- `python3 scripts/generate_demo_vault.py` generates the larger synthetic vault on demand at `generated-fixtures/demo-vault-large/` for scale/performance experiments. That output is gitignored and should not bloat the normal QA fixture.

### Start here

| File | Why it matters |
|------|---------------|
| `src/App.tsx` | Root component. Shows the 4-panel layout, state flow, and how orchestration hooks connect. |
| `src/types.ts` | All shared TypeScript types. Read this first to understand the data model. |
| `src-tauri/src/commands/` | Tauri command handlers (split into modules). This is the frontend-backend API surface. |
| `src-tauri/src/lib.rs` | Tauri setup, command registration, startup tasks, WebSocket bridge lifecycle. |

### Data layer

| File | Why it matters |
|------|---------------|
| `src/hooks/useVaultLoader.ts` | How vault data is loaded and managed. The Tauri/mock branching pattern. |
| `src/hooks/useNoteActions.ts` | Orchestrates note operations: composes `useNoteCreation`, `useNoteRename`, frontmatter CRUD, and wikilink navigation. |
| `src/hooks/useVaultSwitcher.ts` | Multi-vault management, vault switching, and persisting cloned vaults in the switcher list. |
| `src/hooks/useGettingStartedClone.ts` | Shared "Clone Getting Started Vault" action for the status bar and command palette. |
| `src/hooks/useNoteWindowLifecycle.ts` | Note-window URL opening, asset-scope sync, and window-title updates. |
| `src/hooks/useVaultRenameDetection.ts` | Focus-triggered Git rename detection and wikilink update action wiring. |
| `src/hooks/useStartupScreenState.ts` | Startup-screen and vault-content loading visibility decisions. |
| `src/hooks/useGitFileWorkflows.ts` | Git diff/history/discard wiring and deleted-note preview workflow. |
| `src/components/AddRemoteModal.tsx` | Modal UI for connecting a local-only vault to a compatible remote. |
| `src/mock-tauri.ts` | Mock data for browser testing. Shows the shape of all Tauri responses. |

### Backend

| File | Why it matters |
|------|---------------|
| `src-tauri/src/vault/mod.rs` | Vault scanning, frontmatter parsing, entity type inference, relationship extraction. |
| `src-tauri/src/vault/cache.rs` | Git-based incremental caching — how large vaults load fast. |
| `src-tauri/src/frontmatter/ops.rs` | YAML manipulation — how properties are updated/deleted in files. |
| `src-tauri/src/git/` | All git operations (clone, commit, pull, push, conflicts, pulse, add-remote). |
| `src-tauri/src/search.rs` | Keyword search — scans vault files with walkdir. |
| `src-tauri/src/ai_agents.rs` | CLI-agent request normalization, availability aggregation, adapter dispatch, and Claude event mapping. |
| `src-tauri/src/cli_agent_runtime.rs` | Shared CLI-agent request shape, prompt wrapping, JSON subprocess lifecycle, version probing, and MCP path helpers. |
| `src-tauri/src/claude_cli.rs`, `src-tauri/src/codex_cli.rs`, `src-tauri/src/opencode_cli.rs`, `src-tauri/src/pi_cli.rs`, `src-tauri/src/gemini_cli.rs`, `src-tauri/src/kiro_cli.rs` | Per-agent command, config, discovery, and event adapters. |
| `src-tauri/src/app_updater.rs` | Desktop updater bridge — resolves alpha/stable manifests and streams install progress. |

### Editor

| File | Why it matters |
|------|---------------|
| `src/components/Editor.tsx` | BlockNote setup, breadcrumb bar, diff/raw toggle. |
| `src/components/SingleEditorView.tsx` | Shared BlockNote shell, Tolaria formatting controllers, and suggestion menus. |
| `src/components/editorSchema.tsx` | Custom wikilink inline content type definition. |
| `src/components/tolariaEditorFormatting.tsx` | Markdown-safe formatting toolbar surface for BlockNote. |
| `src/components/tolariaEditorFormattingConfig.ts` | Filters toolbar and slash-menu commands to markdown-roundtrippable actions. |
| `src/utils/wikilinks.ts` | Wikilink preprocessing pipeline (markdown ↔ BlockNote). |
| `src/components/RawEditorView.tsx` | CodeMirror 6 raw markdown editor. |

### AI

| File | Why it matters |
|------|---------------|
| `src/components/AiWorkspace.tsx` | Multi-chat AI workspace orchestration — chat sessions, sidebar tabs, target/permission controls, and dock/pop-out wiring. |
| `src/components/AiWorkspaceChrome.tsx` | Header and vault-guidance chrome shared by docked and popped-out AI workspace modes. |
| `src/components/AiWorkspaceResizeHandles.tsx` | Edge resize affordances for docked/side AI workspace layouts. |
| `src/components/aiWorkspaceConversations.ts` | Conversation metadata state, settings persistence, default title generation, and target resolution. |
| `src/components/aiWorkspaceSizing.ts` | AI workspace sizing, localStorage persistence, class names, and layout style helpers. |
| `src/components/AiPanel.tsx` | Reusable AI transcript/composer surface — selected target with tool execution, reasoning, actions, and per-vault permission mode. |
| `src/utils/openAiWorkspaceWindow.ts` | Native Tauri AI workspace window creation, focus, and dock-back traffic-light handling. |
| `src/hooks/useCliAiAgent.ts` | Thin React owner for the selected CLI agent session state. |
| `src/lib/aiAgentSession.ts` | Single message/session lifecycle for prompt normalization, history, streaming, and reset behavior. |
| `src/lib/aiAgentPermissionMode.ts` | Safe/Power User mode normalization, display labels, and local transcript marker text. |
| `src/lib/aiAgentFileOperations.ts` | Detects agent-created or modified vault files from normalized tool inputs. |
| `src/lib/aiAgents.ts` | Supported agent definitions, status normalization, and default-agent helpers. |
| `src/utils/ai-context.ts` | Context snapshot builder for AI conversations. |

### Styling

| File | Why it matters |
|------|---------------|
| `src/index.css` | Semantic CSS custom properties for app-owned light/dark themes; System mode resolves to one of these at runtime. |
| `src/theme.json` | Editor-specific typography theme (fonts, headings, lists, code blocks). |

### Settings & Config

| File | Why it matters |
|------|---------------|
| `src/hooks/useSettings.ts` | App settings (telemetry, release channel, theme mode, UI language, date display format, Git visibility, auto-sync interval, default note width, sidebar type pluralization, default AI agent). |
| `src/lib/releaseChannel.ts` | Normalizes persisted updater-channel values (`stable` default, optional `alpha`). |
| `src/lib/appUpdater.ts` | Frontend wrapper for channel-aware updater commands. |
| `src/hooks/useMainWindowSizeConstraints.ts` | Derives the main-window minimum width from the visible panes and asks Tauri to grow back to fit wider layouts. |
| `src/hooks/useVaultConfig.ts` | Per-vault local UI preferences (zoom, view mode, colors, Inbox columns, explicit organization workflow, Git setup prompt preference, AI permission mode). |
| `src/components/SettingsPanel.tsx` | Settings UI for telemetry, release channel, Git visibility, sync interval, UI language, content display preferences, default AI agent, and the vault-level explicit organization toggle. |
| `src/hooks/useUpdater.ts` | In-app updates using the selected alpha/stable feed. |

## Architecture Patterns

### Tauri/Mock Branching

Every data-fetching operation checks `isTauri()` and branches:

```typescript
if (isTauri()) {
  result = await invoke<T>('command', { args })
} else {
  result = await mockInvoke<T>('command', { args })
}
```

This lives in `useVaultLoader.ts` and `useNoteActions.ts`. Components never call Tauri directly.

### Props-Down, Callbacks-Up

No global state management (no Redux, no Context). `App.tsx` owns the state and passes it down as props. Child-to-parent communication uses callback props (`onSelectNote`, etc.).

### Discriminated Unions for Selection State

```typescript
type SidebarSelection =
  | { kind: 'filter'; filter: SidebarFilter }
  | { kind: 'sectionGroup'; type: string }
  | { kind: 'folder'; path: string }
  | { kind: 'entity'; entry: VaultEntry }
  | { kind: 'view'; filename: string }
```

### Command Registry

`useCommandRegistry` + `useAppCommands` build a centralized command registry. Commands are registered with labels, shortcuts, and handlers. The `CommandPalette` (Cmd+K) fuzzy-searches this registry. Settings commands can update installation-local preferences directly when they reuse an existing settings path, such as the Light/Dark/System theme-mode actions writing `settings.theme_mode`. Shortcut combos live in `appCommandCatalog.ts`; real keypresses always flow through `useAppKeyboard`, native menu clicks emit the same command IDs through `useMenuEvents`, and `appCommandDispatcher.ts` suppresses the duplicate native/renderer echo from a single shortcut. Plain-text paste follows this same path: the command owns `Cmd+Shift+V`, the menu and palette expose the same action, and `plainTextPaste.ts` resolves the active rich/raw editor target or focused text control before reading clipboard text. On macOS, any browser-reserved chord that WKWebView swallows before that path must also be added to the narrow `tauri-plugin-prevent-default` registration in `src-tauri/src/lib.rs`. On Linux and Windows, `LinuxTitlebar.tsx` and `LinuxMenuButton.tsx` reuse the same command IDs through `trigger_menu_command` because those builds use Tolaria's custom chrome instead of the native desktop menu bar. The same shortcut manifest also declares the deterministic QA mode for each shortcut-capable command.

Commands whose availability depends on the current note or Git state must also flow through `update_menu_state` so the native menu stays in sync with the command palette. The deleted-note restore action in Changes view is the reference example: the row opens a deleted diff preview, the command palette exposes "Restore Deleted Note", and the Note menu enables the same action only while that preview is active.

Current-note find/replace is a surface-aware command: editor focus enables "Find in Note" / "Replace in Note" and routes Cmd+F into raw CodeMirror mode; note-list focus enables existing note-list search instead. When adding another focus-dependent command, mirror this pattern with an availability event consumed by `useMenuEvents.ts` and `update_menu_state`.

For automated shortcut QA, use the explicit proof path from `appCommandCatalog.ts`:

- `window.__laputaTest.triggerShortcutCommand()` for deterministic renderer shortcut-event coverage
- `window.__laputaTest.triggerMenuCommand()` for deterministic native menu-command coverage

That browser harness is a deterministic desktop command bridge, not real native accelerator QA. For macOS browser-reserved chords, still perform native QA in the real Tauri app because the webview-init prevent-default layer is only active there. Do not treat flaky synthesized macOS keystrokes as proof that a shortcut works unless you also confirm the visible app behavior.

## Running Tests

```bash
# Unit tests (fast, no browser)
pnpm test

# Unit tests with coverage (must pass ≥70%)
pnpm test:coverage

# Rust tests
cargo test

# Rust coverage (must pass ≥85% line coverage)
cargo llvm-cov --manifest-path src-tauri/Cargo.toml --no-clean --fail-under-lines 85

# Playwright core smoke lane (requires dev server)
BASE_URL="http://localhost:5173" pnpm playwright:smoke

# Full Playwright regression suite
BASE_URL="http://localhost:5173" pnpm playwright:regression

# Single Playwright test
BASE_URL="http://localhost:5173" npx playwright test tests/smoke/<slug>.spec.ts
```

## Common Tasks

### Add a new Tauri command

1. Write the Rust function in the appropriate module (`vault/`, `git/`, etc.)
2. Add a command handler in `commands/`
3. Register it in the `generate_handler![]` macro in `lib.rs`
4. Call it from the frontend via `invoke()` in the appropriate hook or utility, keeping native-only permission work behind the Tauri command boundary
5. Add a mock handler in `mock-tauri.ts`

### Add a new component

1. Create `src/components/MyComponent.tsx`
2. If it needs vault data, receive it as props from the parent
3. Wire it into `App.tsx` or the relevant parent component
4. Add a test file `src/components/MyComponent.test.tsx`

### Add a new entity type

1. Create a type document at the vault root: `mytype.md` with `type: Type` frontmatter (icon, color, order, etc.)
2. The sidebar section groups are auto-generated from type documents — no code change needed if `visible: true`
3. Update `CreateNoteDialog.tsx` type options if users should be able to create it from the dialog
4. Notes of this type are created at the vault root with `type: MyType` in frontmatter — no dedicated folder needed

### Add a command palette entry

1. Register the command in `useAppCommands.ts` via the command registry
2. Add a corresponding menu bar item in `menu.rs` for discoverability
3. If it has a keyboard shortcut, register it in `appCommandCatalog.ts` with the canonical command ID, modifier rule, and deterministic QA mode, then wire the matching native menu item in `menu.rs` if it should also appear in the menu bar
4. If its enabled state depends on runtime selection (active note, deleted preview, Git status, etc.), thread that flag through `useMenuEvents.ts` and `update_menu_state` so the native menu enables/disables correctly

### Modify styling

1. **Global app/theme variables**: Edit `src/index.css`
2. **Editor typography**: Edit `src/theme.json`

### Work with the AI agent

1. **Agent system prompt**: Edit `src/utils/ai-agent.ts` (inline system prompt string)
2. **Context building**: Edit `src/utils/ai-context.ts` for what data is sent to the agent
3. **Tool action display**: Edit `src/components/AiActionCard.tsx`
4. **Permission-mode UI and request plumbing**: Edit `src/lib/aiAgentPermissionMode.ts`, `src/components/AiPanel*.tsx`, `src/hooks/useCliAiAgent.ts`, and `src/utils/streamAiAgent.ts`
5. **Shared CLI runtime behavior**: Edit `src-tauri/src/cli_agent_runtime.rs` for process lifecycle, prompt wrapping, version probing, and common Tolaria MCP path handling.
6. **Agent-specific arguments/events**: Edit the per-agent adapter modules (`claude_cli.rs`, `codex_cli.rs`, `opencode_*`, `pi_*`, `gemini_*`, `kiro_*`). Keep Codex Safe on `read-only` + `untrusted` and Codex Power User on active-vault `workspace-write` + `never`, keep Pi, Gemini, and Kiro on transient MCP config, and do not use dangerous permission bypasses unless an ADR explicitly designs a new mode. Pi's transient agent directory must be seeded from the user's existing Pi agent directory before Tolaria MCP is merged so standalone provider/auth setup keeps working. Gemini Power User intentionally uses Gemini's `yolo` mode per ADR-0103. Kiro receives prompt content over stdin and writes Tolaria MCP config into `.kiro/settings/mcp.json` in the active vault.
7. **Availability probing**: Edit `src/hooks/useAiAgentsStatus.ts` and `src-tauri/src/ai_agents.rs` for AI-agent install/status detection. Keep renderer probing deferred until after first paint, skip it when AI features or AI surfaces are unavailable, and keep backend per-agent CLI checks parallel so missing tools do not serialize shell startup cost.

### Work with external MCP setup

1. **Backend registration/status/snippets**: Edit `src-tauri/src/mcp.rs` and its `src-tauri/src/mcp/` helpers; registration and manual config generation must resolve an MCP runtime via `find_mcp_runtime` (Node.js 18+ preferred, Bun 1+ fallback) first, resolve the packaged `mcp-server/` for macOS, Windows executable-adjacent installs such as `%LOCALAPPDATA%\Tolaria`, Linux package roots (`/usr/local/Tolaria`, `/usr/local/lib/tolaria`, `/usr/lib/tolaria`, `/usr/lib/tolaria/resources`), and AppImage installs, and use a vault-neutral entry with `WS_UI_PORT=9711`. Linux AppImage startup must extract `mcp-server/` to `~/.local/share/tolaria/mcp-server/` before durable registration uses that stable path. App-owned bridge launches still pass `VAULT_PATH`/`VAULT_PATHS`; durable external registrations rely on the MCP server reading `vaults.json` at tool-call time.
2. **Setup dialog copy/actions**: Edit `src/components/McpSetupDialog.tsx` and `src/hooks/useMcpStatus.ts`; users should see the runtime prerequisite (Node.js 18+ or Bun 1+), the exact generated manual config, and a copy action before Tolaria writes third-party config files
3. **Status hook/toasts**: Edit `src/hooks/useMcpStatus.ts` when setup, reconnect, disconnect, or failure messaging changes
4. **Gemini CLI compatibility**: Keep `~/.gemini/settings.json` in the registration path list and keep optional `GEMINI.md` generation behind `restore_vault_ai_guidance`; app-managed Gemini sessions still require the user to install and sign in to Gemini CLI, but Tolaria supplies transient MCP settings when Gemini is selected as the default AI agent
5. **OpenCode compatibility**: Keep `~/.config/opencode/opencode.json` in durable registration. OpenCode uses the top-level `mcp` key, `command` as an array, `environment` for env vars, `type: "local"`, and `enabled: true`; it must remain vault-neutral like the standard `mcpServers` entry.
6. **Process lifecycle and vault guidance**: Stdio MCP servers in `mcp-server/index.js` must exit when their external client closes stdin, and the desktop-owned `ws-bridge.js` child must be stopped on vault deselection, vault switch, and app exit. MCP context must include root `AGENTS.md` instructions for every active mounted workspace when those files exist.

## Memnova fork: verified local environment

The October 2026 baseline was verified on macOS arm64 with Node.js 22.21.1, pnpm 10.11.0 and Rust/Cargo 1.96.0. Use `pnpm install --frozen-lockfile`; a different pnpm major can change lockfile interpretation. The inherited Node 18 / Rust 1.77.2 minimums above have not been verified against this fork's current dependencies. `pnpm build` runs the actual referenced TypeScript projects; root `tsc --noEmit` alone is not a complete type check.

The staged learning store uses bundled native SQLite through Rust, so no system SQLite service or separate server is required. `.memnova/learning.sqlite3` is authoritative learning data, while lessons remain Markdown files. Keep the database, WAL and manifest together until using the verified backup/export path. Do not delete this directory as if it were a cache or add an open database/WAL to Git. Production study uses SQLite after the Library migration reaches Ready; see [the implementation ledger](./MEMNOVA-IMPLEMENTATION.md).

## Memnova: learn a page with multiple cards

1. Choose **Create local Library** or **Open existing Library**. Lessons and attachments stay in a local folder. Git and AI are optional in Settings; neither is required to learn. Template downloads are under **Advanced** and require internet.
2. Open a lesson and select **Flashcards**. For an existing Library, **Prepare learning data** first shows a read-only preview. Resolve any reported errors, then choose **Create backup and import**. Import preserves existing schedules and known history, and does not turn repetition counters into invented review events. If interrupted, reopen the dialog and resume.
3. Add as many cards as the lesson needs. Each has a question and either its own answer or **Use the whole page as the answer**. New cards start as drafts; choose **Active** when ready. IPA/audio/image values and imported vocabulary properties are retained. Clones start with a fresh schedule; suspension and Trash keep the original history. Restore returns a trashed card to Draft.
4. Choose **Study** from a page, deck or Home. Reveal the answer with the mouse or Space, then choose Again/Hard/Good/Easy (1–4). Again returns at its actual learning deadline. Closing pauses the durable session. Reopening the same scope resumes it; Undo restores the last eligible rating. A save error leaves a stable request available for retry. Reload state if the lesson/schedule changed elsewhere.
5. Home statistics use committed reviews. Daily-goal progress counts all reviews, including Again. Known imported activity is not counted twice. Backups are under Home → **Advanced**. Restore opens a verified copy in a fresh directory and never overwrites the original Library.

`.memnova/learning.sqlite3` is durable user data, not a disposable cache. Do not delete it or Git-sync its live WAL/SHM files. Keep verified Library backups containing both Markdown/media and learning data. Original import backups and partial-import checkpoints remain available for recovery. Generic note/Git commands cannot edit private backup internals.

### Isolated native QA

For development only, set `MEMNOVA_CONFIG_HOME` to an absolute temporary directory. Both `settings.json` and `vaults.json` resolve below that root using their existing compatibility subdirectory. Seed only a disposable Library there; never change HOME or overwrite real preferences. Pass a temporary Tauri config with a distinct identifier and `app.windows[].incognito: true`, retaining the normal window options. Release builds ignore the debug environment override (ADR-0143).

Run `pnpm tauri dev --config /absolute/path/to/qa-config.json --no-watch` with that environment and the development server available. Use native mouse actions first, then Space/1–4 and editor shortcuts. Verify SQLite integrity, preserved legacy memory, rating/undo rows, session persistence and backup/restore separately from browser mocks. A browser fixture pass is not native persistence evidence.

Choose **Card type → Vocabulary** to edit part of speech, vocabulary level, synonyms, antonyms, prefixes and suffixes using the existing lesson picker. IPA, audio and image fields remain available. Changing back to Basic preserves these details. Related words appear after revealing the answer; part of speech and level can appear with the question. Editing vocabulary never resets the card's review schedule.


### Focused tests while editing

```bash
pnpm exec vitest run src/hooks/useLearningStudy.recovery.test.ts
pnpm exec vitest run src/hooks/useLearningStudy.recovery.test.ts -t 'refresh'
pnpm test:related src/hooks/useLearningStudy.ts
pnpm test:learning
pnpm test:watch src/hooks/useLearningStudy.recovery.test.ts
cargo test --manifest-path src-tauri/Cargo.toml learning:: -- --test-threads=1
pnpm test:workflow
```

Use behavior-oriented tests per function, hook, service or component; inject clients and control promises for races instead of sleeping. Module tests cover their boundaries, while integration tests cover the full user journey. `pnpm test:changed` selects uncommitted changes; after a commit, use `pnpm exec vitest run --changed HEAD~1`. A clean checkout can legitimately select no tests. Pre-commit automatically selects checks from staged paths; shared configuration and IPC changes have conservative full-suite fallbacks. Full coverage/build/smoke remain pre-push gates (ADR-0144).

### Legacy front/back and current cards

The old `<!-- FLASHCARD:BACK -->` separator is still recognized during import: text before it becomes one card's question and text after it becomes that card's inline answer. Original Markdown is preserved. The separator is hidden only in the note-list preview, without rewriting the source.

For new lessons, write the lesson normally and create multiple cards in **Flashcards**. Prefer a short question and an inline answer for each idea, plus an optional whole-page card for recalling the entire lesson. Whole-page answers read the current lesson; inline answers are independent SQLite card content after migration and are not automatically overwritten by subsequent lesson edits. Switching the whole-page option off and on while editing keeps the inline draft. Every card retains its own schedule.

In Home → Advanced → Backup history, select an existing backup, choose Verify backup, then Restore backup. Discovery works after restarting. Verification is repeated by restore, which opens a new Library directory. A damaged entry is reported without hiding healthy backups.

### Page and card properties

In the Properties Inspector, **Page properties** opens the typed editor once the Library is ready. The familiar Type, workspace and relationship controls stay available. Page values remain Markdown frontmatter; card properties are independent SQLite data edited inside the card form. Both editors support explicit field removal and lossless type changes with a preview. Unsupported data is shown read-only and survives edits to other fields. A failed page type save offers Retry without applying the acknowledged Markdown edits again.

A card answer can use its own text, the current page or another page in the same Library. Select a source by its path when titles coincide. Open the source preview to read it without leaving the unsaved card form. Source changes are live; missing sources block grading until repaired/reloaded. Choosing a source never changes the card's owner, review scope or memory.

Use **Media** in the card form to expand image/audio paths and previews. In the desktop app, **Choose image/audio** copies a selected file through the existing attachments pipeline; Save commits the property to the card. A failed preview leaves the path available to correct. Card review dates/counts appear as read-only information. Custom card metadata remains private to the editor rather than being added to the study face.

### Missing learning database

If an existing `.memnova/library.json` has no initialized `learning.sqlite3`, Memnova reports a recovery error instead of replacing review history with an empty database. Restore a verified backup into a new directory. Keep the original Library for inspection. This guard also covers interrupted first initialization: for a genuinely unused empty Library with no backup, choose a new empty directory rather than deleting potentially useful recovery material. Copying Markdown alone does not preserve learning history or necessarily include attachments.

Canvas media remain in Library attachments; their Markdown snapshots store portable asset://memnova/attachments references. Keep the attachments and .memnova learning database with the Library when making a verified backup. Opening a corrupt/unsupported board preserves its raw snapshot and offers copy/retry; it does not reset the board. A repair notice on legacy device or online links means those links remain unchanged. Back up the Library before editing or replacing such sources. Imports finishing after their note is left do not insert into another note; an already written unused attachment is retained.
