import { enqueueOp } from './syncQueue';
import { isNetworkError, refreshQueueCount } from './sync';

export { isNetworkError };

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000') + '/api';

const API_ORIGIN = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');

export const getAssetUrl = (url) => {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith('/')) return `${API_ORIGIN}${url}`;
  return `${API_ORIGIN}/${url}`;
};

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

const NEVER_QUEUE = ['/auth', '/files', '/rooms', '/giphy', '/livekit', '/stats', '/notifications'];
const canQueue = (path) => !NEVER_QUEUE.some((p) => path.startsWith(p));

const genId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? `q_${crypto.randomUUID()}`
    : `q_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

function pendingResponse(path, method, body) {
  const now = new Date().toISOString();
  if (method === 'POST' && path === '/rooms') {
    return {
      room: {
        _id: genId(),
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
  googleExchange: (code, redirectUri) => request('/auth/google/exchange', { method: 'POST', body: JSON.stringify({ code, redirectUri }) }),
  getMe: () => request('/auth/me'),
  updateMe: (body) => request('/auth/me', { method: 'PUT', body: JSON.stringify(body) }),
  uploadAvatar: async (file) => {
    const token = localStorage.getItem('token');
    const fd = new FormData();
    fd.append('avatar', file);
    const res = await fetch(`${API_URL}/auth/avatar`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Upload failed');
    }
    return res.json();
  },

  getRooms: () => request('/rooms'),
  getRoom: (id) => request(`/rooms/${id}`),
  createRoom: (body) => request('/rooms', { method: 'POST', body: JSON.stringify(body) }),
  inviteUser: (roomId, username) => request(`/rooms/${roomId}/invite`, { method: 'POST', body: JSON.stringify({ username }) }),
  searchUsers: (q) => request(`/users/search?q=${encodeURIComponent(q)}`),
  searchGifs: (q, limit = 24) => request(`/giphy/search?q=${encodeURIComponent(q)}&limit=${limit}`),
  joinRoom: (id) => request(`/rooms/${id}/join`, { method: 'POST' }),
  updateRoom: (id, body) => request(`/rooms/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteRoom: (id) => request(`/rooms/${id}`, { method: 'DELETE' }),

  // Room Files API
  uploadRoomFile: async (roomId, file) => {
    const token = localStorage.getItem('token');
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch(`${API_URL}/files/${roomId}/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'File upload failed');
    }
    return res.json();
  },
  getRoomFiles: (roomId) => request(`/files/${roomId}`),
  deleteRoomFile: (roomId, fileId) => request(`/files/${roomId}/${fileId}`, { method: 'DELETE' }),
  getFileUrl: (roomId, storedName) => `${API_URL}/files/${roomId}/download/${storedName}`,

  getWhiteboards: () => request('/whiteboards'),
  getWhiteboard: (id) => request(`/whiteboards/${id}`),
  createWhiteboard: (body) => request('/whiteboards', { method: 'POST', body: JSON.stringify(body) }),
  updateWhiteboard: (id, body) => request(`/whiteboards/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  saveWhiteboardActions: (id, actions) =>
    request(`/whiteboards/${id}/actions`, { method: 'PUT', body: JSON.stringify({ actions }) }),
  deleteWhiteboard: (id) => request(`/whiteboards/${id}`, { method: 'DELETE' }),
  shareWhiteboard: (id, email, role = 'editor') =>
    request(`/whiteboards/${id}/share`, { method: 'POST', body: JSON.stringify({ email, role }) }),
  setShareRole: (id, userId, role) =>
    request(`/whiteboards/${id}/share/${userId}`, { method: 'PUT', body: JSON.stringify({ role }) }),
  setLinkAccess: (id, access) =>
    request(`/whiteboards/${id}/link`, { method: 'POST', body: JSON.stringify({ access }) }),
  unshareWhiteboard: (id, userId) =>
    request(`/whiteboards/${id}/share`, { method: 'DELETE', body: JSON.stringify({ userId }) }),
  addWhiteboardComment: (id, body) =>
    request(`/whiteboards/${id}/comments`, { method: 'POST', body: JSON.stringify(body) }),
  deleteWhiteboardComment: (id, commentId) =>
    request(`/whiteboards/${id}/comments/${commentId}`, { method: 'DELETE' }),

  getNotebooks: () => request('/notebooks'),
  createNotebook: (name) => request('/notebooks', { method: 'POST', body: JSON.stringify({ name }) }),
  renameNotebook: (id, name) => request(`/notebooks/${id}`, { method: 'PUT', body: JSON.stringify({ name }) }),
  deleteNotebook: (id) => request(`/notebooks/${id}`, { method: 'DELETE' }),

  getNotifications: (skip = 0, limit = 30) => request(`/notifications?skip=${skip}&limit=${limit}`),
  markNotificationRead: (id) => request(`/notifications/${id}/read`, { method: 'PUT' }),
  markAllNotificationsRead: () => request('/notifications/read-all', { method: 'PUT' }),
  deleteNotification: (id) => request(`/notifications/${id}`, { method: 'DELETE' }),

  // Flashcards
  getFlashcards: (params) => {
    const q = new URLSearchParams(params).toString()
    return request(`/flashcards?${q}`)
  },
  getDueFlashcards: (params) => {
    const q = new URLSearchParams(params || {}).toString()
    return request(`/flashcards/due?${q}`)
  },
  createFlashcard: (body) => request('/flashcards', { method: 'POST', body: JSON.stringify(body) }),
  createFlashcardsBatch: (cards, notebook) =>
    request('/flashcards/batch', { method: 'POST', body: JSON.stringify({ cards, notebook }) }),
  updateFlashcard: (id, body) => request(`/flashcards/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteFlashcard: (id) => request(`/flashcards/${id}`, { method: 'DELETE' }),
  reviewFlashcard: (id, quality) =>
    request(`/flashcards/${id}/review`, { method: 'POST', body: JSON.stringify({ quality }) }),
  getFlashcardStats: () => request('/flashcards/stats'),

  // LiveKit
  getLivekitToken: (roomId) => request('/livekit/token', { method: 'POST', body: JSON.stringify({ roomId }) }),

  // Stats & Public rooms
  getStats: () => request('/stats'),
  recordStudySession: (body) => request('/stats/sessions', { method: 'POST', body: JSON.stringify(body) }),
  getPublicRooms: (params) => {
    const q = new URLSearchParams(params).toString()
    return request(`/stats/public-rooms?${q}`)
  },

  // Room Theme
  setRoomTheme: (roomId, accentColor) => request(`/rooms/${roomId}/theme`, { method: 'PUT', body: JSON.stringify({ accentColor }) }),

  // Friends
  getFriends: () => request('/friends'),
  searchFriends: (q) => request(`/friends/search?q=${encodeURIComponent(q)}`),
  sendFriendRequest: (userId) => request(`/friends/request/${userId}`, { method: 'POST' }),
  acceptFriendRequest: (userId) => request(`/friends/accept/${userId}`, { method: 'POST' }),
  declineFriendRequest: (userId) => request(`/friends/decline/${userId}`, { method: 'POST' }),
  unfriend: (userId) => request(`/friends/${userId}`, { method: 'DELETE' }),

  // Scheduled Sessions
  getSessions: () => request('/sessions'),
  getUpcomingSessions: () => request('/sessions/upcoming'),
  createSession: (body) => request('/sessions', { method: 'POST', body: JSON.stringify(body) }),
  updateSession: (id, body) => request(`/sessions/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteSession: (id) => request(`/sessions/${id}`, { method: 'DELETE' }),

  // Music API
  searchMusic: (q, limit = 25) => request(`/music/search?q=${encodeURIComponent(q)}&limit=${limit}`),
  getTrendingMusic: (category = 'lofi') => request(`/music/trending?category=${encodeURIComponent(category)}`),

  // Custom Playlists
  getPlaylists: () => request('/playlists'),
  createPlaylist: (body) => request('/playlists', { method: 'POST', body: JSON.stringify(body) }),
  getPlaylist: (id) => request(`/playlists/${id}`),
  updatePlaylist: (id, body) => request(`/playlists/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  addTrackToPlaylist: (id, track) => request(`/playlists/${id}/tracks`, { method: 'POST', body: JSON.stringify({ track }) }),
  removeTrackFromPlaylist: (id, trackId) => request(`/playlists/${id}/tracks/${trackId}`, { method: 'DELETE' }),
  deletePlaylist: (id) => request(`/playlists/${id}`, { method: 'DELETE' }),
};

export default api;
