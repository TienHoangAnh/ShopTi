const configHandler = require('./config');
const authRegisterHandler = require('./auth/register');
const authLoginHandler = require('./auth/login');
const authMeHandler = require('./auth/me');
const authProfileHandler = require('./auth/profile');
const categoriesHandler = require('./categories/index');
const productsHandler = require('./products/index');
const productFiltersHandler = require('./products/filters');
const productByIdHandler = require('./products/[id]');
const cartHandler = require('./cart/index');
const cartByIdHandler = require('./cart/[id]');
const ordersHandler = require('./orders/index');
const orderByIdHandler = require('./orders/[id]');
const orderCancelHandler = require('./orders/[id]/cancel');
const storeMeHandler = require('./store/me');
const storeApplyHandler = require('./store/apply');
const storeRegisterHandler = require('./store/register');
const storePaymentByCodeHandler = require('./store/payment/[payment_code]');
const storePaymentVerifyTransferHandler = require('./store/payment/verify-transfer');
const storePaymentSimulateSuccessHandler = require('./store/payment/simulate-success');
const adminDashboardHandler = require('./admin/dashboard');
const adminCategoriesHandler = require('./admin/categories');
const adminProductsHandler = require('./admin/products/index');
const adminProductByIdHandler = require('./admin/products/[id]');
const adminOrdersHandler = require('./admin/orders/index');
const adminOrderByIdHandler = require('./admin/orders/[id]');
const adminUsersHandler = require('./admin/users/index');
const adminUserByIdHandler = require('./admin/users/[id]');
const adminStoreRequestsHandler = require('./admin/store-requests/index');
const adminStoreRequestApproveHandler = require('./admin/store-requests/[id]/approve');

function normalizePath(input) {
  const raw = String(input || '').trim();
  if (!raw) return '/';
  const prefixed = raw.startsWith('/') ? raw : `/${raw}`;
  if (prefixed.length > 1 && prefixed.endsWith('/')) return prefixed.slice(0, -1);
  return prefixed;
}

function getApiPath(req) {
  const fromRewrite = req.query && req.query.__path;
  if (fromRewrite) return normalizePath(Array.isArray(fromRewrite) ? fromRewrite[0] : fromRewrite);

  const fromUrl = String(req.url || '');
  const qIndex = fromUrl.indexOf('?');
  const noQuery = qIndex >= 0 ? fromUrl.slice(0, qIndex) : fromUrl;
  if (noQuery.startsWith('/api/')) return normalizePath(noQuery.slice('/api'.length));
  if (noQuery === '/api') return '/';
  return normalizePath(noQuery);
}

function addRouteParam(req, key, value) {
  req.query = { ...(req.query || {}), [key]: value };
}

function notFound(res) {
  res.setHeader('Content-Type', 'application/json');
  return res.status(404).json({ success: false, message: 'Route not found' });
}

module.exports = async (req, res) => {
  const method = String(req.method || 'GET').toUpperCase();
  const path = getApiPath(req);

  if (path === '/config' && method === 'GET') return configHandler(req, res);

  if (path === '/auth/register' && method === 'POST') return authRegisterHandler(req, res);
  if (path === '/auth/login' && method === 'POST') return authLoginHandler(req, res);
  if (path === '/auth/me' && method === 'GET') return authMeHandler(req, res);
  if (path === '/auth/profile' && method === 'PUT') return authProfileHandler(req, res);

  if (path === '/categories' && method === 'GET') return categoriesHandler(req, res);

  if (path === '/products' && method === 'GET') return productsHandler(req, res);
  if (path === '/products/filters' && method === 'GET') return productFiltersHandler(req, res);
  {
    const m = path.match(/^\/products\/([^/]+)$/);
    if (m && method === 'GET') {
      addRouteParam(req, 'id', m[1]);
      return productByIdHandler(req, res);
    }
  }

  if (path === '/cart' && (method === 'GET' || method === 'POST')) return cartHandler(req, res);
  {
    const m = path.match(/^\/cart\/([^/]+)$/);
    if (m && (method === 'PUT' || method === 'DELETE')) {
      addRouteParam(req, 'id', m[1]);
      return cartByIdHandler(req, res);
    }
  }

  if (path === '/orders' && (method === 'GET' || method === 'POST')) return ordersHandler(req, res);
  {
    const cancelMatch = path.match(/^\/orders\/([^/]+)\/cancel$/);
    if (cancelMatch && method === 'PUT') {
      addRouteParam(req, 'id', cancelMatch[1]);
      return orderCancelHandler(req, res);
    }
  }
  {
    const m = path.match(/^\/orders\/([^/]+)$/);
    if (m && method === 'GET') {
      addRouteParam(req, 'id', m[1]);
      return orderByIdHandler(req, res);
    }
  }

  if (path === '/store/me' && method === 'GET') return storeMeHandler(req, res);
  if (path === '/store/apply' && method === 'POST') return storeApplyHandler(req, res);
  if (path === '/store/register' && method === 'POST') return storeRegisterHandler(req, res);
  if (path === '/store/payment/verify-transfer' && method === 'POST') return storePaymentVerifyTransferHandler(req, res);
  if (path === '/store/payment/simulate-success' && method === 'POST') return storePaymentSimulateSuccessHandler(req, res);
  {
    const m = path.match(/^\/store\/payment\/([^/]+)$/);
    if (m && method === 'GET') {
      addRouteParam(req, 'payment_code', m[1]);
      return storePaymentByCodeHandler(req, res);
    }
  }

  if (path === '/admin/dashboard' && method === 'GET') return adminDashboardHandler(req, res);
  if (path === '/admin/categories' && method === 'GET') return adminCategoriesHandler(req, res);

  if (path === '/admin/products' && (method === 'GET' || method === 'POST')) return adminProductsHandler(req, res);
  {
    const m = path.match(/^\/admin\/products\/([^/]+)$/);
    if (m && (method === 'GET' || method === 'PUT' || method === 'DELETE')) {
      addRouteParam(req, 'id', m[1]);
      return adminProductByIdHandler(req, res);
    }
  }

  if (path === '/admin/orders' && method === 'GET') return adminOrdersHandler(req, res);
  {
    const m = path.match(/^\/admin\/orders\/([^/]+)$/);
    if (m && (method === 'GET' || method === 'PUT')) {
      addRouteParam(req, 'id', m[1]);
      return adminOrderByIdHandler(req, res);
    }
  }

  if (path === '/admin/users' && method === 'GET') return adminUsersHandler(req, res);
  {
    const m = path.match(/^\/admin\/users\/([^/]+)$/);
    if (m && (method === 'GET' || method === 'PUT' || method === 'DELETE')) {
      addRouteParam(req, 'id', m[1]);
      return adminUserByIdHandler(req, res);
    }
  }

  if (path === '/admin/store-requests' && method === 'GET') return adminStoreRequestsHandler(req, res);
  {
    const m = path.match(/^\/admin\/store-requests\/([^/]+)\/approve$/);
    if (m && method === 'PUT') {
      addRouteParam(req, 'id', m[1]);
      return adminStoreRequestApproveHandler(req, res);
    }
  }

  return notFound(res);
};
