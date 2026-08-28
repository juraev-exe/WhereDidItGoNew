/**
 * Custom-scheme deep links (Android).
 *
 * Handles `wherediditgo://add`, the target of the static "Add transaction" home-screen app
 * shortcut (android/app/src/main/res/xml/shortcuts.xml + the matching intent-filter on
 * .MainActivity in AndroidManifest.xml). Two cases have to be covered:
 *
 *  - Warm start: the app is already running (or was merely backgrounded) and the shortcut's
 *    VIEW intent reaches it via onNewIntent — surfaced here as @capacitor/app's `appUrlOpen`
 *    event.
 *  - Cold start: the shortcut launches the app fresh, so there's no `appUrlOpen` event to
 *    listen for — the launch URL has to be read once via `App.getLaunchUrl()` instead.
 *
 * No-op on web/dev, matching the pattern used by other native-only services in this folder
 * (see haptics.ts, widget.ts).
 */
import { App } from '@capacitor/app'
import type { PluginListenerHandle } from '@capacitor/core'
import { isNative } from '@/lib/platform'

const ADD_TRANSACTION_HOST = 'add'

function isAddTransactionUrl(url: string): boolean {
  try {
    return new URL(url).host === ADD_TRANSACTION_HOST
  } catch {
    return false
  }
}

/**
 * Starts listening for the `wherediditgo://add` deep link and invokes `onAddTransaction`
 * whenever it's seen — both for a cold-start launch and for a live `appUrlOpen` event while
 * the app is already running. Returns a cleanup function that removes the live listener.
 */
export async function initDeepLinks(onAddTransaction: () => void): Promise<() => void> {
  if (!isNative()) return () => {}

  try {
    const launch = await App.getLaunchUrl()
    if (launch?.url && isAddTransactionUrl(launch.url)) {
      onAddTransaction()
    }
  } catch {
    // No launch URL available — nothing to do.
  }

  let handle: PluginListenerHandle | undefined
  try {
    handle = await App.addListener('appUrlOpen', ({ url }) => {
      if (isAddTransactionUrl(url)) {
        onAddTransaction()
      }
    })
  } catch {
    // Listener registration failed — live deep links won't be caught, but cold-start still works.
  }

  return () => {
    void handle?.remove()
  }
}
