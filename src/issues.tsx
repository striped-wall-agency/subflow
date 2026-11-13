import { useState } from 'react'
import { Link } from 'react-router-dom'
import { money, type Customer, type Save, type State } from './model'

export function PaymentIssues({ data, save, retry, busy }: { data: State; save: Save; retry: (customer: Customer) => void; busy: boolean }) {
  const [filter, setFilter] = useState('open')
  const debts = [...new Map(data.attempts.filter(a => a.outcome === 'failed').map(a => [a.obligationId, a])).values()]
  const rows = debts.map(debt => {
    const customer = data.customers.find(c => c.subscription.id === debt.subscriptionId)!
    const attempts = data.attempts.filter(a => a.obligationId === debt.obligationId)
    return { debt, customer, attempts, resolved: attempts.some(a => a.outcome === 'success') }
  }).filter(row => filter === 'all' || row.resolved === (filter === 'resolved'))
  return <><label>Issue status<select value={filter} onChange={e => setFilter(e.target.value)}><option value="open">Open</option><option value="resolved">Resolved</option><option value="all">All issues</option></select></label><div className="card">{rows.length === 0 && <p>No {filter} payment issues.</p>}{rows.map(({ debt, customer: c, attempts, resolved }) => {
    const expired = c.subscription.status === 'Canceled' || (!c.subscription.renewalEnabled && data.date >= c.subscription.periodEnd)
    return <div className="row item" key={debt.obligationId}><div><Link to={`/admin/subscriptions/${c.subscription.id}`}><strong>{c.name}</strong></Link><p>{resolved ? 'Resolved' : 'Demo payment declined'} · {money(debt.amountCents)}</p><p>{attempts.length - 1} retries · {c.method}</p><p>{data.reviews?.includes(c.id) ? 'Flagged for review' : 'Not flagged'}</p></div><div className="actions"><button className="quiet" disabled={busy} onClick={() => void save({ ...data, reviews: data.reviews?.includes(c.id) ? data.reviews.filter(id => id !== c.id) : [...(data.reviews ?? []), c.id] })}>{data.reviews?.includes(c.id) ? 'Unmark review' : 'Mark for review'}</button><button disabled={busy || resolved || expired} onClick={() => retry(c)}>Retry payment</button></div>{(resolved || expired) && <p>{resolved ? 'This obligation is paid. No further retry is available.' : 'Access has expired. Retry is unavailable.'}</p>}</div>
  })}</div></>
}
