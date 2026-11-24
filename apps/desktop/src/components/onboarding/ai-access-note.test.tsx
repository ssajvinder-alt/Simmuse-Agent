import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'

import { AI_ACCESS_NOTE, AiAccessNote } from './ai-access-note'

afterEach(cleanup)

it('tells people who charges for the AI and where their words and files go', () => {
  render(<AiAccessNote />)

  const note = screen.getByRole('list', { name: 'About AI costs and your data' })

  expect(note.textContent).toContain('Simmuse does not sell AI access')
  expect(note.textContent).toContain('charges you directly')
  expect(note.textContent).toContain('What you type, and any files you attach, are sent to that provider')
  expect(note.textContent).toContain('A model that runs on this computer sends nothing to a provider.')
})

it('keeps the key on this computer, and says so', () => {
  render(<AiAccessNote />)

  expect(screen.getByText(/Your key is stored on this computer/)).toBeTruthy()
})

it('is three short plain sentences, with no old product name', () => {
  expect(AI_ACCESS_NOTE).toHaveLength(3)
  expect(AI_ACCESS_NOTE.join(' ')).not.toMatch(/hermes|nous/i)
  expect(AI_ACCESS_NOTE.every(line => line.length <= 140)).toBe(true)
})
