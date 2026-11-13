import { describe, expect, it } from 'vitest'
import { addPeriod, advanceSubscription, retryPayment } from './domain'
import { cancelSubscription, resumeSubscription, scheduleChange, type Subscription } from './domain'

describe('calendar periods', () => {
  it('clamps a monthly renewal to the end of February', () => {
    expect(addPeriod('2024-01-31T12:00:00.000Z', 'monthly')).toBe('2024-02-29T12:00:00.000Z')
  })
  it('clamps leap day in a non-leap year', () => {
    expect(addPeriod('2024-02-29T00:00:00.000Z', 'annual')).toBe('2025-02-28T00:00:00.000Z')
  })
})

describe('billing boundaries', () => {
  const sub: Subscription = { id: 's1', planId: 'core', interval: 'monthly', status: 'Active', periodStart: '2026-01-01T00:00:00.000Z', periodEnd: '2026-02-01T00:00:00.000Z', renewalEnabled: true, pendingChange: { planId: 'studio', interval: 'annual' } }
  const plans = [{ id: 'core', monthlyCents: 1900, annualCents: 19000, archived: false }, { id: 'studio', monthlyCents: 4900, annualCents: 49000, archived: false }]
  it('applies a pending change once and creates a renewal attempt', () => {
    const result = advanceSubscription(sub, plans, sub.periodEnd, false)
    expect(result.subscription).toMatchObject({ planId: 'studio', interval: 'annual', periodEnd: '2027-02-01T00:00:00.000Z', pendingChange: undefined })
    expect(result.attempts).toHaveLength(1)
    expect(result.attempts[0].amountCents).toBe(49000)
    expect(advanceSubscription(result.subscription, plans, sub.periodEnd, false).attempts).toHaveLength(0)
  })
  it('expires a scheduled cancellation without billing', () => {
    const result = advanceSubscription(cancelSubscription(sub), plans, sub.periodEnd, false)
    expect(result.subscription.status).toBe('Canceled')
    expect(result.attempts).toHaveLength(0)
  })
  it('keeps the original debt boundary on failure and retries only an open debt', () => {
    const failed = advanceSubscription(sub, plans, sub.periodEnd, true)
    expect(failed.subscription.status).toBe('Past Due')
    expect(advanceSubscription(failed.subscription, plans, '2026-04-01T00:00:00.000Z', true).attempts).toHaveLength(0)
    const paid = retryPayment(failed.subscription, failed.attempts[0], false)
    expect(paid.subscription.status).toBe('Active')
    expect(paid.subscription.periodStart).toBe(sub.periodEnd)
    expect(() => retryPayment(paid.subscription, paid.attempt, false)).toThrow()
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
