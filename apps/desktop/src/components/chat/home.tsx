import { requestComposerSetDraft } from '@/app/chat/composer/focus'
import { Button } from '@/components/ui/button'
import { Clock, FileText, FolderOpen, Pencil, Search } from '@/lib/icons'

import { Wordmark } from './wordmark'

type StarterAction = {
  id: string
  icon: typeof Search
  label: string
  hint: string
  /** What lands in the message box; the person finishes it and sends. */
  prompt: string
}

// Home is the empty-chat screen: one question, five ways to begin. Each action
// only fills the message box, so nothing is sent or changed until the person
// presses send.
//
// TODO(simmuse): the brief asks to show only examples the person's setup
// supports (for example research needs a web connection, summarizing needs
// file access). Every action is shown for now; gate them once the capability
// state they depend on is wired in.
export const STARTER_ACTIONS: readonly StarterAction[] = [
  {
    id: 'research',
    icon: Search,
    label: 'Research a topic',
    hint: 'A sourced report',
    prompt:
      'Research this topic and write a short report with source links. Keep what the sources say separate from your own suggestions. Topic: '
  },
  {
    id: 'summarize',
    icon: FileText,
    label: 'Summarize a document',
    hint: 'Key points from a file',
    prompt: 'Summarize the document I attach. List the key points and anything that is unclear or missing.'
  },
  {
    id: 'draft',
    icon: Pencil,
    label: 'Draft a report',
    hint: 'A first version to refine',
    prompt:
      'Help me draft a report. First ask what it is for and who will read it, then write a first version I can edit.'
  },
  {
    id: 'plan',
    icon: FolderOpen,
    label: 'Plan a project',
    hint: 'Goals turned into steps',
    prompt: 'Help me plan a project. Ask about my goals and any deadline, then outline the steps in order.'
  },
  {
    id: 'continue',
    icon: Clock,
    label: 'Continue previous work',
    hint: 'Pick up where you left off',
    prompt: 'Remind me where I left off in my recent work and suggest the next step.'
  }
]

export function Home() {
  const start = (action: StarterAction) => {
    void requestComposerSetDraft([], action.prompt, { active: true })
  }

  return (
    <div
      className="pointer-events-auto flex w-full min-w-0 flex-col items-center px-0.5 py-6 text-center sm:px-6 lg:px-8"
      data-slot="aui_home"
    >
      <div className="w-full min-w-0 max-w-2xl">
        <Wordmark className="mb-4 text-muted-foreground" text="SIMMUSE" />

        <h2 className="m-0 text-lg font-medium tracking-tight text-foreground">What would you like to work on?</h2>
        <p className="mt-1 mb-5 text-muted-foreground">Pick a starting point, or just type below.</p>

        <ul className="m-0 grid list-none grid-cols-1 gap-2 p-0 sm:grid-cols-2">
          {STARTER_ACTIONS.map(action => (
            <li key={action.id}>
              <Button
                className="h-auto w-full justify-start gap-3 px-3 py-2.5 text-left"
                data-starter={action.id}
                onClick={() => start(action)}
                type="button"
                variant="outline"
              >
                <action.icon aria-hidden className="size-4 text-muted-foreground" />
                <span className="flex min-w-0 flex-col">
                  <span className="text-sm">{action.label}</span>
                  <span className="text-xs font-normal text-muted-foreground">{action.hint}</span>
                </span>
              </Button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
