<script setup>
import { reactive, ref } from 'vue'
import { submitContact } from '@/api/shop'
import { useSettingsStore } from '@/stores/settings'
import { siteUrl, useSeo } from '@/composables/useSeo'
import { floristSchema } from '@/seo/schema'
import { toast } from '@/composables/useToast'
import { isPhone } from '@/utils/validate'
import AppIcon from '@/components/ui/AppIcon.vue'

const settings = useSettingsStore()
useSeo(() => ({
  title: 'Liên hệ đặt hoa',
  description: `Liên hệ ${settings.shopName} đặt hoa theo yêu cầu, hoa sự kiện, hoa cưới. Hotline ${settings.data.hotline || ''} · ${settings.data.address || ''}`,
  jsonLd: [floristSchema(settings.data, siteUrl())],
}))
const form = reactive({ name: '', phone: '', message: '', website: '' })
const errors = reactive({})
const loading = ref(false)
const sent = ref(false)

async function submit() {
  Object.keys(errors).forEach((k) => delete errors[k])
  if (!form.name.trim()) errors.name = 'Vui lòng nhập họ tên'
  if (!isPhone(form.phone)) errors.phone = 'Số điện thoại không hợp lệ'
  if (form.message.trim().length < 5) errors.message = 'Vui lòng nhập nội dung'
  if (Object.keys(errors).length) return
  loading.value = true
  try {
    await submitContact({ ...form })
    sent.value = true
    toast.success('Đã gửi yêu cầu, chúng tôi sẽ liên hệ sớm!')
    Object.assign(form, { name: '', phone: '', message: '' })
  } catch {
    /* toast đã hiển thị */
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="container-x pb-16 pt-8 md:pt-12">
    <h1 class="text-center font-serif text-3xl uppercase tracking-[0.08em] md:text-5xl">Liên hệ</h1>
    <p class="mx-auto mt-3 max-w-xl text-center text-sm text-muted">
      Đặt hoa theo yêu cầu, hoa sự kiện, hoa cưới hay cần tư vấn chọn hoa — hãy để lại lời nhắn,
      {{ settings.shopName }} sẽ gọi lại cho bạn.
    </p>

    <div class="mt-12 grid gap-12 lg:grid-cols-[1fr_1.3fr] lg:gap-20">
      <div class="space-y-6 text-sm">
        <div v-if="settings.data.address" class="flex gap-4">
          <AppIcon name="pin" class="shrink-0" />
          <div>
            <p class="label">Địa chỉ</p>
            <p>{{ settings.data.address }}</p>
          </div>
        </div>
        <div v-if="settings.data.hotline" class="flex gap-4">
          <AppIcon name="phone" class="shrink-0" />
          <div>
            <p class="label">Hotline</p>
            <a :href="`tel:${settings.data.hotline}`" class="hover:text-accent">{{
              settings.data.hotline
            }}</a>
          </div>
        </div>
        <div v-if="settings.data.email" class="flex gap-4">
          <AppIcon name="mail" class="shrink-0" />
          <div>
            <p class="label">Email</p>
            <a :href="`mailto:${settings.data.email}`" class="hover:text-accent">{{ settings.data.email }}</a>
          </div>
        </div>
        <div v-if="settings.data.open_hours" class="flex gap-4">
          <AppIcon name="clock" class="shrink-0" />
          <div>
            <p class="label">Giờ mở cửa</p>
            <p>{{ settings.data.open_hours }}</p>
          </div>
        </div>
        <a
          v-if="settings.data.zalo"
          :href="`https://zalo.me/${settings.data.zalo}`"
          target="_blank"
          rel="noopener"
          class="btn-outline mt-4"
          >Chat Zalo với shop</a
        >
      </div>

      <div>
        <div v-if="sent" class="bg-cream p-8 text-center">
          <p class="font-serif text-2xl">Cảm ơn bạn!</p>
          <p class="mt-2 text-sm text-muted">
            Chúng tôi đã nhận được yêu cầu và sẽ liên hệ trong thời gian sớm nhất.
          </p>
          <button class="link-caps mt-6" @click="sent = false">Gửi yêu cầu khác</button>
        </div>
        <form v-else class="space-y-4" novalidate @submit.prevent="submit">
          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <label class="label" for="ct-name">Họ và tên *</label>
              <input id="ct-name" v-model="form.name" class="input" :class="{ 'input-error': errors.name }" />
              <p v-if="errors.name" class="mt-1 text-xs text-accent">{{ errors.name }}</p>
            </div>
            <div>
              <label class="label" for="ct-phone">Số điện thoại *</label>
              <input
                id="ct-phone"
                v-model="form.phone"
                type="tel"
                class="input"
                :class="{ 'input-error': errors.phone }"
              />
              <p v-if="errors.phone" class="mt-1 text-xs text-accent">{{ errors.phone }}</p>
            </div>
          </div>
          <div>
            <label class="label" for="ct-msg">Nội dung *</label>
            <textarea
              id="ct-msg"
              v-model="form.message"
              rows="6"
              maxlength="2000"
              class="input"
              :class="{ 'input-error': errors.message }"
              placeholder="Mô tả mẫu hoa, ngân sách, ngày giao…"
            />
            <p v-if="errors.message" class="mt-1 text-xs text-accent">{{ errors.message }}</p>
          </div>
          <input
            v-model="form.website"
            type="text"
            tabindex="-1"
            autocomplete="off"
            class="hidden"
            aria-hidden="true"
          />
          <button class="btn-primary w-full sm:w-auto" :disabled="loading">
            {{ loading ? 'Đang gửi…' : 'Gửi yêu cầu' }}
          </button>
        </form>
      </div>
    </div>
  </div>
</template>
