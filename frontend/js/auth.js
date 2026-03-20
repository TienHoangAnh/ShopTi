/**
 * Auth - login, register, current user
 */
const auth = {
  get user() {
    try {
      return JSON.parse(localStorage.getItem('user') || 'null');
    } catch {
      return null;
    }
  },
  set user(u) {
    if (u) localStorage.setItem('user', JSON.stringify(u));
    else localStorage.removeItem('user');
  },
  get token() {
    return localStorage.getItem('token');
  },
  set token(t) {
    if (t) localStorage.setItem('token', t);
    else localStorage.removeItem('token');
  },
  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },
  isAdmin() {
    return (this.user && this.user.role === 'admin') || false;
  },
  async register(email, password, full_name) {
    const res = await api.post('/auth/register', { email, password, full_name });
    auth.token = res.token;
    auth.user = res.user;
    return res;
  },
  async login(email, password) {
    const res = await api.post('/auth/login', { email, password });
    auth.token = res.token;
    auth.user = res.user;
    return res;
  },
  async me() {
    const res = await api.get('/auth/me');
    auth.user = res.user;
    return res.user;
  },
};
