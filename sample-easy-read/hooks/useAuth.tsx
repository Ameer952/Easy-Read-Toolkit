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

const AUTH_STORAGE_KEY = 'easyread.user';
const USERS_STORAGE_KEY = 'easyread.users';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load user from storage on mount
  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const userData = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
      if (userData) {
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
      // Get existing users
      const usersData = await AsyncStorage.getItem(USERS_STORAGE_KEY);
      const users = usersData ? JSON.parse(usersData) : [];

      // Check if email already exists
      const existingUser = users.find((u: any) => u.email.toLowerCase() === email.toLowerCase());
      if (existingUser) {
        return false; // Email already registered
      }

      // Create new user
      const newUser: User = {
        id: Date.now().toString(),
        name: name.trim(),
        email: email.toLowerCase().trim(),
        createdAt: new Date().toISOString(),
      };

      // Store password (in production, this would be hashed on backend)
      const userWithPassword = { ...newUser, password };

      // Save to users list
      users.push(userWithPassword);
      await AsyncStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));

      // Set as current user
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(newUser));
      setUser(newUser);

      return true;
    } catch (error) {
      console.error('Registration failed:', error);
      return false;
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      // Get all users
      const usersData = await AsyncStorage.getItem(USERS_STORAGE_KEY);
      const users = usersData ? JSON.parse(usersData) : [];

      // Find user with matching credentials
      const foundUser = users.find(
        (u: any) => 
          u.email.toLowerCase() === email.toLowerCase().trim() && 
          u.password === password
      );

      if (!foundUser) {
        return false; // Invalid credentials
      }

      // Remove password before storing in current user
      const { password: _, ...userWithoutPassword } = foundUser;
      
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(userWithoutPassword));
      setUser(userWithoutPassword);

      return true;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
      setUser(null);
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

