<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getProducts } from '@/api/shop'
import { useSettingsStore } from '@/stores/settings'
import { siteUrl, useSeo } from '@/composables/useSeo'
import { breadcrumbSchema, categoryDescription, itemListSchema } from '@/seo/schema'
import AppBreadcrumb from '@/components/ui/AppBreadcrumb.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import AppModal from '@/components/ui/AppModal.vue'
import StateBlock from '@/components/ui/StateBlock.vue'
import ProductGrid from '@/components/shop/ProductGrid.vue'
import ProductFilters from '@/components/shop/ProductFilters.vue'

/**
 * Trang danh sách dùng chung cho: danh mục, bộ sưu tập, hàng mới, bán chạy, tất cả, tìm kiếm.
 * Bộ lọc & sắp xếp nằm trên query string để chia sẻ được link.
 */
const props = defineProps({
  mode: { type: String, required: true }, // category | collection | new | best | all | search
  slug: String,
})

const PAGE_SIZE = 12
const SORTS = [
  { value: 'newest', label: 'Mới nhất' },
  { value: 'best_seller', label: 'Bán chạy' },
  { value: 'price_asc', label: 'Giá tăng dần' },
  { value: 'price_desc', label: 'Giá giảm dần' },
]

const route = useRoute()
const router = useRouter()
const settings = useSettingsStore()

const items = ref([])
const total = ref(0)
const page = ref(1)
const facets = ref({})
const loading = ref(false)
const error = ref('')
const filterOpen = ref(false)
const searchInput = ref(String(route.query.q || ''))

const asList = (v) => (v ? String(v).split(',').filter(Boolean) : [])
const filters = computed({
  get: () => ({
    price: String(route.query.price || ''),
    color: asList(route.query.color),
    flower: asList(route.query.flower),
  }),
  set: (f) =>
    router.replace({
      query: {
        ...route.query,
        price: f.price || undefined,
        color: f.color.length ? f.color.join(',') : undefined,
        flower: f.flower.length ? f.flower.join(',') : undefined,
      },
    }),
})
const sort = computed({
  get: () => String(route.query.sort || (props.mode === 'best' ? 'best_seller' : 'newest')),
  set: (v) => router.replace({ query: { ...route.query, sort: v } }),
})
const activeFilterCount = computed(
  () => (filters.value.price ? 1 : 0) + filters.value.color.length + filters.value.flower.length,
)

const category = computed(() => (props.slug ? settings.findCategory(props.slug) : null))
const parent = computed(() =>
  category.value?.parent_id ? settings.flatCategories.find((c) => c.id === category.value.parent_id) : null,
)
const title = computed(() => {
  const q = route.query.q
  return (
    {
      category: category.value?.name || 'Danh mục',
      collection: category.value?.name || 'Bộ sưu tập',
      new: 'Hoa mới',
      best: 'Bán chạy',
      all: route.query.flower && !route.query.color ? String(route.query.flower) : 'Tất cả sản phẩm',
      search: q ? `Kết quả cho “${q}”` : 'Tìm kiếm',
    }[props.mode] || ''
  )
})
const crumbs = computed(() => {
  const out = []
  if (parent.value) out.push({ label: parent.value.name, to: `/danh-muc/${parent.value.slug}` })
  out.push({ label: title.value })
  return out
})

/** Bộ sưu tập truy cập được qua cả /danh-muc/:slug và /bo-suu-tap/:slug → canonical về /bo-suu-tap. */
const canonicalPath = computed(() => {
  if (props.mode === 'category' && parent.value?.slug === 'bo-suu-tap') return `/bo-suu-tap/${props.slug}`
  return route.path
})
useSeo(() => {
  const name = props.mode === 'all' ? 'Hoa tươi' : title.value
  return {
    title: title.value,
    description: categoryDescription(name, settings.shopName),
    image: items.value[0]?.images?.[0],
    path: canonicalPath.value,
    noindex: props.mode === 'search' || (props.mode !== 'all' && !!error.value),
    jsonLd: [
      breadcrumbSchema(
        crumbs.value.map((c) => ({ name: c.label, path: c.to || canonicalPath.value })),
        siteUrl(),
      ),
      items.value.length ? itemListSchema(items.value, siteUrl()) : null,
    ],
  }
})

function buildParams(p) {
  const f = filters.value
  const [minPrice, maxPrice] = (f.price || '').split('-').map(Number)
  const params = {
    sort: sort.value,
    page: p,
    limit: PAGE_SIZE,
    minPrice: minPrice || undefined,
    maxPrice: maxPrice || undefined,
    color: f.color.join(',') || undefined,
    flower: f.flower.join(',') || undefined,
    q: route.query.q || undefined,
  }
  if (props.mode === 'category') params.category = props.slug
  if (props.mode === 'collection') params.collection = props.slug
  if (props.mode === 'new') params.isNew = true
  if (props.mode === 'best') params.isBestSeller = true
  return params
}

let seq = 0
async function load(p = 1) {
  const id = ++seq
  loading.value = true
  error.value = ''
  if (p === 1) items.value = []
  try {
    const r = await getProducts(buildParams(p), { silent: true })
    if (id !== seq) return
    items.value = p === 1 ? r.items : [...items.value, ...r.items]
    total.value = r.total
    page.value = r.page
    if (p === 1) facets.value = r.facets || {}
  } catch (e) {
    if (id === seq) error.value = e.message
  } finally {
    if (id === seq) loading.value = false
  }
}

watch(
  () => [props.mode, props.slug, route.query],
  () => {
    searchInput.value = String(route.query.q || '')
    if (props.mode === 'search' && !route.query.q) {
      items.value = []
      total.value = 0
      return
    }
    load(1)
  },
  { immediate: true, deep: true },
)

function submitSearch() {
  router.replace({ query: { ...route.query, q: searchInput.value.trim() || undefined } })
}
function clearFilters() {
  filters.value = { price: '', color: [], flower: [] }
}
</script>

<template>
  <div class="container-x pb-16 pt-6 md:pt-10">
    <AppBreadcrumb :items="crumbs" />
    <header class="mb-8 mt-6 text-center md:mb-12">
      <h1 class="font-serif text-3xl uppercase tracking-[0.08em] md:text-5xl">{{ title }}</h1>
      <p v-if="!loading || items.length" class="mt-3 text-sm text-muted">{{ total }} sản phẩm</p>
      <form
        v-if="mode === 'search'"
        class="mx-auto mt-6 flex max-w-lg"
        role="search"
        @submit.prevent="submitSearch"
      >
        <input
          v-model="searchInput"
          type="search"
          class="input"
          placeholder="Nhập tên hoa, dịp tặng…"
          aria-label="Từ khoá"
        />
        <button class="btn-primary shrink-0 px-5" aria-label="Tìm">
          <AppIcon name="search" :size="18" />
        </button>
      </form>
    </header>

    <div class="lg:grid lg:grid-cols-[220px_1fr] lg:gap-12">
      <aside class="hidden lg:block">
        <div class="sticky top-36">
          <ProductFilters v-model="filters" :facets="facets" />
          <button
            v-if="activeFilterCount"
            class="mt-8 text-xs text-muted underline hover:text-ink"
            @click="clearFilters"
          >
            Xoá bộ lọc
          </button>
        </div>
      </aside>

      <div>
        <div
          class="mb-6 flex items-center justify-between gap-3 border-y border-line py-3 lg:border-t-0 lg:pt-0"
        >
          <button class="caps flex items-center gap-2 lg:hidden" @click="filterOpen = true">
            <AppIcon name="filter" :size="16" /> Bộ lọc
            <span v-if="activeFilterCount">({{ activeFilterCount }})</span>
          </button>
          <p class="hidden text-sm text-muted lg:block">Hiển thị {{ items.length }} / {{ total }} sản phẩm</p>
          <label class="flex items-center gap-2 text-sm">
            <span class="caps hidden text-muted sm:inline">Sắp xếp</span>
            <select
              v-model="sort"
              class="cursor-pointer bg-transparent py-1 pr-1 text-sm outline-none"
              aria-label="Sắp xếp"
            >
              <option v-for="s in SORTS" :key="s.value" :value="s.value">{{ s.label }}</option>
            </select>
          </label>
        </div>

        <StateBlock v-if="error && !items.length" type="error" :message="error" @retry="load(1)" />
        <StateBlock
          v-else-if="!loading && !items.length"
          :title="mode === 'search' && !route.query.q ? 'Bạn muốn tìm hoa gì?' : 'Không có sản phẩm phù hợp'"
          :message="
            activeFilterCount
              ? 'Thử bỏ bớt bộ lọc để xem thêm sản phẩm.'
              : 'Hãy khám phá các bộ sưu tập khác của chúng tôi.'
          "
        >
          <button v-if="activeFilterCount" class="btn-outline" @click="clearFilters">Xoá bộ lọc</button>
          <RouterLink v-else to="/hang-moi" class="btn-outline">Xem hoa mới</RouterLink>
        </StateBlock>
        <template v-else>
          <ProductGrid :products="items" :loading="loading" :skeletons="items.length ? 4 : 8" />
          <div v-if="items.length < total" class="mt-12 text-center">
            <p class="mb-4 text-xs text-muted">Đã xem {{ items.length }} / {{ total }} sản phẩm</p>
            <button class="btn-outline min-w-56" :disabled="loading" @click="load(page + 1)">
              {{ loading ? 'Đang tải…' : 'Xem thêm' }}
            </button>
          </div>
        </template>
      </div>
    </div>

    <AppModal v-model:open="filterOpen" title="Bộ lọc">
      <ProductFilters v-model="filters" :facets="facets" />
      <div class="mt-8 grid grid-cols-2 gap-3">
        <button class="btn-outline px-2" @click="clearFilters">Xoá bộ lọc</button>
        <button class="btn-primary px-2" @click="filterOpen = false">Xem {{ total }} sản phẩm</button>
      </div>
    </AppModal>
  </div>
</template>
