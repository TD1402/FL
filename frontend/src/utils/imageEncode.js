/**
 * Chuẩn bị ảnh trước khi upload lên Apps Script (body JSON base64 → càng nhỏ càng nhanh):
 *  - Thu nhỏ cạnh dài ≤ maxSize (mặc định 1600px — đủ cho ảnh sản phẩm/zoom).
 *  - Mã hoá JPEG chất lượng 0.82, nền trắng (PNG/ảnh chụp màn hình nặng vài MB → ~150–250KB).
 *    Không dùng WebP: thumbnail Google Drive (lh3) và crawler Zalo/Facebook (og:image) hỗ trợ JPEG chắc chắn nhất.
 *  - Ảnh đã nhỏ sẵn (≤ 300KB, JPEG/WebP, không quá maxSize) → gửi nguyên bản, không nén lại.
 *  - Dùng createImageBitmap (giải mã ngoài luồng chính, xoay theo EXIF) + canvas.toBlob (bất đồng bộ).
 */
const SMALL_ENOUGH = 300 * 1024
const QUALITY = 0.82

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onerror = () => reject(new Error('Không đọc được ảnh'))
    r.onload = () => resolve(String(r.result).split(',')[1])
    r.readAsDataURL(blob)
  })
}

async function decode(file) {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' })
    } catch {
      /* thử cách cũ bên dưới (vd HEIC trên Safari) */
    }
  }
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    return img
  } catch {
    throw new Error(`${file.name}: không phải ảnh hợp lệ`)
  } finally {
    URL.revokeObjectURL(url)
  }
}

const toBlob = (canvas, type, quality) => new Promise((resolve) => canvas.toBlob(resolve, type, quality))

/**
 * @param {File} file
 * @returns {Promise<{base64: string, mimeType: string, bytes: number}>}
 */
export async function prepareImage(file, maxSize = 1600) {
  if (file.type === 'image/gif') {
    return { base64: await blobToBase64(file), mimeType: file.type, bytes: file.size }
  }
  const img = await decode(file)
  const w = img.width
  const h = img.height
  const scale = Math.min(1, maxSize / Math.max(w, h))

  if (scale === 1 && file.size <= SMALL_ENOUGH && /^image\/(jpeg|webp)$/.test(file.type)) {
    img.close?.()
    return { base64: await blobToBase64(file), mimeType: file.type, bytes: file.size }
  }

  const canvas = document.createElement('canvas')
  canvas.width = Math.round(w * scale)
  canvas.height = Math.round(h * scale)
  const ctx = canvas.getContext('2d')
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  img.close?.()

  // Phủ nền trắng phía sau để vùng trong suốt (PNG) không thành màu đen khi chuyển JPEG
  ctx.globalCompositeOperation = 'destination-over'
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  const blob = await toBlob(canvas, 'image/jpeg', QUALITY)
  if (!blob) throw new Error(`${file.name}: không nén được ảnh`)
  // Ảnh gốc đã nhỏ hơn bản nén lại (hiếm) → dùng ảnh gốc
  if (scale === 1 && file.size < blob.size && /^image\/(jpeg|webp|png)$/.test(file.type)) {
    return { base64: await blobToBase64(file), mimeType: file.type, bytes: file.size }
  }
  return { base64: await blobToBase64(blob), mimeType: blob.type, bytes: blob.size }
}
