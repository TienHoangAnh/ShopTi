/**
 * Products - list, single, filters
 */
const products = {
  async list(params = {}) {
    const q = new URLSearchParams(params).toString();
    const res = await api.get('/products' + (q ? '?' + q : ''));
    return res;
  },
  async recommend(params = {}) {
    const q = new URLSearchParams({ ...params, recommend: '1' }).toString();
    const res = await api.get('/products' + (q ? '?' + q : ''));
    return res.recommendations || { same_category: [], same_name: [], same_brand: [] };
  },
  async get(id) {
    const res = await api.get('/products/' + id);
    return res.product;
  },
  async getFilters() {
    const res = await api.get('/products/filters');
    return res.filters || { categories: [], brands: [], sizes: [], colors: [] };
  },
};
