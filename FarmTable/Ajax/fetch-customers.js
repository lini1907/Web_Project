/* FarmTable — Ajax: fetch customer data from JSON */

var CUSTOMERS_JSON_URL = '../XML+Json/customers.json';
var CUSTOMERS_STORAGE_KEY = 'farmtable_customers_extra';
var CUSTOMER_STATS_OVERLAY_KEY = 'farmtable_customer_stats_overlay';

/* Khách hàng do người dùng tự thêm trong phiên làm việc (demo, lưu localStorage) */
function getExtraCustomers() {
  try {
    var saved = localStorage.getItem(CUSTOMERS_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (e) {
    return [];
  }
}

function saveExtraCustomers(list) {
  localStorage.setItem(CUSTOMERS_STORAGE_KEY, JSON.stringify(list));
}

/* Ghi đè số đơn/tổng chi tiêu của khách (kể cả khách seed từ customers.json) khi có đơn hàng mới */
function getCustomerStatsOverlay() {
  try {
    var saved = localStorage.getItem(CUSTOMER_STATS_OVERLAY_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch (e) {
    return {};
  }
}

function saveCustomerStatsOverlay(overlay) {
  localStorage.setItem(CUSTOMER_STATS_OVERLAY_KEY, JSON.stringify(overlay));
}

function computeTier(totalOrders, totalSpent) {
  if (totalOrders <= 1) return 'Mới';
  if (totalSpent >= 5000000) return 'Kim cương';
  if (totalSpent >= 1500000) return 'Vàng';
  return 'Bạc';
}

/* Danh sách khách hàng chưa áp overlay thống kê — dùng nội bộ để tìm khách đã tồn tại */
function fetchCustomersRaw() {
  return fetch(CUSTOMERS_JSON_URL)
    .then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .then(function (customers) {
      return customers.concat(getExtraCustomers());
    });
}

function fetchCustomers() {
  return fetchCustomersRaw().then(function (customers) {
    var overlay = getCustomerStatsOverlay();
    return customers.map(function (c) {
      return overlay[c.id] ? Object.assign({}, c, overlay[c.id]) : c;
    });
  });
}

/* Gọi khi có đơn hàng mới (kể cả khách vãng lai) để mục Quản lý Khách Hàng của vendor tự cập nhật */
function recordCustomerOrder(info) {
  return fetchCustomersRaw().then(function (customers) {
    var existing = customers.find(function (c) {
      return (info.email && c.email === info.email) || (!info.email && info.phone && c.phone === info.phone);
    });

    if (existing) {
      var overlay = getCustomerStatsOverlay();
      var current = overlay[existing.id] || { totalOrders: existing.totalOrders || 0, totalSpent: existing.totalSpent || 0 };
      var totalOrders = current.totalOrders + 1;
      var totalSpent = current.totalSpent + info.orderTotal;
      overlay[existing.id] = { totalOrders: totalOrders, totalSpent: totalSpent, tier: computeTier(totalOrders, totalSpent) };
      saveCustomerStatsOverlay(overlay);
      return;
    }

    addCustomer({
      id: 'c' + Date.now(),
      name: info.name,
      email: info.email || '',
      phone: info.phone || '',
      address: info.address || '',
      joinDate: new Date().toISOString().slice(0, 10),
      totalOrders: 1,
      totalSpent: info.orderTotal,
      tier: computeTier(1, info.orderTotal)
    });
  });
}

function addCustomer(customer) {
  var list = getExtraCustomers();
  list.push(customer);
  saveExtraCustomers(list);
}

function removeCustomer(id) {
  saveExtraCustomers(getExtraCustomers().filter(function (c) { return c.id !== id; }));
}

function tierBadgeClass(tier) {
  if (tier === 'Kim cương') return 'bg-purple-100 text-purple-700';
  if (tier === 'Vàng') return 'bg-yellow-100 text-yellow-700';
  if (tier === 'Bạc') return 'bg-gray-200 text-gray-700';
  return 'bg-blue-100 text-blue-700';
}
