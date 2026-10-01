import { ref, watch } from 'vue'

export function useDebouncedRef(source, delay = 300) {
  const out = ref(source.value)
  let t
  watch(source, (v) => {
    clearTimeout(t)
    t = setTimeout(() => (out.value = v), delay)
  })
  return out
}
