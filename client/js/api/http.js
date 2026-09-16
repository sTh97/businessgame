window.BES = window.BES || {};

const http = {
  accessToken: sessionStorage.getItem('bes_access') || null,

  setToken(token) {
    this.accessToken = token;
    if (token) sessionStorage.setItem('bes_access', token);
    else sessionStorage.removeItem('bes_access');
  },

  async request(path, { method = 'GET', body, retry = true } = {}) {
    const headers = { Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (this.accessToken) headers.Authorization = `Bearer ${this.accessToken}`;
    const csrf = document.cookie.split('; ').find((c) => c.startsWith('csrfToken='));
    if (csrf) headers['x-csrf-token'] = decodeURIComponent(csrf.split('=')[1]);

    const res = await fetch(path, {
      method,
      headers,
      credentials: 'include',
      body: body !== undefined ? JSON.stringify(body) : undefined
    });

    if (res.status === 401 && retry && !path.startsWith('/api/auth/login')) {
      const refreshed = await this.refresh();
      if (refreshed) return this.request(path, { method, body, retry: false });
    }

    const json = await res.json().catch(() => ({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Bad response' } }));
    if (!res.ok || json.success === false) {
      const err = new Error(json.error?.message || 'Request failed');
      err.code = json.error?.code || 'INTERNAL_ERROR';
      err.status = res.status;
      err.payload = json.error;
      throw err;
    }
    return json.data;
  },

  async refresh() {
    try {
      const res = await fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' });
      const json = await res.json();
      if (!res.ok || !json.success) {
        this.setToken(null);
        return false;
      }
      this.setToken(json.data.accessToken);
      return true;
    } catch {
      this.setToken(null);
      return false;
    }
  }
};

BES.api = {
  register: (email, password) => http.request('/api/auth/register', { method: 'POST', body: { email, password } }),
  login: async (email, password) => {
    const data = await http.request('/api/auth/login', { method: 'POST', body: { email, password }, retry: false });
    http.setToken(data.accessToken);
    return data;
  },
  logout: async () => {
    await http.request('/api/auth/logout', { method: 'POST' });
    http.setToken(null);
  },
  me: () => http.request('/api/auth/me'),
  forgot: (email) => http.request('/api/auth/forgot-password', { method: 'POST', body: { email } }),
  reset: (token, newPassword) => http.request('/api/auth/reset-password', { method: 'POST', body: { token, newPassword } }),
  games: (status) => http.request(`/api/games${status ? `?status=${encodeURIComponent(status)}` : ''}`),
  industries: () => http.request('/api/games/industries'),
  preview: (industry, difficulty) =>
    http.request(`/api/games/preview?industry=${encodeURIComponent(industry)}&difficulty=${encodeURIComponent(difficulty)}`),
  createGame: (body) => http.request('/api/games', { method: 'POST', body }),
  dashboard: (id) => http.request(`/api/games/${id}/dashboard`),
  currentEvent: (id) => http.request(`/api/games/${id}/current-event`),
  decide: (id, body) => http.request(`/api/games/${id}/decisions`, { method: 'POST', body }),
  history: (id, page = 1) => http.request(`/api/games/${id}/history?page=${page}&limit=20`),
  financials: (id) => http.request(`/api/games/${id}/financials?limit=24`),
  projects: (id) => http.request(`/api/games/${id}/projects`),
  employees: (id) => http.request(`/api/games/${id}/employees`),
  achievements: (id) => http.request(`/api/games/${id}/achievements`),
  market: (id) => http.request(`/api/games/${id}/market`),
  restart: (id) => http.request(`/api/games/${id}/restart`, { method: 'POST' }),
  report: (id) => http.request(`/api/games/${id}/report`)
};

BES.http = http;
