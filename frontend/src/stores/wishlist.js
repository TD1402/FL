import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { toast } from '@/composables/useToast'

/** Danh sách yêu thích (localStorage) — lưu bản tóm tắt sản phẩm để hiển thị không cần gọi API. */
export const useWishlistStore = defineStore(
  'wishlist',
  () => {
    const items = ref([])
    const count = computed(() => items.value.length)
    const has = (id) => items.value.some((p) => p.id === id)

    function toggle(p) {
      if (has(p.id)) {
        items.value = items.value.filter((x) => x.id !== p.id)
        toast.info('Đã bỏ khỏi danh sách yêu thích')
      } else {
        const { id, slug, name, images, price, sale_price, sizes, is_new, stock } = p
        items.value.unshift({
          id,
          slug,
          name,
          images: (images || []).slice(0, 2),
          price,
          sale_price,
          sizes,
          is_new,
          stock,
        })
        toast.success('Đã thêm vào danh sách yêu thích')
      }
    }

    return { items, count, has, toggle }
  },
  { persist: true },
)
