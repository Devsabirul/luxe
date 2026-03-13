// ════════════════════════════════════════
//  LUXÉ FASHION STORE — Main Application
//  Firebase Firestore + Auth powered
// ════════════════════════════════════════

// ─── FIREBASE CONFIG ───
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyD2xtZZ9viQOxjmnYpzQhtjYne5l82FM3Y",
  authDomain: "bluedreamitaly.firebaseapp.com",
  projectId: "bluedreamitaly",
  storageBucket: "bluedreamitaly.firebasestorage.app",
  messagingSenderId: "145879085917",
  appId: "1:145879085917:web:938008da8d22839f7c6eb4",
  measurementId: "G-NX6V7GXSS1",
};

// ─── FB PIXEL ID ───
const FB_PIXEL_ID = "";

// ─── SHIPPING RATES — loaded 100% from Firestore, never hardcoded ───
let SHIPPING_RATES = null; // stays null until Firestore responds

// ─── CATEGORIES ───
const CATEGORIES = [
  {
    id: "men",
    name: "Men",
    label: "Essentials",
    color: "#1a2a3a",
    image:
      "https://images.unsplash.com/photo-1490578474895-699cd4e2cf59?w=800&q=80",
  },
  {
    id: "accessories",
    name: "Accessories",
    label: "Statement Pieces",
    color: "#3a2515",
    image:
      "https://images.unsplash.com/photo-1556306535-0f09a537f0a3?w=800&q=80",
  },
  {
    id: "sale",
    name: "Sale",
    label: "Up to 40% Off",
    color: "#c0392b",
    image:
      "https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=800&q=80",
  },
];

// ─── APP STATE ───
const APP = {
  cart: JSON.parse(localStorage.getItem("luxe_cart") || "[]"),
  wishlist: JSON.parse(localStorage.getItem("luxe_wishlist") || "[]"),
  currentPage: "home",
  currentProduct: null,
  filterCategory: "all",
  sortBy: "default",
  searchQuery: "",
  couponApplied: null,
  products: [],
  orders: [],
  firebaseReady: false,
};

// ─── FIREBASE REFERENCES ───
let _db, _collection, _getDocs, _addDoc, _query, _where, _orderBy;

// ─── FIREBASE INIT ───
async function initFirebase() {
  try {
    const { initializeApp } =
      await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js");
    const fb =
      await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");

    const app = initializeApp(FIREBASE_CONFIG);
    _db = fb.getFirestore(app);
    _collection = fb.collection;
    _getDocs = fb.getDocs;
    _addDoc = fb.addDoc;
    _query = fb.query;
    _where = fb.where;
    _orderBy = fb.orderBy;

    APP.firebaseReady = true;

    // ── Load products ──
    const snap = await _getDocs(_collection(_db, "products"));
    APP.products = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((p) => p.inStock !== false);

    // ── Load shipping settings from Firestore ──
    // Collection: settings
    // Document fields: standard{name,price,days}, express{name,price,days}, freeThreshold, id:"shipping"
    try {
      const settingsSnap = await _getDocs(_collection(_db, "settings"));
      settingsSnap.docs.forEach((d) => {
        const data = d.data();
        if (data.id === "shipping" || d.id === "shipping") {
          SHIPPING_RATES = {
            standard: data.standard, // { name, price, days }
            express: data.express, // { name, price, days }
            freeThreshold: data.freeThreshold,
          };
        }
      });
    } catch (e) {
      console.error("Failed to load shipping settings:", e);
    }

    if (!SHIPPING_RATES) {
      showToast("Could not load shipping settings. Please refresh.", "error");
      return;
    }

    renderPage(APP.currentPage, {});
    renderFeaturedProducts();
    renderHeroCategories();
    buildShopFilterBar();
  } catch (e) {
    console.error("Firebase init error:", e);
    showToast("Could not connect to store database. Please refresh.", "error");
  }
}

// ─── INIT ───
document.addEventListener("DOMContentLoaded", () => {
  initHeader();
  initFBPixel();
  showPage("home");
  updateCartBadge();
  initFloatingChat();
  showEmailPopup();
  initFirebase();
});

// ─── ROUTER ───
function showPage(page, params = {}) {
  document
    .querySelectorAll(".page")
    .forEach((p) => p.classList.remove("active"));
  const el = document.getElementById(`page-${page}`);
  if (el) {
    el.classList.add("active");
    APP.currentPage = page;
    window.scrollTo(0, 0);
    renderPage(page, params);
    updateNavActive(page);
  }
}

function renderPage(page, params) {
  switch (page) {
    case "home":
      renderHome();
      break;
    case "shop":
      renderShop(params);
      break;
    case "product":
      renderProductDetail(params.id);
      break;
    case "cart":
      renderCart();
      break;
    case "checkout":
      renderCheckout();
      break;
    case "success":
      renderSuccess(params);
      break;
    case "category":
      renderCategory(params.cat);
      break;
    case "track":
      renderTracking(params.orderId);
      break;
  }
}

function updateNavActive(page) {
  document.querySelectorAll(".main-nav a").forEach((a) => {
    a.classList.toggle("active", a.dataset.page === page);
  });
}

// ─── HEADER ───
function initHeader() {
  window.addEventListener("scroll", () => {
    document
      .getElementById("header")
      .classList.toggle("scrolled", window.scrollY > 20);
  });
}

// ─── HOME PAGE ───
function renderHome() {
  renderHeroCategories();
  renderFeaturedProducts();
}

function renderHeroCategories() {
  const grid = document.getElementById("categories-grid");
  if (!grid) return;
  grid.innerHTML = CATEGORIES.map(
    (cat, i) => `
    <a class="category-card ${i === 0 ? "span-2" : ""}" onclick="showPage('category',{cat:'${cat.id}'})" style="cursor:pointer">
      <div class="category-card-bg">
        <div class="category-card-bg-color" style="background:linear-gradient(135deg,${cat.color},${cat.color}cc);position:relative;width:100%;height:100%">
          <img src="${cat.image}" alt="${cat.name}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;mix-blend-mode:overlay;opacity:0.6" loading="lazy">
        </div>
      </div>
      <div class="category-card-overlay"></div>
      <div class="category-card-content">
        <div class="category-card-label">${cat.label}</div>
        <div class="category-card-title">${cat.name}</div>
        <div class="category-card-link">Shop Now <span>→</span></div>
      </div>
    </a>`,
  ).join("");
}

function renderFeaturedProducts() {
  const container = document.getElementById("featured-products");
  if (!container) return;
  const featured = APP.products.filter((p) => p.featured).slice(0, 8);
  if (!featured.length) {
    container.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--gray-400)">
      <div style="font-size:2.5rem;margin-bottom:12px">👗</div>
      <p>Products are loading…</p>
    </div>`;
    return;
  }
  container.innerHTML = featured.map(renderProductCard).join("");
}

// ─── PRODUCT CARD ───
function renderProductCard(p) {
  const inWishlist = APP.wishlist.includes(p.id);
  const detailUrl = `product-details.html?id=${p.id}`;
  return `
    <div class="product-card" data-id="${p.id}">
      <div class="product-card-img">
        ${p.badge ? `<span class="product-badge badge-${p.badge}">${p.badge === "sale" ? `−${p.discount}%` : p.badge}</span>` : ""}
        <img src="${p.images?.[0] || p.image || "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=600"}" alt="${p.name}" loading="lazy" onclick="window.location.href='${detailUrl}'" style="cursor:pointer">
        <div class="product-actions">
          <button class="btn btn-primary" onclick="addToCart('${p.id}');event.stopPropagation()">Add to Cart</button>
          <button class="btn btn-gold" onclick="buyNow('${p.id}');event.stopPropagation()">Buy Now</button>
        </div>
        <button class="product-wishlist ${inWishlist ? "active" : ""}" onclick="toggleWishlist('${p.id}');event.stopPropagation()" title="Wishlist">
          ${inWishlist ? "♥" : "♡"}
        </button>
      </div>
      <div class="product-info">
        <div class="product-category">${p.category || ""}</div>
        <a class="product-title" href="${detailUrl}" style="cursor:pointer">${p.name}</a>
        <div class="product-rating">
          <div class="stars">${"★".repeat(Math.round(p.rating || 5))}${"☆".repeat(5 - Math.round(p.rating || 5))}</div>
          <span class="rating-count">(${p.reviews || 0})</span>
        </div>
        <div class="product-price">
          <span class="price-current">€${(p.price || 0).toLocaleString()}</span>
          ${p.originalPrice ? `<span class="price-original">€${p.originalPrice.toLocaleString()}</span>` : ""}
          ${p.discount ? `<span class="price-discount">−${p.discount}%</span>` : ""}
        </div>
      </div>
    </div>`;
}

// ─── SHOP PAGE ───
function renderShop(params = {}) {
  if (params.category) APP.filterCategory = params.category;
  const shopGrid = document.getElementById("shop-grid");
  const shopCount = document.getElementById("shop-count");
  if (!shopGrid) return;

  let products = [...APP.products];
  if (APP.filterCategory !== "all") {
    products = products.filter(
      (p) =>
        p.category === APP.filterCategory ||
        (APP.filterCategory === "sale" && p.discount),
    );
  }
  if (APP.searchQuery) {
    const q = APP.searchQuery.toLowerCase();
    products = products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.tags || []).some((t) => t.includes(q)),
    );
  }
  switch (APP.sortBy) {
    case "price-asc":
      products.sort((a, b) => a.price - b.price);
      break;
    case "price-desc":
      products.sort((a, b) => b.price - a.price);
      break;
    case "rating":
      products.sort((a, b) => (b.rating || 5) - (a.rating || 5));
      break;
    case "newest":
      products.sort((a, b) =>
        (b.createdAt || "").localeCompare(a.createdAt || ""),
      );
      break;
  }

  if (shopCount) shopCount.textContent = `${products.length} Products`;
  shopGrid.innerHTML = products.length
    ? products.map(renderProductCard).join("")
    : `<div style="grid-column:1/-1;text-align:center;padding:60px 0;color:var(--gray-400)">
        <div style="font-size:3rem;margin-bottom:16px">🔍</div>
        <h3 style="font-family:var(--font-display);color:var(--black)">No products found</h3>
        <p>Try different filters or search terms</p>
      </div>`;
}

// ─── PRODUCT DETAIL ───
function renderProductDetail(id) {
  const product = APP.products.find((p) => p.id === id);
  if (!product) return;
  APP.currentProduct = product;

  const container = document.getElementById("product-detail-content");
  if (!container) return;

  const sizeGuideHTML =
    product.sizeGuide && product.sizeGuide.length
      ? `<div style="margin-top:16px">
        <div style="font-size:0.78rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:10px">📏 Measurement Size Guide</div>
        <table style="width:100%;border-collapse:collapse;font-size:0.82rem">
          <thead>
            <tr style="background:var(--cream)">
              <th style="padding:8px 12px;text-align:left;border:1px solid var(--gray-200);font-size:0.72rem;letter-spacing:0.1em;text-transform:uppercase">Size</th>
              <th style="padding:8px 12px;text-align:left;border:1px solid var(--gray-200);font-size:0.72rem;letter-spacing:0.1em;text-transform:uppercase">Height</th>
              <th style="padding:8px 12px;text-align:left;border:1px solid var(--gray-200);font-size:0.72rem;letter-spacing:0.1em;text-transform:uppercase">Width</th>
            </tr>
          </thead>
          <tbody>
            ${product.sizeGuide
              .map(
                (row) => `
              <tr>
                <td style="padding:8px 12px;border:1px solid var(--gray-200);font-weight:600">Size ${row.size}</td>
                <td style="padding:8px 12px;border:1px solid var(--gray-200)">${row.height}</td>
                <td style="padding:8px 12px;border:1px solid var(--gray-200)">${row.width}</td>
              </tr>`,
              )
              .join("")}
          </tbody>
        </table>
      </div>`
      : "";

  container.innerHTML = `
    <nav class="breadcrumb">
      <a onclick="showPage('home')">Home</a><span class="breadcrumb-sep">›</span>
      <a onclick="showPage('shop')">Shop</a><span class="breadcrumb-sep">›</span>
      <a onclick="showPage('category',{cat:'${product.category}'})">${product.category}</a><span class="breadcrumb-sep">›</span>
      <span class="breadcrumb-current">${product.name}</span>
    </nav>

    <div class="product-detail">
      <div class="product-gallery">
        <div class="gallery-main">
          <img id="main-img" src="${product.images?.[0] || "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=600"}" alt="${product.name}">
        </div>
        <div class="gallery-thumbs">
          ${(product.images || [])
            .map(
              (img, i) => `
            <div class="gallery-thumb ${i === 0 ? "active" : ""}" onclick="setMainImg(${i})">
              <img src="${img}" alt="${product.name}">
            </div>`,
            )
            .join("")}
        </div>
      </div>

      <div class="product-detail-info">
        <div class="product-detail-brand">${product.category}</div>
        <h1 class="product-detail-title">${product.name}</h1>

        <div class="product-rating" style="margin-bottom:16px">
          <div class="stars">${"★".repeat(Math.round(product.rating || 5))}${"☆".repeat(5 - Math.round(product.rating || 5))}</div>
          <span class="rating-count">${(product.rating || 5).toFixed(1)} (${product.reviews || 0} reviews)</span>
        </div>

        <div class="product-detail-price">
          <span class="price-current">€${(product.price || 0).toLocaleString()}</span>
          ${product.originalPrice ? `<span class="price-original">€${product.originalPrice.toLocaleString()}</span>` : ""}
          ${product.discount ? `<span class="price-discount">Save ${product.discount}%</span>` : ""}
        </div>

        <div style="background:var(--cream);padding:18px 20px;margin:16px 0;border-left:3px solid var(--gold)">
          <div style="font-size:0.72rem;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:var(--gold);margin-bottom:8px">Product Description</div>
          <p style="font-size:0.9rem;line-height:1.85;color:var(--gray-800);margin:0">${product.description || "Premium quality product."}</p>
          ${product.material ? `<div style="margin-top:10px;font-size:0.8rem;color:var(--gray-600)"><strong>Material:</strong> ${product.material}</div>` : ""}
        </div>

        ${sizeGuideHTML}

        ${
          product.colors && product.colors.length
            ? `
        <div class="variation-group" style="margin-top:20px">
          <div class="variation-label">Color</div>
          <div class="color-options">
            ${product.colors
              .map(
                (color, i) => `
              <button class="color-btn ${i === 0 ? "active" : ""}" style="background:${color}" onclick="selectColor(this,'${color}')" data-color="${color}"></button>`,
              )
              .join("")}
          </div>
        </div>`
            : ""
        }

        ${
          product.sizes && product.sizes.length
            ? `
        <div class="variation-group">
          <div class="variation-label">Size</div>
          <div class="size-options">
            ${product.sizes
              .map(
                (size, i) => `
              <button class="size-btn ${i === 0 ? "active" : ""}" onclick="selectSize(this,'${size}')">${size}</button>`,
              )
              .join("")}
          </div>
        </div>`
            : ""
        }

        <div class="variation-group">
          <div class="variation-label">Quantity</div>
          <div class="qty-selector">
            <button class="qty-btn" onclick="changeQty(-1)">−</button>
            <input class="qty-input" type="number" id="qty-input" value="1" min="1" max="10">
            <button class="qty-btn" onclick="changeQty(1)">+</button>
          </div>
        </div>

        <div style="display:flex;gap:12px;margin-top:24px">
          <button class="btn btn-gold btn-lg" style="flex:1" onclick="addToCartDetail()">Add to Cart</button>
          <button class="btn btn-primary btn-lg" style="flex:1" onclick="buyNowDetail()">Buy Now</button>
        </div>

        <div style="display:flex;gap:20px;margin-top:20px;font-size:0.8rem;color:var(--gray-400)">
          <span>🔒 Secure Checkout</span>
          <span>🚚 Fast Delivery</span>
          <span>↩️ Easy Returns</span>
        </div>
      </div>
    </div>

    <div style="padding:60px 0 0">
      <div class="text-center" style="margin-bottom:48px">
        <div class="section-subtitle">Similar Items</div>
        <h2 class="section-title">You May Also Like</h2>
      </div>
      <div class="products-grid">
        ${APP.products
          .filter((p) => p.category === product.category && p.id !== product.id)
          .slice(0, 4)
          .map(renderProductCard)
          .join("")}
      </div>
    </div>`;

  fbEvent("ViewContent", {
    content_ids: [product.id],
    content_name: product.name,
    value: product.price,
    currency: "EUR",
    content_type: "product",
  });
}

// ─── CUSTOMER IMAGE UPLOAD ───
let customerUploadedImages = [];

function handleCustomerImages(input) {
  const files = Array.from(input.files).slice(0, 3);
  customerUploadedImages = [];
  const preview = document.getElementById("customer-img-preview");
  if (!preview) return;
  preview.innerHTML = "";
  files.forEach((file) => {
    const url = URL.createObjectURL(file);
    customerUploadedImages.push(url);
    const div = document.createElement("div");
    div.style.cssText = "position:relative;width:72px;height:82px";
    div.innerHTML = `<img src="${url}" style="width:100%;height:100%;object-fit:cover;border:1px solid var(--gray-200)">`;
    preview.appendChild(div);
  });
}

// ─── GALLERY ───
function setMainImg(index) {
  const product = APP.currentProduct;
  if (!product) return;
  document.getElementById("main-img").src = product.images[index];
  document
    .querySelectorAll(".gallery-thumb")
    .forEach((t, i) => t.classList.toggle("active", i === index));
}

// ─── VARIATION SELECTORS ───
function selectSize(el, size) {
  document
    .querySelectorAll(".size-btn")
    .forEach((b) => b.classList.remove("active"));
  el.classList.add("active");
}
function selectColor(el, color) {
  document
    .querySelectorAll(".color-btn")
    .forEach((b) => b.classList.remove("active"));
  el.classList.add("active");
}
function changeQty(delta) {
  const input = document.getElementById("qty-input");
  if (!input) return;
  input.value = Math.max(1, Math.min(10, parseInt(input.value || 1) + delta));
}

// ─── WISHLIST ───
function toggleWishlist(id) {
  const idx = APP.wishlist.indexOf(id);
  if (idx > -1) {
    APP.wishlist.splice(idx, 1);
    showToast("Removed from wishlist", "info");
  } else {
    APP.wishlist.push(id);
    showToast("Added to wishlist ♥", "success");
  }
  localStorage.setItem("luxe_wishlist", JSON.stringify(APP.wishlist));
}

// ─── CART ───
function addToCart(productId, options = {}) {
  const product = APP.products.find((p) => p.id === productId);
  if (!product) return;
  const size = options.size || (product.sizes && product.sizes[0]) || "M";
  const color =
    options.color || (product.colors && product.colors[0]) || "#1a1a1a";
  const qty = options.qty || 1;
  const key = `${productId}-${size}-${color}`;
  const existing = APP.cart.find((item) => item.key === key);
  if (existing) {
    existing.qty = Math.min(existing.qty + qty, 10);
  } else {
    APP.cart.push({
      key,
      productId,
      size,
      color,
      qty,
      price: product.price,
      name: product.name,
      image: product.images?.[0] || "",
    });
  }
  saveCart();
  updateCartBadge();
  showToast(`${product.name} added to cart! 🛒`, "success");
  fbEvent("AddToCart", {
    content_ids: [productId],
    content_name: product.name,
    value: product.price,
    currency: "EUR",
    content_type: "product",
  });
}

function addToCartDetail() {
  if (!APP.currentProduct) return;
  const size = document.querySelector(".size-btn.active")?.textContent;
  const color = document.querySelector(".color-btn.active")?.dataset.color;
  const qty = parseInt(document.getElementById("qty-input")?.value || "1");
  addToCart(APP.currentProduct.id, { size, color, qty });
}

function buyNow(productId) {
  addToCart(productId);
  showPage("cart");
}
function buyNowDetail() {
  addToCartDetail();
  showPage("checkout");
}

function removeFromCart(key) {
  APP.cart = APP.cart.filter((item) => item.key !== key);
  saveCart();
  updateCartBadge();
  renderCart();
}
function updateCartQty(key, delta) {
  const item = APP.cart.find((i) => i.key === key);
  if (!item) return;
  item.qty = Math.max(1, Math.min(10, item.qty + delta));
  saveCart();
  renderCart();
}
function saveCart() {
  localStorage.setItem("luxe_cart", JSON.stringify(APP.cart));
}
function updateCartBadge() {
  const total = APP.cart.reduce((s, i) => s + i.qty, 0);
  document.querySelectorAll(".cart-count").forEach((el) => {
    el.textContent = total;
    el.style.display = total > 0 ? "flex" : "none";
  });
}

// ─── CART PAGE ───
function renderCart() {
  const container = document.getElementById("cart-content");
  if (!container) return;
  if (!APP.cart.length) {
    container.innerHTML = `<div style="text-align:center;padding:80px 0">
      <div style="font-size:4rem;margin-bottom:20px">🛍️</div>
      <h2 style="font-family:var(--font-display);margin-bottom:12px">Your cart is empty</h2>
      <p style="margin-bottom:28px">Discover our latest collection</p>
      <button class="btn btn-primary btn-lg" onclick="showPage('shop')">Continue Shopping</button>
    </div>`;
    return;
  }

  const subtotal = APP.cart.reduce((s, i) => s + i.price * i.qty, 0);
  const freeThreshold = SHIPPING_RATES?.freeThreshold ?? null;
  const standardPrice = SHIPPING_RATES?.standard?.price ?? null;
  const shipping =
    freeThreshold !== null && subtotal >= freeThreshold
      ? 0
      : (standardPrice ?? 0);
  const total = subtotal + shipping;
  const shippingLabel =
    shipping === 0
      ? "FREE"
      : standardPrice !== null
        ? "€" + shipping
        : "Calculated at checkout";

  container.innerHTML = `
    <div class="cart-layout">
      <div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px">
          <h2 style="font-family:var(--font-display);font-size:1.5rem">Your Cart (${APP.cart.reduce((s, i) => s + i.qty, 0)})</h2>
          <button onclick="APP.cart=[];saveCart();updateCartBadge();renderCart()" style="font-size:0.8rem;color:var(--gray-400);background:none;border:none;cursor:pointer;text-decoration:underline">Clear All</button>
        </div>
        <div class="cart-items">
          ${APP.cart
            .map(
              (item) => `
            <div class="cart-item">
              <div class="cart-item-img"><img src="${item.image}" alt="${item.name}"></div>
              <div>
                <div class="cart-item-title">${item.name}</div>
                <div class="cart-item-variant">Size: ${item.size} | Color: <span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:${item.color};vertical-align:middle;margin-left:4px;box-shadow:0 0 0 1px rgba(0,0,0,0.1)"></span></div>
                <div class="cart-item-price">€${(item.price * item.qty).toLocaleString()}</div>
                <div class="qty-selector" style="margin-top:10px">
                  <button class="qty-btn" onclick="updateCartQty('${item.key}',-1)">−</button>
                  <input class="qty-input" type="number" value="${item.qty}" min="1" max="10" readonly>
                  <button class="qty-btn" onclick="updateCartQty('${item.key}',1)">+</button>
                </div>
              </div>
              <button class="cart-item-remove" onclick="removeFromCart('${item.key}')">✕</button>
            </div>`,
            )
            .join("")}
        </div>
        <div style="padding:20px 0;border-top:1px solid var(--gray-100)">
          <button class="btn btn-outline btn-sm" onclick="showPage('shop')">← Continue Shopping</button>
        </div>
      </div>
      <div class="order-summary">
        <h3>Order Summary</h3>
        <div class="summary-row"><span>Subtotal</span><span>€${subtotal.toLocaleString()}</span></div>
        <div class="summary-row"><span>Shipping</span><span style="color:${shipping === 0 ? "var(--success)" : "inherit"}">${shippingLabel}</span></div>
        ${freeThreshold !== null && shipping > 0 ? `<p style="font-size:0.75rem;color:var(--gold);margin:8px 0">Add €${(freeThreshold - subtotal).toLocaleString()} more for free shipping!</p>` : ""}
        <div class="summary-total"><span>Total</span><span>€${total.toLocaleString()}</span></div>
        <button class="btn btn-gold btn-full" style="margin-top:20px;padding:16px" onclick="showPage('checkout')">Proceed to Checkout →</button>
        <div style="text-align:center;margin-top:16px;font-size:0.75rem;color:var(--gray-400)">🔒 Secure checkout &nbsp;|&nbsp; Free returns</div>
      </div>
    </div>`;
}

// ════════════════════════════════════════════════════════════
// ─── CHECKOUT — 100% dynamic from Firestore SHIPPING_RATES ───
// ════════════════════════════════════════════════════════════
function renderCheckout() {
  const container = document.getElementById("checkout-content");
  if (!container) return;

  // Shipping not loaded yet from Firestore — show spinner
  if (!SHIPPING_RATES) {
    container.innerHTML = `
      <div style="text-align:center;padding:80px 0">
        <div style="font-size:2rem;margin-bottom:16px">⏳</div>
        <p>Loading checkout options…</p>
      </div>`;
    return;
  }

  const { standard, express, freeThreshold } = SHIPPING_RATES;
  const subtotal = APP.cart.reduce((s, i) => s + i.price * i.qty, 0);
  const isFree = subtotal >= freeThreshold;
  const initShip = isFree ? 0 : standard.price;
  const initTotal = subtotal + initShip;

  selectedPayment = "cod";

  container.innerHTML = `
    <div style="margin-bottom:32px">
      <h1 style="font-family:var(--font-display);font-size:2rem;margin-bottom:6px">Checkout</h1>
      <p style="font-size:0.85rem;color:var(--gray-400)">Complete your order below</p>
    </div>
    <div class="checkout-layout">
      <div class="checkout-form">

        <div class="form-section">
          <h3>Contact Information</h3>
          <div class="form-grid">
            <div class="form-group"><label>First Name *</label><input type="text" id="first-name" placeholder="John"></div>
            <div class="form-group"><label>Last Name *</label><input type="text" id="last-name" placeholder="Smith"></div>
            <div class="form-group"><label>Email Address *</label><input type="email" id="email" placeholder="john@email.com"></div>
            <div class="form-group"><label>Phone Number *</label><input type="tel" id="phone" placeholder="+39 123 456 789"></div>
          </div>
        </div>

        <div class="form-section">
          <h3>Shipping Address</h3>
          <div class="form-grid full">
            <div class="form-group"><label>Street Address *</label><input type="text" id="address" placeholder="Via Roma 12, Apt 4B"></div>
          </div>
          <div class="form-grid">
            <div class="form-group"><label>City *</label><input type="text" id="city" placeholder="Milano"></div>
            <div class="form-group"><label>Postal Code</label><input type="text" id="zip" placeholder="20121"></div>
            <div class="form-group"><label>Country</label>
              <select id="country">
                <option>Italy</option><option>Germany</option><option>France</option>
                <option>Netherlands</option><option>Belgium</option><option>Austria</option>
                <option>Spain</option><option>United Kingdom</option><option>Other</option>
              </select>
            </div>
            <div class="form-group"><label>Shipping Method</label>
              <select id="shipping-method" onchange="updateCheckoutTotal()">
                <option value="${standard.price}">🚚 ${standard.name} (${standard.days}) — €${standard.price}</option>
                <option value="${express.price}">⚡ ${express.name} (${express.days}) — €${express.price}</option>
              </select>
            </div>
          </div>
          <div class="form-grid full">
            <div class="form-group"><label>Order Notes</label>
              <textarea id="notes" placeholder="Delivery instructions, size queries, etc." style="height:80px"></textarea>
            </div>
          </div>
        </div>

        <div class="form-section">
          <h3>Payment Method</h3>
          <div class="payment-methods">
            <div class="payment-option selected" onclick="selectPayment(this,'cod')">
              <div class="payment-radio"><div class="payment-radio-inner"></div></div>
              <div><div class="payment-label">Cash on Delivery</div><div style="font-size:0.75rem;color:var(--gray-400)">Pay when your order arrives</div></div>
              <div class="payment-icon">💵</div>
            </div>
            <div class="payment-option" onclick="selectPayment(this,'card')">
              <div class="payment-radio"><div class="payment-radio-inner"></div></div>
              <div><div class="payment-label">Credit / Debit Card</div><div style="font-size:0.75rem;color:var(--gray-400)">Visa, MasterCard, Amex</div></div>
              <div class="payment-icon">💳</div>
            </div>
          </div>
        </div>

        <button class="btn btn-gold btn-full" style="padding:18px;font-size:0.95rem" onclick="placeOrder()" id="place-order-btn">
          Place Order — €${initTotal.toLocaleString()}
        </button>
        <p style="text-align:center;font-size:0.75rem;color:var(--gray-400);margin-top:12px">
          🔒 Secure checkout. By placing an order you agree to our Terms &amp; Privacy Policy.
        </p>
      </div>

      <div class="order-summary" style="position:sticky;top:90px;height:fit-content">
        <h3>Order Summary</h3>
        ${APP.cart
          .map(
            (item) => `
          <div style="display:flex;gap:12px;align-items:center;padding:10px 0;border-bottom:1px solid var(--gray-200)">
            <div style="position:relative">
              <img src="${item.image}" style="width:52px;height:60px;object-fit:cover;background:var(--gray-100)">
              <span style="position:absolute;top:-6px;right:-6px;background:var(--black);color:white;border-radius:50%;width:18px;height:18px;font-size:0.65rem;display:flex;align-items:center;justify-content:center">${item.qty}</span>
            </div>
            <div style="flex:1"><div style="font-size:0.82rem;font-weight:600">${item.name}</div><div style="font-size:0.72rem;color:var(--gray-400)">${item.size}</div></div>
            <span style="font-size:0.88rem;font-weight:600">€${(item.price * item.qty).toLocaleString()}</span>
          </div>`,
          )
          .join("")}
        <div class="summary-row" style="margin-top:8px"><span>Subtotal</span><span>€${subtotal.toLocaleString()}</span></div>
        <div class="summary-row"><span>Shipping</span><span id="checkout-shipping-display">${isFree ? "FREE" : "€" + initShip}</span></div>
        <div class="summary-total"><span>Total</span><span id="checkout-total-display">€${initTotal.toLocaleString()}</span></div>
      </div>
    </div>`;
}

function updateCheckoutTotal() {
  if (!SHIPPING_RATES) return;

  const subtotal = APP.cart.reduce((s, i) => s + i.price * i.qty, 0);
  const shippingSelect = document.getElementById("shipping-method");
  if (!shippingSelect) return;

  const selectedPrice = parseFloat(shippingSelect.value);

  const shipping = selectedPrice; // no free logic
  const total = subtotal + shipping;

  // Update Shipping display
  const shipDisplay = document.getElementById("checkout-shipping-display");
  if (shipDisplay) shipDisplay.textContent = "€" + shipping;

  // Update Total display
  const totalDisplay = document.getElementById("checkout-total-display");
  if (totalDisplay) totalDisplay.textContent = "€" + total.toLocaleString();

  // Update Place Order button
  const btn = document.getElementById("place-order-btn");
  if (btn) btn.textContent = `Place Order — €${total.toLocaleString()}`;
}

let selectedPayment = "cod";
function selectPayment(el, method) {
  document
    .querySelectorAll(".payment-option")
    .forEach((o) => o.classList.remove("selected"));
  el.classList.add("selected");
  selectedPayment = method;
}

// ─── PLACE ORDER ───
async function placeOrder() {
  const firstName = document.getElementById("first-name")?.value?.trim();
  const lastName = document.getElementById("last-name")?.value?.trim();
  const email = document.getElementById("email")?.value?.trim();
  const phone = document.getElementById("phone")?.value?.trim();
  const address = document.getElementById("address")?.value?.trim();
  const city = document.getElementById("city")?.value?.trim();
  const zip = document.getElementById("zip")?.value?.trim() || "";
  const country = document.getElementById("country")?.value || "";
  const notes = document.getElementById("notes")?.value?.trim() || "";
  const shippingCost = parseFloat(
    document.getElementById("shipping-method")?.value ||
      SHIPPING_RATES.standard.price,
  );

  if (!firstName || !email || !phone || !address || !city) {
    showToast("Please fill in all required fields", "error");
    return;
  }
  if (!APP.cart.length) {
    showToast("Your cart is empty", "error");
    return;
  }

  const btn = document.getElementById("place-order-btn");
  if (btn) {
    btn.textContent = "Placing Order…";
    btn.disabled = true;
  }

  const orderId = "ORD-" + Date.now();
  const subtotal = APP.cart.reduce((s, i) => s + i.price * i.qty, 0);
  const shipping = subtotal >= SHIPPING_RATES.freeThreshold ? 0 : shippingCost;
  const total = subtotal + shipping;

  // Resolve label from Firestore data
  const shippingLabel =
    shippingCost === SHIPPING_RATES.express.price
      ? `${SHIPPING_RATES.express.name} (${SHIPPING_RATES.express.days})`
      : `${SHIPPING_RATES.standard.name} (${SHIPPING_RATES.standard.days})`;

  const orderData = {
    id: orderId,
    customer: `${firstName} ${lastName}`,
    email,
    phone,
    address: `${address}, ${city}${zip ? " " + zip : ""}, ${country}`,
    notes,
    items: APP.cart.map((i) => ({
      name: i.name,
      qty: i.qty,
      price: i.price,
      size: i.size,
      color: i.color,
      productId: i.productId,
    })),
    subtotal,
    shipping,
    shippingLabel,
    total,
    status: "pending",
    payment: selectedPayment,
    date: new Date().toISOString().split("T")[0],
    createdAt: new Date().toISOString(),
    customerImages: customerUploadedImages,
  };

  if (APP.firebaseReady && _db) {
    try {
      await _addDoc(_collection(_db, "orders"), orderData);
    } catch (e) {
      console.error("Could not save order to Firestore:", e);
      if (btn) {
        btn.textContent = `Place Order — €${total.toLocaleString()}`;
        btn.disabled = false;
      }
      showToast("Order failed. Please try again.", "error");
      return;
    }
  } else {
    if (btn) {
      btn.textContent = `Place Order — €${total.toLocaleString()}`;
      btn.disabled = false;
    }
    showToast("Store not ready yet. Please wait and try again.", "error");
    return;
  }

  customerUploadedImages = [];
  fbEvent("Purchase", {
    value: total,
    currency: "EUR",
    content_ids: APP.cart.map((i) => i.productId),
    num_items: APP.cart.reduce((s, i) => s + i.qty, 0),
  });

  APP.orders.unshift(orderData);
  APP.cart = [];
  saveCart();
  updateCartBadge();
  showPage("success", { orderId, total, email });
}

// ─── SUCCESS PAGE ───
function renderSuccess(params) {
  const container = document.getElementById("success-content");
  if (!container) return;
  container.innerHTML = `
    <div class="success-page">
      <div>
        <div class="success-icon">✓</div>
        <h1 style="font-family:var(--font-display);font-size:2.2rem;margin-bottom:12px">Order Confirmed!</h1>
        <p style="max-width:480px;margin:0 auto 20px">Thank you for your purchase. We've received your order and will start processing it right away.</p>
        <div class="success-order-id">${params.orderId || "ORD-001"}</div>
        <p style="font-size:0.85rem;color:var(--gray-400);margin:8px 0 32px">Confirmation sent to <strong>${params.email || "your email"}</strong></p>
        <div style="display:flex;justify-content:center;gap:16px;flex-wrap:wrap">
          <button class="btn btn-gold btn-lg" onclick="showPage('track',{orderId:'${params.orderId}'})">Track My Order</button>
          <button class="btn btn-outline btn-lg" onclick="showPage('shop')">Continue Shopping</button>
        </div>
        <div style="margin-top:40px;padding:24px;background:var(--cream);max-width:360px;margin-left:auto;margin-right:auto">
          <div style="font-size:0.8rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:12px">What's Next?</div>
          <div style="display:flex;flex-direction:column;gap:10px;font-size:0.85rem;color:var(--gray-600)">
            <div>📦 Order processed within 24 hours</div>
            <div>🚚 Shipped via courier (3–5 business days)</div>
            <div>📱 Email updates on your order</div>
          </div>
        </div>
      </div>
    </div>`;
}

// ─── CATEGORY PAGE ───
function renderCategory(cat) {
  APP.filterCategory = cat || "all";
  const container = document.getElementById("category-content");
  if (!container) return;
  const catData = CATEGORIES.find((c) => c.id === cat);
  container.innerHTML = `
    <div style="padding:40px 0 20px">
      <nav class="breadcrumb">
        <a onclick="showPage('home')">Home</a><span class="breadcrumb-sep">›</span>
        <span class="breadcrumb-current">${catData?.name || "All"}</span>
      </nav>
      <h1 style="font-family:var(--font-display);font-size:2.5rem;margin-bottom:8px">${catData?.name || "All Products"}</h1>
    </div>
    <div class="shop-header">
      <div class="filter-bar">
        <button class="filter-btn ${APP.filterCategory === "all" ? "active" : ""}" onclick="setFilter('all')">All</button>
        ${CATEGORIES.map((c) => `<button class="filter-btn ${APP.filterCategory === c.id ? "active" : ""}" onclick="setFilter('${c.id}')">${c.name}</button>`).join("")}
      </div>
      <select class="sort-select" onchange="setSort(this.value)">
        <option value="default">Sort: Featured</option>
        <option value="price-asc">Price: Low to High</option>
        <option value="price-desc">Price: High to Low</option>
        <option value="rating">Best Rated</option>
      </select>
    </div>
    <div class="products-grid" id="category-grid"></div>`;

  const grid = document.getElementById("category-grid");
  let products = APP.products;
  if (APP.filterCategory !== "all") {
    products = products.filter(
      (p) =>
        p.category === APP.filterCategory ||
        (APP.filterCategory === "sale" && p.discount),
    );
  }
  grid.innerHTML = products.length
    ? products.map(renderProductCard).join("")
    : `<div style="grid-column:1/-1;text-align:center;padding:60px;color:var(--gray-400)"><div style="font-size:3rem;margin-bottom:16px">🔍</div><p>No products in this category yet.</p></div>`;
}

// ─── DYNAMIC SHOP FILTER BAR ───
function buildShopFilterBar() {
  var filterBar = document.getElementById("filter-bar");
  if (!filterBar) return;
  var cats = [
    ...new Set(
      APP.products
        .map(function (p) {
          return p.category;
        })
        .filter(Boolean),
    ),
  ];
  filterBar.innerHTML =
    '<button class="filter-btn ' +
    (APP.filterCategory === "all" ? "active" : "") +
    "\" onclick=\"setFilter('all');document.querySelectorAll('#filter-bar .filter-btn').forEach(function(b){b.classList.remove('active')});this.classList.add('active')\">All</button>";
  cats.forEach(function (cat) {
    var label = cat.charAt(0).toUpperCase() + cat.slice(1);
    var btn = document.createElement("button");
    btn.className =
      "filter-btn" + (APP.filterCategory === cat ? " active" : "");
    btn.textContent = label;
    btn.setAttribute("data-cat", cat);
    btn.onclick = function () {
      document
        .querySelectorAll("#filter-bar .filter-btn")
        .forEach(function (b) {
          b.classList.remove("active");
        });
      this.classList.add("active");
      setFilter(cat);
    };
    filterBar.appendChild(btn);
  });
}

function setFilter(cat) {
  APP.filterCategory = cat;
  if (APP.currentPage === "shop") renderShop();
  else renderCategory(cat);
}
function setSort(val) {
  APP.sortBy = val;
  renderShop();
}

// ─── ORDER TRACKING ───
async function renderTracking(orderId) {
  const container = document.getElementById("tracking-content");
  if (!container) return;

  if (!orderId) {
    container.innerHTML = `
      <div style="max-width:520px;margin:80px auto;padding:0 24px;text-align:center">
        <div style="font-size:3rem;margin-bottom:20px">📦</div>
        <h1 style="font-family:var(--font-display);font-size:2rem;margin-bottom:8px">Track Your Order</h1>
        <p style="margin-bottom:32px;color:var(--gray-600)">Enter your Order ID to get real-time updates on your shipment.</p>
        <div style="display:flex;gap:0;max-width:400px;margin:0 auto">
          <input type="text" id="track-input" placeholder="e.g. ORD-1234567890"
            style="flex:1;padding:14px 16px;border:1.5px solid var(--gray-200);border-right:none;font-family:var(--font-body);font-size:0.9rem;outline:none"
            onfocus="this.style.borderColor='var(--gold)'" onblur="this.style.borderColor='var(--gray-200)'"
            onkeydown="if(event.key==='Enter')trackOrder()">
          <button class="btn btn-gold" style="border-radius:0;padding:14px 24px" onclick="trackOrder()">Track</button>
        </div>
        <p style="font-size:0.78rem;color:var(--gray-400);margin-top:16px">Your Order ID was sent to your email after purchase.</p>
      </div>`;
    return;
  }

  container.innerHTML = `<div class="loading-overlay" style="padding:80px 0;text-align:center"><div style="font-size:1.5rem">🔍 Looking up your order…</div></div>`;

  let order = APP.orders.find((o) => o.id === orderId);
  if (!order && APP.firebaseReady && _db) {
    try {
      const q = _query(_collection(_db, "orders"), _where("id", "==", orderId));
      const snap = await _getDocs(q);
      if (!snap.empty)
        order = { firebaseId: snap.docs[0].id, ...snap.docs[0].data() };
    } catch (e) {
      console.error("Track order error:", e);
    }
  }

  if (!order) {
    container.innerHTML = `
      <div style="max-width:520px;margin:80px auto;padding:0 24px;text-align:center">
        <div style="font-size:3rem;margin-bottom:20px">❓</div>
        <h2 style="font-family:var(--font-display);margin-bottom:12px">Order Not Found</h2>
        <p style="margin-bottom:24px">We couldn't find order <strong>${orderId}</strong>. Please check the Order ID and try again.</p>
        <button class="btn btn-primary" onclick="showPage('track',{orderId:''})">Try Again</button>
      </div>`;
    return;
  }

  const steps = ["pending", "confirmed", "shipped", "delivered"];
  const stepData = [
    { title: "Order Placed", desc: "Your order has been received", icon: "📝" },
    {
      title: "Order Confirmed",
      desc: "Payment verified and confirmed",
      icon: "✓",
    },
    { title: "Shipped", desc: "Your order is on its way", icon: "🚚" },
    { title: "Delivered", desc: "Package delivered successfully", icon: "🏠" },
  ];
  const currentStep = steps.indexOf(order.status || "pending");

  container.innerHTML = `
    <div style="max-width:640px;margin:60px auto;padding:0 24px">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:32px">
        <button onclick="showPage('track',{orderId:''})" style="background:none;border:none;cursor:pointer;color:var(--gray-400);font-size:0.85rem;padding:0">← Search Again</button>
      </div>
      <h1 style="font-family:var(--font-display);font-size:2rem;margin-bottom:8px">Order Tracking</h1>
      <p style="margin-bottom:32px;color:var(--gray-600)">Order ID: <strong>${order.id}</strong></p>
      <div style="background:var(--cream);padding:24px;margin-bottom:32px">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;font-size:0.85rem">
          <div><span style="color:var(--gray-400)">Customer</span><br><strong>${order.customer || "—"}</strong></div>
          <div><span style="color:var(--gray-400)">Total</span><br><strong>€${(order.total || 0).toLocaleString()}</strong></div>
          <div><span style="color:var(--gray-400)">Order Date</span><br><strong>${(order.date || "").substr(0, 10)}</strong></div>
          <div><span style="color:var(--gray-400)">Status</span><br><span class="status-badge status-${order.status}">${order.status}</span></div>
        </div>
        ${order.address ? `<div style="margin-top:12px;font-size:0.82rem;color:var(--gray-600)"><span style="color:var(--gray-400)">Delivery Address:</span> ${order.address}</div>` : ""}
      </div>
      <div class="tracking-steps">
        ${stepData
          .map(
            (step, i) => `
          <div class="tracking-step ${i < currentStep ? "done" : i === currentStep ? "active" : ""}">
            <div class="step-line-group">
              <div class="step-dot">${i <= currentStep ? step.icon : ""}</div>
              ${i < 3 ? '<div class="step-connector"></div>' : ""}
            </div>
            <div class="step-content">
              <div class="step-title">${step.title}</div>
              <div class="step-desc">${step.desc}</div>
              <div class="step-date">${i <= currentStep ? "Completed" : "Pending"}</div>
            </div>
          </div>`,
          )
          .join("")}
      </div>
      <div style="margin-top:32px;display:flex;gap:12px">
        <button class="btn btn-outline" onclick="showPage('home')">← Back to Home</button>
        <button class="btn btn-primary" onclick="showPage('shop')">Shop More</button>
      </div>
    </div>`;
}

window.trackOrder = function () {
  const id = document.getElementById("track-input")?.value.trim();
  if (!id) {
    showToast("Please enter an Order ID", "error");
    return;
  }
  renderTracking(id);
};

// ─── MODAL ───
function showModal(html) {
  document.getElementById("modal-content").innerHTML = html;
  document.getElementById("modal-overlay").classList.add("show");
}
function closeModal() {
  document.getElementById("modal-overlay").classList.remove("show");
}

// ─── TOAST ───
function showToast(msg, type = "info") {
  const container = document.querySelector(".toast-container");
  if (!container) return;
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  const icons = { success: "✓", error: "✕", info: "ℹ" };
  toast.innerHTML = `<span style="font-weight:700">${icons[type] || "•"}</span> ${msg}`;
  container.appendChild(toast);
  setTimeout(() => toast.classList.add("show"), 10);
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 400);
  }, 3500);
}

// ─── FLOATING CHAT ───
function initFloatingChat() {
  const container = document.querySelector(".floating-chat");
  if (!container) return;
  container.innerHTML = `
    <div class="float-row">
      <span class="float-btn-label">Chat on Messenger</span>
      <a href="https://m.me/YourPageUsername" target="_blank" class="float-btn float-fb" title="Facebook Messenger">💬</a>
    </div>
    <div class="float-row">
      <span class="float-btn-label">Chat on WhatsApp</span>
      <a href="https://wa.me/390000000000" target="_blank" class="float-btn float-wa" title="WhatsApp">💬</a>
    </div>`;
}

// ─── EMAIL POPUP ───
function showEmailPopup() {
  if (localStorage.getItem("luxe_popup_dismissed")) return;
  setTimeout(() => {
    document.getElementById("email-popup")?.classList.add("show");
  }, 8000);
}
function closePopup() {
  document.getElementById("email-popup")?.classList.remove("show");
  localStorage.setItem("luxe_popup_dismissed", "1");
}
function subscribeEmail() {
  const email = document.getElementById("popup-email")?.value;
  if (!email) {
    showToast("Please enter your email", "error");
    return;
  }
  if (APP.firebaseReady && _db) {
    _addDoc(_collection(_db, "subscribers"), {
      email,
      createdAt: new Date().toISOString(),
    }).catch(() => {});
  }
  showToast("🎉 You're subscribed! Code: WELCOME20", "success");
  closePopup();
}

// ─── FACEBOOK PIXEL ───
function initFBPixel() {
  if (!FB_PIXEL_ID) return;
  !(function (f, b, e, v, n, t, s) {
    if (f.fbq) return;
    n = f.fbq = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    };
    if (!f._fbq) f._fbq = n;
    n.push = n;
    n.loaded = !0;
    n.version = "2.0";
    n.queue = [];
    t = b.createElement(e);
    t.async = !0;
    t.src = v;
    s = b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t, s);
  })(
    window,
    document,
    "script",
    "https://connect.facebook.net/en_US/fbevents.js",
  );
  fbq("init", FB_PIXEL_ID);
  fbq("track", "PageView");
}
function fbEvent(eventName, params = {}) {
  if (typeof fbq === "function") fbq("track", eventName, params);
}

// ─── SEARCH ───
function handleSearch(e) {
  if (e.key === "Enter" || e.type === "click") {
    APP.searchQuery = document.getElementById("search-input")?.value || "";
    showPage("shop");
  }
}

// ─── MOBILE MENU ───
function toggleMobileMenu() {
  const menu = document.getElementById("mobile-menu");
  const hamburger = document.querySelector(".hamburger");
  menu?.classList.toggle("open");
  hamburger?.classList.toggle("active");
}

// ─── KEYBOARD SHORTCUTS ───
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeModal();
    closePopup();
    document.getElementById("mobile-menu")?.classList.remove("open");
  }
});
