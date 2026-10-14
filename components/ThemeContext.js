import React, { createContext, useContext } from 'react';
import { useColorScheme } from 'react-native';

const ThemeContext = createContext('system');

export function ThemeProvider({ mode = 'system', children }) {
  return <ThemeContext.Provider value={mode}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  const mode = useContext(ThemeContext);
  const systemMode = useColorScheme();
  return mode === 'light' || mode === 'dark' ? mode : systemMode || 'dark';
}
