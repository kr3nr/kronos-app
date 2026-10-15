import ThemedModal from "../../components/ThemedModal";
import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, TextInput, Dimensions, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getPaypalCommissionDetails } from '../../services/movementCommissions';
import { sortMovementsByDateTime } from '../../services/movementSorting';
import { convertCurrencyAmount, SUPPORTED_CURRENCIES } from '../../services/currencyService';
import { getMovementCategoryPresentation } from '../../services/movementPresentation';
import CustomHeader from '../../components/CustomHeader';
import ContextualHelp from '../../components/ContextualHelp';
import ScreenWrapper from '../../components/ScreenWrapper';

const { width } = Dimensions.get('window');

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const formatCurrency = (num, currency = 'USD') => {
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

export default function MovementsScreen({ navigation, movements = [], accounts = [], categories = [], initialFilter, rates }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'calendar'
  
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(new Date().getMonth());
  const [selectedDayFilter, setSelectedDayFilter] = useState(null); 
  const [filterType, setFilterType] = useState(initialFilter || 'all');
  
  const [showFilterModal, setShowFilterModal] = useState(false);

  const handlePrevMonth = () => {
    if (selectedMonthIndex > 0) {
      setSelectedMonthIndex(selectedMonthIndex - 1);
    } else {
      setSelectedMonthIndex(11);
    }
    setSelectedDayFilter(null);
  };

  const handleNextMonth = () => {
    if (selectedMonthIndex < 11) {
      setSelectedMonthIndex(selectedMonthIndex + 1);
    } else {
      setSelectedMonthIndex(0);
    }
    setSelectedDayFilter(null);
  };

  const validMovements = movements.filter(m => {
    const movementMonth = m.month_index !== undefined ? Number(m.month_index) : (m.monthIndex !== undefined ? Number(m.monthIndex) : selectedMonthIndex);
    return movementMonth === selectedMonthIndex;
  });

  const filteredMovements = validMovements.filter(m => {
    const matchesSearch = (m.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (m.category || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const amountVal = parseFloat(m.amount || 0);
    let matchesType = true;
    
    if (filterType === 'income') matchesType = amountVal > 0;
    if (filterType === 'expense') matchesType = amountVal < 0;
    if (filterType === 'transfer') matchesType = (m.category || '').toLowerCase().includes('transferencia');

    return matchesSearch && matchesType;
  });

  const totalIncome = filteredMovements
    .filter(m => parseFloat(m.amount) > 0 && !(m.category || '').toLowerCase().includes('transferencia'))
    .reduce((acc, m) => {
      const matchedAccount = accounts.find(acc => String(acc.id) === String(m.accountId || m.account_id));
      const movementCurrency = m.currency || (matchedAccount ? matchedAccount.currency : 'USD');
      const amountVal = parseFloat(m.amount) || 0;
      return acc + (convertCurrencyAmount(amountVal, movementCurrency, 'USD', rates) ?? 0);
    }, 0);

  const totalExpense = filteredMovements
    .filter(m => parseFloat(m.amount) < 0 && !(m.category || '').toLowerCase().includes('transferencia'))
    .reduce((acc, m) => {
      const matchedAccount = accounts.find(acc => String(acc.id) === String(m.accountId || m.account_id));
      const movementCurrency = m.currency || (matchedAccount ? matchedAccount.currency : 'USD');
      const amountVal = Math.abs(parseFloat(m.amount) || 0);
      return acc + (convertCurrencyAmount(amountVal, movementCurrency, 'USD', rates) ?? 0);
    }, 0);

  const displayMovements = sortMovementsByDateTime(filteredMovements);

  const groupedMovements = displayMovements.reduce((groups, movement) => {
    const movementMonth = Number(movement.monthIndex ?? movement.month_index ?? selectedMonthIndex);
    const monthLabel = MONTHS[movementMonth] || MONTHS[selectedMonthIndex];
    const dayKey = movement.day ? `${movement.day} ${monthLabel.slice(0, 3).toLowerCase()}` : 'Recientes';
    if (!groups[dayKey]) {
      groups[dayKey] = [];
    }
    groups[dayKey].push(movement);
    return groups;
  }, {});

  const currentYear = 2026;
  const daysInMonth = new Date(currentYear, selectedMonthIndex + 1, 0).getDate();
  const firstDayIndex = new Date(currentYear, selectedMonthIndex, 1).getDay();
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanksArray = Array.from({ length: firstDayIndex }, (_, i) => i);
  const daysWithMovements = validMovements.map(m => m.day || 9);

  return (
    <View style={styles.container}>
      <CustomHeader 
        title="Movimientos"
        onBackPress={() => navigation('home')}
        rightComponent={
          <View style={styles.topIconsRow}>
            <TouchableOpacity onPress={() => navigation('exportMovements')} style={styles.topIconButton}>
              <Ionicons name="download-outline" size={18} color="#fff" />
            </TouchableOpacity>
            
            <ContextualHelp title="Movimientos" tips={[
              'Usa la búsqueda y los filtros para encontrar registros.',
              'Cambia el mes o toca un día del calendario para revisar su actividad.',
              'Movimiento crea un ingreso o egreso; Transferir mueve saldo entre cuentas.',
            ]} />
          </View>
        }
      />

      <ScreenWrapper contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        <View style={styles.searchFilterRow}>
          <View style={styles.searchContainer}>
            <Ionicons name="search-outline" size={16} color="#888" style={{ marginRight: 8 }} />
            <TextInput 
              style={styles.searchInput}
              placeholder="Buscar movimiento..."
              placeholderTextColor="#888"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <TouchableOpacity style={styles.filterButton} onPress={() => setShowFilterModal(true)}>
            <Ionicons name="filter-outline" size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.quickActionsRow}>
          <TouchableOpacity style={styles.quickActionButton} onPress={() => navigation('addMovement', null)}>
            <View style={styles.quickActionIconCircle}>
              <Ionicons name="add" size={22} color="#fff" />
            </View>
            <Text style={styles.quickActionLabel}>Movimiento</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickActionButton} onPress={() => navigation('transfer', { returnScreen: 'movements' })}>
            <View style={styles.quickActionIconCircle}>
              <Ionicons name="swap-horizontal" size={22} color="#fff" />
            </View>
            <Text style={styles.quickActionLabel}>Tranferir</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.monthSelectorCard}>
          <TouchableOpacity style={styles.monthArrowBtn} onPress={handlePrevMonth}>
            <Ionicons name="chevron-back" size={20} color="#a3e635" />
          </TouchableOpacity>
          <Text style={styles.monthText}>{MONTHS[selectedMonthIndex]}</Text>
          <TouchableOpacity style={styles.monthArrowBtn} onPress={handleNextMonth}>
            <Ionicons name="chevron-forward" size={20} color="#a3e635" />
          </TouchableOpacity>
        </View>

        <View style={styles.flowCardsRow}>
          <View style={styles.flowCard}>
            <View style={styles.flowHeader}>
              <View style={styles.incomeIconCircle}>
                <Ionicons name="arrow-up" size={12} color="#000" />
              </View>
              <Text style={styles.flowLabel}>Ingresos</Text>
            </View>
            <Text style={styles.flowAmountText}>$ {formatCurrency(totalIncome)}</Text>
          </View>

          <View style={styles.flowCard}>
            <View style={styles.flowHeader}>
              <View style={styles.expenseIconCircle}>
                <Ionicons name="arrow-down" size={12} color="#fff" />
              </View>
              <Text style={styles.flowLabel}>Egresos</Text>
            </View>
            <Text style={styles.flowAmountText}>$ {formatCurrency(totalExpense)}</Text>
          </View>
        </View>

        <View style={styles.historyHeaderRow}>
          <Text style={styles.historyTitle}>
            {viewMode === 'calendar' ? `Calendario de ${MONTHS[selectedMonthIndex]}` : 'Historial'}
          </Text>
          <View style={styles.viewToggleContainer}>
            <TouchableOpacity 
              style={[styles.toggleBtn, viewMode === 'list' && styles.toggleBtnActive]}
              onPress={() => setViewMode('list')}
            >
              <Ionicons name="list-outline" size={16} color={viewMode === 'list' ? '#000' : '#888'} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.toggleBtn, viewMode === 'calendar' && styles.toggleBtnActive]}
              onPress={() => setViewMode('calendar')}
            >
              <Ionicons name="calendar-outline" size={16} color={viewMode === 'calendar' ? '#000' : '#888'} />
            </TouchableOpacity>
          </View>
        </View>

        {viewMode === 'list' ? (
          <View style={styles.historyListContainer}>
            {selectedDayFilter && (
              <View style={styles.activeDayFilterBanner}>
                <Text style={styles.activeDayFilterText}>Filtrando por el día {selectedDayFilter} de {MONTHS[selectedMonthIndex]}</Text>
                <TouchableOpacity onPress={() => setSelectedDayFilter(null)}>
                  <Ionicons name="close-circle" size={16} color="#a3e635" />
                </TouchableOpacity>
              </View>
            )}

            {displayMovements.length === 0 ? (
              <Text style={styles.emptyText}>No hay movimientos registrados para este período.</Text>
            ) : (
              Object.keys(groupedMovements).map(dateKey => (
                <View key={dateKey} style={styles.dayGroupContainer}>
                  <Text style={styles.dayGroupHeader}>{dateKey}</Text>
                  {groupedMovements[dateKey].map(m => {
                    const isTransfer = (m.category || '').toLowerCase().includes('transferencia');
                    const isExpense = parseFloat(m.amount) < 0;
                    const matchedAccount = accounts.find(acc => String(acc.id) === String(m.accountId || m.account_id));
                    const accountName = matchedAccount ? matchedAccount.name : 'Banco de Venezuela';

                    // Obtenemos el icono y color real de la categoría
                    const catDetails = getMovementCategoryPresentation(m, categories);

                    const movementCurrency = m.currency || (matchedAccount ? matchedAccount.currency : 'USD');
                    const currencySymbol = `${SUPPORTED_CURRENCIES.find(item => item.code === movementCurrency)?.symbol || '$'} `;
                    const formattedAmt = formatCurrency(Math.abs(m.amount), movementCurrency);
                    const paypalDetails = getPaypalCommissionDetails(m);

                    let secondaryAltText = '';
                    if (movementCurrency === 'VES') {
                      const inUsd = convertCurrencyAmount(Math.abs(parseFloat(m.amount)), movementCurrency, 'USD', rates) ?? 0;
                      secondaryAltText = `($ ${formatCurrency(inUsd, 'USD')})`;
                    }

                    const movementTime = m.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                    return (
                      <View key={m.id} style={styles.movementItemCard}>
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
                            {paypalDetails && (
                              <Text style={styles.movementCategory}>
                                {paypalDetails.isIncome
                                  ? `PayPal · recibido ${currencySymbol}${formatCurrency(paypalDetails.baseAmount, movementCurrency)} · comisión ${currencySymbol}${formatCurrency(paypalDetails.commissionAmount, movementCurrency)}`
                                  : `PayPal · comisión ${currencySymbol}${formatCurrency(paypalDetails.commissionAmount, movementCurrency)} incluida`}
                              </Text>
                            )}
                            <Text style={styles.movementAccountName}>{accountName}</Text>
                          </View>
                        </View>

                        <View style={styles.movementAmountCol}>
                          {secondaryAltText ? <Text style={styles.secondaryAltText}>{secondaryAltText}</Text> : null}
                          <Text style={[styles.movementAmountVal, { color: isTransfer ? '#3b82f6' : (isExpense ? '#f87171' : '#a3e635') }]}>
                            {isExpense ? '-' : '+'}{currencySymbol}{formattedAmt}
                          </Text>
                          <Text style={styles.movementTimeText}>{movementTime}</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              ))
            )}
          </View>
        ) : (
          <View style={styles.calendarContainerCard}>
            <View style={styles.weekDaysHeaderRow}>
              {['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'].map((w, index) => (
                <Text key={index} style={styles.weekDayLabel}>{w}</Text>
              ))}
            </View>

            <View style={styles.calendarDaysGrid}>
              {blanksArray.map(b => (
                <View key={`blank-${b}`} style={styles.calendarCellEmpty} />
              ))}
              {daysArray.map(d => {
                const hasMovement = daysWithMovements.includes(d);
                const isSelectedDay = selectedDayFilter === d;

                return (
                  <TouchableOpacity 
                    key={d} 
                    style={[styles.calendarCell, isSelectedDay && styles.calendarCellSelected]}
                    onPress={() => {
                      setSelectedDayFilter(d);
                      setViewMode('list');
                    }}
                  >
                    <Text style={[styles.calendarCellText, isSelectedDay && styles.calendarCellTextSelected]}>
                      {d}
                    </Text>
                    {hasMovement && <View style={[styles.movementDotIndicator, isSelectedDay && { backgroundColor: '#000' }]} />}
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={styles.calendarHintText}>💡 Toca cualquier día con indicador para ver sus movimientos.</Text>
          </View>
        )}

      </ScreenWrapper>

      <ThemedModal
        visible={showFilterModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowFilterModal(false)}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filtros</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <Ionicons name="close" size={20} color="#fff" />
              </TouchableOpacity>
            </View>

            {[
              { id: 'all', label: 'Todos los movimientos' },
              { id: 'income', label: 'Ingresos' },
              { id: 'expense', label: 'Egresos' },
              { id: 'transfer', label: 'Transferencias' }
            ].map(item => (
              <TouchableOpacity 
                key={item.id} 
                style={styles.filterOptionRow}
                onPress={() => {
                  setFilterType(item.id);
                  setShowFilterModal(false);
                }}
              >
                <Text style={styles.filterOptionText}>{item.label}</Text>
                <Ionicons 
                  name={filterType === item.id ? "checkmark-circle" : "ellipse-outline"} 
                  size={20} 
                  color={filterType === item.id ? "#a3e635" : "#666"} 
                />
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </ThemedModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  topIconsRow: { flexDirection: 'row', alignItems: 'center' },
  topIconButton: { width: 36, height: 36, backgroundColor: '#1a1a1a', borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginLeft: 8, borderWidth: 1, borderColor: '#333' },

  tooltipCard: { backgroundColor: '#222', borderRadius: 14, padding: 12, marginHorizontal: 15, marginBottom: 8, borderWidth: 1, borderColor: '#a3e635' },
  tooltipTitle: { color: '#a3e635', fontSize: 13, fontWeight: 'bold', marginBottom: 4 },
  tooltipText: { color: '#ccc', fontSize: 11, lineHeight: 16, marginBottom: 8 },
  tooltipCloseBtn: { alignSelf: 'flex-end', backgroundColor: '#a3e635', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 8 },
  tooltipCloseText: { color: '#000', fontSize: 10, fontWeight: 'bold' },

  scrollContent: { paddingHorizontal: 15, paddingBottom: 30 },

  searchFilterRow: { flexDirection: 'row', marginTop: 12, marginBottom: 16 },
  searchContainer: { flex: 1, backgroundColor: '#1a1a1a', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, borderRadius: 20, height: 44, borderWidth: 1, borderColor: '#222', marginRight: 10 },
  searchInput: { flex: 1, color: '#fff', fontSize: 13 },
  filterButton: { width: 44, height: 44, backgroundColor: '#1a1a1a', borderRadius: 22, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#222' },

  quickActionsRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: 20 },
  quickActionButton: { alignItems: 'center', marginHorizontal: 24 },
  quickActionIconCircle: { width: 56, height: 56, backgroundColor: '#1a1a1a', borderRadius: 28, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#333', marginBottom: 6 },
  quickActionLabel: { color: '#aaa', fontSize: 12 },

  monthSelectorCard: { backgroundColor: '#1a1a1a', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, borderRadius: 20, marginBottom: 16, borderWidth: 1, borderColor: '#222' },
  monthArrowBtn: { padding: 4 },
  monthText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

  flowCardsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  flowCard: { backgroundColor: '#1a1a1a', width: (width - 36) / 2, padding: 16, borderRadius: 18, borderWidth: 1, borderColor: '#222' },
  flowHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  incomeIconCircle: { width: 22, height: 22, backgroundColor: '#a3e635', borderRadius: 11, justifyContent: 'center', alignItems: 'center', marginRight: 6 },
  expenseIconCircle: { width: 22, height: 22, backgroundColor: '#f87171', borderRadius: 11, justifyContent: 'center', alignItems: 'center', marginRight: 6 },
  flowLabel: { color: '#888', fontSize: 13 },
  flowAmountText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },

  historyHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  historyTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  viewToggleContainer: { flexDirection: 'row', backgroundColor: '#1a1a1a', borderRadius: 14, padding: 3, borderWidth: 1, borderColor: '#222' },
  toggleBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 10 },
  toggleBtnActive: { backgroundColor: '#a3e635' },

  historyListContainer: { gap: 12 },
  dayGroupContainer: { marginBottom: 12 },
  dayGroupHeader: { color: '#888', fontSize: 13, fontWeight: 'bold', marginBottom: 8, marginLeft: 4 },

  movementItemCard: { backgroundColor: '#1a1a1a', borderRadius: 18, padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#222', marginBottom: 8 },
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

  calendarContainerCard: { backgroundColor: '#1a1a1a', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#222' },
  weekDaysHeaderRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 10 },
  weekDayLabel: { color: '#666', fontSize: 11, fontWeight: 'bold', width: '13%', textAlign: 'center' },
  calendarDaysGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start' },
  calendarCellEmpty: { width: '14.2%', aspectRatio: 1, marginVertical: 2 },
  calendarCell: { width: '14.2%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center', marginVertical: 2, borderRadius: 10, backgroundColor: '#222' },
  calendarCellSelected: { backgroundColor: '#a3e635' },
  calendarCellText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  calendarCellTextSelected: { color: '#000', fontWeight: 'bold' },
  movementDotIndicator: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#a3e635', position: 'absolute', bottom: 4 },
  calendarHintText: { color: '#777', fontSize: 11, textAlign: 'center', marginTop: 15, fontStyle: 'italic' },

  emptyText: { color: '#666', fontSize: 13, fontStyle: 'italic', textAlign: 'center', marginVertical: 20 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#1a1a1a', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, borderWidth: 1, borderColor: '#333' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottomWidth: 1, borderBottomColor: '#222', paddingBottom: 10 },
  modalTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  filterOptionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#222' },
  filterOptionText: { color: '#fff', fontSize: 14 }
});