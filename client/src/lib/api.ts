const API_BASE = import.meta.env.VITE_API_URL || '';

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  const json = await res.json();

  if (!res.ok || json.success === false) {
    const msg = json?.error?.message || 'Request failed';
    throw new Error(msg);
  }
  return json.data as T;
}

export const api = {
  login: (email: string, password: string) =>
    request<{ accessToken: string; user: any }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  refresh: () =>
    request<{ accessToken: string }>('/api/auth/refresh', { method: 'POST' }),

  logout: () => request('/api/auth/logout', { method: 'POST' }),

  me: () => request<any>('/api/auth/me'),

  getDashboard: () => request<any>('/api/dashboard'),

  getProjects: () => request<any[]>('/api/projects'),

  getProject: (id: string) => request<any>(`/api/projects/${id}`),

  createProject: (data: { title: string; description?: string; clientId: string }) =>
    request('/api/projects', { method: 'POST', body: JSON.stringify(data) }),

  getClients: () => request<any[]>('/api/projects/meta/clients'),

  getTasks: (params?: Record<string, string>) => {
    const q = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<any[]>(`/api/tasks${q}`);
  },

  getTask: (id: string) => request<any>(`/api/tasks/${id}`),

  createTask: (data: any) =>
    request('/api/tasks', { method: 'POST', body: JSON.stringify(data) }),

  updateTaskStatus: (id: string, status: string) =>
    request(`/api/tasks/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  updateTask: (id: string, data: any) =>
    request(`/api/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  getActivity: (limit = 20) => request<any[]>(`/api/activity?limit=${limit}`),

  getNotifications: () =>
    request<{ notifications: any[]; unreadCount: number }>('/api/notifications'),

  markNotificationRead: (id: string) =>
    request(`/api/notifications/${id}/read`, { method: 'PATCH' }),

  markAllNotificationsRead: () =>
    request('/api/notifications/read-all', { method: 'POST' }),
};
