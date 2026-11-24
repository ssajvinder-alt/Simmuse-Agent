import { messageContentText } from '@/components/assistant-ui/thread/content'
import type { SessionMessage } from '@/types/hermes'

// Readable exports for people, as opposed to the JSON dump in session-export.ts. A conversation becomes
// a Markdown document; one reply becomes its own Markdown file. The destination is always chosen by the
// person in the system "Save as" dialog, never written to a default place.

export type SaveMarkdownResult = 'canceled' | 'saved' | 'unavailable'

/** The words a message is shown under in an exported conversation. */
const SPEAKER: Record<string, string> = { assistant: 'Simmuse', user: 'You' }

/** The text a person saw for a stored message, or '' when it was not part of the conversation. */
export function exportableMessageText(message: SessionMessage): string {
  if (message.role !== 'user' && message.role !== 'assistant') {
    return ''
  }

  if (message.display_kind === 'hidden') {
    return ''
  }

  // A row can carry internal scaffolding in `content`; `display_content` is what was meant to be shown.
  return messageContentText(message.display_content ?? message.content)
}

/** A whole conversation as a Markdown document. Tool calls and internal rows are left out. */
export function conversationToMarkdown({
  exportedAt = new Date(),
  messages,
  title
}: {
  exportedAt?: Date
  messages: readonly SessionMessage[]
  title?: null | string
}): string {
  const heading = title?.trim() || 'Conversation'

  const turns = messages.flatMap(message => {
    const text = exportableMessageText(message)

    return text ? [`## ${SPEAKER[message.role]}\n\n${text}`] : []
  })

  const date = exportedAt.toISOString().slice(0, 10)
  const header = `# ${heading}\n\n_Exported from Simmuse on ${date}._`

  return turns.length ? `${header}\n\n${turns.join('\n\n')}\n` : `${header}\n\n_This conversation has no messages yet._\n`
}

/** A file name safe on every system, ending in `.md`. */
export function markdownFilename(title: null | string | undefined, fallback = 'conversation'): string {
  const base = Array.from(title ?? '')
    .filter(char => char.charCodeAt(0) >= 32) // control characters are not allowed in file names
    .join('')
    .trim()
    .replace(/[\\/:*?"<>|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^[ .]+|[ .]+$/g, '')
    .slice(0, 60)
    .trim()

  return `${base || fallback}.md`
}

/** Save `content` as a Markdown file, letting the person pick where. */
export async function saveMarkdownFile(
  content: string,
  { filename, title }: { filename: string; title: string }
): Promise<{ path?: string; result: SaveMarkdownResult }> {
  const save = window.hermesDesktop?.saveTextFileAs

  if (!save) {
    return { result: 'unavailable' }
  }

  const saved = await save({
    content,
    defaultPath: filename,
    filters: [
      { extensions: ['md'], name: 'Markdown' },
      { extensions: ['txt'], name: 'Text' }
    ],
    title
  })

  if (saved.canceled || !saved.saved) {
    return { result: 'canceled' }
  }

  return { path: saved.path, result: 'saved' }
}
