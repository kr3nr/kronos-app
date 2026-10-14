import React, { useState } from 'react';
import { 
  StyleSheet, Text, View, TouchableOpacity,
  TextInput 
} from 'react-native';
import { Alert } from '../../services/appAlert';
import { Ionicons } from '@expo/vector-icons';
import { createCategoryService } from '../../services/categoryService';
import CustomHeader from '../../components/CustomHeader';
import ScreenWrapper from '../../components/ScreenWrapper';

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

export default function NewSubCategoryScreen({ navigation, route, userId, setCategories }) {
  const parentId = route?.params?.parentId || null;
  const parentName = route?.params?.parentName || 'Categoría Principal';
  const parentColor = route?.params?.parentColor || '#3b82f6';
  const parentIcon = route?.params?.parentIcon || 'folder-outline';
  const type = route?.params?.type || 'egresos'; // Captura si es 'egresos' o 'ingresos'[cite: 12]

  const [subCategoryName, setSubCategoryName] = useState('');
  const [selectedCategoryTab, setSelectedCategoryTab] = useState('Comida');
  const [selectedIcon, setSelectedIcon] = useState(parentIcon);

  const handleCreateSubCategory = async () => {
    if (!subCategoryName.trim()) {
      Alert.alert("Atención", "Por favor ingresa un nombre para la subcategoría.");
      return;
    }

    try {
      if (userId) {
        // Utilizamos nuestro servicio centralizado para registrar la subcategoría con su tipo respectivo[cite: 12]
        const { data: inserted, error } = await createCategoryService(userId, {
          name: subCategoryName.trim(),
          type: type, // Mantiene la pestaña actual (ingresos o egresos)[cite: 12]
          parent_id: parentId,
          parentName: parentName,
          parentIcon: parentIcon,
          color: parentColor,
          icon: selectedIcon
        });

        if (error) {
          Alert.alert("Error", "No se pudo guardar: " + error);
          return;
        }

        if (inserted && setCategories) {
          setCategories(prev => [...prev, inserted]);
        }
      }

      // Regresamos a la pantalla de categorías asegurando que abra en la misma pestaña activa[cite: 12]
      navigation('categorias', { defaultTab: type });
    } catch (err) {
      console.error("Error inesperado al crear subcategoría:", err);
      Alert.alert("Error", "Ocurrió un error inesperado al intentar guardar la subcategoría.");
    }
  };

  const currentIcons = CATEGORY_ICONS_MAP[selectedCategoryTab] || CATEGORY_ICONS_MAP['Comida'];

  return (
    <View style={styles.container}>
      {/* Cabecera estandarizada con CustomHeader */}
      <CustomHeader 
        title="Nueva subcategoría"
        onBackPress={() => navigation('categorias', { defaultTab: type })}
        rightIcon={null}
        onRightPress={() => {}}
      />

      <ScreenWrapper contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
        
        <View style={styles.parentBadgeContainer}>
          <View style={[styles.parentIconBox, { backgroundColor: `${parentColor}25` }]}>
            <Ionicons name={parentIcon} size={14} color={parentColor} />
          </View>
          <Text style={[styles.parentBadgeText, { color: parentColor }]}>{parentName}</Text>
        </View>

        <View style={styles.inputCard}>
          <View style={[styles.inputIconPreview, { backgroundColor: `${parentColor}25` }]}>
            <Ionicons name={selectedIcon} size={18} color={parentColor} />
          </View>
          <Text style={styles.inputLabel}>Nombre</Text>
          <TextInput 
            style={styles.textInput}
            placeholder="Ej. Frutas y verduras"
            placeholderTextColor="#555"
            value={subCategoryName}
            onChangeText={setSubCategoryName}
          />
        </View>

        <Text style={styles.sectionHeaderTitle}>SELECCIONA UNA CATEGORÍA DE ICONOS</Text>
        
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
                  style={[styles.iconCell, isSelected && { backgroundColor: parentColor, borderColor: '#fff' }]}
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
        <TouchableOpacity style={styles.createButton} activeOpacity={0.8} onPress={handleCreateSubCategory}>
          <Text style={styles.createButtonText}>✓ Crear subcategoría</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  scrollBody: { paddingHorizontal: 15, paddingBottom: 100, paddingTop: 10 },
  parentBadgeContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a1a1a', alignSelf: 'flex-start', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16, marginBottom: 15, borderWidth: 1, borderColor: '#222' },
  parentIconBox: { width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  parentBadgeText: { fontSize: 13, fontWeight: '600' },
  inputCard: { backgroundColor: '#1a1a1a', borderRadius: 20, padding: 14, flexDirection: 'row', alignItems: 'center', marginBottom: 15, borderWidth: 1, borderColor: '#222' },
  inputIconPreview: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  inputLabel: { color: '#888', fontSize: 14, fontWeight: '600', marginRight: 15 },
  textInput: { flex: 1, color: '#fff', fontSize: 14, textAlign: 'right' },
  sectionHeaderTitle: { color: '#666', fontSize: 11, fontWeight: 'bold', marginBottom: 8, letterSpacing: 0.5 },
  
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