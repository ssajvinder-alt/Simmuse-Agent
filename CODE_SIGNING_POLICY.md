# Code signing policy

Simmuse Agent is open source (MIT License). Windows releases of Simmuse are signed so that Windows can verify who published them and that the files have not been changed.

## Free code signing

Free code signing provided by [SignPath.io](https://about.signpath.io/), certificate by [SignPath Foundation](https://signpath.org/).

## What is signed

Only official Simmuse releases built from this repository (`ssajvinder-alt/Simmuse-Agent`) by the automated build pipeline are signed. Builds made on a developer's own computer are never signed with the SignPath Foundation certificate.

The signed files are the Simmuse Windows installer package and the Simmuse program files inside it. Third-party components bundled in the installer (for example the Python runtime, Chromium, ffmpeg and git) keep their own upstream signatures where they have them; they are not re-signed under the Simmuse name.

## Team roles

| Role | Who | Responsibility |
| --- | --- | --- |
| Authors | Contributors with write access to this repository | Write the code that is built and signed |
| Reviewers | `ssajvinder-alt` | Review changes before they are merged into the release branch |
| Approvers | `ssajvinder-alt` | Approve each signing request before a release is signed |

Everyone with access to the repository or to SignPath uses multi-factor authentication.

## Privacy

Simmuse runs on your own computer. It sends your requests only to the AI provider you choose and to services you ask it to use (for example a web search or a connected tool). The code is public, so you can see exactly what the program does. Any optional sharing feature is described in the app's settings before you turn it on.

## Reporting a problem

If you believe a signed Simmuse release is malicious or was signed by mistake, email sajuraiteam@gmail.com with the file name and version. Confirmed problems are reported to SignPath Foundation so the affected release can be revoked.

## Attribution

Simmuse is based on Hermes Agent, Copyright (c) 2025 Nous Research, used under the MIT License. See [LICENSE](LICENSE).
