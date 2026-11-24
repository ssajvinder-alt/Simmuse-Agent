import { useState } from 'react'

import { hermesConfigCacheWriter, useHermesConfigRecord } from '@/app/hooks/use-config-record'
import { Button } from '@/components/ui/button'
import { saveHermesConfigRecord } from '@/hermes'
import { useI18n } from '@/i18n'
import { readKey, writeKey } from '@/lib/storage'
import { cn } from '@/lib/utils'
import { notify, notifyError } from '@/store/notifications'

import { WIDGET_SHELL_CLASS } from './widget-shell'

/** `terminal.cwd` values that mean "no folder chosen": the gateway resolves them to the home directory. */
const PLACEHOLDER_FOLDERS = new Set(['', '.', 'auto', 'cwd'])

const DISMISSED_KEY = 'simmuse.workspaceFolderCard.dismissed.v1'

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}

/** True when the person has not picked a workspace folder yet. */
export function usesPlaceholderFolder(config: Record<string, unknown> | undefined): boolean {
  return PLACEHOLDER_FOLDERS.has(String(record(config?.terminal).cwd ?? '').trim())
}

/**
 * Offers the one first-launch choice the app cannot make for itself: where new conversations start and where
 * the files Simmuse creates are saved. It writes `terminal.cwd`, the field Settings → Workspace already owns,
 * so there is one answer in two places. It shows on Home until a folder is chosen or the person says
 * "Not now"; it never picks a folder or creates one on its own.
 */
export function WorkspaceFolderCard({ className }: { className?: string }) {
  const { t } = useI18n()
  const copy = t.workspaceFolder
  const { data: config, writeScope } = useHermesConfigRecord()
  const setConfig = hermesConfigCacheWriter()
  const [dismissed, setDismissed] = useState(() => readKey(DISMISSED_KEY) === '1')
  const [busy, setBusy] = useState(false)
  // The native folder dialog exists in the desktop app only.
  const selectPaths = window.hermesDesktop?.selectPaths

  if (!config || !selectPaths || dismissed || !usesPlaceholderFolder(config)) {
    return null
  }

  const choose = async () => {
    setBusy(true)

    try {
      const [picked] = await selectPaths({ directories: true, title: copy.dialogTitle })

      if (!picked) {
        return
      }

      setConfig({ ...config, terminal: { ...record(config.terminal), cwd: picked } })

      try {
        await saveHermesConfigRecord({ terminal: { cwd: picked } }, writeScope)
        notify({ kind: 'success', title: copy.savedTitle, message: copy.savedMessage(picked) })
      } catch (err) {
        setConfig(config)
        notifyError(err, copy.failedSave)
      }
    } finally {
      setBusy(false)
    }
  }

  const dismiss = () => {
    writeKey(DISMISSED_KEY, '1')
    setDismissed(true)
  }

  return (
    <div className={cn(WIDGET_SHELL_CLASS, 'text-left', className)} data-slot="workspace_folder_card">
      <h3 className="m-0 text-sm font-medium text-foreground">{copy.title}</h3>
      <p className="mt-1 mb-3 text-xs text-muted-foreground">{copy.text}</p>
      <div className="flex flex-wrap items-center gap-2">
        <Button disabled={busy} onClick={() => void choose()} size="sm" type="button">
          {copy.choose}
        </Button>
        <Button disabled={busy} onClick={dismiss} size="sm" type="button" variant="text">
          {copy.notNow}
        </Button>
      </div>
    </div>
  )
}
