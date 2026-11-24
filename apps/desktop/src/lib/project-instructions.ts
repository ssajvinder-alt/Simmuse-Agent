import { DesktopFileMissingError, isDesktopFsRemoteMode, readDesktopFileText, writeDesktopFileText } from '@/lib/desktop-fs'

// Project instructions: plain-language guidance for Simmuse that applies to every conversation in a
// project's main folder. The agent already reads one "project context" file from the working folder
// (agent/prompt_builder.py, build_context_files_prompt), so the instructions live in that file, inside a
// marked block. Nothing else in the file is ever touched.
//
// Only ONE context file type is read, first found wins, so the file we write must be the one the agent
// would read anyway: creating `.hermes.md` next to an existing AGENTS.md would silently hide it.

export const INSTRUCTIONS_START = '<!-- simmuse:instructions:start -->'
export const INSTRUCTIONS_END = '<!-- simmuse:instructions:end -->'

/** Context files in the order the agent prefers them. `.hermes.md` and `HERMES.md` are one type. */
export const CONTEXT_FILE_NAMES = ['.hermes.md', 'HERMES.md', 'AGENTS.md', 'CLAUDE.md', '.cursorrules'] as const

/** Created when the folder has none of the above. */
export const DEFAULT_INSTRUCTIONS_FILE = '.hermes.md'

export type LoadedInstructions =
  | { exists: boolean; file: string; instructions: string; status: 'ok'; text: string }
  | { file: string; reason: 'binary' | 'too-large'; status: 'unsafe' }
  | { status: 'remote' }

/** The text inside the marked block, trimmed; '' when there is none. */
export function extractInstructions(text: string): string {
  const start = text.indexOf(INSTRUCTIONS_START)

  if (start === -1) {
    return ''
  }

  const end = text.indexOf(INSTRUCTIONS_END, start + INSTRUCTIONS_START.length)

  if (end === -1) {
    return ''
  }

  return text.slice(start + INSTRUCTIONS_START.length, end).trim()
}

/**
 * `text` with its marked block set to `instructions`. Replaces the block in place, appends one when
 * there is none, and removes it when `instructions` is blank. Everything outside the block, frontmatter
 * included, is returned unchanged.
 */
export function applyInstructions(text: string, instructions: string): string {
  const body = instructions.trim()
  const start = text.indexOf(INSTRUCTIONS_START)
  const end = start === -1 ? -1 : text.indexOf(INSTRUCTIONS_END, start + INSTRUCTIONS_START.length)
  const block = `${INSTRUCTIONS_START}\n${body}\n${INSTRUCTIONS_END}`

  if (start !== -1 && end !== -1) {
    const after = end + INSTRUCTIONS_END.length

    if (body) {
      return text.slice(0, start) + block + text.slice(after)
    }

    // Removing the block: take its blank-line padding with it so no gap is left behind.
    const before = text.slice(0, start).replace(/\n+$/, '')
    const rest = text.slice(after).replace(/^\n+/, '')

    return before && rest ? `${before}\n\n${rest}` : before ? `${before}\n` : rest
  }

  if (!body) {
    return text
  }

  const base = text.replace(/\s+$/, '')

  return base ? `${base}\n\n${block}\n` : `${block}\n`
}

/** `name` inside `folder`, using the folder's own separator. */
export function joinFolderFile(folder: string, name: string): string {
  const sep = folder.includes('\\') && !folder.includes('/') ? '\\' : '/'

  return `${folder.replace(/[\\/]+$/, '')}${sep}${name}`
}

/** Read the folder's context file, or report why it cannot be edited safely. */
export async function loadProjectInstructions(folder: string): Promise<LoadedInstructions> {
  if (isDesktopFsRemoteMode()) {
    return { status: 'remote' }
  }

  for (const name of CONTEXT_FILE_NAMES) {
    try {
      const result = await readDesktopFileText(joinFolderFile(folder, name))

      // A partial or non-text read must never be written back over the real file.
      if (result.binary) {
        return { file: name, reason: 'binary', status: 'unsafe' }
      }

      if (result.truncated) {
        return { file: name, reason: 'too-large', status: 'unsafe' }
      }

      return { exists: true, file: name, instructions: extractInstructions(result.text), status: 'ok', text: result.text }
    } catch (error) {
      if (!(error instanceof DesktopFileMissingError)) {
        throw error
      }
    }
  }

  return { exists: false, file: DEFAULT_INSTRUCTIONS_FILE, instructions: '', status: 'ok', text: '' }
}

/**
 * Save `instructions` into the folder's context file. The file is read again just before writing, so
 * anything changed on disk since it was loaded is kept. Returns false when there was nothing to write
 * (a blank instruction for a file that does not exist).
 */
export async function saveProjectInstructions(folder: string, file: string, instructions: string): Promise<boolean> {
  const path = joinFolderFile(folder, file)
  let current = ''
  let exists = true

  try {
    const result = await readDesktopFileText(path)

    if (result.binary || result.truncated) {
      throw new Error(`${file} is too large or is not a text file, so Simmuse will not change it.`)
    }

    current = result.text
  } catch (error) {
    if (!(error instanceof DesktopFileMissingError)) {
      throw error
    }

    exists = false
  }

  const next = applyInstructions(current, instructions)

  if (next === current && exists) {
    return true
  }

  if (!exists && !next.trim()) {
    return false
  }

  await writeDesktopFileText(path, next)

  return true
}
