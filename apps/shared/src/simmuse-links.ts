/**
 * simmuse-links.ts — every support, docs, community and release destination the
 * app shows to people. Single authority: change an address here, not at the call
 * site.
 *
 * These are PLACEHOLDERS on the reserved `.example` domain. They do not resolve
 * on purpose. TODO(owner): replace each with a real, owner-controlled address
 * before any public build (see SIMMUSE-LAUNCH-INSTRUCTIONS.md, "Owner decisions").
 *
 * Not listed here on purpose: Nous Portal sign-in/billing and the upstream skills
 * hub / plugin catalog. Those are working services the app depends on today, not
 * branding.
 */
export const SIMMUSE_LINKS = {
  docs: 'https://docs.simmuse.example',
  docsDesktop: 'https://docs.simmuse.example/desktop',
  docsUpdating: 'https://docs.simmuse.example/updating',
  docsRecovery: 'https://docs.simmuse.example/recovery',
  docsTlsTrust: 'https://docs.simmuse.example/security#tls-certificate-trust',
  docsLocalModels: 'https://docs.simmuse.example/local-models',
  docsBringYourOwnEndpoint: 'https://docs.simmuse.example/bring-your-own-endpoint',
  docsSharedMetrics: 'https://docs.simmuse.example/shared-metrics',
  community: 'https://community.simmuse.example',
  issues: 'https://support.simmuse.example/issues',
  releases: 'https://downloads.simmuse.example/releases',
  download: 'https://downloads.simmuse.example',
  commitBase: 'https://source.simmuse.example/commit'
} as const
