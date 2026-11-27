import { useStore } from '@nanostores/react'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { useI18n } from '@/i18n'
import { type LoadedInstructions, loadProjectInstructions, saveProjectInstructions } from '@/lib/project-instructions'
import { notify, notifyError } from '@/store/notifications'
import { $projectInstructionsDialog, closeProjectInstructions } from '@/store/project-instructions-dialog'

// Plain-language guidance for Simmuse that applies to every conversation in a project's main folder.
// It is saved inside a marked block in the project folder's context file (see lib/project-instructions),
// the same file Simmuse already reads, so nothing else in that file is changed.

function problemText(loaded: LoadedInstructions): null | string {
  if (loaded.status === 'remote') {
    return 'Instructions can only be edited for projects that are on this computer.'
  }

  if (loaded.status === 'unsafe') {
    return `${loaded.file} is ${loaded.reason === 'binary' ? 'not a text file' : 'too large to edit here'}, so Simmuse will not change it.`
  }

  return null
}

export function ProjectInstructionsDialog() {
  const { t } = useI18n()
  const request = useStore($projectInstructionsDialog)
  const [loaded, setLoaded] = useState<LoadedInstructions | null>(null)
  const [value, setValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [failed, setFailed] = useState<null | string>(null)

  useEffect(() => {
    setLoaded(null)
    setFailed(null)
    setValue('')

    if (!request) {
      return
    }

    let cancelled = false

    loadProjectInstructions(request.folder)
      .then(result => {
        if (cancelled) {
          return
        }

        setLoaded(result)
        setValue(result.status === 'ok' ? result.instructions : '')
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setFailed(error instanceof Error ? error.message : 'The project folder could not be read.')
        }
      })

    return () => {
      cancelled = true
    }
  }, [request])

  if (!request) {
    return null
  }

  const ok = loaded?.status === 'ok' ? loaded : null
  const problem = failed ?? (loaded ? problemText(loaded) : null)
  const changed = ok ? value.trim() !== ok.instructions : false

  const save = async () => {
    if (!ok) {
      return
    }

    setSaving(true)

    try {
      await saveProjectInstructions(request.folder, ok.file, value)
      notify({ kind: 'success', message: 'Instructions saved' })
      closeProjectInstructions()
    } catch (error) {
      notifyError(error, 'Could not save the instructions')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog onOpenChange={open => !open && closeProjectInstructions()} open>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Instructions for {request.name}</DialogTitle>
          <DialogDescription>
            Tell Simmuse how to work in this project. These apply to every conversation in it.
          </DialogDescription>
        </DialogHeader>

        {problem ? (
          <p className="m-0 text-[0.8125rem] text-destructive" role="alert">
            {problem}
          </p>
        ) : (
          <div className="flex flex-col gap-1.5">
            <Textarea
              aria-label={`Instructions for ${request.name}`}
              className="min-h-40 text-[0.8125rem]"
              disabled={!ok || saving}
              onChange={event => setValue(event.target.value)}
              placeholder="For example: Write in plain English. Always give source links. Keep summaries under 200 words."
              value={value}
            />
            {ok && (
              <span className="text-[0.6875rem] text-(--ui-text-tertiary)" data-slot="instructions_file">
                {ok.exists
                  ? `Saved in ${ok.file} in the project folder.`
                  : `Will be saved in a new ${ok.file} in the project folder.`}
              </span>
            )}
          </div>
        )}

        <DialogFooter>
          <Button disabled={saving} onClick={closeProjectInstructions} type="button" variant="ghost">
            {t.common.cancel}
          </Button>
          <Button disabled={!ok || !changed || saving} onClick={() => void save()} type="button">
            {t.common.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
