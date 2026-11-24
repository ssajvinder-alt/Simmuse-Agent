// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { PermissionsPanel, readApprovalMode, readDisabledToolsets } from './permissions-panel'

const mocks = vi.hoisted(() => ({
  cache: vi.fn(),
  loadedConfig: {} as Record<string, unknown>,
  notify: vi.fn(),
  notifyError: vi.fn(),
  save: vi.fn()
}))

vi.mock('@/hermes', () => ({
  saveHermesConfigRecord: (patch: Record<string, unknown>, profile?: unknown) => mocks.save(patch, profile)
}))

vi.mock('@/i18n', () => ({
  useI18n: () => ({
    t: {
      permissions: {
        title: 'What Simmuse can do on this PC',
        description: 'You decide.',
        commandsTitle: 'Running commands',
        commandsDescription: 'Commands can change files.',
        commandsAsk: 'Ask every time',
        commandsRisky: 'Ask when risky',
        commandsOffWarning: 'Approvals are switched off.',
        screenTitle: 'Controlling the whole screen',
        screenDescription: 'Off unless you turn it on.',
        savedTitle: 'Saved',
        savedMessage: 'Applies to new conversations.',
        failedSave: 'Could not save this setting'
      }
    }
  })
}))

vi.mock('@/store/notifications', () => ({
  notify: (...args: unknown[]) => mocks.notify(...args),
  notifyError: (...args: unknown[]) => mocks.notifyError(...args)
}))

vi.mock('../hooks/use-config-record', () => ({
  hermesConfigCacheWriter: () => (config: Record<string, unknown>) => mocks.cache(config),
  useHermesConfigRecord: () => ({ data: mocks.loadedConfig })
}))

const screenSwitch = () => screen.getByRole('switch', { name: 'Controlling the whole screen' })

describe('reading the two settings', () => {
  it('treats anything but smart or off as the safe manual mode', () => {
    expect(readApprovalMode(undefined)).toBe('manual')
    expect(readApprovalMode({ approvals: { mode: 'smart' } })).toBe('smart')
    expect(readApprovalMode({ approvals: { mode: 'off' } })).toBe('off')
    expect(readApprovalMode({ approvals: { mode: 'banana' } })).toBe('manual')
  })

  it('reads the disabled-toolset list, and refuses a shape it will not rewrite', () => {
    expect(readDisabledToolsets({})).toEqual([])
    expect(readDisabledToolsets({ agent: { disabled_toolsets: ['memory'] } })).toEqual(['memory'])
    expect(readDisabledToolsets({ agent: { disabled_toolsets: "['memory']" } })).toBeNull()
  })
})

describe('PermissionsPanel', () => {
  beforeEach(() => {
    mocks.loadedConfig = { approvals: { mode: 'manual' }, agent: { disabled_toolsets: ['computer_use'] } }
    mocks.save.mockReset().mockResolvedValue(undefined)
    mocks.cache.mockReset()
    mocks.notify.mockReset()
    mocks.notifyError.mockReset()
  })

  afterEach(cleanup)

  it('shows the shipped defaults: ask every time, and the screen off', () => {
    render(<PermissionsPanel />)

    expect(screenSwitch().getAttribute('aria-checked')).toBe('false')
    expect(screen.queryByText('Approvals are switched off.')).toBeNull()
  })

  it('saves a sparse approvals patch when the person picks how to be asked', async () => {
    render(<PermissionsPanel />)

    await act(async () => {
      fireEvent.click(screen.getByText('Ask when risky'))
    })

    expect(mocks.save).toHaveBeenCalledWith({ approvals: { mode: 'smart' } }, undefined)
    expect(mocks.notify).toHaveBeenCalledWith(expect.objectContaining({ title: 'Saved' }))
  })

  it('turns whole-screen control on and off without disturbing other disabled toolsets', async () => {
    mocks.loadedConfig = { agent: { disabled_toolsets: ['computer_use', 'memory'] } }
    render(<PermissionsPanel />)

    await act(async () => {
      fireEvent.click(screenSwitch())
    })
    expect(mocks.save).toHaveBeenLastCalledWith({ agent: { disabled_toolsets: ['memory'] } }, undefined)

    cleanup()
    mocks.loadedConfig = { agent: { disabled_toolsets: ['memory'] } }
    render(<PermissionsPanel />)

    await act(async () => {
      fireEvent.click(screenSwitch())
    })
    expect(mocks.save).toHaveBeenLastCalledWith({ agent: { disabled_toolsets: ['memory', 'computer_use'] } }, undefined)
  })

  it('warns when approvals are off, and leaves neither choice selected', () => {
    mocks.loadedConfig = { approvals: { mode: 'off' } }
    render(<PermissionsPanel />)

    expect(screen.getByText('Approvals are switched off.')).toBeTruthy()
  })

  it('rolls the cache back and reports a save that fails', async () => {
    mocks.save.mockRejectedValue(new Error('offline'))
    render(<PermissionsPanel />)

    await act(async () => {
      fireEvent.click(screen.getByText('Ask when risky'))
    })

    expect(mocks.cache).toHaveBeenLastCalledWith(mocks.loadedConfig)
    expect(mocks.notifyError).toHaveBeenCalledWith(expect.any(Error), 'Could not save this setting')
  })

  it('will not rewrite a disabled-toolset list stored in a shape it does not understand', () => {
    mocks.loadedConfig = { agent: { disabled_toolsets: "['computer_use']" } }
    render(<PermissionsPanel />)

    expect(screenSwitch().hasAttribute('disabled')).toBe(true)
  })
})
