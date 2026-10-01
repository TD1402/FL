<script setup>
import { useSettingsStore } from '@/stores/settings'
import AppIcon from '@/components/ui/AppIcon.vue'
import NewsletterForm from './NewsletterForm.vue'

const settings = useSettingsStore()
const year = new Date().getFullYear()
</script>

<template>
  <footer class="bg-cream">
    <div class="container-x grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4 lg:py-20">
      <div>
        <p class="caps mb-5 font-medium">Hỗ trợ khách hàng</p>
        <ul class="space-y-3 text-sm text-muted">
          <li>
            <RouterLink to="/chinh-sach-giao-hang" class="hover:text-ink">Chính sách giao hàng</RouterLink>
          </li>
          <li><RouterLink to="/chinh-sach-doi-tra" class="hover:text-ink">Chính sách đổi trả</RouterLink></li>
          <li><RouterLink to="/chinh-sach-bao-mat" class="hover:text-ink">Chính sách bảo mật</RouterLink></li>
          <li><RouterLink to="/tra-cuu-don" class="hover:text-ink">Tra cứu đơn hàng</RouterLink></li>
          <li><RouterLink to="/lien-he" class="hover:text-ink">Liên hệ</RouterLink></li>
        </ul>
      </div>
      <div>
        <p class="caps mb-5 font-medium">Về chúng tôi</p>
        <ul class="space-y-3 text-sm text-muted">
          <li>
            <RouterLink to="/gioi-thieu" class="hover:text-ink"
              >Câu chuyện {{ settings.shopName }}</RouterLink
            >
          </li>
          <li><RouterLink to="/hang-moi" class="hover:text-ink">Hoa mới</RouterLink></li>
          <li><RouterLink to="/ban-chay" class="hover:text-ink">Bán chạy</RouterLink></li>
          <li><RouterLink to="/lien-he" class="hover:text-ink">Đặt hoa theo yêu cầu</RouterLink></li>
        </ul>
      </div>
      <div>
        <p class="caps mb-5 font-medium">Đăng ký nhận tin</p>
        <p class="mb-4 text-sm text-muted">Nhận ưu đãi độc quyền và cảm hứng hoa mỗi tuần.</p>
        <NewsletterForm />
      </div>
      <div>
        <p class="caps mb-5 font-medium">Kết nối</p>
        <div class="flex gap-2">
          <a
            v-if="settings.data.facebook"
            :href="settings.data.facebook"
            target="_blank"
            rel="noopener"
            aria-label="Facebook"
            class="flex h-10 w-10 items-center justify-center border border-ink/20 hover:border-ink"
            ><AppIcon name="facebook" :size="18"
          /></a>
          <a
            v-if="settings.data.instagram"
            :href="settings.data.instagram"
            target="_blank"
            rel="noopener"
            aria-label="Instagram"
            class="flex h-10 w-10 items-center justify-center border border-ink/20 hover:border-ink"
            ><AppIcon name="instagram" :size="18"
          /></a>
          <a
            v-if="settings.data.zalo"
            :href="`https://zalo.me/${settings.data.zalo}`"
            target="_blank"
            rel="noopener"
            aria-label="Zalo"
            class="flex h-10 w-10 items-center justify-center border border-ink/20 text-[11px] font-semibold hover:border-ink"
            >Zalo</a
          >
          <a
            v-if="settings.data.tiktok"
            :href="settings.data.tiktok"
            target="_blank"
            rel="noopener"
            aria-label="TikTok"
            class="flex h-10 w-10 items-center justify-center border border-ink/20 hover:border-ink"
            ><AppIcon name="tiktok" :size="18"
          /></a>
        </div>
        <ul class="mt-6 space-y-2 text-sm text-muted">
          <li v-if="settings.data.hotline" class="flex gap-2">
            <AppIcon name="phone" :size="16" class="mt-0.5 shrink-0" /><a
              :href="`tel:${settings.data.hotline}`"
              class="hover:text-ink"
              >{{ settings.data.hotline }}</a
            >
          </li>
          <li v-if="settings.data.email" class="flex gap-2">
            <AppIcon name="mail" :size="16" class="mt-0.5 shrink-0" /><a
              :href="`mailto:${settings.data.email}`"
              class="hover:text-ink"
              >{{ settings.data.email }}</a
            >
          </li>
          <li v-if="settings.data.open_hours" class="flex gap-2">
            <AppIcon name="clock" :size="16" class="mt-0.5 shrink-0" />{{ settings.data.open_hours }}
          </li>
        </ul>
      </div>
    </div>
    <div class="border-t border-ink/10">
      <div
        class="container-x flex flex-col gap-2 py-6 text-xs text-muted md:flex-row md:items-center md:justify-between"
      >
        <p>
          <span class="text-ink">{{ settings.data.company_name || settings.shopName }}</span>
          <template v-if="settings.data.address"> · {{ settings.data.address }}</template>
          <template v-if="settings.data.hotline"> · Hotline {{ settings.data.hotline }}</template>
          <template v-if="settings.data.open_hours"> · {{ settings.data.open_hours }}</template>
        </p>
        <p>© {{ year }} {{ settings.shopName }}. All rights reserved.</p>
      </div>
    </div>
  </footer>
</template>
