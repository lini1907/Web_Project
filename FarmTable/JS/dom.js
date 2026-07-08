/* FarmTable — Shared DOM render functions */

var CATEGORY_MAP = {
  'Tất cả': null,
  'Rau củ': 'rau-cu',
  'Trái cây': 'trai-cay',
  'Giải cứu': 'giai-cuu',
  'Mua chung': 'mua-chung'
};

/* Danh mục lọc theo badge sản phẩm, dùng chung cho fetch-products.js và dom.js */
var BADGE_CATEGORY_MAP = {
  'giai-cuu': 'Giải cứu',
  'sale': 'Sale',
  'ban-chay': 'Bán chạy',
  'bi-an': 'Bí ẩn'
};

function renderProductCard(product) {
  var isRescue = product.badge === 'Giải cứu';
  var cardClass = 'product-card group' + (isRescue ? ' rescue' : '');
  var priceClass = isRescue ? 'red' : 'green';
  var detailUrl = 'product-detail.html?id=' + product.id;

  var badgeHtml = '';
  if (product.badge) {
    badgeHtml = '<div class="badge-rescue">' + product.badge + '</div>';
  }
  if (product.oldPrice && product.price < product.oldPrice) {
    var pct = Math.round((1 - product.price / product.oldPrice) * 100);
    badgeHtml += '<div class="badge-sale">-' + pct + '%</div>';
  }

  var oldPriceHtml = '';
  if (product.oldPrice) {
    oldPriceHtml = '<span class="old-price">' + formatPrice(product.oldPrice) + '</span>';
  }

  var priceHtml = isRescue
    ? '<div class="flex items-center gap-1 mb-3"><span class="product-price" style="margin-bottom:0;color:#d4183d">' + formatPrice(product.price) + '</span>' + oldPriceHtml + '</div>'
    : '<div class="product-price">' + formatPrice(product.price) + '<span class="unit">/' + product.unit + '</span>' + oldPriceHtml + '</div>';

  var wishlisted = isInWishlist(product.id);

  return (
    '<div class="' + cardClass + '" data-product-id="' + product.id + '">' +
      '<a href="' + detailUrl + '" class="product-image-wrap block">' +
        badgeHtml +
        '<img src="' + product.mainImage + '" alt="' + product.name + '" />' +
        '<button class="wishlist-btn' + (wishlisted ? ' active' : '') + '" onclick="handleWishlistToggle(event, \'' + product.id + '\')" aria-label="Yêu thích">' +
          '<i data-lucide="heart" class="w-4 h-4 ' + (wishlisted ? 'fill-red-500 text-red-500' : 'text-gray-400') + '"></i>' +
        '</button>' +
      '</a>' +
      '<a href="' + detailUrl + '" class="product-name line-clamp-2">' + product.name + '</a>' +
      '<div class="product-farm line-clamp-1">🏪 ' + product.farm + '</div>' +
      '<div class="product-rating">' +
        '<i data-lucide="star" class="w-3 h-3 fill-yellow-400 text-yellow-400"></i> ' +
        product.rating + ' | Đã bán ' + product.soldCount +
      '</div>' +
      '<div class="mt-auto">' +
        priceHtml +
        '<button class="btn-add-cart ' + priceClass + '" data-id="' + product.id + '" ' +
          'data-name="' + product.name.replace(/"/g, '&quot;') + '" ' +
          'data-farm="' + product.farm.replace(/"/g, '&quot;') + '" ' +
          'data-price="' + product.price + '" ' +
          'data-unit="' + product.unit + '" ' +
          'data-image="' + product.mainImage + '" ' +
          (product.oldPrice ? 'data-old-price="' + product.oldPrice + '" ' : '') +
          (product.badge ? 'data-badge="' + product.badge + '" ' : '') +
        '>Thêm vào giỏ</button>' +
      '</div>' +
    '</div>'
  );
}

function handleWishlistToggle(event, productId) {
  event.preventDefault();
  event.stopPropagation();
  var isActive = toggleWishlist(productId);
  var btn = event.currentTarget;
  btn.classList.toggle('active', isActive);
  var icon = btn.querySelector('i, svg');
  if (icon) {
    icon.classList.toggle('fill-red-500', isActive);
    icon.classList.toggle('text-red-500', isActive);
    icon.classList.toggle('text-gray-400', !isActive);
  }
  var navbar = document.getElementById('navbar-container');
  if (navbar) {
    navbar.innerHTML = renderNavbar();
    if (typeof lucide !== 'undefined') lucide.createIcons();
    setupMobileMenu();
  }
  showToast(isActive ? 'Đã thêm vào yêu thích ❤️' : 'Đã bỏ khỏi yêu thích');
}

function renderProductGrid(products, containerId) {
  var container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = products.map(renderProductCard).join('');
  if (typeof lucide !== 'undefined') lucide.createIcons();
  attachAddToCartEvents();
}

function setupCategoryFilter(products, containerId) {
  var filterContainer = document.getElementById('category-filters');
  if (!filterContainer) return;

  filterContainer.querySelectorAll('.filter-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      filterContainer.querySelectorAll('.filter-btn').forEach(function (b) {
        b.classList.remove('active', 'bg-[#40916C]', 'text-white');
        b.classList.add('bg-[#F8F3EC]', 'text-[#4B5563]');
      });
      btn.classList.add('active', 'bg-[#40916C]', 'text-white');
      btn.classList.remove('bg-[#F8F3EC]', 'text-[#4B5563]');

      var label = btn.textContent.trim();
      var category = CATEGORY_MAP[label];

      if (label === 'Tất cả') {
        renderHomeFeaturedGrid();
        return;
      }

      if (label === 'Mua chung') {
        document.getElementById(containerId).innerHTML = renderGroupBuyCard();
        if (typeof lucide !== 'undefined') lucide.createIcons();
        return;
      }

      var filtered = products.filter(function (p) {
        if (BADGE_CATEGORY_MAP[category]) return p.badge === BADGE_CATEGORY_MAP[category];
        return p.category === category;
      });

      if (filtered.length === 0) {
        document.getElementById(containerId).innerHTML =
          '<p class="col-span-full text-center text-gray-500 py-8">Không có sản phẩm trong danh mục này.</p>';
        return;
      }

      renderProductGrid(filtered.slice(0, 10), containerId);
    });
  });
}

function attachAddToCartEvents() {
  if (attachAddToCartEvents._bound) return;
  attachAddToCartEvents._bound = true;
  document.body.addEventListener('click', function (e) {
    var btn = e.target.closest('.btn-add-cart');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    var item = {
      id: btn.dataset.id,
      name: btn.dataset.name,
      farm: btn.dataset.farm,
      price: parseInt(btn.dataset.price, 10),
      unit: btn.dataset.unit,
      image: btn.dataset.image
    };
    if (btn.dataset.oldPrice) item.oldPrice = parseInt(btn.dataset.oldPrice, 10);
    if (btn.dataset.badge) item.badge = btn.dataset.badge;
    addToCart(item, 1);
    showToast('Đã thêm ' + item.name + ' vào giỏ hàng 🛒');
    var orig = btn.textContent;
    btn.textContent = 'Đã thêm!';
    setTimeout(function () { btn.textContent = orig; }, 1200);
  });
}

function renderNotifDropdown() {
  var notifs = getNotifications();
  if (notifs.length === 0) {
    return '<div class="p-6 text-center text-sm text-gray-400">Chưa có thông báo nào.</div>';
  }
  return notifs.slice(0, 8).map(function (n) {
    return (
      '<div class="px-4 py-3 border-b border-gray-50 last:border-0 ' + (n.read ? '' : 'bg-[#F0FAF3]') + '">' +
        '<p class="text-[13px] text-[#1F2937] leading-snug">' + n.message + '</p>' +
        '<p class="text-[11px] text-gray-400 mt-1">' + new Date(n.createdAt).toLocaleString('vi-VN') + '</p>' +
      '</div>'
    );
  }).join('');
}

function renderNavbar() {
  var total = getTotalItems();
  var badgeDisplay = total > 0 ? '' : ' hidden';
  var badgeText = total > 99 ? '99+' : (total || '0');

  var wishlistCount = getWishlistCount();
  var wishlistBadgeDisplay = wishlistCount > 0 ? '' : ' hidden';

  var unreadCount = getUnreadNotificationCount();
  var unreadBadgeDisplay = unreadCount > 0 ? '' : ' hidden';

  var currentCustomer = getCurrentCustomer();
  var userMenuHtml = currentCustomer
    ? (
      '<div class="relative hidden md:block">' +
        '<button onclick="toggleUserDropdown(event)" class="flex flex-col items-center gap-0.5 hover:text-[#40916C]">' +
          '<div class="w-5 h-5 rounded-full bg-[#40916C] text-white text-[10px] font-bold flex items-center justify-center">' + currentCustomer.name.charAt(0).toUpperCase() + '</div>' +
          '<span class="text-[10px] max-w-[70px] truncate">' + currentCustomer.name + '</span>' +
        '</button>' +
        '<div id="user-dropdown" class="hidden absolute right-0 top-[48px] w-52 bg-white rounded-xl border border-[#E5E7EB] shadow-lg py-2 z-50">' +
          '<a href="account.html" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Tài khoản của tôi</a>' +
          '<a href="account.html?tab=orders" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Đơn hàng của tôi</a>' +
          '<a href="account.html?tab=wishlist" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Sản phẩm yêu thích</a>' +
          '<button onclick="handleNavLogout()" class="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50">Đăng xuất</button>' +
        '</div>' +
      '</div>'
    )
    : (
      '<a href="account.html" class="hidden md:flex flex-col items-center gap-0.5 hover:text-[#40916C]">' +
        '<i data-lucide="user" class="w-5 h-5"></i><span class="text-[10px]">Đăng nhập</span>' +
      '</a>'
    );

  return (
    '<div class="w-full flex flex-col z-50 navbar-wrap">' +
      '<div class="top-bar w-full hidden md:block">' +
        '<div class="max-w-[1200px] mx-auto px-4 h-full flex items-center justify-between text-[12px]">' +
          '<div class="flex items-center gap-1.5"><i data-lucide="package" class="w-3.5 h-3.5"></i> Miễn phí giao hàng cho đơn từ 200.000đ</div>' +
          '<div class="flex gap-4">' +
            '<a href="#" class="hover:text-gray-300">Tải app</a><span>|</span>' +
            '<a href="account.html?tab=orders" class="hover:text-gray-300">Theo dõi đơn hàng</a><span>|</span>' +
            '<a href="vendor-login.html" class="hover:text-gray-300">Kết nối nhà vườn</a>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<nav class="navbar sticky top-0 md:relative z-40">' +
        '<div class="max-w-[1200px] mx-auto px-4 h-[60px] flex items-center justify-between gap-6">' +
          '<a href="index.html" class="flex-shrink-0 font-bold text-[#1B4332] text-[20px] flex items-center">' +
            'FarmTable <i data-lucide="leaf" class="w-5 h-5 ml-1 text-[#40916C]" fill="currentColor"></i>' +
          '</a>' +
          '<form onsubmit="handleNavSearch(event)" class="flex-1 max-w-[600px] hidden md:flex items-center">' +
            '<div class="flex w-full h-[40px] rounded-[8px] border-2 border-[#40916C] overflow-hidden bg-white">' +
              '<input name="q" type="text" placeholder="Tìm rau củ, trái cây, nông trại..." class="flex-1 h-full px-4 text-sm focus:outline-none" />' +
              '<button type="submit" class="btn-orange px-6 h-full font-medium text-sm">Tìm kiếm</button>' +
            '</div>' +
          '</form>' +
          '<div class="flex items-center gap-6 text-[#1F2937]">' +
            '<a href="vendor-login.html" class="hidden md:flex flex-col items-center gap-0.5 text-[#40916C] hover:text-[#1B4332] transition-colors">' +
              '<i data-lucide="store" class="w-5 h-5"></i><span class="text-[10px] font-medium whitespace-nowrap">Bán hàng</span>' +
            '</a>' +
            '<div class="relative hidden md:block">' +
              '<button onclick="toggleNotifDropdown(event)" class="flex flex-col items-center gap-0.5 hover:text-[#40916C] relative">' +
                '<i data-lucide="bell" class="w-5 h-5"></i><span class="text-[10px]">Thông báo</span>' +
                '<span class="cart-badge' + unreadBadgeDisplay + '" style="top:-4px;right:-6px;">' + unreadCount + '</span>' +
              '</button>' +
              '<div id="notif-dropdown" class="hidden absolute right-0 top-[48px] w-72 bg-white rounded-xl border border-[#E5E7EB] shadow-lg z-50 max-h-[360px] overflow-y-auto">' +
                '<div class="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between">' +
                  '<span class="font-bold text-sm text-[#1F2937]">Thông báo</span>' +
                  '<button onclick="handleMarkAllRead()" class="text-[11px] text-[#40916C] hover:underline">Đánh dấu đã đọc</button>' +
                '</div>' +
                renderNotifDropdown() +
              '</div>' +
            '</div>' +
            '<a href="account.html?tab=wishlist" class="hidden md:flex flex-col items-center gap-0.5 hover:text-[#40916C] relative">' +
              '<i data-lucide="heart" class="w-5 h-5"></i><span class="text-[10px]">Yêu thích</span>' +
              '<span class="cart-badge' + wishlistBadgeDisplay + '" style="top:-4px;right:-6px;">' + wishlistCount + '</span>' +
            '</a>' +
            '<a href="cart.html" class="flex flex-col items-center gap-0.5 hover:text-[#40916C] relative">' +
              '<i data-lucide="shopping-cart" class="w-5 h-5"></i>' +
              '<span class="text-[10px] hidden md:block">Giỏ hàng</span>' +
              '<span id="cart-badge" class="cart-badge' + badgeDisplay + '">' + badgeText + '</span>' +
            '</a>' +
            userMenuHtml +
            '<button id="mobile-menu-btn" class="md:hidden" aria-label="Menu">' +
              '<i data-lucide="menu" class="w-6 h-6" id="menu-icon"></i>' +
            '</button>' +
          '</div>' +
        '</div>' +
        '<form onsubmit="handleNavSearch(event)" class="md:hidden px-4 pb-3">' +
          '<div class="flex w-full h-[40px] rounded-[8px] border-2 border-[#40916C] overflow-hidden bg-white">' +
            '<input name="q" type="text" placeholder="Tìm kiếm..." class="flex-1 h-full px-3 text-sm focus:outline-none" />' +
            '<button type="submit" class="btn-orange px-4 h-full font-medium text-sm"><i data-lucide="search" class="w-4 h-4"></i></button>' +
          '</div>' +
        '</form>' +
      '</nav>' +
      '<div class="cat-nav hidden lg:block">' +
        '<div class="max-w-[1200px] mx-auto px-4 h-full flex items-center gap-6 text-[14px] font-medium whitespace-nowrap overflow-hidden">' +
          '<a href="index.html" class="hover:text-gray-200">Trang chủ</a>' +
          '<a href="shop.html?cat=rau-cu" class="hover:text-gray-200">Rau củ</a>' +
          '<a href="shop.html?cat=trai-cay" class="hover:text-gray-200">Trái cây</a>' +
          '<a href="shop.html?cat=thit-thuy-san" class="hover:text-gray-200">Thịt cá</a>' +
          '<a href="shop.html" class="hover:text-gray-200">Đặc sản</a>' +
          '<a href="rescue.html" class="hover:text-orange-200 flex items-center gap-1.5">Giải cứu <i data-lucide="flame" class="w-4 h-4"></i></a>' +
          '<a href="group-buy.html" class="hover:text-gray-200 flex items-center gap-1.5">Mua chung <i data-lucide="users" class="w-4 h-4"></i></a>' +
          '<a href="mystery-box.html" class="hover:text-purple-200 flex items-center gap-1.5">Mystery Box <i data-lucide="gift" class="w-4 h-4"></i></a>' +
          '<a href="farm.html" class="hover:text-gray-200">Nông trại</a>' +
          '<a href="shop.html?sale=1" class="hover:text-gray-200 flex items-center gap-1.5">Flash Sale <i data-lucide="zap" class="w-4 h-4"></i></a>' +
        '</div>' +
      '</div>' +
      '<div id="mobile-menu" class="mobile-menu lg:hidden absolute top-[110px] left-0 w-full bg-white border-b border-[#E5E7EB] p-4 flex-col gap-3 shadow-lg z-50">' +
        '<a href="index.html" class="font-semibold text-[#1F2937]">Trang chủ</a>' +
        '<a href="shop.html" class="font-semibold text-[#1F2937]">Rau củ & Trái cây</a>' +
        '<a href="rescue.html" class="font-semibold text-[#F97316] flex items-center gap-2">Giải cứu <i data-lucide="flame" class="w-4 h-4"></i></a>' +
        '<a href="group-buy.html" class="font-semibold text-[#1F2937] flex items-center gap-2">Mua chung <i data-lucide="users" class="w-4 h-4"></i></a>' +
        '<a href="mystery-box.html" class="font-semibold text-[#7C3AED] flex items-center gap-2">Mystery Box <i data-lucide="gift" class="w-4 h-4"></i></a>' +
        '<a href="farm.html" class="font-semibold text-[#1F2937]">Nông trại</a>' +
        '<hr class="border-gray-100" />' +
        '<a href="account.html" class="font-semibold text-[#1F2937] flex items-center gap-2">' + (currentCustomer ? 'Xin chào, ' + currentCustomer.name : 'Đăng nhập / Đăng ký') + '</a>' +
        '<a href="account.html?tab=orders" class="font-medium text-[#4B5563] flex items-center gap-2">Đơn hàng của tôi</a>' +
        '<a href="account.html?tab=wishlist" class="font-medium text-[#4B5563] flex items-center gap-2">Yêu thích' + (wishlistCount > 0 ? ' (' + wishlistCount + ')' : '') + '</a>' +
      '</div>' +
    '</div>'
  );
}

/* ----- Navbar interactions: tìm kiếm, thông báo, tài khoản ----- */

function handleNavSearch(event) {
  event.preventDefault();
  var input = event.target.querySelector('input[name="q"]');
  var query = input.value.trim();
  if (!query) return;
  window.location.href = 'shop.html?search=' + encodeURIComponent(query);
}

function closeAllNavDropdowns() {
  var notif = document.getElementById('notif-dropdown');
  var user = document.getElementById('user-dropdown');
  if (notif) notif.classList.add('hidden');
  if (user) user.classList.add('hidden');
}

function toggleNotifDropdown(event) {
  event.stopPropagation();
  var dropdown = document.getElementById('notif-dropdown');
  var isHidden = dropdown.classList.contains('hidden');
  closeAllNavDropdowns();
  if (isHidden) dropdown.classList.remove('hidden');
}

function toggleUserDropdown(event) {
  event.stopPropagation();
  var dropdown = document.getElementById('user-dropdown');
  var isHidden = dropdown.classList.contains('hidden');
  closeAllNavDropdowns();
  if (isHidden) dropdown.classList.remove('hidden');
}

function handleMarkAllRead() {
  markAllNotificationsRead();
  document.getElementById('navbar-container').innerHTML = renderNavbar();
  if (typeof lucide !== 'undefined') lucide.createIcons();
  setupMobileMenu();
}

function handleNavLogout() {
  logoutCustomer();
  window.location.href = 'index.html';
}

document.addEventListener('click', closeAllNavDropdowns);

function renderFooter() {
  return (
    '<footer class="footer">' +
      '<div class="max-w-[1200px] mx-auto px-4 md:px-8">' +
        '<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 mb-8">' +
          '<div class="lg:col-span-1">' +
            '<div class="font-bold text-[20px] mb-3 flex items-center gap-1">FarmTable <span class="text-xl">🌿</span></div>' +
            '<p class="text-gray-300 text-[12px] mb-4 leading-relaxed">Mua sắm nông sản sạch trực tiếp từ nhà vườn với giá tốt nhất mỗi ngày.</p>' +
            '<div class="flex gap-3">' +
              '<a href="#" class="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center hover:bg-[#40916C] transition-colors"><i data-lucide="facebook" class="w-4 h-4"></i></a>' +
              '<a href="#" class="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center hover:bg-[#40916C] transition-colors"><i data-lucide="instagram" class="w-4 h-4"></i></a>' +
              '<a href="#" class="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center hover:bg-[#40916C] transition-colors"><i data-lucide="message-circle" class="w-4 h-4"></i></a>' +
              '<a href="#" class="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center hover:bg-[#40916C] transition-colors"><i data-lucide="phone" class="w-4 h-4"></i></a>' +
            '</div>' +
          '</div>' +
          '<div>' +
            '<h4 class="font-bold text-[14px] mb-4 uppercase tracking-wider text-gray-200">Về FarmTable</h4>' +
            '<ul class="flex flex-col gap-2 text-[13px] text-gray-300">' +
              '<li><a href="farm.html" class="hover:text-white transition-colors">Giới thiệu</a></li>' +
              '<li><a href="farm.html" class="hover:text-white transition-colors">Nhà vườn</a></li>' +
              '<li><a href="#" class="hover:text-white transition-colors">Blog</a></li>' +
              '<li><a href="#" class="hover:text-white transition-colors">Tuyển dụng</a></li>' +
              '<li class="mt-2"><a href="vendor-login.html" class="text-sm text-[#40916C] hover:underline flex items-center gap-1.5"><i data-lucide="store" class="w-4 h-4"></i>Trở thành nhà bán hàng trên FarmTable</a></li>' +
            '</ul>' +
          '</div>' +
          '<div>' +
            '<h4 class="font-bold text-[14px] mb-4 uppercase tracking-wider text-gray-200">Hỗ trợ</h4>' +
            '<ul class="flex flex-col gap-2 text-[13px] text-gray-300">' +
              '<li><a href="#" class="hover:text-white transition-colors">Liên hệ</a></li>' +
              '<li><a href="#" class="hover:text-white transition-colors">FAQ</a></li>' +
              '<li><a href="#" class="hover:text-white transition-colors">Chính sách đổi trả</a></li>' +
              '<li><a href="#" class="hover:text-white transition-colors">CSKH</a></li>' +
              '<li><a href="track-order.html" class="hover:text-white transition-colors">Tra cứu đơn hàng</a></li>' +
            '</ul>' +
          '</div>' +
          '<div>' +
            '<h4 class="font-bold text-[14px] mb-4 uppercase tracking-wider text-gray-200">Sản phẩm</h4>' +
            '<ul class="flex flex-col gap-2 text-[13px] text-gray-300">' +
              '<li><a href="shop.html?cat=rau-cu" class="hover:text-white transition-colors">Rau củ</a></li>' +
              '<li><a href="shop.html?cat=trai-cay" class="hover:text-white transition-colors">Trái cây</a></li>' +
              '<li><a href="rescue.html" class="hover:text-white transition-colors">Giải cứu</a></li>' +
              '<li><a href="mystery-box.html" class="hover:text-white transition-colors">Mystery Box</a></li>' +
            '</ul>' +
          '</div>' +
          '<div>' +
            '<h4 class="font-bold text-[14px] mb-4 uppercase tracking-wider text-gray-200">Tải ứng dụng</h4>' +
            '<div class="flex gap-3">' +
              '<div class="bg-white p-1 rounded-[4px] flex-shrink-0"><div class="w-16 h-16 bg-gray-200 flex items-center justify-center text-gray-400 text-[10px]">QR</div></div>' +
              '<div class="flex flex-col gap-2 justify-center">' +
                '<div class="bg-gray-800 border border-gray-600 px-2 py-1 rounded-[4px] text-[10px] text-center w-[100px] cursor-pointer hover:bg-gray-700">App Store</div>' +
                '<div class="bg-gray-800 border border-gray-600 px-2 py-1 rounded-[4px] text-[10px] text-center w-[100px] cursor-pointer hover:bg-gray-700">Google Play</div>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="footer-bottom">' +
        '<div class="max-w-[1200px] mx-auto px-4 md:px-8 flex flex-col md:flex-row items-center justify-between gap-4 text-[12px] text-gray-400">' +
          '<div class="flex items-center gap-2 flex-wrap justify-center">' +
            '<span>© 2025 FarmTable — Kết nối Nông trại & Bàn ăn</span>' +
            '<span class="hidden md:inline">|</span>' +
            '<a href="#" class="hover:text-white">Chính sách</a><span class="hidden md:inline">|</span>' +
            '<a href="#" class="hover:text-white">Điều khoản</a><span class="hidden md:inline">|</span>' +
            '<a href="#" class="hover:text-white">Bảo mật</a>' +
          '</div>' +
          '<div class="flex items-center gap-4"><div class="flex items-center gap-1"><span>🇻🇳</span> Việt Nam</div><span>|</span><span>VND</span></div>' +
        '</div>' +
      '</div>' +
    '</footer>'
  );
}

function setupMobileMenu() {
  var btn = document.getElementById('mobile-menu-btn');
  var menu = document.getElementById('mobile-menu');
  if (!btn || !menu) return;
  btn.addEventListener('click', function () {
    menu.classList.toggle('open');
    var icon = document.getElementById('menu-icon');
    if (icon) {
      icon.setAttribute('data-lucide', menu.classList.contains('open') ? 'x' : 'menu');
      lucide.createIcons();
    }
  });
}

function renderHomeFeaturedGrid() {
  var container = document.getElementById('product-grid-container');
  if (!container || !window.__homeProducts) return;

  var p = window.__homeProducts;
  container.innerHTML =
    renderFeaturedCard(p[0], false) +
    renderFeaturedCard(p[9], true) +
    renderMysteryCard() +
    renderGroupBuyCard() +
    renderFeaturedCard(p[11], false, true);
  if (typeof lucide !== 'undefined') lucide.createIcons();
  attachAddToCartEvents();
}

function renderFeaturedCard(product, isRescue, hiddenLg) {
  var detailUrl = 'product-detail.html?id=' + product.id;
  var hiddenClass = hiddenLg ? ' hidden lg:flex' : '';
  var badgeHtml = '';
  if (product.badge) {
    badgeHtml = '<div class="absolute top-1 left-1 z-10 bg-[#D8F3DC] text-[#1B4332] text-[10px] font-bold px-1.5 py-0.5 rounded-[3px] uppercase">' + product.badge + '</div>';
  }
  if (product.oldPrice) {
    var pct = (100 - product.price / product.oldPrice * 100).toFixed(0);
    badgeHtml += '<div class="absolute top-1 right-1 z-10 bg-[#F97316] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-[3px]">-' + pct + '%</div>';
  }
  var priceHtml = isRescue
    ? '<div class="flex items-center gap-1 mb-3"><span class="font-bold text-[16px] text-[#d4183d]">' + formatPrice(product.price) + '</span>' +
      (product.oldPrice ? '<span class="text-[11px] text-gray-400 line-through">' + formatPrice(product.oldPrice) + '</span>' : '') + '</div>'
    : '<div class="font-bold text-[16px] text-[#40916C] mb-3">' + formatPrice(product.price) + '<span class="text-[12px] font-normal text-gray-500">/' + product.unit + '</span>' +
      (product.oldPrice ? ' <span class="text-[11px] text-gray-400 line-through">' + formatPrice(product.oldPrice) + '</span>' : '') + '</div>';
  var btnClass = isRescue
    ? 'border border-[#d4183d] text-[#d4183d] hover:bg-[#d4183d] hover:text-white'
    : 'border border-[#40916C] text-[#40916C] hover:bg-[#40916C] hover:text-white';

  return (
    '<div class="flex flex-col border border-transparent hover:border-[#40916C] rounded-[8px] p-2 hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] transition-all bg-white group' + hiddenClass + '">' +
      '<a href="' + detailUrl + '" class="relative aspect-square rounded-[6px] overflow-hidden mb-3 bg-gray-50 border border-gray-100 block">' +
        badgeHtml +
        '<img src="' + product.mainImage + '" alt="' + product.name + '" class="w-full h-full object-cover group-hover:scale-105 transition-transform" />' +
      '</a>' +
      '<a href="' + detailUrl + '" class="text-[14px] leading-tight text-[#1F2937] hover:text-[#40916C] line-clamp-2 h-[36px] mb-1 font-medium">' + product.name + '</a>' +
      '<div class="text-[12px] text-[#4B5563] mb-1 line-clamp-1">🏪 ' + product.farm + '</div>' +
      '<div class="flex items-center gap-1 text-[11px] text-gray-500 mb-2">' +
        '<i data-lucide="star" class="w-3 h-3 fill-yellow-400 text-yellow-400"></i> ' + product.rating + ' | Đã bán ' + product.soldCount +
      '</div>' +
      '<div class="mt-auto">' + priceHtml +
        '<button class="btn-add-cart w-full h-[32px] ' + btnClass + ' rounded-[6px] text-[13px] font-semibold transition-colors" ' +
          'data-id="' + product.id + '" data-name="' + product.name + '" data-farm="' + product.farm + '" ' +
          'data-price="' + product.price + '" data-unit="' + product.unit + '" data-image="' + product.mainImage + '" ' +
          (product.oldPrice ? 'data-old-price="' + product.oldPrice + '" ' : '') +
          (product.badge ? 'data-badge="' + product.badge + '" ' : '') +
        '>Thêm vào giỏ</button>' +
      '</div>' +
    '</div>'
  );
}

function renderMysteryCard() {
  return (
    '<div class="flex flex-col border border-transparent hover:border-[#7C3AED] rounded-[8px] p-2 hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] transition-all bg-white group">' +
      '<a href="mystery-box.html" class="relative aspect-square rounded-[6px] overflow-hidden mb-3 bg-purple-50 border border-purple-100 flex items-center justify-center block">' +
        '<div class="absolute top-1 left-1 z-10 bg-[#7C3AED] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-[3px]">BÍ ẨN</div>' +
        '<span class="text-[64px] group-hover:scale-110 transition-transform">📦</span>' +
      '</a>' +
      '<a href="mystery-box.html" class="text-[14px] leading-tight text-[#1F2937] hover:text-[#7C3AED] line-clamp-2 h-[36px] mb-1 font-medium">Mystery Box Rau Mùa 3kg</a>' +
      '<div class="text-[12px] text-[#4B5563] mb-1 line-clamp-1 flex items-center gap-1"><i data-lucide="lock" class="w-3 h-3"></i> Nguyên liệu bất ngờ</div>' +
      '<div class="text-[11px] font-bold text-[#F97316] mb-2">⚠️ Còn 5 hộp</div>' +
      '<div class="mt-auto">' +
        '<div class="font-bold text-[16px] text-[#7C3AED] mb-3">85.000đ<span class="text-[12px] font-normal text-gray-500">/hộp</span></div>' +
        '<a href="mystery-box.html" class="flex items-center justify-center w-full h-[32px] border border-[#7C3AED] text-[#7C3AED] hover:bg-[#7C3AED] hover:text-white rounded-[6px] text-[13px] font-semibold transition-colors">Mở hộp</a>' +
      '</div>' +
    '</div>'
  );
}

function renderGroupBuyCard() {
  return (
    '<div class="flex flex-col border border-transparent hover:border-[#40916C] rounded-[8px] p-2 hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] transition-all bg-white group">' +
      '<a href="group-buy.html" class="relative aspect-square rounded-[6px] overflow-hidden mb-3 bg-gray-50 border border-gray-100 block">' +
        '<div class="absolute top-1 left-1 z-10 bg-[#F97316] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-[3px]">MUA CHUNG</div>' +
        '<img src="https://images.unsplash.com/photo-1590779033100-9f60a05a013d?q=80&w=400" alt="Product" class="w-full h-full object-cover" />' +
        '<div class="absolute bottom-0 left-0 right-0 bg-white/90 p-1.5 backdrop-blur-sm">' +
          '<div class="w-full h-1 bg-gray-200 rounded-full overflow-hidden"><div class="h-full bg-[#40916C] w-[60%]"></div></div>' +
          '<div class="text-[9px] font-bold text-center mt-0.5 text-[#1B4332]">Đã gom 6/10 kg</div>' +
        '</div>' +
      '</a>' +
      '<a href="group-buy.html" class="text-[14px] leading-tight text-[#1F2937] hover:text-[#40916C] line-clamp-2 h-[36px] mb-1 font-medium">Cải xanh VietGAP</a>' +
      '<div class="text-[12px] text-[#4B5563] mb-1 line-clamp-1">🏪 Vườn rau 3 Miền</div>' +
      '<div class="text-[11px] font-bold text-[#d4183d] mb-2">⏰ 14:23:07</div>' +
      '<div class="mt-auto">' +
        '<div class="flex items-center gap-1 mb-3"><span class="font-bold text-[16px] text-[#40916C]">35.000đ</span><span class="text-[11px] text-gray-400 line-through">50.000đ</span></div>' +
        '<a href="group-buy.html" class="flex items-center justify-center w-full h-[32px] bg-[#F97316] hover:bg-[#ea580c] text-white rounded-[6px] text-[13px] font-semibold transition-colors">Tham gia</a>' +
      '</div>' +
    '</div>'
  );
}

