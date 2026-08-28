<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import AppButton from '@/components/ui/AppButton.vue'
import IconByName from '@/components/ui/IconByName.vue'
import { useDebtsStore } from '@/stores/debts'
import { useSettingsStore } from '@/stores/settings'
import { tickFeedback, errorFeedback } from '@/services/native/haptics'
import DatePickerModal from '@/components/ui/DatePickerModal.vue'
import { parseMoneyToMinor } from '@/lib/money'
import { shortDayLabel } from '@/lib/dates'
import type { Debt, DebtType } from '@/types/finance'

const props = defineProps<{ debt?: Debt | null }>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'saved'): void
}>()

const { t } = useI18n()
const debtsStore = useDebtsStore()
const settingsStore = useSettingsStore()

const datePickerOpen = ref(false)
const type = ref<DebtType>(props.debt?.type ?? 'lent')
const personName = ref(props.debt?.personName ?? '')
const amountStr = ref(props.debt ? (props.debt.amount / 100).toFixed(2) : '')
const dueDate = ref(props.debt?.dueDate ?? '')
const note = ref(props.debt?.note ?? '')
const isSubmitting = ref(false)
const error = ref('')

const isEditing = computed(() => Boolean(props.debt))
const parsedAmount = computed(() => parseMoneyToMinor(amountStr.value))
const dueDateLabel = computed(() =>
  dueDate.value ? shortDayLabel(dueDate.value, settingsStore.intlLocale) : t('debts.noDueDate'),
)

async function handleSubmit() {
  if (!personName.value.trim()) {
    error.value = t('debts.nameRequired')
    void errorFeedback()
    return
  }
  if (parsedAmount.value <= 0) {
    error.value = t('debts.amountRequired')
    void errorFeedback()
    return
  }
  isSubmitting.value = true
  error.value = ''
  try {
    const payload = {
      type: type.value,
      personName: personName.value.trim(),
      amount: parsedAmount.value,
      dueDate: dueDate.value || undefined,
      note: note.value.trim() || undefined,
    }
    if (props.debt) await debtsStore.updateDebt(props.debt.id, payload)
    else await debtsStore.addDebt(payload)
    void tickFeedback()
    emit('saved')
    emit('close')
  } catch (e) {
    error.value = e instanceof Error ? e.message : t('quickAdd.saveFail')
    void errorFeedback()
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="modal-backdrop" @click.self="emit('close')">
    <div class="modal-card surface-glass" role="dialog" aria-modal="true">
      <div class="modal-header">
        <h3 class="modal-title">{{ isEditing ? t('debts.editDebt') : t('debts.addDebt') }}</h3>
        <button type="button" class="icon-btn" :aria-label="t('common.close')" @click="emit('close')">
          <IconByName name="x" :size="20" />
        </button>
      </div>

      <form class="modal-body" @submit.prevent="handleSubmit">
        <div class="seg" role="tablist" :aria-label="t('debts.title')">
          <button
            type="button"
            role="tab"
            :class="{ active: type === 'lent' }"
            :aria-selected="type === 'lent'"
            @click="type = 'lent'"
          >
            {{ t('debts.lent') }}
          </button>
          <button
            type="button"
            role="tab"
            :class="{ active: type === 'borrowed' }"
            :aria-selected="type === 'borrowed'"
            @click="type = 'borrowed'"
          >
            {{ t('debts.borrowed') }}
          </button>
        </div>

        <label class="field">
          <span>{{ t('debts.personName') }}</span>
          <input
            v-model="personName"
            type="text"
            maxlength="40"
            autocomplete="off"
            :placeholder="t('debts.namePlaceholder')"
          />
        </label>

        <label class="field">
          <span>{{ t('debts.amount') }} ({{ settingsStore.currencySymbol }})</span>
          <input
            v-model="amountStr"
            type="text"
            inputmode="decimal"
            autocomplete="off"
            placeholder="0.00"
          />
        </label>

        <label class="field">
          <span>{{ t('debts.dueDate') }} ({{ t('common.optional') }})</span>
          <button type="button" class="date-picker-btn" @click="datePickerOpen = true">
            <IconByName name="calendar" :size="16" />
            <span>{{ dueDateLabel }}</span>
          </button>
        </label>

        <label class="field">
          <span>{{ t('debts.noteOptional') }}</span>
          <input
            v-model="note"
            type="text"
            maxlength="120"
            :placeholder="t('debts.notePlaceholder')"
          />
        </label>

        <p v-if="error" class="error-msg" role="alert">{{ error }}</p>

        <div class="form-actions">
          <button type="button" class="cancel-btn" @click="emit('close')">
            {{ t('common.cancel') }}
          </button>
          <AppButton type="submit" :disabled="isSubmitting">
            {{ t('common.save') }}
          </AppButton>
        </div>
      </form>
    </div>
  </div>

  <DatePickerModal v-model="dueDate" :open="datePickerOpen" @close="datePickerOpen = false" />
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-4);
}

.modal-card {
  width: 100%;
  max-width: 440px;
  border-radius: var(--radius-xl);
  padding: var(--space-5);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.modal-title {
  font-family: var(--font-display);
  font-size: var(--text-title);
  font-weight: 600;
  margin: 0;
  color: var(--color-on-surface);
}

.icon-btn {
  background: none;
  border: none;
  color: var(--color-muted);
  cursor: pointer;
  padding: 4px;
}

.modal-body {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.seg {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-1);
  padding: var(--space-1);
  background: var(--color-surface-container);
  border-radius: var(--radius-full);
}

.seg button {
  min-height: 36px;
  border-radius: var(--radius-full);
  font-weight: 600;
  font-size: var(--text-label);
  color: var(--color-muted);
  background: transparent;
  border: none;
  cursor: pointer;
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

.field input,
.date-picker-btn {
  width: 100%;
  min-height: 44px;
  padding: 0 var(--space-3);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-outline-variant);
  background: var(--color-surface-container);
  color: var(--color-on-surface);
  font-size: var(--text-body);
  text-align: left;
  display: flex;
  align-items: center;
  cursor: pointer;
  transition: border-color var(--duration-fast), background var(--duration-fast);
}

.field input:focus,
.date-picker-btn:hover {
  outline: none;
  border-color: var(--color-primary);
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: var(--space-3);
  margin-top: var(--space-2);
}

.cancel-btn {
  background: transparent;
  border: none;
  color: var(--color-muted);
  font-weight: 600;
  font-size: var(--text-label);
  cursor: pointer;
  padding: 8px 12px;
}

.date-picker-btn {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.error-msg {
  font-size: var(--text-caption);
  font-weight: 600;
  color: var(--color-error);
}
</style>
