import React, { useState, useEffect, useCallback } from 'react';
import { 
  StyleSheet, Text, View, TouchableOpacity,
  Dimensions, ActivityIndicator 
} from 'react-native';
import { Alert } from '../../services/appAlert';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../services/supabase';
import CustomHeader from '../../components/CustomHeader';
import ScreenWrapper from '../../components/ScreenWrapper';
import { convertCurrencyAmount } from '../../services/currencyService';

const { width } = Dimensions.get('window');

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const formatCurrencyValue = (num) => {
  const n = parseFloat(num || 0);
  if (isNaN(n)) return '0.00';
  const fixed = Math.abs(n).toFixed(2);
  const [intPart, decPart] = fixed.split('.');
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const sign = n < 0 ? '-' : '';
  return `${sign}${formattedInt}.${decPart}`;
};

export default function BudgetsScreen({ navigation, userId, setHasBudget, rates, accounts: propAccounts = [] }) {
  const [currentMonthIndex, setCurrentMonthIndex] = useState(new Date().getMonth());
  const [currentBudget, setCurrentBudget] = useState(null);
  const [monthMovements, setMonthMovements] = useState([]);
  const [accounts, setAccounts] = useState(propAccounts);
  const [loading, setLoading] = useState(true);

  const fetchBudgetMovementsAndAccounts = useCallback(async (monthIdx) => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const promises = [
        supabase
          .from('budgets')
          .select('*')
          .eq('user_id', userId)
          .eq('month_index', monthIdx)
          .maybeSingle(),
        supabase
          .from('movements')
          .select('*')
          .eq('user_id', userId)
          .eq('month_index', monthIdx)
      ];

      if (propAccounts.length === 0) {
        promises.push(
          supabase
            .from('accounts')
            .select('*')
            .eq('user_id', userId)
        );
      }

      const results = await Promise.all(promises);
      const budgetRes = results[0];
      const movementsRes = results[1];
      const accountsRes = results[2];

      if (budgetRes.error) {
        console.error('Error al cargar presupuesto:', budgetRes.error.message);
        setCurrentBudget(null);
      } else {
        setCurrentBudget(budgetRes.data);
      }

      if (!movementsRes.error && movementsRes.data) {
        setMonthMovements(movementsRes.data.map(m => ({
          ...m,
          amount: parseFloat(m.amount) || 0,
        })));
      } else {
        setMonthMovements([]);
      }

      if (accountsRes && !accountsRes.error && accountsRes.data) {
        setAccounts(accountsRes.data);
      } else if (propAccounts.length > 0) {
        setAccounts(propAccounts);
      }
    } catch (err) {
      console.error('Excepción al buscar presupuesto, movimientos o cuentas:', err);
      setCurrentBudget(null);
      setMonthMovements([]);
    } finally {
      setLoading(false);
    }
  }, [userId, propAccounts]);

  useEffect(() => {
    fetchBudgetMovementsAndAccounts(currentMonthIndex);
  }, [currentMonthIndex, fetchBudgetMovementsAndAccounts]);

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

  // Función helper para convertir cualquier monto de movimiento a Dólares (USD)
  const getMovementUsd = (m) => {
    const matchedAccount = accounts.find(acc => String(acc.id) === String(m.account_id || m.accountId));
    const movementCurrency = m.currency || (matchedAccount ? matchedAccount.currency : 'USD');
    const rawAmt = Math.abs(parseFloat(m.amount) || 0);
    return convertCurrencyAmount(rawAmt, movementCurrency, 'USD', rates) ?? rawAmt;
  };

  // Filtrar movimientos válidos del mes (excluyendo transferencias para que coincida exactamente con MovementsScreen)
  const validMovements = monthMovements.filter(m => {
    const cat = (m.category || '').toLowerCase();
    const title = (m.title || '').toLowerCase();
    const isTransfer = cat.includes('transferencia') || title.includes('transferencia');
    return !isTransfer;
  });

  // Cálculos financieros derivados del presupuesto guardado y movimientos reales en USD
  const incomes = currentBudget?.incomes || [];
  const expenses = currentBudget?.expenses || [];
  const savingsMode = currentBudget?.savings_mode || 'percent';
  const savingsValue = parseFloat(currentBudget?.savings_value || 0);

  const totalBudgetedIncome = incomes.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  
  // Calcular ingresos reales del mes en USD (m.amount > 0, excluyendo transferencias)
  const actualTotalIncome = validMovements
    .filter(m => parseFloat(m.amount) > 0)
    .reduce((sum, m) => sum + getMovementUsd(m), 0);

  const savingsAmount = savingsMode === 'percent' ? (totalBudgetedIncome * savingsValue) / 100 : savingsValue;
  const savingsPercent = totalBudgetedIncome > 0 ? ((savingsAmount / totalBudgetedIncome) * 100).toFixed(0) : 0;

  const totalBudgetedExpenses = expenses.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);

  // Calcular egresos reales del mes en USD (m.amount < 0, excluyendo transferencias)
  const actualTotalExpenses = validMovements
    .filter(m => parseFloat(m.amount) < 0)
    .reduce((sum, m) => sum + getMovementUsd(m), 0);

  const disposableAmount = totalBudgetedIncome - savingsAmount;
  const unassignedAmount = disposableAmount - totalBudgetedExpenses;
  const unassignedPercent = disposableAmount > 0 ? ((unassignedAmount / disposableAmount) * 100).toFixed(0) : 100;
  const expensesPercent = disposableAmount > 0 ? ((totalBudgetedExpenses / disposableAmount) * 100).toFixed(0) : 0;

  return (
    <View style={styles.container}>
      <CustomHeader 
        title="Presupuestos & Análisis (USD)"
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
              {/* Tarjeta de Resumen General en USD */}
              <View style={styles.budgetCardMain}>
                <View style={styles.budgetCardHeaderFlex}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardSubLabel}>Ingresos (USD - Presupuestado vs Real)</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
                      <Text style={styles.cardMainVal}>$ {formatCurrencyValue(actualTotalIncome)}</Text>
                      <Text style={{ color: '#888', fontSize: 13 }}>de $ {formatCurrencyValue(totalBudgetedIncome)}</Text>
                    </View>
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
                    <Text style={styles.statBoxTitle}>Ahorro objetivo</Text>
                    <Text style={styles.statBoxAmount}>$ {formatCurrencyValue(savingsAmount)}</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={styles.statBoxTitle}>Gastado real (USD)</Text>
                    <Text style={[styles.statBoxAmount, actualTotalExpenses > totalBudgetedExpenses && { color: '#f87171' }]}>
                      $ {formatCurrencyValue(actualTotalExpenses)}
                    </Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={styles.statBoxTitle}>Presup. Egresos</Text>
                    <Text style={[styles.statBoxAmount, { color: '#a3e635' }]}>$ {formatCurrencyValue(totalBudgetedExpenses)}</Text>
                  </View>
                </View>
              </View>

              {/* Lista de Ingresos (Presupuesto vs Real en USD) */}
              <Text style={styles.sectionTitle}>INGRESOS (ESTIMADO VS REAL EN USD)</Text>
              {incomes.map((inc, i) => {
                const budgeted = parseFloat(inc.amount) || 0;
                const actual = validMovements
                  .filter(m => parseFloat(m.amount) > 0 && (m.category?.toLowerCase() === inc.name?.toLowerCase() || m.title?.toLowerCase().includes(inc.name?.toLowerCase())))
                  .reduce((s, m) => s + getMovementUsd(m), 0);
                const diff = actual - budgeted;

                return (
                  <View key={i} style={styles.itemRowCard}>
                    <View style={styles.itemRowLeft}>
                      <View style={[styles.iconBoxMini, { backgroundColor: 'rgba(16, 185, 129, 0.2)' }]}>
                        <Ionicons name={inc.icon || 'cash-outline'} size={16} color="#10b981" />
                      </View>
                      <View>
                        <Text style={styles.itemNameText}>{inc.name}</Text>
                        <Text style={styles.itemSubText}>Presupuestado: $ {formatCurrencyValue(budgeted)}</Text>
                      </View>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.itemAmountText}>$ {formatCurrencyValue(actual)}</Text>
                      <Text style={[styles.itemDiffText, diff >= 0 ? { color: '#10b981' } : { color: '#f87171' }]}>
                        {diff >= 0 ? `+ $${formatCurrencyValue(diff)} (Mayor)` : `- $${formatCurrencyValue(Math.abs(diff))}`}
                      </Text>
                    </View>
                  </View>
                );
              })}

              {/* Lista de Egresos (Presupuesto vs Gasto Real en USD) */}
              <Text style={styles.sectionTitle}>EGRESOS Y GASTOS (ANÁLISIS EN USD)</Text>
              {expenses.map((exp, i) => {
                const budgeted = parseFloat(exp.amount) || 0;
                const actual = validMovements
                  .filter(m => parseFloat(m.amount) < 0 && (m.category?.toLowerCase() === exp.name?.toLowerCase() || m.title?.toLowerCase().includes(exp.name?.toLowerCase())))
                  .reduce((s, m) => s + getMovementUsd(m), 0);

                const remaining = budgeted - actual;
                const isOver = actual > budgeted;
                const progress = budgeted > 0 ? Math.min((actual / budgeted) * 100, 100) : (actual > 0 ? 100 : 0);

                return (
                  <View key={i} style={styles.itemRowCardDetailed}>
                    <View style={styles.itemRowTop}>
                      <View style={styles.itemRowLeft}>
                        <View style={[styles.iconBoxMini, { backgroundColor: 'rgba(248, 113, 113, 0.2)' }]}>
                          <Ionicons name={exp.icon || 'arrow-down-outline'} size={16} color="#f87171" />
                        </View>
                        <View>
                          <Text style={styles.itemNameText}>{exp.name}</Text>
                          <Text style={styles.itemSubText}>Presupuesto: $ {formatCurrencyValue(budgeted)}</Text>
                        </View>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={[styles.itemAmountText, isOver && { color: '#f87171' }]}>$ {formatCurrencyValue(actual)}</Text>
                        <Text style={[styles.itemDiffText, isOver ? { color: '#f87171' } : { color: '#a3e635' }]}>
                          {isOver ? `¡Excedido por $${formatCurrencyValue(actual - budgeted)}!` : `Restante: $${formatCurrencyValue(remaining)}`}
                        </Text>
                      </View>
                    </View>

                    {/* Barra de progreso de gasto */}
                    <View style={styles.progressBarTrack}>
                      <View
                        style={[
                          styles.progressBarFill,
                          { width: `${progress}%`, backgroundColor: isOver ? '#f87171' : '#a3e635' }
                        ]}
                      />
                    </View>
                  </View>
                );
              })}
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
  cardMainVal: { color: '#fff', fontSize: 26, fontWeight: 'bold' },
  editBudgetMiniBtn: { flexDirection: 'row', backgroundColor: '#333', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 12, alignItems: 'center' },
  
  budgetStatsRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#252525', paddingTop: 15 },
  statBox: { flex: 1, alignItems: 'center' },
  statBoxTitle: { color: '#888', fontSize: 11, marginBottom: 4 },
  statBoxAmount: { color: '#fff', fontSize: 13, fontWeight: 'bold' },

  sectionTitle: { color: '#888', fontSize: 11, fontWeight: 'bold', marginTop: 20, marginBottom: 10, letterSpacing: 0.5 },
  itemRowCard: { backgroundColor: '#1a1a1a', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderRadius: 16, marginBottom: 10, borderWidth: 1, borderColor: '#222' },
  itemRowCardDetailed: { backgroundColor: '#1a1a1a', padding: 14, borderRadius: 16, marginBottom: 10, borderWidth: 1, borderColor: '#222' },
  itemRowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  itemRowLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 10 },
  iconBoxMini: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  itemNameText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  itemSubText: { color: '#888', fontSize: 11, marginTop: 2 },
  itemAmountText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  itemDiffText: { fontSize: 11, fontWeight: '600', marginTop: 2 },

  progressBarTrack: { height: 6, backgroundColor: '#262930', borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 3 },

  emptyStateCard: { backgroundColor: '#1a1a1a', borderRadius: 20, padding: 30, alignItems: 'center', borderWidth: 1, borderColor: '#222', marginTop: 30 },
  emptyTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: `6`, marginBottom: 6 },
  emptySubtitle: { color: '#888', fontSize: 13, textAlign: 'center', marginBottom: 20 },
  createBudgetBtn: { backgroundColor: '#a3e635', paddingVertical: 14, paddingHorizontal: 30, borderRadius: 25, alignItems: 'center' },
  createBudgetBtnText: { color: '#000', fontSize: 15, fontWeight: 'bold' }
});
