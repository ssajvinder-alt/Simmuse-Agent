# Simmuse launch readiness

Status of this checkout (Hermes Agent source, MIT, Copyright (c) 2025 Nous Research).
Verified on Linux from source on 2026-11-27.

## Verified working

- Source install: `./setup-hermes.sh --runtime-only` succeeds.
- Backend: `hermes gateway ensure --json` returns `"state":"ready"`.
- Dashboard: `hermes dashboard` serves the UI; Chat, Models, Sessions, Skills, Plugins,
  Channels, Config and System load with the gateway reported as Running.
- `python scripts/check`: 14 of 14 checks pass.

## Not verified

- A full chat turn with a real model (no provider key or provider network in the test
  environment).
- Anything on Windows: installer, MSIX, the desktop app. The reported desktop error,
  "Could not run hermes gateway ensure", is raised only when the OS fails to spawn the
  `hermes` process (`apps/desktop/electron/local-gateway.ts:43`), i.e. a missing or blocked
  executable. The backend itself starts fine from source, so test a clean Windows VM.

## Must change before a public Simmuse launch

Nothing below can be decided from the code alone; each needs the owner's input.

1. **Name and identity.** This repo contains no "Simmuse" branding. Safe edits are the display
   names and ids in `apps/desktop/product-identity.cjs`, the README, and
   `web/src/i18n/en.ts`. Leave the `hermes` CLI name, `~/.hermes` paths and `HERMES_*`
   variables alone for v1: the desktop app spawns `cliName`.
2. **License.** Keep `LICENSE` and the Nous Research copyright line. Add your own line for
   your changes. Ship the license in installers and an About screen. Do not imply Nous
   endorses Simmuse; MIT does not cover the Hermes or Nous names and logos.
3. **Signing identity.** `apps/desktop/product-identity.cjs:82-84` and
   `apps/desktop/electron-builder.config.cjs` carry Nous's Partner Center publisher and
   support address. Use your own certificate or Partner Center account.
4. **Telemetry.** It is opt-in (off by default), but the offer and the endpoint are Nous's:
   `hermes_cli/observability/shared_metrics_send_config.py:15` and
   `web/src/components/SharedMetricsConsentBanner.tsx`. Point them at your own endpoint
   with a privacy policy, or remove the offer.
5. **Security contact.** `SECURITY.md` routes reports to security@nousresearch.com. Replace
   it with your own address.
6. **Billing and updates.** `agent/billing_view.py` links to Nous's portal; the desktop update
   feed is configured by `CLOUDFLARE_R2_PUBLIC_URL` (`apps/desktop/update-feed.cjs`).
7. **Trademark.** Search "Simmuse" before announcing.

## Demo plan

Install, add a model key, one chat that uses tools, one scheduled job. Record it on Windows.
Skip Nous-hosted inference and billing. Keep a recording as a fallback.
