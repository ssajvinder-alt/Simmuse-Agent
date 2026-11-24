// Simmuse ships in Simple mode, which rests panes, rows and readouts that inherited suites
// assert on. Import this module FIRST in a suite that exercises the full (Advanced) app, so
// the stored choice exists before any store reads it. Suites about Simple or the unstored
// default must not import it.
try {
  ;(globalThis as { localStorage?: Storage }).localStorage?.setItem('hermes.desktop.interfaceMode.v1', 'advanced')
} catch {
  // Node-environment suites have no storage.
}

/** `localStorage.clear()` for suites that reset storage between cases but still exercise Advanced. */
export function clearStorageKeepingAdvanced() {
  window.localStorage.clear()
  window.localStorage.setItem('hermes.desktop.interfaceMode.v1', 'advanced')
}
