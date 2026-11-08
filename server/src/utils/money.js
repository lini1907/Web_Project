export const SHIPPING_FEE = 20000;
export const FREE_SHIPPING_FROM = 200000;

/** Phí ship tính trên cả đơn: 20.000đ, miễn phí khi tổng tiền hàng từ 200.000đ. */
export function shippingFeeFor(subtotal) {
  if (subtotal <= 0) return 0;
  return subtotal >= FREE_SHIPPING_FROM ? 0 : SHIPPING_FEE;
}

/** Làm tròn đến nghìn đồng gần nhất. */
export function roundThousand(value) {
  return Math.round(value / 1000) * 1000;
}

/** Giá Rescue do server tính từ giá gốc và % giảm (30–50%). */
export function rescuePrice(originalPrice, discountRate) {
  return Math.max(1000, roundThousand(originalPrice * (1 - discountRate / 100)));
}
