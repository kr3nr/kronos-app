import React from 'react';
import { Modal } from 'react-native';
import { adaptTreeForLightTheme } from '../services/themeStyles';
import { useAppTheme } from './ThemeContext';

export default function ThemedModal({ children, ...props }) {
  const themedChildren = useAppTheme() === 'light'
    ? adaptTreeForLightTheme(children, React)
    : children;
  return <Modal {...props}>{themedChildren}</Modal>;
}
