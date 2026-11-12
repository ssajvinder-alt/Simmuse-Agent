import type { Translations } from './types'

export const deWorkspaceFolder: Translations['workspaceFolder'] = {
  title: 'Wo soll Simmuse Ihre Arbeit speichern?',
  text: 'Neue Unterhaltungen beginnen in diesem Ordner, und Dateien, die Simmuse für Sie erstellt, werden hier gespeichert. Im Moment wird Ihr Benutzerordner verwendet.',
  choose: 'Ordner auswählen…',
  notNow: 'Jetzt nicht',
  dialogTitle: 'Simmuse-Ordner auswählen',
  savedTitle: 'Ordner gespeichert',
  savedMessage: path => `Simmuse speichert Ihre Arbeit in ${path}. Gilt für neue Unterhaltungen.`,
  failedSave: 'Der Ordner konnte nicht gespeichert werden'
}
