import React from 'react';
import { adaptTreeForLightTheme } from '../services/themeStyles';
import { useAppTheme } from './ThemeContext';

export default function ThemeContent({ children }) {
  return useAppTheme() === 'light' ? adaptTreeForLightTheme(children, React) : children;
}
