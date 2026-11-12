import { useCallback, useState } from 'react'

import { SegmentedControl } from '@/components/ui/segmented-control'
import { type ProfileScope, saveHermesConfigRecord } from '@/hermes'
import { useI18n } from '@/i18n'
import { ShieldLock } from '@/lib/icons'
import { notify, notifyError } from '@/store/notifications'

import { hermesConfigCacheWriter, useHermesConfigRecord } from '../hooks/use-config-record'

import { ListRow, SettingsSection, ToggleRow } from './primitives'

type ApprovalMode = 'manual' | 'off' | 'smart'

/** The toolset that sees and drives the whole screen; `agent.disabled_toolsets` removes it for every surface. */
const SCREEN_CONTROL_TOOLSET = 'computer_use'

interface PermissionsPanelProps {
  /** Settings profile-scope override: read and write THIS profile's config.yaml. */
  profile?: ProfileScope
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}

/** `approvals.mode`: anything but `smart` or `off` is the safe `manual` the app falls back to. */
export function readApprovalMode(config: Record<string, unknown> | undefined): ApprovalMode {
  const mode = record(config?.approvals).mode

  return mode === 'smart' || mode === 'off' ? mode : 'manual'
}

/** `agent.disabled_toolsets` as a list of names, or null when it is stored in a shape this panel will not rewrite. */
export function readDisabledToolsets(config: Record<string, unknown> | undefined): null | string[] {
  const value = record(config?.agent).disabled_toolsets

  if (value === undefined) {
    return []
  }

  return Array.isArray(value) && value.every(item => typeof item === 'string') ? (value as string[]) : null
}

/**
 * Two plain-language controls over fields that already exist: how Simmuse asks before running a command
 * (`approvals.mode`) and whether it may see and drive the whole screen (`agent.disabled_toolsets`). It sits
 * above the technical rows of Settings → Safety → Approvals, which stay the full list.
 */
export function PermissionsPanel({ profile }: PermissionsPanelProps) {
  const { t } = useI18n()
  const copy = t.permissions
  const { data: config, writeScope } = useHermesConfigRecord(profile)
  const setConfig = hermesConfigCacheWriter(profile)
  const [busy, setBusy] = useState(false)

  const mode = readApprovalMode(config)
  const disabled = readDisabledToolsets(config)
  const screenOn = disabled !== null && !disabled.includes(SCREEN_CONTROL_TOOLSET)

  // One write path: patch the cache first, save a sparse patch (PUT /api/config deep-merges, so echoing the
  // snapshot could overwrite keys another surface changed), roll back visibly on failure.
  const save = useCallback(
    async (next: Record<string, unknown>, patch: Record<string, unknown>) => {
      if (!config) {
        return
      }

      setBusy(true)
      setConfig({ ...config, ...next })

      try {
        await saveHermesConfigRecord(patch, writeScope ?? profile)
        notify({ kind: 'info', title: copy.savedTitle, message: copy.savedMessage })
      } catch (err) {
        setConfig(config)
        notifyError(err, copy.failedSave)
      } finally {
        setBusy(false)
      }
    },
    [config, copy, profile, setConfig, writeScope]
  )

  const chooseApproval = (next: ApprovalMode) =>
    save({ approvals: { ...record(config?.approvals), mode: next } }, { approvals: { mode: next } })

  const toggleScreen = (on: boolean) => {
    if (disabled === null) {
      return
    }

    const list = on ? disabled.filter(name => name !== SCREEN_CONTROL_TOOLSET) : [...disabled, SCREEN_CONTROL_TOOLSET]

    void save({ agent: { ...record(config?.agent), disabled_toolsets: list } }, { agent: { disabled_toolsets: list } })
  }

  return (
    <SettingsSection icon={ShieldLock} title={copy.title}>
      <p className="mb-2 text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">
        {copy.description}
      </p>
      <ListRow
        action={
          <SegmentedControl
            disabled={busy || !config}
            onChange={id => void chooseApproval(id)}
            options={[
              { id: 'manual', label: copy.commandsAsk },
              { id: 'smart', label: copy.commandsRisky }
            ]}
            value={mode}
          />
        }
        below={
          mode === 'off' ? (
            <div className="mt-2 text-[length:var(--conversation-caption-font-size)] text-destructive">
              {copy.commandsOffWarning}
            </div>
          ) : undefined
        }
        description={copy.commandsDescription}
        id="permissions-commands"
        title={copy.commandsTitle}
      />
      <ToggleRow
        checked={screenOn}
        description={copy.screenDescription}
        disabled={busy || !config || disabled === null}
        id="permissions-screen"
        label={copy.screenTitle}
        onChange={toggleScreen}
      />
    </SettingsSection>
  )
}
