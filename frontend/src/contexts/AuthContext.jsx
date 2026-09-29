import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { getApiBase, safeJson, safeStorageGet } from '../utils/api';

const AuthContext = createContext(null);

const DEFAULT_GOOGLE_CLIENT_ID = '28860016867-m9ejbahc5ohf8q9jeulrfsd97c6u0hb8.apps.googleusercontent.com';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    return safeStorageGet('phantom_user', null);
  });

  const [googleClientId, setGoogleClientId] = useState(DEFAULT_GOOGLE_CLIENT_ID);
  const tokenClientRef = useRef(null);

  // Fetch Google Client ID from backend on mount safely
  useEffect(() => {
    const fetchClientId = async () => {
      try {
        const apiBase = getApiBase();
        const res = await fetch(`${apiBase}/api/auth/google/client-id`);
        const data = await safeJson(res);
        if (data && data.client_id) {
          setGoogleClientId(data.client_id);
        }
      } catch (e) {
        // Silently use default client ID
      }
    };
    fetchClientId();
  }, []);

  const login = (identifier, password) => {
    const cleanId = (identifier || '').trim().toLowerCase();
    
    // 1. Check default admin credentials
    if ((cleanId === 'admin' || cleanId === 'admin@phantom.sec') && password === 'phantom2026') {
      const authUser = {
        username: 'admin',
        email: 'admin@phantom.sec',
        role: 'Lead Security Architect',
        provider: 'credentials',
        token: 'token-admin-2026'
      };
      setUser(authUser);
      try {
        localStorage.setItem('phantom_user', JSON.stringify(authUser));
      } catch (e) {}
      return { success: true };
    }

    // 2. Check locally registered users
    try {
      const registered = safeStorageGet('phantom_users_db', []);
      const found = Array.isArray(registered) ? registered.find(
        (u) => (u.username?.toLowerCase() === cleanId || u.email?.toLowerCase() === cleanId) && u.password === password
      ) : null;

      if (found) {
        const authUser = {
          username: found.username,
          email: found.email,
          role: found.role || 'SOC Threat Hunter',
          provider: 'credentials',
          token: `token-${found.username}-${Date.now()}`
        };
        setUser(authUser);
        try {
          localStorage.setItem('phantom_user', JSON.stringify(authUser));
        } catch (e) {}
        return { success: true };
      }
    } catch (e) {
      console.error('Error checking local user db:', e);
    }

    return {
      success: false,
      error: 'Invalid credentials. Use default (admin / phantom2026) or create a new account.'
    };
  };

  // Authenticate using Google ID Token (Credential)
  const loginWithGoogleCredential = async (credential) => {
    try {
      const apiBase = getApiBase();
      const res = await fetch(`${apiBase}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential })
      });
      const data = await safeJson(res);
      if (res.ok && data && data.success && data.user) {
        setUser(data.user);
        try {
          localStorage.setItem('phantom_user', JSON.stringify(data.user));
        } catch (e) {}
        return { success: true, user: data.user };
      }
      return { success: false, error: (data && data.detail) || 'Google authentication failed' };
    } catch (err) {
      return { success: false, error: err.message || 'Network error during Google auth' };
    }
  };

  // Authenticate using Google OAuth2 Access Token
  const loginWithGoogleToken = async (accessToken) => {
    try {
      const apiBase = getApiBase();
      const res = await fetch(`${apiBase}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_token: accessToken })
      });
      const data = await safeJson(res);
      if (res.ok && data && data.success && data.user) {
        setUser(data.user);
        try {
          localStorage.setItem('phantom_user', JSON.stringify(data.user));
        } catch (e) {}
        return { success: true, user: data.user };
      }
      return { success: false, error: (data && data.detail) || 'Google authentication failed' };
    } catch (err) {
      return { success: false, error: err.message || 'Network error during Google auth' };
    }
  };

  // Interactive Google Sign-In popup
  const loginWithGoogle = () => {
    return new Promise((resolve) => {
      // Check if Google GIS SDK is loaded
      if (typeof window !== 'undefined' && window.google?.accounts?.oauth2) {
        try {
          const client = window.google.accounts.oauth2.initTokenClient({
            client_id: googleClientId,
            scope: 'email profile openid',
            callback: async (tokenResponse) => {
              if (tokenResponse.error) {
                resolve({ success: false, error: tokenResponse.error_description || tokenResponse.error });
                return;
              }
              if (tokenResponse.access_token) {
                const result = await loginWithGoogleToken(tokenResponse.access_token);
                resolve(result);
              } else {
                resolve({ success: false, error: 'No access token received from Google.' });
              }
            },
            error_callback: (err) => {
              resolve({ success: false, error: err.message || 'Google Sign-In cancelled.' });
            }
          });
          client.requestAccessToken({ prompt: 'select_account' });
          return;
        } catch (e) {
          console.error('Google OAuth init error:', e);
        }
      }

      // Check if Google ID library is initialized
      if (typeof window !== 'undefined' && window.google?.accounts?.id) {
        try {
          window.google.accounts.id.initialize({
            client_id: googleClientId,
            callback: async (response) => {
              if (response.credential) {
                const res = await loginWithGoogleCredential(response.credential);
                resolve(res);
              }
            }
          });
          window.google.accounts.id.prompt((notification) => {
            if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
              resolve({ success: false, error: 'Google Sign-In prompt unavailable. Check popup blockers.' });
            }
          });
          return;
        } catch (e) {
          console.error('Google ID prompt error:', e);
        }
      }

      // Fallback if Google SDK failed to load
      resolve({
        success: false,
        error: 'Google Sign-In SDK is loading. Please refresh and try again.'
      });
    });
  };

  const register = ({ username, email, password, role = 'SOC Threat Hunter' }) => {
    if (!username || !email || !password) {
      return { success: false, error: 'All fields are required.' };
    }

    try {
      const registered = safeStorageGet('phantom_users_db', []);
      const usersList = Array.isArray(registered) ? registered : [];
      const exists = usersList.some(
        (u) => u.username?.toLowerCase() === username.toLowerCase() || u.email?.toLowerCase() === email.toLowerCase()
      );
      if (exists) {
        return { success: false, error: 'Username or email is already registered.' };
      }

      const newUser = {
        username: username.trim(),
        email: email.trim(),
        password,
        role,
        created_at: new Date().toISOString()
      };

      usersList.push(newUser);
      try {
        localStorage.setItem('phantom_users_db', JSON.stringify(usersList));
      } catch (e) {}

      const authUser = {
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
        provider: 'credentials',
        token: `token-${newUser.username}-${Date.now()}`
      };
      setUser(authUser);
      try {
        localStorage.setItem('phantom_user', JSON.stringify(authUser));
      } catch (e) {}
      return { success: true };
    } catch (e) {
      return { success: false, error: 'Registration failed. Please try again.' };
    }
  };

  const logout = () => {
    setUser(null);
    try {
      localStorage.removeItem('phantom_user');
    } catch (e) {}
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      loginWithGoogle, 
      loginWithGoogleCredential,
      loginWithGoogleToken,
      register, 
      logout, 
      googleClientId,
      isAuthenticated: !!user 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  return useContext(AuthContext);
}
