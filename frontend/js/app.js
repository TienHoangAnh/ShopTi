/**
 * App - hash routing and page render
 */
(function () {
  const content = document.getElementById('page-content');
  const routes = {
    '/': homePage,
    '/products': productsPage,
    '/product/:id': productDetailPage,
    '/cart': cartPage,
    '/checkout': checkoutPage,
    '/login': loginPage,
    '/register': registerPage,
    '/orders': ordersPage,
    '/order/:id': orderDetailPage,
    '/profile': profilePage,
    '/register-shop': shopRegisterPage,
    '/payment/:payment_code': shopPaymentPage,
    '/vouchers': vouchersPage,
    '/rewards': rewardsPage,
  };

  function getHash() {
    const hash = window.location.hash.slice(1) || '/';
    return hash.split('?')[0];
  }

  function getQuery() {
    const q = window.location.hash.split('?')[1] || '';
    return new URLSearchParams(q);
  }

  function matchRoute(path) {
    const parts = path.split('/').filter(Boolean);
    for (const route of Object.keys(routes)) {
      const rParts = route.split('/').filter(Boolean);
      if (rParts.length !== parts.length) continue;
      const params = {};
      let match = true;
      for (let i = 0; i < rParts.length; i++) {
        if (rParts[i].startsWith(':')) {
          params[rParts[i].slice(1)] = parts[i];
        } else if (rParts[i] !== parts[i]) {
          match = false;
          break;
        }
      }
      if (match) return { handler: routes[route], params };
    }
    return null;
  }

  async function render() {
    const path = getHash();
    const query = getQuery();
    const match = matchRoute(path);
    content.classList.add('page-enter', 'active');
    try {
      if (match) {
        content.innerHTML = '';
        await match.handler(content, match.params, query);
      } else {
        content.innerHTML = '<div class="section text-center"><h2>Not found</h2><a href="#/" class="btn btn-primary">Home</a></div>';
      }
    } catch (e) {
      console.error(e);
      content.innerHTML = '<div class="section text-center"><p class="text-secondary">Something went wrong.</p><a href="#/" class="btn btn-primary">Home</a></div>';
    }
    ui.updateNav();
  }

  window.addEventListener('hashchange', () => {
    document.querySelector('.nav')?.classList.remove('open');
    document.getElementById('menuToggle')?.setAttribute('aria-expanded', 'false');
    render();
  });
  window.addEventListener('load', render);

  document.getElementById('menuToggle')?.addEventListener('click', ui.toggleMobileNav);
  document.getElementById('logoutBtn')?.addEventListener('click', () => {
    auth.logout();
    ui.updateNav();
    window.location.hash = '#/';
  });

  // Pages
  async function homePage(el) {
    const filters = await products.getFilters();
    const categories = filters.categories || [];
    const res = await products.list({ limit: 12 });
    const productsList = res.products || [];
    let vouchers = [];
    try {
      const vres = await api.get('/vouchers');
      vouchers = vres.vouchers || [];
    } catch (_) {
      vouchers = [];
    }

    function categoryEmoji(name) {
      const s = String(name || '').toLowerCase();
      if (s.includes('thời trang') && s.includes('nam')) return '👕';
      if (s.includes('thời trang') && s.includes('nữ')) return '👗';
      if (s.includes('điện thoại')) return '📱';
      if (s.includes('mẹ') || s.includes('bé')) return '🧸';
      if (s.includes('laptop') || s.includes('máy tính') || s.includes('tính')) return '💻';
      if (s.includes('sức khỏe')) return '🩺';
      if (s.includes('đồng hồ')) return '⌚';
      if (s.includes('giày')) return '👟';
      if (s.includes('túi') || s.includes('ví')) return '👜';
      if (s.includes('nhà sách')) return '📚';
      if (s.includes('thể thao')) return '🏃';
      if (s.includes('ô tô') || s.includes('xe máy') || s.includes('xe đạp')) return '🚗';
      if (s.includes('balo')) return '🎒';
      if (s.includes('sắc đẹp')) return '💄';
      if (s.includes('sữa')) return '🥛';
      return '🛍️';
    }

    function discountForProduct(p) {
      const base = Number(p?.price || 0);
      // Fake deterministic discount from price/id to keep stable UI
      const x = Math.abs((String(p.id || '') + String(base)).split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0));
      const options = [5, 10, 15, 20, 25, 30];
      return options[x % options.length];
    }

    const flashProducts = productsList.slice(0, 8);
    const endTime = Date.now() + 45 * 60 * 1000;
    function formatLeft(ms) {
      if (ms < 0) return '00:00:00';
      const s = Math.floor(ms / 1000);
      const h = Math.floor(s / 3600);
      const m = Math.floor((s % 3600) / 60);
      const sec = s % 60;
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    }

    el.innerHTML = `
      <section class="section">
        <div class="card" style="padding:20px; margin-bottom:24px;">
          <h1 style="font-size:var(--h2); margin-bottom:8px;">Khám phá hàng ngàn sản phẩm ưu đãi mỗi ngày</h1>
          <p class="text-secondary mb-0" style="font-size:var(--body);">Danh mục, Flash Sale, Voucher & mã giảm giá</p>
        </div>

        <h2 style="font-size:var(--h3); margin-bottom:12px;">DANH MỤC</h2>
        <div class="category-section-wrap" style="position:relative; margin-bottom:24px;">
          <div id="category-scroll" style="overflow-x:auto; overflow-y:hidden; scroll-behavior:smooth; -webkit-overflow-scrolling:touch; scrollbar-width:thin; padding:0 52px;">
            <div class="category-grid" id="category-grid" style="display:grid; grid-template-rows:repeat(2, 1fr); grid-auto-flow:column; grid-template-columns:repeat(${Math.ceil(categories.length / 2)}, minmax(180px, 200px)); gap:18px;">
              ${categories.map((c) => {
                const emoji = categoryEmoji(c.name);
                return `
                  <a href="#/products?category_id=${encodeURIComponent(c.id)}" class="card category-tile" style="padding:16px 18px; text-decoration:none; display:flex; gap:14px; align-items:center; border-radius:14px; min-height:72px;">
                    <div style="width:48px; height:48px; flex-shrink:0; border-radius:50%; background:rgba(37,99,235,0.12); color:var(--primary); display:flex; align-items:center; justify-content:center; font-size:22px;">
                      ${escapeHtml(emoji)}
                    </div>
                    <div style="font-weight:600; font-size:14px; line-height:1.35; color:var(--text-primary); flex:1; min-width:0;">
                      ${escapeHtml(c.name)}
                    </div>
                  </a>
                `;
              }).join('')}
            </div>
          </div>
          <button type="button" class="btn btn-secondary category-slide-btn" id="category-slide-prev" aria-label="Trượt trái" style="position:absolute; left:8px; top:50%; transform:translateY(-50%); width:44px; height:44px; border-radius:50%; padding:0; display:flex; align-items:center; justify-content:center; font-size:18px; box-shadow:0 2px 8px rgba(0,0,0,0.12); z-index:2;">‹</button>
          <button type="button" class="btn btn-secondary category-slide-btn" id="category-slide-next" aria-label="Trượt phải" style="position:absolute; right:8px; top:50%; transform:translateY(-50%); width:44px; height:44px; border-radius:50%; padding:0; display:flex; align-items:center; justify-content:center; font-size:18px; box-shadow:0 2px 8px rgba(0,0,0,0.12); z-index:2;">›</button>
        </div>

        <div class="card mb-5" style="padding:20px;">
          <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:14px;">
            <div>
              <h2 style="font-size:var(--h3); margin-bottom:6px;">FLASH SALE</h2>
              <p class="text-secondary" style="margin:0;">Kết thúc sau: <strong id="flash-countdown">${formatLeft(endTime - Date.now())}</strong></p>
            </div>
            <a href="#/products" class="btn btn-secondary" style="white-space:nowrap;">Xem tất cả</a>
          </div>

          <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); gap:16px;">
            ${flashProducts.map((p) => {
              const discount = discountForProduct(p);
              const newPrice = Number(p.price) * (1 - discount / 100);
              return `
                <article class="card product-card" style="padding:14px;">
                  <a href="#/product/${p.id}" class="product-card__image-wrap" style="display:block;">
                    <img class="product-card__image" src="${escapeHtml(p.image_url || '/images/placeholder.svg')}" alt="${escapeHtml(p.name)}" loading="lazy" style="width:100%; height:160px; object-fit:cover; border-radius:12px;">
                  </a>
                  <div style="margin-top:10px;">
                    <h3 class="product-card__name" style="font-size:14px; margin:0; font-weight:700;">
                      <a href="#/product/${p.id}" style="color:inherit; text-decoration:none;">${escapeHtml(p.name)}</a>
                    </h3>
                    <div style="margin-top:8px; display:flex; gap:10px; align-items:baseline;">
                      <p style="margin:0; font-weight:800; color:var(--primary);">$${newPrice.toFixed(2)}</p>
                      <p style="margin:0; color:var(--text-secondary); text-decoration:line-through; font-size:13px;">$${Number(p.price).toFixed(2)}</p>
                      <span style="margin-left:auto; font-size:12px; padding:4px 10px; border-radius:999px; background:rgba(37,99,235,0.10); color:var(--primary); font-weight:700;">-${discount}%</span>
                    </div>
                  </div>
                </article>
              `;
            }).join('')}
          </div>
        </div>

        <div class="card" style="padding:20px;">
          <h2 style="font-size:var(--h3); margin-bottom:12px;">Voucher & Mã giảm giá</h2>
          ${vouchers.length ? `
            <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(220px,1fr)); gap:16px;">
              ${vouchers.map((v) => {
                const tag = v.type === 'freeship' ? 'FREESHIP' : (v.percent ? `-${v.percent}%` : 'SALE');
                return `
                  <div class="card" style="padding:16px; border-radius:14px; background:var(--bg);">
                    <div style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
                      <h3 style="margin:0; font-size:14px; font-weight:800;">${escapeHtml(v.title)}</h3>
                      <span style="background:rgba(16,185,129,0.12); color:#059669; padding:4px 10px; border-radius:999px; font-weight:800; font-size:12px;">
                        ${escapeHtml(tag)}
                      </span>
                    </div>
                    <p class="text-secondary" style="margin:10px 0 0; font-size:13px;">${escapeHtml(v.description || '')}</p>
                    <div style="display:flex; gap:10px; align-items:center; margin-top:12px;">
                      <code style="flex:1; padding:8px 10px; border-radius:12px; border:1px solid var(--border); background:var(--card-bg); font-weight:700;">${escapeHtml(v.code)}</code>
                      <button type="button" class="btn btn-secondary btn-sm" data-copy-voucher="${escapeHtml(v.code)}">Copy</button>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          ` : `
            <p class="text-secondary mb-0">Chưa có voucher. Admin hãy tạo tại <a href="admin/">Admin</a> → Vouchers.</p>
          `}
        </div>
      </section>
    `;

    // Countdown timer
    const countdownEl = el.querySelector('#flash-countdown');
    const t = setInterval(() => {
      if (!countdownEl) {
        clearInterval(t);
        return;
      }
      countdownEl.textContent = formatLeft(endTime - Date.now());
    }, 500);

    // Danh mục: nút trượt trái/phải giữa 2 hàng, trượt vòng (đầu ↔ cuối)
    const categoryScrollEl = el.querySelector('#category-scroll');
    const categorySlidePrev = el.querySelector('#category-slide-prev');
    const categorySlideNext = el.querySelector('#category-slide-next');
    const step = () => Math.min(420, (categoryScrollEl && categoryScrollEl.clientWidth) * 0.8 || 400);
    if (categorySlidePrev && categoryScrollEl) {
      categorySlidePrev.addEventListener('click', () => {
        const { scrollLeft, clientWidth, scrollWidth } = categoryScrollEl;
        if (scrollLeft <= 0) {
          categoryScrollEl.scrollTo({ left: scrollWidth - clientWidth, behavior: 'smooth' });
        } else {
          categoryScrollEl.scrollBy({ left: -step(), behavior: 'smooth' });
        }
      });
    }
    if (categorySlideNext && categoryScrollEl) {
      categorySlideNext.addEventListener('click', () => {
        const { scrollLeft, clientWidth, scrollWidth } = categoryScrollEl;
        const atEnd = scrollLeft + clientWidth >= scrollWidth - 2;
        if (atEnd) {
          categoryScrollEl.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          categoryScrollEl.scrollBy({ left: step(), behavior: 'smooth' });
        }
      });
    }

    // Copy voucher codes
    el.querySelectorAll('[data-copy-voucher]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const code = btn.dataset.copyVoucher;
        try {
          await navigator.clipboard.writeText(code);
          ui.alert('Đã copy mã: ' + code, 'success');
        } catch (_) {
          ui.alert('Không copy được, mã: ' + code, 'info');
        }
      });
    });
  }

  async function productsPage(el) {
    const query = getQuery();
    const search = query.get('search') || '';
    const category_id = query.get('category_id') || '';
    const brand = query.get('brand') || '';
    const size = query.get('size') || '';
    const color = query.get('color') || '';
    const min_price = query.get('min_price') || '';
    const max_price = query.get('max_price') || '';
    el.innerHTML = `
      <section class="section">
        <h1 class="mb-4" style="font-size:var(--h2);">Sản phẩm</h1>
        <div class="card mb-5" style="padding:20px;">
          <form id="products-filter-form" class="products-filters">
            <div class="form-group" style="margin-bottom:12px;">
              <label class="form-label">Tìm kiếm</label>
              <input type="search" class="form-input" name="search" placeholder="Tên hoặc mô tả..." value="${escapeHtml(search)}" style="max-width:220px;">
            </div>
            <div class="form-row" style="display:flex; flex-wrap:wrap; gap:16px; align-items:flex-end;">
              <div class="form-group" style="margin-bottom:0;">
                <label class="form-label">Danh mục</label>
                <select name="category_id" class="form-input form-select" style="min-width:140px;">
                  <option value="">Tất cả</option>
                </select>
              </div>
              <div class="form-group" style="margin-bottom:0;">
                <label class="form-label">Size</label>
                <select name="size" class="form-input form-select" style="min-width:120px;">
                  <option value="">Tất cả</option>
                </select>
              </div>
              <div class="form-group" style="margin-bottom:0;">
                <label class="form-label">Màu</label>
                <select name="color" class="form-input form-select" style="min-width:120px;">
                  <option value="">Tất cả</option>
                </select>
              </div>
              <div class="form-group" style="margin-bottom:0;">
                <label class="form-label">Giá từ ($)</label>
                <input type="number" name="min_price" class="form-input" placeholder="0" value="${escapeHtml(min_price)}" min="0" step="0.01" style="width:100px;">
              </div>
              <div class="form-group" style="margin-bottom:0;">
                <label class="form-label">Đến ($)</label>
                <input type="number" name="max_price" class="form-input" placeholder="999" value="${escapeHtml(max_price)}" min="0" step="0.01" style="width:100px;">
              </div>
              <div class="form-group" style="margin-bottom:0;">
                <button type="submit" class="btn btn-primary">Lọc</button>
                <a href="#/products" class="btn btn-secondary">Xóa bộ lọc</a>
              </div>
            </div>
          </form>
        </div>
        <div class="grid grid-4" id="product-grid"></div>
        <div id="products-skeleton" class="grid grid-4"></div>
        <p id="products-empty" class="text-secondary text-center hidden">Không tìm thấy sản phẩm.</p>
      </section>
    `;
    const form = el.querySelector('#products-filter-form');
    const grid = el.querySelector('#product-grid');
    const skeleton = el.querySelector('#products-skeleton');
    const empty = el.querySelector('#products-empty');
    skeleton.innerHTML = Array(8).fill(0).map(() => `
      <div class="card product-card">
        <div class="skeleton skeleton-image"></div>
        <div class="skeleton skeleton-title"></div>
        <div class="skeleton skeleton-text"></div>
        <div class="skeleton skeleton-text" style="width:40%;"></div>
      </div>
    `).join('');
    const filters = await products.getFilters();
    const catSelect = form.querySelector('select[name="category_id"]');
    const brandSelect = form.querySelector('select[name="brand"]');
    const sizeSelect = form.querySelector('select[name="size"]');
    const colorSelect = form.querySelector('select[name="color"]');
    (filters.categories || []).forEach((c) => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = c.name;
      if (String(c.id) === category_id) opt.selected = true;
      catSelect.appendChild(opt);
    });
    (filters.sizes || []).forEach((s) => {
      const opt = document.createElement('option');
      opt.value = s;
      opt.textContent = s;
      if (s === size) opt.selected = true;
      sizeSelect.appendChild(opt);
    });
    (filters.colors || []).forEach((c) => {
      const opt = document.createElement('option');
      opt.value = c;
      opt.textContent = c;
      if (c === color) opt.selected = true;
      colorSelect.appendChild(opt);
    });
    const listParams = { limit: 50 };
    if (search) listParams.search = search;
    if (category_id) listParams.category_id = category_id;
    if (brand) listParams.brand = brand;
    if (size) listParams.size = size;
    if (color) listParams.color = color;
    if (min_price) listParams.min_price = min_price;
    if (max_price) listParams.max_price = max_price;
    const res = await products.list(listParams);
    skeleton.remove();
    const list = res.products || [];
    if (list.length === 0) empty.classList.remove('hidden');
    renderProductCards(grid, list);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const params = new URLSearchParams();
      if (fd.get('search')) params.set('search', fd.get('search'));
      if (fd.get('category_id')) params.set('category_id', fd.get('category_id'));
      if (fd.get('brand')) params.set('brand', fd.get('brand'));
      if (fd.get('size')) params.set('size', fd.get('size'));
      if (fd.get('color')) params.set('color', fd.get('color'));
      if (fd.get('min_price')) params.set('min_price', fd.get('min_price'));
      if (fd.get('max_price')) params.set('max_price', fd.get('max_price'));
      window.location.hash = '#/products' + (params.toString() ? '?' + params.toString() : '');
      render();
    });
  }

  function renderProductCards(container, list) {
    if (!container) return;
    container.innerHTML = list.map((p) => {
      const meta = [];
      if (p.category_name) meta.push(escapeHtml(p.category_name));
      if (p.brand) meta.push(escapeHtml(p.brand));
      if (p.sizes && p.sizes.length) meta.push('Size: ' + p.sizes.map((s) => escapeHtml(s)).join(', '));
      else if (p.size) meta.push('Size: ' + escapeHtml(p.size));
      if (p.color) meta.push('Màu: ' + escapeHtml(p.color));
      const metaHtml = meta.length ? `<p class="product-card__meta text-secondary" style="font-size:0.9em; margin-bottom:8px;">${meta.join(' · ')}</p>` : '';
      return `
      <article class="card product-card">
        <a href="#/product/${p.id}" class="product-card__image-wrap">
          <img class="product-card__image" src="${escapeHtml(p.image_url || '/images/placeholder.svg')}" alt="${escapeHtml(p.name)}" loading="lazy">
        </a>
        <h2 class="product-card__name"><a href="#/product/${p.id}" style="color:inherit;">${escapeHtml(p.name)}</a></h2>
        ${metaHtml}
        <p class="product-card__price">$${Number(p.price).toFixed(2)}</p>
        <button type="button" class="btn btn-primary btn-block add-to-cart" data-id="${p.id}">Thêm vào giỏ</button>
      </article>
    `;
    }).join('');
    container.querySelectorAll('.add-to-cart').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.dataset.id;
        if (!auth.token) {
          ui.alert('Please log in to add to cart', 'info');
          window.location.hash = '#/login';
          return;
        }
        try {
          await cart.add(id, 1);
          ui.alert('Added to cart', 'success');
          ui.updateNav();
        } catch (err) {
          ui.alert(err.message || 'Failed to add to cart', 'error');
        }
      });
    });
  }

  /** Card HTML for "same brand" grid (detail page related section) */
  function relatedProductCardHtml(p) {
    const meta = [];
    if (p.category_name) meta.push(escapeHtml(p.category_name));
    if (p.color) meta.push('Màu: ' + escapeHtml(p.color));
    const metaHtml = meta.length
      ? `<p class="product-card__meta text-secondary" style="font-size:0.85em; margin-bottom:8px;">${meta.join(' · ')}</p>`
      : '';
    return `
      <article class="card product-card">
        <a href="#/product/${p.id}" class="product-card__image-wrap" style="display:block;">
          <img class="product-card__image" src="${escapeHtml(p.image_url || '/images/placeholder.svg')}" alt="${escapeHtml(p.name)}" loading="lazy" style="width:100%; height:160px; object-fit:cover; border-radius:12px;">
        </a>
        <h3 class="product-card__name" style="font-size:14px; margin:0; font-weight:700;">
          <a href="#/product/${p.id}" style="color:inherit;">${escapeHtml(p.name)}</a>
        </h3>
        ${metaHtml}
        <p class="product-card__price">$${Number(p.price).toFixed(2)}</p>
        <button type="button" class="btn btn-primary btn-block add-to-cart" data-id="${p.id}">Thêm vào giỏ</button>
      </article>`;
  }

  async function productDetailPage(el, params) {
    const id = params.id;
    el.innerHTML =
      '<div class="section"><div class="skeleton skeleton-image" style="max-width:400px;height:400px;"></div><div class="skeleton skeleton-title mt-4"></div><div class="skeleton skeleton-text"></div></div>';
    let p;
    try {
      p = await products.get(id);
    } catch (err) {
      el.innerHTML =
        '<div class="section"><p class="mb-4">Không tìm thấy sản phẩm.</p><a href="#/products" class="btn btn-secondary">← Danh sách sản phẩm</a></div>';
      return;
    }

    const sizesArr =
      p.sizes && p.sizes.length
        ? p.sizes
        : p.size
          ? String(p.size)
              .split(/[,/|]/)
              .map((x) => x.trim())
              .filter(Boolean)
          : [];
    const sizeChipsHtml = sizesArr.length
      ? sizesArr.map((s) => `<span class="detail-size-chip">${escapeHtml(s)}</span>`).join(' ')
      : '<span class="text-secondary">—</span>';
    const createdRow = p.created_at
      ? `<p class="text-secondary mb-3" style="font-size:14px;"><strong>Ngày thêm:</strong> ${new Date(p.created_at).toLocaleString('vi-VN')}</p>`
      : '';

    const relatedHint = p.category_name
      ? `<p class="text-secondary mb-3" style="font-size:14px;">  </p>`
      : `<p class="text-secondary mb-3" style="font-size:14px;"></p>`;
    const relatedBlock = `
        <h2 style="font-size:var(--h2); margin-bottom:12px;">Sản phẩm liên quan</h2>
        ${relatedHint}
        <div id="related-grid" class="related-products-grid"></div>
        <div id="related-loading" class="related-loading hidden">Đang tải gợi ý...</div>
        <div id="related-footer" class="text-center mt-4"></div>`;

    el.innerHTML = `
      <section class="section product-detail">
        <div class="product-detail__grid">
          <div class="product-detail__gallery">
            <div class="product-card__image-wrap" style="max-width:100%;">
              <img src="${escapeHtml(p.image_url || '/images/placeholder.svg')}" alt="${escapeHtml(p.name)}" loading="lazy" class="product-card__image">
            </div>
          </div>
          <div>
            <h1 style="font-size:var(--h1); font-weight:var(--fw-bold); margin-bottom:12px;">${escapeHtml(p.name)}</h1>
            <p class="product-card__price" style="font-size:32px; margin-bottom:20px;">$${Number(p.price).toFixed(2)}</p>
            <dl class="product-detail-dl">
              <dt>Danh mục</dt><dd>${p.category_name ? escapeHtml(p.category_name) : '<span class="text-secondary">—</span>'}</dd>
              <dt>Hãng (brand)</dt><dd>${p.brand ? escapeHtml(p.brand) : '<span class="text-secondary">—</span>'}</dd>
              <dt>Size có bán</dt><dd>${sizeChipsHtml}</dd>
              <dt>Màu</dt><dd>${p.color ? escapeHtml(p.color) : '<span class="text-secondary">—</span>'}</dd>
              <dt>Tồn kho (stock)</dt><dd>${p.stock ?? 0}</dd>
            </dl>
            <div class="mb-4">
              <strong style="display:block; margin-bottom:8px;">Mô tả (description)</strong>
              <p class="text-secondary" style="white-space:pre-wrap; margin:0;">${escapeHtml(p.description || '') || '—'}</p>
            </div>
            ${createdRow}
            <button type="button" class="btn btn-primary btn-lg add-to-cart-detail" data-id="${p.id}">Thêm vào giỏ</button>
          </div>
        </div>
        <div class="product-detail-related" style="margin-top:48px; padding-top:32px; border-top:1px solid var(--border);">
          ${relatedBlock}
        </div>
      </section>
    `;

    el.querySelector('.add-to-cart-detail')?.addEventListener('click', async () => {
      if (!auth.token) {
        ui.alert('Please log in to add to cart', 'info');
        window.location.hash = '#/login';
        return;
      }
      try {
        await cart.add(p.id, 1);
        ui.alert('Added to cart', 'success');
        ui.updateNav();
      } catch (err) {
        ui.alert(err.message || 'Failed', 'error');
      }
    });

    const relatedGrid = el.querySelector('#related-grid');
    const loadingEl = el.querySelector('#related-loading');
    const footer = el.querySelector('#related-footer');
    if (!relatedGrid || !footer) return;

    const relatedSection = el.querySelector('.product-detail-related');
    relatedSection?.addEventListener('click', async (e) => {
      const btn = e.target.closest('.add-to-cart');
      if (!btn) return;
      const pid = btn.dataset.id;
      if (!auth.token) {
        ui.alert('Please log in to add to cart', 'info');
        window.location.hash = '#/login';
        return;
      }
      try {
        await cart.add(pid, 1);
        ui.alert('Added to cart', 'success');
        ui.updateNav();
      } catch (err) {
        ui.alert(err.message || 'Failed to add to cart', 'error');
      }
    });

    function showFooterCta() {
      const brandQ = p.brand ? '?brand=' + encodeURIComponent(p.brand) : '';
      footer.innerHTML = `<a href="#/products${brandQ}" class="btn btn-secondary btn-lg">Xem thêm sản phẩm khác</a>`;
    }

    if (loadingEl) loadingEl.classList.remove('hidden');
    try {
      const rec = await products.recommend({
        exclude_id: String(p.id),
        match_category_id: p.category_id ? String(p.category_id) : '',
        match_brand: p.brand ? String(p.brand).trim() : '',
        match_name: p.name ? String(p.name).trim() : '',
        limit_category: '8',
        limit_name: '12',
        limit_brand: '12',
      });
      const categoryList = (rec.same_category || []).filter((item) => String(item.id) !== String(p.id));
      const nameList = (rec.same_name || []).filter((item) => String(item.id) !== String(p.id));
      const brandList = (rec.same_brand || []).filter((item) => String(item.id) !== String(p.id));

      const merged = [...categoryList, ...nameList, ...brandList];
      relatedGrid.innerHTML = merged.length
        ? merged.map((item) => relatedProductCardHtml(item)).join('')
        : '<p class="text-secondary">Chưa có sản phẩm liên quan.</p>';
      showFooterCta();
    } catch (e) {
      console.error(e);
      footer.innerHTML =
        '<p class="text-secondary mb-2">Không tải được gợi ý.</p><a href="#/products" class="btn btn-secondary">Xem tất cả sản phẩm</a>';
    } finally {
      if (loadingEl) loadingEl.classList.add('hidden');
    }
  }

  async function cartPage(el) {
    if (!auth.token) {
      el.innerHTML = '<div class="section text-center"><p class="mb-4">Vui lòng đăng nhập để xem giỏ hàng.</p><a href="#/" data-auth-modal="login" class="btn btn-primary">Đăng nhập</a></div>';
      return;
    }
    el.innerHTML = `
      <section class="section">
        <h1 style="font-size:var(--h2); margin-bottom:24px;">Cart</h1>
        <div id="cart-items"></div>
        <div id="cart-summary" class="hidden" style="max-width:400px; margin-left:auto; margin-top:24px;">
          <div class="card" style="padding:24px;">
            <p class="mb-2"><strong>Subtotal:</strong> $<span id="cart-subtotal">0</span></p>
            <p class="mb-2 text-secondary">Shipping: calculated at checkout</p>
            <p class="mb-4"><strong>Total:</strong> $<span id="cart-total">0</span></p>
            <a href="#/checkout" class="btn btn-primary btn-lg btn-block">Checkout</a>
          </div>
        </div>
        <p id="cart-empty" class="text-secondary">Your cart is empty. <a href="#/products">Browse products</a>.</p>
      </section>
    `;
    const itemsEl = el.querySelector('#cart-items');
    const summaryEl = el.querySelector('#cart-summary');
    const emptyEl = el.querySelector('#cart-empty');
    const items = await cart.getItems();
    if (items.length === 0) {
      summaryEl.classList.add('hidden');
      emptyEl.classList.remove('hidden');
      return;
    }
    emptyEl.classList.add('hidden');
    summaryEl.classList.remove('hidden');
    let subtotal = 0;
    itemsEl.innerHTML = items.map((i) => {
      const line = i.quantity * i.price;
      subtotal += line;
      return `
        <div class="cart-item" data-cart-id="${i.id}" data-initial-qty="${i.quantity}">
          <img class="cart-item__image" src="${escapeHtml(i.image_url || '/images/placeholder.svg')}" alt="${escapeHtml(i.name)}">
          <div>
            <strong>${escapeHtml(i.name)}</strong>
            <p class="text-secondary">$${Number(i.price).toFixed(2)} each</p>
            <div class="qty-wrap mt-2">
              <button type="button" class="qty-minus" data-id="${i.id}">−</button>
              <span class="qty-value">${i.quantity}</span>
              <button type="button" class="qty-plus" data-id="${i.id}">+</button>
            </div>
          </div>
          <div class="cart-item-price"><strong>$${line.toFixed(2)}</strong></div>
          <button type="button" class="btn btn-danger btn-sm cart-item-remove" data-id="${i.id}">Remove</button>
        </div>
      `;
    }).join('');
    el.querySelector('#cart-subtotal').textContent = subtotal.toFixed(2);
    el.querySelector('#cart-total').textContent = subtotal.toFixed(2);
    itemsEl.querySelectorAll('.qty-minus').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        const row = itemsEl.querySelector(`[data-cart-id="${id}"]`);
        const span = row?.querySelector('.qty-value');
        const initialQty = parseInt(row?.dataset.initialQty || row?.getAttribute('data-initial-qty') || '1', 10);
        let q = parseInt(span?.textContent || '1', 10) - 1;
        if (q < 1) {
          const ok = await ui.confirm('Bạn có chắc chắn muốn xóa sản phẩm này khỏi giỏ hàng không?', {
            okText: 'Xóa',
            cancelText: 'Hủy',
            danger: true,
          });
          if (!ok) return;
          await cart.remove(id);
          ui.alert('Đã xóa khỏi giỏ hàng', 'success');
          render();
          return;
        }
        if (initialQty > 0 && (initialQty - q) / initialQty >= 0.5) {
          const ok = await ui.confirm('Bạn có muốn xóa luôn sản phẩm này khỏi giỏ hàng không?', {
            okText: 'Xóa',
            cancelText: 'Giữ lại',
            danger: true,
          });
          if (!ok) {
            await cart.updateQuantity(id, q);
            span.textContent = q;
            updateCartRowTotal(row, q);
            recalcSummary(itemsEl, summaryEl, emptyEl);
            return;
          }
          await cart.remove(id);
          ui.alert('Đã xóa khỏi giỏ hàng', 'success');
          render();
          return;
        }
        await cart.updateQuantity(id, q);
        span.textContent = q;
        updateCartRowTotal(row, q);
        recalcSummary(itemsEl, summaryEl, emptyEl);
      });
    });
    itemsEl.querySelectorAll('.qty-plus').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        const row = itemsEl.querySelector(`[data-cart-id="${id}"]`);
        const span = row?.querySelector('.qty-value');
        let q = parseInt(span?.textContent || '0', 10) + 1;
        await cart.updateQuantity(id, q);
        span.textContent = q;
        updateCartRowTotal(row, q);
        recalcSummary(itemsEl, summaryEl, emptyEl);
      });
    });
    itemsEl.querySelectorAll('.cart-item-remove').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const ok = await ui.confirm('Bạn có chắc chắn muốn xóa sản phẩm này khỏi giỏ hàng không?', {
          okText: 'Xóa',
          cancelText: 'Hủy',
          danger: true,
        });
        if (!ok) return;
        try {
          await cart.remove(btn.dataset.id);
          ui.alert('Đã xóa khỏi giỏ hàng', 'success');
          render();
        } catch (err) {
          ui.alert(err.message || 'Không xóa được', 'error');
        }
      });
    });

    function updateCartRowTotal(row, qty) {
      const price = parseFloat(row.querySelector('.text-secondary')?.textContent?.replace('$', '').replace(' each', '') || 0);
      row.querySelector('.cart-item-price strong').textContent = '$' + (price * qty).toFixed(2);
    }
    function recalcSummary(itemsContainer, summaryEl, emptyEl) {
      let total = 0;
      itemsContainer.querySelectorAll('.cart-item').forEach((row) => {
        const t = row.querySelector('.cart-item-price strong')?.textContent?.replace('$', '');
        if (t) total += parseFloat(t);
      });
      el.querySelector('#cart-subtotal').textContent = total.toFixed(2);
      el.querySelector('#cart-total').textContent = total.toFixed(2);
      if (itemsContainer.querySelectorAll('.cart-item').length === 0) {
        summaryEl.classList.add('hidden');
        emptyEl.classList.remove('hidden');
      }
    }
  }

  async function checkoutPage(el) {
    if (!auth.token) {
      el.innerHTML = '<div class="section text-center"><p class="mb-4">Vui lòng đăng nhập để đặt hàng.</p><a href="#/" data-auth-modal="login" class="btn btn-primary">Đăng nhập</a></div>';
      return;
    }
    const cartItems = await cart.getItems();
    if (cartItems.length === 0) {
      el.innerHTML = '<div class="section text-center"><p class="mb-4">Giỏ hàng trống.</p><a href="#/products" class="btn btn-primary">Mua sắm</a></div>';
      return;
    }
    const total = cartItems.reduce((s, i) => s + i.quantity * i.price, 0);
    const user = await auth.me();
    const defaultName = (user && user.full_name) ? user.full_name : '';
    const defaultPhone = (user && user.phone) ? user.phone : '';
    const defaultAddress = (user && user.address) ? user.address : '';
    const productsRows = cartItems.map((i) => {
      const lineTotal = (i.quantity * i.price).toFixed(2);
      return `
      <tr class="checkout-row" data-cart-id="${i.id}" data-price="${i.price}" data-initial-qty="${i.quantity}" style="border-bottom:1px solid var(--border);">
        <td style="padding:12px;">${escapeHtml(i.name)}</td>
        <td style="padding:12px; text-align:center;">
          <div class="qty-wrap" style="display:inline-flex;align-items:center;gap:8px;justify-content:center;">
            <button type="button" class="checkout-qty-minus btn btn-secondary btn-sm" style="min-width:32px;padding:4px;" data-id="${i.id}" aria-label="Giảm">−</button>
            <span class="checkout-qty-value" style="min-width:24px;text-align:center;font-weight:500;">${i.quantity}</span>
            <button type="button" class="checkout-qty-plus btn btn-secondary btn-sm" style="min-width:32px;padding:4px;" data-id="${i.id}" aria-label="Tăng">+</button>
          </div>
        </td>
        <td style="padding:12px; text-align:right;">$${Number(i.price).toFixed(2)}</td>
        <td class="checkout-line-total" style="padding:12px; text-align:right; font-weight:500;">$${lineTotal}</td>
      </tr>
    `;
    }).join('');
    el.innerHTML = `
      <section class="section">
        <h1 style="font-size:var(--h2); margin-bottom:24px;">Thanh toán</h1>

        <h2 style="font-size:var(--h3); margin-bottom:12px;">Thông tin đơn hàng</h2>
        <div class="card mb-5" style="overflow-x:auto;">
          <table style="width:100%; border-collapse:collapse;">
            <thead>
              <tr style="border-bottom:2px solid var(--border);">
                <th style="text-align:left; padding:12px;">Sản phẩm</th>
                <th style="text-align:center; padding:12px;">SL</th>
                <th style="text-align:right; padding:12px;">Đơn giá</th>
                <th style="text-align:right; padding:12px;">Thành tiền</th>
              </tr>
            </thead>
            <tbody>${productsRows}</tbody>
            <tfoot>
              <tr style="border-top:2px solid var(--border);">
                <td colspan="3" style="padding:12px; text-align:right; font-weight:var(--fw-semibold);">Tổng cộng</td>
                <td id="checkout-total" style="padding:12px; text-align:right; font-weight:var(--fw-bold);">$${total.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <h2 style="font-size:var(--h3); margin-bottom:12px;">Thông tin người đặt / người nhận hàng</h2>
        <div class="checkout-row-wrap" style="display:flex; flex-wrap:wrap; gap:24px; align-items:flex-start;">
          <div class="card mb-5" style="flex:1; min-width:320px; max-width:560px; padding:24px;">
            <form id="checkout-form">
              <div class="form-group">
                <label class="form-label">Họ tên người nhận</label>
                <input type="text" name="receiver_name" class="form-input" value="${escapeHtml(defaultName)}" required placeholder="Họ tên người nhận hàng">
              </div>
              <div class="form-group">
                <label class="form-label">Số điện thoại</label>
                <input type="tel" name="receiver_phone" class="form-input" value="${escapeHtml(defaultPhone)}" required placeholder="SĐT liên hệ nhận hàng">
              </div>
              <div class="form-group">
                <label class="form-label">Địa chỉ giao hàng</label>
                <div style="display:flex; gap:10px; align-items:flex-start; flex-wrap:wrap;">
                  <textarea name="shipping_address" class="form-textarea" required placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành" style="flex:1; min-width:200px;">${escapeHtml(defaultAddress)}</textarea>
                  <button type="button" class="btn btn-secondary" id="checkout-btn-change-address">Thay đổi địa chỉ</button>
                </div>
                <p class="text-secondary" style="font-size:var(--small); margin-top:4px;">Mặc định lấy từ tài khoản. Bấm <strong>Thay đổi địa chỉ</strong> để chọn trên bản đồ hoặc tìm kiếm. Lưu tại <a href="#/profile">Tài khoản</a> để điền sẵn lần sau.</p>
              </div>

            <div class="form-group">
              <label class="form-label">Ưu đãi</label>
              <div class="card" style="padding:14px; background:var(--bg);">
                <div class="form-group" style="margin-bottom:12px;">
                  <label class="form-label">Voucher Freeship (admin)</label>
                  <select name="freeship_code" class="form-input form-select">
                    <option value="">Không dùng</option>
                  </select>
                </div>
                <div class="form-group" style="margin-bottom:0;">
                  <label class="form-label">Mã giảm giá sản phẩm (admin)</label>
                  <select name="product_code" class="form-input form-select">
                    <option value="">Không dùng</option>
                  </select>
                </div>
                <p class="text-secondary" style="font-size:var(--label); margin-top:10px; margin-bottom:0;">
                  Chỉ dùng tối đa 2 mã: 1 freeship + 1 giảm giá sản phẩm.
                </p>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Phương thức thanh toán</label>
              <label class="form-group" style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
                <input type="radio" name="payment_method" value="cod" checked>
                <span><strong>Tiền mặt khi nhận hàng</strong> (COD)</span>
              </label>
              <label class="form-group" style="display:flex; align-items:center; gap:8px; margin-bottom:8px; opacity:0.7;">
                <input type="radio" name="payment_method" value="bank" disabled>
                <span>Tài khoản thanh toán</span>
                <span class="text-secondary" style="font-size:var(--label);">(Sắp ra mắt)</span>
              </label>
              <label class="form-group" style="display:flex; align-items:center; gap:8px; opacity:0.7;">
                <input type="radio" name="payment_method" value="wallet" disabled>
                <span>Ví trả sau</span>
                <span class="text-secondary" style="font-size:var(--label);">(Sắp ra mắt)</span>
              </label>
            </div>
            <div class="card" style="padding:14px; background:var(--bg); margin-bottom:16px;">
              <p class="mb-2"><strong>Tạm tính:</strong> $<span id="checkout-subtotal-usd">${total.toFixed(2)}</span></p>
              <p class="mb-2"><strong>Phí ship:</strong> <span id="checkout-ship-vnd">—</span> (<span id="checkout-ship-usd">—</span>)</p>
              <p class="mb-2"><strong>Giảm giá:</strong> -$<span id="checkout-discount-usd">0.00</span></p>
              <p class="mb-0"><strong>Tổng thanh toán:</strong> $<span id="checkout-form-total">${total.toFixed(2)}</span></p>
              <p class="text-secondary" style="font-size:var(--label); margin-top:8px; margin-bottom:0;">
                Ship áp dụng: Hà Nội freeship; tỉnh lân cận random 40k–50k (demo).
              </p>
            </div>
            <button type="submit" class="btn btn-primary btn-lg btn-block">Đặt hàng</button>
          </form>
          </div>
          <div id="checkout-map-wrap" class="checkout-map-panel hidden" style="flex:1; min-width:320px; max-width:560px; padding:16px; min-height:420px;">
            <h3 style="font-size:var(--h3); margin-bottom:12px;">Chọn địa chỉ trên bản đồ</h3>
            <div style="display:flex; gap:10px; margin-bottom:12px; flex-wrap:wrap;">
              <input type="text" id="checkout-map-search" class="form-input" placeholder="Tìm địa chỉ..." style="flex:1; min-width:180px;">
              <button type="button" class="btn btn-secondary" id="checkout-btn-my-location">Vị trí của tôi</button>
            </div>
            <div id="checkout-map" style="width:100%; height:360px; border-radius:12px; background:var(--bg);"></div>
            <p class="text-secondary" style="font-size:var(--small); margin-top:10px; margin-bottom:0;">Tìm kiếm hoặc nhấp trên bản đồ để chọn địa chỉ. Địa chỉ sẽ điền vào ô bên trái.</p>
          </div>
        </div>
      </section>
    `;

    async function refreshQuote() {
      try {
        const form = el.querySelector('#checkout-form');
        const addr = (form.shipping_address && form.shipping_address.value) ? form.shipping_address.value.trim() : '';
        if (!addr) return;
        const freeship_code = form.freeship_code.value || null;
        const product_code = form.product_code.value || null;
        const quote = await orders.quote(addr, { freeship_code, product_code });
        el.querySelector('#checkout-subtotal-usd').textContent = Number(quote.subtotal_usd || 0).toFixed(2);
        el.querySelector('#checkout-ship-vnd').textContent = (quote.shipping_fee_vnd ?? 0).toLocaleString('vi-VN') + ' VND';
        el.querySelector('#checkout-ship-usd').textContent = '$' + Number(quote.shipping_fee_usd || 0).toFixed(2);
        el.querySelector('#checkout-discount-usd').textContent = Number(quote.discount_usd || 0).toFixed(2);
        el.querySelector('#checkout-form-total').textContent = Number(quote.total_usd || 0).toFixed(2);
      } catch (e) {
        // show soft error in totals area
        el.querySelector('#checkout-ship-vnd').textContent = 'Không hỗ trợ';
        el.querySelector('#checkout-ship-usd').textContent = '—';
        ui.alert(e.message || 'Không tính được phí ship', 'error');
      }
    }

    function updateCheckoutTotals() {
      let sum = 0;
      el.querySelectorAll('.checkout-row').forEach((row) => {
        const price = parseFloat(row.dataset.price || 0);
        const qty = parseInt(row.querySelector('.checkout-qty-value')?.textContent || '0', 10);
        const lineTotal = (price * qty).toFixed(2);
        const cell = row.querySelector('.checkout-line-total');
        if (cell) cell.textContent = '$' + lineTotal;
        sum += price * qty;
      });
      const totalEl = document.getElementById('checkout-total');
      const formTotalEl = document.getElementById('checkout-form-total');
      if (totalEl) totalEl.textContent = '$' + sum.toFixed(2);
      if (formTotalEl) formTotalEl.textContent = sum.toFixed(2);
      el.querySelector('#checkout-subtotal-usd') && (el.querySelector('#checkout-subtotal-usd').textContent = sum.toFixed(2));
      // after qty changes, recompute quote if address exists
      refreshQuote();
    }

    // Load user's voucher vault and populate selects
    (async function initVoucherSelects() {
      try {
        const r = await api.get('/vouchers/my');
        const list = r.vouchers || [];
        const freeshipSel = el.querySelector('select[name="freeship_code"]');
        const productSel = el.querySelector('select[name="product_code"]');
        list.forEach((uv) => {
          if (uv.status !== 'available' || !uv.voucher || !uv.voucher.is_active) return;
          const opt = document.createElement('option');
          opt.value = uv.voucher.code;
          opt.textContent = `${uv.voucher.title} (${uv.voucher.code})`;
          if (uv.voucher.type === 'freeship') freeshipSel.appendChild(opt);
          if (uv.voucher.type === 'product_percent') productSel.appendChild(opt);
        });
      } catch (_) {}
    })();

    // Re-quote when address/voucher changes
    el.querySelector('textarea[name="shipping_address"]')?.addEventListener('blur', refreshQuote);
    el.querySelector('select[name="freeship_code"]')?.addEventListener('change', refreshQuote);
    el.querySelector('select[name="product_code"]')?.addEventListener('change', refreshQuote);

    // Map panel: show on "Thay đổi địa chỉ", init map once
    let checkoutMapInited = false;
    const mapWrap = el.querySelector('#checkout-map-wrap');
    const mapEl = el.querySelector('#checkout-map');
    const btnChangeAddr = el.querySelector('#checkout-btn-change-address');
    const searchInput = el.querySelector('#checkout-map-search');
    const btnMyLoc = el.querySelector('#checkout-btn-my-location');

    function setAddressFromMap(addr) {
      const ta = el.querySelector('textarea[name="shipping_address"]');
      if (ta) {
        ta.value = addr || '';
        ta.dispatchEvent(new Event('input', { bubbles: true }));
        refreshQuote();
      }
    }

    function initCheckoutMapOnce() {
      if (checkoutMapInited) return Promise.resolve();
      return api.get('/config').then((cfg) => {
        const token = (cfg && cfg.mapboxAccessToken) ? String(cfg.mapboxAccessToken).trim() : '';
        if (!token) {
          if (mapEl) mapEl.innerHTML = '<p class="text-secondary" style="padding:20px;">Cấu hình MAPBOX_ACCESS_TOKEN ở server để bật bản đồ.</p>';
          checkoutMapInited = true;
          return;
        }
        return new Promise((resolve, reject) => {
          if (window.mapboxgl) {
            resolve(token);
            return;
          }
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = 'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css';
          document.head.appendChild(link);
          const script = document.createElement('script');
          script.src = 'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.js';
          script.async = true;
          script.onload = () => resolve(token);
          script.onerror = () => reject(new Error('Không tải được Mapbox'));
          document.head.appendChild(script);
        });
      }).then((token) => {
        if (!token || !window.mapboxgl || !mapEl) return;
        const mapboxgl = window.mapboxgl;
        mapboxgl.accessToken = token;
        const center = [105.8542, 21.0285];
        const map = new mapboxgl.Map({
          container: mapEl,
          style: 'mapbox://styles/mapbox/streets-v12',
          center,
          zoom: 14,
        });
        const marker = new mapboxgl.Marker({ draggable: true }).setLngLat(center).addTo(map);
        window.__checkoutMapInstance = map;
        map.on('load', () => {
          map.resize();
        });

        function reverseGeocode(lng, lat) {
          const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${encodeURIComponent(token)}&limit=1&language=vi`;
          return fetch(url).then((r) => r.json()).then((data) => {
            const f = data.features && data.features[0];
            if (f && f.place_name) setAddressFromMap(f.place_name);
          });
        }

        map.on('click', (e) => {
          const { lng, lat } = e.lngLat;
          marker.setLngLat([lng, lat]);
          reverseGeocode(lng, lat);
        });
        marker.on('dragend', () => {
          const pos = marker.getLngLat();
          reverseGeocode(pos.lng, pos.lat);
        });

        if (searchInput) {
          let searchDebounce;
          searchInput.addEventListener('input', () => {
            clearTimeout(searchDebounce);
            const q = (searchInput.value || '').trim();
            if (q.length < 2) return;
            searchDebounce = setTimeout(() => {
              const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json?access_token=${encodeURIComponent(token)}&country=VN&limit=5&language=vi`;
              fetch(url).then((r) => r.json()).then((data) => {
                const f = data.features && data.features[0];
                if (!f || !f.center) return;
                const [lng, lat] = f.center;
                map.flyTo({ center: [lng, lat], zoom: 16 });
                marker.setLngLat([lng, lat]);
                setAddressFromMap(f.place_name || '');
              });
            }, 300);
          });
          searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              searchInput.dispatchEvent(new Event('input', { bubbles: true }));
            }
          });
        }

        if (btnMyLoc) {
          btnMyLoc.addEventListener('click', () => {
            if (!navigator.geolocation) {
              ui.alert('Trình duyệt không hỗ trợ lấy vị trí.', 'error');
              return;
            }
            btnMyLoc.disabled = true;
            navigator.geolocation.getCurrentPosition(
              (pos) => {
                const lng = pos.coords.longitude;
                const lat = pos.coords.latitude;
                map.flyTo({ center: [lng, lat], zoom: 16 });
                marker.setLngLat([lng, lat]);
                reverseGeocode(lng, lat);
                btnMyLoc.disabled = false;
              },
              () => {
                ui.alert('Không lấy được vị trí. Kiểm tra quyền truy cập vị trí.', 'error');
                btnMyLoc.disabled = false;
              },
              { enableHighAccuracy: true, timeout: 10000 }
            );
          });
        }
        checkoutMapInited = true;
      }).catch((err) => {
        if (mapEl) mapEl.innerHTML = '<p class="text-secondary" style="padding:20px;">' + escapeHtml(err.message || 'Lỗi tải bản đồ') + '</p>';
        checkoutMapInited = true;
      });
    }

    if (btnChangeAddr && mapWrap) {
      btnChangeAddr.addEventListener('click', () => {
        mapWrap.classList.toggle('hidden');
        if (!mapWrap.classList.contains('hidden')) {
          // Đợi layout xong rồi mới tạo map để container có kích thước đúng (tránh tile trắng)
          requestAnimationFrame(() => {
            setTimeout(() => {
              initCheckoutMapOnce().then(() => {
                setTimeout(() => {
                  if (window.__checkoutMapInstance) window.__checkoutMapInstance.resize();
                }, 150);
              });
            }, 50);
          });
        }
      });
    }

    el.querySelectorAll('.checkout-qty-minus').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        const row = el.querySelector(`.checkout-row[data-cart-id="${id}"]`);
        const span = row?.querySelector('.checkout-qty-value');
        const initialQty = parseInt(row?.dataset.initialQty || row?.getAttribute('data-initial-qty') || '1', 10);
        let q = parseInt(span?.textContent || '1', 10) - 1;
        if (q < 1) {
          if (!confirm('Bạn có chắc muốn xóa sản phẩm này khỏi giỏ hàng?')) return;
          try {
            await cart.remove(id);
            row?.remove();
            updateCheckoutTotals();
            if (el.querySelectorAll('.checkout-row').length === 0) window.appRender();
            else ui.updateNav();
          } catch (err) { ui.alert(err.message || 'Lỗi', 'error'); }
          return;
        }
        if (initialQty > 0 && (initialQty - q) / initialQty >= 0.5) {
          if (!confirm('Bạn có muốn xóa luôn sản phẩm này khỏi giỏ hàng không?')) {
            try {
              await cart.updateQuantity(id, q);
              span.textContent = q;
              updateCheckoutTotals();
              ui.updateNav();
            } catch (err) { ui.alert(err.message || 'Lỗi', 'error'); }
            return;
          }
          try {
            await cart.remove(id);
            row?.remove();
            updateCheckoutTotals();
            if (el.querySelectorAll('.checkout-row').length === 0) window.appRender();
            else ui.updateNav();
          } catch (err) { ui.alert(err.message || 'Lỗi', 'error'); }
          return;
        }
        try {
          await cart.updateQuantity(id, q);
          span.textContent = q;
          updateCheckoutTotals();
          ui.updateNav();
        } catch (err) { ui.alert(err.message || 'Lỗi', 'error'); }
      });
    });
    el.querySelectorAll('.checkout-qty-plus').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        const row = el.querySelector(`.checkout-row[data-cart-id="${id}"]`);
        const span = row?.querySelector('.checkout-qty-value');
        let q = parseInt(span?.textContent || '0', 10) + 1;
        try {
          await cart.updateQuantity(id, q);
          span.textContent = q;
          updateCheckoutTotals();
          ui.updateNav();
        } catch (err) { ui.alert(err.message || 'Lỗi', 'error'); }
      });
    });

    el.querySelector('#checkout-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const receiverName = (e.target.receiver_name && e.target.receiver_name.value) ? e.target.receiver_name.value.trim() : '';
      const receiverPhone = (e.target.receiver_phone && e.target.receiver_phone.value) ? e.target.receiver_phone.value.trim() : '';
      const addr = (e.target.shipping_address && e.target.shipping_address.value) ? e.target.shipping_address.value.trim() : '';
      const paymentMethod = (e.target.payment_method && e.target.payment_method.value) || 'cod';
      const freeship_code = (e.target.freeship_code && e.target.freeship_code.value) ? e.target.freeship_code.value : null;
      const product_code = (e.target.product_code && e.target.product_code.value) ? e.target.product_code.value : null;
      if (!receiverName) {
        ui.alert('Vui lòng nhập họ tên người nhận', 'error');
        return;
      }
      if (!receiverPhone) {
        ui.alert('Vui lòng nhập số điện thoại', 'error');
        return;
      }
      if (!addr) {
        ui.alert('Vui lòng nhập địa chỉ giao hàng', 'error');
        return;
      }
      try {
        await orders.create(receiverName, receiverPhone, addr, paymentMethod, { freeship_code, product_code });
        ui.alert('Đặt hàng thành công', 'success');
        window.location.hash = '#/orders';
      } catch (err) {
        ui.alert(err.message || 'Đặt hàng thất bại', 'error');
      }
    });
  }

  async function profilePage(el) {
    if (!auth.token) {
      el.innerHTML = '<div class="section text-center"><p class="mb-4">Vui lòng đăng nhập.</p><a href="#/" data-auth-modal="login" class="btn btn-primary">Đăng nhập</a></div>';
      return;
    }
    const user = await auth.me();
    let store = null;
    try {
      const r = await api.get('/store/me');
      store = r.store || null;
    } catch (_) {
      store = null;
    }
    const status = store?.store_status || user.store_status || 'none';
    el.innerHTML = `
      <section class="section" style="max-width:500px; margin:0 auto;">
        <h1 style="font-size:var(--h2); margin-bottom:24px;">Thông tin cá nhân</h1>
        <p class="text-secondary mb-4">Cập nhật địa chỉ và SĐT để dùng khi đặt hàng.</p>
        <form id="profile-form">
          <div class="form-group">
            <label class="form-label">Họ tên</label>
            <input type="text" name="full_name" class="form-input" value="${escapeHtml(user.full_name || '')}" required>
          </div>
          <div class="form-group">
            <label class="form-label">Email</label>
            <input type="email" class="form-input" value="${escapeHtml(user.email || '')}" disabled style="background:var(--bg); color:var(--text-secondary);">
            <p class="text-secondary" style="font-size:var(--label); margin-top:4px;">Email không thể thay đổi.</p>
          </div>
          <div class="form-group">
            <label class="form-label">Số điện thoại</label>
            <input type="tel" name="phone" class="form-input" value="${escapeHtml(user.phone || '')}" placeholder="Số điện thoại nhận hàng">
          </div>
          <div class="form-group">
            <label class="form-label">Địa chỉ giao hàng mặc định</label>
            <textarea name="address" class="form-textarea" placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành">${escapeHtml(user.address || '')}</textarea>
            <p class="text-secondary" style="font-size:var(--label); margin-top:4px;">Sẽ được điền sẵn khi bạn đặt hàng.</p>
          </div>
          <button type="submit" class="btn btn-primary">Lưu thay đổi</button>
        </form>
        <div class="card mt-5" style="padding:20px;">
          <h2 style="font-size:var(--h3); margin-bottom:10px;">Mở cửa hàng kinh doanh</h2>
          <p class="text-secondary" style="margin-bottom:14px;">
            Trạng thái: <strong>${escapeHtml(status)}</strong>
            ${store?.store_applied_at ? ` <span class="text-secondary" style="font-weight:400;">(đăng ký lúc ${escapeHtml(new Date(store.store_applied_at).toLocaleString('vi-VN'))})</span>` : ''}
          </p>
          ${user.role === 'admin'
            ? `<p class="text-secondary">Admin không thể đăng ký cửa hàng.</p>`
            : status === 'approved'
              ? `<p>Bạn đã được duyệt mở cửa hàng: <strong>${escapeHtml(store?.store_name || user.store_name || '')}</strong></p>`
              : `
                  <p class="text-secondary">
                    ${status === 'pending' ? 'Yêu cầu của bạn đang chờ duyệt.' : 'Bạn chưa có cửa hàng.'}
                  </p>
                  <button type="button" class="btn btn-secondary" id="btn-open-register-shop">Đăng ký cửa hàng</button>
                `}
        </div>
      </section>
    `;
    el.querySelector('#profile-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const fullName = (fd.get('full_name') || '').toString().trim();
      const phone = (fd.get('phone') || '').toString().trim() || null;
      const address = (fd.get('address') || '').toString().trim() || null;
      if (!fullName) {
        ui.alert('Vui lòng nhập họ tên', 'error');
        return;
      }
      try {
        await api.put('/auth/profile', { full_name: fullName, phone, address });
        await auth.me();
        ui.alert('Đã lưu thông tin', 'success');
      } catch (err) {
        ui.alert(err.message || 'Lưu thất bại', 'error');
      }
    });

    el.querySelector('#btn-open-register-shop')?.addEventListener('click', () => {
      window.location.hash = '#/register-shop';
    });

    const applyForm = el.querySelector('#store-apply-form');
    if (applyForm) {
      applyForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const store_name = (fd.get('store_name') || '').toString().trim();
        const store_description = (fd.get('store_description') || '').toString().trim();
        if (!store_name) return ui.alert('Vui lòng nhập tên cửa hàng', 'error');
        try {
          await api.post('/store/apply', { store_name, store_description });
          await auth.me();
          ui.alert('Đã gửi yêu cầu mở cửa hàng (pending)', 'success');
          window.appRender();
        } catch (err) {
          ui.alert(err.message || 'Gửi yêu cầu thất bại', 'error');
        }
      });
    }
  }

  async function shopRegisterPage(el) {
    if (!auth.token) {
      el.innerHTML = '<div class="section text-center"><p class="mb-4">Vui lòng đăng nhập.</p><a href="#/" data-auth-modal="login" class="btn btn-primary">Đăng nhập</a></div>';
      return;
    }
    const user = await auth.me();
    if (user.role === 'admin') {
      el.innerHTML = '<div class="section text-center"><p class="mb-4">Admin không thể đăng ký cửa hàng.</p><a href="#/profile" class="btn btn-primary">Quay lại</a></div>';
      return;
    }

    let currentStore = null;
    try {
      const r = await api.get('/store/me');
      currentStore = r.store || null;
    } catch (_) {}

    if (currentStore?.store_status === 'approved') {
      el.innerHTML = '<div class="section text-center"><p class="mb-4">Bạn đã có cửa hàng: <strong>' + escapeHtml(currentStore.store_name || '') + '</strong>.</p><a href="#/profile" class="btn btn-primary">Về trang hồ sơ</a></div>';
      return;
    }

    el.innerHTML = `
      <section class="section" style="max-width:720px; margin:0 auto;">
        <h1 style="font-size:var(--h2); margin-bottom:16px;">Đăng ký cửa hàng</h1>
        <p class="text-secondary" style="margin-bottom:24px;">Hoàn tất thông tin để tạo mã thanh toán và kích hoạt cửa hàng. Phí kích hoạt: <strong>10,000 VND</strong>.</p>
        <div class="card" style="padding:20px;">
          <div class="text-secondary mb-3" id="shop-step-indicator">Bước 1/3</div>
          <form id="shop-register-form">
            <div id="shop-step-1">
              <div class="form-group">
                <label class="form-label">Tên cửa hàng</label>
                <input type="text" name="shop_name" class="form-input" placeholder="VD: Shop Khánh Huyền" required>
              </div>
              <div class="form-group">
                <label class="form-label">Mô tả cửa hàng</label>
                <textarea name="description" class="form-textarea" placeholder="Bạn kinh doanh mặt hàng gì?"></textarea>
              </div>
              <div class="form-group">
                <label class="form-label">Logo (URL) - tùy chọn</label>
                <input type="text" name="logo_url" class="form-input" placeholder="/images/logo.png">
              </div>
              <div class="form-group">
                <label class="form-label">Banner (URL) - tùy chọn</label>
                <input type="text" name="banner_url" class="form-input" placeholder="/images/banner.png">
              </div>
            </div>

            <div id="shop-step-2" class="hidden">
              <h2 style="font-size:var(--h3); margin-bottom:12px;">Thông tin địa chỉ & liên hệ</h2>
              <div class="form-group">
                <label class="form-label">Họ tên người nhận/đầu mối</label>
                <input type="text" name="sender_name" class="form-input" placeholder="Nguyễn Văn A" required>
              </div>
              <div class="form-group">
                <label class="form-label">Số điện thoại cửa hàng</label>
                <input type="tel" name="sender_phone" class="form-input" placeholder="VD: 09xxxxxxxx" required>
              </div>
              <div class="form-group">
                <label class="form-label">Tỉnh/Thành phố</label>
                <input type="text" name="province" class="form-input" placeholder="VD: TP.HCM" required>
              </div>
              <div class="form-group">
                <label class="form-label">Quận/Huyện</label>
                <input type="text" name="district" class="form-input" placeholder="VD: Q.1" required>
              </div>
              <div class="form-group">
                <label class="form-label">Phường/Xã</label>
                <input type="text" name="ward" class="form-input" placeholder="VD: P. Bến Nghé" required>
              </div>
              <div class="form-group">
                <label class="form-label">Địa chỉ chi tiết</label>
                <textarea name="detail_address" class="form-textarea" placeholder="Số nhà, đường..." required></textarea>
              </div>
              <div class="form-group">
                <label class="form-label">Đơn vị vận chuyển hỗ trợ</label>
                <div style="display:flex; flex-wrap:wrap; gap:12px;">
                  ${['GHN', 'GHTK', 'J&T', 'Viettel Post', 'NowShip']
                    .map(
                      (p) =>
                        `<label style="display:inline-flex;align-items:center;gap:8px;cursor:pointer;"><input type="checkbox" name="shipping_providers" value="${p}"> ${p}</label>`
                    )
                    .join('')}
                </div>
                <p class="text-secondary" style="font-size:var(--label); margin-top:8px;">Chọn ít nhất 1 đơn vị vận chuyển.</p>
              </div>
            </div>

            <div id="shop-step-3" class="hidden">
              <h2 style="font-size:var(--h3); margin-bottom:12px;">Thông tin tài khoản ngân hàng</h2>
              <div class="form-group">
                <label class="form-label">Tên tài khoản</label>
                <input type="text" name="bank_account_name" class="form-input" placeholder="VD: NGUYEN VAN A" required>
              </div>
              <div class="form-group">
                <label class="form-label">Số tài khoản</label>
                <input type="text" name="bank_account_number" class="form-input" placeholder="VD: 0123456789" required>
              </div>
              <div class="form-group">
                <label class="form-label">Ngân hàng</label>
                <input type="text" name="bank_name" class="form-input" placeholder="VD: Vietcombank" required>
              </div>
              <p class="text-secondary" style="margin-top:16px;">
                Sau khi gửi, hệ thống sẽ tạo mã thanh toán <strong>10,000 VND</strong> và gửi 2 mã OTP để xác nhận đăng ký cửa hàng + xác nhận số điện thoại (demo trả OTP trong response).
              </p>
            </div>

            <div style="display:flex; gap:12px; margin-top:18px; align-items:center;">
              <button type="button" class="btn btn-secondary" id="btn-shop-back" style="display:none;">Quay lại</button>
              <button type="button" class="btn btn-primary" id="btn-shop-action" style="margin-left:auto;">Tiếp theo</button>
              <a href="#/profile" class="btn btn-secondary">Hủy</a>
            </div>
          </form>
        </div>
      </section>
    `;

    const form = el.querySelector('#shop-register-form');
    const step1 = el.querySelector('#shop-step-1');
    const step2 = el.querySelector('#shop-step-2');
    const step3 = el.querySelector('#shop-step-3');
    const indicator = el.querySelector('#shop-step-indicator');
    const backBtn = el.querySelector('#btn-shop-back');
    const actionBtn = el.querySelector('#btn-shop-action');

    let step = 1;
    function showStep(n) {
      step = n;
      step1.classList.toggle('hidden', n !== 1);
      step2.classList.toggle('hidden', n !== 2);
      step3.classList.toggle('hidden', n !== 3);
      indicator.textContent = `Bước ${n}/3`;
      backBtn.style.display = n === 1 ? 'none' : '';
      actionBtn.textContent = n === 3 ? 'Tạo mã thanh toán (10,000 VND)' : 'Tiếp theo';
    }
    showStep(1);

    function getInputValue(name) {
      return (form.querySelector('[name=\"' + CSS.escape(name) + '\"]')?.value || '').toString().trim();
    }

    function validateStep(n) {
      if (n === 1) {
        const shop_name = getInputValue('shop_name');
        if (!shop_name) return ui.alert('Vui lòng nhập tên cửa hàng', 'error');
        return true;
      }
      if (n === 2) {
        const sender_name = getInputValue('sender_name');
        const sender_phone = getInputValue('sender_phone');
        const province = getInputValue('province');
        const district = getInputValue('district');
        const ward = getInputValue('ward');
        const detail_address = getInputValue('detail_address');
        if (!sender_name) return ui.alert('Vui lòng nhập họ tên', 'error');
        if (!sender_phone || sender_phone.length < 8) return ui.alert('Vui lòng nhập số điện thoại hợp lệ', 'error');
        if (!province || !district || !ward || !detail_address) return ui.alert('Vui lòng nhập đủ địa chỉ', 'error');
        const providers = [...form.querySelectorAll('input[name=\"shipping_providers\"]:checked')].map((x) => x.value);
        if (!providers.length) return ui.alert('Vui lòng chọn ít nhất 1 đơn vị vận chuyển', 'error');
        return true;
      }
      if (n === 3) {
        const bank_account_name = getInputValue('bank_account_name');
        const bank_account_number = getInputValue('bank_account_number');
        const bank_name = getInputValue('bank_name');
        if (!bank_account_name || !bank_account_number || !bank_name) return ui.alert('Vui lòng nhập đủ thông tin ngân hàng', 'error');
        return true;
      }
      return false;
    }

    backBtn.addEventListener('click', () => {
      if (step <= 1) return;
      showStep(step - 1);
    });

    actionBtn.addEventListener('click', async () => {
      if (!validateStep(step)) return;
      if (step < 3) {
        showStep(step + 1);
        return;
      }
      try {
        const fd = new FormData(form);
        const providers = [...form.querySelectorAll('input[name=\"shipping_providers\"]:checked')].map((x) => x.value);
        const body = {
          shop_name: fd.get('shop_name'),
          logo_url: fd.get('logo_url') || null,
          banner_url: fd.get('banner_url') || null,
          description: fd.get('description') || '',
          sender_name: fd.get('sender_name'),
          sender_phone: fd.get('sender_phone'),
          province: fd.get('province'),
          district: fd.get('district'),
          ward: fd.get('ward'),
          detail_address: fd.get('detail_address'),
          shipping_providers: providers,
          bank_account_name: fd.get('bank_account_name'),
          bank_account_number: fd.get('bank_account_number'),
          bank_name: fd.get('bank_name'),
        };
        const res = await api.post('/store/register', body);
        if (!res.payment?.payment_code) throw new Error('Không tạo được mã thanh toán');
        const code = res.payment.payment_code;
        if (res.debug?.store_registration_otp && res.debug?.phone_verification_otp) {
          localStorage.setItem('shopti_debug_otps_' + code, JSON.stringify(res.debug));
        }
        ui.alert('Đã tạo mã thanh toán. Vui lòng chuyển khoản 10,000 VND.', 'success');
        window.location.hash = '#/payment/' + code;
      } catch (e) {
        ui.alert(e.message || 'Đăng ký thất bại', 'error');
      }
    });
  }

  async function shopPaymentPage(el, params) {
    if (!auth.token) {
      el.innerHTML = '<div class="section text-center"><p class="mb-4">Vui lòng đăng nhập.</p><a href="#/" data-auth-modal="login" class="btn btn-primary">Đăng nhập</a></div>';
      return;
    }
    const paymentCode = params.payment_code;
    if (!paymentCode) {
      el.innerHTML = '<div class="section text-center"><p class="mb-4">Không tìm thấy mã thanh toán.</p><a href="#/profile" class="btn btn-primary">Quay lại</a></div>';
      return;
    }

    el.innerHTML = '<div class="section"><p class="text-secondary">Đang tải thông tin thanh toán...</p></div>';
    try {
      const res = await api.get('/store/payment/' + encodeURIComponent(paymentCode));
      const payment = res.payment || {};
      const bank = payment.bank_info || {};
      const debug = JSON.parse(localStorage.getItem('shopti_debug_otps_' + paymentCode) || 'null');
      const expired = payment.expires_at ? new Date(payment.expires_at).getTime() < Date.now() : false;

      el.innerHTML = `
        <section class="section" style="max-width:720px; margin:0 auto;">
          <h1 style="font-size:var(--h2); margin-bottom:16px;">Thanh toán để kích hoạt cửa hàng</h1>
          <div class="card" style="padding:20px;">
            <p><strong>Số tiền:</strong> ${Number(payment.amount || 0).toLocaleString('vi-VN')} VND</p>
            <p><strong>Trạng thái:</strong> <span class="text-secondary">${escapeHtml(payment.status || 'pending')}</span></p>
            <p><strong>Mã thanh toán:</strong> ${escapeHtml(paymentCode)}</p>
            <p><strong>Nội dung chuyển khoản:</strong> <code style="display:inline-block; padding:6px 10px; background:var(--bg); border:1px solid var(--border); border-radius:8px;">${escapeHtml(payment.transfer_content || ('PAY ' + paymentCode))}</code></p>
            <hr style="border:none;border-top:1px solid var(--border); margin:16px 0;">
            <h2 style="font-size:var(--h3); margin-bottom:10px;">Thông tin ngân hàng</h2>
            <p><strong>Ngân hàng:</strong> ${escapeHtml(bank.bank_name || '')}</p>
            <p><strong>Tên tài khoản:</strong> ${escapeHtml(bank.account_name || '')}</p>
            <p><strong>Số tài khoản:</strong> ${escapeHtml(bank.account_number || '')}</p>

            <div class="mt-4">
              <h2 style="font-size:var(--h3); margin-bottom:10px;">Xác nhận OTP</h2>
              <p class="text-secondary" style="margin-bottom:12px; font-size:var(--label);">Nhập 2 mã OTP để xác nhận đăng ký cửa hàng và xác nhận số điện thoại. (Demo: tự động lấy từ response trong localStorage nếu có.)</p>
              <div class="form-group">
                <label class="form-label">Mã đăng ký cửa hàng (OTP #1)</label>
                <input type="text" name="store_registration_otp" class="form-input" value="${escapeHtml(debug?.store_registration_otp || '')}" placeholder="Nhập OTP #1">
              </div>
              <div class="form-group">
                <label class="form-label">Mã xác nhận số điện thoại (OTP #2)</label>
                <input type="text" name="phone_verification_otp" class="form-input" value="${escapeHtml(debug?.phone_verification_otp || '')}" placeholder="Nhập OTP #2">
              </div>
            </div>

            <div style="display:flex; gap:12px; margin-top:18px; align-items:center;">
              <button type="button" class="btn btn-primary" id="btn-confirm-payment" ${expired ? 'disabled' : ''}>Tôi đã thanh toán (kích hoạt)</button>
              <a href="#/profile" class="btn btn-secondary">Về hồ sơ</a>
            </div>
            ${expired ? `<p class="text-secondary mt-3">Mã thanh toán đã hết hạn. Vui lòng đăng ký lại.</p>` : ''}
          </div>
        </section>
      `;

      el.querySelector('#btn-confirm-payment')?.addEventListener('click', async () => {
        try {
          const root = el.querySelector('.card');
          const store_registration_otp = root.querySelector('input[name=\"store_registration_otp\"]').value.trim();
          const phone_verification_otp = root.querySelector('input[name=\"phone_verification_otp\"]').value.trim();
          const payload = { payment_code: paymentCode, store_registration_otp, phone_verification_otp };
          const r2 = await api.post('/store/payment/simulate-success', payload);
          if (!r2.success) throw new Error(r2.message || 'Kích hoạt thất bại');
          localStorage.removeItem('shopti_debug_otps_' + paymentCode);
          ui.alert('Kích hoạt cửa hàng thành công!', 'success');
          window.location.hash = '#/profile';
        } catch (e) {
          ui.alert(e.message || 'Xác nhận thất bại', 'error');
        }
      });
    } catch (e) {
      el.innerHTML = '<div class="section text-center"><p class="mb-4">' + escapeHtml(e.message || 'Không tải được thanh toán') + '</p><a href="#/profile" class="btn btn-primary">Quay lại</a></div>';
    }
  }

  async function vouchersPage(el) {
    el.innerHTML = '<div class="section"><p class="text-secondary">Đang tải voucher...</p></div>';
    try {
      const res = await api.get('/vouchers');
      const list = res.vouchers || [];
      el.innerHTML = `
        <section class="section" style="max-width:900px; margin:0 auto;">
          <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:16px;">
            <h1 style="font-size:var(--h2); margin:0;">Voucher & Mã giảm giá (Admin)</h1>
            <a href="#/rewards" class="btn btn-secondary" ${auth.token ? '' : 'style="display:none;"'}>Kho ưu đãi</a>
          </div>
          <p class="text-secondary" style="margin-bottom:20px;">Nhấn <strong>Lưu</strong> để thêm voucher vào kho ưu đãi và dùng khi checkout.</p>
          <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(260px,1fr)); gap:16px;">
            ${list.map((v) => `
              <div class="card" style="padding:16px;">
                <div style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
                  <h3 style="margin:0; font-size:15px; font-weight:800;">${escapeHtml(v.title)}</h3>
                  <span style="font-size:12px; padding:4px 10px; border-radius:999px; background:rgba(37,99,235,0.10); color:var(--primary); font-weight:800;">
                    ${escapeHtml(v.type === 'freeship' ? 'FREESHIP' : (v.percent ? '-' + v.percent + '%' : 'GIẢM GIÁ'))}
                  </span>
                </div>
                <p class="text-secondary" style="margin:10px 0 0; font-size:13px;">${escapeHtml(v.description || '')}</p>
                <p class="mt-3 mb-2" style="font-size:13px;"><strong>Mã:</strong> <code style="padding:6px 10px; border:1px solid var(--border); border-radius:10px; background:var(--bg);">${escapeHtml(v.code)}</code></p>
                <p class="text-secondary" style="font-size:12px; margin:0;">
                  ${v.min_order_vnd ? `Đơn tối thiểu: ${Number(v.min_order_vnd).toLocaleString('vi-VN')} VND.` : ''}
                  ${v.ends_at ? ` Hết hạn: ${escapeHtml(new Date(v.ends_at).toLocaleString('vi-VN'))}.` : ''}
                </p>
                <div style="display:flex; gap:10px; margin-top:12px;">
                  <button type="button" class="btn btn-secondary btn-sm" data-copy-v="${escapeHtml(v.code)}">Copy</button>
                  <button type="button" class="btn btn-primary btn-sm" data-claim-v="${escapeHtml(v.code)}" ${auth.token ? '' : 'disabled'}>${auth.token ? 'Lưu' : 'Đăng nhập để lưu'}</button>
                </div>
              </div>
            `).join('')}
          </div>
        </section>
      `;

      el.querySelectorAll('[data-copy-v]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const code = btn.dataset.copyV;
          try {
            await navigator.clipboard.writeText(code);
            ui.alert('Đã copy mã: ' + code, 'success');
          } catch (_) {
            ui.alert('Không copy được. Mã: ' + code, 'info');
          }
        });
      });

      el.querySelectorAll('[data-claim-v]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const code = btn.dataset.claimV;
          if (!auth.token) {
            ui.alert('Vui lòng đăng nhập để lưu voucher', 'info');
            window.location.hash = '#/login';
            return;
          }
          try {
            await api.post('/vouchers/claim', { code });
            ui.alert('Đã lưu voucher vào kho ưu đãi', 'success');
          } catch (e) {
            ui.alert(e.message || 'Không lưu được', 'error');
          }
        });
      });
    } catch (e) {
      el.innerHTML = '<div class="section text-center"><p class="mb-4">' + escapeHtml(e.message || 'Không tải được voucher') + '</p><a href="#/" class="btn btn-primary">Home</a></div>';
    }
  }

  async function rewardsPage(el) {
    if (!auth.token) {
      el.innerHTML = '<div class="section text-center"><p class="mb-4">Vui lòng đăng nhập để xem kho ưu đãi.</p><a href="#/" data-auth-modal="login" class="btn btn-primary">Đăng nhập</a></div>';
      return;
    }
    el.innerHTML = '<div class="section"><p class="text-secondary">Đang tải kho ưu đãi...</p></div>';
    try {
      const res = await api.get('/vouchers/my');
      const list = (res.vouchers || []).filter((x) => x.voucher);
      el.innerHTML = `
        <section class="section" style="max-width:900px; margin:0 auto;">
          <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:16px;">
            <h1 style="font-size:var(--h2); margin:0;">Kho ưu đãi</h1>
            <a href="#/checkout" class="btn btn-primary">Đi checkout</a>
          </div>
          ${list.length ? `
            <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:16px;">
              ${list.map((uv) => `
                <div class="card" style="padding:16px;">
                  <div style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
                    <h3 style="margin:0; font-size:15px; font-weight:800;">${escapeHtml(uv.voucher.title)}</h3>
                    <span style="font-size:12px; padding:4px 10px; border-radius:999px; background:${uv.status === 'available' ? 'rgba(16,185,129,0.12)' : 'rgba(107,114,128,0.12)'}; color:${uv.status === 'available' ? '#059669' : 'var(--text-secondary)'}; font-weight:800;">
                      ${escapeHtml(uv.status === 'available' ? 'Sẵn sàng' : 'Đã dùng')}
                    </span>
                  </div>
                  <p class="text-secondary" style="margin:10px 0 0; font-size:13px;">${escapeHtml(uv.voucher.description || '')}</p>
                  <p class="mt-3 mb-0" style="font-size:13px;"><strong>Mã:</strong> <code style="padding:6px 10px; border:1px solid var(--border); border-radius:10px; background:var(--bg);">${escapeHtml(uv.voucher.code)}</code></p>
                  <p class="text-secondary" style="font-size:12px; margin-top:8px; margin-bottom:0;">
                    ${uv.voucher.type === 'freeship' ? 'Freeship (Hà Nội miễn phí, tỉnh lân cận random 40k–50k).' : `Giảm ${uv.voucher.percent || 0}% (tối đa ${(uv.voucher.max_discount_vnd || 0).toLocaleString('vi-VN')} VND).`}
                  </p>
                </div>
              `).join('')}
            </div>
          ` : '<p class="text-secondary">Bạn chưa lưu voucher nào. <a href=\"#/vouchers\">Xem voucher</a>.</p>'}
        </section>
      `;
    } catch (e) {
      el.innerHTML = '<div class="section text-center"><p class="mb-4">' + escapeHtml(e.message || 'Không tải được kho ưu đãi') + '</p><a href="#/" class="btn btn-primary">Home</a></div>';
    }
  }

  function loginPage(el) {
    if (typeof window.openAuthModal === 'function') window.openAuthModal('login');
    el.innerHTML = '';
  }

  function registerPage(el) {
    if (typeof window.openAuthModal === 'function') window.openAuthModal('register');
    el.innerHTML = '';
  }

  /** Format ngày giờ đơn hàng theo giờ địa phương (Việt Nam). Coi chuỗi không có múi giờ là UTC. */
  function formatOrderDate(dateStr) {
    if (!dateStr) return '';
    let s = String(dateStr).trim();
    if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/.test(s) && !s.endsWith('Z') && s.indexOf('+') === -1)
      s = s.replace(' ', 'T') + 'Z';
    const d = new Date(s);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleString('vi-VN', { dateStyle: 'medium', timeStyle: 'short', hour12: false });
  }
  function orderStatusLabel(status) {
    const labels = { pending: 'Đang xử lý', confirmed: 'Đã xác nhận', shipped: 'Đang giao', delivered: 'Đã giao', cancelled: 'Đã hủy' };
    return labels[status] || status;
  }

  function cancellerLabel(order) {
    if (!order || order.status !== 'cancelled') return '';
    if (order.cancelled_by === 'admin') return 'Admin';
    if (order.cancelled_by === 'user') return 'Bạn';
    return 'Không có thông tin. Yêu cầu kiểm tra lại tránh bị lỗi.';
  }
  function paymentMethodLabel(method) {
    const labels = { cod: 'Tiền mặt khi nhận hàng', bank: 'Tài khoản thanh toán', wallet: 'Ví trả sau' };
    return labels[method] || method;
  }

  async function orderDetailPage(el, params) {
    if (!auth.token) {
      el.innerHTML = '<div class="section text-center"><p class="mb-4">Vui lòng đăng nhập để xem đơn hàng.</p><a href="#/" data-auth-modal="login" class="btn btn-primary">Đăng nhập</a></div>';
      return;
    }
    const order = await orders.get(params.id);
    const canCancel = orders.canCancel(order.status);
    const isShippingOrDone = order.status === 'shipped' || order.status === 'delivered';
    el.innerHTML = `
      <section class="section">
        <h1 style="font-size:var(--h2); margin-bottom:24px;">Order #${order.id}</h1>
        <div class="card mb-4" style="padding:24px;">
          <p><strong>Trạng thái:</strong> ${escapeHtml(orderStatusLabel(order.status))}${order.status === 'cancelled' ? ` (${escapeHtml(cancellerLabel(order))})` : ''}</p>
          <p><strong>Ngày đặt:</strong> ${formatOrderDate(order.created_at)}</p>
          ${order.receiver_name ? `<p><strong>Người nhận:</strong> ${escapeHtml(order.receiver_name)}</p>` : ''}
          ${order.receiver_phone ? `<p><strong>SĐT nhận hàng:</strong> ${escapeHtml(order.receiver_phone)}</p>` : ''}
          <p><strong>Địa chỉ giao:</strong> ${escapeHtml(order.shipping_address)}</p>
          <p><strong>Thanh toán:</strong> ${escapeHtml(paymentMethodLabel(order.payment_method || 'cod'))}</p>
          <p><strong>Tổng tiền:</strong> $${Number(order.total_amount).toFixed(2)}</p>
          ${canCancel ? '<p class="mt-3"><button type="button" class="btn btn-danger" id="btn-cancel-order">Hủy đơn hàng</button></p>' : ''}
          ${isShippingOrDone ? '<p class="mt-3 text-secondary">Đơn đang giao hoặc đã giao không thể hủy.</p>' : ''}
          ${order.status === 'cancelled' ? `<p class="mt-3 text-secondary">Đơn này đã được hủy${cancellerLabel(order) ? ` (${escapeHtml(cancellerLabel(order))})` : ''}. ${order.cancel_reason ? `Lý do: <strong>${escapeHtml(order.cancel_reason)}</strong>. ` : ''}Số lượng sản phẩm đã được trả về kho.</p>` : ''}
        </div>
        <h2 class="mb-3" style="font-size:var(--h3);">Sản phẩm</h2>
        <div style="overflow-x:auto;">
          <table style="width:100%; border-collapse:collapse;">
            <thead>
              <tr style="border-bottom:2px solid var(--border);">
                <th style="text-align:left; padding:12px;">Sản phẩm</th>
                <th style="text-align:center; padding:12px;">SL</th>
                <th style="text-align:right; padding:12px;">Đơn giá</th>
                <th style="text-align:right; padding:12px;">Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              ${(order.items || []).map((i) => `
                <tr style="border-bottom:1px solid var(--border);">
                  <td style="padding:12px;">${escapeHtml(i.product_name)}</td>
                  <td style="padding:12px; text-align:center;">${i.quantity}</td>
                  <td style="padding:12px; text-align:right;">$${Number(i.price_at_order).toFixed(2)}</td>
                  <td style="padding:12px; text-align:right;">$${(i.quantity * i.price_at_order).toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        <a href="#/orders" class="btn btn-secondary mt-4">Quay lại đơn hàng</a>
      </section>
    `;
    const cancelBtn = el.querySelector('#btn-cancel-order');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', async () => {
        const reason = prompt('Nhập lý do hủy đơn (vd: hết hàng, giá thay đổi...)', 'Hết hàng');
        if (reason === null) return;
        if (!confirm('Bạn có chắc muốn hủy đơn hàng này? Sản phẩm sẽ được trả về kho.')) return;
        try {
          await orders.cancel(order.id, reason);
          ui.alert('Đã hủy đơn. Số lượng đã được trả về kho.', 'success');
          window.appRender();
        } catch (err) {
          ui.alert(err.message || 'Không thể hủy đơn', 'error');
        }
      });
    }
  }

  async function ordersPage(el) {
    if (!auth.token) {
      el.innerHTML = '<div class="section text-center"><p class="mb-4">Vui lòng đăng nhập để xem đơn hàng.</p><a href="#/" data-auth-modal="login" class="btn btn-primary">Đăng nhập</a></div>';
      return;
    }
    el.innerHTML = '<div class="section"><p class="text-secondary">Loading orders...</p></div>';
    const list = await orders.list();
    el.innerHTML = `
      <section class="section">
        <h1 style="font-size:var(--h2); margin-bottom:24px;">Order history</h1>
        ${list.length === 0 ? '<p class="text-secondary">No orders yet. <a href="#/products">Shop now</a>.</p>' : `
          <div style="overflow-x:auto;">
            <table style="width:100%; border-collapse:collapse;">
              <thead>
                <tr style="border-bottom:2px solid var(--border);">
                  <th style="text-align:left; padding:12px;">Order #</th>
                  <th style="text-align:left; padding:12px;">Date</th>
                  <th style="text-align:left; padding:12px;">Status</th>
                  <th style="text-align:right; padding:12px;">Total</th>
                  <th style="padding:12px;"></th>
                </tr>
              </thead>
              <tbody id="orders-tbody"></tbody>
            </table>
          </div>
        `}
      </section>
    `;
    const tbody = el.querySelector('#orders-tbody');
    if (tbody) {
      list.forEach((o) => {
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid var(--border)';
        const canCancel = orders.canCancel(o.status);
        tr.innerHTML = `
          <td style="padding:12px;">#${o.id}</td>
          <td style="padding:12px;">${formatOrderDate(o.created_at)}</td>
          <td style="padding:12px;">${escapeHtml(orderStatusLabel(o.status))}${o.status === 'cancelled' ? ` (${escapeHtml(cancellerLabel(o))})` : ''}</td>
          <td style="padding:12px; text-align:right;">$${Number(o.total_amount).toFixed(2)}</td>
          <td style="padding:12px;">
            <a href="#/order/${o.id}" class="btn btn-secondary btn-sm">Xem</a>
            ${canCancel ? `<button type="button" class="btn btn-danger btn-sm btn-cancel-order" data-id="${o.id}">Hủy đơn</button>` : ''}
          </td>
        `;
        tbody.appendChild(tr);
      });
      tbody.querySelectorAll('.btn-cancel-order').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const id = btn.dataset.id;
          const reason = prompt('Nhập lý do hủy đơn (vd: hết hàng, giá thay đổi...)', 'Hết hàng');
          if (reason === null) return;
          if (!confirm('Hủy đơn hàng #' + id + '? Sản phẩm sẽ được trả về kho.')) return;
          try {
            await orders.cancel(id, reason);
            ui.alert('Đã hủy đơn.', 'success');
            window.appRender();
          } catch (err) {
            ui.alert(err.message || 'Không thể hủy đơn', 'error');
          }
        });
      });
    }
  }

  function escapeHtml(s) {
    if (s == null) return '';
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  window.appRender = render;

  /* Popup quảng cáo TikTok - hiện 1 lần mỗi phiên */
  (function initPromo() {
    const PROMO_KEY = 'shopti_promo_seen';
    const overlay = document.getElementById('promo-overlay');
    const link = document.getElementById('promo-tiktok-link');
    if (!overlay || !link) return;
    link.href = overlay.getAttribute('data-tiktok-url') || 'https://www.tiktok.com';
    if (sessionStorage.getItem(PROMO_KEY)) return;
    function closePromo() {
      sessionStorage.setItem(PROMO_KEY, '1');
      overlay.classList.add('hidden');
      overlay.setAttribute('aria-hidden', 'true');
    }
    overlay.querySelectorAll('.promo-close, .promo-btn-close').forEach(function (btn) {
      btn.addEventListener('click', closePromo);
    });
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closePromo();
    });
    link.addEventListener('click', function () {
      closePromo();
    });
    setTimeout(function () {
      overlay.classList.remove('hidden');
      overlay.setAttribute('aria-hidden', 'false');
    }, 800);
  })();

  /* Modal Đăng nhập / Đăng ký - mở từ header hoặc link, flip giữa login/register */
  (function initAuthModal() {
    const overlay = document.getElementById('auth-modal-overlay');
    const inner = document.getElementById('auth-flip-inner');
    if (!overlay || !inner) return;

    function openAuthModal(tab) {
      overlay.classList.remove('hidden');
      overlay.setAttribute('aria-hidden', 'false');
      if (tab === 'register') inner.classList.add('flipped');
      else inner.classList.remove('flipped');
    }

    function closeAuthModal() {
      overlay.classList.add('hidden');
      overlay.setAttribute('aria-hidden', 'true');
    }

    document.addEventListener('click', function (e) {
      const t = e.target.closest('[data-auth-modal]');
      if (t) {
        e.preventDefault();
        openAuthModal(t.getAttribute('data-auth-modal'));
      }
    });

    overlay.querySelectorAll('.auth-modal-close').forEach(function (btn) {
      btn.addEventListener('click', closeAuthModal);
    });
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeAuthModal();
    });

    overlay.querySelectorAll('.auth-switch-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var show = btn.getAttribute('data-auth-show');
        inner.classList.toggle('flipped', show === 'register');
      });
    });

    document.getElementById('auth-login-form').addEventListener('submit', async function (e) {
      e.preventDefault();
      var fd = new FormData(e.target);
      try {
        await auth.login(fd.get('email'), fd.get('password'));
        ui.alert('Đăng nhập thành công!', 'success');
        closeAuthModal();
        ui.updateNav();
        if (typeof window.appRender === 'function') window.appRender();
      } catch (err) {
        ui.alert(err.message || 'Đăng nhập thất bại', 'error');
      }
    });

    document.getElementById('auth-register-form').addEventListener('submit', async function (e) {
      e.preventDefault();
      var fd = new FormData(e.target);
      try {
        await auth.register(fd.get('email'), fd.get('password'), fd.get('full_name'));
        ui.alert('Đăng ký thành công!', 'success');
        closeAuthModal();
        ui.updateNav();
        if (typeof window.appRender === 'function') window.appRender();
      } catch (err) {
        ui.alert(err.message || 'Đăng ký thất bại', 'error');
      }
    });

    window.openAuthModal = openAuthModal;
  })();
})();
