import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('phantom_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

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
      localStorage.setItem('phantom_user', JSON.stringify(authUser));
      return { success: true };
    }

    // 2. Check locally registered users
    try {
      const registered = JSON.parse(localStorage.getItem('phantom_users_db') || '[]');
      const found = registered.find(
        (u) => (u.username.toLowerCase() === cleanId || u.email.toLowerCase() === cleanId) && u.password === password
      );
      if (found) {
        const authUser = {
          username: found.username,
          email: found.email,
          role: found.role || 'SOC Threat Hunter',
          provider: 'credentials',
          token: `token-${found.username}-${Date.now()}`
        };
        setUser(authUser);
        localStorage.setItem('phantom_user', JSON.stringify(authUser));
        return { success: true };
      }
    } catch (e) {
      console.error('Error reading users db:', e);
    }

    return {
      success: false,
      error: 'Invalid credentials. Use default (admin / phantom2026) or create a new account.'
    };
  };

  const loginWithGoogle = () => {
    // Simulated Google OAuth 2.0 Single Sign-On
    const googleUser = {
      username: 'yashz',
      email: 'yash@phantom-sec.ai',
      role: 'Enterprise SOC Hunter',
      provider: 'google',
      picture: 'https://lh3.googleusercontent.com/a/default-user',
      token: `google-oauth2-${Date.now()}`
    };
    setUser(googleUser);
    localStorage.setItem('phantom_user', JSON.stringify(googleUser));
    return { success: true };
  };

  const register = ({ username, email, password, role = 'SOC Threat Hunter' }) => {
    if (!username || !email || !password) {
      return { success: false, error: 'All fields are required.' };
    }

    try {
      const registered = JSON.parse(localStorage.getItem('phantom_users_db') || '[]');
      const exists = registered.some(
        (u) => u.username.toLowerCase() === username.toLowerCase() || u.email.toLowerCase() === email.toLowerCase()
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

      registered.push(newUser);
      localStorage.setItem('phantom_users_db', JSON.stringify(registered));

      const authUser = {
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
        provider: 'credentials',
        token: `token-${newUser.username}-${Date.now()}`
      };
      setUser(authUser);
      localStorage.setItem('phantom_user', JSON.stringify(authUser));
      return { success: true };
    } catch (e) {
      return { success: false, error: 'Registration failed. Please try again.' };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('phantom_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, loginWithGoogle, register, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  return useContext(AuthContext);
}
