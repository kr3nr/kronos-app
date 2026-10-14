import ThemedModal from "../../components/ThemedModal";
import React, { useState, useEffect, useCallback } from 'react';
import { 
  StyleSheet, Text, View, TouchableOpacity,
  Dimensions, Modal 
} from 'react-native';
import { Alert } from '../../services/appAlert';
import { Ionicons } from '@expo/vector-icons';
import { getUserCategoriesService, resetDefaultCategoriesService } from '../../services/categoryService';
import CustomHeader from '../../components/CustomHeader';
import ContextualHelp from '../../components/ContextualHelp';
import ScreenWrapper from '../../components/ScreenWrapper';

const { width } = Dimensions.get('window');

export default function CategoriesScreen({ navigation, route, userId, categories: globalCategories, setCategories: setGlobalCategories }) {
  const initialTab = route?.params?.defaultTab || 'egresos';
  const [activeTab, setActiveTab] = useState(initialTab); 
  const [categories, setCategories] = useState([]);
  const [menuVisible, setMenuVisible] = useState(false);
  const [helpVisible, setHelpVisible] = useState(false);

  const loadCategories = useCallback(async () => {
    if (!userId) return;

    try {
      // Usamos nuestro servicio para obtener las categorías de la nube o inicializarlas[cite: 19]
      const userCategories = await getUserCategoriesService(userId);
      setCategories(userCategories);
      if (setGlobalCategories) {
        setGlobalCategories(userCategories);
      }
    } catch (err) {
      console.error('Error al cargar categorías en pantalla:', err);
    }
  }, [userId, setGlobalCategories]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories, userId]);

  const handleResetDefaults = async () => {
    setMenuVisible(false);
    Alert.alert(
      "Restaurar valores",
      "¿Deseas restablecer todas las categorías y subcategorías a sus valores predeterminados?",
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Restaurar", 
          style: "destructive",
          onPress: async () => {
            if (userId) {
              const resetData = await resetDefaultCategoriesService(userId);
              setCategories(resetData);
              if (setGlobalCategories) setGlobalCategories(resetData);
            }
          }
        }
      ]
    );
  };

  // Filtramos las categorías principales (aquellas cuyo parent_id es null o vacío)[cite: 19]
  const parents = categories.filter(c => !c.parent_id && c.type === activeTab);

  return (
    <View style={styles.container}>
      {/* Cabecera estandarizada con CustomHeader y botones de ayuda/menú en la derecha */}
      <CustomHeader 
        title="Categorías"
        onBackPress={() => navigation('home')}
        rightComponent={
          <View style={styles.topRightActionsRow}>
            <ContextualHelp title="Categorías" tips={[
              'Cambia entre egresos e ingresos con las pestañas.',
              'Toca una categoría para editarla o abrir sus subcategorías.',
              'Usa + para agregar; el menú permite restaurar categorías iniciales.',
            ]} />
            <TouchableOpacity 
              onPress={() => setMenuVisible(true)} 
              style={[styles.topIconButton, { marginLeft: 8 }]}
              activeOpacity={0.7}
            >
              <Ionicons name="ellipsis-vertical" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        }
      />

      <ThemedModal visible={menuVisible} transparent={true} animationType="fade">
        <TouchableOpacity 
          style={styles.modalBackdrop} 
          activeOpacity={1} 
          onPress={() => setMenuVisible(false)}
        >
          <View style={styles.menuDropdown}>
            <TouchableOpacity style={styles.menuItem} onPress={handleResetDefaults}>
              <Ionicons name="refresh-outline" size={16} color="#f87171" style={{ marginRight: 8 }} />
              <Text style={[styles.menuText, { color: '#f87171' }]}>Restaurar valores</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </ThemedModal>

      {helpVisible && (
        <View style={styles.tooltipCard}>
          <Text style={styles.tooltipTitle}>💡 Gestión de Categorías</Text>
          <Text style={styles.tooltipText}>
            Organiza tus finanzas separando tus egresos e ingresos. Toca cualquier categoría o subcategoría para editarla, o añade nuevas fácilmente.
          </Text>
          <TouchableOpacity onPress={() => setHelpVisible(false)} style={styles.tooltipCloseBtn}>
            <Text style={styles.tooltipCloseText}>Entendido ✓</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.tabSelectorContainer}>
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'egresos' && styles.tabButtonActive]}
          onPress={() => setActiveTab('egresos')}
          activeOpacity={0.8}
        >
          <Ionicons name="chevron-down" size={14} color={activeTab === 'egresos' ? "#fff" : "#888"} style={{ marginRight: 6 }} />
          <Text style={[styles.tabText, activeTab === 'egresos' && styles.tabTextActive]}>Egresos</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'ingresos' && styles.tabButtonActive]}
          onPress={() => setActiveTab('ingresos')}
          activeOpacity={0.8}
        >
          <Ionicons name="chevron-up" size={14} color={activeTab === 'ingresos' ? "#fff" : "#888"} style={{ marginRight: 6 }} />
          <Text style={[styles.tabText, activeTab === 'ingresos' && styles.tabTextActive]}>Ingresos</Text>
        </TouchableOpacity>
      </View>

      <ScreenWrapper contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
        {parents.map((parent) => {
          // Buscamos las subcategorías que pertenecen a este padre mediante su UUID real en Supabase[cite: 19]
          const subcategories = categories.filter(c => c.parent_id === parent.id);
          
          const parentColor = parent.color || '#3b82f6';

          return (
            <View key={parent.id} style={styles.categoryCard}>
              <TouchableOpacity 
                style={styles.mainCategoryHeader}
                activeOpacity={0.7}
                onPress={() => navigation('EditCategory', parent)}
              >
                <View style={[styles.iconBox, { backgroundColor: `${parentColor}25` }]}>
                  <Ionicons name={parent.icon || 'folder-outline'} size={18} color={parentColor} />
                </View>
                <Text style={styles.mainCategoryTitle}>{parent.name}</Text>
                <Ionicons name="chevron-forward" size={14} color="#666" style={{ marginLeft: 'auto' }} />
              </TouchableOpacity>

              {subcategories.map((sub) => (
                <TouchableOpacity 
                  key={sub.id} 
                  style={styles.subCategoryRow}
                  activeOpacity={0.7}
                  onPress={() => navigation('EditCategory', sub)}
                >
                  <View style={[styles.smallIconBox, { backgroundColor: `${parentColor}20` }]}>
                    <Ionicons name={sub.icon || 'pricetag-outline'} size={14} color={parentColor} />
                  </View>
                  <Text style={styles.subCategoryName}>{sub.name}</Text>
                </TouchableOpacity>
              ))}

              <TouchableOpacity 
                style={styles.addSubCategoryBtn}
                activeOpacity={0.7}
                onPress={() => navigation('NewSubCategory', { 
                  parentId: parent.id, 
                  parentName: parent.name, 
                  parentColor: parent.color || '#3b82f6',
                  parentIcon: parent.icon || 'folder-outline',
                  type: activeTab 
                })}
              >
                <Ionicons name="add" size={16} color="#888" style={{ marginRight: 8 }} />
                <Text style={styles.addSubCategoryText}>Añadir subcategoría</Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </ScreenWrapper>

      <TouchableOpacity 
        style={styles.fabButton} 
        activeOpacity={0.8}
        onPress={() => navigation('NewCategory')}
      >
        <Ionicons name="add" size={26} color="#000" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  topRightActionsRow: { flexDirection: 'row', alignItems: 'center' },
  topIconButton: { width: 36, height: 36, backgroundColor: '#1a1a1a', borderRadius: 18, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#333' },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-start', alignItems: 'flex-end', paddingTop: 90, paddingRight: 15 },
  menuDropdown: { backgroundColor: '#1e1e1e', borderRadius: 14, paddingVertical: 6, width: 190, borderWidth: 1, borderColor: '#333', elevation: 5 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 15 },
  menuText: { fontSize: 13, fontWeight: '500' },

  tooltipCard: { backgroundColor: '#222', borderRadius: 16, padding: 14, marginHorizontal: 15, marginBottom: 12, borderWidth: 1, borderColor: '#a3e635' },
  tooltipTitle: { color: '#a3e635', fontSize: 14, fontWeight: 'bold', marginBottom: 4 },
  tooltipText: { color: '#ccc', fontSize: 12, lineHeight: 18, marginBottom: 8 },
  tooltipCloseBtn: { alignSelf: 'flex-end', backgroundColor: '#a3e635', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 8 },
  tooltipCloseText: { color: '#000', fontSize: 10, fontWeight: 'bold' },

  tabSelectorContainer: { flexDirection: 'row', backgroundColor: '#141414', borderRadius: 24, padding: 4, marginHorizontal: 15, marginBottom: 15, borderWidth: 1, borderColor: '#222' },
  tabButton: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 10, borderRadius: 20 },
  tabButtonActive: { backgroundColor: '#262626' },
  tabText: { color: '#9ca3af', fontSize: 13, fontWeight: '600' },
  tabTextActive: { color: '#fff', fontWeight: 'bold' },

  scrollBody: { paddingHorizontal: 15, paddingBottom: 100, paddingTop: 5 },

  categoryCard: { backgroundColor: '#1a1a1a', borderRadius: 24, padding: 16, marginBottom: 15, borderWidth: 1, borderColor: '#222' },
  mainCategoryHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#252525' },
  iconBox: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  mainCategoryTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

  subCategoryRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingLeft: 8, borderBottomWidth: 1, borderBottomColor: '#222' },
  smallIconBox: { width: 26, height: 26, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  subCategoryName: { color: '#e5e7eb', fontSize: 14, fontWeight: '500' },

  addSubCategoryBtn: { flexDirection: 'row', alignItems: 'center', paddingTop: 12, paddingLeft: 8 },
  addSubCategoryText: { color: '#a3e635', fontSize: 13, fontWeight: '600' },

  fabButton: { position: 'absolute', bottom: 25, right: 20, width: 56, height: 56, backgroundColor: '#a3e635', borderRadius: 28, justifyContent: 'center', alignItems: 'center', elevation: 6, shadowColor: '#a3e635', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4, zIndex: 99 }
});