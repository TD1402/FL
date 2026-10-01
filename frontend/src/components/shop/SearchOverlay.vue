<script setup>
import { nextTick, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { getProducts } from '@/api/shop'
import { useUiStore } from '@/stores/ui'
import { useDebouncedRef } from '@/composables/useDebounce'
import { formatPrice } from '@/utils/format'
import { fromPrice } from '@/utils/product'
import AppIcon from '@/components/ui/AppIcon.vue'
import AppImage from '@/components/ui/AppImage.vue'

const ui = useUiStore()
const router = useRouter()
const q = ref('')
const debounced = useDebouncedRef(q, 300)
const results = ref([])
const total = ref(0)
const loading = ref(false)
const input = ref(null)
const SUGGESTIONS = ['Hoa hồng', 'Hướng dương', 'Tulip', 'Lan hồ điệp', 'Khai trương', 'Pastel']

watch(
  () => ui.searchOpen,
  async (v) => {
    document.body.style.overflow = v ? 'hidden' : ''
    if (v) {
      await nextTick()
      input.value?.focus()
    }
  },
)

let seq = 0
watch(debounced, async (v) => {
  const term = v.trim()
  if (term.length < 2) {
    results.value = []
    total.value = 0
    return
  }
  const id = ++seq
  loading.value = true
  try {
    const r = await getProducts({ q: term, limit: 6 }, { silent: true })
    if (id === seq) {
      results.value = r.items
      total.value = r.total
    }
  } catch {
    if (id === seq) results.value = []
  } finally {
    if (id === seq) loading.value = false
  }
})

function close() {
  ui.searchOpen = false
}
function submit(term = q.value) {
  if (!term.trim()) return
  close()
  router.push({ name: 'search', query: { q: term.trim() } })
}
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="ui.searchOpen"
        class="fixed inset-0 z-[70] bg-black/40"
        @click.self="close"
        @keydown.esc="close"
      >
        <div class="bg-white">
          <div class="container-x py-6 md:py-10">
            <form
              class="flex items-center gap-3 border-b border-ink pb-3"
              role="search"
              @submit.prevent="submit()"
            >
              <AppIcon name="search" :size="22" />
              <input
                ref="input"
                v-model="q"
                type="search"
                placeholder="Tìm hoa, dịp tặng, màu sắc…"
                class="flex-1 bg-transparent font-serif text-xl outline-none placeholder:text-[#b5b5b5] md:text-3xl"
                aria-label="Từ khoá tìm kiếm"
              />
              <button type="button" class="p-1" aria-label="Đóng tìm kiếm" @click="close">
                <AppIcon name="close" :size="22" />
              </button>
            </form>

            <div v-if="q.trim().length < 2" class="mt-6">
              <p class="caps mb-3 text-muted">Tìm kiếm phổ biến</p>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="s in SUGGESTIONS"
                  :key="s"
                  class="border border-line px-4 py-2 text-sm hover:border-ink"
                  @click="submit(s)"
                >
                  {{ s }}
                </button>
              </div>
            </div>

            <div v-else class="mt-6 min-h-24">
              <div v-if="loading && !results.length" class="grid grid-cols-2 gap-4 md:grid-cols-6">
                <div v-for="i in 6" :key="i">
                  <div class="skeleton aspect-[3/4]" />
                  <div class="skeleton mt-2 h-4 w-3/4" />
                </div>
              </div>
              <p v-else-if="!results.length" class="text-sm text-muted">
                Không tìm thấy sản phẩm phù hợp với “{{ q }}”.
              </p>
              <template v-else>
                <div class="grid grid-cols-3 gap-3 md:grid-cols-6 md:gap-4">
                  <RouterLink
                    v-for="p in results"
                    :key="p.id"
                    :to="`/san-pham/${p.slug}`"
                    class="group"
                    @click="close"
                  >
                    <AppImage :src="p.images[0]" :alt="p.name" ratio="3/4" :width="300" />
                    <p class="mt-2 line-clamp-2 text-xs md:text-sm">{{ p.name }}</p>
                    <p class="text-xs font-medium md:text-sm">{{ formatPrice(fromPrice(p)) }}</p>
                  </RouterLink>
                </div>
                <button class="link-caps mt-6" @click="submit()">Xem tất cả {{ total }} kết quả</button>
              </template>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
