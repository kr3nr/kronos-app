import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity,} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CustomHeader from '../../components/CustomHeader';
import ScreenWrapper from '../../components/ScreenWrapper';

// Catálogo completo de herramientas para accesos rápidos
const ALL_AVAILABLE_SHORTCUTS = [
  { id: 'compras', name: 'Lista de compras', icon: 'cart-outline' },
  { id: 'cuentas', name: 'Cuentas', icon: 'card-outline' },
  { id: 'pagos', name: 'Pagar/Cobrar', icon: 'calendar-outline' },
  { id: 'calculadora', name: 'Calculadora', icon: 'calculator-outline' },
  { id: 'movimientos', name: 'Movimientos', icon: 'swap-horizontal-outline' },
  { id: 'categorias', name: 'Categorías', icon: 'pricetag-outline' },
  { id: 'recurrentes', name: 'Recurrentes', icon: 'copy-outline' },
  { id: 'metas', name: 'Metas', icon: 'flag-outline' }
];

// Catálogo completo de widgets disponibles para la pantalla de inicio
const ALL_AVAILABLE_WIDGETS = [
  { id: 'brecha', name: 'Brecha cambiaria', icon: 'swap-horizontal-outline' },
  { id: 'estadisticas', name: 'Estadísticas o gráficos', icon: 'bar-chart-outline' },
  { id: 'metas', name: 'Metas', icon: 'flag-outline' },
  { id: 'pagos', name: 'Próximos pagos', icon: 'calendar-outline' },
  { id: 'movimientos', name: 'Movimientos recientes', icon: 'time-outline' },
  { id: 'tendencias', name: 'Tendencias', icon: 'trending-up-outline' }
];

export default function SettingsScreen({ 
  navigation, 
  activeShortcuts = [], 
  setActiveShortcuts, 
  activeWidgets = [], 
  setActiveWidgets 
}) {
  const [selectedTab, setSelectedTab] = useState('accesos'); // 'accesos' o 'widgets'

  // --- LÓGICA PARA ACCESOS RÁPIDOS ---
  const handleRemoveShortcut = (id) => {
    if (activeShortcuts.length <= 1) {
      alert('Debes mantener al menos un acceso rápido activo.');
      return;
    }
    setActiveShortcuts(activeShortcuts.filter(item => item !== id));
  };

  const handleAddShortcut = (id) => {
    if (activeShortcuts.length >= 3) {
      alert('Máximo 3. Quita uno para añadir otro.');
      return;
    }
    setActiveShortcuts([...activeShortcuts, id]);
  };

  const handleMoveShortcutUp = (index) => {
    if (index === 0) return;
    const newArr = [...activeShortcuts];
    const temp = newArr[index];
    newArr[index] = newArr[index - 1];
    newArr[index - 1] = temp;
    setActiveShortcuts(newArr);
  };

  const handleMoveShortcutDown = (index) => {
    if (index === activeShortcuts.length - 1) return;
    const newArr = [...activeShortcuts];
    const temp = newArr[index];
    newArr[index] = newArr[index + 1];
    newArr[index + 1] = temp;
    setActiveShortcuts(newArr);
  };

  // --- LÓGICA PARA WIDGETS ---
  const handleRemoveWidget = (id) => {
    if (activeWidgets.length <= 1) {
      alert('Debes mantener al menos un widget activo.');
      return;
    }
    setActiveWidgets(activeWidgets.filter(item => item !== id));
  };

  const handleAddWidget = (id) => {
    setActiveWidgets([...activeWidgets, id]);
  };

  const handleMoveWidgetUp = (index) => {
    if (index === 0) return;
    const newArr = [...activeWidgets];
    const temp = newArr[index];
    newArr[index] = newArr[index - 1];
    newArr[index - 1] = temp;
    setActiveWidgets(newArr);
  };

  const handleMoveWidgetDown = (index) => {
    if (index === activeWidgets.length - 1) return;
    const newArr = [...activeWidgets];
    const temp = newArr[index];
    newArr[index] = newArr[index + 1];
    newArr[index + 1] = temp;
    setActiveWidgets(newArr);
  };

  // Listas filtradas con seguridad
  const mostradosShortcuts = (activeShortcuts || []).map(id => ALL_AVAILABLE_SHORTCUTS.find(item => item.id === id)).filter(Boolean);
  const ocultosShortcuts = ALL_AVAILABLE_SHORTCUTS.filter(item => !(activeShortcuts || []).includes(item.id));

  const mostradosWidgets = (activeWidgets || []).map(id => ALL_AVAILABLE_WIDGETS.find(item => item.id === id)).filter(Boolean);
  const ocultosWidgets = ALL_AVAILABLE_WIDGETS.filter(item => !(activeWidgets || []).includes(item.id));

  return (
    <View style={styles.container}>
      {/* 2. Reemplazo de la topBar vieja y SafeAreaView por CustomHeader */}
      <CustomHeader 
        title="Personaliza tu inicio" 
        onBackPress={() => {
          if (typeof navigation === 'function') {
            navigation('home');
          }
        }}
      />

      {/* Pestañas Superiores */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity 
          style={[styles.tabBtn, selectedTab === 'accesos' && styles.tabBtnActive]}
          onPress={() => setSelectedTab('accesos')}
        >
          <Text style={[styles.tabText, selectedTab === 'accesos' && styles.tabTextActive]}>Accesos</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tabBtn, selectedTab === 'widgets' && styles.tabBtnActive]}
          onPress={() => setSelectedTab('widgets')}
        >
          <Text style={[styles.tabText, selectedTab === 'widgets' && styles.tabTextActive]}>Widgets</Text>
        </TouchableOpacity>
      </View>

      <ScreenWrapper contentContainerStyle={styles.scrollContent}>
        {selectedTab === 'accesos' ? (
          <>
            {/* Sección: Accesos Mostrados */}
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="eye-outline" size={16} color="#888" style={{ marginRight: 6 }} />
                <Text style={styles.sectionTitle}>Mostrados</Text>
              </View>
              <Text style={styles.sectionCounter}>{(activeShortcuts || []).length}/3</Text>
            </View>
            <Text style={styles.sectionSubTitle}>Usa las flechas para reordenar tus accesos</Text>

            <View style={styles.cardGroup}>
              {mostradosShortcuts.map((item, index) => (
                <View key={item.id} style={[styles.itemRow, index === mostradosShortcuts.length - 1 && { borderBottomWidth: 0 }]}>
                  <View style={styles.itemLeft}>
                    <View style={styles.reorderControls}>
                      <TouchableOpacity onPress={() => handleMoveShortcutUp(index)} disabled={index === 0}>
                        <Ionicons name="chevron-up" size={16} color={index === 0 ? '#444' : '#aaa'} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleMoveShortcutDown(index)} disabled={index === mostradosShortcuts.length - 1}>
                        <Ionicons name="chevron-down" size={16} color={index === mostradosShortcuts.length - 1 ? '#444' : '#aaa'} />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.iconCircle}>
                      <Ionicons name={item.icon} size={20} color="#fff" />
                    </View>
                    <Text style={styles.itemName}>{item.name}</Text>
                  </View>

                  <TouchableOpacity onPress={() => handleRemoveShortcut(item.id)} style={styles.removeBtn}>
                    <Ionicons name="remove" size={16} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            <View style={styles.separatorContainer}>
              <View style={styles.line} />
              <Ionicons name="swap-vertical" size={16} color="#666" style={{ marginHorizontal: 15 }} />
              <View style={styles.line} />
            </View>

            {/* Sección: Accesos Ocultos */}
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="eye-off-outline" size={16} color="#888" style={{ marginRight: 6 }} />
                <Text style={styles.sectionTitle}>Ocultos</Text>
              </View>
            </View>
            <Text style={styles.sectionSubTitle}>Máximo 3. Quita uno para añadir otro.</Text>

            <View style={styles.cardGroup}>
              {ocultosShortcuts.map((item, index) => (
                <View key={item.id} style={[styles.itemRow, index === ocultosShortcuts.length - 1 && { borderBottomWidth: 0 }]}>
                  <View style={styles.itemLeft}>
                    <View style={[styles.iconCircle, { marginLeft: 30 }]}>
                      <Ionicons name={item.icon} size={20} color="#fff" />
                    </View>
                    <Text style={styles.itemName}>{item.name}</Text>
                  </View>
                  <TouchableOpacity onPress={() => handleAddShortcut(item.id)} style={styles.addBtn}>
                    <Ionicons name="add" size={16} color="#000" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </>
        ) : (
          <>
            {/* Sección: Widgets Mostrados */}
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="eye-outline" size={16} color="#888" style={{ marginRight: 6 }} />
                <Text style={styles.sectionTitle}>Mostrados</Text>
              </View>
              <Text style={styles.sectionCounter}>{(activeWidgets || []).length}</Text>
            </View>
            <Text style={styles.sectionSubTitle}>Usa las flechas para reordenar tus widgets</Text>

            <View style={styles.cardGroup}>
              {mostradosWidgets.map((widget, index) => (
                <View key={widget.id} style={[styles.itemRow, index === mostradosWidgets.length - 1 && { borderBottomWidth: 0 }]}>
                  <View style={styles.itemLeft}>
                    <View style={styles.reorderControls}>
                      <TouchableOpacity onPress={() => handleMoveWidgetUp(index)} disabled={index === 0}>
                        <Ionicons name="chevron-up" size={16} color={index === 0 ? '#444' : '#aaa'} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleMoveWidgetDown(index)} disabled={index === mostradosWidgets.length - 1}>
                        <Ionicons name="chevron-down" size={16} color={index === mostradosWidgets.length - 1 ? '#444' : '#aaa'} />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.iconCircle}>
                      <Ionicons name={widget.icon} size={20} color="#fff" />
                    </View>
                    <Text style={styles.itemName}>{widget.name}</Text>
                  </View>

                  <TouchableOpacity onPress={() => handleRemoveWidget(widget.id)} style={styles.removeBtn}>
                    <Ionicons name="remove" size={16} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            <View style={styles.separatorContainer}>
              <View style={styles.line} />
              <Ionicons name="swap-vertical" size={16} color="#666" style={{ marginHorizontal: 15 }} />
              <View style={styles.line} />
            </View>

            {/* Sección: Widgets Ocultos */}
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="eye-off-outline" size={16} color="#888" style={{ marginRight: 6 }} />
                <Text style={styles.sectionTitle}>Ocultos</Text>
              </View>
            </View>
            <Text style={styles.sectionSubTitle}>Toca para mostrar en tu inicio.</Text>

            <View style={styles.cardGroup}>
              {ocultosWidgets.map((widget, index) => (
                <View key={widget.id} style={[styles.itemRow, index === ocultosWidgets.length - 1 && { borderBottomWidth: 0 }]}>
                  <View style={styles.itemLeft}>
                    <View style={[styles.iconCircle, { marginLeft: 30 }]}>
                      <Ionicons name={widget.icon} size={20} color="#fff" />
                    </View>
                    <Text style={styles.itemName}>{widget.name}</Text>
                  </View>
                  <TouchableOpacity onPress={() => handleAddWidget(widget.id)} style={styles.addBtn}>
                    <Ionicons name="add" size={16} color="#000" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </>
        )}
      </ScreenWrapper>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' }, // Se eliminaron topBar y SafeAreaView manuales obsoletos
  tabsContainer: { flexDirection: 'row', backgroundColor: '#1a1a1a', borderRadius: 25, margin: 15, padding: 4 },
  tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 22 },
  tabBtnActive: { backgroundColor: '#333' },
  tabText: { color: '#888', fontWeight: 'bold', fontSize: 14 },
  tabTextActive: { color: '#fff' },
  scrollContent: { paddingHorizontal: 15, paddingBottom: 40 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center' },
  sectionTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  sectionCounter: { color: '#888', fontSize: 14, fontWeight: 'bold' },
  sectionSubTitle: { color: '#888', fontSize: 12, marginTop: 3, marginBottom: 12 },
  cardGroup: { backgroundColor: '#1a1a1a', borderRadius: 20, paddingHorizontal: 15, marginBottom: 10 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#222' },
  itemLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 10 },
  reorderControls: { width: 24, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  iconCircle: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#2a2a2a', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  itemName: { color: '#fff', fontSize: 15, fontWeight: '500', flex: 1 },
  removeBtn: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#f87171', justifyContent: 'center', alignItems: 'center' },
  addBtn: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#a3e635', justifyContent: 'center', alignItems: 'center' },
  separatorContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  line: { flex: 1, height: 1, backgroundColor: '#333' }
});