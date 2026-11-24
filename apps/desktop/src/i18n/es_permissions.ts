import type { Translations } from './types'

export const esPermissions: Translations['permissions'] = {
  title: 'Lo que Simmuse puede hacer en este PC',
  description: 'Tú decides cuánto puede hacer Simmuse por su cuenta. Puedes cambiarlo todo más tarde.',
  commandsTitle: 'Ejecutar comandos',
  commandsDescription:
    'Los comandos pueden crear, cambiar o borrar archivos en este PC. Simmuse puede preguntarte cada vez, o solo cuando un comando parezca arriesgado.',
  commandsAsk: 'Preguntar siempre',
  commandsRisky: 'Preguntar si es arriesgado',
  commandsOffWarning:
    'Las aprobaciones están desactivadas, así que Simmuse ejecuta comandos sin preguntar. Elige una opción arriba para volver a activarlas.',
  screenTitle: 'Controlar toda la pantalla',
  screenDescription:
    'Permite que Simmuse vea tu pantalla y haga clic y escriba en cualquier aplicación. Sigue desactivado hasta que lo actives.',
  savedTitle: 'Guardado',
  savedMessage: 'Se aplica a las conversaciones nuevas.',
  failedSave: 'No se pudo guardar este ajuste'
}
