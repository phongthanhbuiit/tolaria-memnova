# Connect A Git Remote

Source: guides/connect-a-git-remote.md
URL: /guides/connect-a-git-remote

# Connect A Git Remote

Connect a remote to sync Markdown notes and other Git-tracked Library files between machines. Memnova keeps learning schedules and review history in private Library data outside app Git staging. Use **Home → Advanced → Backup history** to create and verify a backup containing your notes, media, and learning data. Restore that backup to a new folder when you need to recover learning progress.

## Before You Start

Make sure the remote repository exists and your system Git can authenticate to it. Tolaria uses system Git rather than storing provider-specific credentials.

## Steps

1. Open the bottom status bar remote chip, or run `Add Remote` from the command palette.
2. Paste the remote URL.
3. Confirm the remote name.
4. Fetch or push according to the app prompt.

## Recommended Auth

- SSH keys.
- GitHub CLI authentication.
- Existing Git credential helpers.
- macOS Keychain credentials for HTTPS remotes on macOS.

If authentication fails, see [Git Authentication](/troubleshooting/git-auth).