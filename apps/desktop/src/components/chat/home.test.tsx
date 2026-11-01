import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { requestComposerSetDraft } from '@/app/chat/composer/focus'
import { openSession } from '@/app/open-session'
import type * as ProjectsStore from '@/store/projects'
import { $projects, enterProject } from '@/store/projects'
import { $currentModel, $gatewayState, $sessions } from '@/store/session'
import type { ProjectInfo, SessionInfo } from '@/types/hermes'

import { Home, recentSessions, setupStatus, STARTER_ACTIONS } from './home'

vi.mock('@/app/chat/composer/focus', () => ({
  requestComposerSetDraft: vi.fn(() => Promise.resolve(true))
}))

vi.mock('@/app/open-session', () => ({ openSession: vi.fn() }))

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

beforeEach(() => {
  $sessions.set([])
  $projects.set([])
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
