import type { Translations } from './types'

export const dePermissions: Translations['permissions'] = {
  title: 'Was Simmuse auf diesem PC tun darf',
  description: 'Sie entscheiden, wie viel Simmuse selbstständig tun darf. Alles lässt sich später ändern.',
  commandsTitle: 'Befehle ausführen',
  commandsDescription:
    'Befehle können Dateien auf diesem PC erstellen, ändern oder löschen. Simmuse kann jedes Mal nachfragen oder nur, wenn ein Befehl riskant aussieht.',
  commandsAsk: 'Jedes Mal fragen',
  commandsRisky: 'Bei Risiko fragen',
  commandsOffWarning:
    'Freigaben sind ausgeschaltet, Simmuse führt Befehle also ohne Nachfrage aus. Wählen Sie oben eine Option, um sie wieder einzuschalten.',
  screenTitle: 'Den ganzen Bildschirm steuern',
  screenDescription:
    'Erlaubt Simmuse, Ihren Bildschirm zu sehen und in jeder App zu klicken und zu tippen. Bleibt aus, bis Sie es einschalten.',
  savedTitle: 'Gespeichert',
  savedMessage: 'Gilt für neue Unterhaltungen.',
  failedSave: 'Diese Einstellung konnte nicht gespeichert werden'
}
