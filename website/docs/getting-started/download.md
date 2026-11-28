---
sidebar_position: 1
title: Download
description: Download the Simmuse pre-release installers for macOS and Linux, and open them past the unsigned-build warnings.
---

# Download

Simmuse pre-release builds are published on the
[GitHub Releases page](https://github.com/ssajvinder-alt/Simmuse-Agent/releases).
Pre-releases are not marked "Latest", so open the newest entry by hand.

| Platform | File | Notes |
|---|---|---|
| macOS (Apple silicon and Intel) | `.dmg` or `.zip` | Unsigned: see below |
| Linux (x64) | `.AppImage` | `chmod +x` it, then run it |
| Windows | Command-line install | The desktop package is not attached to pre-releases yet |

Check a download against `SHA256SUMS.txt` on the same release page.

## Opening an unsigned build

- **macOS:** open the DMG, drag Simmuse to Applications, then right-click the app and choose **Open** the first time.
- **Linux:** `chmod +x Simmuse*.AppImage && ./Simmuse*.AppImage`
- **Windows:** use the PowerShell installer from the [installation guide](./installation). If SmartScreen warns, choose **More info**, then **Run anyway**.

## Providing a model key

Simmuse sends requests to the AI provider you choose. Use a spend-capped test key
and never paste it into an issue or screenshot.

## Reporting problems

Open a GitHub issue with the **Bug report** template and include `hermes logs`
output with keys and personal data removed. Security problems follow `SECURITY.md`,
not a public issue.
