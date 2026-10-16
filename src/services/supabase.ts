import { createClient, type SupabaseClient, type Session, type User, type AuthChangeEvent } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  !supabaseUrl.includes('your-project-id') &&
  !supabaseAnonKey.includes('your-anon-key')
)

export const supabase: SupabaseClient<any, 'public', any> = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key',
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
      emailRedirectTo: window.location.origin,
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
    redirectTo: window.location.origin,
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
