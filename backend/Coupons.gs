/**
 * Coupons.gs — kiểm tra và tính mã giảm giá.
 */

/** Tính số tiền giảm; ném lỗi nếu mã không dùng được. Trả về { coupon, discount }. */
function computeCoupon_(code, subtotal) {
  const c = str_(code, 50).toUpperCase();
  if (!c) throw new Error('Vui lòng nhập mã giảm giá');
  const coupon = getSheetData(SHEETS.COUPONS).find(function (x) {
    return String(x.code).toUpperCase() === c;
  });
  if (!coupon || !coupon.is_active) throw new Error('Mã giảm giá không tồn tại');

  const today = formatDate_(new Date(), 'yyyy-MM-dd');
  if (coupon.start_date && String(coupon.start_date).slice(0, 10) > today) throw new Error('Mã giảm giá chưa đến thời gian áp dụng');
  if (coupon.end_date && String(coupon.end_date).slice(0, 10) < today) throw new Error('Mã giảm giá đã hết hạn');
  if (coupon.usage_limit > 0 && coupon.used_count >= coupon.usage_limit) throw new Error('Mã giảm giá đã hết lượt sử dụng');
  if (subtotal < coupon.min_order) {
    throw new Error('Đơn tối thiểu ' + coupon.min_order.toLocaleString('vi-VN') + '₫ để dùng mã này');
  }

  let discount = coupon.type === 'percent' ? Math.round((subtotal * coupon.value) / 100) : coupon.value;
  if (coupon.type === 'percent' && coupon.max_discount > 0) discount = Math.min(discount, coupon.max_discount);
  discount = Math.max(0, Math.min(discount, subtotal));
  return { coupon: coupon, discount: discount };
}

/** POST checkCoupon {code, subtotal} */
function checkCoupon(data) {
  const subtotal = Math.max(0, Number(data.subtotal) || 0);
  const r = computeCoupon_(data.code, subtotal);
  return {
    code: r.coupon.code,
    type: r.coupon.type,
    value: r.coupon.value,
    discount: r.discount,
  };
}
