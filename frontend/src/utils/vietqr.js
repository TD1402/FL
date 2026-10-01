/**
 * Ảnh QR chuyển khoản VietQR (img.vietqr.io) — nội dung CK là mã đơn hàng.
 * bankId: mã ngân hàng theo VietQR (VCB, TCB, MB, ACB, ...)
 */
export function vietQrUrl({ bankId, accountNo, accountName, amount, addInfo }) {
  if (!bankId || !accountNo) return ''
  const q = new URLSearchParams({
    amount: String(amount || ''),
    addInfo: addInfo || '',
    accountName: accountName || '',
  })
  return `https://img.vietqr.io/image/${encodeURIComponent(bankId)}-${encodeURIComponent(accountNo)}-compact2.png?${q}`
}
