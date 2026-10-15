import React from 'react';
import { View } from 'react-native';
import { useAppTheme } from './ThemeContext';
import { LIGHT_PALETTE } from '../services/themeStyles';

export default function ThemeContent({ children, style }) {
  const isLight = useAppTheme() === 'light';
  return (
    <View style={[{ flex: 1 }, style, isLight && { backgroundColor: LIGHT_PALETTE.background }]}>
      {children}
    </View>
  );
}
