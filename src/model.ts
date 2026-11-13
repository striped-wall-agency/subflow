import type { PaymentAttempt, Subscription } from './domain'

export type DemoPlan = { id: string; name: string; description: string; monthlyCents: number; annualCents: number; archived: boolean; features?: string }
export type Customer = { id: string; name: string; company: string; email: string; method: string; billingName?: string; billingEmail?: string; address?: string; subscription: Subscription }
export type Activity = { id: string; time: string; actor: string; description: string; before: string; after: string }
export type State = { date: string; customerId: string; plans: DemoPlan[]; customers: Customer[]; attempts: PaymentAttempt[]; revision?: number; role?: 'customer' | 'admin'; events?: Activity[]; reviews?: string[]; diagnostic?: string }
export type Save = (next: State) => Promise<boolean>
export const money = (cents: number) => `$${(cents / 100).toFixed(2)}`
export const formatDate = (value: string) => new Date(value).toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric' })

export function describeChanges(before: State, after: State): { description: string; before: string; after: string } {
  const changedCustomers = after.customers.filter(c => JSON.stringify(c) !== JSON.stringify(before.customers.find(old => old.id === c.id)))
  const changedPlans = after.plans.filter(p => JSON.stringify(p) !== JSON.stringify(before.plans.find(old => old.id === p.id)))
  const summarize = (state: State) => [
    ...changedCustomers.map(c => {
      const item = state.customers.find(old => old.id === c.id)
      if (!item) return `${c.name}: not present`
      const s = item.subscription
      return `${item.name}: ${s.status}, ${state.plans.find(p => p.id === s.planId)?.name}, ${s.interval}, renewal ${s.renewalEnabled ? 'on' : 'off'}, ${item.method}${s.pendingChange ? `; pending ${state.plans.find(p => p.id === s.pendingChange?.planId)?.name} / ${s.pendingChange.interval}` : ''}`
    }),
    ...changedPlans.map(p => { const item = state.plans.find(old => old.id === p.id); return item ? `${item.name}: ${money(item.monthlyCents)} monthly, ${money(item.annualCents)} annually, ${item.archived ? 'archived' : 'available'}` : 'Plan not yet created' }),
    ...(before.date !== after.date ? [`Demo date: ${formatDate(state.date)}`] : []),
    ...(JSON.stringify(before.reviews) !== JSON.stringify(after.reviews) ? [`Review flags: ${state.reviews?.length ?? 0}`] : []),
  ].join(' · ')
  return { description: changedCustomers.length ? `${changedCustomers.map(c => c.name).join(', ')} updated` : changedPlans.length ? 'Plan catalog updated' : before.date !== after.date ? 'Demo time advanced' : 'Review flags updated', before: summarize(before), after: summarize(after) }
}
