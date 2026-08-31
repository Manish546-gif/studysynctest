/* eslint-disable react/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { api, isNetworkError } from '../services/api';

const AuthContext = createContext(null);

function cacheUser(user) {
  if (user) localStorage.setItem('cachedUser', JSON.stringify(user));
}

function readCachedUser() {
  try {
    return JSON.parse(localStorage.getItem('cachedUser') || 'null');
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const userRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { setLoading(false); return; }
    api.getMe()
      .then((data) => { cacheUser(data.user); userRef.current = data.user; setUser(data.user); })
      .catch((err) => {
        if (isNetworkError(err)) {
          const cached = readCachedUser();
          if (cached) { userRef.current = cached; setUser(cached); }
          else localStorage.removeItem('token');
        } else {
          localStorage.removeItem('token');
          localStorage.removeItem('cachedUser');
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await api.login({ email, password });
    localStorage.setItem('token', data.token);
    cacheUser(data.user);
    userRef.current = data.user;
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (name, username, email, password) => {
    const data = await api.register({ name, username, email, password });
    localStorage.setItem('token', data.token);
    cacheUser(data.user);
    userRef.current = data.user;
    setUser(data.user);
    return data.user;
  }, []);

  const googleLogin = useCallback(async (credential) => {
    const data = await api.googleLogin(credential);
    localStorage.setItem('token', data.token);
    cacheUser(data.user);
    userRef.current = data.user;
    setUser(data.user);
    return data.user;
  }, []);

  const googleExchange = useCallback(async (code, redirectUri) => {
    const data = await api.googleExchange(code, redirectUri);
    localStorage.setItem('token', data.token);
    cacheUser(data.user);
    userRef.current = data.user;
    setUser(data.user);
    return data.user;
  }, []);

  const updateUser = useCallback(async (body) => {
    if (body && body._id) {
      cacheUser(body);
      userRef.current = body;
      setUser(body);
      return body;
    }
    const data = await api.updateMe(body);
    const incoming = data.user || {};
    const merged = incoming && incoming._id
      ? incoming
      : { ...(userRef.current || {}), ...incoming };
    cacheUser(merged);
    userRef.current = merged;
    setUser(merged);
    return merged;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('cachedUser');
    userRef.current = null;
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, googleLogin, googleExchange, updateUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
