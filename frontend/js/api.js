/**
 * API client - base URL and fetch helpers
 */
const API_BASE = window.location.origin + '/api';

function getToken() {
  return localStorage.getItem('token');
}

function request(path, options = {}) {
  const p = path.startsWith('/') ? path : '/' + path;
  const url = p.startsWith('http') ? p : API_BASE + p;
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  const token = getToken();
  if (token) headers['Authorization'] = 'Bearer ' + token;
  return fetch(url, { ...options, headers }).then(async (res) => {
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.message || res.statusText);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  });
}

const api = {
  get: (path) => request(path, { method: 'GET' }),
  post: (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) }),
  put: (path, body) => request(path, { method: 'PUT', body: JSON.stringify(body || {}) }),
  delete: (path) => request(path, { method: 'DELETE' }),
};
