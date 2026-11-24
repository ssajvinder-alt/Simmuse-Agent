import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { I18nProvider } from '@/i18n'
import { loadProjectInstructions, saveProjectInstructions } from '@/lib/project-instructions'
import { notify, notifyError } from '@/store/notifications'
import { $projectInstructionsDialog, openProjectInstructions } from '@/store/project-instructions-dialog'

import { ProjectInstructionsDialog } from './project-instructions-dialog'

vi.mock('@/lib/project-instructions', () => ({
  loadProjectInstructions: vi.fn(),
  saveProjectInstructions: vi.fn()
}))

vi.mock('@/store/notifications', () => ({ notify: vi.fn(), notifyError: vi.fn() }))

const ok = (over: Record<string, unknown> = {}) => ({
  exists: true,
  file: 'AGENTS.md',
  instructions: 'Be brief.',
  status: 'ok' as const,
  text: '',
  ...over
})

const mount = () =>
  render(
    <I18nProvider configClient={null} initialLocale="en">
      <ProjectInstructionsDialog />
    </I18nProvider>
  )

const open = () => openProjectInstructions({ folder: '/home/ada/thesis', name: 'Thesis' })

beforeEach(() => {
  $projectInstructionsDialog.set(null)
  vi.mocked(loadProjectInstructions).mockReset()
  vi.mocked(saveProjectInstructions).mockReset()
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

it('shows nothing until a project asks for its instructions', () => {
  mount()

  expect(screen.queryByRole('dialog')).toBeNull()
  expect(loadProjectInstructions).not.toHaveBeenCalled()
})

it('loads the instructions already in the project folder', async () => {
  vi.mocked(loadProjectInstructions).mockResolvedValue(ok())
  mount()
  open()

  const box = (await screen.findByRole('textbox')) as HTMLTextAreaElement

  await waitFor(() => expect(box.value).toBe('Be brief.'))
  expect(loadProjectInstructions).toHaveBeenCalledWith('/home/ada/thesis')
  expect(screen.getByText('Saved in AGENTS.md in the project folder.')).toBeTruthy()
})

it('says a new file will be created when the folder has none', async () => {
  vi.mocked(loadProjectInstructions).mockResolvedValue(ok({ exists: false, file: '.hermes.md', instructions: '' }))
  mount()
  open()

  expect(await screen.findByText('Will be saved in a new .hermes.md in the project folder.')).toBeTruthy()
})

it('keeps Save off until the text changes, then saves into the file it loaded and closes', async () => {
  vi.mocked(loadProjectInstructions).mockResolvedValue(ok())
  vi.mocked(saveProjectInstructions).mockResolvedValue(true)
  mount()
  open()

  const box = (await screen.findByRole('textbox')) as HTMLTextAreaElement

  await waitFor(() => expect(box.value).toBe('Be brief.'))

  const save = screen.getByRole('button', { name: 'Save' }) as HTMLButtonElement

  expect(save.disabled).toBe(true)

  fireEvent.change(box, { target: { value: 'Be brief. Cite sources.' } })
  expect(save.disabled).toBe(false)

  fireEvent.click(save)

  await waitFor(() => expect(saveProjectInstructions).toHaveBeenCalledWith('/home/ada/thesis', 'AGENTS.md', 'Be brief. Cite sources.'))
  await waitFor(() => expect($projectInstructionsDialog.get()).toBeNull())
  expect(notify).toHaveBeenCalledWith(expect.objectContaining({ kind: 'success' }))
})

it('stays open and says so when saving fails', async () => {
  vi.mocked(loadProjectInstructions).mockResolvedValue(ok())
  vi.mocked(saveProjectInstructions).mockRejectedValue(new Error('disk full'))
  mount()
  open()

  const box = (await screen.findByRole('textbox')) as HTMLTextAreaElement

  await waitFor(() => expect(box.value).toBe('Be brief.'))
  fireEvent.change(box, { target: { value: 'Different.' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))

  await waitFor(() => expect(notifyError).toHaveBeenCalled())
  expect($projectInstructionsDialog.get()).not.toBeNull()
})

it('explains why it will not edit a file it cannot read completely, and offers no text box', async () => {
  vi.mocked(loadProjectInstructions).mockResolvedValue({ file: 'AGENTS.md', reason: 'too-large', status: 'unsafe' })
  mount()
  open()

  expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'AGENTS.md is too large to edit here, so Simmuse will not change it.')
  expect(screen.queryByRole('textbox')).toBeNull()
  expect((screen.getByRole('button', { name: 'Save' }) as HTMLButtonElement).disabled).toBe(true)
})

it('says instructions need a project on this computer when the backend is remote', async () => {
  vi.mocked(loadProjectInstructions).mockResolvedValue({ status: 'remote' })
  mount()
  open()

  expect((await screen.findByRole('alert')).textContent).toContain('on this computer')
})

it('shows a read failure instead of an empty box', async () => {
  vi.mocked(loadProjectInstructions).mockRejectedValue(new Error('permission denied'))
  mount()
  open()

  expect((await screen.findByRole('alert')).textContent).toBe('permission denied')
})

it('closes without saving on Cancel', async () => {
  vi.mocked(loadProjectInstructions).mockResolvedValue(ok())
  mount()
  open()

  await screen.findByRole('textbox')
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

  expect($projectInstructionsDialog.get()).toBeNull()
  expect(saveProjectInstructions).not.toHaveBeenCalled()
})
