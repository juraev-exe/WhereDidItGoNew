/**
 * Custom-scheme deep links (Android).
 *
 * Handles:
 *  - `wherediditgo://add`: Quick add transaction sheet
 *  - `wherediditgo://scan`: Quick receipt camera scanner
 *  - `wherediditgo://budgets`: Monthly budget progress & runway overview
 *
 * Two cases have to be covered:
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
import { supabase } from '@/services/supabase'

export type DeepLinkAction = 'add' | 'scan' | 'budgets' | 'auth' | 'unknown'

export interface DeepLinkHandlers {
  onAddTransaction?: () => void
  onScanReceipt?: () => void
  onOpenBudgets?: () => void
  onAuthComplete?: () => void
}

export function parseDeepLink(url: string): DeepLinkAction {
  try {
    const parsed = new URL(url)
    if (parsed.protocol.toLowerCase() !== 'wherediditgo:') {
      return 'unknown'
    }
    const host = parsed.host.toLowerCase()
    if (host === 'add') return 'add'
    if (host === 'scan') return 'scan'
    if (host === 'budgets' || host === 'budget') return 'budgets'
    if (host === 'auth-callback' || host === 'login-callback') return 'auth'
    return 'unknown'
  } catch {
    return 'unknown'
  }
}

async function handleAuthTokens(rawUrl: string, onComplete?: () => void) {
  try {
    const parsed = new URL(rawUrl)
    if (parsed.protocol.toLowerCase() !== 'wherediditgo:') return
    const host = parsed.host.toLowerCase()
    if (host !== 'auth-callback' && host !== 'login-callback') return

    // Prefer PKCE authorization code exchange over implicit token params
    const authCode = parsed.searchParams.get('code')
    if (authCode) {
      const { error } = await supabase.auth.exchangeCodeForSession(authCode)
      if (!error) {
        onComplete?.()
      }
      return
    }

    const hashParams = new URLSearchParams(parsed.hash.startsWith('#') ? parsed.hash.slice(1) : parsed.hash)
    const accessToken = hashParams.get('access_token') || parsed.searchParams.get('access_token')
    const refreshToken = hashParams.get('refresh_token') || parsed.searchParams.get('refresh_token')
    if (accessToken && refreshToken) {
      await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      })
      onComplete?.()
    }
  } catch (err) {
    console.error('Failed to parse and set session from auth deep link:', err)
  }
}

function dispatch(action: DeepLinkAction, handlers: DeepLinkHandlers, rawUrl?: string): void {
  if (action === 'add') {
    handlers.onAddTransaction?.()
  } else if (action === 'scan') {
    handlers.onScanReceipt?.()
  } else if (action === 'budgets') {
    handlers.onOpenBudgets?.()
  } else if (action === 'auth' && rawUrl) {
    void handleAuthTokens(rawUrl, handlers.onAuthComplete)
  }
}

/**
 * Starts listening for `wherediditgo://` deep links and invokes the corresponding handler
 * for cold start launches and live `appUrlOpen` events.
 */
export async function initDeepLinks(
  handlers: DeepLinkHandlers | (() => void),
): Promise<() => void> {
  if (!isNative()) return () => {}

  const config: DeepLinkHandlers =
    typeof handlers === 'function' ? { onAddTransaction: handlers } : handlers

  try {
    const launch = await App.getLaunchUrl()
    if (launch?.url) {
      const action = parseDeepLink(launch.url)
      dispatch(action, config, launch.url)
    }
  } catch {
    // No launch URL available — nothing to do.
  }

  let handle: PluginListenerHandle | undefined
  try {
    handle = await App.addListener('appUrlOpen', ({ url }) => {
      const action = parseDeepLink(url)
      dispatch(action, config, url)
    })
  } catch {
    // Listener registration failed — live deep links won't be caught, but cold-start still works.
  }

  return () => {
    void handle?.remove()
  }
}
