import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUiStore = defineStore('ui', () => {
  const searchOpen = ref(false)
  const menuOpen = ref(false)
  return { searchOpen, menuOpen }
})
