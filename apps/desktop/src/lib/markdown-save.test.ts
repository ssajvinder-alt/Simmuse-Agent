import { beforeEach, expect, it, vi } from 'vitest'

import { getAllSessionMessages } from '@/hermes'
import { notify, notifyError } from '@/store/notifications'

import { saveMarkdownFile } from './markdown-export'
import { exportConversationAsMarkdown, saveResponseAsMarkdown } from './markdown-save'

vi.mock('@/hermes', () => ({ getAllSessionMessages: vi.fn() }))
vi.mock('@/store/notifications', () => ({ notify: vi.fn(), notifyError: vi.fn() }))

vi.mock('./markdown-export', async importOriginal => ({
  ...(await importOriginal<Record<string, unknown>>()),
  saveMarkdownFile: vi.fn()
}))

beforeEach(() => {
  vi.mocked(getAllSessionMessages).mockReset()
  vi.mocked(saveMarkdownFile).mockReset()
  vi.mocked(notify).mockClear()
  vi.mocked(notifyError).mockClear()
})

it('saves a reply under a name taken from its first line, and says where it went', async () => {
  vi.mocked(saveMarkdownFile).mockResolvedValue({ path: 'C:\\n\\Quarterly plan.md', result: 'saved' })

  await saveResponseAsMarkdown('# Quarterly plan\n\nStep one.', { title: 'Chat' })

  expect(saveMarkdownFile).toHaveBeenCalledWith('# Quarterly plan\n\nStep one.\n', {
    filename: 'Quarterly plan.md',
    title: 'Save response'
  })

  expect(notify).toHaveBeenCalledWith(
    expect.objectContaining({ kind: 'success', message: 'Response saved to C:\\n\\Quarterly plan.md' })
  )
})

it('does nothing for an empty reply', async () => {
  await saveResponseAsMarkdown('   \n ')

  expect(saveMarkdownFile).not.toHaveBeenCalled()
})

it('stays quiet when the dialog is closed', async () => {
  vi.mocked(saveMarkdownFile).mockResolvedValue({ result: 'canceled' })

  await saveResponseAsMarkdown('Hello')

  expect(notify).not.toHaveBeenCalled()
  expect(notifyError).not.toHaveBeenCalled()
})

it('warns when saving is not available', async () => {
  vi.mocked(saveMarkdownFile).mockResolvedValue({ result: 'unavailable' })

  await saveResponseAsMarkdown('Hello')

  expect(notify).toHaveBeenCalledWith(expect.objectContaining({ kind: 'warning' }))
})

it('reports a failed save instead of throwing', async () => {
  vi.mocked(saveMarkdownFile).mockRejectedValue(new Error('disk full'))

  await expect(saveResponseAsMarkdown('Hello')).resolves.toBeUndefined()
  expect(notifyError).toHaveBeenCalled()
})

it('exports a conversation as Markdown named after its title', async () => {
  vi.mocked(getAllSessionMessages).mockResolvedValue({
    messages: [
      { content: 'Hi', role: 'user' },
      { content: 'Hello!', role: 'assistant' }
    ]
  } as never)

  vi.mocked(saveMarkdownFile).mockResolvedValue({ path: '/n/Plan.md', result: 'saved' })

  await exportConversationAsMarkdown('s1', { profile: 'default', title: 'Plan' })

  expect(getAllSessionMessages).toHaveBeenCalledWith('s1', 'default')

  const [content, options] = vi.mocked(saveMarkdownFile).mock.calls[0]

  expect(content).toContain('# Plan')
  expect(content).toContain('## You\n\nHi')
  expect(content).toContain('## Simmuse\n\nHello!')
  expect(options).toEqual({ filename: 'Plan.md', title: 'Export conversation' })
  expect(notify).toHaveBeenCalledWith(expect.objectContaining({ message: 'Conversation saved to /n/Plan.md' }))
})

it('reports a failure to load the conversation', async () => {
  vi.mocked(getAllSessionMessages).mockRejectedValue(new Error('backend down'))

  await exportConversationAsMarkdown('s1', { title: 'Plan' })

  expect(notifyError).toHaveBeenCalled()
  expect(saveMarkdownFile).not.toHaveBeenCalled()
})

it('ignores an empty session id', async () => {
  await exportConversationAsMarkdown('')

  expect(getAllSessionMessages).not.toHaveBeenCalled()
})
