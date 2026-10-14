import React, { useState, useEffect, useCallback } from 'react';
import { 
  StyleSheet, Text, View, TouchableOpacity,
  ActivityIndicator, Dimensions 
} from 'react-native';
import { Alert } from '../../services/appAlert';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../services/supabase';
import CustomHeader from '../../components/CustomHeader';
import ScreenWrapper from '../../components/ScreenWrapper';
import { getMovementCategoryPresentation } from '../../services/movementPresentation';

const { width } = Dimensions.get('window');

const formatCurrencyValue = (num) => {
  const n = parseFloat(num || 0);
  if (isNaN(n)) return '0.00';
  const fixed = n.toFixed(2);
  const [intPart, decPart] = fixed.split('.');
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${formattedInt}.${decPart}`;
};

export default function RecurringScreen({ navigation, userId, categories = [] }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);

  const [mainTab, setMainTab] = useState('Programados'); // 'Plantillas' | 'Programados'
  const [typeFilter, setTypeFilter] = useState('Todas'); // 'Todas' | 'Egresos' | 'Ingresos'

  const fetchTemplates = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('recurring_templates')
        .select('*')
        .eq('user_id', userId);

      if (error) {
        console.error('Error al cargar transacciones recurrentes:', error.message);
      } else {
        setTemplates(data || []);
      }
    } catch (err) {
      console.error('Excepción al buscar recurrentes:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const filteredTemplates = templates.filter(item => {
    const isProgrammed = item.is_scheduled !== false; 
    const matchesTab = mainTab === 'Programados' ? isProgrammed : !isProgrammed;

    const isIncome = item.type === 'Ingresos' || item.type === 'Ingreso' || item.type === 'ingreso';
    if (typeFilter === 'Ingresos') return matchesTab && isIncome;
    if (typeFilter === 'Egresos') return matchesTab && !isIncome;
    return matchesTab;
  });

  return (
    <View style={styles.container}>
      <CustomHeader 
        title="Recurrentes"
        onBackPress={() => navigation.goBack()}
        rightIcon="help-circle-outline"
        onRightPress={() => {
          Alert.alert(
            'Ayuda - Recurrentes', 
            'Presiona cualquier pago programado para editarlo o eliminarlo.'
          );
        }}
      />

      <View style={styles.mainTabsContainer}>
        {['Plantillas', 'Programados'].map(tab => (
          <TouchableOpacity 
            key={tab} 
            style={[styles.mainTabBtn, mainTab === tab && styles.mainTabBtnActive]}
            onPress={() => setMainTab(tab)}
            activeOpacity={0.7}
          >
            <Text style={[styles.mainTabText, mainTab === tab && styles.mainTabTextActive]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.typeFiltersRow}>
        {['Todas', 'Egresos', 'Ingresos'].map(filter => (
          <TouchableOpacity 
            key={filter}
            style={[styles.typeChip, typeFilter === filter && styles.typeChipActive]}
            onPress={() => setTypeFilter(filter)}
            activeOpacity={0.7}
          >
            <Text style={[styles.typeChipText, typeFilter === filter && styles.typeChipTextActive]}>{filter}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#a3e635" />
        </View>
      ) : (
        <ScreenWrapper contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
          {filteredTemplates.length === 0 ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="copy-outline" size={20} color="#888" />
              </View>
              <Text style={styles.emptyTitle}>Sin {mainTab.toLowerCase()}</Text>
              <Text style={styles.emptySubtitle}>
                Crea una para registrar de un toque lo que repites seguido.
              </Text>
            </View>
          ) : (
            filteredTemplates.map(item => {
              const isIncome = item.type === 'Ingresos' || item.type === 'Ingreso' || item.type === 'ingreso';
              const categoryDetails = getMovementCategoryPresentation({
                category: item.category,
                type: item.type,
                amount: item.amount,
              }, categories);
              return (
                <TouchableOpacity 
                  key={item.id} 
                  style={styles.templateCard}
                  activeOpacity={0.7}
                  onPress={() => navigation.navigate('RecurringForm', { 
                    userId: userId, 
                    templateId: item.id, 
                    itemData: item 
                  })}
                >
                  <View style={styles.templateLeft}>
                    <View style={[styles.iconBox, { backgroundColor: `${categoryDetails.color}25` }]}>
                      <Ionicons 
                        name={categoryDetails.icon} 
                        size={16} 
                        color={categoryDetails.color} 
                      />
                    </View>
                    <View style={{ flex: 1, marginRight: 10 }}>
                      <Text style={styles.templateName} numberOfLines={1}>{item.title || item.name}</Text>
                      <Text style={styles.templateFrequency} numberOfLines={1}>
                        {item.frequency || 'Mensual'} {item.category ? `• ${item.category}` : ''}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.templateRight}>
                    <Text style={[styles.templateAmount, isIncome && { color: '#10b981' }]}>
                      {isIncome ? '+' : '-'}$ {formatCurrencyValue(item.amount)}
                    </Text>
                    <Ionicons name="chevron-forward" size={16} color="#666" />
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScreenWrapper>
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('RecurringForm', { 
          userId: userId, 
          templateId: null, 
          itemData: null 
        })}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color="#000" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollBody: { padding: 15, paddingBottom: 90 },
  
  mainTabsContainer: { 
    flexDirection: 'row', 
    backgroundColor: '#161616', 
    marginHorizontal: 15, 
    marginTop: 12, 
    borderRadius: 24, 
    padding: 4, 
    borderWidth: 1, 
    borderColor: '#222' 
  },
  mainTabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 20 },
  mainTabBtnActive: { backgroundColor: '#333' },
  mainTabText: { color: '#888', fontSize: 13, fontWeight: '600' },
  mainTabTextActive: { color: '#fff' },

  typeFiltersRow: { flexDirection: 'row', justifyContent: 'center', marginVertical: 14 },
  typeChip: { backgroundColor: '#161616', paddingVertical: 6, paddingHorizontal: 16, borderRadius: 16, marginHorizontal: 4, borderWidth: 1, borderColor: '#222' },
  typeChipActive: { backgroundColor: '#333', borderColor: '#444' },
  typeChipText: { color: '#aaa', fontSize: 12, fontWeight: '600' },
  typeChipTextActive: { color: '#fff' },

  emptyCard: { backgroundColor: '#161616', borderRadius: 22, paddingVertical: 35, paddingHorizontal: 20, alignItems: 'center', borderWidth: 1, borderColor: '#222', marginTop: 10 },
  emptyIconCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#222', justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  emptyTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  emptySubtitle: { color: '#888', fontSize: 13, textAlign: 'center', lineHeight: 18, paddingHorizontal: 10 },

  templateCard: { backgroundColor: '#161616', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#222' },
  templateLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  iconBox: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  templateName: { color: '#fff', fontSize: 15, fontWeight: 'bold', marginBottom: 2 },
  templateFrequency: { color: '#888', fontSize: 12 },
  templateRight: { flexDirection: 'row', alignItems: 'center', marginLeft: 10 }, // 👈 Corregido el duplicado de alignItems
  templateAmount: { color: '#f87171', fontSize: 16, fontWeight: 'bold', marginRight: 8 },

  fab: { position: 'absolute', bottom: 25, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: '#a3e635', justifyContent: 'center', alignItems: 'center', shadowColor: '#a3e635', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 5, zIndex: 999 }
});