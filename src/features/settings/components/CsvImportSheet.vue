<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { FileSpreadsheet, FileUp } from '@lucide/vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import type { SelectOption } from '@/components/ui/AppSelect.vue'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import {
  buildTransactionsFromCsv,
  guessMapping,
  parseCsv,
  type CsvAmountMode,
  type CsvParseResult,
  type CsvSkipReason,
} from '@/services/csvImport'
import { formatMoney } from '@/lib/money'
import { confirmFeedback, errorFeedback, successFeedback, tickFeedback, warningFeedback } from '@/services/native/haptics'
import { useAccountsStore } from '@/stores/accounts'
import { useSettingsStore } from '@/stores/settings'
import { useTransactionsStore } from '@/stores/transactions'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: []; notify: [string] }>()

const { t } = useI18n()
const accounts = useAccountsStore()
const settings = useSettingsStore()
const txStore = useTransactionsStore()

type Step = 'pick' | 'map' | 'result'

const step = ref<Step>('pick')
const fileInput = ref<HTMLInputElement | null>(null)
const fileName = ref('')
const parsed = ref<CsvParseResult>({ headers: [], rows: [] })
const parseError = ref('')

const dateColumnStr = ref('')
const descriptionColumnStr = ref('')
const amountColumnStr = ref('')
const debitColumnStr = ref('')
const creditColumnStr = ref('')
const amountMode = ref<CsvAmountMode>('single')
const accountId = ref('')

const importing = ref(false)
const importError = ref('')
const result = ref<{ imported: number; skipped: number; reasons: Record<string, number> } | null>(null)

function strToIndex(value: string): number | null {
  return value === '' ? null : Number(value)
}

const mapping = computed(() => ({
  dateColumn: strToIndex(dateColumnStr.value),
  descriptionColumn: strToIndex(descriptionColumnStr.value),
  amountMode: amountMode.value,
  amountColumn: strToIndex(amountColumnStr.value),
  debitColumn: strToIndex(debitColumnStr.value),
  creditColumn: strToIndex(creditColumnStr.value),
}))

const headerOptions = computed<SelectOption[]>(() =>
  parsed.value.headers.map((h, i) => ({
    value: String(i),
    label: h.trim() || t('csvImport.columnFallback', { n: i + 1 }),
  })),
)

const optionalHeaderOptions = computed<SelectOption[]>(() => [
  { value: '', label: t('csvImport.noneOption') },
  ...headerOptions.value,
])

const accountOptions = computed<SelectOption[]>(() =>
  accounts.active.map((a) => ({ value: a.id, label: a.name })),
)

const hasRequiredMapping = computed(() => {
  if (dateColumnStr.value === '') return false
  if (amountMode.value === 'single') return amountColumnStr.value !== ''
  return debitColumnStr.value !== '' && creditColumnStr.value !== ''
})

const canImport = computed(
  () => hasRequiredMapping.value && Boolean(accountId.value) && parsed.value.rows.length > 0,
)

interface PreviewRow {
  date: string
  description: string
  amountLabel: string
  isExpense: boolean
  skipReason: CsvSkipReason | null
}

const previewRows = computed<PreviewRow[]>(() => {
  const slice = parsed.value.rows.slice(0, 5)
  if (!slice.length || !hasRequiredMapping.value) return []
  const acct = accountId.value || 'preview'
  return slice.map((row) => {
    const { transactions, skipped } = buildTransactionsFromCsv([row], mapping.value, acct)
    const tx = transactions[0]
    if (tx) {
      return {
        date: tx.date,
        description: tx.note || '—',
        amountLabel: formatMoney(
          tx.amount,
          settings.currency,
          settings.intlLocale,
          settings.currencyPosition,
          settings.hideCents,
        ),
        isExpense: tx.type === 'expense',
        skipReason: null,
      }
    }
    return {
      date: row[mapping.value.dateColumn ?? -1] ?? '',
      description: row[mapping.value.descriptionColumn ?? -1] ?? '',
      amountLabel: '',
      isExpense: false,
      skipReason: skipped[0]?.reason ?? null,
    }
  })
})

function resetState() {
  step.value = 'pick'
  fileName.value = ''
  parsed.value = { headers: [], rows: [] }
  parseError.value = ''
  dateColumnStr.value = ''
  descriptionColumnStr.value = ''
  amountColumnStr.value = ''
  debitColumnStr.value = ''
  creditColumnStr.value = ''
  amountMode.value = 'single'
  accountId.value = accounts.active[0]?.id ?? ''
  importing.value = false
  importError.value = ''
  result.value = null
  if (fileInput.value) fileInput.value.value = ''
}

watch(
  () => props.open,
  (v) => {
    if (v) resetState()
  },
)

function triggerPick() {
  fileInput.value?.click()
}

async function onFileSelected(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  parseError.value = ''
  try {
    const text = await file.text()
    const csv = parseCsv(text)
    if (!csv.headers.length || !csv.rows.length) {
      parseError.value = t('csvImport.emptyFile')
      void errorFeedback()
      return
    }
    parsed.value = csv
    fileName.value = file.name
    const guess = guessMapping(csv.headers)
    dateColumnStr.value = guess.dateColumn != null ? String(guess.dateColumn) : ''
    descriptionColumnStr.value = guess.descriptionColumn != null ? String(guess.descriptionColumn) : ''
    amountMode.value = guess.amountMode
    amountColumnStr.value = guess.amountColumn != null ? String(guess.amountColumn) : ''
    debitColumnStr.value = guess.debitColumn != null ? String(guess.debitColumn) : ''
    creditColumnStr.value = guess.creditColumn != null ? String(guess.creditColumn) : ''
    accountId.value = accounts.active[0]?.id ?? ''
    step.value = 'map'
    void confirmFeedback()
  } catch {
    parseError.value = t('csvImport.parseFail')
    void errorFeedback()
  } finally {
    input.value = ''
  }
}

function chooseAnotherFile() {
  step.value = 'pick'
  parsed.value = { headers: [], rows: [] }
  fileName.value = ''
  void tickFeedback()
}

function setAmountMode(mode: CsvAmountMode) {
  amountMode.value = mode
  void tickFeedback()
}

async function runImport() {
  if (!canImport.value || importing.value) return
  importing.value = true
  importError.value = ''
  try {
    const { transactions, skipped } = buildTransactionsFromCsv(parsed.value.rows, mapping.value, accountId.value)
    const reasons: Record<string, number> = {}
    for (const row of skipped) {
      reasons[row.reason] = (reasons[row.reason] ?? 0) + 1
    }
    let imported = 0
    for (const tx of transactions) {
      try {
        await txStore.addTransaction({
          type: tx.type,
          amount: tx.amount,
          accountId: tx.accountId,
          note: tx.note,
          date: tx.date,
        })
        imported++
      } catch {
        reasons.insertFailed = (reasons.insertFailed ?? 0) + 1
      }
    }
    result.value = {
      imported,
      skipped: transactions.length - imported + skipped.length,
      reasons,
    }
    step.value = 'result'
    if (imported > 0) void successFeedback()
    else void warningFeedback()
  } catch (e) {
    importError.value = e instanceof Error ? e.message : t('csvImport.importFail')
    void errorFeedback()
  } finally {
    importing.value = false
  }
}

const reasonKeys: Record<string, string> = {
  invalidDate: 'csvImport.reasonInvalidDate',
  invalidAmount: 'csvImport.reasonInvalidAmount',
  zeroAmount: 'csvImport.reasonZeroAmount',
  ambiguousDebitCredit: 'csvImport.reasonAmbiguousDebitCredit',
  noAccount: 'csvImport.reasonNoAccount',
  insertFailed: 'csvImport.reasonInsertFailed',
}

const resultReasonLines = computed(() => {
  if (!result.value) return []
  return Object.entries(result.value.reasons)
    .filter(([, count]) => count > 0)
    .map(([reason, count]) => `${count} ${t(reasonKeys[reason] ?? reason)}`)
})

const sheetTitle = computed(() => {
  if (step.value === 'map') return t('csvImport.mapTitle')
  if (step.value === 'result') return t('csvImport.resultTitle')
  return t('csvImport.title')
})

function finish() {
  if (result.value) {
    emit(
      'notify',
      t('csvImport.resultSummary', { imported: result.value.imported, skipped: result.value.skipped }),
    )
  }
  emit('close')
}
</script>

<template>
  <BottomSheet :open="open" :title="sheetTitle" contain @close="emit('close')">
    <input
      ref="fileInput"
      type="file"
      accept=".csv,text/csv"
      class="sr-only"
      @change="onFileSelected"
    />

    <!-- Step 1: pick a file -->
    <div v-if="step === 'pick'" class="pick-step">
      <div class="pick-art" aria-hidden="true">
        <FileSpreadsheet :size="32" />
      </div>
      <p class="pick-desc">{{ t('csvImport.chooseFileHint') }}</p>
      <p v-if="parseError" class="error-msg" role="alert">{{ parseError }}</p>
      <AppButton block @click="triggerPick">
        <FileUp :size="18" />
        {{ t('csvImport.chooseFile') }}
      </AppButton>
    </div>

    <!-- Step 2: map columns + preview -->
    <div v-else-if="step === 'map'" class="map-step">
      <div class="file-row">
        <FileSpreadsheet :size="16" />
        <span class="file-name">{{ fileName }}</span>
        <button type="button" class="change-file-btn" @click="chooseAnotherFile">
          {{ t('csvImport.changeFile') }}
        </button>
      </div>

      <div class="seg" role="tablist" :aria-label="t('csvImport.amountModeLabel')">
        <button
          type="button"
          role="tab"
          :class="{ active: amountMode === 'single' }"
          :aria-selected="amountMode === 'single'"
          @click="setAmountMode('single')"
        >
          {{ t('csvImport.amountModeSingle') }}
        </button>
        <button
          type="button"
          role="tab"
          :class="{ active: amountMode === 'splitDebitCredit' }"
          :aria-selected="amountMode === 'splitDebitCredit'"
          @click="setAmountMode('splitDebitCredit')"
        >
          {{ t('csvImport.amountModeSplit') }}
        </button>
      </div>

      <label class="field">
        <span>{{ t('csvImport.dateColumn') }}</span>
        <AppSelect
          v-model="dateColumnStr"
          :options="headerOptions"
          :placeholder="t('csvImport.selectColumn')"
          :aria-label="t('csvImport.dateColumn')"
        />
      </label>

      <label class="field">
        <span>{{ t('csvImport.descriptionColumn') }}</span>
        <AppSelect
          v-model="descriptionColumnStr"
          :options="optionalHeaderOptions"
          :aria-label="t('csvImport.descriptionColumn')"
        />
      </label>

      <label v-if="amountMode === 'single'" class="field">
        <span>{{ t('csvImport.amountColumn') }}</span>
        <AppSelect
          v-model="amountColumnStr"
          :options="headerOptions"
          :placeholder="t('csvImport.selectColumn')"
          :aria-label="t('csvImport.amountColumn')"
        />
      </label>
      <template v-else>
        <label class="field">
          <span>{{ t('csvImport.debitColumn') }}</span>
          <AppSelect
            v-model="debitColumnStr"
            :options="headerOptions"
            :placeholder="t('csvImport.selectColumn')"
            :aria-label="t('csvImport.debitColumn')"
          />
        </label>
        <label class="field">
          <span>{{ t('csvImport.creditColumn') }}</span>
          <AppSelect
            v-model="creditColumnStr"
            :options="headerOptions"
            :placeholder="t('csvImport.selectColumn')"
            :aria-label="t('csvImport.creditColumn')"
          />
        </label>
      </template>

      <label class="field">
        <span>{{ t('csvImport.account') }}</span>
        <AppSelect
          v-model="accountId"
          :options="accountOptions"
          :aria-label="t('csvImport.account')"
        />
      </label>

      <div class="field">
        <span>{{ t('csvImport.previewTitle') }}</span>
        <div v-if="previewRows.length" class="preview-table-wrap">
          <table class="preview-table">
            <thead>
              <tr>
                <th>{{ t('csvImport.previewDate') }}</th>
                <th>{{ t('csvImport.previewDescription') }}</th>
                <th>{{ t('csvImport.previewAmount') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, i) in previewRows" :key="i">
                <td>{{ row.date || '—' }}</td>
                <td class="preview-desc">{{ row.description || '—' }}</td>
                <td v-if="row.skipReason" class="preview-skip">
                  {{ t('csvImport.previewSkipped') }}
                </td>
                <td v-else class="preview-amount" :class="{ 'preview-amount--expense': row.isExpense }">
                  {{ row.amountLabel }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-else class="preview-empty">{{ t('csvImport.previewEmpty') }}</p>
      </div>

      <p v-if="importError" class="error-msg" role="alert">{{ importError }}</p>

      <div class="form-actions">
        <AppButton block :disabled="!canImport || importing" @click="runImport">
          {{ importing ? t('csvImport.importing') : t('csvImport.importButton') }}
        </AppButton>
      </div>
    </div>

    <!-- Step 3: result summary -->
    <div v-else class="result-step">
      <div class="result-art" :class="{ 'result-art--empty': result && result.imported === 0 }" aria-hidden="true">
        <FileSpreadsheet :size="32" />
      </div>
      <p class="result-summary">
        {{ t('csvImport.resultSummary', { imported: result?.imported ?? 0, skipped: result?.skipped ?? 0 }) }}
      </p>
      <ul v-if="resultReasonLines.length" class="result-reasons">
        <li v-for="(line, i) in resultReasonLines" :key="i">{{ line }}</li>
      </ul>
      <AppButton block @click="finish">{{ t('csvImport.done') }}</AppButton>
    </div>
  </BottomSheet>
</template>

<style scoped>
.pick-step,
.map-step,
.result-step {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding-bottom: var(--space-2);
}

.pick-step {
  align-items: center;
  text-align: center;
  padding: var(--space-6) var(--space-4) var(--space-4);
}

.pick-art {
  width: 64px;
  height: 64px;
  border-radius: var(--radius-xl);
  background: var(--color-primary-container);
  color: var(--color-on-primary-container);
  display: grid;
  place-items: center;
  margin-bottom: var(--space-1);
}

.pick-desc {
  color: var(--color-muted);
  font-size: var(--text-body);
  max-width: 34ch;
}

.file-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  background: var(--color-surface-container);
  border-radius: var(--radius-md);
  color: var(--color-on-surface-variant);
}

.file-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 600;
  font-size: var(--text-caption);
  color: var(--color-on-surface);
}

.change-file-btn {
  flex-shrink: 0;
  background: none;
  border: none;
  color: var(--color-primary);
  font-weight: 600;
  font-size: var(--text-caption);
  cursor: pointer;
}

.seg {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-1);
  padding: 4px;
  background: var(--color-surface-container);
  border-radius: var(--radius-full);
}

.seg button {
  min-height: 38px;
  border-radius: var(--radius-full);
  font-weight: 600;
  font-size: var(--text-label);
  color: var(--color-muted);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: background var(--duration-fast), color var(--duration-fast), box-shadow var(--duration-fast);
}

.seg button.active {
  background: var(--color-surface);
  color: var(--color-on-surface);
  box-shadow: var(--shadow-sm);
}

.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.field span {
  font-size: var(--text-caption);
  font-weight: 600;
  color: var(--color-muted);
}

.preview-table-wrap {
  overflow-x: auto;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-outline-variant);
}

.preview-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--text-caption);
}

.preview-table th,
.preview-table td {
  padding: var(--space-2) var(--space-2);
  text-align: left;
  white-space: nowrap;
}

.preview-table th {
  color: var(--color-muted);
  font-weight: 600;
  background: var(--color-surface-container);
}

.preview-table tbody tr + tr {
  border-top: 1px solid var(--color-outline-variant);
}

.preview-desc {
  max-width: 22ch;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.preview-amount {
  font-weight: 600;
  color: var(--color-income);
  font-variant-numeric: tabular-nums;
}

.preview-amount--expense {
  color: var(--color-expense);
}

.preview-skip {
  color: var(--color-error);
  font-weight: 600;
}

.preview-empty {
  font-size: var(--text-caption);
  color: var(--color-muted);
}

.form-actions {
  margin-top: var(--space-2);
}

.error-msg {
  color: var(--color-error);
  font-size: var(--text-caption);
  margin: 0;
}

.result-step {
  align-items: center;
  text-align: center;
  padding: var(--space-6) var(--space-4) var(--space-4);
}

.result-art {
  width: 64px;
  height: 64px;
  border-radius: var(--radius-xl);
  background: var(--color-primary-container);
  color: var(--color-on-primary-container);
  display: grid;
  place-items: center;
  margin-bottom: var(--space-1);
}

.result-art--empty {
  background: var(--color-surface-container-highest);
  color: var(--color-muted);
}

.result-summary {
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--color-on-surface);
}

.result-reasons {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: var(--text-caption);
  color: var(--color-muted);
}
</style>
