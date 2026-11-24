import { beforeEach, describe, expect, it, vi } from 'vitest'

import { DesktopFileMissingError, readDesktopFileText, writeDesktopFileText } from '@/lib/desktop-fs'

import {
  applyInstructions,
  DEFAULT_INSTRUCTIONS_FILE,
  extractInstructions,
  INSTRUCTIONS_END,
  INSTRUCTIONS_START,
  joinFolderFile,
  loadProjectInstructions,
  saveProjectInstructions
} from './project-instructions'

vi.mock('@/lib/desktop-fs', async () => {
  class DesktopFileMissingError extends Error {}

  return {
    DesktopFileMissingError,
    isDesktopFsRemoteMode: vi.fn(() => false),
    readDesktopFileText: vi.fn(),
    writeDesktopFileText: vi.fn(() => Promise.resolve({ path: '' }))
  }
})

const block = (body: string) => `${INSTRUCTIONS_START}\n${body}\n${INSTRUCTIONS_END}`
const missing = () => new DesktopFileMissingError({ error: 'ENOENT', message: 'missing', ok: false } as never)

/** A fake folder: file name -> text. Anything else is "not on disk". */
function folder(files: Record<string, string | { binary?: boolean; text: string; truncated?: boolean }>) {
  vi.mocked(readDesktopFileText).mockImplementation(async path => {
    const name = String(path).split(/[\\/]/).pop()!
    const file = files[name]

    if (file === undefined) {
      throw missing()
    }

    return typeof file === 'string' ? { path: String(path), text: file } : { path: String(path), ...file }
  })
}

beforeEach(() => {
  vi.mocked(readDesktopFileText).mockReset()
  vi.mocked(writeDesktopFileText).mockClear()
})

describe('extractInstructions', () => {
  it('reads the text inside the marked block', () => {
    expect(extractInstructions(`# Notes\n\n${block('Be brief.\nUse British spelling.')}\n`)).toBe(
      'Be brief.\nUse British spelling.'
    )
  })

  it('is empty without a block, or with only half of one', () => {
    expect(extractInstructions('# Notes')).toBe('')
    expect(extractInstructions(`${INSTRUCTIONS_START}\nunfinished`)).toBe('')
  })
})

describe('applyInstructions', () => {
  it('creates the block in an empty file', () => {
    expect(applyInstructions('', 'Be brief.')).toBe(`${block('Be brief.')}\n`)
  })

  it('appends the block and leaves existing content, frontmatter included, untouched', () => {
    const text = '---\ntitle: Thesis\n---\n\n# Rules\nCite sources.\n'
    const next = applyInstructions(text, 'Be brief.')

    expect(next.startsWith(text.trimEnd())).toBe(true)
    expect(next.endsWith(`${block('Be brief.')}\n`)).toBe(true)
    expect(extractInstructions(next)).toBe('Be brief.')
  })

  it('replaces an existing block in place and keeps the text around it', () => {
    const text = `Intro\n\n${block('old')}\n\nOutro\n`

    expect(applyInstructions(text, 'new')).toBe(`Intro\n\n${block('new')}\n\nOutro\n`)
  })

  it('removes the block when the instructions are blank, with no gap left behind', () => {
    const text = `Intro\n\n${block('old')}\n\nOutro\n`

    expect(applyInstructions(text, '   \n')).toBe('Intro\n\nOutro\n')
  })

  it('removing the only content leaves an empty file, and a blank instruction adds nothing', () => {
    expect(applyInstructions(`${block('old')}\n`, '')).toBe('')
    expect(applyInstructions('# Notes\n', '')).toBe('# Notes\n')
  })

  it('is stable: applying the same instructions twice changes nothing', () => {
    const once = applyInstructions('# Notes\n', 'Be brief.')

    expect(applyInstructions(once, 'Be brief.')).toBe(once)
  })

  it('trims the instructions', () => {
    expect(extractInstructions(applyInstructions('', '\n  Be brief.  \n\n'))).toBe('Be brief.')
  })
})

describe('joinFolderFile', () => {
  it('uses the separator the folder already uses', () => {
    expect(joinFolderFile('C:\\Users\\ada\\Thesis', '.hermes.md')).toBe('C:\\Users\\ada\\Thesis\\.hermes.md')
    expect(joinFolderFile('/home/ada/thesis/', '.hermes.md')).toBe('/home/ada/thesis/.hermes.md')
  })
})

describe('loadProjectInstructions', () => {
  it('uses the file the agent would read, in its order of preference', async () => {
    folder({ 'AGENTS.md': '# Agents', 'CLAUDE.md': '# Claude' })
    expect(await loadProjectInstructions('/p')).toMatchObject({ file: 'AGENTS.md', status: 'ok' })

    folder({ '.hermes.md': '# Mine', 'AGENTS.md': '# Agents' })
    expect(await loadProjectInstructions('/p')).toMatchObject({ file: '.hermes.md' })

    folder({ '.cursorrules': 'rules' })
    expect(await loadProjectInstructions('/p')).toMatchObject({ file: '.cursorrules' })
  })

  it('offers a new .hermes.md when the folder has no context file', async () => {
    folder({})

    expect(await loadProjectInstructions('/p')).toEqual({
      exists: false,
      file: DEFAULT_INSTRUCTIONS_FILE,
      instructions: '',
      status: 'ok',
      text: ''
    })
  })

  it('returns the instructions already in the block', async () => {
    folder({ '.hermes.md': `# Notes\n\n${block('Be brief.')}\n` })

    expect(await loadProjectInstructions('/p')).toMatchObject({ exists: true, instructions: 'Be brief.' })
  })

  it('refuses a file it could only read part of, or that is not text', async () => {
    folder({ 'AGENTS.md': { text: 'x', truncated: true } })
    expect(await loadProjectInstructions('/p')).toEqual({ file: 'AGENTS.md', reason: 'too-large', status: 'unsafe' })

    folder({ 'AGENTS.md': { binary: true, text: '' } })
    expect(await loadProjectInstructions('/p')).toEqual({ file: 'AGENTS.md', reason: 'binary', status: 'unsafe' })
  })

  it('does not hide a real read error as "no file"', async () => {
    vi.mocked(readDesktopFileText).mockRejectedValue(new Error('permission denied'))

    await expect(loadProjectInstructions('/p')).rejects.toThrow('permission denied')
  })
})

describe('saveProjectInstructions', () => {
  it('creates .hermes.md with just the block when the folder has none', async () => {
    folder({})

    expect(await saveProjectInstructions('/p', '.hermes.md', 'Be brief.')).toBe(true)
    expect(writeDesktopFileText).toHaveBeenCalledWith('/p/.hermes.md', `${block('Be brief.')}\n`)
  })

  it('edits only the block inside an existing AGENTS.md', async () => {
    folder({ 'AGENTS.md': '# Rules\nCite sources.\n' })

    await saveProjectInstructions('/p', 'AGENTS.md', 'Be brief.')

    const [path, written] = vi.mocked(writeDesktopFileText).mock.calls[0]

    expect(path).toBe('/p/AGENTS.md')
    expect(String(written).startsWith('# Rules\nCite sources.')).toBe(true)
    expect(extractInstructions(String(written))).toBe('Be brief.')
  })

  it('keeps changes made on disk since the file was loaded', async () => {
    folder({ '.hermes.md': '# Edited elsewhere after loading\n' })

    await saveProjectInstructions('/p', '.hermes.md', 'Be brief.')

    expect(String(vi.mocked(writeDesktopFileText).mock.calls[0][1])).toContain('Edited elsewhere after loading')
  })

  it('writes nothing for a blank instruction when there is no file', async () => {
    folder({})

    expect(await saveProjectInstructions('/p', '.hermes.md', '  ')).toBe(false)
    expect(writeDesktopFileText).not.toHaveBeenCalled()
  })

  it('writes nothing when nothing changed', async () => {
    folder({ '.hermes.md': `${block('Be brief.')}\n` })

    await saveProjectInstructions('/p', '.hermes.md', 'Be brief.')

    expect(writeDesktopFileText).not.toHaveBeenCalled()
  })

  it('refuses to overwrite a file it cannot read completely', async () => {
    folder({ 'AGENTS.md': { text: 'x', truncated: true } })

    await expect(saveProjectInstructions('/p', 'AGENTS.md', 'Be brief.')).rejects.toThrow(/will not change it/)
    expect(writeDesktopFileText).not.toHaveBeenCalled()
  })
})
