export const ORDER_STATUS = {
  new: { label: 'Mới', class: 'bg-blue-50 text-blue-700' },
  confirmed: { label: 'Đã xác nhận', class: 'bg-amber-50 text-amber-700' },
  delivering: { label: 'Đang giao', class: 'bg-violet-50 text-violet-700' },
  done: { label: 'Hoàn thành', class: 'bg-emerald-50 text-emerald-700' },
  cancelled: { label: 'Đã huỷ', class: 'bg-neutral-100 text-neutral-500 line-through' },
}

export const PAYMENT_STATUS = {
  unpaid: { label: 'Chưa thanh toán', class: 'bg-neutral-100 text-neutral-600' },
  paid: { label: 'Đã thanh toán', class: 'bg-emerald-50 text-emerald-700' },
  refunded: { label: 'Đã hoàn tiền', class: 'bg-rose-50 text-rose-700' },
}

export const CONTACT_STATUS = {
  new: { label: 'Mới', class: 'bg-blue-50 text-blue-700' },
  processing: { label: 'Đang xử lý', class: 'bg-amber-50 text-amber-700' },
  done: { label: 'Đã xử lý', class: 'bg-emerald-50 text-emerald-700' },
}
