import React, { useState } from 'react';
import { 
  StyleSheet, Text, View, TouchableOpacity,
  TextInput 
} from 'react-native';
import { Alert } from '../../services/appAlert';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../services/supabase';
import CustomHeader from '../../components/CustomHeader';
import ScreenWrapper from '../../components/ScreenWrapper';

const COLOR_PALETTE = [
  '#64748b', '#ef4444', '#f97316', '#f59e0b', '#eab308', '#a3e635', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6'
];

const CATEGORY_ICONS_MAP = {
'Comida': [
    'restaurant-outline', 'cafe-outline', 'pizza-outline', 'fast-food-outline',
    'wine-outline', 'beer-outline', 'ice-cream-outline', 'nutrition-outline',
    'basket-outline', 'cart-outline', 'fish-outline', 'egg-outline',
    'bag-outline', 'car-outline', 'bonfire-outline'
  ],
  'Transporte': [
    'car-outline', 'bus-outline', 'bicycle-outline', 'boat-outline',
    'airplane-outline', 'train-outline', 'subway-outline', 'car-sport-outline',
    'speedometer-outline', 'navigate-outline', 'key-outline', 'construct-outline',
    'shield-outline', 'map-outline', 'location-outline'
  ],
  'Hogar': [
    'home-outline', 'bed-outline', 'key-outline', 'hammer-outline',
    'construct-outline', 'flash-outline', 'water-outline', 'wifi-outline',
    'tv-outline', 'snow-outline', 'thermometer-outline', 'shield-checkmark-outline',
    'trash-outline', 'color-palette-outline', 'albums-outline'
  ],
  'Compras': [
    'bag-handle-outline', 'cart-outline', 'pricetag-outline', 'gift-outline',
    'card-outline', 'basket-outline', 'shirt-outline', 'watch-outline',
    'phone-portrait-outline', 'glasses-outline', 'headset-outline', 'laptop-outline',
    'barcode-outline', 'ticket-outline', 'receipt-outline'
  ],
  'Salud': [
    'heart-outline', 'fitness-outline', 'medical-outline', 'bandage-outline',
    'pulse-outline', 'thermometer-outline', 'eyedrop-outline', 'medkit-outline',
    'body-outline', 'happy-outline', 'sad-outline', 'accessibility-outline',
    'flask-outline', 'clipboard-outline', 'shield-outline'
  ],
  'Entretenimiento': [
    'film-outline', 'game-controller-outline', 'musical-notes-outline', 'ticket-outline',
    'headset-outline', 'tv-outline', 'radio-outline', 'mic-outline',
    'color-palette-outline', 'camera-outline', 'images-outline', 'book-outline',
    'trophy-outline', 'baseball-outline', 'diamond-outline'
  ],
  'Finanzas': [
    'cash-outline', 'card-outline', 'wallet-outline', 'trending-up-outline',
    'trending-down-outline', 'pie-chart-outline', 'bar-chart-outline', 'calculator-outline',
    'shield-checkmark-outline', 'receipt-outline', 'diamond-outline', 'key-outline',
    'lock-closed-outline', 'server-outline', 'globe-outline'
  ],
  'Educación': [
    'school-outline', 'book-outline', 'library-outline', 'newspaper-outline',
    'document-text-outline', 'create-outline', 'calculator-outline', 'easel-outline',
    'bulb-outline', 'ribbon-outline', 'medal-outline', 'bookmark-outline',
    'folder-outline', 'briefcase-outline', 'desktop-outline'
  ],
  'Viajes': [
    'airplane-outline', 'compass-outline', 'map-outline', 'location-outline',
    'earth-outline', 'bed-outline', 'camera-outline', 'car-outline',
    'boat-outline', 'train-outline', 'sunny-outline', 'umbrella-outline',
    'briefcase-outline', 'ticket-outline', 'globe-outline'
  ],
  'Deportes': [
    'football-outline', 'basketball-outline', 'tennisball-outline', 'fitness-outline',
    'bicycle-outline', 'walk-outline', 'body-outline', 'stopwatch-outline',
    'trophy-outline', 'medal-outline', 'ribbon-outline', 'flash-outline',
    'pulse-outline', 'flag-outline', 'heart-outline'
  ],
  'Tecnología': [
    'phone-portrait-outline', 'laptop-outline', 'desktop-outline', 'watch-outline',
    'headset-outline', 'game-controller-outline', 'camera-outline', 'print-outline',
    'hardware-chip-outline', 'wifi-outline', 'bluetooth-outline', 'battery-charging-outline',
    'server-outline', 'tv-outline', 'mic-outline'
  ],
  'Mascotas': [
    'paw-outline', 'heart-outline', 'medical-outline', 'basket-outline',
    'home-outline', 'gift-outline', 'happy-outline', 'nutrition-outline',
    'water-outline', 'shield-outline', 'ribbon-outline', 'trophy-outline',
    'bed-outline', 'bonfire-outline', 'sunny-outline'
  ],
  'Otros': [
    'ellipsis-horizontal-outline', 'apps-outline', 'flag-outline', 'bookmark-outline',
    'star-outline', 'help-circle-outline', 'information-circle-outline', 'settings-outline',
    'options-outline', 'construct-outline', 'cube-outline', 'albums-outline',
    'folder-outline', 'pin-outline', 'sparkles-outline'
  ]
};

const CATEGORIES_LIST = Object.keys(CATEGORY_ICONS_MAP);

export default function EditCategoryScreen({ navigation, route, userId, setCategories }) {
  const categoryData = route?.params || {};
  
  const categoryId = categoryData.id;
  const categoryType = categoryData.type || 'egresos';

  const [categoryName, setCategoryName] = useState(categoryData.name || '');
  const [selectedColor, setSelectedColor] = useState(categoryData.color || '#3b82f6');
  const [selectedCategoryTab, setSelectedCategoryTab] = useState('Comida');
  const [selectedIcon, setSelectedIcon] = useState(categoryData.icon || 'folder-outline');

  const handleUpdateCategory = async () => {
    if (!categoryName.trim()) {
      Alert.alert("Atención", "El nombre no puede estar vacío.");
      return;
    }

    try {
      if (userId && categoryId) {
        // Actualizamos directamente en Supabase[cite: 17]
        const { error } = await supabase
          .from('categories')
          .update({
            name: categoryName.trim(),
            color: selectedColor,
            icon: selectedIcon
          })
          .eq('id', categoryId)
          .eq('user_id', userId);

        if (error) {
          Alert.alert("Error", "No se pudo actualizar: " + error.message);
          return;
        }

        // Actualizamos el estado global localmente[cite: 17]
        if (setCategories) {
          setCategories(prev => prev.map(c => c.id === categoryId ? { ...c, name: categoryName.trim(), color: selectedColor, icon: selectedIcon } : c));
        }
      }

      navigation('categorias', { defaultTab: categoryType });
    } catch (err) {
      console.error("Error al actualizar categoría:", err);
    }
  };

  const handleDeleteCategory = async () => {
    Alert.alert(
      "Eliminar categoría",
      `¿Estás seguro de que deseas eliminar "${categoryName}"?`,
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Eliminar", 
          style: "destructive",
          onPress: async () => {
            try {
              if (userId && categoryId) {
                await supabase.from('categories').delete().eq('id', categoryId).eq('user_id', userId);
                
                if (setCategories) {
                  setCategories(prev => prev.filter(c => c.id !== categoryId && c.parent_id !== categoryId));
                }
              }
              navigation('categorias', { defaultTab: categoryType });
            } catch (err) {
              console.error("Error al eliminar:", err);
            }
          }
        }
      ]
    );
  };

  const currentIcons = CATEGORY_ICONS_MAP[selectedCategoryTab] || CATEGORY_ICONS_MAP['Comida'];

  return (
    <View style={styles.container}>
      {/* Cabecera estandarizada con CustomHeader y botón de eliminar en la derecha */}
      <CustomHeader 
        title="Editar categoría"
        onBackPress={() => navigation('categorias', { defaultTab: categoryType })}
        rightComponent={
          <TouchableOpacity 
            onPress={handleDeleteCategory} 
            style={[styles.topIconButton, { borderColor: '#f8717125', backgroundColor: '#f8717115' }]} 
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={18} color="#f87171" />
          </TouchableOpacity>
        }
      />

      <ScreenWrapper contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
        <View style={styles.inputCard}>
          <View style={[styles.inputIconPreview, { backgroundColor: `${selectedColor}25` }]}>
            <Ionicons name={selectedIcon} size={18} color={selectedColor} />
          </View>
          <Text style={styles.inputLabel}>Nombre</Text>
          <TextInput 
            style={styles.textInput}
            placeholder="Ej. Supermercado"
            placeholderTextColor="#555"
            value={categoryName}
            onChangeText={setCategoryName}
          />
        </View>

        <Text style={styles.sectionHeaderTitle}>COLOR</Text>
        <ScreenWrapper horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.colorPaletteRow}>
          {COLOR_PALETTE.map((hex, index) => {
            const isSelected = selectedColor === hex;
            return (
              <TouchableOpacity 
                key={index} 
                style={[styles.colorCircle, { backgroundColor: hex }, isSelected && styles.colorCircleSelected]}
                onPress={() => setSelectedColor(hex)}
                activeOpacity={0.8}
              />
            );
          })}
        </ScreenWrapper>

        <Text style={[styles.sectionHeaderTitle, { marginTop: 10 }]}>SELECCIONA UNA CATEGORÍA DE ICONOS</Text>
        
        <ScreenWrapper horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryTabsRow}>
          {CATEGORIES_LIST.map((catName, index) => {
            const isTabActive = selectedCategoryTab === catName;
            return (
              <TouchableOpacity 
                key={index} 
                style={[styles.catTabChip, isTabActive && styles.catTabChipActive]}
                onPress={() => setSelectedCategoryTab(catName)}
                activeOpacity={0.8}
              >
                <Text style={[styles.catTabText, isTabActive && styles.catTabTextActive]}>{catName}</Text>
              </TouchableOpacity>
            );
          })}
        </ScreenWrapper>

        <View style={styles.iconSectionCard}>
          <Text style={styles.sectionCategoryTitle}>{selectedCategoryTab}</Text>
          <View style={styles.iconGrid}>
            {currentIcons.map((iconName, iIndex) => {
              const isSelected = selectedIcon === iconName;
              return (
                <TouchableOpacity 
                  key={iIndex} 
                  style={[styles.iconCell, isSelected && { backgroundColor: selectedColor, borderColor: '#fff' }]}
                  onPress={() => setSelectedIcon(iconName)}
                  activeOpacity={0.7}
                >
                  <Ionicons name={iconName} size={22} color={isSelected ? '#fff' : '#888'} />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScreenWrapper>

      <View style={styles.footerContainer}>
        <TouchableOpacity style={styles.createButton} activeOpacity={0.8} onPress={handleUpdateCategory}>
          <Text style={styles.createButtonText}>✓ Guardar cambios</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  topIconButton: { width: 36, height: 36, backgroundColor: '#1a1a1a', borderRadius: 18, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#333' },
  scrollBody: { paddingHorizontal: 15, paddingBottom: 100, paddingTop: 10 },
  inputCard: { backgroundColor: '#1a1a1a', borderRadius: 20, padding: 14, flexDirection: 'row', alignItems: 'center', marginBottom: 15, borderWidth: 1, borderColor: '#222' },
  inputIconPreview: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  inputLabel: { color: '#888', fontSize: 14, fontWeight: '600', marginRight: 15 },
  textInput: { flex: 1, color: '#fff', fontSize: 14, textAlign: 'right' },
  sectionHeaderTitle: { color: '#666', fontSize: 11, fontWeight: 'bold', marginBottom: 8, letterSpacing: 0.5 },
  
  colorPaletteRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5, marginBottom: 15 },
  colorCircle: { width: 36, height: 36, borderRadius: 18, marginRight: 12, borderWidth: 2, borderColor: 'transparent' },
  colorCircleSelected: { borderColor: '#fff', transform: [{ scale: 1.1 }] },

  categoryTabsRow: { paddingVertical: 5, marginBottom: 15 },
  catTabChip: { backgroundColor: '#1a1a1a', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 16, marginRight: 8, borderWidth: 1, borderColor: '#262626', height: 36, justifyContent: 'center' },
  catTabChipActive: { backgroundColor: '#a3e635', borderColor: '#a3e635' },
  catTabText: { color: '#888', fontSize: 12, fontWeight: '600' },
  catTabTextActive: { color: '#000', fontWeight: 'bold' },

  iconSectionCard: { backgroundColor: '#1a1a1a', borderRadius: 24, padding: 16, marginBottom: 15, borderWidth: 1, borderColor: '#222' },
  sectionCategoryTitle: { color: '#aaa', fontSize: 13, fontWeight: 'bold', marginBottom: 12 },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  iconCell: { width: '18%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center', borderRadius: 12, marginBottom: 12, backgroundColor: '#141414', borderWidth: 1, borderColor: '#222' },

  footerContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, backgroundColor: 'rgba(0,0,0,0.9)' },
  createButton: { backgroundColor: '#a3e635', width: '100%', paddingVertical: 14, borderRadius: 25, alignItems: 'center' },
  createButtonText: { color: '#000', fontSize: 15, fontWeight: 'bold' }
});