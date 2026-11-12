// Defaults must run before bundled modules resolve paths or feature flags.
// An esbuild define would replace reads, not populate the child process env.
// Match scripts/releases/bundle_env.py and the channel request decoder.
const ALLOWED_KEYS = new Set([
  'HERMES_HOME', 'HERMES_DATA_DIR_SUFFIX', 'HERMES_DESKTOP_USER_DATA_DIR',
  'HERMES_SHARED_AUTH_DIR', 'HERMES_PREVIEW_FULL_CONNECTORS'
])

// Simmuse's own defaults, baked into every desktop bundle. The data-directory suffix keeps Simmuse's
// state (`%LOCALAPPDATA%\hermes-simmuse`) beside, never inside, a Hermes install on the same machine.
// Like any default it fills only an absent key, so an explicit runtime value still wins.
export const PRODUCT_BUNDLE_ENV = Object.freeze({ HERMES_DATA_DIR_SUFFIX: '-simmuse' })

/** The JSON the bundled banner applies: the product defaults, then anything the build asked for
 * (`HERMES_BUNDLE_ENV_JSON`), which may override them or clear them with null.
 * @param {string} raw @returns {string} */
export function bundleEnvironmentJson(raw) {
  const requested = JSON.parse(raw || '{}')
  validateBundleEnvironment(requested)
  return JSON.stringify({ ...PRODUCT_BUNDLE_ENV, ...requested })
}

/** Validate a bundle environment object: plain object of identifiers to
 * strings (defaults) or null (clears). Shared by the banner writer and the
 * smoke driver's stamp reader.
 * @param {unknown} values @returns {Record<string, string|null>} */
export function validateBundleEnvironment(values) {
  if (!values || Array.isArray(values) || typeof values !== 'object') {
    throw new Error('Bundle environment must be a JSON object')
  }
  for (const [key, value] of Object.entries(values)) {
    if (!ALLOWED_KEYS.has(key) || (value !== null && (typeof value !== 'string' || value.includes('\0')))) {
      throw new Error('Bundle environment requires permitted desktop keys and string values without NUL, or null to clear')
    }
  }
  return /** @type {Record<string, string|null>} */ (values)
}

/** Apply bundle environment defaults/clears to a base environment and return a
 * new object without mutating it. This is the pure twin of the side-effecting
 * loop the bundled banner emits at launch — keep the two in lockstep (pinned
 * by bundle-env.test.mjs). Clears (null) set the key to an empty string
 * unconditionally so a stale registry or ambient value cannot win; defaults
 * fill only an absent key, so an explicit runtime value always wins.
 * @param {Record<string, string|undefined>} env
 * @param {Record<string, string|null>} values */
export function applyBundleEnvironment(env, values) {
  const result = { ...env }
  for (const [key, value] of Object.entries(values)) {
    if (value === null) result[key] = ''
    else if (result[key] == null) result[key] = value
  }
  return result
}

/** @param {string} raw @returns {string} */
export function environmentDefaultsBanner(raw) {
  const values = validateBundleEnvironment(JSON.parse(raw))
  // Keep clears present-but-empty so path resolution cannot restore registry
  // defaults. The emitted loop is the side-effecting twin of
  // applyBundleEnvironment above; it cannot call it (the banner runs before
  // the bundle's imports), so the two must stay in lockstep — see the test.
  return `\nfor (const [key, value] of ${JSON.stringify(Object.entries(values))}) { if (value === null) process.env[key] = ''; else process.env[key] ??= value; }\n`
}
