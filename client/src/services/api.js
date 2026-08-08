const API_URL = (import.meta.env.VITE_API_URL || '') + '/api';

async function parseRes(res) {
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Server returned ${res.status} (${res.headers.get('content-type') || 'unknown'}) instead of JSON. Is the backend restarted?`);
  }
  return data;
}

async function request(path, options = {}) {
  const token = localStorage.getItem('token');
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  const data = await parseRes(res);
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  register: (body) => request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  googleLogin: (credential) => request('/auth/google', { method: 'POST', body: JSON.stringify({ credential }) }),
  getMe: () => request('/auth/me'),
  updateMe: (body) => request('/auth/me', { method: 'PUT', body: JSON.stringify(body) }),

  getRooms: () => request('/rooms'),
  getRoom: (id) => request(`/rooms/${id}`),
  createRoom: (body) => request('/rooms', { method: 'POST', body: JSON.stringify(body) }),
  verifyCode: (code) => request('/rooms/verify', { method: 'POST', body: JSON.stringify({ code }) }),
  joinRoom: (id) => request(`/rooms/${id}/join`, { method: 'POST' }),
  deleteRoom: (id) => request(`/rooms/${id}`, { method: 'DELETE' }),

  getWhiteboards: () => request('/whiteboards'),
  getWhiteboard: (id) => request(`/whiteboards/${id}`),
  createWhiteboard: (body) => request('/whiteboards', { method: 'POST', body: JSON.stringify(body) }),
  updateWhiteboard: (id, body) => request(`/whiteboards/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  saveWhiteboardActions: (id, actions) =>
    request(`/whiteboards/${id}/actions`, { method: 'PUT', body: JSON.stringify({ actions }) }),
  deleteWhiteboard: (id) => request(`/whiteboards/${id}`, { method: 'DELETE' }),
  shareWhiteboard: (id, email) =>
    request(`/whiteboards/${id}/share`, { method: 'POST', body: JSON.stringify({ email }) }),
  unshareWhiteboard: (id, userId) =>
    request(`/whiteboards/${id}/share`, { method: 'DELETE', body: JSON.stringify({ userId }) }),

  getNotebooks: () => request('/notebooks'),
  createNotebook: (name) => request('/notebooks', { method: 'POST', body: JSON.stringify({ name }) }),
  renameNotebook: (id, name) => request(`/notebooks/${id}`, { method: 'PUT', body: JSON.stringify({ name }) }),
  deleteNotebook: (id) => request(`/notebooks/${id}`, { method: 'DELETE' }),

  getRoomFiles: (roomId) => request(`/files/${roomId}`),
  uploadRoomFile: async (roomId, file) => {
    const token = localStorage.getItem('token');
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_URL}/files/${roomId}/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    const data = await parseRes(res);
    if (!res.ok) throw new Error(data.error || 'Upload failed');
    return data;
  },
  deleteRoomFile: (roomId, fileId) => request(`/files/${roomId}/${fileId}`, { method: 'DELETE' }),
  getFileUrl: (roomId, storedName) => `${API_URL}/files/${roomId}/download/${storedName}`,
};
