/**
 * Cấu hình cổng thanh toán, đọc từ biến môi trường MỖI LẦN gọi (đổi .env / test không cần khởi động lại module).
 * Thiếu khóa => phương thức đó bị tắt, trang thanh toán chỉ hiện COD.
 */
const trim = (s) => (s || '').trim();

export function publicUrl() {
  return trim(process.env.PUBLIC_URL || `http://localhost:${process.env.PORT || 3000}`).replace(/\/$/, '');
}

/** Địa chỉ giao diện Angular để chuyển người dùng về sau khi thanh toán / đăng nhập Google. */
export function appUrl() {
  return trim(process.env.APP_URL || publicUrl()).replace(/\/$/, '');
}

export function vnpayConfig() {
  return {
    tmnCode: trim(process.env.VNP_TMN_CODE),
    hashSecret: trim(process.env.VNP_HASH_SECRET),
    url: trim(process.env.VNP_URL) || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
    returnUrl: `${publicUrl()}/api/v1/payments/vnpay/return`,
  };
}

export function momoConfig() {
  return {
    partnerCode: trim(process.env.MOMO_PARTNER_CODE),
    accessKey: trim(process.env.MOMO_ACCESS_KEY),
    secretKey: trim(process.env.MOMO_SECRET_KEY),
    endpoint: trim(process.env.MOMO_ENDPOINT) || 'https://test-payment.momo.vn/v2/gateway/api/create',
    redirectUrl: `${publicUrl()}/api/v1/payments/momo/return`,
    ipnUrl: `${publicUrl()}/api/v1/payments/momo/ipn`,
  };
}

export function enabledMethods() {
  const v = vnpayConfig();
  const m = momoConfig();
  return {
    cod: true,
    vnpay: !!(v.tmnCode && v.hashSecret),
    momo: !!(m.partnerCode && m.accessKey && m.secretKey),
  };
}
