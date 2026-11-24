# Simmuse Agent: Tester Guide (pre-launch)

Thanks for testing. No account, domain or app-store install is needed. Everything runs on your own computer.

## 1. Install

Pick one. Use the build the organizer sent you (GitHub pre-release) if you were given one.

- **Desktop app:** download the installer for your OS from the Releases page and run it. Test builds may be unsigned, so Windows SmartScreen or macOS Gatekeeper may warn you. Choose "More info > Run anyway" (Windows) or right-click > Open (macOS).
- **Command line:** see the "Installation" section of `README.md`.
- **From source (developers):** `source ./activate`, then `hermes setup`.

## 2. Provider key

Simmuse sends requests to the AI provider you choose. Use a **spend-capped test key**. Never paste keys into issues or screenshots.

## 3. Checklist (tick what you tried)

- [ ] Install finished with no errors; `hermes --version` (or the app) opens
- [ ] First-run setup completes; a model replies to "hello"
- [ ] A multi-turn conversation keeps context
- [ ] Terminal and file tools work (ask it to create and read a file in a scratch folder)
- [ ] Browser/web tool works (ask it to summarize a public page)
- [ ] Memory and skills persist across two separate sessions
- [ ] Scheduled job (cron) runs once
- [ ] Messaging gateway (only if you have a test bot): message arrives and a reply returns
- [ ] Desktop: window resize, settings, restart, update check
- [ ] Quit and relaunch: sessions are still there
- [ ] Uninstall leaves nothing unexpected behind

## 4. Reporting

Open a GitHub issue using the **Bug report** template. Include:

1. OS and version, install method
2. Steps to reproduce, expected vs actual result
3. Output of `hermes logs` (redact keys and personal data)

Security problems: do **not** file a public issue. Follow `SECURITY.md`.

## 5. Known limitations

- Test builds may be unsigned (see Install).
- Add anything the team already knows is broken here before sending this out.
