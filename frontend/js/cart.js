/**
 * Cart - get items, add, update qty, remove
 */
const cart = {
  async getItems() {
    if (!auth.token) return [];
    const res = await api.get('/cart');
    return res.items || [];
  },
  async getCount() {
    const items = await this.getItems();
    return items.reduce((sum, i) => sum + (i.quantity || 0), 0);
  },
  async add(productId, quantity = 1) {
    await api.post('/cart', { product_id: productId, quantity });
  },
  async updateQuantity(cartItemId, quantity) {
    await api.put('/cart/' + cartItemId, { quantity });
  },
  async remove(cartItemId) {
    await api.delete('/cart/' + cartItemId);
  },
};
