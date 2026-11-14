# First Launch

Source: start/first-launch.md
URL: /start/first-launch

# First Launch

The first launch flow is designed to get you into a real vault quickly without hiding the local-first model.

## Choose a Library

The first screen offers **Create local Library** and **Open existing Library**. A Library is a folder on this device. Creating one needs no Git or AI setup. You can open an existing folder of Markdown notes.

For an optional sample, open **Advanced** and choose **Download sample Library**. This download requires a network connection.

## Learn from a note

1. Open a Markdown note and write the material to remember.
2. In **Properties**, turn on **Spaced repetition**. If prompted, prepare the Library’s learning data first.
3. Open **Memorization → Add mnemonic**. Add text or an image as a cue. Switch between the article and mnemonic in **Content**.
4. Save and choose **Study**. Reveal the mnemonic and grade your recall.

Version 0.1.0 preserves existing drawing blocks in Markdown. Drawing display and editing are unavailable in this release.

Both faces belong to the same Markdown file. The learning schedule and review history live in the Library's private learning data. For a recoverable copy of the entire Library, open **Home → Advanced → Backup history**, then create and verify a backup. Restore a verified backup into a new folder when needed.

## What Memnova Creates

Memnova stores app-level settings on the local machine. Your notes stay in the vault folder you choose.

| Data | Stored in |
| --- | --- |
| Notes and attachments | Your vault folder |
| Type definitions and saved views | Your vault folder |
| Window size, zoom, recent vaults | Local app settings |
| Cache data | Rebuildable local cache |

## First Commands To Try

- `Cmd+K` / `Ctrl+K`: open the command palette.
- `New Note`: create a note in the current vault.
- `Open Getting Started Vault`: clone the public sample vault.
- `Reload Vault`: rescan files after external edits.

## AI Setup Prompt

Tolaria can show an optional AI agents prompt after a vault is open. It checks common local install locations for supported coding agents and gives you setup paths, but you can dismiss it and use Tolaria without AI.