<script setup>
/** Bộ icon nét mảnh (stroke 1.5) — inline SVG, không phụ thuộc thư viện ngoài. */
defineProps({
  name: { type: String, required: true },
  size: { type: [Number, String], default: 20 },
})

const paths = {
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm9 16-4.35-4.35',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0',
  heart:
    'M12 20s-7-4.35-9.33-8.87C1.1 8.06 2.9 4.5 6.4 4.5c2.1 0 3.6 1.3 4.33 2.6h2.54c.73-1.3 2.23-2.6 4.33-2.6 3.5 0 5.3 3.56 3.73 6.63C19 15.65 12 20 12 20Z',
  bag: 'M6 7h12l1 13H5L6 7Zm3 0V6a3 3 0 0 1 6 0v1',
  menu: 'M3 7h18M3 12h18M3 17h18',
  close: 'M6 6l12 12M18 6 6 18',
  'chevron-left': 'm15 5-7 7 7 7',
  'chevron-right': 'm9 5 7 7-7 7',
  'chevron-down': 'm5 9 7 7 7-7',
  'chevron-up': 'm5 15 7-7 7 7',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  phone: 'M5 4h3l2 5-2.5 1.5a11 11 0 0 0 6 6L15 14l5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z',
  chat: 'M4 5h16v11H8l-4 4V5Z',
  'arrow-up': 'M12 19V5m-6 6 6-6 6 6',
  'arrow-right': 'M5 12h14m-6-6 6 6-6 6',
  truck:
    'M3 6h11v10H3V6Zm11 4h4l3 3v3h-7v-6ZM7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm10 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z',
  flower:
    'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm0-6a3 3 0 0 1 0 6 3 3 0 0 1 0-6Zm0 12a3 3 0 0 1 0 6 3 3 0 0 1 0-6ZM3 12a3 3 0 0 1 6 0 3 3 0 0 1-6 0Zm12 0a3 3 0 0 1 6 0 3 3 0 0 1-6 0Z',
  card: 'M3 6h18v12H3V6Zm0 4h18',
  gift: 'M4 11h16v9H4v-9Zm-1-4h18v4H3V7Zm9 0v13M12 7S10 3 7.5 3.5 7 7 12 7Zm0 0s2-4 4.5-3.5S17 7 12 7Z',
  refresh: 'M20 11a8 8 0 0 0-14.9-4M4 4v4h4m-4 5a8 8 0 0 0 14.9 4M20 20v-4h-4',
  check: 'm5 12 5 5 9-10',
  trash: 'M4 7h16M10 11v6m4-6v6M6 7l1 13h10l1-13M9 7V4h6v3',
  edit: 'M4 20h4L19 9l-4-4L4 16v4Zm9-13 4 4',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  upload: 'M12 16V4m-5 5 5-5 5 5M4 16v4h16v-4',
  logout: 'M15 4h4v16h-4M10 8l-4 4 4 4m-4-4h11',
  grid: 'M4 4h7v7H4V4Zm9 0h7v7h-7V4ZM4 13h7v7H4v-7Zm9 0h7v7h-7v-7Z',
  box: 'm12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Zm0 9 8-4.5M12 12v9m0-9L4 7.5',
  tag: 'M3 12V4h8l10 10-8 8L3 12Zm5-4h.01',
  image: 'M4 5h16v14H4V5Zm0 11 5-5 4 4 2-2 5 5M15 9h.01',
  settings:
    'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3a7.4 7.4 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7.5 7.5 0 0 0-2-1.2L14.5 3h-5l-.4 2.6a7.5 7.5 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1c.6.5 1.3.9 2 1.2l.4 2.6h5l.4-2.6c.7-.3 1.4-.7 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2Z',
  mail: 'M3 6h18v12H3V6Zm0 0 9 7 9-7',
  print: 'M7 9V3h10v6M7 17H4V9h16v8h-3M7 14h10v7H7v-7Z',
  filter: 'M4 6h16M7 12h10M10 18h4',
  list: 'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-13v4l3 2',
  pin: 'M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12Zm0-9a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  facebook: 'M14 8h3V4h-3a4 4 0 0 0-4 4v3H7v4h3v6h4v-6h3l1-4h-4V8Z',
  instagram:
    'M4 8a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v8a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V8Zm8 8a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm5-9.5h.01',
  tiktok: 'M14 4v10.5a3.5 3.5 0 1 1-3-3.46M14 4c.5 2.5 2.2 4 5 4',
}
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.5"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path :d="paths[name] || ''" />
  </svg>
</template>
