<script setup lang="ts">
import { ref, shallowRef } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  ArrowLeft,
  CheckCircle,
  Cloud,
  CloudDownload,
  CloudUpload,
  Download,
  FileSpreadsheet,
  FileUp,
  Lock,
  LogOut,
  Radio,
  RefreshCw,
  Trash2,
  Upload,
} from '@lucide/vue'
import AppButton from '@/components/ui/AppButton.vue'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import CsvImportSheet from './CsvImportSheet.vue'
import P2PSyncModal from './P2PSyncModal.vue'
import SupabaseAuthModal from './SupabaseAuthModal.vue'
import {
  exportBackupFile,
  exportTransactionsCsv,
  mergeFromBackup,
  parseBackupJson,
  replaceFromBackup,
} from '@/services/backup'
import {
  exportEncryptedBackupFile,
  decryptBackup,
  parseEncryptedBackupEnvelope,
  type EncryptedBackupEnvelope,
} from '@/services/crypto'
import { errorFeedback, successFeedback, tickFeedback, warningFeedback } from '@/services/native/haptics'
import { resetLocalData } from '@/db'
import { usePremiumStore } from '@/stores/premium'
import { useSettingsStore } from '@/stores/settings'
import { useSupabaseStore } from '@/stores/supabase'
import type { BackupPayload } from '@/types/finance'

const emit = defineEmits<{
  (e: 'back'): void
  (e: 'notify', msg: string): void
}>()

const { t } = useI18n()
const settings = useSettingsStore()
const premium = usePremiumStore()
const supabaseStore = useSupabaseStore()

const authModalOpen = ref(false)
const cloudRestoreSheetOpen = ref(false)
const restoringCloud = ref(false)

function onAuthSuccess(msg: string) {
  emit('notify', msg)
}

function formatSyncTime(isoStr: string) {
  try {
    const d = new Date(isoStr)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ', ' + d.toLocaleDateString()
  } catch {
    return isoStr
  }
}

async function handleSyncNow() {
  try {
    const stats = await supabaseStore.syncNow()
    void successFeedback()
    emit('notify', t('supabase.syncSuccess', { pulled: stats.pulled.toString(), pushed: stats.pushed.toString() }))
  } catch (err: any) {
    void errorFeedback()
    emit('notify', err.message || t('supabase.syncFailed', 'Sync failed'))
  }
}

async function handleCreateSnapshot() {
  try {
    await supabaseStore.createSnapshot()
    void successFeedback()
    emit('notify', t('supabase.snapshotCreated', 'Cloud snapshot saved successfully!'))
  } catch (err: any) {
    void errorFeedback()
    emit('notify', err.message || 'Snapshot failed')
  }
}

async function handleSignOut() {
  await supabaseStore.logout()
  void tickFeedback()
  emit('notify', t('supabase.signedOut', 'Signed out of Supabase.'))
}

async function openCloudRestoreSheet() {
  await supabaseStore.refreshSnapshots()
  cloudRestoreSheetOpen.value = true
}

async function handleRestoreSnapshot(snapshotId: string) {
  restoringCloud.value = true
  try {
    await supabaseStore.restoreSnapshot(snapshotId, 'merge')
    await settings.load()
    cloudRestoreSheetOpen.value = false
    void successFeedback()
    emit('notify', t('supabase.snapshotRestored', 'Data restored from cloud snapshot.'))
  } catch (err: any) {
    void errorFeedback()
    emit('notify', err.message || 'Restore failed')
  } finally {
    restoringCloud.value = false
  }
}

const importing = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
const importSheetOpen = ref(false)
const pendingBackup = shallowRef<BackupPayload | null>(null)
const csvImportOpen = ref(false)

// Encrypted Export & Import state
const encryptedExportSheetOpen = ref(false)
const exportPassphrase = ref('')
const exportPassphraseConfirm = ref('')
const exportPassError = ref('')

const encryptedImportSheetOpen = ref(false)
const importPassphrase = ref('')
const importPassError = ref('')
const pendingEncryptedEnvelope = shallowRef<EncryptedBackupEnvelope | null>(null)

// P2P Sync state
const p2pSyncOpen = ref(false)

const resetSheetOpen = ref(false)
const resetA = ref(2)
const resetB = ref(3)
const resetAnswer = ref('')
const resetError = ref('')
const resetting = ref(false)

async function doExport() {
  if (!premium.isPremiumUser) {
    premium.openPaywall(t('premium.limitExport', 'Backup export is a Pro feature.'))
    return
  }
  try {
    await exportBackupFile()
    await settings.markBackupNow()
    emit('notify', t('settings.exportOk', 'Backup ready to share or download.'))
  } catch (e) {
    emit('notify', e instanceof Error ? e.message : t('settings.exportFail', 'Export failed'))
  }
}

async function doCsv() {
  if (!premium.isPremiumUser) {
    premium.openPaywall(t('premium.limitExport', 'CSV export is a Pro feature.'))
    return
  }
  try {
    await exportTransactionsCsv()
    emit('notify', t('settings.csvOk', 'CSV export started.'))
  } catch (e) {
    emit('notify', e instanceof Error ? e.message : t('settings.csvFail', 'CSV export failed'))
  }
}

function triggerImport() {
  fileInput.value?.click()
}

function openCsvImport() {
  csvImportOpen.value = true
}

async function onFileSelected(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  importing.value = true
  try {
    const text = await file.text()
    if (file.name.endsWith('.enc') || text.includes('wherediditgo-encrypted-backup')) {
      const envelope = parseEncryptedBackupEnvelope(text)
      pendingEncryptedEnvelope.value = envelope
      importPassphrase.value = ''
      importPassError.value = ''
      encryptedImportSheetOpen.value = true
    } else {
      const parsed = parseBackupJson(text)
      pendingBackup.value = parsed
      importSheetOpen.value = true
    }
  } catch (err) {
    emit('notify', err instanceof Error ? err.message : t('settings.importFail', 'Import failed'))
  } finally {
    importing.value = false
    input.value = ''
  }
}

function openEncryptedExport() {
  if (!premium.isPremiumUser) {
    premium.openPaywall(t('premium.limitExport', 'Backup export is a Pro feature.'))
    return
  }
  exportPassphrase.value = ''
  exportPassphraseConfirm.value = ''
  exportPassError.value = ''
  encryptedExportSheetOpen.value = true
}

async function executeEncryptedExport() {
  if (exportPassphrase.value.length < 4) {
    exportPassError.value = t('settings.passphraseTooShort', 'Password must be at least 4 characters')
    void errorFeedback()
    return
  }
  if (exportPassphrase.value !== exportPassphraseConfirm.value) {
    exportPassError.value = t('settings.passphraseMismatch', 'Passwords do not match')
    void errorFeedback()
    return
  }
  try {
    await exportEncryptedBackupFile(exportPassphrase.value)
    await settings.markBackupNow()
    encryptedExportSheetOpen.value = false
    void successFeedback()
    emit('notify', t('settings.exportEncryptedOk', 'Encrypted backup ready.'))
  } catch (e) {
    exportPassError.value = e instanceof Error ? e.message : 'Encryption failed'
    void errorFeedback()
  }
}

async function executeEncryptedImport() {
  if (!pendingEncryptedEnvelope.value || !importPassphrase.value) {
    importPassError.value = t('settings.passphraseRequired', 'Please enter password')
    return
  }
  try {
    const parsed = await decryptBackup(pendingEncryptedEnvelope.value, importPassphrase.value)
    pendingBackup.value = parsed
    encryptedImportSheetOpen.value = false
    importSheetOpen.value = true
    void successFeedback()
  } catch (e) {
    importPassError.value = e instanceof Error ? e.message : t('settings.decryptFail', 'Failed to decrypt')
    void errorFeedback()
  }
}

function openP2PSync() {
  p2pSyncOpen.value = true
}

async function onP2PSynced(count: number) {
  await settings.load()
  emit('notify', t('settings.p2pSyncedNotify', { count: count.toString() }))
}

async function applyReplace() {
  if (!pendingBackup.value) return
  importing.value = true
  try {
    await replaceFromBackup(pendingBackup.value)
    await settings.markBackupNow()
    importSheetOpen.value = false
    pendingBackup.value = null
    emit('notify', t('settings.importOk', 'Backup imported successfully.'))
  } catch (err) {
    emit('notify', err instanceof Error ? err.message : t('settings.importFail', 'Import failed'))
  } finally {
    importing.value = false
  }
}

async function applyMerge() {
  if (!pendingBackup.value) return
  importing.value = true
  try {
    await mergeFromBackup(pendingBackup.value)
    await settings.markBackupNow()
    importSheetOpen.value = false
    pendingBackup.value = null
    emit('notify', t('settings.importMergeOk', 'Backup merged.'))
  } catch (err) {
    emit('notify', err instanceof Error ? err.message : t('settings.importFail', 'Import failed'))
  } finally {
    importing.value = false
  }
}

function openReset() {
  void warningFeedback()
  resetA.value = Math.floor(Math.random() * 8) + 2
  resetB.value = Math.floor(Math.random() * 8) + 2
  resetAnswer.value = ''
  resetError.value = ''
  resetSheetOpen.value = true
}

async function executeReset() {
  const expected = resetA.value + resetB.value
  if (parseInt(resetAnswer.value, 10) !== expected) {
    resetError.value = t('settings.resetWrong', 'Incorrect answer. Try again.')
    return
  }
  resetting.value = true
  try {
    await resetLocalData()
    window.location.reload()
  } catch (e) {
    resetError.value = e instanceof Error ? e.message : 'Reset failed'
  } finally {
    resetting.value = false
  }
}
</script>

<template>
  <div class="subpage">
    <div class="header">
      <button type="button" class="back-btn" :aria-label="t('common.back')" @click="emit('back')">
        <ArrowLeft :size="22" />
      </button>
      <h2>{{ t('settings.backupsTitle', 'Backups & Storage') }}</h2>
    </div>

    <input
      ref="fileInput"
      type="file"
      accept="application/json,.json,.enc"
      class="sr-only"
      @change="onFileSelected"
    />

    <!-- Supabase Cloud Sync & Vault -->
    <h3 class="section-title">{{ t('supabase.cloudSyncTitle', 'Supabase Cloud Sync & Vault') }}</h3>
    <div class="grouped-section">
      <!-- When Not Connected -->
      <button
        v-if="!supabaseStore.isAuthenticated"
        type="button"
        class="row-btn"
        @click="authModalOpen = true"
      >
        <div class="row-left">
          <div class="icon-circle icon-emerald">
            <Cloud :size="18" />
          </div>
          <div class="row-label">
            <span class="title">{{ t('supabase.notConnected', 'Connect Supabase Account') }}</span>
            <span class="subtitle">{{ t('supabase.notConnectedSub', 'Enable encrypted cross-device sync & automated cloud snapshots') }}</span>
          </div>
        </div>
        <span class="badge-connect">{{ t('supabase.connectBtn', 'Connect') }}</span>
      </button>

      <!-- When Connected -->
      <template v-else>
        <!-- Account Status Row -->
        <div class="row-btn non-clickable">
          <div class="row-left">
            <div class="icon-circle icon-emerald pulse">
              <CheckCircle :size="18" />
            </div>
            <div class="row-label">
              <span class="title">{{ supabaseStore.userEmail }}</span>
              <span class="subtitle">
                {{ supabaseStore.lastSyncedAt ? t('supabase.lastSync', { time: formatSyncTime(supabaseStore.lastSyncedAt) }) : t('supabase.connected', 'Connected and ready to sync') }}
              </span>
            </div>
          </div>
          <button
            type="button"
            class="logout-icon-btn"
            :title="t('supabase.signOut', 'Sign Out')"
            @click="handleSignOut"
          >
            <LogOut :size="16" />
          </button>
        </div>

        <div class="divider" />

        <!-- Sync Now Button -->
        <button
          type="button"
          class="row-btn"
          :disabled="supabaseStore.isSyncing"
          @click="handleSyncNow"
        >
          <div class="row-left">
            <div class="icon-circle icon-teal" :class="{ spinning: supabaseStore.isSyncing }">
              <RefreshCw :size="18" />
            </div>
            <div class="row-label">
              <span class="title">{{ supabaseStore.isSyncing ? t('supabase.syncing', 'Syncing…') : t('supabase.syncNow', 'Sync Now') }}</span>
              <span class="subtitle">{{ t('supabase.syncNowSub', 'Synchronize transactions and balances with Supabase') }}</span>
            </div>
          </div>
        </button>

        <div class="divider" />

        <!-- Auto Sync Toggle -->
        <div class="row-btn non-clickable">
          <div class="row-left">
            <div class="icon-circle icon-blue">
              <Cloud :size="18" />
            </div>
            <div class="row-label">
              <span class="title">{{ t('supabase.autoSync', 'Automatic Cloud Sync') }}</span>
              <span class="subtitle">{{ t('supabase.autoSyncSub', 'Keep databases in sync on launch and changes') }}</span>
            </div>
          </div>
          <label class="toggle-switch">
            <input
              type="checkbox"
              :checked="supabaseStore.autoSyncEnabled"
              @change="supabaseStore.setAutoSync(($event.target as HTMLInputElement).checked)"
            />
            <span class="toggle-slider" />
          </label>
        </div>

        <div class="divider" />

        <!-- Cloud Snapshot Backup -->
        <button type="button" class="row-btn" @click="handleCreateSnapshot">
          <div class="row-left">
            <div class="icon-circle icon-purple">
              <CloudUpload :size="18" />
            </div>
            <div class="row-label">
              <span class="title">{{ t('supabase.createSnapshot', 'Create Cloud Snapshot') }}</span>
              <span class="subtitle">{{ t('supabase.createSnapshotSub', 'Save a complete restorable snapshot to cloud') }}</span>
            </div>
          </div>
        </button>

        <div class="divider" />

        <!-- Restore Cloud Snapshot -->
        <button type="button" class="row-btn" @click="openCloudRestoreSheet">
          <div class="row-left">
            <div class="icon-circle icon-amber">
              <CloudDownload :size="18" />
            </div>
            <div class="row-label">
              <span class="title">{{ t('supabase.restoreSnapshot', 'Restore from Cloud Vault') }}</span>
              <span class="subtitle">{{ t('supabase.restoreSnapshotSub', 'Restore a previous cloud snapshot') }}</span>
            </div>
          </div>
        </button>
      </template>
    </div>

    <h3 class="section-title">{{ t('settings.localBackupsTitle', 'Local & Offline Backups') }}</h3>

    <div class="grouped-section">
      <!-- Export JSON Backup -->
      <button type="button" class="row-btn" @click="doExport">
        <div class="row-left">
          <div class="icon-circle icon-blue">
            <Download :size="18" />
          </div>
          <div class="row-label">
            <span class="title">{{ t('settings.exportBackup', 'Export JSON backup') }}</span>
            <span class="subtitle">{{ t('settings.backupDesc', 'Complete archive of accounts, categories & transactions') }}</span>
          </div>
        </div>
      </button>

      <div class="divider" />

      <!-- Export Encrypted Backup -->
      <button type="button" class="row-btn" @click="openEncryptedExport">
        <div class="row-left">
          <div class="icon-circle icon-purple">
            <Lock :size="18" />
          </div>
          <div class="row-label">
            <span class="title">{{ t('settings.exportEncrypted', 'Export encrypted backup (AES-256)') }}</span>
            <span class="subtitle">{{ t('settings.exportEncryptedSub', 'Password-protected archive for cloud storage or sharing') }}</span>
          </div>
        </div>
      </button>

      <div class="divider" />

      <!-- P2P Device Sync (WebRTC) -->
      <button type="button" class="row-btn" @click="openP2PSync">
        <div class="row-left">
          <div class="icon-circle icon-cyan">
            <Radio :size="18" />
          </div>
          <div class="row-label">
            <span class="title">{{ t('settings.p2pSyncBtn', 'P2P Device Sync (WebRTC)') }}</span>
            <span class="subtitle">{{ t('settings.p2pSyncSub', 'Local network phone-to-desktop DB sync via QR code') }}</span>
          </div>
        </div>
      </button>

      <div class="divider" />

      <!-- Import JSON / Encrypted Backup -->
      <button type="button" class="row-btn" :disabled="importing" @click="triggerImport">
        <div class="row-left">
          <div class="icon-circle icon-teal">
            <Upload :size="18" />
          </div>
          <div class="row-label">
            <span class="title">{{ t('settings.importBackup', 'Import JSON or Encrypted backup') }}</span>
            <span class="subtitle">{{ t('settings.importDesc', 'Restore data from an existing .json or .enc file') }}</span>
          </div>
        </div>
      </button>

      <div class="divider" />

      <!-- Export CSV -->
      <button type="button" class="row-btn" @click="doCsv">
        <div class="row-left">
          <div class="icon-circle icon-green">
            <FileSpreadsheet :size="18" />
          </div>
          <div class="row-label">
            <span class="title">{{ t('settings.exportCsv', 'Export CSV spreadsheet') }}</span>
            <span class="subtitle">{{ t('settings.csvDesc', 'Compatible with Excel, Google Sheets, and Numbers') }}</span>
          </div>
        </div>
      </button>

      <div class="divider" />

      <!-- Import CSV -->
      <button type="button" class="row-btn" @click="openCsvImport">
        <div class="row-left">
          <div class="icon-circle icon-amber">
            <FileUp :size="18" />
          </div>
          <div class="row-label">
            <span class="title">{{ t('settings.importCsv', 'Import from CSV') }}</span>
            <span class="subtitle">{{ t('settings.importCsvDesc', "Bring in transactions from your bank's CSV export") }}</span>
          </div>
        </div>
      </button>
    </div>

    <h3 class="section-title danger-title">{{ t('settings.dangerZone', 'Danger Zone') }}</h3>

    <div class="grouped-section danger-section">
      <!-- Reset Data -->
      <button type="button" class="row-btn danger-row" @click="openReset">
        <div class="row-left">
          <div class="icon-circle icon-red">
            <Trash2 :size="18" />
          </div>
          <div class="row-label">
            <span class="title danger-text">{{ t('settings.reset', 'Reset all local data') }}</span>
            <span class="subtitle">{{ t('settings.resetDesc', 'Deletes all transactions, accounts and budgets permanently') }}</span>
          </div>
        </div>
      </button>
    </div>

    <!-- Import Sheet -->
    <BottomSheet :open="importSheetOpen" :title="t('settings.importChoose', 'Import Backup')" @close="importSheetOpen = false">
      <div class="sheet-body">
        <p class="sheet-desc">{{ t('settings.importChoose', 'How should this backup be applied?') }}</p>
        <div class="sheet-actions">
          <AppButton block variant="filled" :disabled="importing" @click="applyReplace">
            {{ t('settings.importReplace', 'Replace all current data') }}
          </AppButton>
          <AppButton block variant="tonal" :disabled="importing" @click="applyMerge">
            {{ t('settings.importMerge', 'Merge into existing data') }}
          </AppButton>
        </div>
      </div>
    </BottomSheet>

    <!-- Reset Sheet -->
    <BottomSheet :open="resetSheetOpen" :title="t('settings.resetTitle', 'Reset All Data')" @close="resetSheetOpen = false">
      <div class="sheet-body">
        <p class="sheet-desc danger-desc">{{ t('settings.resetDesc') }}</p>
        <div class="challenge-box">
          <label for="backup-reset-challenge" class="challenge-label">{{ t('settings.resetChallenge', { a: resetA, b: resetB }) }}</label>
          <input
            id="backup-reset-challenge"
            v-model="resetAnswer"
            type="number"
            class="challenge-input"
            placeholder="?"
            @keydown.enter="executeReset"
          />
        </div>
        <p v-if="resetError" class="error-msg">{{ resetError }}</p>
        <AppButton
          block
          variant="filled"
          class="danger-action-btn"
          :disabled="resetting || !resetAnswer"
          @click="executeReset"
        >
          {{ resetting ? t('settings.resetting', 'Resetting…') : t('settings.resetConfirm', 'Reset Everything') }}
        </AppButton>
      </div>
    </BottomSheet>

    <!-- Encrypted Export Password Sheet -->
    <BottomSheet :open="encryptedExportSheetOpen" :title="t('settings.exportEncryptedTitle', 'Export Encrypted Backup')" @close="encryptedExportSheetOpen = false">
      <div class="sheet-body">
        <p class="sheet-desc">{{ t('settings.exportEncryptedDesc', 'Set a password to encrypt this backup with AES-256-GCM. You will need this password to restore your data.') }}</p>
        <label class="field-box">
          <span class="field-label">{{ t('settings.encryptionPassword', 'Password (min. 4 characters)') }}</span>
          <input
            v-model="exportPassphrase"
            type="password"
            class="dialog-input"
            placeholder="••••••••"
            autocomplete="new-password"
          />
        </label>
        <label class="field-box">
          <span class="field-label">{{ t('settings.confirmPassword', 'Confirm password') }}</span>
          <input
            v-model="exportPassphraseConfirm"
            type="password"
            class="dialog-input"
            placeholder="••••••••"
            autocomplete="new-password"
            @keydown.enter="executeEncryptedExport"
          />
        </label>
        <p v-if="exportPassError" class="error-msg">{{ exportPassError }}</p>
        <AppButton
          block
          variant="filled"
          :disabled="!exportPassphrase || exportPassphrase.length < 4"
          @click="executeEncryptedExport"
        >
          {{ t('settings.exportEncryptedConfirm', 'Export Encrypted File (.enc)') }}
        </AppButton>
      </div>
    </BottomSheet>

    <!-- Encrypted Import Password Sheet -->
    <BottomSheet :open="encryptedImportSheetOpen" :title="t('settings.decryptTitle', 'Unlock Encrypted Backup')" @close="encryptedImportSheetOpen = false">
      <div class="sheet-body">
        <p class="sheet-desc">{{ t('settings.decryptDesc', 'This backup is encrypted with AES-256. Enter the password used when creating it.') }}</p>
        <label class="field-box">
          <span class="field-label">{{ t('settings.encryptionPassword', 'Password') }}</span>
          <input
            v-model="importPassphrase"
            type="password"
            class="dialog-input"
            placeholder="••••••••"
            autocomplete="current-password"
            @keydown.enter="executeEncryptedImport"
          />
        </label>
        <p v-if="importPassError" class="error-msg">{{ importPassError }}</p>
        <AppButton
          block
          variant="filled"
          :disabled="!importPassphrase"
          @click="executeEncryptedImport"
        >
          {{ t('settings.decryptConfirm', 'Unlock & Review') }}
        </AppButton>
      </div>
    </BottomSheet>

    <!-- P2P Sync Modal -->
    <P2PSyncModal
      :open="p2pSyncOpen"
      @close="p2pSyncOpen = false"
      @synced="onP2PSynced"
    />

    <CsvImportSheet
      :open="csvImportOpen"
      @close="csvImportOpen = false"
      @notify="(msg) => emit('notify', msg)"
    />

    <!-- Cloud Restore Sheet -->
    <BottomSheet
      :open="cloudRestoreSheetOpen"
      :title="t('supabase.restoreModalTitle', 'Restore Cloud Snapshot')"
      @close="cloudRestoreSheetOpen = false"
    >
      <div class="sheet-body">
        <p class="sheet-desc">{{ t('supabase.restoreSnapshotSub', 'Restore a previous cloud snapshot') }}</p>
        <div v-if="supabaseStore.snapshots.length === 0" class="empty-snapshots">
          <p class="empty-text">{{ t('supabase.noSnapshots', 'No cloud snapshots saved yet.') }}</p>
        </div>
        <div v-else class="snapshot-list">
          <div
            v-for="snap in supabaseStore.snapshots"
            :key="snap.id"
            class="snapshot-item"
          >
            <div class="snapshot-info">
              <span class="snapshot-date">{{ formatSyncTime(snap.createdAt) }}</span>
              <span class="snapshot-meta">{{ snap.accountCount }} {{ t('settings.accounts', 'accounts') }} • {{ snap.transactionCount }} tx</span>
            </div>
            <AppButton
              variant="tonal"
              size="sm"
              :disabled="restoringCloud"
              @click="handleRestoreSnapshot(snap.id)"
            >
              {{ restoringCloud ? t('supabase.processing', 'Restoring…') : t('supabase.restoreBtn', 'Restore') }}
            </AppButton>
          </div>
        </div>
      </div>
    </BottomSheet>

    <!-- Supabase Auth Modal -->
    <SupabaseAuthModal
      :open="authModalOpen"
      @close="authModalOpen = false"
      @success="onAuthSuccess"
    />
  </div>
</template>

<style scoped>
.subpage {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  animation: fadeSlideUp var(--duration-entrance) var(--ease-emphasized) both;
}

.header {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) 0;
}

.back-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--color-surface-container);
  color: var(--color-on-surface);
  border: none;
  cursor: pointer;
  transition: transform var(--duration-fast) var(--ease-spring-snappy);
}

.back-btn:active {
  transform: scale(0.92);
}

h2 {
  font-family: var(--font-display);
  font-size: 1.35rem;
  font-weight: 700;
  color: var(--color-on-surface);
}

.section-title {
  font-size: 0.82rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-muted);
  margin-top: var(--space-2);
  margin-left: var(--space-2);
}

.danger-title {
  color: var(--color-expense);
}

.grouped-section {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-outline);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
}

.row-btn {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: var(--space-4) var(--space-5);
  background: transparent;
  border: none;
  text-align: left;
  cursor: pointer;
  transition: background var(--duration-fast);
}

.row-btn:active {
  background: color-mix(in srgb, var(--color-outline) 8%, transparent);
}

.row-left {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.icon-circle {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.icon-blue {
  background: color-mix(in srgb, var(--color-primary) 15%, transparent);
  color: var(--color-primary);
}

.icon-teal {
  background: color-mix(in srgb, #14b8a6 15%, transparent);
  color: #14b8a6;
}

.icon-green {
  background: color-mix(in srgb, var(--color-income) 15%, transparent);
  color: var(--color-income);
}

.icon-red {
  background: color-mix(in srgb, var(--color-expense) 15%, transparent);
  color: var(--color-expense);
}

.icon-amber {
  background: color-mix(in srgb, #ff9500 15%, transparent);
  color: #ff9500;
}

.icon-purple {
  background: color-mix(in srgb, #a855f7 15%, transparent);
  color: #a855f7;
}

.icon-cyan {
  background: color-mix(in srgb, #06b6d4 15%, transparent);
  color: #06b6d4;
}

.row-label {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-on-surface);
}

.subtitle {
  font-size: 0.82rem;
  color: var(--color-muted);
  line-height: 1.35;
}

.danger-text {
  color: var(--color-expense);
}

.divider {
  height: 1px;
  background: var(--color-outline-variant);
  margin-left: calc(var(--space-5) + 36px + var(--space-3));
}

.sheet-body {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: var(--space-2) 0 var(--space-4);
}

.sheet-desc {
  font-size: 0.95rem;
  color: var(--color-on-surface);
}

.danger-desc {
  color: var(--color-expense);
}

.sheet-actions {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.field-box {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-label {
  font-size: var(--text-caption);
  font-weight: 600;
  color: var(--color-muted);
}

.dialog-input {
  width: 100%;
  min-height: 44px;
  padding: 0 var(--space-3);
  border-radius: var(--radius-sm);
  border: 1.5px solid var(--color-outline);
  background: var(--color-surface);
  color: var(--color-on-surface);
  font-size: var(--text-body);
  outline: none;
  transition: border-color var(--duration-fast) var(--ease-standard),
              box-shadow var(--duration-fast) var(--ease-standard);
}

.dialog-input:focus,
.dialog-input:focus-visible {
  outline: none !important;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 22%, transparent);
}

.challenge-box {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-3) var(--space-4);
  background: var(--color-surface-container);
  border: 1px solid var(--color-outline);
  border-radius: var(--radius-md);
  gap: var(--space-3);
}

.challenge-label {
  font-size: var(--text-body);
  font-weight: 600;
  color: var(--color-on-surface);
  letter-spacing: var(--tracking-body);
}

.challenge-input {
  width: 76px;
  min-height: 42px;
  height: 42px;
  padding: 0 var(--space-3);
  border-radius: var(--radius-sm);
  border: 1.5px solid var(--color-outline);
  background: var(--color-surface);
  color: var(--color-on-surface);
  font-family: var(--font-mono);
  font-size: 1.15rem;
  font-weight: 700;
  text-align: center;
  font-variant-numeric: tabular-nums;
  outline: none;
  transition: border-color var(--duration-fast) var(--ease-standard),
              box-shadow var(--duration-fast) var(--ease-standard),
              background var(--duration-fast) var(--ease-standard);
  -webkit-appearance: none;
  appearance: none;
}

.challenge-input::placeholder {
  color: var(--color-muted);
  opacity: 0.6;
}

.challenge-input:hover {
  border-color: color-mix(in srgb, var(--color-on-surface) 22%, transparent);
}

.challenge-input:focus,
.challenge-input:focus-visible {
  outline: none !important;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 22%, transparent);
  background: var(--color-surface);
}

.error-msg {
  color: var(--color-expense);
  font-size: var(--text-caption);
}

.danger-action-btn {
  background: var(--color-expense) !important;
  color: var(--color-on-error) !important;
}

/* Supabase Cloud Sync Styles */
.badge-connect {
  padding: 0.25rem 0.625rem;
  background: color-mix(in srgb, #10b981 15%, transparent);
  color: #10b981;
  font-size: 0.75rem;
  font-weight: 700;
  border-radius: 9999px;
  border: 1px solid color-mix(in srgb, #10b981 30%, transparent);
}

.non-clickable {
  cursor: default !important;
}

.non-clickable:hover {
  background: transparent !important;
}

.logout-icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: none;
  background: color-mix(in srgb, #ef4444 12%, transparent);
  color: #ef4444;
  cursor: pointer;
  transition: all 0.2s ease;
}

.logout-icon-btn:hover {
  background: color-mix(in srgb, #ef4444 24%, transparent);
}

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.pulse {
  position: relative;
}

.pulse::after {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  width: 8px;
  height: 8px;
  background: #10b981;
  border-radius: 50%;
  border: 2px solid var(--color-surface, #ffffff);
}

.toggle-switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--color-outline, #d4d4d8);
  transition: 0.25s;
  border-radius: 24px;
}

.toggle-slider:before {
  position: absolute;
  content: '';
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.25s;
  border-radius: 50%;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.toggle-switch input:checked + .toggle-slider {
  background-color: var(--cat, #0d9488);
}

.toggle-switch input:checked + .toggle-slider:before {
  transform: translateX(20px);
}

.snapshot-list {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
  max-height: 280px;
  overflow-y: auto;
}

.snapshot-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 0.875rem;
  background: color-mix(in srgb, var(--color-surface) 90%, var(--cat, #0d9488) 10%);
  border: 1px solid var(--color-outline);
  border-radius: 12px;
}

.snapshot-info {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.snapshot-date {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-on-surface);
}

.snapshot-meta {
  font-size: 0.75rem;
  color: var(--color-muted);
}

.empty-snapshots {
  padding: 1.5rem 0;
  text-align: center;
}

.empty-text {
  font-size: 0.875rem;
  color: var(--color-muted);
}
</style>
