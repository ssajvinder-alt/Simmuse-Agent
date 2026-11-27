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

## Store signing and payments runbook

Done in code: the packaging no longer carries Nous's identity. `appId` is `com.simmuse.*`,
the release repo is `ssajvinder-alt/Simmuse-Agent`, and the Store identity in
`apps/desktop/product-identity.cjs` holds three `REPLACE_WITH_...` placeholders. A Store
build with the placeholders still in place is meant to fail, so it can never ship under
another publisher's name.

Needs the owner:
1. Create a Microsoft Partner Center individual account. Reserve the app name "Simmuse".
2. In Partner Center, open the product's Product identity page. Copy Package/Identity/Name,
   Package/Identity/Publisher and Publisher display name into the three placeholders in
   `apps/desktop/product-identity.cjs` (and the matching expectations in
   `apps/desktop/electron/product-identity.test.ts`).
3. On a Windows machine, follow `apps/desktop/BUILDING.md` to build the `store` variant, then
   upload the package. The Store signs it on submission.
4. Payments: open a Lemon Squeezy (or Paddle) account, create the Pro product with license
   keys, and send the product id. The client is in `hermes_cli/simmuse_license.py` (activate,
   validate with a 7-day offline grace, deactivate; 6 tests, mocked network). It is not wired into
   app startup and was not run against the real Lemon Squeezy API. Note the code is MIT and
   public, so a check inside it is a convenience, not copy protection; the paid value is the
   signed installer, updates and support.

Not verified here: the Windows build itself, and the `electron-builder` based desktop tests
(the package is not installed in this container).
