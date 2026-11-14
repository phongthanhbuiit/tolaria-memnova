![Latest stable](https://img.shields.io/github/v/release/phongthanhbuiit/tolaria-memnova?display_name=tag) [![CI](https://github.com/phongthanhbuiit/tolaria-memnova/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/phongthanhbuiit/tolaria-memnova/actions/workflows/ci.yml) [![Codecov](https://codecov.io/gh/phongthanhbuiit/tolaria-memnova/graph/badge.svg?branch=main)](https://codecov.io/gh/phongthanhbuiit/tolaria-memnova)

# 💧 Memnova

Memnova is a local-first desktop app for Markdown notes and optional note-based memorization. It is built from Tolaria. macOS is the primary development target, with Windows and Linux builds in the release pipeline. People use it for a variety of use cases:

* Operate second brains and personal knowledge
* Organize company docs as context for AI
* Store OpenClaw/assistants memory and procedures

Memnova builds on [Tolaria](https://github.com/refactoringhq/tolaria), created by Luca Rossi for the knowledge workflows behind [Refactoring](https://refactoring.fm/).

<img width="1000" height="656" alt="Tolaria knowledge workspace" src="https://github.com/user-attachments/assets/8aeafb0a-b236-43c2-a083-ec111f903c38" />

## Tolaria walkthroughs

These walkthroughs show the upstream Tolaria workflows. Memnova adds the local note memorization flow described below.
- [How I Organize My Own Tolaria Workspace](https://www.loom.com/share/bb3aaffa238b4be0bd62e4464bca2528)
- [My Inbox Workflow](https://www.loom.com/share/dffda263317b4fa8b47b59cdf9330571)
- [How I Save Web Resources to Tolaria](https://www.loom.com/share/8a3c1776f801402ebbf4d7b0f31e9882)

## Principles

- 📑 **Files-first** — Your notes are plain markdown files. They're portable, work with any editor, and require no export step. Your data belongs to you, not to any app.
- 🔌 **Local Library first** — Create or open a Markdown folder without Git. Git can be enabled for note history and sync. Use Library backup and restore to preserve learning schedules and review history.
- 🛜 **Offline-first, zero lock-in** — No accounts, no subscriptions, no cloud dependencies. Your vault works completely offline and always will. If you stop using Tolaria, you lose nothing.
- 🔬 **Open source** — Memnova and its Tolaria foundation are open source.
- 📋 **Standards-based** — Notes are markdown files with YAML frontmatter. No proprietary formats, no locked-in data. Everything works with standard tools if you decide to move away from Tolaria.
- 🔍 **Types as lenses, not schemas** — Types in Tolaria are navigation aids, not enforcement mechanisms. There's no required fields, no validation, just helpful categories for finding notes.
- 🪄**AI-first but not AI-only** — A vault of files works very well with AI agents, but you are free to use whatever you want. We support Claude Code, Codex CLI, and Gemini CLI setup paths, but you can edit the vault with any AI you want. We provide an AGENTS file for your agents to figure out.
- ⌨️ **Keyboard-first** — Tolaria is designed for power-users who want to use keyboard as much as possible. A lot of how we designed the Editor and the Command Palette is based on this.
- 💪 **Built from real use** — Memnova extends Tolaria's Markdown knowledge workflows with optional note memorization.

## Installation

### Homebrew

Check the [Memnova release page](https://github.com/phongthanhbuiit/tolaria-memnova/releases) for the current macOS installer and installation instructions.

### Download from releases

Download the [latest Memnova release](https://github.com/phongthanhbuiit/tolaria-memnova/releases) for the platform you use. Check the asset name, version, and publisher on the release page.

## Getting started

On first launch, create a local Library or open an existing Markdown folder. The sample Library is available under Advanced. To learn from a note, open Content, write the Article, then use Memorization → Enable memorization → Add mnemonic. Write the Mnemonic face and select Study. For a recoverable copy of your learning progress, use Home → Advanced → Backup history to create and verify a Library backup.

The public user docs live in [`site/`](site/) and are published to GitHub Pages. Start with [Install Tolaria](site/start/install.md), then [First Launch](site/start/first-launch.md).

## Open source and local setup

Tolaria is open source and built with Tauri, React, and TypeScript. If you want to run or contribute to the app locally, here is [how to get started](https://github.com/phongthanhbuiit/tolaria-memnova/blob/main/docs/GETTING-STARTED.md). You can also find the gist below 👇

### Prerequisites

- Node.js 20+
- pnpm 8+
- Rust stable
- macOS or Linux for development

#### Linux system dependencies

Tauri 2 on Linux requires WebKit2GTK 4.1 and GTK 3:

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

The bundled MCP server still spawns the system `node` binary at runtime on Linux, so install Node from your distro package manager if you want the external AI tooling flow.

### Quick start

```bash
pnpm install
pnpm dev
```

Open `http://localhost:5173` for the browser-based mock mode, or run the native desktop app with:

```bash
pnpm tauri dev
```

## Tech Docs

- 📐 [ARCHITECTURE.md](docs/ARCHITECTURE.md) — System design, tech stack, data flow
- 🧩 [ABSTRACTIONS.md](docs/ABSTRACTIONS.md) — Core abstractions and models
- 🚀 [GETTING-STARTED.md](docs/GETTING-STARTED.md) — How to navigate the codebase
- 📚 [ADRs](docs/adr) — Architecture Decision Records

## Security

If you believe you have found a security issue, please report it privately as described in [SECURITY.md](./SECURITY.md).

## License

Tolaria is licensed under AGPL-3.0-or-later. The Tolaria name and logo remain covered by the project’s trademark policy.
