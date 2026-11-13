export type Interval = 'monthly' | 'annual'
export type Status = 'Active' | 'Trialing' | 'Past Due' | 'Scheduled to Cancel' | 'Canceled'

/** Advance a UTC calendar period, clamping dates such as January 31 to month end. */
export function addPeriod(date: string, interval: Interval): string {
  const source = new Date(date)
  const months = interval === 'annual' ? 12 : 1
  const target = new Date(source)
  target.setUTCDate(1)
  target.setUTCMonth(target.getUTCMonth() + months)
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate()
  target.setUTCDate(Math.min(source.getUTCDate(), lastDay))
  return target.toISOString()
}

export interface Plan {
  id: string
  monthlyCents: number
  annualCents: number
  archived: boolean
}

export interface Subscription {
  id: string
  planId: string
  interval: Interval
  status: Status
  periodStart: string
  periodEnd: string
  renewalEnabled: boolean
  pendingChange?: { planId: string; interval: Interval }
  previousStatus?: Status
}

export function scheduleChange(subscription: Subscription, plan: Plan, interval: Interval): Subscription {
  if (subscription.status === 'Canceled' || subscription.status === 'Past Due' || plan.archived) {
    throw new Error('This plan change is unavailable.')
  }
  return { ...subscription, pendingChange: { planId: plan.id, interval } }
}

export function cancelSubscription(subscription: Subscription): Subscription {
  if (subscription.status === 'Canceled' || subscription.status === 'Scheduled to Cancel') {
    throw new Error('This subscription cannot be canceled.')
  }
  return { ...subscription, status: 'Scheduled to Cancel', previousStatus: subscription.status, renewalEnabled: false, pendingChange: undefined }
}

export function resumeSubscription(subscription: Subscription, now: string): Subscription {
  if (subscription.status !== 'Scheduled to Cancel' || now >= subscription.periodEnd) {
    throw new Error('This subscription cannot be resumed.')
  }
  return { ...subscription, status: subscription.previousStatus ?? 'Active', renewalEnabled: true, previousStatus: undefined }
}
