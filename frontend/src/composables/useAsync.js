import { ref, shallowRef } from 'vue'

/**
 * Trạng thái loading / lỗi / dữ liệu cho một hàm async.
 * Gọi run() nhiều lần: chỉ kết quả của lần gọi cuối được ghi nhận.
 */
export function useAsync(fn, { immediate = false, initial = null } = {}) {
  const data = shallowRef(initial)
  const loading = ref(immediate)
  const error = ref('')
  let callId = 0

  async function run(...args) {
    const id = ++callId
    loading.value = true
    error.value = ''
    try {
      const result = await fn(...args)
      if (id === callId) data.value = result
      return result
    } catch (e) {
      if (id === callId) error.value = e.message || 'Đã có lỗi xảy ra'
    } finally {
      if (id === callId) loading.value = false
    }
  }

  if (immediate) run()
  return { data, loading, error, run }
}
