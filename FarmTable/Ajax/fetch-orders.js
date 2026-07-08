/* FarmTable — Ajax: fetch order/invoice data from JSON, with localStorage overlay for live orders */

var ORDERS_JSON_URL = '../XML+Json/orders.json';
var ORDERS_EXTRA_KEY = 'farmtable_orders_extra';
var ORDER_STATUS_OVERLAY_KEY = 'farmtable_order_status_overlay';

var ORDER_STATUS_LABELS = {
  new: { label: 'Mới', className: 'bg-blue-100 text-blue-700' },
  shipping: { label: 'Đang giao', className: 'bg-orange-100 text-orange-700' },
  done: { label: 'Hoàn thành', className: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Đã hủy', className: 'bg-red-100 text-red-700' }
};

/* Đơn hàng khách đặt trong phiên làm việc (demo, lưu localStorage) */
function getLocalOrders() {
  try {
    var saved = localStorage.getItem(ORDERS_EXTRA_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (e) {
    return [];
  }
}

function saveLocalOrders(orders) {
  localStorage.setItem(ORDERS_EXTRA_KEY, JSON.stringify(orders));
}

/* Ghi đè trạng thái đơn hàng (áp dụng cho cả đơn seed từ orders.json) mà không sửa file gốc */
function getOrderStatusOverlay() {
  try {
    var saved = localStorage.getItem(ORDER_STATUS_OVERLAY_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch (e) {
    return {};
  }
}

function setOrderStatus(orderId, status) {
  var overlay = getOrderStatusOverlay();
  overlay[orderId] = status;
  localStorage.setItem(ORDER_STATUS_OVERLAY_KEY, JSON.stringify(overlay));

  var localOrders = getLocalOrders();
  var idx = localOrders.findIndex(function (o) { return o.id === orderId; });
  if (idx > -1) {
    localOrders[idx].status = status;
    saveLocalOrders(localOrders);
  }
}

function createOrder(data) {
  var order = {
    id: 'FT' + Date.now().toString().slice(-9),
    customerId: data.customerId || null,
    customerEmail: data.customerEmail || null,
    customerPhone: data.customerPhone || null,
    customerName: data.customerName,
    date: new Date().toISOString().slice(0, 10),
    status: 'new',
    paymentMethod: data.paymentMethod,
    shippingAddress: data.shippingAddress,
    items: data.items,
    shippingFee: data.shippingFee || 0,
    total: data.total
  };
  var orders = getLocalOrders();
  orders.unshift(order);
  saveLocalOrders(orders);
  if (typeof addNotification === 'function') {
    addNotification('Đặt hàng thành công! Mã đơn #' + order.id, 'order');
  }
  return order;
}

function fetchOrders() {
  return fetch(ORDERS_JSON_URL)
    .then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .then(function (seedOrders) {
      var overlay = getOrderStatusOverlay();
      var merged = seedOrders.concat(getLocalOrders()).map(function (order) {
        return overlay[order.id] ? Object.assign({}, order, { status: overlay[order.id] }) : order;
      });
      merged.sort(function (a, b) { return b.date.localeCompare(a.date); });
      return merged;
    });
}

function getOrdersForCustomer(email) {
  return fetchOrders().then(function (orders) {
    return orders.filter(function (o) { return o.customerEmail === email; });
  });
}

/* Tra cứu đơn hàng cho khách vãng lai: khớp mã đơn + số điện thoại đã dùng khi đặt hàng */
function findOrderByCode(orderId, phone) {
  var normalizedId = (orderId || '').trim().replace(/^#/, '').toUpperCase();
  var normalizedPhone = (phone || '').trim();
  return fetchOrders().then(function (orders) {
    return orders.find(function (o) {
      return o.id.toUpperCase() === normalizedId && o.customerPhone === normalizedPhone;
    }) || null;
  });
}

function paymentMethodLabel(method) {
  if (method === 'cod') return 'Thanh toán khi nhận hàng';
  if (method === 'bank') return 'Chuyển khoản ngân hàng';
  if (method === 'momo') return 'Ví Momo';
  return method;
}
