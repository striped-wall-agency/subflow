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

export interface PaymentAttempt {
  obligationId: string
  subscriptionId: string
  boundary: string
  amountCents: number
  outcome: 'success' | 'failed'
}

export function advanceSubscription(subscription: Subscription, plans: Plan[], until: string, failing: boolean): { subscription: Subscription; attempts: PaymentAttempt[] } {
  let current = { ...subscription }
  const attempts: PaymentAttempt[] = []
  while (current.periodEnd <= until && current.status !== 'Canceled' && current.status !== 'Past Due') {
    if (!current.renewalEnabled) {
      current = { ...current, status: 'Canceled' }
      break
    }
    const boundary = current.periodEnd
    const planId = current.pendingChange?.planId ?? current.planId
    const interval = current.pendingChange?.interval ?? current.interval
    const plan = plans.find(item => item.id === planId)
    if (!plan) throw new Error('Subscription plan is missing.')
    const attempt: PaymentAttempt = { obligationId: `${current.id}:${boundary}`, subscriptionId: current.id, boundary, amountCents: interval === 'monthly' ? plan.monthlyCents : plan.annualCents, outcome: failing ? 'failed' : 'success' }
    attempts.push(attempt)
    current = { ...current, planId, interval, pendingChange: undefined, status: failing ? 'Past Due' : 'Active', ...(failing ? {} : { periodStart: boundary, periodEnd: addPeriod(boundary, interval) }) }
  }
  return { subscription: current, attempts }
}

export function retryPayment(subscription: Subscription, debt: PaymentAttempt, failing: boolean, now: string): { subscription: Subscription; attempt: PaymentAttempt } {
  if (debt.outcome !== 'failed' || debt.subscriptionId !== subscription.id || subscription.periodEnd !== debt.boundary || (subscription.status !== 'Past Due' && !(subscription.status === 'Scheduled to Cancel' && subscription.previousStatus === 'Past Due' && now < subscription.periodEnd))) {
    throw new Error('This payment cannot be retried.')
  }
  const attempt: PaymentAttempt = { ...debt, outcome: failing ? 'failed' : 'success' }
  if (failing) return { subscription, attempt }
  return { subscription: { ...subscription, status: subscription.renewalEnabled ? 'Active' : 'Scheduled to Cancel', previousStatus: subscription.renewalEnabled ? undefined : 'Active', periodStart: debt.boundary, periodEnd: addPeriod(debt.boundary, subscription.interval) }, attempt }
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
