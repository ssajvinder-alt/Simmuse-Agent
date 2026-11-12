// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { usesPlaceholderFolder, WorkspaceFolderCard } from './workspace-folder-card'

const mocks = vi.hoisted(() => ({
  cache: vi.fn(),
  loadedConfig: {} as Record<string, unknown>,
  notify: vi.fn(),
  notifyError: vi.fn(),
  save: vi.fn(),
  select: vi.fn()
}))

vi.mock('@/hermes', () => ({
  saveHermesConfigRecord: (patch: Record<string, unknown>, scope?: unknown) => mocks.save(patch, scope)
}))

vi.mock('@/i18n', () => ({
  useI18n: () => ({
    t: {
      workspaceFolder: {
        title: 'Where should Simmuse keep your work?',
        text: 'Right now it uses your home folder.',
        choose: 'Choose a folder…',
        notNow: 'Not now',
        dialogTitle: 'Choose your Simmuse folder',
        savedTitle: 'Folder saved',
        savedMessage: (path: string) => `Kept in ${path}`,
        failedSave: 'Could not save the folder'
      }
    }
  })
}))

vi.mock('@/store/notifications', () => ({
  notify: (...args: unknown[]) => mocks.notify(...args),
  notifyError: (...args: unknown[]) => mocks.notifyError(...args)
}))

vi.mock('@/app/hooks/use-config-record', () => ({
  hermesConfigCacheWriter: () => (config: Record<string, unknown>) => mocks.cache(config),
  useHermesConfigRecord: () => ({ data: mocks.loadedConfig, writeScope: undefined })
}))

describe('usesPlaceholderFolder', () => {
  it('treats the placeholders, and nothing else, as no folder chosen', () => {
    for (const cwd of [undefined, '', '.', 'auto', 'cwd', '  .  ']) {
      expect(usesPlaceholderFolder({ terminal: { cwd } })).toBe(true)
    }

    expect(usesPlaceholderFolder({})).toBe(true)
    expect(usesPlaceholderFolder({ terminal: { cwd: 'D:\\Work' } })).toBe(false)
  })
})

describe('WorkspaceFolderCard', () => {
  beforeEach(() => {
    window.localStorage.clear()
    mocks.loadedConfig = { terminal: { cwd: '.' } }
    mocks.save.mockReset().mockResolvedValue(undefined)
    mocks.cache.mockReset()
    mocks.notify.mockReset()
    mocks.notifyError.mockReset()
    mocks.select.mockReset().mockResolvedValue(['D:\\Work\\Simmuse'])
    Object.defineProperty(window, 'hermesDesktop', { configurable: true, value: { selectPaths: mocks.select } })
  })

  afterEach(() => {
    cleanup()
    Reflect.deleteProperty(window, 'hermesDesktop')
  })

  it('offers the choice while no folder is set', () => {
    render(<WorkspaceFolderCard />)

    expect(screen.getByText('Where should Simmuse keep your work?')).toBeTruthy()
  })

  it('saves the chosen folder as terminal.cwd with a sparse patch', async () => {
    render(<WorkspaceFolderCard />)

    await act(async () => {
      fireEvent.click(screen.getByText('Choose a folder…'))
    })

    expect(mocks.select).toHaveBeenCalledWith({ directories: true, title: 'Choose your Simmuse folder' })
    expect(mocks.save).toHaveBeenCalledWith({ terminal: { cwd: 'D:\\Work\\Simmuse' } }, undefined)
    expect(mocks.notify).toHaveBeenCalledWith(expect.objectContaining({ title: 'Folder saved' }))
  })

  it('changes nothing when the dialog is cancelled', async () => {
    mocks.select.mockResolvedValue([])
    render(<WorkspaceFolderCard />)

    await act(async () => {
      fireEvent.click(screen.getByText('Choose a folder…'))
    })

    expect(mocks.save).not.toHaveBeenCalled()
    expect(screen.getByText('Where should Simmuse keep your work?')).toBeTruthy()
  })

  it('rolls the cache back and says so when the save fails', async () => {
    mocks.save.mockRejectedValue(new Error('offline'))
    render(<WorkspaceFolderCard />)

    await act(async () => {
      fireEvent.click(screen.getByText('Choose a folder…'))
    })

    expect(mocks.cache).toHaveBeenLastCalledWith(mocks.loadedConfig)
    expect(mocks.notifyError).toHaveBeenCalledWith(expect.any(Error), 'Could not save the folder')
  })

  it('stays away once dismissed, across a remount', () => {
    const first = render(<WorkspaceFolderCard />)

    fireEvent.click(screen.getByText('Not now'))
    expect(screen.queryByText('Where should Simmuse keep your work?')).toBeNull()

    first.unmount()
    render(<WorkspaceFolderCard />)
    expect(screen.queryByText('Where should Simmuse keep your work?')).toBeNull()
  })

  it('shows nothing once a folder is set, or where there is no native dialog', () => {
    mocks.loadedConfig = { terminal: { cwd: 'D:\\Work' } }
    render(<WorkspaceFolderCard />)
    expect(screen.queryByText('Where should Simmuse keep your work?')).toBeNull()

    cleanup()
    mocks.loadedConfig = { terminal: { cwd: '.' } }
    Reflect.deleteProperty(window, 'hermesDesktop')
    render(<WorkspaceFolderCard />)
    expect(screen.queryByText('Where should Simmuse keep your work?')).toBeNull()
  })
})
