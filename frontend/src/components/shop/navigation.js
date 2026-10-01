/** Loại hoa (thành phần) hiển thị trong menu "LOẠI HOA" — lọc theo cột `flowers`. */
export const FLOWER_TYPES = [
  'Hoa hồng',
  'Hướng dương',
  'Tulip',
  'Lan hồ điệp',
  'Cẩm tú cầu',
  'Cát tường',
  'Baby',
  'Lavender',
]

/** Cấu hình menu chính; `mega` là key nhóm danh mục hiển thị trong mega menu. */
export const NAV_ITEMS = [
  { label: 'Hoa mới', to: '/hang-moi' },
  { label: 'Bán chạy', to: '/ban-chay' },
  { label: 'Bộ sưu tập', to: '/danh-muc/bo-suu-tap', mega: 'collections' },
  { label: 'Hoa theo dịp', to: '/danh-muc/hoa-theo-dip', mega: 'occasions' },
  { label: 'Loại hoa', to: '/danh-muc/kieu-dang', mega: 'types' },
  { label: 'Liên hệ', to: '/lien-he' },
]
