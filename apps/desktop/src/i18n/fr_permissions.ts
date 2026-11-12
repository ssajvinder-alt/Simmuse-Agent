import type { Translations } from './types'

export const frPermissions: Translations['permissions'] = {
  title: 'Ce que Simmuse peut faire sur ce PC',
  description: 'Vous décidez de ce que Simmuse peut faire seul. Vous pouvez tout modifier plus tard.',
  commandsTitle: 'Exécution de commandes',
  commandsDescription:
    'Les commandes peuvent créer, modifier ou supprimer des fichiers sur ce PC. Simmuse peut vous demander à chaque fois, ou seulement quand une commande semble risquée.',
  commandsAsk: 'Demander à chaque fois',
  commandsRisky: 'Demander si risqué',
  commandsOffWarning:
    'Les approbations sont désactivées : Simmuse exécute les commandes sans demander. Choisissez une option ci-dessus pour les réactiver.',
  screenTitle: 'Contrôle de tout l’écran',
  screenDescription:
    'Permet à Simmuse de voir votre écran, de cliquer et de saisir du texte dans n’importe quelle application. Désactivé tant que vous ne l’activez pas.',
  savedTitle: 'Enregistré',
  savedMessage: 'S’applique aux nouvelles conversations.',
  failedSave: 'Impossible d’enregistrer ce paramètre'
}
