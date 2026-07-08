document.addEventListener("DOMContentLoaded", function () {
    checkVendorLogin();
    initSidebar();
    initButtons();
});

function checkVendorLogin() {
    if (!sessionStorage.getItem("vendor_auth")) {
        window.location.href = "vendor-login.html";
    }
}

function initSidebar() {
    const links = document.querySelectorAll(".sidebar-link");

    links.forEach(function (link) {
        link.addEventListener("click", function (e) {
            e.preventDefault();

            switchTab(
                this.dataset.tab,
                this.dataset.title,
                this
            );
        });
    });
}

function switchTab(tabId, title, currentLink) {
    const titleEl = document.getElementById("page-title");

    if (titleEl) {
        titleEl.textContent = title;
    }

    document.querySelectorAll(".content-section").forEach(function (section) {
        section.classList.remove("active");
    });

    const target = document.getElementById(tabId);

    if (target) {
        target.classList.add("active");
    }

    document.querySelectorAll(".sidebar-link").forEach(function (link) {
        link.classList.remove("active");
    });

    currentLink.classList.add("active");
}

function initButtons() {
    const logoutBtn = document.getElementById("btnLogout");

    if (logoutBtn) {
        logoutBtn.addEventListener("click", handleLogout);
    }

    const addProductBtn = document.getElementById("btnAddProduct");

    if (addProductBtn) {
        addProductBtn.addEventListener("click", addNewProduct);
    }

    document.querySelectorAll(".btnUpdateOrder").forEach(function (btn) {
        btn.addEventListener("click", function () {
            updateOrderStatus(this);
        });
    });
}

function handleLogout() {
    sessionStorage.removeItem("vendor_auth");
    window.location.href = "vendor-login.html";
}

function addNewProduct() {
    const name = prompt("Tên sản phẩm:");
    if (!name || !name.trim()) return;

    const price = Number(prompt("Giá bán (đ):", "0"));
    const stock = Number(prompt("Tồn kho (kg):", "0"));
    if (Number.isNaN(price) || Number.isNaN(stock)) {
        alert("Giá bán và tồn kho phải là số.");
        return;
    }

    const savedProfile = JSON.parse(localStorage.getItem("vendor_profile") || "{}");

    addProduct({
        id: "vp" + Date.now(),
        name: name.trim(),
        farm: savedProfile.farmName || "Nông trại Đà Lạt Xanh",
        price: price,
        oldPrice: null,
        unit: "kg",
        category: "khac",
        certifications: [],
        mainImage: "https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=400",
        galleryImages: [],
        description: "",
        rating: 0,
        reviewCount: 0,
        soldCount: 0,
        badge: null,
        stock: stock,
        status: "active"
    });

    if (typeof loadVendorProducts === "function") {
        loadVendorProducts();
    } else if (typeof renderProductsTable === "function") {
        renderProductsTable();
    }

    if (typeof showToast === "function") {
        showToast(`Đã thêm sản phẩm "${name.trim()}"`);
    } else {
        alert(`Đã thêm sản phẩm "${name.trim()}"`);
    }
}

function updateOrderStatus(btn) {
    btn.textContent = "Đã cập nhật";
    btn.classList.remove("text-green-600");
    btn.classList.add("text-gray-400");
    btn.style.pointerEvents = "none";
    btn.disabled = true;
}