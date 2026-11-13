import { describe, expect, it } from 'vitest'
import { addPeriod } from './domain'
import { cancelSubscription, resumeSubscription, scheduleChange, type Subscription } from './domain'

describe('calendar periods', () => {
  it('clamps a monthly renewal to the end of February', () => {
    expect(addPeriod('2024-01-31T12:00:00.000Z', 'monthly')).toBe('2024-02-29T12:00:00.000Z')
  })
  it('clamps leap day in a non-leap year', () => {
    expect(addPeriod('2024-02-29T00:00:00.000Z', 'annual')).toBe('2025-02-28T00:00:00.000Z')
  })
})

describe('subscription changes', () => {
  const subscription: Subscription = { id: 's1', planId: 'core', interval: 'monthly', status: 'Active', periodStart: '2026-01-01T00:00:00.000Z', periodEnd: '2026-02-01T00:00:00.000Z', renewalEnabled: true }
  const plan = { id: 'studio', monthlyCents: 4900, annualCents: 49000, archived: false }

  it('schedules a change without changing the current plan', () => {
    const result = scheduleChange(subscription, plan, 'annual')
    expect(result.planId).toBe('core')
    expect(result.pendingChange).toEqual({ planId: 'studio', interval: 'annual' })
    expect(() => scheduleChange(subscription, { ...plan, archived: true }, 'monthly')).toThrow()
  })

  it('clears pending changes on cancellation and resumes only before expiry', () => {
    const canceled = cancelSubscription(scheduleChange(subscription, plan, 'annual'))
    expect(canceled.pendingChange).toBeUndefined()
    expect(canceled.renewalEnabled).toBe(false)
    expect(resumeSubscription(canceled, '2026-01-31T00:00:00.000Z').status).toBe('Active')
    expect(() => resumeSubscription(canceled, subscription.periodEnd)).toThrow()
  })
})
