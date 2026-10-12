import React, { useState, useEffect, useCallback } from 'react';
import { 
  StyleSheet, Text, View, TouchableOpacity,
  Dimensions, ActivityIndicator, Alert 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../services/supabase';
import CustomHeader from '../../components/CustomHeader';
import ScreenWrapper from '../../components/ScreenWrapper';

const { width } = Dimensions.get('window');

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const formatCurrencyValue = (num) => {
  const n = parseFloat(num || 0);
  if (isNaN(n)) return '0.00';
  const fixed = n.toFixed(2);
  const [intPart, decPart] = fixed.split('.');
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${formattedInt}.${decPart}`;
};

export default function BudgetsScreen({ navigation, userId, setHasBudget }) {
  const [currentMonthIndex, setCurrentMonthIndex] = useState(8); // Septiembre por defecto (índice 8)
  const [currentBudget, setCurrentBudget] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchBudgetForMonth = useCallback(async (monthIdx) => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('budgets')
        .select('*')
        .eq('user_id', userId)
        .eq('month_index', monthIdx)
        .maybeSingle();

      if (error) {
        console.error('Error al cargar presupuesto:', error.message);
        setCurrentBudget(null);
      } else {
        setCurrentBudget(data);
      }
    } catch (err) {
      console.error('Excepción al buscar presupuesto:', err);
      setCurrentBudget(null);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchBudgetForMonth(currentMonthIndex);
  }, [currentMonthIndex, fetchBudgetForMonth]);

  const handlePrevMonth = () => {
    setCurrentMonthIndex(prev => (prev > 0 ? prev - 1 : 11));
  };

  const handleNextMonth = () => {
    setCurrentMonthIndex(prev => (prev < 11 ? prev + 1 : 0));
  };

  const handleDeleteBudget = async () => {
    if (!currentBudget) return;

    Alert.alert(
      'Eliminar Presupuesto',
      `¿Deseas eliminar el presupuesto de ${MONTHS[currentMonthIndex]}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('budgets')
                .delete()
                .eq('id', currentBudget.id);

              if (error) {
                Alert.alert('Error', error.message);
                return;
              }

              setCurrentBudget(null);
              if (setHasBudget) setHasBudget(false);
            } catch (err) {
              console.error('Error al eliminar presupuesto:', err);
            }
          }
        }
      ]
    );
  };

  // Cálculos financieros derivados del presupuesto guardado
  const incomes = currentBudget?.incomes || [];
  const expenses = currentBudget?.expenses || [];
  const savingsMode = currentBudget?.savings_mode || 'percent';
  const savingsValue = parseFloat(currentBudget?.savings_value || 0);

  const totalIncome = incomes.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  const savingsAmount = savingsMode === 'percent' ? (totalIncome * savingsValue) / 100 : savingsValue;
  const savingsPercent = totalIncome > 0 ? ((savingsAmount / totalIncome) * 100).toFixed(0) : 0;
  
  const totalExpenses = expenses.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  const disposableAmount = totalIncome - savingsAmount;
  const unassignedAmount = disposableAmount - totalExpenses;
  const unassignedPercent = disposableAmount > 0 ? ((unassignedAmount / disposableAmount) * 100).toFixed(0) : 100;
  const expensesPercent = disposableAmount > 0 ? ((totalExpenses / disposableAmount) * 100).toFixed(0) : 0;
  const availablePercent = 100 - savingsPercent;

  return (
    <View style={styles.container}>
      <CustomHeader 
        title="Presupuestos"
        onBackPress={() => navigation('home')}
        rightComponent={
          currentBudget ? (
            <TouchableOpacity onPress={handleDeleteBudget} style={styles.topBarIconBtn} activeOpacity={0.7}>
              <Ionicons name="trash-outline" size={18} color="#f87171" />
            </TouchableOpacity>
          ) : null
        }
      />

      <View style={styles.monthSelectorRow}>
        <TouchableOpacity onPress={handlePrevMonth} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.monthSelectorText}>{MONTHS[currentMonthIndex]}</Text>
        <TouchableOpacity onPress={handleNextMonth} activeOpacity={0.7}>
          <Ionicons name="chevron-forward" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#a3e635" />
        </View>
      ) : (
        <ScreenWrapper contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
          {currentBudget ? (
            <>
              {/* Tarjeta de Resumen General */}
              <View style={styles.budgetCardMain}>
                <View style={styles.budgetCardHeaderFlex}>
                  <View>
                    <Text style={styles.cardSubLabel}>Ingresos totales</Text>
                    <Text style={styles.cardMainVal}>$ {formatCurrencyValue(totalIncome)}</Text>
                  </View>
                  <TouchableOpacity 
                    style={styles.editBudgetMiniBtn}
                    onPress={() => navigation('budgetForm', { monthIndex: currentMonthIndex, existingBudget: currentBudget })}
                  >
                    <Ionicons name="create-outline" size={16} color="#fff" style={{ marginRight: 4 }} />
                    <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>Editar</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.budgetStatsRow}>
                  <View style={styles.statBox}>
                    <Text style={styles.statBoxTitle}>Ahorro ({savingsPercent}%)</Text>
                    <Text style={styles.statBoxAmount}>$ {formatCurrencyValue(savingsAmount)}</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={styles.statBoxTitle}>Gastado ({expensesPercent}%)</Text>
                    <Text style={styles.statBoxAmount}>$ {formatCurrencyValue(totalExpenses)}</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={styles.statBoxTitle}>Libre ({unassignedPercent}%)</Text>
                    <Text style={[styles.statBoxAmount, { color: '#a3e635' }]}>$ {formatCurrencyValue(unassignedAmount)}</Text>
                  </View>
                </View>
              </View>

              {/* Lista de Ingresos */}
              <Text style={styles.sectionTitle}>INGRESOS</Text>
              {incomes.map((inc, i) => (
                <View key={i} style={styles.itemRowCard}>
                  <View style={styles.itemRowLeft}>
                    <View style={[styles.iconBoxMini, { backgroundColor: 'rgba(16, 185, 129, 0.2)' }]}>
                      <Ionicons name={inc.icon || 'cash-outline'} size={16} color="#10b981" />
                    </View>
                    <Text style={styles.itemNameText}>{inc.name}</Text>
                  </View>
                  <Text style={styles.itemAmountText}>$ {formatCurrencyValue(inc.amount)}</Text>
                </View>
              ))}

              {/* Lista de Egresos */}
              <Text style={styles.sectionTitle}>EGRESOS Y GASTOS</Text>
              {expenses.map((exp, i) => (
                <View key={i} style={styles.itemRowCard}>
                  <View style={styles.itemRowLeft}>
                    <View style={[styles.iconBoxMini, { backgroundColor: 'rgba(248, 113, 113, 0.2)' }]}>
                      <Ionicons name={exp.icon || 'arrow-down-outline'} size={16} color="#f87171" />
                    </View>
                    <Text style={styles.itemNameText}>{exp.name}</Text>
                  </View>
                  <Text style={styles.itemAmountText}>$ {formatCurrencyValue(exp.amount)}</Text>
                </View>
              ))}
            </>
          ) : (
            <View style={styles.emptyStateCard}>
              <Ionicons name="pie-chart-outline" size={48} color="#666" style={{ marginBottom: 12 }} />
              <Text style={styles.emptyTitle}>Sin presupuesto</Text>
              <Text style={styles.emptySubtitle}>No has configurado un presupuesto para el mes de {MONTHS[currentMonthIndex]}.</Text>
              
              <TouchableOpacity 
                style={styles.createBudgetBtn}
                onPress={() => navigation('budgetForm', { monthIndex: currentMonthIndex })}
                activeOpacity={0.8}
              >
                <Text style={styles.createBudgetBtnText}>Crear presupuesto</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScreenWrapper>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  topBarIconBtn: { width: 36, height: 36, backgroundColor: '#1a1a1a', borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  monthSelectorRow: { flexDirection: 'row', backgroundColor: '#1a1a1a', borderRadius: 25, justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 10, marginHorizontal: 15, marginBottom: 15, borderWidth: 1, borderColor: '#222' },
  monthSelectorText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollBody: { paddingHorizontal: 15, paddingBottom: 40 },
  
  budgetCardMain: { backgroundColor: '#1a1a1a', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#222', marginBottom: 20 },
  budgetCardHeaderFlex: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  cardSubLabel: { color: '#888', fontSize: 12, marginBottom: 4 },
  cardMainVal: { color: '#fff', fontSize: 28, fontWeight: 'bold' },
  editBudgetMiniBtn: { flexDirection: 'row', backgroundColor: '#333', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 12, alignItems: 'center' },
  
  budgetStatsRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#252525', paddingTop: 15 },
  statBox: { flex: 1, alignItems: 'center' },
  statBoxTitle: { color: '#888', fontSize: 11, marginBottom: 4 },
  statBoxAmount: { color: '#fff', fontSize: 13, fontWeight: 'bold' },

  sectionTitle: { color: '#666', fontSize: 11, fontWeight: 'bold', marginTop: 20, marginBottom: 10 },
  itemRowCard: { backgroundColor: '#1a1a1a', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderRadius: 16, marginBottom: 10, borderWidth: 1, borderColor: '#222' },
  itemRowLeft: { flexDirection: 'row', alignItems: 'center' },
  iconBoxMini: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  itemNameText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  itemAmountText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },

  emptyStateCard: { backgroundColor: '#1a1a1a', borderRadius: 20, padding: 30, alignItems: 'center', borderWidth: 1, borderColor: '#222', marginTop: 30 },
  emptyTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 6 },
  emptySubtitle: { color: '#888', fontSize: 13, textAlign: 'center', marginBottom: 20 },
  createBudgetBtn: { backgroundColor: '#a3e635', paddingVertical: 14, paddingHorizontal: 30, borderRadius: 25, alignItems: 'center' },
  createBudgetBtnText: { color: '#000', fontSize: 15, fontWeight: 'bold' }
});