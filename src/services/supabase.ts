import { createClient, type SupabaseClient, type Session, type User, type AuthChangeEvent } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import { isNative } from '@/lib/platform'

const env = (typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : {}) as Record<string, string | undefined>
const supabaseUrl = env.VITE_SUPABASE_URL || (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_URL) || ''
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_ANON_KEY) || ''

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  !supabaseUrl.includes('your-project-id') &&
  !supabaseAnonKey.includes('your-anon-key')
)

/**
 * Returns the appropriate auth redirect URL depending on whether the app
 * is executing in a mobile Capacitor webview or standard web browser.
 */
export function getAuthRedirectUrl(): string {
  if (isNative()) {
    return 'wherediditgo://auth-callback'
  }
  return typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173'
}

// When Supabase is not configured, we create a client with an invalid local URL
// so no credentials are ever sent to an unknown external domain.
export const supabase: SupabaseClient<Database> = createClient<Database>(
  supabaseUrl || 'http://localhost:0',
  supabaseAnonKey || 'not-configured',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
)

/**
 * Sign up a new user with email and password
 */
export async function signUpWithEmail(email: string, password: string) {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured. Please check your .env credentials.')
  }
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  })
  if (error) throw error
  return data
}

/**
 * Sign in existing user with email and password
 */
export async function signInWithEmail(email: string, password: string) {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured. Please check your .env credentials.')
  }
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  if (error) throw error
  return data
}

/**
 * Send passwordless Magic Link / OTP to email
 */
export async function signInWithMagicLink(email: string) {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured. Please check your .env credentials.')
  }
  const { data, error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: getAuthRedirectUrl(),
    },
  })
  if (error) throw error
  return data
}

/**
 * Sign out current session
 */
export async function signOutUser() {
  if (!isSupabaseConfigured) return
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

/**
 * Get current session
 */
export async function getCurrentSession(): Promise<Session | null> {
  if (!isSupabaseConfigured) return null
  const { data, error } = await supabase.auth.getSession()
  if (error) return null
  return data.session
}

/**
 * Get current authenticated user
 */
export async function getCurrentUser(): Promise<User | null> {
  if (!isSupabaseConfigured) return null
  const { data, error } = await supabase.auth.getUser()
  if (error) return null
  return data.user
}

/**
 * Send password reset email
 */
export async function sendPasswordReset(email: string) {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured. Please check your .env credentials.')
  }
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: getAuthRedirectUrl(),
  })
  if (error) throw error
  return data
}

/**
 * Subscribe to auth state changes
 */
export function onAuthStateChange(callback: (event: AuthChangeEvent, session: Session | null) => void) {
  if (!isSupabaseConfigured) {
    return { data: { subscription: { unsubscribe: () => {} } } }
  }
  return supabase.auth.onAuthStateChange(callback)
}
