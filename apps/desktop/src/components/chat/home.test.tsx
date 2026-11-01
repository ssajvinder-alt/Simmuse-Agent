import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'

import { requestComposerSetDraft } from '@/app/chat/composer/focus'

import { Home, STARTER_ACTIONS } from './home'

vi.mock('@/app/chat/composer/focus', () => ({
  requestComposerSetDraft: vi.fn(() => Promise.resolve(true))
}))

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
