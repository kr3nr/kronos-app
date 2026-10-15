import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LIGHT_PALETTE } from '../services/themeStyles';
import { useAppTheme } from './ThemeContext';
import ContextualHelp from './ContextualHelp';

export default function CustomHeader({ title, onBackPress, backIcon = 'chevron-back', backAccessibilityLabel = 'Volver', rightIcon, onRightPress, isRightActive, rightComponent, helpTitle, helpTips }) {
  const isLight = useAppTheme() === 'light';
  const iconColor = isLight ? LIGHT_PALETTE.text : '#fff';

  return (
    <View style={[styles.topBar, isLight && { backgroundColor: LIGHT_PALETTE.background }]}>
      <TouchableOpacity
        onPress={onBackPress}
        style={[styles.topIconButton, isLight && { backgroundColor: LIGHT_PALETTE.elevated, borderColor: LIGHT_PALETTE.border }]}
        accessibilityRole="button"
        accessibilityLabel={backAccessibilityLabel}
      >
        <Ionicons name={backIcon} size={20} color={iconColor} />
      </TouchableOpacity>
      
      <Text style={[styles.headerTitle, isLight && { color: LIGHT_PALETTE.text }]}>{title}</Text>
      
      {rightComponent ? (
        rightComponent
      ) : helpTips ? (
        <ContextualHelp title={helpTitle} tips={helpTips} />
      ) : rightIcon ? (
        <TouchableOpacity 
          onPress={onRightPress} 
          style={[styles.topIconButton, isLight && { backgroundColor: LIGHT_PALETTE.elevated, borderColor: LIGHT_PALETTE.border }, isRightActive && { backgroundColor: '#a3e635' }]}
        >
          <Ionicons name={rightIcon} size={18} color={isRightActive ? '#000' : iconColor} />
        </TouchableOpacity>
      ) : (
        <View style={{ width: 36, height: 36 }} /> 
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: { 
    position: 'relative',
    zIndex: 1000,
    elevation: 12,
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 15, 
    paddingVertical: 10,
    backgroundColor: '#000',
  },
  topIconButton: { 
    width: 36, 
    height: 36, 
    borderRadius: 18, 
    backgroundColor: '#1a1a1a', 
    justifyContent: 'center', 
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333'
  },
  headerTitle: { 
    color: '#fff', 
    fontSize: 18, 
    fontWeight: 'bold' 
  }
});
