import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import type { SessionMessage } from '@/types/hermes'

import { conversationToMarkdown, exportableMessageText, markdownFilename, saveMarkdownFile } from './markdown-export'

const msg = (role: SessionMessage['role'], content: unknown, over: Partial<SessionMessage> = {}) =>
  ({ content, role, ...over }) as SessionMessage

const NOW = new Date('2026-11-01T10:00:00Z')

it('shows people only the user and assistant messages', () => {
  expect(exportableMessageText(msg('user', 'Hi'))).toBe('Hi')
  expect(exportableMessageText(msg('assistant', 'Hello'))).toBe('Hello')
  expect(exportableMessageText(msg('tool', 'ls output'))).toBe('')
  expect(exportableMessageText(msg('system', 'You are…'))).toBe('')
})

it('skips hidden rows and prefers the text that was meant to be shown', () => {
  expect(exportableMessageText(msg('assistant', 'secret', { display_kind: 'hidden' }))).toBe('')
  expect(exportableMessageText(msg('assistant', 'scaffolding + answer', { display_content: 'answer' }))).toBe('answer')
})

it('reads text parts and ignores other parts', () => {
  const parts = [{ text: 'Part one. ', type: 'text' }, { type: 'tool_use' }, { text: 'Part two.', type: 'text' }]

  expect(exportableMessageText(msg('assistant', parts))).toBe('Part one. Part two.')
})

it('writes a conversation as a titled, dated Markdown document with named speakers', () => {
  const md = conversationToMarkdown({
    exportedAt: NOW,
    messages: [msg('user', 'What is a sonnet?'), msg('tool', 'x'), msg('assistant', 'A 14-line poem.')],
    title: 'Poetry notes'
  })

  expect(md).toBe(
    '# Poetry notes\n\n_Exported from Simmuse on 2026-11-01._\n\n## You\n\nWhat is a sonnet?\n\n## Simmuse\n\nA 14-line poem.\n'
  )
})

it('says so when there is nothing to export, and falls back to a plain title', () => {
  const md = conversationToMarkdown({ exportedAt: NOW, messages: [msg('tool', 'x')], title: '  ' })

  expect(md).toContain('# Conversation')
  expect(md).toContain('This conversation has no messages yet.')
})

it('keeps the person’s own Markdown intact', () => {
  const md = conversationToMarkdown({
    exportedAt: NOW,
    messages: [msg('assistant', '| a | b |\n|---|---|\n| 1 | 2 |\n\n```py\nprint(1)\n```')]
  })

  expect(md).toContain('| a | b |\n|---|---|\n| 1 | 2 |\n\n```py\nprint(1)\n```')
})

it('makes a file name that is safe on Windows, Mac and Linux', () => {
  expect(markdownFilename('Quarterly plan')).toBe('Quarterly plan.md')
  expect(markdownFilename('a/b\\c:d*e?f"g<h>i|j')).toBe('a b c d e f g h i j.md')
  expect(markdownFilename('  ..hidden..  ')).toBe('hidden.md')
  expect(markdownFilename('')).toBe('conversation.md')
  expect(markdownFilename(null, 'response')).toBe('response.md')
  expect(markdownFilename('x'.repeat(200)).length).toBeLessThanOrEqual(63)
})

type Bridge = { saveTextFileAs?: ReturnType<typeof vi.fn> }

beforeEach(() => {
  ;(window as unknown as { hermesDesktop?: Bridge }).hermesDesktop = {}
})

afterEach(() => {
  delete (window as unknown as { hermesDesktop?: Bridge }).hermesDesktop
})

it('asks the person where to save, offering Markdown, and reports where it went', async () => {
  const save = vi.fn().mockResolvedValue({ path: 'C:\\Users\\ada\\notes.md', saved: true })

  ;(window as unknown as { hermesDesktop: Bridge }).hermesDesktop = { saveTextFileAs: save }

  const result = await saveMarkdownFile('# Hi\n', { filename: 'notes.md', title: 'Save response' })

  expect(result).toEqual({ path: 'C:\\Users\\ada\\notes.md', result: 'saved' })
  expect(save).toHaveBeenCalledWith({
    content: '# Hi\n',
    defaultPath: 'notes.md',
    filters: [
      { extensions: ['md'], name: 'Markdown' },
      { extensions: ['txt'], name: 'Text' }
    ],
    title: 'Save response'
  })
})

it('treats closing the dialog as a choice, not an error', async () => {
  ;(window as unknown as { hermesDesktop: Bridge }).hermesDesktop = {
    saveTextFileAs: vi.fn().mockResolvedValue({ canceled: true, saved: false })
  }

  expect(await saveMarkdownFile('x', { filename: 'a.md', title: 't' })).toEqual({ result: 'canceled' })
})

it('says saving is unavailable when the app has no save dialog', async () => {
  expect(await saveMarkdownFile('x', { filename: 'a.md', title: 't' })).toEqual({ result: 'unavailable' })
})
