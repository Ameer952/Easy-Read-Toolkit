import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = 'http://192.168.0.51:5000/api/auth';
const TOKEN_STORAGE_KEY = 'easyread.token';
const USER_STORAGE_KEY = 'easyread.user';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load user from storage on mount
  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      // Clear old storage keys from previous local-only version
      await AsyncStorage.removeItem('easyread.users');
      
      const token = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
      const userData = await AsyncStorage.getItem(USER_STORAGE_KEY);
      
      if (token && userData) {
        setUser(JSON.parse(userData));
      }
    } catch (error) {
      console.error('Failed to load user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string): Promise<boolean> => {
    try {
      console.log('Attempting registration...', { name, email });
      console.log('API URL:', `${API_URL}/register`);
      
      const response = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });

      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Response data:', data);

      if (data.success && data.user && data.token) {
        await AsyncStorage.setItem(TOKEN_STORAGE_KEY, data.token);
        await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.user));
        setUser(data.user);
        return true;
      }

      console.log('Registration failed:', data.message || 'Unknown error');
      return false;
    } catch (error) {
      console.error('Registration network error:', error);
      return false;
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      console.log('Attempting login...', { email });
      console.log('API URL:', `${API_URL}/login`);
      
      const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Response data:', data);

      if (data.success && data.user && data.token) {
        await AsyncStorage.setItem(TOKEN_STORAGE_KEY, data.token);
        await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.user));
        setUser(data.user);
        return true;
      }

      console.log('Login failed:', data.message || 'Unknown error');
      return false;
    } catch (error) {
      console.error('Login network error:', error);
      return false;
    }
  };

  const logout = async () => {
  try {
    console.log('Logout triggered');
    const token = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);

    if (token) {
      const response = await fetch(`${API_URL}/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      console.log('Logout response:', response.status);
    }

    await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
    await AsyncStorage.removeItem(USER_STORAGE_KEY);
    setUser(null);
    console.log('Local user and token removed');
  } catch (error) {
    console.error('Logout failed:', error);
  } 
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

