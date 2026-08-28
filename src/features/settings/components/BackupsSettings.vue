<script setup lang="ts">
import { ref, shallowRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { ArrowLeft, Download, FileSpreadsheet, FileUp, Trash2, Upload } from '@lucide/vue'
import AppButton from '@/components/ui/AppButton.vue'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import CsvImportSheet from './CsvImportSheet.vue'
import {
  exportBackupFile,
  exportTransactionsCsv,
  mergeFromBackup,
  parseBackupJson,
  replaceFromBackup,
} from '@/services/backup'
import { warningFeedback } from '@/services/native/haptics'
import { resetLocalData } from '@/db'
import { usePremiumStore } from '@/stores/premium'
import { useSettingsStore } from '@/stores/settings'
import type { BackupPayload } from '@/types/finance'

const emit = defineEmits<{
  (e: 'back'): void
  (e: 'notify', msg: string): void
}>()

const { t } = useI18n()
const settings = useSettingsStore()
const premium = usePremiumStore()

const importing = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
const importSheetOpen = ref(false)
const pendingBackup = shallowRef<BackupPayload | null>(null)
const csvImportOpen = ref(false)

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
    const parsed = parseBackupJson(text)
    pendingBackup.value = parsed
    importSheetOpen.value = true
  } catch (err) {
    emit('notify', err instanceof Error ? err.message : t('settings.importFail', 'Import failed'))
  } finally {
    importing.value = false
    input.value = ''
  }
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
    await settings.load()
    resetSheetOpen.value = false
    emit('notify', t('settings.resetOk', 'All data reset successfully.'))
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
      accept="application/json"
      class="sr-only"
      @change="onFileSelected"
    />

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

      <!-- Import JSON Backup -->
      <button type="button" class="row-btn" :disabled="importing" @click="triggerImport">
        <div class="row-left">
          <div class="icon-circle icon-teal">
            <Upload :size="18" />
          </div>
          <div class="row-label">
            <span class="title">{{ t('settings.importBackup', 'Import JSON backup') }}</span>
            <span class="subtitle">{{ t('settings.importDesc', 'Restore data from an existing backup file') }}</span>
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
          <label for="reset-challenge">{{ t('settings.resetChallenge', { a: resetA, b: resetB }) }}</label>
          <input
            id="reset-challenge"
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

    <CsvImportSheet
      :open="csvImportOpen"
      @close="csvImportOpen = false"
      @notify="(msg) => emit('notify', msg)"
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

.challenge-box {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  font-weight: 600;
}

.challenge-input {
  width: 80px;
  padding: 8px 12px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-outline);
  background: var(--color-surface-container);
  color: var(--color-on-surface);
  font-size: 1.1rem;
  font-weight: 700;
  text-align: center;
}

.error-msg {
  color: var(--color-expense);
  font-size: 0.85rem;
}

.danger-action-btn {
  background: var(--color-expense) !important;
  color: #ffffff !important;
}
</style>
