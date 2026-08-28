/**
 * "Due tomorrow" reminders for recurring bills/income.
 *
 * `recurring.postDue()` (src/stores/recurring.ts) only posts the actual
 * transaction on the day it's due. This schedules a local notification the
 * day *before* each recurring item's `dayOfMonth`, so the user has a heads
 * up before the money moves.
 *
 * No-op on web/dev, matching the pattern used by other native-only services
 * in this folder (see haptics.ts, widget.ts): check `isNative()` first,
 * swallow errors from unavailable/denied native APIs, never throw.
 */
import type { LocalNotificationSchema } from '@capacitor/local-notifications'
import { LocalNotifications } from '@capacitor/local-notifications'
import { addDays } from 'date-fns'
import { isNative } from '@/lib/platform'
import { clampDayOfMonth, dateInMonth, parseLocalDay } from '@/lib/dates'
import i18n from '@/i18n'
import type { Category, Recurring } from '@/types/finance'

/** Tag stored in `extra` so we only ever cancel/replace notifications we scheduled. */
const REMINDER_SOURCE = 'wdig-recurring-reminder'

/**
 * High offset that keeps our ids away from `0` and out of any other
 * notification id range the app might use in the future, while staying well
 * inside Android's 32-bit signed int limit (2,147,483,647).
 */
const ID_BASE = 90_000_000
/** Room per recurring item for up to 10 future occurrences. */
const ID_SPAN = 10
/** Schedule this month's occurrence plus the next couple, not an infinite series. */
const OCCURRENCE_COUNT = 3
const REMINDER_HOUR = 9

/** Deterministic 32-bit hash (djb2) so the same recurring id always maps to the same bucket. */
function hashToUint32(input: string): number {
  let hash = 5381
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash + input.charCodeAt(i)) >>> 0
  }
  return hash
}

/**
 * Stable, deterministic notification id derived from the recurring item's own
 * id — re-running this with the same items always produces the same ids, so
 * scheduling is idempotent and never piles up duplicates.
 */
function notificationId(recurringId: string, occurrenceIndex: number): number {
  const bucket = hashToUint32(recurringId) % 1_000_000
  return ID_BASE + bucket * ID_SPAN + occurrenceIndex
}

/** `yyyy-MM` keys for the current calendar month plus the following `count - 1` months. */
function upcomingMonthKeys(count: number): string[] {
  const now = new Date()
  const keys: string[] = []
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  return keys
}

function formatAmount(minorUnits: number): string {
  const value = Number.isFinite(minorUnits) ? minorUnits / 100 : 0
  return value.toFixed(2)
}

function billName(item: Recurring, categories: Category[]): string {
  const note = item.note.trim()
  if (note) return note
  const category = categories.find((c) => c.id === item.categoryId)
  if (category?.name) return category.name
  return i18n.global.t('notifications.genericBill')
}

/**
 * (Re)schedules "due tomorrow" reminders for every recurring item.
 *
 * Cancels every reminder this function previously scheduled (identified by
 * `extra.source`), then schedules fresh ones for the current `items`. Safe
 * to call repeatedly, e.g. every time the recurring list changes — it never
 * accumulates stale or duplicate notifications.
 */
export async function scheduleRecurringReminders(
  items: Recurring[],
  categories: Category[],
): Promise<void> {
  if (!isNative()) return

  try {
    let permission = await LocalNotifications.checkPermissions()
    if (permission.display === 'prompt' || permission.display === 'prompt-with-rationale') {
      permission = await LocalNotifications.requestPermissions()
    }
    if (permission.display !== 'granted') return

    const pending = await LocalNotifications.getPending()
    const ours = pending.notifications
      .filter((n) => n.extra?.source === REMINDER_SOURCE)
      .map((n) => ({ id: n.id }))
    if (ours.length) {
      await LocalNotifications.cancel({ notifications: ours })
    }

    const months = upcomingMonthKeys(OCCURRENCE_COUNT)
    const now = Date.now()
    const toSchedule: LocalNotificationSchema[] = []

    for (const item of items) {
      const day = clampDayOfMonth(item.dayOfMonth)
      const name = billName(item, categories)
      const amount = formatAmount(item.amount)

      months.forEach((month, occurrenceIndex) => {
        const postedOn = dateInMonth(month, day)
        const reminderAt = addDays(parseLocalDay(postedOn), -1)
        reminderAt.setHours(REMINDER_HOUR, 0, 0, 0)
        if (reminderAt.getTime() <= now) return // already passed — don't schedule it

        toSchedule.push({
          id: notificationId(item.id, occurrenceIndex),
          title: String(i18n.global.t('notifications.recurringReminderTitle', { name })),
          body: String(i18n.global.t('notifications.recurringReminderBody', { amount })),
          schedule: { at: reminderAt, allowWhileIdle: true },
          extra: { source: REMINDER_SOURCE, recurringId: item.id },
        })
      })
    }

    if (toSchedule.length) {
      await LocalNotifications.schedule({ notifications: toSchedule })
    }
  } catch {
    // Permission denied, plugin unavailable, or scheduling failed — stay quiet.
  }
}
