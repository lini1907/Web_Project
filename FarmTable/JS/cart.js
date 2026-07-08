/* FarmTable — Shared cart logic (mirrors CartContext.tsx) */

var STORAGE_KEY = 'farmtable_cart';

function getCart() {
  try {
    var saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (e) {
    return [];
  }
}

function saveCart(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  updateCartBadge();
}

function addToCart(item, qty) {
  qty = qty || 1;
  var items = getCart();
  var existing = items.find(function (i) { return i.id === item.id; });
  if (existing) {
    existing.quantity += qty;
  } else {
    items.push(Object.assign({}, item, { quantity: qty }));
  }
  saveCart(items);
}

function removeFromCart(id) {
  saveCart(getCart().filter(function (i) { return i.id !== id; }));
}

function updateQuantity(id, qty) {
  if (qty <= 0) {
    removeFromCart(id);
    return;
  }
  var items = getCart().map(function (i) {
    return i.id === id ? Object.assign({}, i, { quantity: qty }) : i;
  });
  saveCart(items);
}

function clearCart() {
  saveCart([]);
}

function getTotalItems() {
  return getCart().reduce(function (sum, i) { return sum + i.quantity; }, 0);
}

function getTotalPrice() {
  return getCart().reduce(function (sum, i) { return sum + i.price * i.quantity; }, 0);
}

function formatPrice(price) {
  return price.toLocaleString('vi-VN') + 'đ';
}

function showToast(message) {
  var existing = document.getElementById('ft-toast');
  if (existing) existing.remove();

  var toast = document.createElement('div');
  toast.id = 'ft-toast';
  toast.className = 'ft-toast';
  toast.textContent = message;
  document.body.appendChild(toast);

  requestAnimationFrame(function () { toast.classList.add('ft-toast-show'); });
  setTimeout(function () {
    toast.classList.remove('ft-toast-show');
    setTimeout(function () { toast.remove(); }, 300);
  }, 2000);
}

function updateCartBadge() {
  var badge = document.getElementById('cart-badge');
  if (!badge) return;
  var total = getTotalItems();
  if (total > 0) {
    badge.textContent = total > 99 ? '99+' : String(total);
    badge.classList.remove('hidden');
  } else {
    badge.textContent = '0';
    badge.classList.add('hidden');
  }
}
