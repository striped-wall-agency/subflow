import { useState } from 'react'
import { formatDate, money } from './model'
import type { PaymentAttempt } from './domain'

export function BillingHistory({ attempts }: { attempts: PaymentAttempt[] }) {
  const [filter, setFilter] = useState('')
  const visible = attempts.filter(a => !filter || a.outcome === filter)
  return <><label>Payment status<select value={filter} onChange={e => setFilter(e.target.value)}><option value="">All payments</option><option value="success">Paid</option><option value="failed">Failed</option></select></label><button className="quiet" onClick={() => setFilter('')}>Clear filters</button><div className="card">{visible.length === 0 && <p>No matching payment attempts.</p>}{visible.map((a, i) => <details key={`${a.obligationId}-${i}`}><summary>{formatDate(a.boundary)} · {money(a.amountCents)} · {a.outcome === 'success' ? 'Paid' : 'Failed'}</summary><h3>Demo receipt / No real charges</h3><p>Reference: {a.obligationId}</p><p>Subscription: {a.subscriptionId}</p><p>Amount: {money(a.amountCents)} USD</p><p>Status: {a.outcome}</p><p>This fictional receipt is for demonstration only.</p></details>)}</div></>
}
