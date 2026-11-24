import type { Translations } from './types'

export const frWorkspaceFolder: Translations['workspaceFolder'] = {
  title: 'Où Simmuse doit-il ranger votre travail ?',
  text: 'Les nouvelles conversations démarrent dans ce dossier, et les fichiers que Simmuse crée pour vous y sont enregistrés. Pour l’instant, il utilise votre dossier personnel.',
  choose: 'Choisir un dossier…',
  notNow: 'Pas maintenant',
  dialogTitle: 'Choisissez votre dossier Simmuse',
  savedTitle: 'Dossier enregistré',
  savedMessage: path => `Simmuse rangera votre travail dans ${path}. S’applique aux nouvelles conversations.`,
  failedSave: 'Impossible d’enregistrer le dossier'
}
