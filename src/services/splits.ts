import type { Transaction, TransactionSplit } from '@/types/finance'

export interface SplitValidationResult {
  valid: boolean
  remainder: number
  error?: string
}

export interface FlattenedSplit {
  categoryId: string
  subcategoryId?: string
  amount: number
  note: string
}

/**
 * Validates whether a collection of transaction splits cleanly balances against total amount.
 * - All split amounts must be positive integers (> 0).
 * - Each split must specify a non-empty categoryId.
 * - Sum of split amounts must equal totalAmount (remainder === 0).
 */
export function validateSplits(
  splits: TransactionSplit[] | undefined,
  totalAmount: number
): SplitValidationResult {
  if (!splits || splits.length === 0) {
    return {
      valid: false,
      remainder: totalAmount,
      error: 'No splits provided',
    }
  }

  let allocated = 0

  for (let i = 0; i < splits.length; i++) {
    const split = splits[i]
    if (typeof split.amount !== 'number' || split.amount <= 0 || !Number.isInteger(split.amount)) {
      return {
        valid: false,
        remainder: totalAmount - allocated,
        error: `Split at index ${i} has invalid amount: ${split.amount}`,
      }
    }
    if (!split.categoryId || split.categoryId.trim() === '') {
      return {
        valid: false,
        remainder: totalAmount - allocated,
        error: `Split at index ${i} requires a valid category`,
      }
    }
    allocated += split.amount
  }

  const remainder = totalAmount - allocated

  if (remainder !== 0) {
    return {
      valid: false,
      remainder,
      error: `Splits sum (${allocated}) does not match total amount (${totalAmount})`,
    }
  }

  return {
    valid: true,
    remainder: 0,
  }
}

/**
 * Normalizes a transaction into an array of category/subcategory allocations.
 * If the transaction has explicit splits, they are returned.
 * If not, the top-level transaction category and amount is wrapped into a single item.
 */
export function flattenTransactionSplits(
  tx: Pick<Transaction, 'amount' | 'categoryId' | 'subcategoryId' | 'note' | 'splits'>
): FlattenedSplit[] {
  if (tx.splits && tx.splits.length > 0) {
    return tx.splits.map((s) => ({
      categoryId: s.categoryId || tx.categoryId || 'uncategorized',
      subcategoryId: s.subcategoryId,
      amount: s.amount,
      note: s.note || tx.note || '',
    }))
  }

  return [
    {
      categoryId: tx.categoryId || 'uncategorized',
      subcategoryId: tx.subcategoryId,
      amount: tx.amount,
      note: tx.note || '',
    },
  ]
}
