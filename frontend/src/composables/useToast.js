import { reactive } from 'vue'

/** Danh sách toast dùng chung toàn app. */
export const toasts = reactive([])
let seq = 0

function push(type, message, timeout = 3500) {
  const id = ++seq
  toasts.push({ id, type, message })
  setTimeout(() => dismiss(id), timeout)
  return id
}

export function dismiss(id) {
  const i = toasts.findIndex((t) => t.id === id)
  if (i >= 0) toasts.splice(i, 1)
}

export const toast = {
  success: (m) => push('success', m),
  error: (m) => push('error', m, 5000),
  info: (m) => push('info', m),
}

export function useToast() {
  return toast
}
