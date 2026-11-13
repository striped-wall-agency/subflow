import type { PaymentAttempt, Subscription } from './domain'

export type DemoPlan = { id: string; name: string; description: string; monthlyCents: number; annualCents: number; archived: boolean; features?: string }
export type Customer = { id: string; name: string; company: string; email: string; method: string; billingName?: string; billingEmail?: string; address?: string; subscription: Subscription }
export type Activity = { id: string; time: string; actor: string; description: string; before: string; after: string }
export type State = { date: string; customerId: string; plans: DemoPlan[]; customers: Customer[]; attempts: PaymentAttempt[]; revision?: number; role?: 'customer' | 'admin'; events?: Activity[]; reviews?: string[]; diagnostic?: string }
export type Save = (next: State) => Promise<boolean>
export const money = (cents: number) => `$${(cents / 100).toFixed(2)}`
export const formatDate = (value: string) => new Date(value).toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric' })
