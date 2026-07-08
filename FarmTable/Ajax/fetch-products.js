/* FarmTable — Ajax: fetch products from JSON & XML, with localStorage overlay for vendor edits */

var PRODUCTS_JSON_URL = '../XML+Json/products.json';
var PRODUCTS_XML_URL = '../XML+Json/products.xml';
var PRODUCTS_OVERLAY_KEY = 'farmtable_products_overlay';
var PRODUCTS_EXTRA_KEY = 'farmtable_products_extra';

/* Chỉnh sửa của vendor lên sản phẩm có sẵn (giá / tồn kho / trạng thái) — không sửa file gốc */
function getProductOverlay() {
  try {
    var saved = localStorage.getItem(PRODUCTS_OVERLAY_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch (e) {
    return {};
  }
}

function setProductOverlay(id, patch) {
  var overlay = getProductOverlay();
  overlay[id] = Object.assign({}, overlay[id], patch);
  localStorage.setItem(PRODUCTS_OVERLAY_KEY, JSON.stringify(overlay));
}

/* Sản phẩm do vendor thêm mới trong phiên làm việc (demo, lưu localStorage) */
function getExtraProducts() {
  try {
    var saved = localStorage.getItem(PRODUCTS_EXTRA_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (e) {
    return [];
  }
}

function saveExtraProducts(list) {
  localStorage.setItem(PRODUCTS_EXTRA_KEY, JSON.stringify(list));
}

function addProduct(product) {
  var list = getExtraProducts();
  list.push(product);
  saveExtraProducts(list);
}

function removeProduct(id) {
  saveExtraProducts(getExtraProducts().filter(function (p) { return String(p.id) !== String(id); }));
  var overlay = getProductOverlay();
  delete overlay[id];
  localStorage.setItem(PRODUCTS_OVERLAY_KEY, JSON.stringify(overlay));
}

function applyProductOverlay(products) {
  var overlay = getProductOverlay();
  return products.map(function (p) {
    return overlay[p.id] ? Object.assign({}, p, overlay[p.id]) : p;
  });
}

/* Trừ tồn kho sau khi đặt hàng thành công (áp dụng cho cả sản phẩm gốc và sản phẩm vendor tự thêm) */
function decrementStockForOrder(items) {
  var extra = getExtraProducts();
  var extraChanged = false;
  var overlay = getProductOverlay();

  items.forEach(function (item) {
    var qty = Number(item.quantity) || 0;
    var idx = extra.findIndex(function (p) { return String(p.id) === String(item.productId); });

    if (idx > -1) {
      var extraStock = Number(extra[idx].stock);
      if (!Number.isNaN(extraStock)) {
        extra[idx].stock = Math.max(0, extraStock - qty);
        extraChanged = true;
      }
    } else {
      var currentStock = overlay[item.productId] && overlay[item.productId].stock !== undefined
        ? Number(overlay[item.productId].stock)
        : 50;
      setProductOverlay(item.productId, { stock: Math.max(0, currentStock - qty) });
    }
  });

  if (extraChanged) saveExtraProducts(extra);
}

function showLoadingState(containerId) {
  var container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML =
    '<div class="loading-state col-span-full">' +
      '<div class="inline-block animate-pulse text-[#40916C] font-medium">Đang tải sản phẩm...</div>' +
    '</div>';
}

function showErrorState(containerId, message) {
  var container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML =
    '<div class="error-state col-span-full">' +
      '<p class="font-semibold">Không thể tải sản phẩm</p>' +
      '<p class="text-sm mt-1">' + (message || 'Vui lòng thử lại sau.') + '</p>' +
    '</div>';
}

function fetchProductsFromXML() {
  return fetch(PRODUCTS_XML_URL)
    .then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.text();
    })
    .then(function (xmlText) {
      var parser = new DOMParser();
      var doc = parser.parseFromString(xmlText, 'text/xml');
      var productNodes = doc.querySelectorAll('product');
      var products = [];

      productNodes.forEach(function (node) {
        var p = {};
        node.childNodes.forEach(function (child) {
          if (child.nodeType !== 1) return;
          var tag = child.tagName;
          if (tag === 'certifications' || tag === 'galleryImages') {
            p[tag] = Array.from(child.querySelectorAll('item')).map(function (el) {
              return el.textContent;
            });
          } else if (child.childNodes.length === 0 || (child.childNodes.length === 1 && child.firstChild.nodeType === 3)) {
            var val = child.textContent;
            if (tag === 'price' || tag === 'oldPrice' || tag === 'rating' || tag === 'reviewCount' || tag === 'soldCount') {
              p[tag] = val === '' ? null : Number(val);
            } else if (tag === 'oldPrice' && val === '') {
              p[tag] = null;
            } else if (tag === 'badge' && val === '') {
              p[tag] = null;
            } else {
              p[tag] = val;
            }
          }
        });
        if (p.oldPrice === '') p.oldPrice = null;
        if (p.badge === '') p.badge = null;
        products.push(p);
      });

      return products;
    });
}

function fetchAndRenderProducts(containerId, category) {
  showLoadingState(containerId);

  return fetch(PRODUCTS_JSON_URL)
    .then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .then(function (products) {
      products = applyProductOverlay(products).concat(getExtraProducts());
      window.__homeProducts = products;

      if (category) {
        var filtered = products.filter(function (p) {
          if (BADGE_CATEGORY_MAP[category]) return p.badge === BADGE_CATEGORY_MAP[category];
          return p.category === category;
        });
        renderProductGrid(filtered, containerId);
      } else {
        renderHomeFeaturedGrid();
      }

      setupCategoryFilter(products, containerId);
      attachAddToCartEvents();
      return products;
    })
    .catch(function (err) {
      showErrorState(containerId, err.message);
      throw err;
    });
}
