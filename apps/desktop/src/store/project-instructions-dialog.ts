import { atom } from 'nanostores'

/** Which project's instructions the dialog is showing: its main folder and its display name. */
export interface ProjectInstructionsRequest {
  folder: string
  name: string
}

// One dialog, mounted once in the sidebar, reads this atom, so a project's menu can open it without
// prop threading (same shape as $projectDialog).
export const $projectInstructionsDialog = atom<null | ProjectInstructionsRequest>(null)

export function openProjectInstructions(request: ProjectInstructionsRequest): void {
  $projectInstructionsDialog.set(request)
}

export function closeProjectInstructions(): void {
  $projectInstructionsDialog.set(null)
}
