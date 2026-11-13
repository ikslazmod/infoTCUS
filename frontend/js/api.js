const API = {
  async request(path, options = {}) {
    const res = await fetch(path, {
      headers: { 'Content-Type': 'application/json' },
      ...options
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || `Błąd serwera (${res.status})`);
    }
    return data;
  },

  events() {
    return this.request('/api/events');
  },

  event(id) {
    return this.request(`/api/events/${encodeURIComponent(id)}`);
  },

  register(eventId, form) {
    return this.request(`/api/registrations/${encodeURIComponent(eventId)}/register`, {
      method: 'POST',
      body: JSON.stringify(form)
    });
  },

  lookup(email) {
    return this.request(`/api/registrations/lookup?email=${encodeURIComponent(email)}`);
  },

  cancel(registrationId) {
    return this.request(`/api/registrations/${encodeURIComponent(registrationId)}/cancel`, {
      method: 'POST'
    });
  }
};
