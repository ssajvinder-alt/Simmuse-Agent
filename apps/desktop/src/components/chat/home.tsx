import { useStore } from '@nanostores/react'
import { useMemo } from 'react'
import { useInRouterContext, useNavigate } from 'react-router'

import { requestComposerSetDraft } from '@/app/chat/composer/focus'
import { openSession, type OpenSessionNavigate } from '@/app/open-session'
import { Button } from '@/components/ui/button'
import { sessionTitle } from '@/lib/chat-runtime'
import { Clock, FileText, FolderOpen, Pencil, Search } from '@/lib/icons'
import { relativeTime } from '@/lib/time'
import { cn } from '@/lib/utils'
import { $projects, enterProject } from '@/store/projects'
import { $currentModel, $gatewayState, $sessions } from '@/store/session'
import type { SessionInfo } from '@/types/hermes'

import { Wordmark } from './wordmark'

type StarterAction = {
  id: string
  icon: typeof Search
  label: string
  hint: string
  /** What lands in the message box; the person finishes it and sends. */
  prompt: string
}

// Home is the empty-chat screen: one question, five ways to begin, then where
// things stand (setup status) and where the person left off (recent sessions
// and projects). Starting actions only fill the message box, so nothing is sent
// or changed until the person presses send.
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

const RECENT_LIMIT = 3

export type SetupStatus = { tone: 'ok' | 'pending' | 'problem'; text: string }

/** One plain-language line about whether Simmuse is ready to work. */
export function setupStatus(connection: string, model: string): SetupStatus {
  if (connection === 'open') {
    return model.trim()
      ? { tone: 'ok', text: `Ready · Model: ${model.trim()}` }
      : { tone: 'pending', text: 'Connected · Choose a model to get started' }
  }

  if (connection === 'closed' || connection === 'error') {
    return { tone: 'problem', text: 'Not connected · Simmuse is not running yet' }
  }

  return { tone: 'pending', text: 'Starting up…' }
}

/** Newest conversations that have something in them, newest first. */
export function recentSessions(sessions: readonly SessionInfo[], limit = RECENT_LIMIT): SessionInfo[] {
  return sessions
    .filter(s => !s.archived && !s.is_internal_child && s.message_count > 0)
    .sort((a, b) => (b.last_active || b.started_at || 0) - (a.last_active || a.started_at || 0))
    .slice(0, limit)
}

const TONE_DOT: Record<SetupStatus['tone'], string> = {
  ok: 'bg-emerald-500',
  pending: 'bg-amber-500',
  problem: 'bg-destructive'
}

// useNavigate throws outside a Router, and some surfaces render the chat
// without one, so only mount the navigating variant when a Router exists.
export function Home() {
  return useInRouterContext() ? <HomeWithNavigation /> : <HomeView />
}

function HomeWithNavigation() {
  const navigate = useNavigate()

  return <HomeView navigate={navigate} />
}

function HomeView({ navigate }: { navigate?: OpenSessionNavigate }) {
  const sessions = useStore($sessions)
  const projects = useStore($projects)
  const connection = useStore($gatewayState)
  const model = useStore($currentModel)

  const recent = useMemo(() => recentSessions(sessions), [sessions])
  const recentProjects = useMemo(() => projects.filter(p => !p.archived).slice(0, RECENT_LIMIT), [projects])
  const status = setupStatus(connection, model)
  const latest = recent[0]

  const start = (action: StarterAction) => {
    // "Continue previous work" goes straight to the latest conversation when
    // there is one to go back to; otherwise it asks for a summary instead.
    if (action.id === 'continue' && latest && navigate) {
      openSession(latest.id, navigate)

      return
    }

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
        <p className="mt-1 mb-2 text-muted-foreground">Pick a starting point, or just type below.</p>

        <p className="mb-5 flex items-center justify-center gap-2 text-xs text-muted-foreground" data-slot="home_status">
          <span aria-hidden className={cn('size-2 rounded-full', TONE_DOT[status.tone])} />
          <span>{status.text}</span>
        </p>

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
                  <span className="text-xs font-normal text-muted-foreground">
                    {action.id === 'continue' && latest ? `Latest: ${sessionTitle(latest)}` : action.hint}
                  </span>
                </span>
              </Button>
            </li>
          ))}
        </ul>

        {(recent.length > 0 || recentProjects.length > 0) && (
          <div className="mt-6 grid grid-cols-1 gap-4 text-left sm:grid-cols-2" data-slot="home_recent">
            {recent.length > 0 && (
              <section aria-label="Recent conversations">
                <h3 className="m-0 mb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">Recent</h3>
                <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
                  {recent.map(session => (
                    <li key={session.id}>
                      <Button
                        className="h-auto w-full justify-between gap-3 px-2 py-1.5 text-left"
                        data-recent-session={session.id}
                        disabled={!navigate}
                        onClick={() => navigate && openSession(session.id, navigate)}
                        type="button"
                        variant="ghost"
                      >
                        <span className="min-w-0 truncate text-sm">{sessionTitle(session)}</span>
                        <span className="shrink-0 text-xs font-normal text-muted-foreground">
                          {relativeTime((session.last_active || session.started_at) * 1000)}
                        </span>
                      </Button>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {recentProjects.length > 0 && (
              <section aria-label="Projects">
                <h3 className="m-0 mb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Projects
                </h3>
                <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
                  {recentProjects.map(project => (
                    <li key={project.id}>
                      <Button
                        className="h-auto w-full justify-start gap-2 px-2 py-1.5 text-left"
                        data-recent-project={project.id}
                        onClick={() => enterProject(project.id)}
                        type="button"
                        variant="ghost"
                      >
                        <FolderOpen aria-hidden className="size-3.5 text-muted-foreground" />
                        <span className="min-w-0 truncate text-sm">{project.name}</span>
                      </Button>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
