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
    const res = await api.get('/admin/dashboard');
    const d = res.dashboard;
    content.innerHTML = `
      <h1>Dashboard</h1>
      <div class="stats-grid">
        <div class="stat-card"><div class="value">${d.completedOrders ?? 0}</div><div class="label">Đơn hoàn thành</div></div>
        <div class="stat-card"><div class="value">${d.cancelledOrders ?? 0}</div><div class="label">Đơn hủy</div></div>
        <div class="stat-card"><div class="value">$${Number(d.totalRevenueEstimated ?? 0).toFixed(2)}</div><div class="label">Doanh thu ước tính (tất cả đơn)</div></div>
        <div class="stat-card"><div class="value">$${Number(d.actualRevenue ?? 0).toFixed(2)}</div><div class="label">Doanh thu thực tế (đơn hoàn thành)</div></div>
        <div class="stat-card"><div class="value">${d.totalOrders}</div><div class="label">Tổng đơn</div></div>
        <div class="stat-card"><div class="value">${d.totalProducts}</div><div class="label">Sản phẩm</div></div>
        <div class="stat-card"><div class="value">${d.totalUsers}</div><div class="label">Users</div></div>
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
    const res = await api.get('/admin/users');
    const list = res.users || [];
    content.innerHTML = `
      <h1>Users</h1>
      <table class="admin-table">
        <thead><tr><th>ID</th><th>Email</th><th>Name</th><th>Role</th><th>Joined</th><th>Actions</th></tr></thead>
        <tbody>
          ${list.map((u) => `
            <tr>
              <td>${u.id}</td>
              <td>${esc(u.email)}</td>
              <td>${esc(u.full_name)}</td>
              <td>${esc(u.role)}</td>
              <td>${new Date(u.created_at).toLocaleDateString()}</td>
              <td>
                <button type="button" class="btn btn-secondary btn-sm edit-user" data-id="${u.id}">Edit</button>
                ${u.role !== 'admin' ? `<button type="button" class="btn btn-danger btn-sm delete-user" data-id="${u.id}">Delete</button>` : ''}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
    content.querySelectorAll('.edit-user').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const row = btn.closest('tr');
        const email = row.cells[1].textContent;
        const name = row.cells[2].textContent;
        const role = row.cells[3].textContent;
        const newName = prompt('Full name', name);
        if (newName === null) return;
        const newRole = prompt('Role (user/admin)', role);
        if (newRole === null) return;
        if (!['user', 'admin'].includes(newRole)) {
          alert('Role must be user or admin');
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
