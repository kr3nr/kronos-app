import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, TextInput, Modal, Dimensions, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../services/supabase';
import CustomHeader from '../../components/CustomHeader';
import ScreenWrapper from '../../components/ScreenWrapper';

const { width } = Dimensions.get('window');

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const formatCurrencyValue = (num, currency = 'USD') => {
  const n = parseFloat(num || 0);
  if (isNaN(n)) return currency === 'VES' || currency === 'EUR' ? '0,00' : '0.00';
  
  const parts = n.toFixed(2).split('.');
  if (currency === 'VES' || currency === 'EUR') {
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return parts.join(',');
  } else {
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
  }
};

export default function AccountDetailScreen({ navigation, account, rates, movements, setMovements, categories = [], userId }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('Todos los movimientos');
   
  const [currentMonthIndex, setCurrentMonthIndex] = useState(new Date().getMonth());
  const [loading, setLoading] = useState(false);

  const handlePrevMonth = () => {
    setCurrentMonthIndex((prev) => (prev > 0 ? prev - 1 : 11));
  };

  const handleNextMonth = () => {
    setCurrentMonthIndex((prev) => (prev < 11 ? prev + 1 : 0));
  };

  const bcv = rates?.bcvRate || 36.5;

  // FILTRADO DE MOVIMIENTOS DE ESTA CUENTA
  const accountMovementsAll = (movements || []).filter(m => String(m.accountId || m.account_id) === String(account?.id));

  // CÁLCULO PRECISO DEL BALANCE DISPONIBLE EN TIEMPO REAL:
  // Sumamos los montos reales de todos los movimientos de la cuenta al balance inicial base
  const baseBalance = parseFloat(account?.initial_balance || account?.balance || 0);
  const totalMovementsSum = accountMovementsAll.reduce((sum, m) => sum + parseFloat(m.amount || 0), 0);
  const balance = accountMovementsAll.length > 0 ? baseBalance + totalMovementsSum : parseFloat(account?.balance || 0);

  const balanceInUSD = account?.currency === 'VES' ? (bcv > 0 ? balance / bcv : 0) : balance;

  const getCategoryDetails = (categoryName, movementType) => {
    const isIncome = movementType === 'Ingresos' || movementType === 'Ingreso' || parseFloat(movementType) > 0;
    
    if (!categoryName) {
      return {
        icon: isIncome ? 'arrow-up-outline' : 'arrow-down-outline',
        color: isIncome ? '#a3e635' : '#f87171'
      };
    }

    const cleanSearchName = categoryName.toLowerCase().trim();
    const found = (categories || []).find(
      c => (c.name || '').toLowerCase().trim() === cleanSearchName
    );

    if (found && found.icon) {
      return {
        icon: found.icon,
        color: found.color || (isIncome ? '#a3e635' : '#f87171')
      };
    }

    return {
      icon: isIncome ? 'arrow-up-outline' : 'arrow-down-outline',
      color: isIncome ? '#a3e635' : '#f87171'
    };
  };

  const filteredMovements = accountMovementsAll.filter(m => {
    const matchesMonth = (m.monthIndex !== undefined ? m.monthIndex : currentMonthIndex) === currentMonthIndex;
    const matchesSearch = (m.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (m.category || '').toLowerCase().includes(searchQuery.toLowerCase());
     
    if (!matchesMonth) return false;

    const isIncomeType = m.type === 'Ingresos' || m.type === 'Ingreso' || parseFloat(m.amount) > 0;
    const isExpenseType = m.type === 'Egresos' || m.type === 'Egreso' || parseFloat(m.amount) < 0;

    if (selectedFilter === 'Ingresos') return matchesSearch && isIncomeType;
    if (selectedFilter === 'Egresos') return matchesSearch && isExpenseType;
    if (selectedFilter === 'Transferencias') return matchesSearch && (m.category || '').toLowerCase().includes('transferencia');
    return matchesSearch;
  });

  const sortedMovements = [...filteredMovements].sort((a, b) => {
    if ((b.day || 0) !== (a.day || 0)) {
      return (b.day || 0) - (a.day || 0);
    }
    return (b.time || '').localeCompare(a.time || '');
  });

  const convertToUSD = (amount, movementCurrency) => {
    const rawVal = Math.abs(parseFloat(amount || 0));
    const curr = movementCurrency || account?.currency || 'USD';
    if (curr === 'VES') {
      return bcv > 0 ? rawVal / bcv : 0;
    }
    return rawVal;
  };

  const totalIncome = sortedMovements
    .filter(m => {
      const amt = parseFloat(m.amount || 0);
      return m.type === 'Ingresos' || m.type === 'Ingreso' || amt > 0;
    })
    .reduce((sum, m) => {
      const movementCurrency = m.currency || account?.currency || 'USD';
      return sum + convertToUSD(m.amount, movementCurrency);
    }, 0);

  const totalExpense = sortedMovements
    .filter(m => {
      const amt = parseFloat(m.amount || 0);
      return m.type === 'Egresos' || m.type === 'Egreso' || amt < 0;
    })
    .reduce((sum, m) => {
      const movementCurrency = m.currency || account?.currency || 'USD';
      return sum + convertToUSD(m.amount, movementCurrency);
    }, 0);

  const groupedMovements = sortedMovements.reduce((groups, movement) => {
    const dayKey = movement.day ? `${movement.day} oct` : 'Recientes';
    if (!groups[dayKey]) {
      groups[dayKey] = [];
    }
    groups[dayKey].push(movement);
    return groups;
  }, {});

  const handleDeleteMovement = (movement) => {
    setTimeout(() => {
      Alert.alert(
        'Eliminar Movimiento',
        `¿Estás seguro de que deseas eliminar "${movement.title}"?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Eliminar',
            style: 'destructive',
            onPress: async () => {
              setLoading(true);
              try {
                const { error } = await supabase
                  .from('movements')
                  .delete()
                  .eq('id', movement.id);

                if (error) {
                  Alert.alert('Error', error.message);
                  setLoading(false);
                  return;
                }

                const rawAmount = parseFloat(movement.amount || 0);
                const newBalance = balance - rawAmount;

                await supabase
                  .from('accounts')
                  .update({ balance: newBalance })
                  .eq('id', account.id);

                const updatedMovements = movements.filter(m => String(m.id) !== String(movement.id));
                setMovements(updatedMovements);
                 
                if (account && typeof account === 'object') {
                  account.balance = newBalance;
                }
              } catch (err) {
                console.error('Error al eliminar movimiento:', err);
                Alert.alert('Error', 'Ocurrió un error inesperado al intentar eliminar.');
              } finally {
                setLoading(false);
              }
            }
          }
        ]
      );
    }, 100);
  };

  return (
    <View style={styles.container}>
      <CustomHeader 
        title={account?.name || 'Cuenta'}
        onBackPress={() => navigation('accounts')}
        rightComponent={
          <TouchableOpacity style={styles.helpButton}>
            <Ionicons name="help-outline" size={18} color="#fff" />
          </TouchableOpacity>
        }
      />

      <ScreenWrapper contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={16} color="#666" style={styles.searchIcon} />
            <TextInput 
              placeholder="Buscar movimiento..." 
              placeholderTextColor="#666" 
              style={styles.input}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <TouchableOpacity style={styles.filterButton} onPress={() => setFilterModalVisible(true)}>
            <Ionicons name="options-outline" size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.balanceSection}>
          <Text style={styles.balanceLabel}>Balance disponible</Text>
          <Text style={styles.balanceAmount}>
            {account?.currency === 'VES' ? 'Bs.' : '$'} {formatCurrencyValue(balance, account?.currency)}
          </Text>
          <Text style={styles.balanceUsd}>≈ ${formatCurrencyValue(balanceInUSD, 'USD')}</Text>
        </View>

        <View style={styles.actionButtonsRow}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => navigation('addMovement')}>
            <View style={styles.actionIconCircle}><Ionicons name="add" size={22} color="#fff" /></View>
            <Text style={styles.actionText}>Movimiento</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => navigation('transfer')}>
            <View style={styles.actionIconCircle}><Ionicons name="swap-horizontal" size={20} color="#fff" /></View>
            <Text style={styles.actionText}>Transferir</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => navigation('editAccount')}>
            <View style={styles.actionIconCircle}><Ionicons name="create-outline" size={18} color="#fff" /></View>
            <Text style={styles.actionText}>Editar</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.monthSelector}>
          <TouchableOpacity onPress={handlePrevMonth}><Ionicons name="chevron-back" size={20} color="#a3e635" /></TouchableOpacity>
          <Text style={styles.monthText}>{MONTHS[currentMonthIndex]}</Text>
          <TouchableOpacity onPress={handleNextMonth}><Ionicons name="chevron-forward" size={20} color="#a3e635" /></TouchableOpacity>
        </View>

        <View style={styles.flowRow}>
          <View style={styles.flowCard}>
            <View style={styles.flowHeader}>
              <View style={styles.incomeIconCircle}>
                <Ionicons name="arrow-up" size={12} color="#000" />
              </View>
              <Text style={styles.flowLabel}>Ingresos</Text>
            </View>
            <Text style={styles.flowAmount}>$ {formatCurrencyValue(totalIncome, 'USD')}</Text>
          </View>
          <View style={styles.flowCard}>
            <View style={styles.flowHeader}>
              <View style={styles.expenseIconCircle}>
                <Ionicons name="arrow-down" size={12} color="#fff" />
              </View>
              <Text style={styles.flowLabel}>Egresos</Text>
            </View>
            <Text style={styles.flowAmount}>$ {formatCurrencyValue(totalExpense, 'USD')}</Text>
          </View>
        </View>

        <Text style={styles.historyTitle}>Historial</Text>
        <View style={styles.historyHeaderRow}>
          <Text style={styles.historyDateLabel}>{MONTHS[currentMonthIndex]}</Text>
          <Text style={styles.historyTotalLabel}>-${formatCurrencyValue(totalExpense, 'USD')}</Text>
        </View>

        {sortedMovements.length === 0 ? (
          <Text style={styles.noMovementsText}>No hay movimientos registrados para este mes.</Text>
        ) : (
          Object.keys(groupedMovements).map(dateKey => (
            <View key={dateKey} style={styles.dayGroupContainer}>
              <Text style={styles.dayGroupHeader}>{dateKey}</Text>
              {groupedMovements[dateKey].map(m => {
                const isTransfer = (m.category || '').toLowerCase().includes('transferencia');
                const isIncome = parseFloat(m.amount) > 0 || m.type === 'Ingresos' || m.type === 'Ingreso';
                const isExpense = !isIncome;
                
                const catDetails = getCategoryDetails(m.category, m.type);

                const movementCurrency = m.currency || account?.currency || 'USD';
                const currencySymbol = movementCurrency === 'VES' ? 'Bs. ' : '$ ';
                const formattedAmt = formatCurrencyValue(Math.abs(m.amount), movementCurrency);

                let secondaryAltText = '';
                if (movementCurrency === 'VES') {
                  const inUsd = bcv > 0 ? Math.abs(parseFloat(m.amount)) / bcv : 0;
                  secondaryAltText = `($ ${formatCurrencyValue(inUsd, 'USD')})`;
                }

                const movementTime = m.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                return (
                  <View key={m.id} style={styles.movementItemCard}>
                    <TouchableOpacity 
                      style={styles.movementItemMainClickable}
                      onPress={() => navigation('addMovement', m)}
                    >
                      <View style={styles.movementItemLeft}>
                        <View style={[
                          styles.movementIconBox, 
                          { backgroundColor: isTransfer ? 'rgba(59, 130, 246, 0.15)' : `${catDetails.color}25` }
                        ]}>
                          <Ionicons 
                            name={isTransfer ? "swap-horizontal" : catDetails.icon} 
                            size={20} 
                            color={isTransfer ? "#3b82f6" : catDetails.color} 
                          />
                        </View>
                        <View style={styles.movementInfoCol}>
                          <Text style={styles.movementTitle}>{m.title}</Text>
                          <Text style={styles.movementCategory}>{m.category || 'General'}</Text>
                          <Text style={styles.movementAccountName}>{account?.name || 'Cuenta'}</Text>
                        </View>
                      </View>

                      <View style={styles.movementAmountCol}>
                        {secondaryAltText ? <Text style={styles.secondaryAltText}>{secondaryAltText}</Text> : null}
                        <Text style={[styles.movementAmountVal, { color: isExpense ? '#f87171' : '#a3e635' }]}>
                          {isExpense ? '-' : '+'}{currencySymbol}{formattedAmt}
                        </Text>
                        <Text style={styles.movementTimeText}>{movementTime}</Text>
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={styles.movementOptionsButton}
                      onPress={() => {
                        Alert.alert(
                          'Opciones del movimiento',
                          `¿Qué deseas hacer con "${m.title}"?`,
                          [
                            { text: 'Cancelar', style: 'cancel' },
                            { text: 'Editar', onPress: () => navigation('addMovement', m) },
                            { text: 'Eliminar', style: 'destructive', onPress: () => handleDeleteMovement(m) }
                          ]
                        );
                      }}
                    >
                      <Ionicons name="ellipsis-vertical" size={16} color="#666" />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          ))
        )}

        <Modal visible={filterModalVisible} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setFilterModalVisible(false)}><Ionicons name="close" size={20} color="#fff" /></TouchableOpacity>
                <Text style={styles.modalTitle}>Filtros</Text>
                <TouchableOpacity onPress={() => setSelectedFilter('Todos los movimientos')}><Ionicons name="refresh-outline" size={18} color="#fff" /></TouchableOpacity>
              </View>

              <Text style={styles.modalSectionTitle}>TIPO DE MOVIMIENTO</Text>

              {['Todos los movimientos', 'Ingresos', 'Egresos', 'Transferencias'].map(opt => (
                <TouchableOpacity 
                  key={opt} 
                  style={styles.filterOptionRow}
                  onPress={() => { setSelectedFilter(opt); setFilterModalVisible(false); }}
                >
                  <Text style={styles.filterOptionText}>{opt}</Text>
                  <View style={[styles.radioCircle, selectedFilter === opt && styles.radioActive]} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Modal>
      </ScreenWrapper>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  scrollContent: { padding: 15, paddingBottom: 40 },
  helpButton: { width: 36, height: 36, backgroundColor: '#1a1a1a', borderRadius: 18, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#333' },
  searchRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  searchBox: { flex: 1, flexDirection: 'row', backgroundColor: '#1a1a1a', borderRadius: 20, paddingHorizontal: 12, alignItems: 'center', height: 44, borderWidth: 1, borderColor: '#222', marginRight: 10 },
  searchIcon: { marginRight: 8 },
  input: { flex: 1, color: '#fff', fontSize: 13 },
  filterButton: { width: 44, height: 44, backgroundColor: '#1a1a1a', borderRadius: 22, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#222' },
  balanceSection: { backgroundColor: '#1a1a1a', padding: 18, borderRadius: 20, marginBottom: 16, borderWidth: 1, borderColor: '#222' },
  balanceLabel: { color: '#888', fontSize: 13, marginBottom: 4 },
  balanceAmount: { color: '#fff', fontSize: 26, fontWeight: 'bold' },
  balanceUsd: { color: '#888', fontSize: 13, marginTop: 4 },
  actionButtonsRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20 },
  actionBtn: { alignItems: 'center' },
  actionIconCircle: { width: 56, height: 56, backgroundColor: '#1a1a1a', borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  actionText: { color: '#aaa', fontSize: 12 },
  monthSelector: { flexDirection: 'row', backgroundColor: '#1a1a1a', borderRadius: 20, justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, marginBottom: 16, borderWidth: 1, borderColor: '#222' },
  monthText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  flowRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  flowCard: { backgroundColor: '#1a1a1a', width: (width - 36) / 2, padding: 16, borderRadius: 18, borderWidth: 1, borderColor: '#222' },
  flowHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  incomeIconCircle: { width: 22, height: 22, backgroundColor: '#a3e635', borderRadius: 11, justifyContent: 'center', alignItems: 'center', marginRight: 6 },
  expenseIconCircle: { width: 22, height: 22, backgroundColor: '#f87171', borderRadius: 11, justifyContent: 'center', alignItems: 'center', marginRight: 6 },
  flowLabel: { color: '#888', fontSize: 13 },
  flowAmount: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  historyTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  historyHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  historyDateLabel: { color: '#888', fontSize: 13 },
  historyTotalLabel: { color: '#f87171', fontSize: 13, fontWeight: 'bold' },
  noMovementsText: { color: '#666', fontSize: 13, fontStyle: 'italic', textAlign: 'center', marginVertical: 20 },
  
  dayGroupContainer: { marginBottom: 12 },
  dayGroupHeader: { color: '#888', fontSize: 13, fontWeight: 'bold', marginBottom: 8, marginLeft: 4 },

  movementItemCard: { backgroundColor: '#1a1a1a', borderRadius: 18, padding: 14, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#222', marginBottom: 8 },
  movementItemMainClickable: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  movementOptionsButton: { paddingLeft: 10, paddingVertical: 10 },

  movementItemLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 },
  movementIconBox: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  movementInfoCol: { flex: 1 },
  movementTitle: { color: '#fff', fontSize: 14, fontWeight: 'bold', marginBottom: 2 },
  movementCategory: { color: '#aaa', fontSize: 12, marginBottom: 1 },
  movementAccountName: { color: '#777', fontSize: 11 },

  movementAmountCol: { alignItems: 'flex-end' },
  secondaryAltText: { color: '#777', fontSize: 10, marginBottom: 2 },
  movementAmountVal: { fontSize: 15, fontWeight: 'bold', marginBottom: 2 },
  movementTimeText: { color: '#666', fontSize: 10 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#1a1a1a', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, borderWidth: 1, borderColor: '#333', paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  modalSectionTitle: { color: '#666', fontSize: 11, fontWeight: 'bold', marginBottom: 15 },
  filterOptionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#222' },
  filterOptionText: { color: '#fff', fontSize: 15 },
  radioCircle: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#555' },
  radioActive: { backgroundColor: '#a3e635', borderColor: '#a3e635' }
});