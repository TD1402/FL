<script setup>
import { ref, watch } from 'vue'
import { adminDelete, adminList, adminSave } from '@/api/admin'
import { formatDateTime } from '@/utils/format'
import { CONTACT_STATUS } from '@/components/admin/constants'
import AppIcon from '@/components/ui/AppIcon.vue'
import AppPagination from '@/components/ui/AppPagination.vue'

const status = ref('')
const page = ref(1)
const items = ref([])
const total = ref(0)
const loading = ref(false)
const error = ref('')
const LIMIT = 20

async function load() {
  loading.value = true
  error.value = ''
  try {
    const r = await adminList('contacts', {
      filters: { status: status.value },
      page: page.value,
      limit: LIMIT,
    })
    items.value = r.items
    total.value = r.total
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}
watch(status, () => (page.value === 1 ? load() : (page.value = 1)))
watch(page, load, { immediate: true })

async function setStatus(c, s) {
  await adminSave('contacts', { id: c.id, status: s }).catch(() => null)
  c.status = s
}
async function remove(c) {
  if (!confirm('Xoá liên hệ này?')) return
  await adminDelete('contacts', c.id).catch(() => null)
  load()
}
</script>

<template>
  <div>
    <div class="mb-6 flex flex-wrap items-center gap-3">
      <h1 class="mr-auto font-serif text-3xl">Liên hệ khách hàng</h1>
      <select v-model="status" class="input h-10 w-44">
        <option value="">Tất cả</option>
        <option v-for="(s, key) in CONTACT_STATUS" :key="key" :value="key">{{ s.label }}</option>
      </select>
    </div>
    <p v-if="error" class="text-accent">
      {{ error }} <button class="underline" @click="load">Thử lại</button>
    </p>
    <p v-else-if="loading && !items.length" class="text-muted">Đang tải…</p>
    <p v-else-if="!items.length" class="border border-line bg-white p-10 text-center text-muted">
      Chưa có liên hệ nào
    </p>
    <ul v-else class="space-y-3">
      <li v-for="c in items" :key="c.id" class="border border-line bg-white p-5">
        <div class="flex flex-wrap items-center gap-3">
          <p class="font-medium">{{ c.name }}</p>
          <a :href="`tel:${c.phone}`" class="text-sm underline">{{ c.phone }}</a>
          <a
            :href="`https://zalo.me/${c.phone}`"
            target="_blank"
            rel="noopener"
            class="text-xs text-muted underline"
            >Zalo</a
          >
          <span class="ml-auto text-xs text-muted">{{ formatDateTime(c.created_at) }}</span>
        </div>
        <p class="mt-3 whitespace-pre-line text-sm text-[#333]">{{ c.message }}</p>
        <div class="mt-4 flex items-center gap-2">
          <select
            :value="c.status"
            class="h-8 border border-line bg-white px-2 text-xs"
            @change="setStatus(c, $event.target.value)"
          >
            <option v-for="(s, key) in CONTACT_STATUS" :key="key" :value="key">{{ s.label }}</option>
          </select>
          <button class="ml-auto p-1.5 text-muted hover:text-accent" aria-label="Xoá" @click="remove(c)">
            <AppIcon name="trash" :size="16" />
          </button>
        </div>
      </li>
    </ul>
    <AppPagination v-model="page" :total="total" :limit="LIMIT" class="mt-6" />
  </div>
</template>
