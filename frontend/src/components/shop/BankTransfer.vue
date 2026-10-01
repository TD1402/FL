<script setup>
import { computed } from 'vue'
import { useSettingsStore } from '@/stores/settings'
import { formatPrice } from '@/utils/format'
import { vietQrUrl } from '@/utils/vietqr'

const props = defineProps({ code: String, amount: Number })
const settings = useSettingsStore()
const s = computed(() => settings.data)
const qr = computed(() =>
  vietQrUrl({
    bankId: s.value.bank_id,
    accountNo: s.value.bank_account_no,
    accountName: s.value.bank_account_name,
    amount: props.amount,
    addInfo: props.code,
  }),
)
</script>

<template>
  <div class="grid items-center gap-6 bg-cream p-6 sm:grid-cols-[200px_1fr]">
    <img
      v-if="qr"
      :src="qr"
      :alt="`QR chuyển khoản ${code}`"
      width="200"
      height="200"
      class="mx-auto w-48 bg-white sm:w-full"
    />
    <dl class="space-y-2 text-sm">
      <div>
        <dt class="label mb-0">Ngân hàng</dt>
        <dd>{{ s.bank_name || s.bank_id }}</dd>
      </div>
      <div>
        <dt class="label mb-0">Số tài khoản</dt>
        <dd class="font-medium">{{ s.bank_account_no }}</dd>
      </div>
      <div>
        <dt class="label mb-0">Chủ tài khoản</dt>
        <dd>{{ s.bank_account_name }}</dd>
      </div>
      <div>
        <dt class="label mb-0">Số tiền</dt>
        <dd class="font-medium">{{ formatPrice(amount) }}</dd>
      </div>
      <div>
        <dt class="label mb-0">Nội dung chuyển khoản</dt>
        <dd class="font-mono text-base font-medium">{{ code }}</dd>
      </div>
    </dl>
  </div>
</template>
