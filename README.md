# Memnova

Memnova is a local-first desktop app for writing Markdown notes and reviewing the ones you want to remember. A Library is a folder on your computer. You can open an existing folder, keep editing it with other tools, and use Memnova without an account.

[Current product state, UI screenshots and release differences](docs/CURRENT-STATE.md)

## Install 0.1.0

The first desktop release targets **macOS on Apple Silicon** (M-series Macs). Open the disk image and drag `tolaria-memnova.app` to Applications. The release includes a SHA-256 checksum. This build is ad-hoc signed and has no Apple notarization. Gatekeeper may block a downloaded copy. Updates for this version are available through GitHub Releases.

[Download Memnova for Apple Silicon](https://github.com/phongthanhbuiit/tolaria-memnova/releases/tag/v0.1.0)

## Write your first note and review it

1. Choose **Create local Library** or **Open existing Library**. Create or select a Markdown note and write what you want to remember.
2. Open **Properties** and turn on **Spaced repetition**. If the Library asks you to prepare learning data, complete that step first.
3. Open **Memorization → Add mnemonic** and add a text or image cue. The **Content** tab lets you edit the article and its mnemonic.
4. Save the note, choose **Study**, reveal the mnemonic, and grade your recall. To pause future reviews, turn off **Spaced repetition** in Properties. You can resume it later with the same history.

Ordinary notes open directly in the editor. Types, wikilinks and custom properties help organize them independently of the review schedule. Existing whiteboard blocks are preserved in Markdown. Version 0.1.0 omits the drawing SDK and cannot display or edit those drawings. A study face containing an unavailable drawing cannot be graded.

## Back up a Library

Markdown and attachments contain the notes and their media. Review schedules and history live in the Library’s private learning database. To carry both to another machine, use **Home → Advanced → Backup history**. Create and verify a backup, then restore it into a new folder. Git is optional and covers tracked files.

## Run from source

Use Node.js 22.12 or later in the 22.x series, pnpm 10, stable Rust, and the native build tools for your platform. From a checkout of this repository, run:

```sh
pnpm install --frozen-lockfile
pnpm tauri dev
```

For browser development with mock desktop services, run `pnpm dev` and open the URL Vite prints. In the current source build, type /Excalidraw in a note to insert a drawing. Shapes and embedded images are saved in an excalidraw Markdown fence. Study opens the drawing read-only.

[Development setup](docs/GETTING-STARTED.md) · [Architecture](docs/ARCHITECTURE.md) · [Report a security issue](SECURITY.md)

## Credits and license

Memnova is a fork of Tolaria, created by Luca Rossi and the Tolaria contributors. The application code is licensed under AGPL-3.0-or-later. Third-party dependencies retain their own licenses.

[Upstream Tolaria](https://github.com/refactoringhq/tolaria) · [Application license](LICENSE) · [Excalidraw license](https://github.com/excalidraw/excalidraw/blob/master/LICENSE)
