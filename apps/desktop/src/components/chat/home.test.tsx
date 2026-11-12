import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { getToolsets } from '@/api/toolsets'
import { requestComposerSetDraft } from '@/app/chat/composer/focus'
import { openSession } from '@/app/open-session'
import { $projectScope, ALL_PROJECTS } from '@/store/project-scope'
import type * as ProjectsStore from '@/store/projects'
import { $projects, $projectTree, enterProject } from '@/store/projects'
import { $currentModel, $gatewayState, $sessions } from '@/store/session'
import type { ProjectInfo, SessionInfo, ToolsetInfo } from '@/types/hermes'

import { Home, recentSessions, setupStatus, STARTER_ACTIONS, starterAvailability } from './home'

vi.mock('@/app/chat/composer/focus', () => ({
  requestComposerSetDraft: vi.fn(() => Promise.resolve(true))
}))

vi.mock('@/app/open-session', () => ({ openSession: vi.fn() }))

vi.mock('@/api/toolsets', () => ({ getToolsets: vi.fn() }))
// The folder card has its own tests and needs the config query; Home's tests are about starters and recents.
vi.mock('./workspace-folder-card', () => ({ WorkspaceFolderCard: () => null }))

vi.mock('@/store/projects', async importOriginal => ({
  ...(await importOriginal<typeof ProjectsStore>()),
  enterProject: vi.fn()
}))

const NOW_S = Math.floor(Date.now() / 1000)

const session = (id: string, over: Partial<SessionInfo> = {}) =>
  ({
    id,
    title: `Session ${id}`,
    archived: false,
    message_count: 4,
    last_active: NOW_S - 60,
    started_at: NOW_S - 600,
    ...over
  }) as SessionInfo

const project = (id: string, name: string, archived = false) => ({ id, name, archived }) as ProjectInfo

const toolset = (name: string, over: Partial<ToolsetInfo> = {}): ToolsetInfo => ({
  configured: true,
  description: '',
  enabled: true,
  label: name,
  name,
  tools: [],
  ...over
})

const action = (id: string) => STARTER_ACTIONS.find(a => a.id === id)!

beforeEach(() => {
  vi.mocked(getToolsets).mockReset()
  $sessions.set([])
  $projects.set([])
  $projectTree.set([])
  $projectScope.set(ALL_PROJECTS)
  $gatewayState.set('open')
  $currentModel.set('Mock Model')
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

it('asks what the person would like to work on', () => {
  render(<Home />)

  expect(screen.getByRole('heading', { name: 'What would you like to work on?' })).toBeTruthy()
})

it('offers the five starting actions from the launch brief', () => {
  render(<Home />)

  for (const label of [
    'Research a topic',
    'Summarize a document',
    'Draft a report',
    'Plan a project',
    'Continue previous work'
  ]) {
    expect(screen.getByRole('button', { name: new RegExp(label) })).toBeTruthy()
  }

  expect(STARTER_ACTIONS).toHaveLength(5)
})

it('fills the active message box with the chosen starter and sends nothing', () => {
  render(<Home />)

  fireEvent.click(screen.getByRole('button', { name: /Plan a project/ }))

  const plan = STARTER_ACTIONS.find(action => action.id === 'plan')!

  expect(requestComposerSetDraft).toHaveBeenCalledTimes(1)
  expect(requestComposerSetDraft).toHaveBeenCalledWith([], plan.prompt, { active: true })
})

it('does not show the old product name', () => {
  const { container } = render(<Home />)

  expect(container.textContent).not.toMatch(/hermes/i)
})

it('says in plain words whether Simmuse is ready', () => {
  expect(setupStatus('open', 'Mock Model')).toEqual({ tone: 'ok', text: 'Ready · Model: Mock Model' })
  expect(setupStatus('open', '  ').tone).toBe('pending')
  expect(setupStatus('connecting', 'x').text).toBe('Starting up…')
  expect(setupStatus('idle', 'x').tone).toBe('pending')
  expect(setupStatus('error', 'x').tone).toBe('problem')
  expect(setupStatus('closed', '').tone).toBe('problem')
})

it('shows the setup status on the screen', () => {
  const { container } = render(<Home />)

  expect(container.querySelector('[data-slot="home_status"]')?.textContent).toBe('Ready · Model: Mock Model')
})

it('lists the newest real conversations first and skips empty, archived and internal ones', () => {
  const ordered = recentSessions([
    session('old', { last_active: NOW_S - 9000 }),
    session('new', { last_active: NOW_S - 10 }),
    session('empty', { message_count: 0 }),
    session('gone', { archived: true }),
    session('child', { is_internal_child: true }),
    session('mid', { last_active: NOW_S - 500 }),
    session('older', { last_active: NOW_S - 99_000 })
  ])

  expect(ordered.map(s => s.id)).toEqual(['new', 'mid', 'old'])
})

it('shows no recent section when there is nothing to go back to', () => {
  const { container } = render(<Home />)

  expect(container.querySelector('[data-slot="home_recent"]')).toBeNull()
})

it('opens a recent conversation when it is clicked', () => {
  $sessions.set([session('a', { title: 'Quarterly plan' })])

  const { container } = render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>
  )

  fireEvent.click(container.querySelector('[data-recent-session="a"]')!)

  expect(openSession).toHaveBeenCalledTimes(1)
  expect(vi.mocked(openSession).mock.calls[0][0]).toBe('a')
})

it('sends "Continue previous work" to the latest conversation when there is one', () => {
  $sessions.set([session('a', { title: 'Quarterly plan' })])

  render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>
  )

  fireEvent.click(screen.getByRole('button', { name: /Continue previous work/ }))

  expect(openSession).toHaveBeenCalledTimes(1)
  expect(vi.mocked(openSession).mock.calls[0][0]).toBe('a')
  expect(requestComposerSetDraft).not.toHaveBeenCalled()
})

it('falls back to a starter prompt for "Continue previous work" when there is no history', () => {
  render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>
  )

  fireEvent.click(screen.getByRole('button', { name: /Continue previous work/ }))

  expect(openSession).not.toHaveBeenCalled()
  expect(requestComposerSetDraft).toHaveBeenCalledTimes(1)
})

it('lists projects that are not archived and enters one when clicked', () => {
  $projects.set([project('p_1', 'Thesis'), project('p_2', 'Old stuff', true)])

  const { container } = render(<Home />)

  expect(screen.getByText('Thesis')).toBeTruthy()
  expect(screen.queryByText('Old stuff')).toBeNull()

  fireEvent.click(container.querySelector('[data-recent-project="p_1"]')!)

  expect(enterProject).toHaveBeenCalledWith('p_1')
})

it('still renders without a router, with recent conversations shown but not clickable', () => {
  $sessions.set([session('a', { title: 'Quarterly plan' })])

  const { container } = render(<Home />)

  const row = container.querySelector('[data-recent-session="a"]') as HTMLButtonElement

  expect(row).toBeTruthy()
  expect(row.disabled).toBe(true)
})

it('treats an unknown tool list as "everything works", so nothing is hidden', () => {
  for (const a of STARTER_ACTIONS) {
    expect(starterAvailability(a, null)).toEqual({ shown: true })
  }
})

it('hides research when web access is off, not set up, or missing', () => {
  expect(starterAvailability(action('research'), [toolset('web', { enabled: false })])).toEqual({
    shown: false,
    reason: 'web access is off.'
  })

  expect(starterAvailability(action('research'), [toolset('web', { configured: false })])).toEqual({
    shown: false,
    reason: 'web access is not set up yet.'
  })

  expect(starterAvailability(action('research'), [toolset('file')])).toEqual({
    shown: false,
    reason: 'web access is not available in this setup.'
  })

  expect(starterAvailability(action('research'), [toolset('web')])).toEqual({ shown: true })
})

it('needs file access switched on for summarizing, but not "set up"', () => {
  expect(starterAvailability(action('summarize'), [toolset('file', { enabled: false })]).shown).toBe(false)
  expect(starterAvailability(action('summarize'), [toolset('file', { configured: false })]).shown).toBe(true)
})

it('never hides the actions that need no tools', () => {
  for (const id of ['draft', 'plan', 'continue']) {
    expect(starterAvailability(action(id), [])).toEqual({ shown: true })
  }
})

it('hides the research card and says why when web access is off', async () => {
  vi.mocked(getToolsets).mockResolvedValue([toolset('web', { enabled: false }), toolset('file')])

  const { container } = render(<Home />)

  await waitFor(() => expect(screen.queryByRole('button', { name: /Research a topic/ })).toBeNull())

  expect(container.querySelector('[data-slot="home_hidden"]')?.textContent).toBe(
    "Research a topic isn't shown: web access is off."
  )

  expect(screen.getByRole('button', { name: /Summarize a document/ })).toBeTruthy()
  expect(screen.getByRole('button', { name: /Draft a report/ })).toBeTruthy()
})

it('explains each hidden card on its own', async () => {
  vi.mocked(getToolsets).mockResolvedValue([toolset('web', { configured: false }), toolset('file', { enabled: false })])

  const { container } = render(<Home />)

  await waitFor(() => expect(screen.queryByRole('button', { name: /Summarize a document/ })).toBeNull())

  expect(container.querySelector('[data-slot="home_hidden"]')?.textContent).toBe(
    "Research a topic isn't shown: web access is not set up yet. Summarize a document isn't shown: file access is off."
  )
})

it('keeps every card when the tool list cannot be loaded', async () => {
  vi.mocked(getToolsets).mockRejectedValue(new Error('backend unreachable'))

  const { container } = render(<Home />)

  await waitFor(() => expect(getToolsets).toHaveBeenCalled())

  expect(screen.getAllByRole('button').filter(b => b.hasAttribute('data-starter'))).toHaveLength(5)
  expect(container.querySelector('[data-slot="home_hidden"]')).toBeNull()
})

it('keeps every card when the desktop bridge is missing and getToolsets throws', async () => {
  vi.mocked(getToolsets).mockImplementation(() => {
    throw new TypeError("Cannot read properties of undefined (reading 'api')")
  })

  const { container } = render(<Home />)

  await waitFor(() => expect(getToolsets).toHaveBeenCalled())

  expect(screen.getAllByRole('button').filter(b => b.hasAttribute('data-starter'))).toHaveLength(5)
  expect(container.querySelector('[data-slot="home_hidden"]')).toBeNull()
})

it('does not ask for the tool list before the backend is connected', () => {
  $gatewayState.set('connecting')

  render(<Home />)

  expect(getToolsets).not.toHaveBeenCalled()
  expect(screen.getAllByRole('button').filter(b => b.hasAttribute('data-starter'))).toHaveLength(5)
})

// ── The three workflows from the launch brief ──

it('research asks for a sourced report that keeps facts apart from suggestions, saves it, and does not guess without the web', () => {
  const { prompt } = action('research')

  expect(prompt).toContain('grounded-citations')
  expect(prompt).toContain('numbered source link')

  for (const section of ['Summary', 'Key findings', 'Where the sources disagree', 'My suggestions', 'Sources']) {
    expect(prompt).toContain(section)
  }

  expect(prompt).toContain('not facts')
  expect(prompt).toContain('Markdown file')
  expect(prompt).toContain('full path')
  expect(prompt).toContain('If you cannot reach the web, say so instead of guessing')
  expect(prompt.endsWith('Topic: ')).toBe(true)
})

it('drafting asks about purpose, reader, tone and length, shows a preview, revises, and saves', () => {
  const { prompt } = action('draft')

  for (const asked of ['what it is for', 'who will read it', 'tone', 'length']) {
    expect(prompt).toContain(asked)
  }

  expect(prompt).toContain('preview pane')
  expect(prompt).toContain('revise')
  expect(prompt).toContain('Markdown file')
  expect(prompt).toContain('full path')
})

it('drafting only offers Word or PDF when the file is known to open correctly', () => {
  expect(action('draft').prompt).toContain('Offer Word or PDF only if you can make a file that opens correctly')
})

it('continuing reads the project and recent work, reports briefly, and changes nothing until told to', () => {
  const { prompt } = action('continue')

  expect(prompt).toContain('project instructions')
  expect(prompt).toContain('recent conversations')
  expect(prompt).toContain('where I left off')
  expect(prompt).toContain('one next step')
  expect(prompt).toContain('Do not change anything until I say yes')
})

it('summarizing says which files were used and what could not be read', () => {
  expect(action('summarize').prompt).toContain('Say which files you used')
  expect(action('summarize').prompt).toContain('if you cannot read one')
})

it('puts no old product name in any starter prompt', () => {
  for (const a of STARTER_ACTIONS) {
    expect(`${a.label} ${a.hint} ${a.prompt}`).not.toMatch(/hermes/i)
  }
})

// ── Home inside a project ──

const tree = (id: string, label: string, sessionIds: string[]) =>
  ({ id, label, path: `/p/${label}`, repos: [], sessionIds }) as never

const MINE = session('mine', { title: 'Thesis chapter 2', last_active: NOW_S - 100 })
const OTHER = session('other', { title: 'Holiday plans', last_active: NOW_S - 5 })

it('says which project you are working in', () => {
  $projectTree.set([tree('p_1', 'Thesis', ['mine'])])
  $projectScope.set('p_1')

  const { container } = render(<Home />)

  expect(container.querySelector('[data-slot="home_project"]')?.textContent).toBe('Working in Thesis')
})

it('shows only the project’s own conversations inside a project', () => {
  $projectTree.set([tree('p_1', 'Thesis', ['mine']), tree('p_2', 'Holiday', ['other'])])
  $projectScope.set('p_1')
  $sessions.set([MINE, OTHER])

  const { container } = render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>
  )

  expect(container.querySelector('[data-recent-session="mine"]')).toBeTruthy()
  expect(container.querySelector('[data-recent-session="other"]')).toBeNull()
})

it('"Continue previous work" reopens the latest conversation in the project, not the newest overall', () => {
  $projectTree.set([tree('p_1', 'Thesis', ['mine']), tree('p_2', 'Holiday', ['other'])])
  $projectScope.set('p_1')
  $sessions.set([MINE, OTHER]) // OTHER is newer overall

  render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>
  )

  fireEvent.click(screen.getByRole('button', { name: /Continue previous work/ }))

  expect(vi.mocked(openSession).mock.calls[0][0]).toBe('mine')
})

it('a project with no conversations yet falls back to the "continue" prompt, not another project’s chat', () => {
  $projectTree.set([tree('p_1', 'Thesis', []), tree('p_2', 'Holiday', ['other'])])
  $projectScope.set('p_1')
  $sessions.set([OTHER])

  render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>
  )

  fireEvent.click(screen.getByRole('button', { name: /Continue previous work/ }))

  expect(openSession).not.toHaveBeenCalled()
  expect(requestComposerSetDraft).toHaveBeenCalledTimes(1)
})

it('shows everything, and no project line, when the project list does not know the scope yet', () => {
  $projectTree.set([])
  $projectScope.set('p_missing')
  $sessions.set([MINE, OTHER])

  const { container } = render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>
  )

  expect(container.querySelector('[data-slot="home_project"]')).toBeNull()
  expect(container.querySelector('[data-recent-session="other"]')).toBeTruthy()
})
