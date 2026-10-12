import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function CustomHeader({ title, onBackPress, rightIcon, onRightPress, isRightActive, rightComponent }) {
  return (
    <View style={styles.topBar}>
      <TouchableOpacity onPress={onBackPress} style={styles.topIconButton}>
        <Ionicons name="chevron-back" size={20} color="#fff" />
      </TouchableOpacity>
      
      <Text style={styles.headerTitle}>{title}</Text>
      
      {rightComponent ? (
        rightComponent
      ) : rightIcon ? (
        <TouchableOpacity 
          onPress={onRightPress} 
          style={[styles.topIconButton, isRightActive && { backgroundColor: '#a3e635' }]}
        >
          <Ionicons name={rightIcon} size={18} color={isRightActive ? '#000' : '#fff'} />
        </TouchableOpacity>
      ) : (
        <View style={{ width: 36, height: 36 }} /> 
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: { 
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