import type { Translations } from './types'

export const enPermissions: Translations['permissions'] = {
  title: 'What Simmuse can do on this PC',
  description: 'You decide how much Simmuse may do on its own. You can change any of this later.',
  commandsTitle: 'Running commands',
  commandsDescription:
    'Commands can create, change or delete files on this PC. Simmuse can ask you first every time, or only when a command looks risky.',
  commandsAsk: 'Ask every time',
  commandsRisky: 'Ask when risky',
  commandsOffWarning:
    'Approvals are switched off, so Simmuse runs commands without asking. Choose an option above to turn them back on.',
  screenTitle: 'Controlling the whole screen',
  screenDescription: 'Lets Simmuse see your screen and click and type in any app. It stays off unless you turn it on.',
  savedTitle: 'Saved',
  savedMessage: 'This applies to new conversations.',
  failedSave: 'Could not save this setting'
}
