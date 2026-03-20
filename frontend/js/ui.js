/**
 * UI helpers - show/hide by auth, nav updates, alerts
 */
const ui = {
  showAuthOnly() {
    document.querySelectorAll('[data-auth-only]').forEach((el) => {
      el.classList.toggle('hidden', !auth.token);
    });
  },
  showGuestOnly() {
    document.querySelectorAll('[data-guest-only]').forEach((el) => {
      el.classList.toggle('hidden', !!auth.token);
    });
  },
  showAdminOnly() {
    document.querySelectorAll('[data-admin-only]').forEach((el) => {
      el.classList.toggle('hidden', !auth.isAdmin());
    });
  },
  updateNav() {
    ui.showAuthOnly();
    ui.showGuestOnly();
    ui.showAdminOnly();
    const cartCount = document.querySelector('[data-cart-count]');
    if (cartCount && typeof cart.getCount === 'function') {
      cart.getCount().then((n) => {
        cartCount.textContent = n;
        cartCount.classList.toggle('hidden', n === 0);
      });
    }
    const userLabel = document.querySelector('[data-user-name]');
    if (userLabel && auth.user) userLabel.textContent = auth.user.full_name || auth.user.email;
  },
  alert(message, type = 'info') {
    const el = document.createElement('div');
    el.setAttribute('role', 'alert');
    el.className = `alert alert-${type}`;
    el.textContent = message;
    el.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);padding:12px 24px;border-radius:8px;z-index:9999;font-weight:500;box-shadow:0 4px 12px rgba(0,0,0,0.15);';
    if (type === 'error') {
      el.style.background = '#FEE2E2';
      el.style.color = '#991B1B';
    } else if (type === 'success') {
      el.style.background = '#D1FAE5';
      el.style.color = '#065F46';
    } else {
      el.style.background = '#DBEAFE';
      el.style.color = '#1E40AF';
    }
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 5000);
  },
  /**
   * Hộp thoại xác nhận (Promise). resolve(true) nếu bấm OK, false nếu Hủy/đóng.
   */
  confirm(message, options = {}) {
    const okText = options.okText || 'Xóa';
    const cancelText = options.cancelText || 'Hủy';
    const danger = options.danger !== false;
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');
      overlay.className = 'ui-confirm-overlay';
      overlay.style.cssText =
        'position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:10000;display:flex;align-items:center;justify-content:center;padding:16px;';

      const box = document.createElement('div');
      box.style.cssText =
        'background:var(--card-bg,#fff);color:var(--text-primary,#111);max-width:420px;width:100%;border-radius:12px;padding:24px;box-shadow:0 8px 32px rgba(0,0,0,0.2);border:1px solid var(--border,#e5e7eb);';

      const p = document.createElement('p');
      p.style.cssText = 'margin:0 0 20px;font-size:15px;line-height:1.55;';
      p.textContent = message;

      const actions = document.createElement('div');
      actions.style.cssText = 'display:flex;gap:12px;justify-content:flex-end;flex-wrap:wrap;';

      const btnCancel = document.createElement('button');
      btnCancel.type = 'button';
      btnCancel.className = 'btn btn-secondary';
      btnCancel.textContent = cancelText;

      const btnOk = document.createElement('button');
      btnOk.type = 'button';
      btnOk.className = danger ? 'btn btn-danger' : 'btn btn-primary';
      btnOk.textContent = okText;

      function cleanup(result) {
        document.removeEventListener('keydown', onKey);
        overlay.remove();
        resolve(result);
      }

      function onKey(e) {
        if (e.key === 'Escape') {
          e.preventDefault();
          cleanup(false);
        }
      }

      btnCancel.addEventListener('click', () => cleanup(false));
      btnOk.addEventListener('click', () => cleanup(true));
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) cleanup(false);
      });

      actions.appendChild(btnCancel);
      actions.appendChild(btnOk);
      box.appendChild(p);
      box.appendChild(actions);
      overlay.appendChild(box);
      document.body.appendChild(overlay);
      document.addEventListener('keydown', onKey);
      btnCancel.focus();
    });
  },
  toggleMobileNav() {
    const nav = document.querySelector('.nav');
    const btn = document.getElementById('menuToggle');
    if (nav) nav.classList.toggle('open');
    if (btn) btn.setAttribute('aria-expanded', nav?.classList.contains('open') ? 'true' : 'false');
  },
};
