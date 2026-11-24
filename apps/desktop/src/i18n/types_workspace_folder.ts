/** The Home card that offers to pick the folder Simmuse keeps new conversations and saved files in. */
export interface WorkspaceFolderTranslations {
  title: string
  text: string
  choose: string
  notNow: string
  dialogTitle: string
  savedTitle: string
  savedMessage: (path: string) => string
  failedSave: string
}
