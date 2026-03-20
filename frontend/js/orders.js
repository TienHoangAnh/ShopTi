/**
 * Orders - list, single, create (checkout)
 */
const orders = {
  async list() {
    const res = await api.get('/orders');
    return res.orders || [];
  },
  async get(id) {
    const res = await api.get('/orders/' + id);
    return res.order;
  },
  async create(receiverName, receiverPhone, shippingAddress, paymentMethod = 'cod', opts = {}) {
    const res = await api.post('/orders', {
      receiver_name: receiverName,
      receiver_phone: receiverPhone,
      shipping_address: shippingAddress,
      payment_method: paymentMethod,
      freeship_code: opts.freeship_code || null,
      product_code: opts.product_code || null,
    });
    return res.order;
  },
  async quote(shippingAddress, opts = {}) {
    const res = await api.post('/orders/quote', {
      shipping_address: shippingAddress,
      freeship_code: opts.freeship_code || null,
      product_code: opts.product_code || null,
    });
    return res.quote;
  },
  /** Hủy đơn (chỉ khi pending/confirmed). Trả hàng về kho. */
  async cancel(id, cancelReason = '') {
    const res = await api.put('/orders/' + id + '/cancel', { cancel_reason: cancelReason });
    return res.order;
  },
};

/** Trạng thái cho phép user hủy đơn */
orders.canCancel = (status) => status === 'pending' || status === 'confirmed';
