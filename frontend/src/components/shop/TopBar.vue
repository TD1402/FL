<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useSettingsStore } from '@/stores/settings'

const settings = useSettingsStore()
const index = ref(0)
let timer
onMounted(() => {
  timer = setInterval(() => {
    const n = settings.topBarMessages.length
    if (n > 1) index.value = (index.value + 1) % n
  }, 4000)
})
onBeforeUnmount(() => clearInterval(timer))
</script>

<template>
  <div v-if="settings.topBarMessages.length" class="bg-ink text-white">
    <div class="container-x relative flex h-9 items-center justify-center overflow-hidden">
      <Transition name="fade" mode="out-in">
        <p :key="index" class="caps truncate text-[11px]">{{ settings.topBarMessages[index] }}</p>
      </Transition>
    </div>
  </div>
</template>
