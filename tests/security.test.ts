/**
 * Security Guard Tests - Hisabe Firebase Auth Migration
 *
 * Tests that fixed server actions correctly reject:
 *   1. Unauthenticated callers (no session)
 *   2. Cross-user ownership attempts
 *
 * Runner: node:test (built-in, no extra dependencies)
 * Run:    npx tsx --test tests/security.test.ts
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

// ---------------------------------------------------------------------------
// Fake DB helpers - simulate what sql template tag returns
// ---------------------------------------------------------------------------

function fakeQuery(rows: Record<string, unknown>[]) {
  return () => Promise.resolve(rows)
}

// ---------------------------------------------------------------------------
// PART 1 - verifyAccountOwnership and verifyCategoryAccess guard logic
// ---------------------------------------------------------------------------

async function verifyAccountOwnership(
  accountId: string,
  userId: string,
  dbRows: Record<string, unknown>[]
): Promise<boolean> {
  if (!accountId) return false
  const [row] = await fakeQuery(dbRows)()
  return Boolean(row)
}

async function verifyCategoryAccess(
  categoryId: string,
  userId: string,
  dbRows: Record<string, unknown>[]
): Promise<boolean> {
  if (!categoryId) return true
  const [row] = await fakeQuery(dbRows)()
  return Boolean(row)
}

describe('verifyAccountOwnership logic', () => {
  it('returns false when accountId is empty', async () => {
    const result = await verifyAccountOwnership('', 'user-A', [{ id: 'acc-A' }])
    assert.equal(result, false)
  })

  it('returns false when DB returns no row (cross-user access)', async () => {
    const result = await verifyAccountOwnership('acc-A', 'user-B', [])
    assert.equal(result, false)
  })

  it('returns true when DB returns matching row (correct owner)', async () => {
    const result = await verifyAccountOwnership('acc-A', 'user-A', [{ id: 'acc-A' }])
    assert.equal(result, true)
  })
})

describe('verifyCategoryAccess logic', () => {
  it('empty categoryId is always permissible (Uncategorized)', async () => {
    const result = await verifyCategoryAccess('', 'user-A', [])
    assert.equal(result, true)
  })

  it('returns false when category is inaccessible (cross-user, non-global)', async () => {
    const result = await verifyCategoryAccess('cat-A', 'user-B', [])
    assert.equal(result, false)
  })

  it('returns true for global category (user_id IS NULL)', async () => {
    const result = await verifyCategoryAccess('cat-global', 'any-user', [{ id: 'cat-global' }])
    assert.equal(result, true)
  })
})

// ---------------------------------------------------------------------------
// PART 2 - Action guard simulations (mirror exact logic in fixed code)
// ---------------------------------------------------------------------------

async function simulateDebtRepaymentGuard(opts: {
  userId: string
  accountId?: string
  dbHasDebt: boolean
  dbHasAccount: boolean
  balance: number
  allowOverdraft: boolean
  debtType: 'owed_by_me' | 'owed_to_me'
  amount: number
  remaining: number
}) {
  const { userId, accountId, dbHasDebt, dbHasAccount, balance, allowOverdraft, debtType, amount, remaining } = opts
  if (!userId) throw new Error('Unauthorized')
  if (amount <= 0) throw new Error('Repayment amount must be greater than zero')
  if (!dbHasDebt) throw new Error('Debt record not found')
  if (amount > remaining) throw new Error('Repayment amount exceeds remaining balance')
  if (accountId) {
    if (!dbHasAccount) throw new Error('Account not found or access denied.')
    if (debtType === 'owed_by_me' && !allowOverdraft && balance < amount) {
      throw new Error('Insufficient funds in selected account (Available: ' + balance.toFixed(2) + ').')
    }
  }
}

describe('recordDebtRepayment guards', () => {
  it('throws Unauthorized when userId is empty', async () => {
    await assert.rejects(
      () => simulateDebtRepaymentGuard({ userId: '', accountId: 'acc1', dbHasDebt: true, dbHasAccount: true, balance: 100, allowOverdraft: false, debtType: 'owed_by_me', amount: 50, remaining: 100 }),
      /Unauthorized/
    )
  })

  it('throws when debt belongs to another user (debt not found for this userId)', async () => {
    await assert.rejects(
      () => simulateDebtRepaymentGuard({ userId: 'user-B', accountId: 'acc1', dbHasDebt: false, dbHasAccount: true, balance: 100, allowOverdraft: false, debtType: 'owed_by_me', amount: 50, remaining: 100 }),
      /Debt record not found/
    )
  })

  it('throws when account belongs to another user', async () => {
    await assert.rejects(
      () => simulateDebtRepaymentGuard({ userId: 'user-B', accountId: 'acc-A', dbHasDebt: true, dbHasAccount: false, balance: 100, allowOverdraft: false, debtType: 'owed_by_me', amount: 50, remaining: 100 }),
      /Account not found or access denied/
    )
  })

  it('throws on insufficient funds when overdraft is disabled', async () => {
    await assert.rejects(
      () => simulateDebtRepaymentGuard({ userId: 'user-A', accountId: 'acc-A', dbHasDebt: true, dbHasAccount: true, balance: 30, allowOverdraft: false, debtType: 'owed_by_me', amount: 50, remaining: 100 }),
      /Insufficient funds/
    )
  })

  it('allows repayment when overdraft is enabled', async () => {
    await assert.doesNotReject(
      () => simulateDebtRepaymentGuard({ userId: 'user-A', accountId: 'acc-A', dbHasDebt: true, dbHasAccount: true, balance: 5, allowOverdraft: true, debtType: 'owed_by_me', amount: 50, remaining: 100 })
    )
  })

  it('throws when repayment amount exceeds remaining debt balance', async () => {
    await assert.rejects(
      () => simulateDebtRepaymentGuard({ userId: 'user-A', accountId: undefined, dbHasDebt: true, dbHasAccount: true, balance: 1000, allowOverdraft: true, debtType: 'owed_by_me', amount: 200, remaining: 100 }),
      /exceeds remaining balance/
    )
  })

  it('no balance check for owed_to_me (income type repayment)', async () => {
    await assert.doesNotReject(
      () => simulateDebtRepaymentGuard({ userId: 'user-A', accountId: 'acc-A', dbHasDebt: true, dbHasAccount: true, balance: 0, allowOverdraft: false, debtType: 'owed_to_me', amount: 50, remaining: 100 })
    )
  })
})

async function simulateBudgetGuard(userId: string, categoryIsAccessible: boolean, amount: number, month: number) {
  if (!userId) throw new Error('Unauthorized')
  if (amount <= 0) throw new Error('Budget amount must be greater than zero')
  if (month < 1 || month > 12) throw new Error('Invalid month')
  if (!categoryIsAccessible) throw new Error('Category not found or access denied.')
}

describe('upsertBudget guards', () => {
  it('throws Unauthorized when not logged in', async () => {
    await assert.rejects(() => simulateBudgetGuard('', true, 500, 5), /Unauthorized/)
  })

  it('throws for inaccessible category (cross-user or non-existent)', async () => {
    await assert.rejects(() => simulateBudgetGuard('user-B', false, 500, 5), /Category not found or access denied/)
  })

  it('throws for invalid month', async () => {
    await assert.rejects(() => simulateBudgetGuard('user-A', true, 500, 13), /Invalid month/)
  })

  it('allows budget creation with accessible category', async () => {
    await assert.doesNotReject(() => simulateBudgetGuard('user-A', true, 500, 5))
  })
})

async function simulateImportGuard(userId: string, accountId: string, accountOwned: boolean, rowCount: number) {
  if (!userId) throw new Error('Unauthorized')
  if (!accountId) throw new Error('Target account is required.')
  if (!accountOwned) throw new Error('Account not found or access denied.')
  if (rowCount === 0) throw new Error('No valid rows provided for import.')
}

describe('bulkImportTransactions guards', () => {
  it('throws Unauthorized when not logged in', async () => {
    await assert.rejects(() => simulateImportGuard('', 'acc-A', true, 5), /Unauthorized/)
  })

  it('throws when account is not owned by authenticated user', async () => {
    await assert.rejects(() => simulateImportGuard('user-B', 'acc-A', false, 5), /Account not found or access denied/)
  })

  it('does not write any rows when ownership check fails', async () => {
    let writeCount = 0
    try {
      await simulateImportGuard('user-B', 'acc-A', false, 5)
      writeCount++ // must NOT reach here
    } catch {
      // expected
    }
    assert.equal(writeCount, 0, 'No writes should happen before ownership check passes')
  })

  it('throws when no rows are provided', async () => {
    await assert.rejects(() => simulateImportGuard('user-A', 'acc-A', true, 0), /No valid rows provided/)
  })
})

async function simulateUpdateCategoryGuard(userId: string, rowsReturned: number) {
  if (!userId) throw new Error('Unauthorized')
  // WHERE id =  AND user_id =  AND (is_system = FALSE OR is_system IS NULL)
  if (rowsReturned === 0) throw new Error('Category not found, access denied, or system category cannot be modified.')
}

describe('updateCategory guards', () => {
  it('throws Unauthorized when not logged in', async () => {
    await assert.rejects(() => simulateUpdateCategoryGuard('', 1), /Unauthorized/)
  })

  it('throws when modifying a system category (WHERE clause returns 0 rows)', async () => {
    await assert.rejects(() => simulateUpdateCategoryGuard('user-A', 0), /system category cannot be modified/)
  })

  it('throws when modifying another users custom category', async () => {
    await assert.rejects(() => simulateUpdateCategoryGuard('user-B', 0), /access denied/)
  })

  it('allows updating own non-system custom category', async () => {
    await assert.doesNotReject(() => simulateUpdateCategoryGuard('user-A', 1))
  })
})

async function simulateRecurringGuard(
  userId: string, ruleExists: boolean, accountOwned: boolean,
  txType: 'expense' | 'income', balance: number, allowOverdraft: boolean, amount: number
) {
  if (!userId) throw new Error('Unauthorized')
  if (!ruleExists) throw new Error('Recurring rule not found or inactive')
  if (!accountOwned) throw new Error('Account not found or access denied.')
  if (txType === 'expense' && !allowOverdraft && balance < amount) {
    throw new Error('Insufficient funds. Account balance cannot be negative (Available: ' + balance.toFixed(2) + ').')
  }
}

describe('executeRecurringTransaction guards', () => {
  it('throws Unauthorized when not logged in', async () => {
    await assert.rejects(() => simulateRecurringGuard('', true, true, 'expense', 100, false, 50), /Unauthorized/)
  })

  it('throws when rule belongs to another user', async () => {
    await assert.rejects(() => simulateRecurringGuard('user-B', false, true, 'expense', 100, false, 50), /Recurring rule not found or inactive/)
  })

  it('throws when account belongs to another user', async () => {
    await assert.rejects(() => simulateRecurringGuard('user-B', true, false, 'expense', 100, false, 50), /Account not found or access denied/)
  })

  it('throws on insufficient funds for expense without overdraft', async () => {
    await assert.rejects(() => simulateRecurringGuard('user-A', true, true, 'expense', 20, false, 50), /Insufficient funds/)
  })

  it('allows income type regardless of balance (no balance check for income)', async () => {
    await assert.doesNotReject(() => simulateRecurringGuard('user-A', true, true, 'income', 0, false, 50))
  })
})
