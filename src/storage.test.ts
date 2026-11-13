import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { openDatabase, readSnapshot, writeSnapshot } from './storage'

describe('demo storage', () => {
  it('persists a snapshot across database connections', async () => {
    const first = await openDatabase()
    await writeSnapshot(first, { demoTime: '2026-01-01', role: 'customer' })
    first.close()

    const second = await openDatabase()
    await expect(readSnapshot(second)).resolves.toEqual({ demoTime: '2026-01-01', role: 'customer' })
    second.close()
  })
  it('rejects a stale write without changing the committed snapshot', async () => {
    const database = await openDatabase()
    await writeSnapshot(database, { revision: 2, value: 'committed' })
    await expect(writeSnapshot(database, { revision: 2, value: 'stale' }, 1)).rejects.toBeDefined()
    await expect(readSnapshot(database)).resolves.toEqual({ revision: 2, value: 'committed' })
    database.close()
  })
})
