import { describe, expect, it } from 'vitest'

import { luminance } from './color'
import { BUILTIN_THEMES, DEFAULT_SKIN_NAME } from './presets'

describe('the Simmuse default theme', () => {
  it('is the default skin', () => {
    expect(DEFAULT_SKIN_NAME).toBe('simmuse')
    expect(BUILTIN_THEMES[DEFAULT_SKIN_NAME]).toBeDefined()
  })

  it('stays black in both modes, so a light OS setting never paints it white', () => {
    const theme = BUILTIN_THEMES.simmuse!

    expect(theme.darkColors).toBe(theme.colors)
    expect(luminance(theme.colors.background)).toBeLessThan(0.05)
  })

  it('keeps the orange accent legible on black', () => {
    const { colors } = BUILTIN_THEMES.simmuse!

    // Orange on the black surface (text/icons) and black ink on the orange fill (buttons).
    expect(luminance(colors.midground ?? colors.ring) + 0.05).toBeGreaterThan(4.5 * (luminance(colors.background) + 0.05))
    expect(luminance(colors.primary) + 0.05).toBeGreaterThan(4.5 * (luminance(colors.primaryForeground) + 0.05))
  })
})
