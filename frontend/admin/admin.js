/**
 * Admin dashboard - products, orders, users (UI_SPEC)
 */
(function () {
  const content = document.getElementById('admin-content');
  const modalOverlay = document.getElementById('modal-overlay');
  const modalBox = document.getElementById('modal-box');

  function esc(s) {
    if (s == null) return '';
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  function checkAuth() {
    if (!getToken()) {
      window.location.href = '/#/login';
      return false;
    }
    return true;
  }

  document.querySelectorAll('.admin-sidebar a[data-page]').forEach((a) => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const page = a.dataset.page;
      document.querySelectorAll('.admin-sidebar a[data-page]').forEach((x) => x.classList.remove('active'));
      a.classList.add('active');
      loadPage(page);
    });
  });

  async function loadPage(page) {
    if (!checkAuth()) return;
    content.innerHTML = '<p>Loading...</p>';
    try {
      if (page === 'dashboard') await renderDashboard();
      else if (page === 'products') await renderProducts();
      else if (page === 'orders') await renderOrders();
      else if (page === 'users') await renderUsers();
      else if (page === 'store-requests-history') await renderStoreRequestsHistory();
      else if (page === 'vouchers') await renderVouchers();
    } catch (e) {
      if (e.message && e.message.includes('Admin')) {
        content.innerHTML = '<p>Admin access required. <a href="/">Back to store</a></p>';
        return;
      }
      content.innerHTML = '<p>Error: ' + esc(e.message) + '. <a href="/#/login">Login</a></p>';
    }
  }

  async function renderDashboard() {
    const mode = String(window.__dashboardMode || 'month');
    const year = Number(window.__dashboardYear || new Date().getFullYear());
    const month = Number(window.__dashboardMonth || (new Date().getMonth() + 1));
    const qs = new URLSearchParams({ mode, year: String(year), month: String(month) });
    const res = await api.get('/admin/dashboard?' + qs.toString());
    const d = res.dashboard;

    function money(n) {
      return '$' + Number(n || 0).toFixed(2);
    }

    function formatVnd(n) {
      return Number(n || 0).toLocaleString('vi-VN') + ' VND';
    }

    function getLinePoints(series, width, height, padX, padY) {
      if (!series || !series.length) return [];
      const maxVal = Math.max(...series, 1);
      const stepX = series.length > 1 ? (width - padX * 2) / (series.length - 1) : 0;
      return series.map((v, i) => {
        const x = padX + i * stepX;
        const y = height - padY - ((Number(v || 0) / maxVal) * (height - padY * 2));
        return { x, y, v: Number(v || 0) };
      });
    }

    function buildLinePath(points) {
      if (!points.length) return '';
      return points
        .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
        .join(' ');
    }

    function buildCountBoxes(labels, series) {
      if (!labels.length) return '';
      return labels
        .map((lb, i) => {
          const v = Number(series[i] || 0);
          const isActive = v > 0;
          return `<div title="${esc(lb)}: ${v}" style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;min-width:52px;min-height:56px;padding:6px 8px;border-radius:10px;border:1px solid ${isActive ? '#34d399' : '#d1d5db'};background:${isActive ? '#ecfdf5' : '#f8fafc'};">
            <strong style="font-size:16px;line-height:1;color:${isActive ? '#047857' : '#111827'};">${v}</strong>
            <span style="font-size:11px;color:#64748b;">${esc(lb)}</span>
          </div>`;
        })
        .join('');
    }

    const fallbackLabels =
      mode === 'year'
        ? Array.from({ length: 12 }, (_, i) => `T${i + 1}`)
        : Array.from({ length: new Date(year, month, 0).getDate() }, (_, i) => String(i + 1).padStart(2, '0'));
    const labels = (Array.isArray(d.chart?.labels) && d.chart.labels.length) ? d.chart.labels : fallbackLabels;
    const revenueSeriesRaw = Array.isArray(d.chart?.revenueSeries) ? d.chart.revenueSeries : [];
    const registrationSeriesRaw = Array.isArray(d.chart?.registrationSeries) ? d.chart.registrationSeries : [];
    const revenueSeries = labels.map((_, i) => Number(revenueSeriesRaw[i] || 0));
    const registrationSeries = labels.map((_, i) => Number(registrationSeriesRaw[i] || 0));
    const yMax = Math.max(...revenueSeries, 1);
    const yTicks = 5;
    const yTickValues = Array.from({ length: yTicks + 1 }, (_, i) => (yMax / yTicks) * (yTicks - i));
    const plotTop = 20;
    const plotBottom = 200;
    const plotLeft = 56;
    const plotRight = 796;
    const revenuePoints = getLinePoints(revenueSeries, 820, 220, plotLeft, 20);
    const revenuePath = buildLinePath(revenuePoints);
    const revenueAreaPath = revenuePoints.length
      ? `${revenuePath} L ${revenuePoints[revenuePoints.length - 1].x.toFixed(2)} 200 L ${revenuePoints[0].x.toFixed(2)} 200 Z`
      : '';
    const hasRevenueData = revenueSeries.some((x) => Number(x) > 0);
    const hasRegistrationData = registrationSeries.some((x) => Number(x) > 0);

    content.innerHTML = `
      <h1 style="margin-bottom:14px;">Platform Dashboard</h1>
      <div class="card" style="padding:14px; margin-bottom:16px; display:flex; gap:10px; align-items:center; flex-wrap:wrap; background:linear-gradient(90deg,#0f172a,#1d4ed8); color:#fff;">
        <strong style="font-size:14px;">Bộ lọc biểu đồ:</strong>
        <select class="form-input" id="dash-mode" style="width:auto; min-width:110px; background:#fff; color:#111827;">
          <option value="month" ${mode === 'month' ? 'selected' : ''}>Theo tháng</option>
          <option value="year" ${mode === 'year' ? 'selected' : ''}>Theo năm</option>
        </select>
        <input class="form-input" id="dash-year" type="number" min="2020" max="2100" value="${year}" style="width:110px; background:#fff; color:#111827;">
        <select class="form-input" id="dash-month" style="width:auto; min-width:90px; background:#fff; color:#111827; ${mode === 'year' ? 'display:none;' : ''}">
          ${Array.from({ length: 12 }, (_, i) => `<option value="${i + 1}" ${month === i + 1 ? 'selected' : ''}>Tháng ${i + 1}</option>`).join('')}
        </select>
        <button class="btn btn-secondary" id="dash-apply-filter">Áp dụng</button>
      </div>
      <div class="stats-grid">
        <div class="stat-card"><div class="value">${d.totalUsers ?? 0}</div><div class="label">Tổng người dùng nền tảng</div></div>
        <div class="stat-card"><div class="value">${d.trustedUsers ?? 0}</div><div class="label">Người dùng tin tưởng (đã mua thành công)</div></div>
        <div class="stat-card"><div class="value">${d.productsSold ?? 0}</div><div class="label">Sản phẩm đã bán trên nền tảng</div></div>
        <div class="stat-card"><div class="value">${money(d.currentMonthRevenue)}</div><div class="label">Doanh thu tháng hiện tại</div></div>
        <div class="stat-card"><div class="value">${d.storeApplicants ?? 0}</div><div class="label">Người dùng đăng ký mở cửa hàng</div></div>
        <div class="stat-card"><div class="value">${d.totalStores ?? 0}</div><div class="label">Tổng số cửa hàng</div></div>
        <div class="stat-card"><div class="value">${d.activeStores ?? 0}</div><div class="label">Cửa hàng đang hoạt động</div></div>
        <div class="stat-card"><div class="value">${d.registrationsThisMonth ?? 0}</div><div class="label">Đăng ký shop tháng này</div></div>
        <div class="stat-card"><div class="value">${money(d.actualRevenue)}</div><div class="label">Doanh thu đơn hoàn thành (toàn nền tảng)</div></div>
        <div class="stat-card"><div class="value">${money(d.filtered?.deliveredRevenue)}</div><div class="label">Doanh thu theo bộ lọc</div></div>
        <div class="stat-card"><div class="value">${formatVnd(d.shopActivationRevenueVnd)}</div><div class="label">Doanh thu kích hoạt shop</div></div>
        <div class="stat-card"><div class="value">${d.filtered?.registrations ?? 0}</div><div class="label">Đăng ký shop theo bộ lọc</div></div>
      </div>
      <div class="card" style="padding:16px; margin-bottom:16px;">
        <h2 class="mb-3" style="font-size:18px;">Biểu đồ doanh thu nền tảng (${mode === 'year' ? 'theo tháng trong năm' : 'theo ngày trong tháng'})</h2>
        <div style="width:100%; overflow-x:auto;">
          <svg viewBox="0 0 820 260" style="min-width:820px;width:100%;height:260px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;">
            <defs>
              <linearGradient id="revenue-fill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stop-color="#2563eb" stop-opacity="0.22"></stop>
                <stop offset="100%" stop-color="#2563eb" stop-opacity="0.02"></stop>
              </linearGradient>
            </defs>
            ${yTickValues
              .map((v, i) => {
                const y = plotTop + ((plotBottom - plotTop) * i) / yTicks;
                return `<line x1="${plotLeft}" y1="${y}" x2="${plotRight}" y2="${y}" stroke="#e2e8f0" stroke-width="1"></line>
                  <text x="${plotLeft - 8}" y="${y + 4}" text-anchor="end" fill="#64748b" font-size="11">$${Number(v).toFixed(0)}</text>`;
              })
              .join('')}
            <line x1="${plotLeft}" y1="${plotTop}" x2="${plotLeft}" y2="${plotBottom}" stroke="#94a3b8" stroke-width="1.2"></line>
            <line x1="${plotLeft}" y1="${plotBottom}" x2="${plotRight}" y2="${plotBottom}" stroke="#94a3b8" stroke-width="1.2"></line>
            ${hasRevenueData ? `<path d="${revenueAreaPath}" fill="url(#revenue-fill)"></path>` : ''}
            <path d="${revenuePath}" fill="none" stroke="#2563eb" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"></path>
            ${hasRevenueData
              ? revenuePoints
                  .filter((p) => p.v > 0)
                  .map((p) => `<circle cx="${p.x.toFixed(2)}" cy="${p.y.toFixed(2)}" r="4.6" fill="#2563eb" stroke="#ffffff" stroke-width="2"></circle>`)
                  .join('')
              : ''}
            ${(labels || [])
              .map((lb, i) => {
                if (!(mode === 'year' || i === 0 || i === labels.length - 1 || (i + 1) % 2 === 0)) return '';
                const x = plotLeft + ((plotRight - plotLeft) * i) / Math.max(labels.length - 1, 1);
                return `<text x="${x}" y="${plotBottom + 16}" text-anchor="middle" fill="#64748b" font-size="10">${esc(lb)}</text>`;
              })
              .join('')}
            <text x="${(plotLeft + plotRight) / 2}" y="252" text-anchor="middle" fill="#475569" font-size="11">${mode === 'year' ? 'Tháng trong năm' : 'Ngày trong tháng'}</text>
            <text x="16" y="14" fill="#475569" font-size="11">Số tiền (USD)</text>
            ${!hasRevenueData ? '<text x="430" y="115" text-anchor="middle" fill="#94a3b8" font-size="14">Chưa có dữ liệu doanh thu trong kỳ lọc</text>' : ''}
          </svg>
        </div>
      </div>
      <div class="card" style="padding:16px; margin-bottom:16px;">
        <h2 class="mb-3" style="font-size:18px;">Lượt đăng ký cửa hàng (${mode === 'year' ? 'theo tháng' : 'theo ngày'})</h2>
        <div style="display:flex;gap:8px;align-items:stretch;overflow-x:auto;padding-bottom:6px;">
          ${buildCountBoxes(labels, registrationSeries)}
        </div>
        ${!hasRegistrationData ? '<p class="text-secondary" style="font-size:13px;margin-top:8px;">Chưa có dữ liệu đăng ký cửa hàng trong kỳ lọc.</p>' : ''}
      </div>
      <h2 class="mb-3" style="font-size:18px;">Recent orders</h2>
      <table class="admin-table">
        <thead><tr><th>ID</th><th>Email</th><th>Total</th><th>Status</th><th>Date</th></tr></thead>
        <tbody>
          ${(d.recentOrders || []).map((o) => `
            <tr>
              <td>#${o.id}</td>
              <td>${esc(o.email)}</td>
              <td>$${Number(o.total_amount).toFixed(2)}</td>
              <td>${esc(o.status)}</td>
              <td>${new Date(o.created_at).toLocaleString()}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    const modeEl = content.querySelector('#dash-mode');
    const yearEl = content.querySelector('#dash-year');
    const monthEl = content.querySelector('#dash-month');
    modeEl?.addEventListener('change', () => {
      if (!monthEl) return;
      monthEl.style.display = modeEl.value === 'year' ? 'none' : '';
    });
    content.querySelector('#dash-apply-filter')?.addEventListener('click', () => {
      const nextMode = modeEl?.value === 'year' ? 'year' : 'month';
      const nextYear = Number.parseInt(yearEl?.value || String(new Date().getFullYear()), 10) || new Date().getFullYear();
      const nextMonth = Number.parseInt(monthEl?.value || String(new Date().getMonth() + 1), 10) || (new Date().getMonth() + 1);
      window.__dashboardMode = nextMode;
      window.__dashboardYear = nextYear;
      window.__dashboardMonth = nextMonth;
      renderDashboard();
    });
  }

  async function renderProducts() {
    const res = await api.get('/admin/products');
    const list = res.products || [];
    content.innerHTML = `
      <h1>Products</h1>
      <div class="mb-4"><button type="button" class="btn btn-primary" id="btn-new-product">Add product</button></div>
      <table class="admin-table">
        <thead><tr><th>ID</th><th>Name</th><th>Danh mục</th><th>Hãng</th><th>Size</th><th>Màu</th><th>Price</th><th>Stock</th><th>Actions</th></tr></thead>
        <tbody>
          ${list.map((p) => `
            <tr>
              <td>${p.id}</td>
              <td>${esc(p.name)}</td>
              <td>${esc(p.category_name || '-')}</td>
              <td>${esc(p.brand || '-')}</td>
              <td>${esc((p.sizes && p.sizes.length ? p.sizes.join(', ') : p.size) || '-')}</td>
              <td>${esc(p.color || '-')}</td>
              <td>$${Number(p.price).toFixed(2)}</td>
              <td>${p.stock}</td>
              <td>
                <button type="button" class="btn btn-secondary btn-sm edit-product" data-id="${p.id}">Edit</button>
                <button type="button" class="btn btn-danger btn-sm delete-product" data-id="${p.id}" data-name="${esc(p.name)}">Delete</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
    content.querySelector('#btn-new-product').addEventListener('click', () => openProductModal());
    content.querySelectorAll('.edit-product').forEach((btn) => {
      btn.addEventListener('click', () => openProductModal(btn.dataset.id));
    });
    content.querySelectorAll('.delete-product').forEach((btn) => {
      btn.addEventListener('click', () => confirmDeleteProduct(btn.dataset.id, btn.dataset.name));
    });
  }

  const SIZE_OPTIONS = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Free size', 'One size'];
  const FULL_SIZES_CLOTHING = ['S', 'M', 'L', 'XL', 'XXL'];

  function selectedSizesFromProduct(p) {
    if (p && Array.isArray(p.sizes) && p.sizes.length) return new Set(p.sizes);
    if (p && p.size) {
      const parts = String(p.size).split(/[,/|]/).map((x) => x.trim()).filter(Boolean);
      return new Set(parts.length ? parts : [String(p.size).trim()].filter(Boolean));
    }
    return new Set();
  }

  function buildSizeCheckboxesHtml(p) {
    const selected = selectedSizesFromProduct(p);
    const boxes = SIZE_OPTIONS.map(
      (opt) =>
        `<label style="display:inline-flex;align-items:center;margin-right:14px;margin-bottom:10px;cursor:pointer;user-select:none;"><input type="checkbox" name="size_opt" value="${esc(opt)}" ${selected.has(opt) ? 'checked' : ''}> <span style="margin-left:6px;">${esc(opt)}</span></label>`
    ).join('');
    return `
        <div class="form-group">
          <label class="form-label">Size có bán</label>
          <p class="text-secondary" style="font-size:13px;margin-bottom:10px;">Chọn ít size (vd. chỉ M) hoặc <strong>Đủ size</strong> (S–XXL) / <strong>Tất cả</strong> (gồm XS, Free size…).</p>
          <div style="margin-bottom:10px;display:flex;flex-wrap:wrap;gap:8px;">
            <button type="button" class="btn btn-secondary btn-sm" id="btn-sizes-full">Đủ size (S–XXL)</button>
            <button type="button" class="btn btn-secondary btn-sm" id="btn-sizes-all">Chọn tất cả size</button>
            <button type="button" class="btn btn-secondary btn-sm" id="btn-sizes-clear">Bỏ chọn</button>
          </div>
          <div class="admin-size-grid" style="display:flex;flex-wrap:wrap;align-items:center;">${boxes}</div>
        </div>`;
  }

  function buildProductFormHtml(p, categories) {
    const catOptions = (categories || []).map((c) =>
      `<option value="${c.id}" ${p && String(p.category_id || '') === String(c.id) ? 'selected' : ''}>${esc(c.name)}</option>`
    ).join('');
    return `
      <h2>${p ? 'Edit' : 'New'} product</h2>
      <form id="product-form">
        <div class="form-group">
          <label class="form-label">Name</label>
          <input type="text" name="name" class="form-input" value="${p ? esc(p.name) : ''}" required>
        </div>
        <div class="form-group">
          <label class="form-label">Description</label>
          <textarea name="description" class="form-textarea">${p ? esc(p.description) : ''}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label">Danh mục</label>
          <select name="category_id" class="form-input form-select">
            <option value="">-- Chọn danh mục --</option>
            ${catOptions}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Hãng (brand)</label>
          <input type="text" name="brand" class="form-input" value="${p ? esc(p.brand || '') : ''}" placeholder="Apple, Samsung, Nike...">
        </div>
        <div class="form-group">
          <label class="form-label">Price</label>
          <input type="number" name="price" class="form-input" step="0.01" value="${p ? p.price : ''}" required>
        </div>
        ${buildSizeCheckboxesHtml(p)}
        <div class="form-group">
          <label class="form-label">Màu</label>
          <input type="text" name="color" class="form-input" value="${p ? esc(p.color) : ''}" placeholder="Đen, Trắng...">
        </div>
        <div class="form-group">
          <label class="form-label">Image URL</label>
          <input type="text" name="image_url" class="form-input" value="${p ? esc(p.image_url) : ''}" placeholder="/images/placeholder.svg">
        </div>
        <div class="form-group">
          <label class="form-label">Stock</label>
          <input type="number" name="stock" class="form-input" value="${p ? p.stock : 0}">
        </div>
        <button type="submit" class="btn btn-primary">${p ? 'Update' : 'Create'}</button>
        <button type="button" class="btn btn-secondary" id="modal-close">Cancel</button>
      </form>
    `;
  }

  async function openProductModal(editId) {
    const [categoriesRes, productRes] = await Promise.all([
      api.get('/admin/categories'),
      editId ? api.get('/admin/products/' + editId).catch(() => ({ product: null })) : Promise.resolve({ product: null }),
    ]);
    const categories = categoriesRes.categories || [];
    const p = productRes.product || null;
    modalBox.innerHTML = buildProductFormHtml(p, categories);
    modalOverlay.classList.remove('hidden');
    function getSelectedSizes() {
      return [...modalBox.querySelectorAll('input[name="size_opt"]:checked')].map((cb) => cb.value);
    }
    function setSizeChecks(values) {
      const set = new Set(values);
      modalBox.querySelectorAll('input[name="size_opt"]').forEach((cb) => {
        cb.checked = set.has(cb.value);
      });
    }
    modalBox.querySelector('#btn-sizes-full')?.addEventListener('click', () => setSizeChecks(FULL_SIZES_CLOTHING));
    modalBox.querySelector('#btn-sizes-all')?.addEventListener('click', () => setSizeChecks(SIZE_OPTIONS));
    modalBox.querySelector('#btn-sizes-clear')?.addEventListener('click', () => setSizeChecks([]));
    modalBox.querySelector('#product-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const categoryId = fd.get('category_id');
      const sizes = getSelectedSizes();
      const body = {
        name: fd.get('name'),
        description: fd.get('description'),
        price: parseFloat(fd.get('price')),
        image_url: fd.get('image_url') || '/images/placeholder.svg',
        stock: parseInt(fd.get('stock'), 10) || 0,
        category_id: categoryId ? String(categoryId).trim() : null,
        brand: fd.get('brand') ? String(fd.get('brand')).trim() : null,
        sizes,
        color: fd.get('color') || null,
      };
      try {
        if (editId) await api.put('/admin/products/' + editId, body);
        else await api.post('/admin/products', body);
        closeModal();
        loadPage('products');
      } catch (err) {
        alert(err.message);
      }
    });
    modalBox.querySelector('#modal-close').addEventListener('click', closeModal);
  }

  function confirmDeleteProduct(id, name) {
    if (!confirm('Delete product "' + name + '"?')) return;
    api.delete('/admin/products/' + id).then(() => loadPage('products')).catch((e) => alert(e.message));
  }

  async function renderOrders() {
    const res = await api.get('/admin/orders');
    const list = res.orders || [];
    content.innerHTML = `
      <h1>Orders</h1>
      <table class="admin-table">
        <thead><tr><th>ID</th><th>Customer</th><th>Total</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
        <tbody>
          ${list.map((o) => `
            <tr>
              <td>#${o.id}</td>
              <td>${esc(o.email)}</td>
              <td>$${Number(o.total_amount).toFixed(2)}</td>
              <td>${esc(o.status)}</td>
              <td>${new Date(o.created_at).toLocaleString()}</td>
              <td>
                <select class="form-input order-status" data-id="${o.id}" style="width:auto;padding:4px 8px;">
                  <option value="pending" ${o.status === 'pending' ? 'selected' : ''}>pending</option>
                  <option value="confirmed" ${o.status === 'confirmed' ? 'selected' : ''}>confirmed</option>
                  <option value="shipped" ${o.status === 'shipped' ? 'selected' : ''}>shipped</option>
                  <option value="delivered" ${o.status === 'delivered' ? 'selected' : ''}>delivered</option>
                  <option value="cancelled" ${o.status === 'cancelled' ? 'selected' : ''}>cancelled</option>
                </select>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
    content.querySelectorAll('.order-status').forEach((sel) => {
      sel.addEventListener('change', async () => {
        try {
          const prev = sel.getAttribute('data-prev') || '';
          let payload = { status: sel.value };
          if (sel.value === 'cancelled' && prev !== 'cancelled') {
            const reason = prompt('Lý do hủy đơn (vd: hết hàng, giá thay đổi...)', 'Hết hàng');
            if (reason === null) {
              sel.value = prev || 'pending';
              return;
            }
            payload.cancel_reason = reason;
          }
          await api.put('/admin/orders/' + sel.dataset.id, payload);
          sel.setAttribute('data-prev', sel.value);
        } catch (e) {
          alert(e.message);
        }
      });
      sel.setAttribute('data-prev', sel.value);
    });
  }

  async function renderUsers() {
    const roleFilter = String(window.__adminUserRoleFilter || 'all');
    const userRes = await api.get('/admin/users' + (roleFilter === 'all' ? '' : ('?role=' + encodeURIComponent(roleFilter))));
    const list = userRes.users || [];
    content.innerHTML = `
      <h1>Users</h1>
      <div class="card" style="padding:12px; margin-bottom:12px; display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
        <strong>Lọc vai trò:</strong>
        <button type="button" class="btn btn-sm ${roleFilter === 'all' ? 'btn-primary' : 'btn-secondary'} user-filter" data-role="all">Tất cả</button>
        <button type="button" class="btn btn-sm ${roleFilter === 'user' ? 'btn-primary' : 'btn-secondary'} user-filter" data-role="user">user</button>
        <button type="button" class="btn btn-sm ${roleFilter === 'store' ? 'btn-primary' : 'btn-secondary'} user-filter" data-role="store">store</button>
        <button type="button" class="btn btn-sm ${roleFilter === 'admin' ? 'btn-primary' : 'btn-secondary'} user-filter" data-role="admin">admin</button>
      </div>
      <table class="admin-table">
        <thead><tr><th>ID</th><th>Email</th><th>Name</th><th>Role</th><th>Store status</th><th>Joined</th><th>Actions</th></tr></thead>
        <tbody>
          ${list.map((u) => `
            <tr>
              <td>${u.id}</td>
              <td>${esc(u.email)}</td>
              <td>${esc(u.full_name)}</td>
              <td>${esc(u.role)}</td>
              <td>${esc(u.store_status || 'none')}</td>
              <td>${new Date(u.created_at).toLocaleDateString()}</td>
              <td>
                <button type="button" class="btn btn-secondary btn-sm edit-user" data-id="${u.id}">Edit</button>
                ${u.role === 'store'
                  ? `<button type="button" class="btn btn-sm ${u.store_status === 'locked' ? 'btn-primary' : 'btn-danger'} toggle-store-lock" data-id="${u.id}" data-locked="${u.store_status === 'locked' ? '1' : '0'}">${u.store_status === 'locked' ? 'Mở khóa shop' : 'Khóa shop'}</button>`
                  : ''}
                ${u.role !== 'admin' ? `<button type="button" class="btn btn-danger btn-sm delete-user" data-id="${u.id}">Delete</button>` : ''}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
    content.querySelectorAll('.user-filter').forEach((btn) => {
      btn.addEventListener('click', () => {
        window.__adminUserRoleFilter = btn.dataset.role;
        loadPage('users');
      });
    });
    content.querySelectorAll('.edit-user').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const row = btn.closest('tr');
        const email = row.cells[1].textContent;
        const name = row.cells[2].textContent;
        const role = row.cells[3].textContent;
        const newName = prompt('Full name', name);
        if (newName === null) return;
        const newRole = prompt('Role (user/store/admin)', role);
        if (newRole === null) return;
        if (!['user', 'store', 'admin'].includes(newRole)) {
          alert('Role must be user, store or admin');
          return;
        }
        api.put('/admin/users/' + id, { full_name: newName, role: newRole }).then(() => loadPage('users')).catch((e) => alert(e.message));
      });
    });
    content.querySelectorAll('.delete-user').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (!confirm('Delete this user?')) return;
        api.delete('/admin/users/' + btn.dataset.id).then(() => loadPage('users')).catch((e) => alert(e.message));
      });
    });
    content.querySelectorAll('.toggle-store-lock').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        const currentlyLocked = btn.dataset.locked === '1';
        const ok = confirm(currentlyLocked ? 'Mở khóa cửa hàng này?' : 'Khóa cửa hàng này?');
        if (!ok) return;
        try {
          await api.put('/admin/users/' + id + '/store-lock', { locked: !currentlyLocked });
          loadPage('users');
        } catch (e) {
          alert(e.message || 'Không cập nhật được trạng thái khóa shop');
        }
      });
    });
  }

  async function renderVouchers() {
    const res = await api.get('/vouchers/admin');
    const list = res.vouchers || [];
    content.innerHTML = `
      <h1>Vouchers</h1>
      <div class="mb-4">
        <button type="button" class="btn btn-primary" id="btn-new-voucher">Create voucher</button>
        <button type="button" class="btn btn-secondary" id="btn-refresh-voucher" style="margin-left:10px;">Refresh</button>
      </div>
      <table class="admin-table">
        <thead>
          <tr>
            <th>Code</th>
            <th>Title</th>
            <th>Type</th>
            <th>%</th>
            <th>Max (VND)</th>
            <th>Min order (VND)</th>
            <th>Used</th>
            <th>Active</th>
            <th>Ends</th>
          </tr>
        </thead>
        <tbody>
          ${list.map((v) => `
            <tr>
              <td><code>${esc(v.code)}</code></td>
              <td>${esc(v.title)}</td>
              <td>${esc(v.type)}</td>
              <td style="text-align:right;">${v.percent == null ? '-' : esc(String(v.percent))}</td>
              <td style="text-align:right;">${v.max_discount_vnd == null ? '-' : Number(v.max_discount_vnd).toLocaleString('vi-VN')}</td>
              <td style="text-align:right;">${Number(v.min_order_vnd || 0).toLocaleString('vi-VN')}</td>
              <td style="text-align:right;">${Number(v.used_quantity || 0)} / ${Number(v.total_quantity || 0) || '∞'}</td>
              <td>${v.is_active ? 'Yes' : 'No'}</td>
              <td>${v.ends_at ? new Date(v.ends_at).toLocaleString() : '-'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
    content.querySelector('#btn-refresh-voucher').addEventListener('click', () => loadPage('vouchers'));
    content.querySelector('#btn-new-voucher').addEventListener('click', () => openVoucherModal());
  }

  async function renderStoreRequestsHistory() {
    const statusFilter = String(window.__adminStoreReqStatus || 'all');
    const [res, pendingRes] = await Promise.all([
      api.get('/admin/store-requests/history' + (statusFilter === 'all' ? '' : ('?status=' + encodeURIComponent(statusFilter)))),
      api.get('/admin/store-requests').catch(() => ({ requests: [] })),
    ]);
    const list = res.requests || [];
    const pendingFullMap = new Map((pendingRes.requests || []).map((r) => [r.payment_id, r]));
    const statusLabel = {
      pending: 'pending',
      approved: 'đồng ý',
      rejected: 'hủy',
      cancelled: 'cancelled/expired',
    };
    content.innerHTML = `
      <h1>Lịch sử request mở shop</h1>
      <div class="card" style="padding:16px; margin-bottom:12px;">
        <h2 style="margin:0 0 8px; font-size:18px;">Yêu cầu chờ duyệt (${pendingRes.requests?.length || 0})</h2>
        ${(pendingRes.requests || []).length ? `
          <table class="admin-table">
            <thead><tr><th>User ID</th><th>Email</th><th>Tên shop</th><th>Mã</th><th>Thời điểm user nhấn thanh toán</th><th>Actions</th></tr></thead>
            <tbody>
              ${(pendingRes.requests || []).map((r) => `
                <tr>
                  <td>${esc(r.user?.id || '-')}</td>
                  <td>${esc(r.user?.email || '-')}</td>
                  <td>${esc(r.shop?.shop_name || '-')}</td>
                  <td>${esc(r.payment_code || '-')}</td>
                  <td>${r.user_marked_paid_at ? new Date(r.user_marked_paid_at).toLocaleString() : '-'}</td>
                  <td><button type="button" class="btn btn-secondary btn-sm open-review-request" data-id="${r.payment_id}">Xem đầy đủ</button></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : '<p class="text-secondary" style="margin:0;">Không có yêu cầu pending.</p>'}
      </div>
      <div class="card" style="padding:12px; margin-bottom:12px; display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
        <strong>Lọc trạng thái:</strong>
        <button type="button" class="btn btn-sm ${statusFilter === 'all' ? 'btn-primary' : 'btn-secondary'} req-filter" data-status="all">Tất cả</button>
        <button type="button" class="btn btn-sm ${statusFilter === 'pending' ? 'btn-primary' : 'btn-secondary'} req-filter" data-status="pending">pending</button>
        <button type="button" class="btn btn-sm ${statusFilter === 'approved' ? 'btn-primary' : 'btn-secondary'} req-filter" data-status="approved">đồng ý</button>
        <button type="button" class="btn btn-sm ${statusFilter === 'rejected' ? 'btn-primary' : 'btn-secondary'} req-filter" data-status="rejected">hủy</button>
        <button type="button" class="btn btn-sm ${statusFilter === 'cancelled' ? 'btn-primary' : 'btn-secondary'} req-filter" data-status="cancelled">cancelled</button>
      </div>
      <table class="admin-table">
        <thead><tr><th>User ID</th><th>Email</th><th>Tên shop</th><th>Mã</th><th>Trạng thái</th><th>User nhấn thanh toán</th><th>Admin xử lý</th></tr></thead>
        <tbody>
          ${list.map((r) => `
            <tr>
              <td>${esc(r.user?.id || '-')}</td>
              <td>${esc(r.user?.email || '-')}</td>
              <td>${esc(r.shop?.shop_name || '-')}</td>
              <td>${esc(r.payment_code || '-')}</td>
              <td>${esc(statusLabel[r.request_status] || r.request_status || '-')}</td>
              <td>${r.user_marked_paid_at ? new Date(r.user_marked_paid_at).toLocaleString() : '-'}</td>
              <td>${r.admin_reviewed_at ? new Date(r.admin_reviewed_at).toLocaleString() : '-'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
    content.querySelectorAll('.req-filter').forEach((btn) => {
      btn.addEventListener('click', () => {
        window.__adminStoreReqStatus = btn.dataset.status;
        loadPage('store-requests-history');
      });
    });
    content.querySelectorAll('.open-review-request').forEach((btn) => {
      btn.addEventListener('click', () => {
        const request = pendingFullMap.get(btn.dataset.id);
        if (!request) return alert('Không tìm thấy hồ sơ chi tiết');
        openStoreRequestReviewModal(request, () => loadPage('store-requests-history'));
      });
    });
  }

  function openStoreRequestReviewModal(request, onDone) {
    const shop = request.shop || {};
    const fullAddress = [shop.detail_address, shop.ward, shop.district, shop.province].filter(Boolean).join(', ');
    const termsText = shop.terms_accepted
      ? `Đã đồng ý${shop.terms_accepted_at ? ' lúc ' + new Date(shop.terms_accepted_at).toLocaleString() : ''}`
      : 'Chưa đồng ý';
    modalBox.innerHTML = `
      <h2 style="margin-bottom:14px;">Hồ sơ đăng ký cửa hàng</h2>
      <form>
        <div class="card" style="padding:12px; margin-bottom:10px; background:var(--bg,#f8fafc);">
          <h3 style="font-size:14px; margin:0 0 10px;">Thông tin người đăng ký</h3>
          <div class="form-group" style="margin-bottom:8px;">
            <label class="form-label">User ID</label>
            <input class="form-input" value="${esc(request.user?.id || '-')}" readonly>
          </div>
          <div class="form-group" style="margin-bottom:8px;">
            <label class="form-label">Email</label>
            <input class="form-input" value="${esc(request.user?.email || '-')}" readonly>
          </div>
          <div class="form-group" style="margin-bottom:0;">
            <label class="form-label">Họ tên</label>
            <input class="form-input" value="${esc(request.user?.full_name || '-')}" readonly>
          </div>
        </div>

        <div class="card" style="padding:12px; margin-bottom:10px; background:var(--bg,#f8fafc);">
          <h3 style="font-size:14px; margin:0 0 10px;">Thông tin cửa hàng</h3>
          <div class="form-group" style="margin-bottom:8px;">
            <label class="form-label">Tên shop</label>
            <input class="form-input" value="${esc(shop.shop_name || '')}" readonly>
          </div>
          <div class="form-group" style="margin-bottom:8px;">
            <label class="form-label">Mô tả</label>
            <textarea class="form-textarea" rows="2" readonly>${esc(shop.description || '')}</textarea>
          </div>
          <div class="form-group" style="margin-bottom:8px;">
            <label class="form-label">Người gửi</label>
            <input class="form-input" value="${esc(shop.sender_name || '')}" readonly>
          </div>
          <div class="form-group" style="margin-bottom:8px;">
            <label class="form-label">Số điện thoại</label>
            <input class="form-input" value="${esc(shop.sender_phone || '')}" readonly>
          </div>
          <div class="form-group" style="margin-bottom:8px;">
            <label class="form-label">Địa chỉ lấy hàng</label>
            <textarea class="form-textarea" rows="2" readonly>${esc(fullAddress)}</textarea>
          </div>
          <div class="form-group" style="margin-bottom:0;">
            <label class="form-label">Đơn vị vận chuyển</label>
            <input class="form-input" value="${esc((shop.shipping_providers || []).join(', '))}" readonly>
          </div>
        </div>

        <div class="card" style="padding:12px; margin-bottom:10px; background:var(--bg,#f8fafc);">
          <h3 style="font-size:14px; margin:0 0 10px;">Thông tin ngân hàng & thanh toán</h3>
          <div class="form-group" style="margin-bottom:8px;">
            <label class="form-label">Ngân hàng</label>
            <input class="form-input" value="${esc(shop.bank_name || '')}" readonly>
          </div>
          <div class="form-group" style="margin-bottom:8px;">
            <label class="form-label">Chủ tài khoản</label>
            <input class="form-input" value="${esc(shop.bank_account_name || '')}" readonly>
          </div>
          <div class="form-group" style="margin-bottom:8px;">
            <label class="form-label">Số tài khoản</label>
            <input class="form-input" value="${esc(shop.bank_account_number || '')}" readonly>
          </div>
          <div class="form-group" style="margin-bottom:8px;">
            <label class="form-label">Điều khoản nền tảng</label>
            <input class="form-input" value="${esc(termsText)}" readonly>
          </div>
          <div class="form-group" style="margin-bottom:8px;">
            <label class="form-label">Mã thanh toán</label>
            <input class="form-input" value="${esc(request.payment_code || '')}" readonly>
          </div>
          <div class="form-group" style="margin-bottom:0;">
            <label class="form-label">Thời điểm user nhấn thanh toán</label>
            <input class="form-input" value="${esc(request.user_marked_paid_at ? new Date(request.user_marked_paid_at).toLocaleString() : '-')}" readonly>
          </div>
        </div>
      </form>
      <div class="mt-3" style="display:flex;gap:8px;flex-wrap:wrap;">
        <button type="button" class="btn btn-primary" id="modal-approve-store">Đồng ý</button>
        <button type="button" class="btn btn-danger" id="modal-reject-store">Từ chối</button>
        <button type="button" class="btn btn-secondary" id="modal-close">Đóng</button>
      </div>
    `;
    modalOverlay.classList.remove('hidden');
    modalBox.querySelector('#modal-close')?.addEventListener('click', closeModal);
    modalBox.querySelector('#modal-approve-store')?.addEventListener('click', async () => {
      if (!confirm('Xác nhận ĐỒNG Ý duyệt mở shop cho yêu cầu này?')) return;
      try {
        await api.put('/admin/store-requests/' + request.payment_id + '/approve', {});
        closeModal();
        onDone && onDone();
      } catch (e) {
        alert(e.message || 'Duyệt thất bại');
      }
    });
    modalBox.querySelector('#modal-reject-store')?.addEventListener('click', async () => {
      if (!confirm('Xác nhận TỪ CHỐI yêu cầu mở shop này?')) return;
      try {
        await api.put('/admin/store-requests/' + request.payment_id + '/reject', {});
        closeModal();
        onDone && onDone();
      } catch (e) {
        alert(e.message || 'Từ chối thất bại');
      }
    });
  }

  function buildVoucherFormHtml() {
    return `
      <h2>Create voucher</h2>
      <form id="voucher-form">
        <div class="form-group">
          <label class="form-label">Title</label>
          <input type="text" name="title" class="form-input" required placeholder="Freeship Hà Nội / SALE 10%...">
        </div>
        <div class="form-group">
          <label class="form-label">Code</label>
          <input type="text" name="code" class="form-input" required placeholder="VD: FREESHIP_HN / SALE25">
          <p class="text-secondary" style="font-size:13px;margin-top:6px;">Code sẽ tự upper-case.</p>
        </div>
        <div class="form-group">
          <label class="form-label">Type</label>
          <select name="type" class="form-input form-select">
            <option value="freeship">freeship</option>
            <option value="product_percent">product_percent</option>
          </select>
        </div>
        <div class="form-group" id="voucher-percent-wrap">
          <label class="form-label">Percent (%)</label>
          <input type="number" name="percent" class="form-input" step="1" min="0" max="90" value="10">
        </div>
        <div class="form-group" id="voucher-max-wrap">
          <label class="form-label">Max discount (VND) (optional)</label>
          <input type="number" name="max_discount_vnd" class="form-input" step="1000" placeholder="VD: 50000">
        </div>
        <div class="form-group">
          <label class="form-label">Min order (VND)</label>
          <input type="number" name="min_order_vnd" class="form-input" step="1000" value="0">
        </div>
        <div class="form-group">
          <label class="form-label">Total quantity (0 = unlimited)</label>
          <input type="number" name="total_quantity" class="form-input" value="0">
        </div>
        <div class="form-group">
          <label class="form-label">Ends at (optional)</label>
          <input type="datetime-local" name="ends_at" class="form-input">
        </div>
        <div class="form-group">
          <label style="display:flex; align-items:center; gap:8px;">
            <input type="checkbox" name="is_active" checked>
            <span>Active</span>
          </label>
        </div>
        <button type="submit" class="btn btn-primary">Create</button>
        <button type="button" class="btn btn-secondary" id="modal-close">Cancel</button>
      </form>
    `;
  }

  async function openVoucherModal() {
    modalBox.innerHTML = buildVoucherFormHtml();
    modalOverlay.classList.remove('hidden');
    const form = modalBox.querySelector('#voucher-form');
    const typeSel = form.querySelector('select[name="type"]');
    const percentWrap = modalBox.querySelector('#voucher-percent-wrap');
    const maxWrap = modalBox.querySelector('#voucher-max-wrap');
    function syncType() {
      const t = typeSel.value;
      const show = t === 'product_percent';
      percentWrap.style.display = show ? '' : 'none';
      maxWrap.style.display = show ? '' : 'none';
    }
    typeSel.addEventListener('change', syncType);
    syncType();

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const type = String(fd.get('type') || 'freeship');
      const body = {
        title: fd.get('title'),
        code: fd.get('code'),
        type,
        percent: type === 'product_percent' ? Number(fd.get('percent') || 0) : null,
        max_discount_vnd:
          type === 'product_percent' && fd.get('max_discount_vnd') ? Number(fd.get('max_discount_vnd')) : null,
        min_order_vnd: Number(fd.get('min_order_vnd') || 0),
        total_quantity: Number(fd.get('total_quantity') || 0),
        ends_at: fd.get('ends_at') ? new Date(String(fd.get('ends_at'))).toISOString() : null,
        is_active: !!fd.get('is_active'),
      };
      try {
        await api.post('/vouchers/admin', body);
        closeModal();
        loadPage('vouchers');
      } catch (err) {
        alert(err.message);
      }
    });
    modalBox.querySelector('#modal-close').addEventListener('click', closeModal);
  }

  function closeModal() {
    modalOverlay.classList.add('hidden');
    modalBox.innerHTML = '';
  }
  modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) closeModal(); });

  if (checkAuth()) loadPage('dashboard');
})();
