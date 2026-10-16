import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User, Session } from '@supabase/supabase-js'
import {
  isSupabaseConfigured,
  signInWithEmail,
  signUpWithEmail,
  signInWithMagicLink,
  signOutUser,
  getCurrentSession,
  onAuthStateChange,
} from '@/services/supabase'
import {
  syncTwoWay,
  uploadCloudSnapshot,
  restoreCloudSnapshot,
  listCloudSnapshots,
  getLastSyncAt,
  type CloudBackupItem,
} from '@/services/supabaseSync'
import { db } from '@/db'

export const useSupabaseStore = defineStore('supabase', () => {
  const user = ref<User | null>(null)
  const session = ref<Session | null>(null)
  const isLoading = ref(false)
  const isSyncing = ref(false)
  const lastSyncedAt = ref<string | null>(null)
  const autoSyncEnabled = ref(false)
  const snapshots = ref<CloudBackupItem[]>([])
  const error = ref<string | null>(null)

  const isConfigured = computed(() => isSupabaseConfigured)
  const isAuthenticated = computed(() => Boolean(user.value))
  const userEmail = computed(() => user.value?.email || '')

  let initialized = false

  async function init() {
    if (initialized || !isSupabaseConfigured) return
    initialized = true

    try {
      isLoading.value = true
      const sess = await getCurrentSession()
      session.value = sess
      user.value = sess?.user || null

      const [lastSync, autoSyncMeta] = await Promise.all([
        getLastSyncAt(),
        db.meta.get('supabaseAutoSync'),
      ])

      lastSyncedAt.value = lastSync
      autoSyncEnabled.value = autoSyncMeta?.value === 'true'

      if (user.value) {
        await refreshSnapshots()
      }

      onAuthStateChange(async (_event, newSession) => {
        session.value = newSession
        user.value = newSession?.user || null
        if (newSession?.user) {
          await refreshSnapshots()
          if (autoSyncEnabled.value) {
            triggerSyncSilent()
          }
        } else {
          snapshots.value = []
        }
      })
    } catch (e) {
      console.error('Failed to initialize Supabase store:', e)
    } finally {
      isLoading.value = false
    }
  }

  async function login(email: string, pass: string) {
    error.value = null
    isLoading.value = true
    try {
      const res = await signInWithEmail(email, pass)
      session.value = res.session
      user.value = res.user
      await refreshSnapshots()
      return true
    } catch (e: any) {
      error.value = e.message || 'Login failed'
      throw e
    } finally {
      isLoading.value = false
    }
  }

  async function register(email: string, pass: string) {
    error.value = null
    isLoading.value = true
    try {
      const res = await signUpWithEmail(email, pass)
      session.value = res.session
      user.value = res.user
      return true
    } catch (e: any) {
      error.value = e.message || 'Registration failed'
      throw e
    } finally {
      isLoading.value = false
    }
  }

  async function loginWithMagicLink(email: string) {
    error.value = null
    isLoading.value = true
    try {
      await signInWithMagicLink(email)
      return true
    } catch (e: any) {
      error.value = e.message || 'Failed to send magic link'
      throw e
    } finally {
      isLoading.value = false
    }
  }

  async function logout() {
    isLoading.value = true
    try {
      await signOutUser()
      user.value = null
      session.value = null
      snapshots.value = []
    } catch (e: any) {
      error.value = e.message || 'Logout failed'
    } finally {
      isLoading.value = false
    }
  }

  async function syncNow() {
    if (!isAuthenticated.value) {
      throw new Error('Please sign in to sync with Supabase.')
    }
    isSyncing.value = true
    error.value = null
    try {
      const stats = await syncTwoWay()
      lastSyncedAt.value = stats.syncedAt
      return stats
    } catch (e: any) {
      error.value = e.message || 'Sync failed'
      throw e
    } finally {
      isSyncing.value = false
    }
  }

  async function triggerSyncSilent() {
    try {
      if (isAuthenticated.value && !isSyncing.value) {
        await syncNow()
      }
    } catch {
      // silent background sync failure
    }
  }

  async function createSnapshot() {
    if (!isAuthenticated.value) {
      throw new Error('Please sign in to save cloud snapshots.')
    }
    isLoading.value = true
    try {
      const result = await uploadCloudSnapshot()
      lastSyncedAt.value = result.timestamp
      await refreshSnapshots()
      return result
    } catch (e: any) {
      error.value = e.message || 'Cloud backup failed'
      throw e
    } finally {
      isLoading.value = false
    }
  }

  async function restoreSnapshot(snapshotId?: string, mode: 'merge' | 'replace' = 'merge') {
    if (!isAuthenticated.value) {
      throw new Error('Please sign in to restore cloud backups.')
    }
    isLoading.value = true
    try {
      await restoreCloudSnapshot(snapshotId, mode)
      lastSyncedAt.value = new Date().toISOString()
    } catch (e: any) {
      error.value = e.message || 'Cloud restore failed'
      throw e
    } finally {
      isLoading.value = false
    }
  }

  async function refreshSnapshots() {
    try {
      snapshots.value = await listCloudSnapshots()
    } catch {
      snapshots.value = []
    }
  }

  async function setAutoSync(val: boolean) {
    autoSyncEnabled.value = val
    await db.meta.put({ key: 'supabaseAutoSync', value: val ? 'true' : 'false' })
    if (val && isAuthenticated.value) {
      triggerSyncSilent()
    }
  }

  return {
    user,
    session,
    isLoading,
    isSyncing,
    lastSyncedAt,
    autoSyncEnabled,
    snapshots,
    error,
    isConfigured,
    isAuthenticated,
    userEmail,
    init,
    login,
    register,
    loginWithMagicLink,
    logout,
    syncNow,
    createSnapshot,
    restoreSnapshot,
    refreshSnapshots,
    setAutoSync,
  }
})
