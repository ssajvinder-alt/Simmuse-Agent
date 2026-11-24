import type { Translations } from './types'

export const enWorkspaceFolder: Translations['workspaceFolder'] = {
  title: 'Where should Simmuse keep your work?',
  text: 'New conversations start in this folder, and files Simmuse creates for you are saved here. Right now it uses your home folder.',
  choose: 'Choose a folder…',
  notNow: 'Not now',
  dialogTitle: 'Choose your Simmuse folder',
  savedTitle: 'Folder saved',
  savedMessage: path => `Simmuse will keep your work in ${path}. This applies to new conversations.`,
  failedSave: 'Could not save the folder'
}
