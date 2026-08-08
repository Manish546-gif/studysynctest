import { enqueueOp } from './syncQueue';
import { isNetworkError, refreshQueueCount } from './sync';

export { isNetworkError };

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

const NEVER_QUEUE = ['/auth/register', '/auth/login', '/auth/google', '/rooms/verify'];
const canQueue = (path) => !NEVER_QUEUE.some((p) => path.startsWith(p));

const genId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? `q_${crypto.randomUUID()}`
    : `q_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

const genCode = () => Math.random().toString(36).slice(2, 8).toUpperCase();

function pendingResponse(path, method, body) {
  const now = new Date().toISOString();
  if (method === 'POST' && path === '/rooms') {
    return {
      room: {
        _id: genId(),
        code: genCode(),
        name: body?.name,
        description: body?.description,
        members: [],
        updatedAt: now,
        pending: true,
      },
    };
  }
  if (method === 'POST' && path === '/whiteboards') {
    return {
      whiteboard: {
        _id: genId(),
        title: body?.title,
        description: body?.description,
        notebook: body?.notebook || null,
        actions: [],
        updatedAt: now,
        pending: true,
      },
    };
  }
  if (method === 'POST' && path === '/notebooks') {
    return { notebook: { _id: genId(), name: body?.name, pending: true } };
  }
  if (method === 'PUT' && /^\/whiteboards\/[^/]+$/.test(path)) {
    return { whiteboard: { _id: path.split('/')[2], ...(body || {}), pending: true } };
  }
  if (method === 'PUT' && path === '/auth/me') {
    return { user: { ...(body || {}), pending: true } };
  }
  return {};
}

function queueWrite(path, method, body) {
  const op = { id: genId(), method, path, dedupeKey: `${method} ${path}` };
  if (body !== undefined) op.body = body;
  enqueueOp(op)
    .then(refreshQueueCount)
    .catch(() => {});
  return pendingResponse(path, method, body);
}

async function request(path, options = {}) {
  const token = localStorage.getItem('token');
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers.Authorization = `Bearer ${token}`;
  const method = (options.method || 'GET').toUpperCase();

  if (method !== 'GET' && canQueue(path) && typeof navigator !== 'undefined' && navigator.onLine === false) {
    return queueWrite(path, method, options.body ? JSON.parse(options.body) : undefined);
  }

  try {
    const res = await fetch(`${API_URL}${path}`, { ...options, headers });
    const data = await parseRes(res);
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  } catch (err) {
    if (isNetworkError(err) && method !== 'GET' && canQueue(path)) {
      return queueWrite(path, method, options.body ? JSON.parse(options.body) : undefined);
    }
    throw err;
  }
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
    const path = `/files/${roomId}/upload`;

    const queueFile = () => {
      const id = genId();
      enqueueOp({ id, method: 'POST', path, file })
        .then(refreshQueueCount)
        .catch(() => {});
      return { file: { _id: id, name: file.name, size: file.size, pending: true } };
    };

    if (canQueue(path) && typeof navigator !== 'undefined' && navigator.onLine === false) {
      return queueFile();
    }

    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch(`${API_URL}/files/${roomId}/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await parseRes(res);
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      return data;
    } catch (err) {
      if (isNetworkError(err) && canQueue(path)) return queueFile();
      throw err;
    }
  },
  deleteRoomFile: (roomId, fileId) => request(`/files/${roomId}/${fileId}`, { method: 'DELETE' }),
  getFileUrl: (roomId, storedName) => `${API_URL}/files/${roomId}/download/${storedName}`,
};
