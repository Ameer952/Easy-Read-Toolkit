import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: 'light' | 'dark';
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useSystemColorScheme();
  const [themeMode, setThemeMode] = useState<ThemeMode>('system');

  useEffect(() => {
    // Load saved theme mode
    AsyncStorage.getItem('easyread.theme.mode').then((saved) => {
      if (saved && ['light', 'dark', 'system'].includes(saved)) {
        setThemeMode(saved as ThemeMode);
      }
    });
  }, []);

  const theme = themeMode === 'system' ? (systemColorScheme ?? 'light') : themeMode;

  const handleSetThemeMode = (mode: ThemeMode) => {
    setThemeMode(mode);
    AsyncStorage.setItem('easyread.theme.mode', mode).catch(() => {});
  };

  return (
    <ThemeContext.Provider value={{ theme, themeMode, setThemeMode: handleSetThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
