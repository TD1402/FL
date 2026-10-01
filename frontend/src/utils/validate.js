export const PHONE_RE = /^(0|\+84)[35789][0-9]{8}$/
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export const isPhone = (v) => PHONE_RE.test(String(v || '').replace(/[\s.\-()]/g, ''))
export const isEmail = (v) => EMAIL_RE.test(String(v || '').trim())
