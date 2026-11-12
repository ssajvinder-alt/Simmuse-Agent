import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { MusingOrb } from './musing-orb'

const reducedMotion = vi.hoisted(() => ({ value: false }))

vi.mock('@/hooks/use-media-query', () => ({ prefersReducedMotion: () => reducedMotion.value }))

afterEach(() => {
  cleanup()
  reducedMotion.value = false
})

describe('MusingOrb', () => {
  it('is decorative and orbits a node around the S', () => {
    const { container } = render(<MusingOrb />)
    const orb = container.querySelector('[data-slot="musing_orb"]')

    expect(orb?.getAttribute('aria-hidden')).toBe('true')
    expect(orb?.querySelector('animateMotion')).not.toBeNull()
  })

  it('holds the node still under reduced motion', () => {
    reducedMotion.value = true

    const { container } = render(<MusingOrb />)

    expect(container.querySelector('animateMotion')).toBeNull()
  })
})
