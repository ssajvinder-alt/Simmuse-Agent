import type { Translations } from './types'

export const esWorkspaceFolder: Translations['workspaceFolder'] = {
  title: '¿Dónde debe guardar Simmuse tu trabajo?',
  text: 'Las conversaciones nuevas empiezan en esta carpeta y los archivos que Simmuse crea para ti se guardan aquí. Ahora mismo usa tu carpeta personal.',
  choose: 'Elegir una carpeta…',
  notNow: 'Ahora no',
  dialogTitle: 'Elige tu carpeta de Simmuse',
  savedTitle: 'Carpeta guardada',
  savedMessage: path => `Simmuse guardará tu trabajo en ${path}. Se aplica a las conversaciones nuevas.`,
  failedSave: 'No se pudo guardar la carpeta'
}
