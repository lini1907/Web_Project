/* FarmTable — Customer account, wishlist & notifications (localStorage only, no backend) */

var ACCOUNTS_KEY = 'farmtable_customer_accounts';
var SESSION_KEY = 'farmtable_customer_session';
var WISHLIST_KEY = 'farmtable_wishlist';
var NOTIF_KEY = 'farmtable_notifications';

/* ---------- Tài khoản khách hàng ---------- */

function getCustomerAccounts() {
  try {
    var saved = localStorage.getItem(ACCOUNTS_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (e) {
    return [];
  }
}

function saveCustomerAccounts(accounts) {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

function getCurrentCustomer() {
  try {
    var saved = localStorage.getItem(SESSION_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch (e) {
    return null;
  }
}

function registerCustomer(data) {
  var accounts = getCustomerAccounts();
  if (accounts.some(function (a) { return a.email === data.email; })) {
    return { ok: false, error: 'Email này đã được đăng ký.' };
  }
  var account = {
    id: 'u' + Date.now(),
    name: data.name,
    email: data.email,
    password: data.password,
    phone: data.phone || '',
    address: data.address || '',
    joinDate: new Date().toISOString().slice(0, 10)
  };
  accounts.push(account);
  saveCustomerAccounts(accounts);
  localStorage.setItem(SESSION_KEY, JSON.stringify(account));
  addNotification('Chào mừng ' + account.name + ' đến với FarmTable! 🌿', 'welcome');
  return { ok: true, account: account };
}

function loginCustomer(email, password) {
  var account = getCustomerAccounts().find(function (a) { return a.email === email && a.password === password; });
  if (!account) {
    return { ok: false, error: 'Email hoặc mật khẩu không đúng.' };
  }
  localStorage.setItem(SESSION_KEY, JSON.stringify(account));
  return { ok: true, account: account };
}

function logoutCustomer() {
  localStorage.removeItem(SESSION_KEY);
}

function updateCurrentCustomer(patch) {
  var current = getCurrentCustomer();
  if (!current) return;
  var updated = Object.assign({}, current, patch);
  localStorage.setItem(SESSION_KEY, JSON.stringify(updated));

  var accounts = getCustomerAccounts().map(function (a) {
    return a.id === updated.id ? updated : a;
  });
  saveCustomerAccounts(accounts);
}

/* ---------- Yêu thích (Wishlist) ---------- */

function getWishlist() {
  try {
    var saved = localStorage.getItem(WISHLIST_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (e) {
    return [];
  }
}

function saveWishlist(ids) {
  localStorage.setItem(WISHLIST_KEY, JSON.stringify(ids));
}

function isInWishlist(productId) {
  return getWishlist().indexOf(String(productId)) > -1;
}

function toggleWishlist(productId) {
  var id = String(productId);
  var list = getWishlist();
  var idx = list.indexOf(id);
  if (idx > -1) {
    list.splice(idx, 1);
  } else {
    list.push(id);
  }
  saveWishlist(list);
  return list.indexOf(id) > -1;
}

function getWishlistCount() {
  return getWishlist().length;
}

/* ---------- Thông báo ---------- */

function getNotifications() {
  try {
    var saved = localStorage.getItem(NOTIF_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (e) {
    return [];
  }
}

function saveNotifications(list) {
  localStorage.setItem(NOTIF_KEY, JSON.stringify(list));
}

function addNotification(message, type) {
  var list = getNotifications();
  list.unshift({
    id: 'n' + Date.now() + Math.floor(Math.random() * 1000),
    message: message,
    type: type || 'info',
    read: false,
    createdAt: new Date().toISOString()
  });
  saveNotifications(list.slice(0, 30));
}

function markAllNotificationsRead() {
  var list = getNotifications().map(function (n) { return Object.assign({}, n, { read: true }); });
  saveNotifications(list);
}

function getUnreadNotificationCount() {
  return getNotifications().filter(function (n) { return !n.read; }).length;
}
