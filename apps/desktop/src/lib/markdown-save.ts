import type { SessionInfo } from '@/hermes'
import { getAllSessionMessages } from '@/hermes'
import { conversationToMarkdown, markdownFilename, saveMarkdownFile, type SaveMarkdownResult } from '@/lib/markdown-export'
import { notify, notifyError } from '@/store/notifications'

function report(result: SaveMarkdownResult, path: string | undefined, what: string) {
  if (result === 'saved') {
    notify({ durationMs: 4_000, kind: 'success', message: path ? `${what} saved to ${path}` : `${what} saved` })
  } else if (result === 'unavailable') {
    notify({ kind: 'warning', message: 'Saving files is not available here.' })
  }
  // 'canceled': the person closed the dialog on purpose; no message.
}

/** First line of a reply, as a title for its file ("# Heading" markers dropped). */
function firstLine(text: string): string {
  return (text.split('\n').find(line => line.trim()) ?? '').replace(/^#+\s*/, '').trim()
}

/** Save one reply as a Markdown file the person names and places. */
export async function saveResponseAsMarkdown(text: string, { title }: { title?: null | string } = {}): Promise<void> {
  const body = text.trim()

  if (!body) {
    return
  }

  try {
    const filename = markdownFilename(firstLine(body) || title, 'response')
    const { path, result } = await saveMarkdownFile(`${body}\n`, { filename, title: 'Save response' })

    report(result, path, 'Response')
  } catch (error) {
    notifyError(error, 'Could not save the response')
  }
}

/** Save a whole conversation as a readable Markdown document. */
export async function exportConversationAsMarkdown(
  sessionId: string,
  { profile, session, title }: { profile?: null | string; session?: SessionInfo; title?: null | string } = {}
): Promise<void> {
  if (!sessionId) {
    return
  }

  try {
    const { messages } = await getAllSessionMessages(sessionId, profile ?? session?.profile)
    const heading = title ?? session?.title ?? null
    const content = conversationToMarkdown({ messages, title: heading })

    const { path, result } = await saveMarkdownFile(content, {
      filename: markdownFilename(heading, 'conversation'),
      title: 'Export conversation'
    })

    report(result, path, 'Conversation')
  } catch (error) {
    notifyError(error, 'Could not export the conversation')
  }
}
