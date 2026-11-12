import { useStore } from '@nanostores/react'
import { useEffect, useMemo, useState } from 'react'
import { useInRouterContext, useNavigate } from 'react-router'

import { getToolsets } from '@/api/toolsets'
import { requestComposerSetDraft } from '@/app/chat/composer/focus'
import { openSession, type OpenSessionNavigate } from '@/app/open-session'
import { Button } from '@/components/ui/button'
import { sessionTitle } from '@/lib/chat-runtime'
import { Clock, FileText, FolderOpen, Pencil, Search } from '@/lib/icons'
import { relativeTime } from '@/lib/time'
import { cn } from '@/lib/utils'
import { $projectScope, ALL_PROJECTS } from '@/store/project-scope'
import { $projectOwnerBySessionId, $projects, $projectTree, enterProject } from '@/store/projects'
import { $currentModel, $gatewayState, $sessions } from '@/store/session'
import type { SessionInfo, ToolsetInfo } from '@/types/hermes'

import { Wordmark } from './wordmark'
import { WorkspaceFolderCard } from './workspace-folder-card'

type StarterAction = {
  id: string
  icon: typeof Search
  label: string
  hint: string
  /** What lands in the message box; the person finishes it and sends. */
  prompt: string
  /** A tool group the action cannot work without. Absent means it always works. */
  needs?: {
    /** Backend toolset name (see toolsets.py). */
    toolset: string
    /** How the missing capability reads in a sentence ("web access is off"). */
    what: string
    /** Also require the toolset to be set up (keys present), not just switched on. */
    configured: boolean
  }
}

// Home is the empty-chat screen: one question, five ways to begin, then where
// things stand (setup status) and where the person left off (recent sessions
// and projects). Starting actions only fill the message box, so nothing is sent
// or changed until the person presses send.
//
// An action whose tool group is switched off or not set up is hidden, with one
// muted line saying why. If the tool list cannot be loaded, every action stays
// visible: hiding everything because of a failed lookup would be worse.
export const STARTER_ACTIONS: readonly StarterAction[] = [
  {
    id: 'research',
    icon: Search,
    label: 'Research a topic',
    hint: 'A sourced report',
    // Workflow 1: a sourced report. grounded-citations numbers every source from what was actually
    // retrieved and flags claims that came from the model's own knowledge, which is how "what the
    // sources say" stays apart from "what I suggest".
    prompt:
      'Research this topic and write a sourced report. Use the grounded-citations skill so every fact has a ' +
      'numbered source link. Structure it as: Summary, Key findings, Where the sources disagree, My suggestions ' +
      '(marked as suggestions, not facts), Sources. Keep what the sources say separate from your own suggestions. ' +
      'Save the report as a Markdown file in the working folder and tell me its full path. If you cannot reach ' +
      'the web, say so instead of guessing. Topic: ',
    needs: { toolset: 'web', what: 'web access', configured: true }
  },
  {
    id: 'summarize',
    icon: FileText,
    label: 'Summarize a document',
    hint: 'Key points from a file',
    prompt:
      'Summarize the document I attach. List the key points and anything that is unclear or missing. Say ' +
      'which files you used, and tell me plainly if you cannot read one.',
    needs: { toolset: 'file', what: 'file access', configured: false }
  },
  {
    id: 'draft',
    icon: Pencil,
    label: 'Draft a report',
    hint: 'A first version to refine',
    // Workflow 2: draft, revise, preview, save. Word and PDF are offered only when the file is verified
    // to open correctly (the brief: never label an unsupported export as working).
    prompt:
      'Help me draft a document. First ask what it is for, who will read it, the tone I want and a rough length. ' +
      'Write a first version and open it in the preview pane. Then revise it as I ask (tone, structure, length). ' +
      'When I am happy, save it as a Markdown file and tell me its full path. Offer Word or PDF only if you can ' +
      'make a file that opens correctly.'
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
    // Workflow 3: reopen a project and carry on. Used when there is no earlier conversation to open;
    // the project's own instructions and files are read from its folder.
    prompt:
      'Help me continue my work. Read my project instructions and the files in this folder, and look at my ' +
      'recent conversations. Tell me in five lines or fewer where I left off, list what is unfinished, and ' +
      'suggest one next step. Do not change anything until I say yes.'
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

export type StarterAvailability = { shown: true } | { shown: false; reason: string }

/** Whether a starting action can work with the tool groups the backend reports.
 *  `toolsets` is null while unknown (not loaded yet, or the lookup failed), and
 *  an unknown list never hides anything. */
export function starterAvailability(
  action: StarterAction,
  toolsets: readonly ToolsetInfo[] | null
): StarterAvailability {
  const needs = action.needs

  if (!needs || toolsets === null) {
    return { shown: true }
  }

  const toolset = toolsets.find(t => t.name === needs.toolset)

  if (!toolset) {
    return { shown: false, reason: `${needs.what} is not available in this setup.` }
  }

  if (!toolset.enabled) {
    return { shown: false, reason: `${needs.what} is off.` }
  }

  if (needs.configured && !toolset.configured) {
    return { shown: false, reason: `${needs.what} is not set up yet.` }
  }

  return { shown: true }
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

/** The backend's tool groups, or null while unknown. Fetched directly, not
 *  through the query cache, so Home works on surfaces that have no cache. Any
 *  failure leaves it null, which shows every action. */
function useToolsets(ready: boolean): ToolsetInfo[] | null {
  const [toolsets, setToolsets] = useState<ToolsetInfo[] | null>(null)

  useEffect(() => {
    if (!ready) {
      return
    }

    let cancelled = false

    // getToolsets reads window.hermesDesktop and throws synchronously without
    // it, so start from a resolved promise to turn that into a rejection too.
    void Promise.resolve()
      .then(() => getToolsets())
      .then(list => {
        if (!cancelled) {
          setToolsets(Array.isArray(list) ? list : null)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setToolsets(null)
        }
      })

    return () => {
      cancelled = true
    }
  }, [ready])

  return toolsets
}

function HomeView({ navigate }: { navigate?: OpenSessionNavigate }) {
  const sessions = useStore($sessions)
  const projects = useStore($projects)
  const connection = useStore($gatewayState)
  const model = useStore($currentModel)

  const scope = useStore($projectScope)
  const owners = useStore($projectOwnerBySessionId)
  const projectTree = useStore($projectTree)

  // Inside a project, Home is about that project: its conversations, and "Continue" reopens its latest.
  // An unknown scope (the project list is not loaded yet) falls back to everything.
  const scopedProject = useMemo(
    () => (scope === ALL_PROJECTS ? null : (projectTree.find(project => project.id === scope) ?? null)),
    [projectTree, scope]
  )

  const recent = useMemo(
    () => recentSessions(scopedProject ? sessions.filter(s => owners.get(s.id) === scopedProject.id) : sessions),
    [owners, scopedProject, sessions]
  )

  const recentProjects = useMemo(() => projects.filter(p => !p.archived).slice(0, RECENT_LIMIT), [projects])
  const status = setupStatus(connection, model)
  const latest = recent[0]
  const toolsets = useToolsets(connection === 'open')

  const availability = useMemo(
    () => STARTER_ACTIONS.map(action => ({ action, availability: starterAvailability(action, toolsets) })),
    [toolsets]
  )

  const visibleActions = availability.filter(item => item.availability.shown).map(item => item.action)

  const hiddenNotes = availability.flatMap(item =>
    item.availability.shown ? [] : [`${item.action.label} isn't shown: ${item.availability.reason}`]
  )

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
      <div className="relative w-full min-w-0 max-w-2xl">
        <div aria-hidden className="home-glow pointer-events-none absolute inset-x-0 -top-24 h-72" />

        <p
          className="relative mx-auto mb-5 flex w-fit items-center gap-2 rounded-full px-3 py-1 text-[0.68rem] font-medium tracking-[0.14em] text-muted-foreground uppercase home-pill"
          data-slot="home_pill"
        >
          <span aria-hidden className="size-1.5 rounded-full bg-midground" />
          AI workspace
        </p>

        <Wordmark className="relative mb-5 dark:text-midground" text="SIMMUSE" />

        <h2 className="relative m-0 text-xl font-medium tracking-tight text-foreground">What would you like to work on?</h2>
        <p className="mt-1 mb-2 text-muted-foreground">Pick a starting point, or just type below.</p>

        {scopedProject && (
          <p className="mt-0 mb-2 text-xs text-muted-foreground" data-slot="home_project">
            Working in <strong className="font-medium text-foreground">{scopedProject.label}</strong>
          </p>
        )}

        <p className="mb-5 flex items-center justify-center gap-2 text-xs text-muted-foreground" data-slot="home_status">
          <span aria-hidden className={cn('size-2 rounded-full', TONE_DOT[status.tone])} />
          <span>{status.text}</span>
        </p>

        <WorkspaceFolderCard className="relative mb-4" />

        <ul className="m-0 grid list-none grid-cols-1 gap-2 p-0 sm:grid-cols-2">
          {visibleActions.map(action => (
            <li key={action.id}>
              <Button
                className="h-auto w-full justify-start gap-3 px-3 py-2.5 text-left"
                data-starter={action.id}
                onClick={() => start(action)}
                type="button"
                variant="outline"
              >
                <action.icon aria-hidden className="size-4 text-midground" />
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

        {hiddenNotes.length > 0 && (
          <p className="mt-3 mb-0 text-xs text-muted-foreground" data-slot="home_hidden">
            {hiddenNotes.join(' ')}
          </p>
        )}

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
