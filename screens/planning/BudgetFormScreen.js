import ThemedModal from "../../components/ThemedModal";
import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, Text, View, TouchableOpacity,
  Modal, Platform, KeyboardAvoidingView, ScrollView
} from 'react-native';
import { Alert } from '../../services/appAlert';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../services/supabase';
import { getUserCategoriesService } from '../../services/categoryService';
import CustomHeader from '../../components/CustomHeader';
import ScreenWrapper from '../../components/ScreenWrapper';
import { NUMERIC_KEYPAD_STYLES } from '../../components/numericKeypadStyles';
import Svg, { Circle } from 'react-native-svg';

const formatCurrencyValue = (num, currency = 'USD') => {
  const n = parseFloat(num || 0);
  if (isNaN(n)) return currency === 'USD' ? '0.00' : '0,00';

  const fixed = n.toFixed(2);
  const [intPart, decPart] = fixed.split('.');

  if (currency === 'USD') {
    const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return `${formattedInt}.${decPart}`;
  } else {
    const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `${formattedInt},${decPart}`;
  }
};

export default function BudgetFormScreen({ navigation, route, userId, setHasBudget }) {
  const { monthIndex = 8, existingBudget = null } = route?.params || {};
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(existingBudget?.month_index ?? monthIndex ?? 8);

  const [step, setStep] = useState(1);
  const [period, setPeriod] = useState(existingBudget?.period || 'Mensual');
  const [startDay, setStartDay] = useState(existingBudget?.start_day || 'Día 1');
  const [incomeType, setIncomeType] = useState(existingBudget?.income_type || 'Fijos');

  const [selectedIncomes, setSelectedIncomes] = useState(existingBudget?.incomes || []);
  const [incomeModalVisible, setIncomeModalVisible] = useState(false);

  const [savingsMode, setSavingsMode] = useState(existingBudget?.savings_mode || 'percent');
  const [savingsValue, setSavingsValue] = useState(existingBudget ? String(existingBudget.savings_value) : '20');

  const [selectedExpenses, setSelectedExpenses] = useState(existingBudget?.expenses || []);
  const [expenseModalVisible, setExpenseModalVisible] = useState(false);

  const [dbCategories, setDbCategories] = useState([]);

  const [calculatorModalVisible, setCalculatorModalVisible] = useState(false);
  const [editingTargetType, setEditingTargetType] = useState(null);
  const [editingIndex, setEditingIndex] = useState(null);
  const [calculatorRawValue, setCalculatorRawValue] = useState('000');

  useEffect(() => {
    const loadCategories = async () => {
      if (!userId) return;
      try {
        const cats = await getUserCategoriesService(userId);
        setDbCategories(cats);
      } catch (err) {
        console.error('Error al cargar categorías:', err);
      }
    };
    loadCategories();
  }, [userId]);

  const handleCopyPreviousBudget = async () => {
    if (!userId) return;
    const prevMonthIndex = selectedMonthIndex > 0 ? selectedMonthIndex - 1 : 11;

    try {
      const { data, error } = await supabase
        .from('budgets')
        .select('*')
        .eq('user_id', userId)
        .eq('month_index', prevMonthIndex)
        .maybeSingle();

      if (error || !data) {
        Alert.alert('Aviso', 'No se encontró un presupuesto registrado en el mes anterior.');
        return;
      }

      setSelectedIncomes(data.incomes || []);
      setSelectedExpenses(data.expenses || []);
      setSavingsMode(data.savings_mode || 'percent');
      setSavingsValue(String(data.savings_value || '20'));
      setPeriod(data.period || 'Mensual');
      setStartDay(data.start_day || 'Día 1');

      Alert.alert('¡Éxito!', 'Se ha copiado el presupuesto del mes anterior correctamente.');
    } catch (err) {
      console.error('Error al copiar presupuesto anterior:', err);
      Alert.alert('Error', 'No se pudo cargar el presupuesto anterior.');
    }
  };

  const totalIncome = selectedIncomes.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);

  const savingsAmount = savingsMode === 'percent'
    ? (totalIncome * (parseFloat(savingsValue) || 0)) / 100
    : (parseFloat(savingsValue) || 0);

  const savingsPercent = totalIncome > 0 ? ((savingsAmount / totalIncome) * 100).toFixed(0) : 0;
  const availablePercent = 100 - savingsPercent;

  const totalExpenses = selectedExpenses.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  const disposableAmount = totalIncome - savingsAmount;
  const unassignedAmount = disposableAmount - totalExpenses;
  const unassignedPercent = disposableAmount > 0 ? ((unassignedAmount / disposableAmount) * 100).toFixed(0) : 100;
  const expensesPercent = disposableAmount > 0 ? ((totalExpenses / disposableAmount) * 100).toFixed(0) : 0;
  const budgetProgressPercent = disposableAmount > 0 ? Math.min((totalExpenses / disposableAmount) * 100, 100) : 0;

  const openCalculatorFor = (type, index, currentAmount) => {
    setEditingTargetType(type);
    setEditingIndex(index);
    const cleanNum = Math.round((parseFloat(currentAmount) || 0) * 100).toString();
    setCalculatorRawValue(cleanNum.padStart(3, '0'));
    setCalculatorModalVisible(true);
  };

  const handleCalculatorPress = (digit) => {
    if (digit === 'del') {
      const newVal = calculatorRawValue.length > 3 ? calculatorRawValue.slice(0, -1) : '000';
      setCalculatorRawValue(newVal);
    } else {
      if (calculatorRawValue.length < 10) {
        setCalculatorRawValue(calculatorRawValue + digit);
      }
    }
  };

  const formatCalculatorDisplay = (rawStr) => {
    const padded = rawStr.padStart(3, '0');
    const integerPart = padded.slice(0, -2);
    const decimalPart = padded.slice(-2);
    const formattedInteger = parseInt(integerPart, 10).toLocaleString('en-US');
    return `${formattedInteger}.${decimalPart}`;
  };

  const saveCalculatorValue = () => {
    const numericVal = parseInt(calculatorRawValue, 10) / 100;

    if (editingTargetType === 'savings') {
      setSavingsValue(savingsMode === 'percent' ? numericVal.toFixed(0) : numericVal.toFixed(2));
    } else if (editingTargetType === 'income') {
      const updated = [...selectedIncomes];
      updated[editingIndex].amount = numericVal.toFixed(2);
      setSelectedIncomes(updated);
    } else if (editingTargetType === 'expense') {
      const updated = [...selectedExpenses];
      updated[editingIndex].amount = numericVal.toFixed(2);
      setSelectedExpenses(updated);
    }
    setCalculatorModalVisible(false);
  };

  const getStructuredCategories = (typeFilter) => {
    const parents = dbCategories.filter(c => !c.parent_id && c.type === typeFilter);
    let result = [];
    parents.forEach(parent => {
      result.push({
        id: parent.id,
        name: parent.name,
        icon: parent.icon || (typeFilter === 'ingresos' ? 'cash-outline' : 'arrow-down-outline'),
        color: parent.color || (typeFilter === 'ingresos' ? '#10b981' : '#3b82f6'),
        isSub: false
      });
      const children = dbCategories.filter(c => c.parent_id === parent.id);
      children.forEach(child => {
        result.push({
          id: child.id,
          name: `↳ ${child.name}`,
          icon: child.icon || parent.icon || 'ellipse-outline',
          color: child.color || parent.color || '#888',
          isSub: true,
          parentName: parent.name
        });
      });
    });
    return result;
  };

  const dynamicIncomesList = getStructuredCategories('ingresos');
  const dynamicExpensesList = getStructuredCategories('egresos');

  const handleSaveBudget = async () => {
    if (!userId) {
      Alert.alert('Error', 'Usuario no identificado.');
      return;
    }

    try {
      const budgetPayload = {
        user_id: userId,
        month_index: selectedMonthIndex,
        period: period,
        start_day: startDay,
        income_type: incomeType,
        incomes: selectedIncomes,
        expenses: selectedExpenses,
        savings_mode: savingsMode,
        savings_value: parseFloat(savingsValue) || 0,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('budgets')
        .upsert(budgetPayload, { onConflict: 'user_id, month_index' });

      if (error) {
        Alert.alert('Error', error.message);
        return;
      }

      if (setHasBudget) setHasBudget(true);
      navigation('budgets');
    } catch (err) {
      console.error('Error al guardar presupuesto:', err);
      Alert.alert('Error', 'No se pudo guardar el presupuesto.');
    }
  };

  const handleBackNavigation = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      navigation('budgets');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.wizardFullScreen}
    >
      <CustomHeader
        title={`Paso ${step} de 4`}
        onBackPress={handleBackNavigation}
        rightComponent={
          <View style={styles.progressBarRow}>
            {[1, 2, 3, 4].map(i => (
              <View key={i} style={[styles.progressSegment, step >= i && styles.progressSegmentActive]} />
            ))}
          </View>
        }
      />

      {step === 1 && (
        <ScreenWrapper contentContainerStyle={styles.wizardScrollBody} showsVerticalScrollIndicator={false}>
          <View style={styles.wizardHeaderFlex}>
            <View style={{ flex: 1 }}>
              <Text style={styles.wizardTitle}>Período del presupuesto</Text>
              <Text style={styles.wizardSubtitle}>Define cada cuánto se renueva tu presupuesto</Text>
            </View>
            {!existingBudget && (
              <TouchableOpacity style={styles.copyPreviousBtn} onPress={handleCopyPreviousBudget} activeOpacity={0.7}>
                <Ionicons name="copy-outline" size={14} color="#a3e635" />
                <Text style={styles.copyPreviousText}>Copiar mes anterior</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.optionSwitchRow}>
            <TouchableOpacity
              style={[styles.switchOptionBtn, period === 'Quincenal' && styles.switchOptionActive]}
              onPress={() => setPeriod('Quincenal')}
            >
              <Text style={[styles.switchOptionText, period === 'Quincenal' && { color: '#fff' }]}>Quincenal</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.switchOptionBtn, period === 'Mensual' && styles.switchOptionActive]}
              onPress={() => setPeriod('Mensual')}
            >
              <Text style={[styles.switchOptionText, period === 'Mensual' && { color: '#fff' }]}>Mensual</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.wizardLabelSection}>DÍA DE INICIO</Text>
          <View style={styles.optionSwitchRow}>
            <TouchableOpacity
              style={[styles.switchOptionBtn, startDay === 'Día 1' && styles.switchOptionActive]}
              onPress={() => setStartDay('Día 1')}
            >
              <Text style={[styles.switchOptionText, startDay === 'Día 1' && { color: '#fff' }]}>Día 1</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.switchOptionBtn, startDay === 'Día 15' && styles.switchOptionActive]}
              onPress={() => setStartDay('Día 15')}
            >
              <Text style={[styles.switchOptionText, startDay === 'Día 15' && { color: '#fff' }]}>Día 15</Text>
            </TouchableOpacity>
          </View>

          {incomeModalVisible ? (
            <View style={{ marginTop: 20, backgroundColor: '#161616', borderRadius: 20, padding: 15, borderWidth: 1, borderColor: '#333' }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>Selecciona tus Ingresos</Text>
                <TouchableOpacity onPress={() => setIncomeModalVisible(false)}>
                  <Ionicons name="close" size={22} color="#fff" />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ maxHeight: 250 }} nestedScrollEnabled={true}>
                {dynamicIncomesList.map(item => {
                  const isSelected = selectedIncomes.some(i => i.id === item.id);
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.selectorRowItem, item.isSub && { paddingLeft: 20, backgroundColor: 'rgba(255,255,255,0.02)' }]}
                      onPress={() => {
                        if (isSelected) {
                          setSelectedIncomes(selectedIncomes.filter(i => i.id !== item.id));
                        } else {
                          setSelectedIncomes([...selectedIncomes, { ...item, amount: '0.00' }]);
                        }
                      }}
                    >
                      <View style={styles.itemAssignedLeft}>
                        <View style={[styles.miniIconBox, { backgroundColor: `${item.color}20` }]}>
                          <Ionicons name={item.icon} size={16} color={item.color} />
                        </View>
                        <Text style={[styles.itemAssignedName, item.isSub && { fontSize: 13, color: '#ccc' }]}>{item.name}</Text>
                      </View>
                      <View style={[styles.radioCircle, isSelected && styles.radioCircleActive]}>
                        {isSelected && <Ionicons name="checkmark" size={12} color="#000" />}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <TouchableOpacity
                style={styles.primaryButtonWizard}
                onPress={() => setIncomeModalVisible(false)}
              >
                <Text style={styles.primaryButtonText}>Continuar</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={{ marginTop: 20, marginBottom: 10 }}>
                <Text style={styles.wizardTitle}>¿Cuáles son tus ingresos?</Text>
                {selectedIncomes.length > 0 && (
                  <View style={{ flexDirection: 'row', justifyContent: 'flex-start', marginTop: 8 }}>
                    <TouchableOpacity
                      onPress={() => setIncomeModalVisible(true)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: 'rgba(163,230,53,0.12)',
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: 'rgba(163,230,53,0.35)',
                        gap: 6
                      }}
                    >
                      <Ionicons name="add-circle-outline" size={14} color="#a3e635" />
                      <Text style={{ color: '#a3e635', fontSize: 12, fontWeight: '700' }}>Gestionar ingresos</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {selectedIncomes.length > 0 && (
                selectedIncomes.map((inc, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.itemAssignedCard}
                    activeOpacity={0.8}
                    onPress={() => openCalculatorFor('income', index, inc.amount)}
                  >
                    <View style={styles.itemAssignedLeft}>
                      <View style={[styles.miniIconBox, { backgroundColor: 'rgba(16, 185, 129, 0.2)' }]}>
                        <Ionicons name={inc.icon || 'cash-outline'} size={16} color="#10b981" />
                      </View>
                      <Text style={styles.itemAssignedName}>{inc.name}</Text>
                    </View>
                    <View style={styles.itemAssignedRight}>
                      <Text style={styles.miniAmountDisplayText}>$ {formatCurrencyValue(inc.amount)}</Text>
                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation();
                          setSelectedIncomes(selectedIncomes.filter((_, i) => i !== index));
                        }}
                        style={{ padding: 4 }}
                      >
                        <Ionicons name="close" size={16} color="#888" style={{ marginLeft: 8 }} />
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                ))
              )}

              {selectedIncomes.length > 0 && (
                <View style={styles.totalSummaryCard}>
                  <Text style={styles.totalSummaryLabel}>Total de ingresos</Text>
                  <Text style={styles.totalSummaryVal}>$ {formatCurrencyValue(totalIncome)}</Text>
                </View>
              )}

              {selectedIncomes.length === 0 ? (
                <TouchableOpacity
                  style={styles.primaryButtonWizard}
                  onPress={() => setIncomeModalVisible(true)}
                >
                  <Text style={styles.primaryButtonText}>Seleccionar ingresos</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.primaryButtonWizard}
                  onPress={() => setStep(2)}
                >
                  <Text style={styles.primaryButtonText}>Continuar</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </ScreenWrapper>
      )}

      {step === 2 && (
        <ScreenWrapper contentContainerStyle={styles.wizardScrollBody} showsVerticalScrollIndicator={false}>
          <Text style={styles.wizardTitle}>¿Cuánto deseas ahorrar?</Text>

          <View style={styles.optionSwitchRow}>
            <TouchableOpacity
              style={[styles.switchOptionBtn, savingsMode === 'percent' && styles.switchOptionActive]}
              onPress={() => setSavingsMode('percent')}
            >
              <Text style={[styles.switchOptionText, savingsMode === 'percent' && { color: '#fff' }]}>% Porcentaje</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.switchOptionBtn, savingsMode === 'amount' && styles.switchOptionActive]}
              onPress={() => setSavingsMode('amount')}
            >
              <Text style={[styles.switchOptionText, savingsMode === 'amount' && { color: '#fff' }]}>$ Monto</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.savingsInputCard}
            activeOpacity={0.8}
            onPress={() => openCalculatorFor('savings', null, savingsValue)}
          >
            <Text style={styles.savingsInputLabel}>{savingsMode === 'percent' ? 'Porcentaje de ahorro' : 'Monto de ahorro'}</Text>
            <View style={styles.savingsInputRow}>
              <Text style={styles.bigSavingsInput}>{savingsValue}</Text>
              <Text style={styles.savingsUnitText}>{savingsMode === 'percent' ? '%' : '$'}</Text>
            </View>
            {savingsMode === 'percent' && (
              <Text style={{ color: '#a3e635', fontSize: 13, marginTop: 8, fontWeight: '600' }}>
                Equivale a: $ {formatCurrencyValue(savingsAmount)} de tus ingresos totales
              </Text>
            )}
          </TouchableOpacity>

          <View style={styles.ringChartPreviewCard}>
            <View style={styles.ringInfoCol}>
              <Text style={styles.ringTotalLabel}>Ingreso total</Text>
              <Text style={styles.ringTotalVal}>$ {formatCurrencyValue(totalIncome)}</Text>
              <View style={styles.ringLegendRow}>
                <View style={styles.legendBadgeBlue}><Text style={styles.legendText}>Ahorro {savingsPercent}%</Text></View>
                <View style={styles.legendBadgeGreen}><Text style={styles.legendText}>Disponible {availablePercent}%</Text></View>
              </View>
            </View>
          </View>

          <TouchableOpacity style={styles.primaryButtonWizard} onPress={() => setStep(3)}>
            <Text style={styles.primaryButtonText}>Continuar</Text>
          </TouchableOpacity>
        </ScreenWrapper>
      )}

      {step === 3 && (
        <ScreenWrapper contentContainerStyle={styles.wizardScrollBody} showsVerticalScrollIndicator={false}>
          <Text style={styles.wizardTitle}>¿En qué gastarás tu dinero?</Text>

          <View style={styles.disposableHeaderCard}>
            <Text style={styles.disposableLabel}>Saldo Disponible</Text>
            <Text style={styles.disposableVal}>$ {formatCurrencyValue(disposableAmount)}</Text>
            <Text style={styles.disposableSub}>Por asignar: $ {formatCurrencyValue(unassignedAmount)} ({unassignedPercent}%)</Text>

            <View style={styles.wizardChartContainer}>
              <View style={styles.wizardChartTrack}>
                <View style={[styles.wizardChartFill, { width: `${budgetProgressPercent}%`, backgroundColor: '#a3e635' }]} />
              </View>
              <View style={styles.wizardChartLabels}>
                <Text style={{ color: '#888', fontSize: 11 }}>Asignado: {expensesPercent}%</Text>
                <Text style={{ color: '#888', fontSize: 11 }}>Libre: {unassignedPercent}%</Text>
              </View>
            </View>
          </View>

          {expenseModalVisible ? (
            <View style={{ marginTop: 20, backgroundColor: '#161616', borderRadius: 20, padding: 15, borderWidth: 1, borderColor: '#333' }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>Selecciona tus Egresos</Text>
                <TouchableOpacity onPress={() => setExpenseModalVisible(false)}>
                  <Ionicons name="close" size={22} color="#fff" />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ maxHeight: 250 }} nestedScrollEnabled={true}>
                {dynamicExpensesList.map(item => {
                  const isSelected = selectedExpenses.some(e => e.id === item.id);
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.selectorRowItem, item.isSub && { paddingLeft: 20, backgroundColor: 'rgba(255,255,255,0.02)' }]}
                      onPress={() => {
                        if (isSelected) {
                          setSelectedExpenses(selectedExpenses.filter(e => e.id !== item.id));
                        } else {
                          setSelectedExpenses([...selectedExpenses, { ...item, amount: '0.00' }]);
                        }
                      }}
                    >
                      <View style={styles.itemAssignedLeft}>
                        <View style={[styles.miniIconBox, { backgroundColor: `${item.color}20` }]}>
                          <Ionicons name={item.icon} size={16} color={item.color} />
                        </View>
                        <Text style={[styles.itemAssignedName, item.isSub && { fontSize: 13, color: '#ccc' }]}>{item.name}</Text>
                      </View>
                      <View style={[styles.radioCircle, isSelected && styles.radioCircleActive]}>
                        {isSelected && <Ionicons name="checkmark" size={12} color="#000" />}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <TouchableOpacity
                style={styles.primaryButtonWizard}
                onPress={() => setExpenseModalVisible(false)}
              >
                <Text style={styles.primaryButtonText}>Continuar</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={{ marginTop: 10, marginBottom: 10 }}>
                <Text style={styles.wizardLabelSection}>TUS EGRESOS</Text>
                {selectedExpenses.length > 0 && (
                  <View style={{ flexDirection: 'row', justifyContent: 'flex-start', marginTop: 6 }}>
                    <TouchableOpacity
                      onPress={() => setExpenseModalVisible(true)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: 'rgba(59,130,246,0.12)',
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: 'rgba(59,130,246,0.35)',
                        gap: 6
                      }}
                    >
                      <Ionicons name="add-circle-outline" size={14} color="#3b82f6" />
                      <Text style={{ color: '#3b82f6', fontSize: 12, fontWeight: '700' }}>Gestionar egresos</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {selectedExpenses.length === 0 ? (
                <View style={styles.emptyMiniCard}>
                  <Ionicons name="arrow-down-outline" size={24} color="#666" style={{ marginBottom: 8 }} />
                  <Text style={styles.emptyMiniText}>Sin egresos</Text>
                  <Text style={styles.emptyMiniSub}>Elige las categorías en las que vas a gastar.</Text>
                </View>
              ) : (
                selectedExpenses.map((exp, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.itemAssignedCard}
                    activeOpacity={0.8}
                    onPress={() => openCalculatorFor('expense', index, exp.amount)}
                  >
                    <View style={styles.itemAssignedLeft}>
                      <View style={[styles.miniIconBox, { backgroundColor: 'rgba(248, 113, 113, 0.2)' }]}>
                        <Ionicons name={exp.icon || 'arrow-down-outline'} size={16} color="#f87171" />
                      </View>
                      <View>
                        <Text style={styles.itemAssignedName}>{exp.name}</Text>
                        <Text style={{ color: '#666', fontSize: 10 }}>{exp.category}</Text>
                      </View>
                    </View>
                    <View style={styles.itemAssignedRight}>
                      <Text style={styles.miniAmountDisplayText}>$ {formatCurrencyValue(exp.amount)}</Text>
                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation();
                          setSelectedExpenses(selectedExpenses.filter((_, i) => i !== index));
                        }}
                        style={{ padding: 4 }}
                      >
                        <Ionicons name="close" size={16} color="#888" style={{ marginLeft: 8 }} />
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                ))
              )}

              {selectedExpenses.length === 0 ? (
                <TouchableOpacity style={styles.primaryButtonWizard} onPress={() => setExpenseModalVisible(true)}>
                  <Text style={styles.primaryButtonText}>Seleccionar egresos</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.primaryButtonWizard} onPress={() => setStep(4)}>
                  <Text style={styles.primaryButtonText}>Continuar</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </ScreenWrapper>
      )}

{step === 4 && (
        <ScreenWrapper contentContainerStyle={styles.wizardScrollBody} showsVerticalScrollIndicator={false}>
          <Text style={styles.wizardTitle}>Resumen del presupuesto</Text>
          <Text style={styles.wizardSubtitle}>Revisa que todo esté correcto antes de confirmar</Text>

          <View style={styles.activeBudgetCard}>
            {(() => {
              const savLen = (parseFloat(savingsPercent) / 100) * 50;
              const expLen = (parseFloat(expensesPercent) / 100) * 50;
              const freeLen = (parseFloat(unassignedPercent) / 100) * 50;

              const gap = 1.2;
              const sLenWithGap = Math.max(0, savLen - (savLen > 0 ? gap : 0));
              const eLenWithGap = Math.max(0, expLen - (expLen > 0 ? gap : 0));
              const fLenWithGap = Math.max(0, freeLen - (freeLen > 0 ? gap : 0));

              const eOffset = -(savLen + (savLen > 0 ? gap : 0));
              const fOffset = -((savLen + expLen) + ((savLen > 0 && expLen > 0) ? gap * 2 : (savLen > 0 || expLen > 0 ? gap : 0)));

              return (
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start' }}>
                  {/* Gráfico de arco semi-circular con rotate -100deg, sin cortes en altura y pegado a la izquierda */}
                  <View style={{ width: 120, height: 110, justifyContent: 'center', alignItems: 'center', overflow: 'visible', marginLeft: -10 }}>
                    <Svg width={130} height={130} viewBox="0 0 42 42" style={{ transform: [{ rotate: '-100deg' }] }}>
                      {/* Pista de fondo gris */}
                      <Circle
                        cx="21"
                        cy="21"
                        r="15.91549430918954"
                        fill="transparent"
                        stroke="#222"
                        strokeWidth="8.5"
                        strokeDasharray="50 100"
                      />

                      {/* 1. Segmento de AHORRO */}
                      {savLen > 0 && (
                        <Circle
                          cx="21"
                          cy="21"
                          r="15.91549430918954"
                          fill="transparent"
                          stroke="#60a5fa"
                          strokeWidth="8.5"
                          strokeDasharray={`${sLenWithGap} 100`}
                          strokeDashoffset="0"
                        />
                      )}

                      {/* 2. Segmento de EGRESOS */}
                      {expLen > 0 && (
                        <Circle
                          cx="21"
                          cy="21"
                          r="15.91549430918954"
                          fill="transparent"
                          stroke="#f87171"
                          strokeWidth="8.5"
                          strokeDasharray={`${eLenWithGap} 100`}
                          strokeDashoffset={`${eOffset}`}
                        />
                      )}

                      {/* 3. Segmento LIBRE */}
                      {freeLen > 0 && (
                        <Circle
                          cx="21"
                          cy="21"
                          r="15.91549430918954"
                          fill="transparent"
                          stroke="#a3e635"
                          strokeWidth="8.5"
                          strokeDasharray={`${fLenWithGap} 100`}
                          strokeDashoffset={`${fOffset}`}
                        />
                      )}
                    </Svg>
                  </View>

                  <View style={{ flex: 1, marginLeft: 15, justifyContent: 'center' }}>
                    <Text style={{ color: '#888', fontSize: 12, marginBottom: 2 }}>Ingresos</Text>
                    <Text style={{ color: '#fff', fontSize: 21, fontWeight: 'bold' }} numberOfLines={1} adjustsFontSizeToFit>
                      $ {formatCurrencyValue(totalIncome)}
                    </Text>
                  </View>
                </View>
              );
            })()}

            <View style={{ flexDirection: 'row', marginTop: 20, justifyContent: 'space-between' }}>
              <View style={styles.blueBadgeTag}><Text style={styles.blueBadgeText}>Ahorro {savingsPercent}%</Text></View>
              <View style={styles.redBadgeTag}><Text style={styles.redBadgeText}>Egresos {expensesPercent}%</Text></View>
              <View style={styles.greenBadgeTag}><Text style={styles.greenBadgeText}>Libre {unassignedPercent}%</Text></View>
            </View>
          </View>

          <Text style={styles.wizardLabelSection}>FUENTES DE INGRESO</Text>
          {selectedIncomes.map((inc, i) => (
            <View key={i} style={styles.categoryItemCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 10 }}>
                <View style={[styles.categoryIconCircle, { backgroundColor: '#111' }]}>
                  <Ionicons name={inc.icon || 'cash-outline'} size={16} color="#10b981" />
                </View>
                <Text style={styles.itemAssignedName} numberOfLines={1}>{inc.name}</Text>
              </View>
              <Text style={styles.categoryAmountText}>$ {formatCurrencyValue(inc.amount)}</Text>
            </View>
          ))}

          <Text style={styles.wizardLabelSection}>DISTRIBUCIÓN DE EGRESOS</Text>
          {selectedExpenses.map((exp, i) => (
            <View key={i} style={styles.categoryItemCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 10 }}>
                <View style={[styles.categoryIconCircle, { backgroundColor: '#111' }]}>
                  <Ionicons name={exp.icon || 'arrow-down-outline'} size={16} color="#3b82f6" />
                </View>
                <Text style={styles.itemAssignedName} numberOfLines={1}>{exp.name}</Text>
              </View>
              <Text style={styles.categoryAmountText}>$ {formatCurrencyValue(exp.amount)}</Text>
            </View>
          ))}

          <TouchableOpacity
            style={[styles.primaryButtonWizard, { marginTop: 30, backgroundColor: '#a3e635' }]}
            onPress={handleSaveBudget}
          >
            <Text style={[styles.primaryButtonText, { color: '#000' }]}>Guardar cambios</Text>
          </TouchableOpacity>
        </ScreenWrapper>
      )}

      <ThemedModal visible={calculatorModalVisible} animationType="fade" transparent={true}>
        <View style={styles.calcModalBackdrop}>
          <View style={styles.calcModalContainer}>
            <Text style={styles.calcTitle}>Ingresa el monto</Text>
            <Text style={styles.calcDisplayAmount}>
              {editingTargetType === 'savings' && savingsMode === 'percent'
                ? `${parseInt(calculatorRawValue, 10) / 100}%`
                : `$ ${formatCalculatorDisplay(calculatorRawValue)}`
              }
            </Text>

            <View style={styles.calcKeypadWrapper}>
              {[
                ['1', '2', '3'],
                ['4', '5', '6'],
                ['7', '8', '9'],
                ['00', '0', 'del']
              ].map((row, rIndex) => (
                <View key={rIndex} style={styles.calcKeypadRow}>
                  {row.map((btn) => (
                    <TouchableOpacity
                      key={btn}
                      style={styles.calcKeypadButton}
                      onPress={() => handleCalculatorPress(btn)}
                    >
                      {btn === 'del' ? (
                        <Ionicons name="backspace-outline" size={22} color="#fff" />
                      ) : (
                        <Text style={styles.calcKeypadText}>{btn}</Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              ))}
            </View>

            <View style={styles.calcActionsRow}>
              <TouchableOpacity
                style={styles.calcCancelBtn}
                onPress={() => setCalculatorModalVisible(false)}
              >
                <Text style={styles.calcCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.calcConfirmBtn}
                onPress={saveCalculatorValue}
              >
                <Text style={styles.calcConfirmText}>Aceptar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ThemedModal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wizardFullScreen: { flex: 1, backgroundColor: '#000', paddingHorizontal: 20 },
  progressBarRow: { flexDirection: 'row', justifyContent: 'space-between', width: 90 },
  progressSegment: { flex: 1, height: 4, backgroundColor: '#333', marginHorizontal: 2, borderRadius: 2 },
  progressSegmentActive: { backgroundColor: '#a3e635' },

  wizardScrollBody: { paddingBottom: 40, paddingTop: 10 },
  wizardTitle: { color: '#fff', fontSize: 22, fontWeight: 'bold', marginBottom: 6 },
  wizardSubtitle: { color: '#888', fontSize: 13, marginBottom: 20 },
  wizardLabelSection: {
    color: '#666',
    fontSize: 11,
    fontWeight: 'bold',
    marginTop: 22,
    marginBottom: 10,
    textAlign: 'left',
    alignSelf: 'flex-start'
  },
  wizardHeaderFlex: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  wizardActionText: { color: '#a3e635', fontSize: 13, fontWeight: 'bold' },

  copyPreviousBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a1a1a', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 12, borderWidth: 1, borderColor: '#333' },
  copyPreviousText: { color: '#a3e635', fontSize: 11, fontWeight: 'bold', marginLeft: 4 },

  optionSwitchRow: { flexDirection: 'row', backgroundColor: '#1a1a1a', borderRadius: 20, padding: 4, borderWidth: 1, borderColor: '#222', marginBottom: 10 },
  switchOptionBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 16 },
  switchOptionActive: { backgroundColor: '#333' },
  switchOptionText: { color: '#888', fontSize: 13, fontWeight: 'bold' },

  emptyMiniCard: { backgroundColor: '#1a1a1a', borderRadius: 20, padding: 25, alignItems: 'center', borderWidth: 1, borderColor: '#222', marginVertical: 10 },
  emptyMiniText: { color: '#fff', fontSize: 15, fontWeight: 'bold', marginBottom: 4 },
  emptyMiniSub: { color: '#888', fontSize: 12 },

  itemAssignedCard: { backgroundColor: '#1a1a1a', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderRadius: 16, marginBottom: 10, borderWidth: 1, borderColor: '#222', zIndex: 1 },
  itemAssignedLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  miniIconBox: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  itemAssignedName: { color: '#fff', fontSize: 14, fontWeight: 'bold', flex: 1 },
  itemAssignedRight: { flexDirection: 'row', alignItems: 'center' },
  miniAmountDisplayText: { color: '#a3e635', fontSize: 15, fontWeight: 'bold' },

  totalSummaryCard: { backgroundColor: '#1a1a1a', padding: 16, borderRadius: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, borderWidth: 1, borderColor: '#222', marginBottom: 20 },
  totalSummaryLabel: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  totalSummaryVal: { color: '#a3e635', fontSize: 18, fontWeight: 'bold' },

  savingsInputCard: { backgroundColor: '#1a1a1a', borderRadius: 20, padding: 20, alignItems: 'center', marginVertical: 20, borderWidth: 1, borderColor: '#222' },
  savingsInputLabel: { color: '#888', fontSize: 13, marginBottom: 10 },
  savingsInputRow: { flexDirection: 'row', alignItems: 'center' },
  bigSavingsInput: { color: '#fff', fontSize: 40, fontWeight: 'bold', textAlign: 'center', minWidth: 60 },
  savingsUnitText: { color: '#fff', fontSize: 32, fontWeight: 'bold', marginLeft: 5 },

  ringChartPreviewCard: { backgroundColor: '#1a1a1a', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#222', marginBottom: 20 },
  ringInfoCol: { alignItems: 'flex-start' },
  ringTotalLabel: { color: '#888', fontSize: 12, marginBottom: 4 },
  ringTotalVal: { color: '#fff', fontSize: 24, fontWeight: 'bold', marginBottom: 15 },
  ringLegendRow: { flexDirection: 'row' },
  legendBadgeBlue: { backgroundColor: 'rgba(96, 165, 250, 0.2)', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 10, marginRight: 10 },
  legendBadgeGreen: { backgroundColor: 'rgba(163, 230, 53, 0.2)', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 10 },
  legendText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },

  disposableHeaderCard: { backgroundColor: '#1a1a1a', borderRadius: 20, padding: 18, marginBottom: 15, borderWidth: 1, borderColor: '#222' },
  disposableLabel: { color: '#888', fontSize: 12, marginBottom: 2 },
  disposableVal: { color: '#fff', fontSize: 26, fontWeight: 'bold', marginBottom: 4 },
  disposableSub: { color: '#a3e635', fontSize: 12, fontWeight: '600' },

  wizardChartContainer: { marginTop: 15, paddingTop: 15, borderTopWidth: 1, borderTopColor: '#252525' },
  wizardChartTrack: { height: 8, backgroundColor: '#2a2a2a', borderRadius: 4, overflow: 'hidden', marginBottom: 6 },
  wizardChartFill: { height: '100%', borderRadius: 4 },
  wizardChartLabels: { flexDirection: 'row', justifyContent: 'space-between' },

  primaryButtonWizard: { backgroundColor: '#a3e635', width: '100%', paddingVertical: 14, borderRadius: 25, alignItems: 'center', marginTop: 15 },
  primaryButtonText: { color: '#000', fontSize: 15, fontWeight: 'bold' },

  selectorRowItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#252525' },
  radioCircle: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#666', justifyContent: 'center', alignItems: 'center' },
  radioCircleActive: { backgroundColor: '#a3e635', borderColor: '#a3e635' },

  activeBudgetCard: { backgroundColor: '#1a1a1a', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#222', width: '100%' },
  categoryItemCard: { backgroundColor: '#1a1a1a', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderRadius: 18, marginBottom: 10, borderWidth: 1, borderColor: '#222', width: '100%' },
  categoryIconCircle: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: 12, backgroundColor: '#111' },
  categoryAmountText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },

  blueBadgeTag: { backgroundColor: '#1e3a8a', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 10 },
  blueBadgeText: { color: '#60a5fa', fontSize: 11, fontWeight: 'bold' },
  redBadgeTag: { backgroundColor: '#7f1d1d', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 10 },
  redBadgeText: { color: '#f87171', fontSize: 11, fontWeight: 'bold' },
  greenBadgeTag: { backgroundColor: '#14532d', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 10 },
  greenBadgeText: { color: '#a3e635', fontSize: 11, fontWeight: 'bold' },

  calcModalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  calcModalContainer: { backgroundColor: '#141414', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 20, paddingBottom: 40, alignItems: 'center', borderWidth: 1, borderColor: '#333', width: '100%' },
  calcTitle: { color: '#888', fontSize: 14, marginBottom: 10, fontWeight: 'bold' },
  calcDisplayAmount: { color: '#a3e635', fontSize: 36, fontWeight: 'bold', marginBottom: 25 },

  calcKeypadWrapper: { width: '100%', maxWidth: 340, alignSelf: 'center', marginBottom: 15 },
  calcKeypadRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  calcKeypadButton: { flex: 1, aspectRatio: 1.6, backgroundColor: '#1f222a', borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginHorizontal: 6, borderWidth: 1, borderColor: '#2d3038' },
  calcKeypadText: { color: '#fff', fontSize: 22, fontWeight: 'bold' },

  calcActionsRow: { flexDirection: 'row', width: '100%', maxWidth: 340, justifyContent: 'space-between', marginTop: 15 },
  calcCancelBtn: { flex: 1, backgroundColor: '#262626', paddingVertical: 14, borderRadius: 20, alignItems: 'center', marginRight: 10 },
  calcCancelText: { color: '#aaa', fontSize: 15, fontWeight: 'bold' },
  calcConfirmBtn: { flex: 1, backgroundColor: '#a3e635', paddingVertical: 14, borderRadius: 20, alignItems: 'center', marginLeft: 10 },
  calcConfirmText: { color: '#000', fontSize: 15, fontWeight: 'bold' }
});