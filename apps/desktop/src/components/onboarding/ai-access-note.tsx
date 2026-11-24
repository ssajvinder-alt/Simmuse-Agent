// What a person should know before connecting an AI provider: who charges for the AI, and where
// their words and files go. Kept short and in plain language. This states how Simmuse works today
// (people bring their own provider account); revisit it if Simmuse ever sells managed AI access.

export const AI_ACCESS_NOTE = [
  'Simmuse does not sell AI access. The provider you choose charges you directly, at its own prices.',
  'What you type, and any files you attach, are sent to that provider so it can answer. Your key is stored on this computer.',
  'A model that runs on this computer sends nothing to a provider.'
] as const

export function AiAccessNote() {
  return (
    <ul
      aria-label="About AI costs and your data"
      className="mt-2 mb-0 flex max-w-xl list-none flex-col gap-1 p-0 text-xs leading-5 text-(--ui-text-tertiary)"
      data-slot="onboarding_ai_note"
    >
      {AI_ACCESS_NOTE.map(line => (
        <li key={line}>{line}</li>
      ))}
    </ul>
  )
}
