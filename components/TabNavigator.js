// components/BottomTabBar.js
import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LIGHT_PALETTE } from '../services/themeStyles';
import { useAppTheme } from './ThemeContext';

export default function BottomTabBar({ currentScreen, navigation }) {
  const isLight = useAppTheme() === 'light';
  // Verificamos qué pestañas están activas para cambiar el color de sus iconos y textos
  const isHome = currentScreen === 'home';
  const isBudget = currentScreen === 'budgets' || currentScreen === 'presupuestos';
  const isAccounts = currentScreen === 'accounts' || currentScreen === 'cuentas';
  const isMenu = currentScreen === 'profile' || currentScreen === 'menu';
  const activeColor = isLight ? LIGHT_PALETTE.accent : '#a3e635';
  const inactiveColor = isLight ? LIGHT_PALETTE.subtle : '#888';
  const activeLabelStyle = isLight ? { color: activeColor } : styles.tabLabelActive;

  return (
    <View style={[styles.container, isLight && { backgroundColor: LIGHT_PALETTE.surface, borderTopColor: LIGHT_PALETTE.border }]}>
      {/* 1. Botón Inicio */}
      <TouchableOpacity 
        style={styles.tabItem} 
        onPress={() => navigation('home')}
        activeOpacity={0.7}
      >
        <Ionicons 
          name={isHome ? "home" : "home-outline"} 
          size={22} 
          color={isHome ? activeColor : inactiveColor} 
        />
        <Text style={[styles.tabLabel, isLight && { color: inactiveColor }, isHome && activeLabelStyle]}>Inicio</Text>
      </TouchableOpacity>

      {/* 2. Botón Presupuesto */}
      <TouchableOpacity 
        style={styles.tabItem} 
        onPress={() => navigation('budgets')}
        activeOpacity={0.7}
      >
        <Ionicons 
          name={isBudget ? "pie-chart" : "pie-chart-outline"} 
          size={22} 
          color={isBudget ? activeColor : inactiveColor} 
        />
        <Text style={[styles.tabLabel, isLight && { color: inactiveColor }, isBudget && activeLabelStyle]}>Presupuesto</Text>
      </TouchableOpacity>

      {/* 3. Botón Flotante Central (+) */}
      <View style={styles.floatingButtonWrapper}>
        <TouchableOpacity 
          style={[styles.floatingAddButton, isLight && { borderColor: LIGHT_PALETTE.border }]}
          activeOpacity={0.85}
          onPress={() => navigation('addMovement')}
        >
          <Ionicons name="add" size={28} color="#000" />
        </TouchableOpacity>
      </View>

      {/* 4. Botón Cuentas */}
      <TouchableOpacity 
              style={styles.tabItem}
              onPress={() => navigation('accounts')}
              activeOpacity={0.7}
            >
        <Ionicons 
          name={isAccounts ? "card" : "card-outline"} 
          size={22} 
          color={isAccounts ? activeColor : inactiveColor} 
        />
        <Text style={[styles.tabLabel, isLight && { color: inactiveColor }, isAccounts && activeLabelStyle]}>Cuentas</Text>
      </TouchableOpacity>

      {/* 5. Botón Menú */}
      <TouchableOpacity 
        style={styles.tabItem} 
        onPress={() => navigation('menu')}
        activeOpacity={0.7}
      >
        <Ionicons 
          name={isMenu ? "menu" : "menu-outline"} 
          size={24} 
          color={isMenu ? activeColor : inactiveColor} 
        />
        <Text style={[styles.tabLabel, isLight && { color: inactiveColor }, isMenu && activeLabelStyle]}>Menú</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 65,
    backgroundColor: '#111',
    borderTopWidth: 1,
    borderTopColor: '#222',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: Platform.OS === 'ios' ? 10 : 0,
    zIndex: 999,
  },
  tabItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
  },
  tabLabel: {
    color: '#888',
    fontSize: 10,
    marginTop: 3,
    fontWeight: '500',
  },
  tabLabelActive: {
    color: '#a3e635',
    fontWeight: 'bold',
  },
  floatingButtonWrapper: {
    flex: 1,
    height: 65,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  floatingAddButton: {
    position: 'absolute',
    bottom: 18,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#a3e635',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
    elevation: 6,
    borderWidth: 2,
    borderColor: '#111',
  },
});