import { prefersReducedMotion } from '@/hooks/use-media-query'
import { cn } from '@/lib/utils'

// The Simmuse loading mark: the logo's S thread with a node orbiting it on a tilted ring. It sits
// beside the MUSING word on the startup screen. It draws in `currentColor`, so it follows the theme's
// accent, and with reduced motion the node rests at the top of the ring instead of travelling.
const ORBIT = 'M37 20 A17 7 0 1 1 3 20 A17 7 0 1 1 37 20'

export function MusingOrb({ className }: { className?: string }) {
  const still = prefersReducedMotion()

  return (
    <svg
      aria-hidden
      className={cn('size-[2.4em] shrink-0 overflow-visible [filter:drop-shadow(0_0_5px_currentColor)]', className)}
      data-slot="musing_orb"
      viewBox="0 0 40 40"
    >
      <g transform="rotate(-28 20 20)">
        <path d={ORBIT} fill="none" opacity="0.4" stroke="currentColor" strokeWidth="1" />
        {/* The motion path supplies the node's position, so it starts at the origin; resting, it sits on the ring. */}
        <circle cx={still ? 20 : 0} cy={still ? 13 : 0} fill="currentColor" r="2.2">
          {!still && <animateMotion dur="2.6s" path={ORBIT} repeatCount="indefinite" />}
        </circle>
      </g>
      <path
        d="M24.53 12.89 A5 5 0 1 0 20 20 A5 5 0 1 1 15.67 27.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2.6"
      />
    </svg>
  )
}
