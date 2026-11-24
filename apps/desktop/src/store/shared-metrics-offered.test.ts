import { expect, it } from 'vitest'

import { SHARED_METRICS_OFFERED } from './shared-metrics'

// Simmuse does not invite anyone to share usage metrics: the only upload address
// the app ships with is Nous Research's. If this flips, the backend must have an
// owner-controlled endpoint first (see shared_metrics_send_config.py).
it('does not offer to share usage metrics', () => {
  expect(SHARED_METRICS_OFFERED).toBe(false)
})
