<script setup>
import { computed, watch } from 'vue'
import { useSettingsStore } from '@/stores/settings'
import { addDays, availableSlots, earliestDate, nowInVN } from '@/utils/delivery'

const date = defineModel('date', { type: String, default: '' })
const slot = defineModel('slot', { type: String, default: '' })
defineProps({ error: String })

const settings = useSettingsStore()
const minDate = computed(() => earliestDate(settings.timeSlots, settings.prepHours))
const maxDate = computed(() => addDays(nowInVN().date, 90))
const slots = computed(() => settings.timeSlots)
const available = computed(() =>
  availableSlots(date.value, settings.timeSlots, settings.prepHours).map((s) => s.label),
)

// Ngày đã qua / khung giờ hết hạn → tự điều chỉnh
watch(
  [date, minDate],
  () => {
    if (date.value && date.value < minDate.value) date.value = minDate.value
    if (slot.value && !available.value.includes(slot.value)) slot.value = ''
  },
  { immediate: true },
)
</script>

<template>
  <div>
    <div class="grid gap-3 sm:grid-cols-[180px_1fr]">
      <div>
        <label class="label" for="delivery-date">Ngày giao</label>
        <input id="delivery-date" v-model="date" type="date" class="input" :min="minDate" :max="maxDate" />
      </div>
      <div>
        <p class="label">Khung giờ</p>
        <div class="grid grid-cols-3 gap-2">
          <button
            v-for="s in slots"
            :key="s.label"
            type="button"
            class="h-12 border text-xs transition-colors disabled:cursor-not-allowed disabled:text-[#c4c4c4] disabled:line-through"
            :class="slot === s.label ? 'border-ink bg-ink text-white' : 'border-line hover:border-ink'"
            :disabled="!date || !available.includes(s.label)"
            @click="slot = s.label"
          >
            {{ s.label.replace(':00', 'h').replace(':00', 'h').replace(' - ', '–') }}
          </button>
        </div>
      </div>
    </div>
    <p v-if="error" class="mt-1.5 text-xs text-accent">{{ error }}</p>
    <p v-else-if="date === minDate && date === nowInVN().date" class="mt-1.5 text-xs text-muted">
      Đặt trong ngày: cần tối thiểu {{ settings.prepHours }} giờ để chuẩn bị hoa.
    </p>
  </div>
</template>
