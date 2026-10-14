import ThemedModal from "../../components/ThemedModal";
import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, Text, View, TouchableOpacity,
  TextInput, Modal, Dimensions, ScrollView, Keyboard, KeyboardAvoidingView, Platform, TouchableWithoutFeedback
} from 'react-native';
import { Alert } from '../../services/appAlert';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../services/supabase';
import { getUserCategoriesService } from '../../services/categoryService';
import { fetchCurrencyRates } from '../../services/currencyService';
import {
  calculateCommissionAmount,
  REJECTED_OR_REVERSED_COMMISSION_TYPE,
  VES_COMMISSION_OPTIONS
} from '../../services/movementCommissions';
import CustomHeader from '../../components/CustomHeader';
import ScreenWrapper from '../../components/ScreenWrapper';
import ThemeContent from '../../components/ThemeContent';
import { NUMERIC_KEYPAD_STYLES } from '../../components/numericKeypadStyles';

const { width } = Dimensions.get('window');

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const formatCurrencyValue = (num, currency = 'VES') => {
  const n = parseFloat(num || 0);
  if (isNaN(n)) return currency === 'USD' || currency === 'USDT' ? '0.00' : '0,00';
   
  const parts = n.toFixed(2).split('.');
  if (currency === 'USD' || currency === 'USDT') {
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
  } else {
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return parts.join(',');
  }
};

const formatRateValue = (num) => {
  const n = parseFloat(num || 0);
  if (isNaN(n)) return '0,00';
  const parts = n.toFixed(2).split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return parts.join(',');
};

const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

function RateChangeModal({ visible, onClose, rates, onApplyRate }) {
  const [activeTab, setActiveTab] = useState('USD'); 
  const [manualRawCents, setManualRawCents] = useState('0');

  const manualValue = parseInt(manualRawCents, 10) / 100;

  const handleKeyPad = (key) => {
    if (key === '00') {
      if (manualRawCents === '0') return;
      if (manualRawCents.length > 10) return;
      setManualRawCents(manualRawCents + '00');
    } else {
      if (manualRawCents === '0') {
        setManualRawCents(key);
      } else {
        if (manualRawCents.length > 12) return;
        setManualRawCents(manualRawCents + key);
      }
    }
  };

  const handleDelete = () => {
    if (manualRawCents.length <= 1) {
      setManualRawCents('0');
    } else {
      setManualRawCents(manualRawCents.slice(0, -1));
    }
  };

  const handleClear = () => {
    setManualRawCents('0');
  };

  const handleConfirm = () => {
    let finalRate = rates?.bcvRate || 1;
    let modeLabel = 'USD';
    if (activeTab === 'EUR') { finalRate = rates?.eurRate || finalRate; modeLabel = 'EUR'; }
    if (activeTab === 'USDT') { finalRate = rates?.binanceRate || finalRate; modeLabel = '₮'; }
    if (activeTab === 'Manual') { finalRate = manualValue || 1; modeLabel = 'Manual'; }
     
    onApplyRate(finalRate, modeLabel);
    onClose();
  };

  const getActiveRateDisplay = () => {
    if (activeTab === 'USD') return formatRateValue(rates?.bcvRate);
    if (activeTab === 'EUR') return formatRateValue(rates?.eurRate);
    if (activeTab === 'USDT') return formatRateValue(rates?.binanceRate);
    return '0,00';
  };

  return (
    <ThemedModal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={rateModalStyles.modalOverlay}>
        <View style={rateModalStyles.modalContainer}>
          <View style={rateModalStyles.modalHeader}>
            <TouchableOpacity style={rateModalStyles.closeButton} onPress={onClose} activeOpacity={0.7}>
              <Ionicons name="close" size={20} color="#fff" />
            </TouchableOpacity>
            <Text style={rateModalStyles.modalTitle}>Tasa de cambio</Text>
            <TouchableOpacity style={rateModalStyles.confirmButton} onPress={handleConfirm} activeOpacity={0.8}>
              <Ionicons name="checkmark" size={20} color="#000" />
            </TouchableOpacity>
          </View>

          <View style={rateModalStyles.tabsRow}>
            {['USD', 'EUR', 'USDT', 'Manual'].map((tab) => (
              <TouchableOpacity 
                key={tab}
                style={[rateModalStyles.tabItem, activeTab === tab && rateModalStyles.tabItemActive]}
                onPress={() => setActiveTab(tab)}
                activeOpacity={0.8}
              >
                <Text style={[rateModalStyles.tabText, activeTab === tab && rateModalStyles.tabTextActive]}>
                  {tab === 'USD' ? '$ USD' : tab === 'EUR' ? '€ EUR' : tab === 'USDT' ? '₮ USDT' : 'Manual'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {activeTab !== 'Manual' ? (
            <View style={rateModalStyles.rateDisplayCard}>
              <View style={rateModalStyles.rateInfoRow}>
                <Text style={rateModalStyles.rateInfoLeftLabel}>
                  {activeTab === 'USD' ? '1 USD' : activeTab === 'EUR' ? '1 EUR' : '1 ₮'}
                </Text>
                <Text style={rateModalStyles.rateInfoRightValue}>
                  Bs {getActiveRateDisplay()}
                </Text>
              </View>
            </View>
          ) : (
            <View style={rateModalStyles.manualSectionContainer}>
              <Text style={rateModalStyles.manualTitleLabel}>Tasa personalizada</Text>
              <Text style={rateModalStyles.manualBigValueText}>
                Bs {formatRateValue(manualValue)}
              </Text>

              <View style={rateModalStyles.miniKeypad}>
                <View style={rateModalStyles.keyRow}>
                  <TouchableOpacity style={rateModalStyles.keyBtn} onPress={() => handleKeyPad('1')}><Text style={rateModalStyles.keyText}>1</Text></TouchableOpacity>
                  <TouchableOpacity style={rateModalStyles.keyBtn} onPress={() => handleKeyPad('2')}><Text style={rateModalStyles.keyText}>2</Text></TouchableOpacity>
                  <TouchableOpacity style={rateModalStyles.keyBtn} onPress={() => handleKeyPad('3')}><Text style={rateModalStyles.keyText}>3</Text></TouchableOpacity>
                  <TouchableOpacity style={rateModalStyles.keyBtn} onPress={handleClear}><Text style={rateModalStyles.keyTextYellow}>C</Text></TouchableOpacity>
                </View>
                <View style={rateModalStyles.keyRow}>
                  <TouchableOpacity style={rateModalStyles.keyBtn} onPress={() => handleKeyPad('4')}><Text style={rateModalStyles.keyText}>4</Text></TouchableOpacity>
                  <TouchableOpacity style={rateModalStyles.keyBtn} onPress={() => handleKeyPad('5')}><Text style={rateModalStyles.keyText}>5</Text></TouchableOpacity>
                  <TouchableOpacity style={rateModalStyles.keyBtn} onPress={() => handleKeyPad('6')}><Text style={rateModalStyles.keyText}>6</Text></TouchableOpacity>
                  <View style={rateModalStyles.keyEmpty} />
                </View>
                <View style={rateModalStyles.keyRow}>
                  <TouchableOpacity style={rateModalStyles.keyBtn} onPress={() => handleKeyPad('7')}><Text style={rateModalStyles.keyText}>7</Text></TouchableOpacity>
                  <TouchableOpacity style={rateModalStyles.keyBtn} onPress={() => handleKeyPad('8')}><Text style={rateModalStyles.keyText}>8</Text></TouchableOpacity>
                  <TouchableOpacity style={rateModalStyles.keyBtn} onPress={() => handleKeyPad('9')}><Text style={rateModalStyles.keyText}>9</Text></TouchableOpacity>
                  <View style={rateModalStyles.keyEmpty} />
                </View>
                <View style={rateModalStyles.keyRow}>
                  <TouchableOpacity style={rateModalStyles.keyBtn} onPress={() => handleKeyPad('00')}><Text style={rateModalStyles.keyText}>00</Text></TouchableOpacity>
                  <TouchableOpacity style={rateModalStyles.keyBtn} onPress={() => handleKeyPad('0')}><Text style={rateModalStyles.keyText}>0</Text></TouchableOpacity>
                  <TouchableOpacity style={rateModalStyles.keyBtn} onPress={handleDelete}><Ionicons name="backspace-outline" size={20} color="#fff" /></TouchableOpacity>
                  <View style={rateModalStyles.keyEmpty} />
                </View>
              </View>
            </View>
          )}

          <Text style={rateModalStyles.footerNoteText}>Actualizada automáticamente</Text>
        </View>
      </View>
    </ThemedModal>
  );
}

export default function AddMovementScreen({ navigation, onGoBack, accounts, setAccounts, movements, setMovements, rates: initialRates, currentAccount, favoriteAccountId, selectedMovement, userId }) {
  const [rates, setRates] = useState(initialRates || { bcvRate: 36.5, eurRate: 40.0, binanceRate: 37.0 });

  useEffect(() => {
    const loadLiveRates = async () => {
      try {
        const live = await fetchCurrencyRates();
        if (live) setRates(live);
      } catch (err) {
        console.log('Error al cargar tasas en vivo:', err);
      }
    };
    loadLiveRates();
  }, []);

  const [movementType, setMovementType] = useState(selectedMovement ? (selectedMovement.type === 'Ingresos' ? 'Ingreso' : 'Egreso') : 'Egreso');
  const [typeDropdownVisible, setTypeDropdownVisible] = useState(false);

  const [selectedAccount, setSelectedAccount] = useState(() => {
    if (selectedMovement) {
      return accounts.find(a => String(a.id) === String(selectedMovement.accountId)) || accounts[0];
    }
    return currentAccount
      || accounts.find(account => String(account.id) === String(favoriteAccountId))
      || accounts[0]
      || { id: 'default', name: 'Cuenta principal', balance: 0, currency: 'VES' };
  });

  const [currencyMode, setCurrencyMode] = useState(selectedMovement ? selectedMovement.currency || 'VES' : (selectedAccount?.currency || 'VES'));
   
  const [rawCents, setRawCents] = useState(() => {
    if (selectedMovement) {
      const val = Math.abs(selectedMovement.commission_base_amount ?? selectedMovement.amount ?? 0);
      return Math.round(val * 100).toString();
    }
    return '0';
  });

  const [accountDropdownVisible, setAccountDropdownVisible] = useState(false);
  const [description, setDescription] = useState(selectedMovement ? selectedMovement.title : '');
   
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthIndex = now.getMonth();
  const currentDay = now.getDate();
  
  const rawHours = now.getHours();
  const initialAmPm = rawHours >= 12 ? 'PM' : 'AM';
  const initial12Hours = ((rawHours % 12) || 12).toString().padStart(2, '0');
  const currentMinutes = now.getMinutes().toString().padStart(2, '0');

  const [dateModalVisible, setDateModalVisible] = useState(false);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(selectedMovement ? selectedMovement.monthIndex : currentMonthIndex);
  const [selectedDay, setSelectedDay] = useState(selectedMovement ? selectedMovement.day || currentDay : currentDay);

  const [timeModalVisible, setTimeModalVisible] = useState(false);
  const [selectedHour, setSelectedHour] = useState(() => {
    if (selectedMovement && selectedMovement.time) {
      const parts = selectedMovement.time.split(':');
      return parts[0] || initial12Hours;
    }
    return initial12Hours;
  });
  const [selectedMinute, setSelectedMinute] = useState(() => {
    if (selectedMovement && selectedMovement.time) {
      return selectedMovement.time.split(':')[1]?.slice(0, 2) || currentMinutes;
    }
    return currentMinutes;
  });
  const [selectedAmPm, setSelectedAmPm] = useState(() => {
    if (selectedMovement && selectedMovement.time) {
      return selectedMovement.time.toUpperCase().includes('PM') ? 'PM' : 'AM';
    }
    return initialAmPm;
  });

  const [rateModalVisible, setRateModalVisible] = useState(false);
  const [activeRate, setActiveRate] = useState(rates?.bcvRate || 1);
  const [rateModeLabel, setRateModeLabel] = useState('USD');

  const [commissionModalVisible, setCommissionModalVisible] = useState(false);
  const [selectedCommission, setSelectedCommission] = useState(
    selectedMovement?.commission_type === 'transferencia'
      ? 'pago_movil'
      : selectedMovement?.commission_type || null
  );

  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(selectedMovement?.category || 'Categorías');
  const [categoriesList, setCategoriesList] = useState([]);
  const [expandedCategoryName, setExpandedCategoryName] = useState(null);
  const [loading, setLoading] = useState(false);
  const [systemKeyboardVisible, setSystemKeyboardVisible] = useState(false);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSubscription = Keyboard.addListener(showEvent, () => setSystemKeyboardVisible(true));
    const hideSubscription = Keyboard.addListener(hideEvent, () => setSystemKeyboardVisible(false));
    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  useEffect(() => {
    const fetchCategories = async () => {
      if (userId) {
        const cats = await getUserCategoriesService(userId);
        setCategoriesList(cats);
      }
    };
    fetchCategories();
  }, [userId]);

  const handlePressKey = (key) => {
    if (key === '00') {
      if (rawCents === '0') return;
      if (rawCents.length > 10) return;
      setRawCents(rawCents + '00');
    } else {
      if (rawCents === '0') {
        setRawCents(key);
      } else {
        if (rawCents.length > 12) return;
        setRawCents(rawCents + key);
      }
    }
  };

  const handleDeleteKey = () => {
    if (rawCents.length <= 1) {
      setRawCents('0');
    } else {
      setRawCents(rawCents.slice(0, -1));
    }
  };

  const handleClearKey = () => {
    setRawCents('0');
  };

  const numericAmount = parseInt(rawCents, 10) / 100;
  const currentActiveRate = activeRate || rates?.bcvRate || 1;

  const commissionAmount = calculateCommissionAmount(selectedCommission, movementType, numericAmount);

  const isRejectedOrReversed = selectedCommission === REJECTED_OR_REVERSED_COMMISSION_TYPE;
  const isPaypalIncome = movementType === 'Ingreso' && selectedCommission === 'paypal';
  const finalTotalAmount = isRejectedOrReversed
    ? 0
    : isPaypalIncome ? Math.max(0, numericAmount - commissionAmount) : numericAmount;
  const hasSeparateCommission = selectedCommission !== 'paypal'
    && commissionAmount > 0
    && (movementType === 'Egreso' || isRejectedOrReversed);

  let convertedDisplay = '';
  const currentCurr = selectedAccount?.currency || 'VES';
  if (currentCurr === 'VES') {
    const inUsd = finalTotalAmount / currentActiveRate;
    convertedDisplay = `≈ $${formatCurrencyValue(inUsd, 'USD')}`;
  } else {
    const inVes = finalTotalAmount * currentActiveRate;
    convertedDisplay = `≈ Bs ${formatCurrencyValue(inVes, 'VES')}`;
  }

const handleSaveMovement = async () => {
    if (!isRejectedOrReversed && (numericAmount <= 0 || finalTotalAmount <= 0)) return;

    setLoading(true);

    try {
      const calculatedAmount = isRejectedOrReversed
        ? 0
        : movementType === 'Ingreso' ? finalTotalAmount : -finalTotalAmount;
      const finalTimeString = `${selectedHour}:${selectedMinute} ${selectedAmPm}`;
      const isAccountVes = (selectedAccount?.currency || 'VES') === 'VES';
      const oldCommissionMovements = selectedMovement
        ? (movements || []).filter(m => String(m.related_movement_id) === String(selectedMovement.id))
        : [];
      const oldCommissionTotal = oldCommissionMovements.reduce((total, m) => total + (parseFloat(m.amount) || 0), 0);
      const oldAccountId = selectedMovement?.account_id || selectedMovement?.accountId;
      const oldAccount = accounts.find(acc => String(acc.id) === String(oldAccountId));
      const oldAccountBaseBalance = selectedMovement && oldAccount
        ? (parseFloat(oldAccount.balance) || 0) - (parseFloat(selectedMovement.amount) || 0) - oldCommissionTotal
        : null;
      const selectedAccountBaseBalance = selectedMovement && oldAccount && String(oldAccountId) === String(selectedAccount.id)
        ? oldAccountBaseBalance
        : parseFloat(selectedAccount.balance) || 0;
      const newAccountBalance = selectedAccountBaseBalance + calculatedAmount - (hasSeparateCommission ? commissionAmount : 0);

      // 3. GUARDAR O ACTUALIZAR MOVIMIENTO PRINCIPAL
      const movementPayload = {
        user_id: userId,
        account_id: selectedAccount.id,
        title: isRejectedOrReversed
          ? `Operación rechazada/reversada${description.trim() ? `: ${description.trim()}` : ''}`
          : description.trim() || (movementType === 'Ingreso' ? 'Ingreso registrado' : 'Egreso registrado'),
        category: selectedCategory === 'Categorías' ? 'Sin categoría' : selectedCategory,
        amount: calculatedAmount,
        sub_amount: `${isAccountVes ? 'Bs. ' : '$ '}${formatCurrencyValue(finalTotalAmount, selectedAccount?.currency)}`,
        type: movementType === 'Ingreso' ? 'Ingresos' : 'Egresos',
        commission_type: selectedCommission,
        commission_base_amount: numericAmount,
        month_index: selectedMonthIndex,
        day: selectedDay,
        time: finalTimeString
      };

      let savedMovementItem;
      let newMovementsList = [...movements];

      if (selectedMovement) {
        const { data, error } = await supabase
          .from('movements')
          .update(movementPayload)
          .eq('id', selectedMovement.id)
          .select();

        if (error) {
          Alert.alert('Error', error.message);
          setLoading(false);
          return;
        }
        savedMovementItem = data[0];
        newMovementsList = newMovementsList.map(m => 
          String(m.id) === String(selectedMovement.id) 
            ? { ...savedMovementItem, accountId: savedMovementItem.account_id, monthIndex: savedMovementItem.month_index } 
            : m
        );
      } else {
        const { data, error } = await supabase
          .from('movements')
          .insert([movementPayload])
          .select();

        if (error) {
          Alert.alert('Error', error.message);
          setLoading(false);
          return;
        }
        savedMovementItem = data[0];
        const formattedNewMov = {
          ...savedMovementItem,
          accountId: savedMovementItem.account_id,
          monthIndex: savedMovementItem.month_index
        };
        newMovementsList = [formattedNewMov, ...newMovementsList];
      }

      // 4. CREAR O ASEGURAR LA COMISIÓN (Permitido tanto en creación como en edición)
      let savedCommissionItem = null;
      if (hasSeparateCommission) {
        const commissionPayload = {
          user_id: userId,
          account_id: selectedAccount.id,
          title: `Comisión ${VES_COMMISSION_OPTIONS.find(option => option.type === selectedCommission)?.shortLabel || 'Transacción'} (${description.trim() || 'Movimiento'})`,
          category: 'Comisiones',
          amount: -commissionAmount,
          sub_amount: `${isAccountVes ? 'Bs. ' : '$ '}${formatCurrencyValue(commissionAmount, selectedAccount?.currency)}`,
          type: 'Egresos',
          related_movement_id: savedMovementItem.id,
          month_index: selectedMonthIndex,
          day: selectedDay,
          time: finalTimeString
        };

        const existingCommission = oldCommissionMovements[0];
        const commissionQuery = existingCommission
          ? supabase.from('movements').update(commissionPayload).eq('id', existingCommission.id)
          : supabase.from('movements').insert([commissionPayload]);
        const { data: commData, error: commError } = await commissionQuery.select();

        if (commError) throw commError;
        if (commData?.[0]) {
          savedCommissionItem = {
            ...commData[0],
            accountId: commData[0].account_id,
            monthIndex: commData[0].month_index
          };
          const duplicateCommissionIds = oldCommissionMovements.slice(1).map(m => m.id);
          if (duplicateCommissionIds.length > 0) {
            const { error: duplicateDeleteError } = await supabase
              .from('movements')
              .delete()
              .in('id', duplicateCommissionIds);
            if (duplicateDeleteError) throw duplicateDeleteError;
          }
          newMovementsList = newMovementsList.filter(m =>
            !oldCommissionMovements.some(oldCommission => String(oldCommission.id) === String(m.id))
          );
          newMovementsList = [savedCommissionItem, ...newMovementsList];
        }
      } else if (oldCommissionMovements.length > 0) {
        const { error: deleteCommissionError } = await supabase
          .from('movements')
          .delete()
          .in('id', oldCommissionMovements.map(m => m.id));
        if (deleteCommissionError) throw deleteCommissionError;
        newMovementsList = newMovementsList.filter(m =>
          !oldCommissionMovements.some(oldCommission => String(oldCommission.id) === String(m.id))
        );
      }

      if (selectedMovement && oldAccount && String(oldAccount.id) !== String(selectedAccount.id)) {
        const { error: oldAccountError } = await supabase
          .from('accounts')
          .update({ balance: oldAccountBaseBalance })
          .eq('id', oldAccount.id);
        if (oldAccountError) throw oldAccountError;
      }

      const { error: accError } = await supabase
        .from('accounts')
        .update({ balance: newAccountBalance })
        .eq('id', selectedAccount.id);
      if (accError) throw accError;

      setMovements(newMovementsList);

      const updatedAccounts = accounts.map(acc => {
        if (selectedMovement && oldAccount && String(acc.id) === String(oldAccount.id) && String(oldAccount.id) !== String(selectedAccount.id)) {
          return { ...acc, balance: oldAccountBaseBalance };
        }
        if (String(acc.id) === String(selectedAccount.id)) {
          return { ...acc, balance: newAccountBalance };
        }
        return acc;
      });
      setAccounts(updatedAccounts);

      if (onGoBack) {
        onGoBack();
      } else {
        navigation('home');
      }

    } catch (err) {
      console.error('Error inesperado al guardar movimiento:', err);
      Alert.alert(
        'No se completó el movimiento',
        err?.message || 'No se pudo guardar el movimiento y su comisión. Revisa el historial antes de volver a intentarlo.'
      );
    } finally {
      setLoading(false);
    }
  };

  const isNationalAccount = selectedAccount?.currency === 'VES';

  const handlePrevMonth = () => {
    if (selectedMonthIndex > 0) {
      setSelectedMonthIndex(selectedMonthIndex - 1);
    } else {
      setSelectedMonthIndex(11);
      setSelectedYear(selectedYear - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonthIndex < 11) {
      setSelectedMonthIndex(selectedMonthIndex + 1);
    } else {
      setSelectedMonthIndex(0);
      setSelectedYear(selectedYear + 1);
    }
  };

  const totalDays = getDaysInMonth(selectedYear, selectedMonthIndex);
  const firstDayIndex = getFirstDayOfMonth(selectedYear, selectedMonthIndex);
  const daysArray = Array.from({ length: totalDays }, (_, i) => i + 1);
  const blanksArray = Array.from({ length: firstDayIndex }, (_, i) => i);

  const currentTypeDb = movementType === 'Ingreso' ? 'ingresos' : 'egresos';
  const parentCategories = categoriesList.filter(c => !c.parent_id && c.type === currentTypeDb);

  const getCurrencyIdentifierText = () => {
    const c = selectedAccount?.currency || 'VES';
    if (c === 'USD') return '$ Dólares';
    if (c === 'EUR') return '€ Euros';
    if (c === 'USDT') return '₮ USDT';
    return 'Bs Bolívares';
  };

  const isTodaySelected = selectedDay === currentDay && selectedMonthIndex === currentMonthIndex && selectedYear === currentYear;
  const dateButtonDisplayLabel = isTodaySelected 
    ? 'Hoy' 
    : `${selectedDay} ${MONTHS[selectedMonthIndex]?.slice(0, 3)}`;
  const KeyboardDismissWrapper = Platform.OS === 'web' ? View : TouchableWithoutFeedback;
  const keyboardDismissWrapperProps = Platform.OS === 'web'
    ? { style: { flex: 1 } }
    : { onPress: Keyboard.dismiss, accessible: false };

  return (
    <ThemeContent>
    <View style={styles.container}>
      <CustomHeader 
        title="Nuevo movimiento"
        onBackPress={onGoBack || (() => navigation('home'))}
        backIcon="close"
        backAccessibilityLabel="Cancelar y cerrar movimiento"
        showHelp={false}
        rightComponent={
          <TouchableOpacity style={styles.typeBadge} onPress={() => setTypeDropdownVisible(true)} activeOpacity={0.7}>
            <Ionicons 
              name={movementType === 'Egreso' ? "arrow-down-circle" : "arrow-up-circle"} 
              size={14} 
              color={movementType === 'Egreso' ? "#f87171" : "#a3e635"} 
            />
            <Text style={styles.typeBadgeText}>{movementType}</Text>
            <Ionicons name="chevron-down" size={12} color="#aaa" />
          </TouchableOpacity>
        }
      />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <KeyboardDismissWrapper {...keyboardDismissWrapperProps}>
      <ScrollView contentContainerStyle={styles.mainContentLayout} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}>
        <View style={styles.currencyToggleRow}>
          <View style={[styles.toggleBtn, styles.toggleBtnActive]}>
            <Text style={[styles.toggleText, styles.toggleTextActive]}>
              {getCurrencyIdentifierText()}
            </Text>
          </View>
        </View>

        <View style={styles.amountDisplayContainer}>
          <Text style={styles.mainAmountText} numberOfLines={1} adjustsFontSizeToFit>
            {selectedAccount?.currency === 'USD' || selectedAccount?.currency === 'USDT' ? '$ ' : 'Bs '}
            {formatCurrencyValue(finalTotalAmount, selectedAccount?.currency)}
          </Text>
          <Text style={styles.convertedAmountText}>{convertedDisplay}</Text>
          {commissionAmount > 0 && (
            <Text style={styles.commissionTagInfo}>
              {selectedCommission === 'paypal'
                ? movementType === 'Ingreso'
                  ? `PayPal: recibido ${formatCurrencyValue(numericAmount, selectedAccount?.currency)} − comisión ${formatCurrencyValue(commissionAmount, selectedAccount?.currency)} = ingreso neto ${formatCurrencyValue(finalTotalAmount, selectedAccount?.currency)}`
                  : `PayPal: la comisión estimada (${formatCurrencyValue(commissionAmount, selectedAccount?.currency)}) ya está incluida en el egreso total`
                : isRejectedOrReversed
                  ? `La operación no afecta el saldo; se descontará únicamente la comisión fija de ${formatCurrencyValue(commissionAmount, selectedAccount?.currency)}`
                : movementType === 'Ingreso'
                  ? 'Esta comisión solo se aplica a egresos; no se descontará del ingreso'
                  : `Se registrará un egreso adicional vinculado por ${formatCurrencyValue(commissionAmount, selectedAccount?.currency)}`}
            </Text>
          )}
        </View>

        <TouchableOpacity style={styles.accountSelectorCard} onPress={() => setAccountDropdownVisible(true)} activeOpacity={0.7}>
          <View style={styles.accountCardInner}>
            <View style={styles.accountIconContainer}>
              <Ionicons name="wallet-outline" size={16} color="#a3e635" />
            </View>
            <View style={styles.accountTextContainer}>
              <Text style={styles.accountCardName} numberOfLines={1}>
                {selectedAccount?.name || 'Seleccionar cuenta'}
              </Text>
              <Text style={styles.accountCardBalance} numberOfLines={1}>
                {selectedAccount?.currency === 'USD' || selectedAccount?.currency === 'USDT' ? '$' : 'Bs'}
                {formatCurrencyValue(selectedAccount?.balance, selectedAccount?.currency)}
              </Text>
            </View>
            <Ionicons name="chevron-down" size={12} color="#888" style={styles.accountChevron} />
          </View>
        </TouchableOpacity>

        <View style={styles.descriptionRow}>
          <TextInput 
            style={styles.descriptionInput}
            placeholder="Descripción"
            placeholderTextColor="#777"
            value={description}
            onChangeText={setDescription}
          />
          <Text style={styles.descriptionTagLabel}>Tu {movementType.toLowerCase()}</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScrollRow}>
          <TouchableOpacity style={styles.optionChip} onPress={() => setDateModalVisible(true)} activeOpacity={0.7}>
            <Ionicons name="calendar-outline" size={14} color="#ccc" style={{ marginRight: 6 }} />
            <Text style={styles.optionChipText}>{dateButtonDisplayLabel}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.optionChip} onPress={() => setTimeModalVisible(true)} activeOpacity={0.7}>
            <Ionicons name="time-outline" size={14} color="#ccc" style={{ marginRight: 6 }} />
            <Text style={styles.optionChipText}>{selectedHour}:{selectedMinute} {selectedAmPm}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.optionChip} onPress={() => setCategoryModalVisible(true)} activeOpacity={0.7}>
            <Ionicons name="pricetag-outline" size={14} color="#ccc" style={{ marginRight: 6 }} />
            <Text style={styles.optionChipText}>{selectedCategory}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.optionChip} onPress={() => setRateModalVisible(true)} activeOpacity={0.7}>
            <Ionicons name="trending-up-outline" size={14} color="#ccc" style={{ marginRight: 6 }} />
            <Text style={styles.optionChipText}>~ ${formatCurrencyValue(activeRate, 'USD')} ({rateModeLabel})</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.optionChip} onPress={() => setCommissionModalVisible(true)} activeOpacity={0.7}>
            <Ionicons name="document-text-outline" size={14} color="#ccc" style={{ marginRight: 6 }} />
            <Text style={styles.optionChipText}>
              {selectedCommission ? 'Comisión aplicada' : 'Comisión'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </ScrollView>
      </KeyboardDismissWrapper>
      </KeyboardAvoidingView>

      {/* Teclado numérico */}
      {!systemKeyboardVisible && <View style={styles.calculatorPad}>
        <View style={styles.calcRow}>
          <TouchableOpacity style={styles.calcKey} onPress={() => handlePressKey('1')} activeOpacity={0.7}><Text style={styles.calcKeyText}>1</Text></TouchableOpacity>
          <TouchableOpacity style={styles.calcKey} onPress={() => handlePressKey('2')} activeOpacity={0.7}><Text style={styles.calcKeyText}>2</Text></TouchableOpacity>
          <TouchableOpacity style={styles.calcKey} onPress={() => handlePressKey('3')} activeOpacity={0.7}><Text style={styles.calcKeyText}>3</Text></TouchableOpacity>
          <TouchableOpacity style={styles.calcKey} onPress={handleClearKey} activeOpacity={0.7}><Text style={styles.calcKeyYellowText}>C</Text></TouchableOpacity>
        </View>
        <View style={styles.calcRow}>
          <TouchableOpacity style={styles.calcKey} onPress={() => handlePressKey('4')} activeOpacity={0.7}><Text style={styles.calcKeyText}>4</Text></TouchableOpacity>
          <TouchableOpacity style={styles.calcKey} onPress={() => handlePressKey('5')} activeOpacity={0.7}><Text style={styles.calcKeyText}>5</Text></TouchableOpacity>
          <TouchableOpacity style={styles.calcKey} onPress={() => handlePressKey('6')} activeOpacity={0.7}><Text style={styles.calcKeyText}>6</Text></TouchableOpacity>
          <TouchableOpacity 
            style={[styles.calcKeySubmit, loading && { opacity: 0.7 }]} 
            onPress={handleSaveMovement}
            disabled={loading}
            activeOpacity={0.7}
          >
            <Ionicons name="checkmark" size={20} color="#000" />
          </TouchableOpacity>
        </View>
        <View style={styles.calcRow}>
          <TouchableOpacity style={styles.calcKey} onPress={() => handlePressKey('7')} activeOpacity={0.7}><Text style={styles.calcKeyText}>7</Text></TouchableOpacity>
          <TouchableOpacity style={styles.calcKey} onPress={() => handlePressKey('8')} activeOpacity={0.7}><Text style={styles.calcKeyText}>8</Text></TouchableOpacity>
          <TouchableOpacity style={styles.calcKey} onPress={() => handlePressKey('9')} activeOpacity={0.7}><Text style={styles.calcKeyText}>9</Text></TouchableOpacity>
          <View style={styles.calcKeyEmpty} />
        </View>
        <View style={styles.calcRow}>
          <TouchableOpacity style={styles.calcKey} onPress={() => handlePressKey('00')} activeOpacity={0.7}><Text style={styles.calcKeyText}>00</Text></TouchableOpacity>
          <TouchableOpacity style={styles.calcKey} onPress={() => handlePressKey('0')} activeOpacity={0.7}><Text style={styles.calcKeyText}>0</Text></TouchableOpacity>
          <TouchableOpacity style={styles.calcKey} onPress={handleDeleteKey} activeOpacity={0.7}><Ionicons name="backspace-outline" size={20} color="#fff" /></TouchableOpacity>
          <View style={styles.calcKeyEmpty} />
        </View>
      </View>}

      <RateChangeModal 
        visible={rateModalVisible}
        onClose={() => setRateModalVisible(false)}
        rates={rates}
        onApplyRate={(newRate, modeLabel) => {
          setActiveRate(newRate);
          setRateModeLabel(modeLabel);
        }}
      />

      {/* Modal Hora en Formato 12 Horas (AM / PM) */}
      <ThemedModal visible={timeModalVisible} transparent animationType="fade" onRequestClose={() => setTimeModalVisible(false)}>
        <View style={rateModalStyles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={Keyboard.dismiss}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
          <KeyboardAvoidingView
            pointerEvents="box-none"
            style={{ flex: 1, width: '100%', justifyContent: 'center', alignItems: 'center' }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
          <View style={rateModalStyles.modalContainer}>
            <View style={rateModalStyles.modalHeader}>
              <TouchableOpacity style={rateModalStyles.closeButton} onPress={() => setTimeModalVisible(false)} activeOpacity={0.7}>
                <Ionicons name="close" size={20} color="#fff" />
              </TouchableOpacity>
              <Text style={rateModalStyles.modalTitle}>Hora del movimiento</Text>
              <TouchableOpacity style={rateModalStyles.confirmButton} onPress={() => setTimeModalVisible(false)} activeOpacity={0.8}>
                <Ionicons name="checkmark" size={20} color="#000" />
              </TouchableOpacity>
            </View>

            <View style={rateModalStyles.rateDisplayCard}>
              <View style={[rateModalStyles.rateInfoRow, { justifyContent: 'center', alignItems: 'center' }]}>
                <TextInput
                  style={{ color: '#fff', fontSize: 32, fontWeight: 'bold', width: 60, textAlign: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 10 }}
                  keyboardType="numeric"
                  maxLength={2}
                  value={selectedHour}
                  onChangeText={(val) => {
                    const num = parseInt(val, 10);
                    if (val === '' || (!isNaN(num) && num >= 1 && num <= 12)) {
                      setSelectedHour(val);
                    }
                  }}
                />
                <Text style={{ color: '#fff', fontSize: 32, fontWeight: 'bold', marginHorizontal: 8 }}>:</Text>
                
                <TextInput
                  style={{ color: '#fff', fontSize: 32, fontWeight: 'bold', width: 60, textAlign: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 10 }}
                  keyboardType="numeric"
                  maxLength={2}
                  value={selectedMinute}
                  onChangeText={(val) => {
                    const num = parseInt(val, 10);
                    if (val === '' || (!isNaN(num) && num >= 0 && num <= 59)) {
                      setSelectedMinute(val);
                    }
                  }}
                />

                <View style={{ marginLeft: 12, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
                  <TouchableOpacity 
                    style={{ paddingVertical: 6, paddingHorizontal: 12, backgroundColor: selectedAmPm === 'AM' ? '#a3e635' : 'transparent' }}
                    onPress={() => setSelectedAmPm('AM')}
                  >
                    <Text style={{ color: selectedAmPm === 'AM' ? '#000' : '#888', fontWeight: 'bold', fontSize: 13 }}>AM</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={{ paddingVertical: 6, paddingHorizontal: 12, backgroundColor: selectedAmPm === 'PM' ? '#a3e635' : 'transparent' }}
                    onPress={() => setSelectedAmPm('PM')}
                  >
                    <Text style={{ color: selectedAmPm === 'PM' ? '#000' : '#888', fontWeight: 'bold', fontSize: 13 }}>PM</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
            <Text style={rateModalStyles.footerNoteText}>Formato de 12 horas (Ej: 02:30 PM)</Text>
          </View>
          </KeyboardAvoidingView>
        </View>
      </ThemedModal>

      {/* Modal Fecha */}
      <ThemedModal visible={dateModalVisible} transparent animationType="fade" onRequestClose={() => setDateModalVisible(false)}>
        <View style={rateModalStyles.modalOverlay}>
          <View style={rateModalStyles.modalContainer}>
            <View style={rateModalStyles.modalHeader}>
              <TouchableOpacity style={rateModalStyles.closeButton} onPress={() => setDateModalVisible(false)} activeOpacity={0.7}>
                <Ionicons name="close" size={20} color="#fff" />
              </TouchableOpacity>
              <Text style={rateModalStyles.modalTitle}>Fecha del movimiento</Text>
              <TouchableOpacity style={rateModalStyles.confirmButton} onPress={() => setDateModalVisible(false)} activeOpacity={0.8}>
                <Ionicons name="checkmark" size={20} color="#000" />
              </TouchableOpacity>
            </View>

            <View style={rateModalStyles.rateDisplayCard}>
              <View style={rateModalStyles.rateInfoRow}>
                <TouchableOpacity onPress={handlePrevMonth} activeOpacity={0.7}>
                  <Ionicons name="chevron-back" size={20} color="#fff" />
                </TouchableOpacity>
                <Text style={rateModalStyles.rateInfoRightValue}>{MONTHS[selectedMonthIndex]} de {selectedYear}</Text>
                <TouchableOpacity onPress={handleNextMonth} activeOpacity={0.7}>
                  <Ionicons name="chevron-forward" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={{ width: '100%', marginBottom: 13 }}>
              <View style={calendarStyles.weekDaysRow}>
                {['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'].map((w, index) => (
                  <Text key={index} style={calendarStyles.weekDayText}>{w}</Text>
                ))}
              </View>

              <View style={calendarStyles.daysGrid}>
                {blanksArray.map(b => (
                  <View key={`blank-${b}`} style={calendarStyles.dayCellEmpty} />
                ))}
                {daysArray.map(d => (
                  <TouchableOpacity 
                    key={d} 
                    style={[calendarStyles.dayCell, selectedDay === d && calendarStyles.dayCellSelected]}
                    onPress={() => setSelectedDay(d)}
                    activeOpacity={0.7}
                  >
                    <Text style={[calendarStyles.dayCellText, selectedDay === d && calendarStyles.dayCellTextSelected]}>{d}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </View>
      </ThemedModal>

      {/* Modal Comisión */}
      <ThemedModal visible={commissionModalVisible} transparent animationType="slide" onRequestClose={() => setCommissionModalVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setCommissionModalVisible(false)}>
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()} style={{ width: '100%' }}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeaderRow}>
                <Text style={styles.modalTitle}>Seleccionar Comisión</Text>
                <TouchableOpacity onPress={() => setCommissionModalVisible(false)}><Ionicons name="close" size={20} color="#fff" /></TouchableOpacity>
              </View>
               
              <TouchableOpacity 
                style={styles.categoryOptionRow}
                onPress={() => { setSelectedCommission(null); setCommissionModalVisible(false); }}
              >
                <Text style={styles.categoryOptionText}>Sin comisión</Text>
                {!selectedCommission && <Ionicons name="checkmark" size={16} color="#a3e635" />}
              </TouchableOpacity>

              {isNationalAccount ? (
                <>
                  {VES_COMMISSION_OPTIONS.map(option => (
                    <TouchableOpacity
                      key={option.type}
                      style={styles.categoryOptionRow}
                      onPress={() => { setSelectedCommission(option.type); setCommissionModalVisible(false); }}
                    >
                      <Text style={styles.categoryOptionText}>{option.label}</Text>
                      {selectedCommission === option.type && <Ionicons name="checkmark" size={16} color="#a3e635" />}
                    </TouchableOpacity>
                  ))}
                </>
              ) : (
                <TouchableOpacity 
                  style={styles.categoryOptionRow}
                  onPress={() => { setSelectedCommission('paypal'); setCommissionModalVisible(false); }}
                >
                  <Text style={styles.categoryOptionText}>Comisión PayPal (5.4% + $0.30)</Text>
                  {selectedCommission === 'paypal' && <Ionicons name="checkmark" size={16} color="#a3e635" />}
                </TouchableOpacity>
              )}
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </ThemedModal>

      {/* Modal Tipo */}
      <ThemedModal visible={typeDropdownVisible} transparent animationType="fade" onRequestClose={() => setTypeDropdownVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setTypeDropdownVisible(false)}>
          <View style={styles.dropdownPopup}>
            <TouchableOpacity style={styles.dropdownOption} onPress={() => { setMovementType('Egreso'); setTypeDropdownVisible(false); }}>
              <Ionicons name="arrow-down-circle" size={16} color="#f87171" style={{ marginRight: 10 }} />
              <Text style={styles.dropdownText}>Egreso</Text>
              {movementType === 'Egreso' && <Ionicons name="checkmark" size={16} color="#a3e635" style={{ marginLeft: 'auto' }} />}
            </TouchableOpacity>
            <TouchableOpacity style={styles.dropdownOption} onPress={() => { setMovementType('Ingreso'); setTypeDropdownVisible(false); }}>
              <Ionicons name="arrow-up-circle" size={16} color="#a3e635" style={{ marginRight: 10 }} />
              <Text style={styles.dropdownText}>Ingreso</Text>
              {movementType === 'Ingreso' && <Ionicons name="checkmark" size={16} color="#a3e635" style={{ marginLeft: 'auto' }} />}
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </ThemedModal>

      {/* Modal Cuenta */}
      <ThemedModal visible={accountDropdownVisible} transparent animationType="slide" onRequestClose={() => setAccountDropdownVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setAccountDropdownVisible(false)}>
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()} style={{ width: '100%' }}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeaderRow}>
                <Text style={styles.modalTitle}>Seleccionar cuenta</Text>
                <TouchableOpacity onPress={() => setAccountDropdownVisible(false)}><Ionicons name="close" size={20} color="#fff" /></TouchableOpacity>
              </View>
              {accounts.map(acc => (
                <TouchableOpacity 
                  key={acc.id} 
                  style={styles.accountOptionRow}
                  onPress={() => { 
                    setSelectedAccount(acc); 
                    setCurrencyMode(acc.currency || 'VES');
                    setAccountDropdownVisible(false); 
                  }}
                >
                  <Text style={styles.accountOptionText}>{acc.name}</Text>
                  <Text style={styles.accountOptionBalance}>
                    {acc.currency === 'USD' || acc.currency === 'USDT' ? '$' : 'Bs'}
                    {formatCurrencyValue(acc.balance, acc.currency)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </ThemedModal>

{/* Modal Categoría */}
      <ThemedModal visible={categoryModalVisible} transparent animationType="slide" onRequestClose={() => setCategoryModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setCategoryModalVisible(false)} />
          <View style={styles.smallModalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Categorías</Text>
              <TouchableOpacity onPress={() => setCategoryModalVisible(false)}><Ionicons name="close" size={20} color="#fff" /></TouchableOpacity>
            </View>
            <ScrollView 
              style={styles.categoryScrollList} 
              contentContainerStyle={{ paddingBottom: 20 }}
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}
              keyboardShouldPersistTaps="handled"
            >
              {parentCategories.map(cat => {
                const subCategories = categoriesList.filter(sub => String(sub.parent_id) === String(cat.id));
                const hasSubCategories = subCategories.length > 0;
                const isExpanded = expandedCategoryName === cat.name;

                return (
                  <View key={cat.id}>
                    <View style={[styles.categoryOptionRow, { paddingRight: 8 }]}>
                      <TouchableOpacity 
                        style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}
                        onPress={() => { setSelectedCategory(cat.name); setCategoryModalVisible(false); }}
                      >
                        <Ionicons name={cat.icon || 'folder-outline'} size={16} color={cat.color || '#3b82f6'} style={{ marginRight: 10 }} />
                        <Text style={styles.categoryOptionText}>{cat.name}</Text>
                      </TouchableOpacity>

                      {selectedCategory === cat.name && (
                        <Ionicons name="checkmark" size={16} color="#a3e635" style={{ marginRight: 10 }} />
                      )}

                      {hasSubCategories && (
                        <TouchableOpacity 
                          style={{ padding: 6, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 8 }}
                          onPress={() => setExpandedCategoryName(isExpanded ? null : cat.name)}
                        >
                          <Ionicons 
                            name={isExpanded ? "chevron-up" : "chevron-down"} 
                            size={14} 
                            color="#888" 
                          />
                        </TouchableOpacity>
                      )}
                    </View>

                    {hasSubCategories && isExpanded && subCategories.map(sub => (
                      <TouchableOpacity 
                        key={sub.id} 
                        style={[styles.categoryOptionRow, { paddingLeft: 30, backgroundColor: 'rgba(255,255,255,0.02)' }]}
                        onPress={() => { setSelectedCategory(sub.name); setCategoryModalVisible(false); }}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Ionicons name={sub.icon || 'ellipse-outline'} size={14} color={sub.color || '#888'} style={{ marginRight: 10 }} />
                          <Text style={[styles.categoryOptionText, { fontSize: 13, color: '#ccc' }]}>└ {sub.name}</Text>
                        </View>
                        {selectedCategory === sub.name && <Ionicons name="checkmark" size={16} color="#a3e635" />}
                      </TouchableOpacity>
                    ))}
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </ThemedModal>
    </View>
    </ThemeContent>
  );
}

const calendarStyles = StyleSheet.create({
  weekDaysRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, paddingHorizontal: 4 },
  weekDayText: { color: '#666', fontSize: 10, fontWeight: 'bold', width: '14%', textAlign: 'center' },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start' },
  dayCellEmpty: { width: '14.28%', aspectRatio: 1, marginVertical: 2 },
  dayCell: { width: '14.28%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center', marginVertical: 2, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.03)' },
  dayCellSelected: { backgroundColor: '#a3e635' },
  dayCellText: { color: '#fff', fontSize: 13, fontWeight: '500' },
  dayCellTextSelected: { color: '#000', fontWeight: 'bold' }
});

const rateModalStyles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContainer: { width: '100%', maxWidth: 360, maxHeight: '63%', backgroundColor: 'rgba(20,20,22,0.92)', borderRadius: 28, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
   
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 20 },
  closeButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.08)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  modalTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  confirmButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#a3e635', justifyContent: 'center', alignItems: 'center' },

  tabsRow: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 24, padding: 4, width: '100%', marginBottom: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  tabItem: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 20 },
  tabItemActive: { backgroundColor: 'rgba(255,255,255,0.12)' },
  tabText: { color: '#888', fontSize: 12, fontWeight: 'bold' },
  tabTextActive: { color: '#fff' },

  rateDisplayCard: { 
    backgroundColor: 'rgba(255,255,255,0.05)', 
    borderRadius: 20, 
    paddingVertical: 16, 
    paddingHorizontal: 18, 
    width: '100%', 
    marginBottom: 15,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)'
  },
  rateInfoRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center' 
  },
  rateInfoLeftLabel: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  rateInfoRightValue: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

  manualSectionContainer: { width: '100%', alignItems: 'center', marginBottom: 15 },
  manualTitleLabel: { color: '#888', fontSize: 13, marginBottom: 6 },
  manualBigValueText: { color: '#fff', fontSize: 32, fontWeight: 'bold', marginBottom: 20 },

  miniKeypad: { width: '100%', backgroundColor: 'rgba(10,10,12,0.95)', borderRadius: 20, padding: 10, borderWidth: 1.2, borderColor: 'rgba(255,255,255,0.1)' },
  keyRow: NUMERIC_KEYPAD_STYLES.row,
  keyBtn: NUMERIC_KEYPAD_STYLES.key,
  keyEmpty: NUMERIC_KEYPAD_STYLES.emptyKey,
  keyText: NUMERIC_KEYPAD_STYLES.keyText,
  keyTextYellow: NUMERIC_KEYPAD_STYLES.clearKeyText,

  footerNoteText: { color: '#666', fontSize: 11, textAlign: 'center', marginTop: 10 }
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  typeBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.07)', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1.2, borderColor: 'rgba(255, 255, 255, 0.15)' },
  typeBadgeText: { color: '#fff', fontSize: 12, fontWeight: 'bold', marginHorizontal: 5 },
   
  mainContentLayout: { paddingHorizontal: 20, paddingVertical: 12, alignItems: 'stretch' },

  currencyToggleRow: { flexDirection: 'row', backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: 20, padding: 4, marginBottom: 12, width: '50%', alignSelf: 'center', borderWidth: 1.2, borderColor: 'rgba(255, 255, 255, 0.12)' },
  toggleBtn: { flex: 1, paddingVertical: 6, alignItems: 'center', borderRadius: 16 },
  toggleBtnActive: { backgroundColor: 'rgba(255, 255, 255, 0.12)' },
  toggleText: { color: '#888', fontSize: 12, fontWeight: 'bold' },
  toggleTextActive: { color: '#a3e635' },
   
  amountDisplayContainer: { alignItems: 'center', marginBottom: 14 },
  mainAmountText: { color: '#fff', fontSize: 32, fontWeight: 'bold', textAlign: 'center' },
  convertedAmountText: { color: '#888', fontSize: 13, marginTop: 4 },
  commissionTagInfo: { color: '#fbbf24', fontSize: 12, marginTop: 2 },
   
  accountSelectorCard: { 
    backgroundColor: 'rgba(255, 255, 255, 0.07)', 
    borderRadius: 20, 
    paddingVertical: 10, 
    paddingHorizontal: 16, 
    marginBottom: 12, 
    alignSelf: 'center',
    width: '100%',
    maxWidth: 380,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.18)'
  },
  accountCardInner: { 
    flexDirection: 'row', 
    alignItems: 'center'
  },
  accountIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)'
  },
  accountTextContainer: {
    flex: 1,
    alignItems: 'flex-start',
  },
  accountCardName: { 
    color: '#fff', 
    fontSize: 14, 
    fontWeight: 'bold', 
    marginBottom: 2
  },
  accountCardBalance: { 
    color: '#888', 
    fontSize: 12
  },
  accountChevron: {
    marginLeft: 8
  },
   
  descriptionRow: { flexDirection: 'row', backgroundColor: 'rgba(255, 255, 255, 0.06)', borderRadius: 16, paddingHorizontal: 15, alignItems: 'center', height: 46, marginBottom: 12, borderWidth: 1.2, borderColor: 'rgba(255, 255, 255, 0.12)', width: '100%', maxWidth: 380, alignSelf: 'center' },
  descriptionInput: { flex: 1, color: '#fff', fontSize: 14 },
  descriptionTagLabel: { color: '#777', fontSize: 13 },
   
  chipsScrollRow: { paddingVertical: 4, marginBottom: 8, alignSelf: 'center' },
  optionChip: { flexDirection: 'row', backgroundColor: 'rgba(255, 255, 255, 0.07)', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, alignItems: 'center', marginRight: 10, height: 38, borderWidth: 1.2, borderColor: 'rgba(255, 255, 255, 0.14)' },
  optionChipText: { color: '#ccc', fontSize: 12, fontWeight: '500' },
   
  calculatorPad: NUMERIC_KEYPAD_STYLES.container,
  calcRow: NUMERIC_KEYPAD_STYLES.row,
  calcKey: NUMERIC_KEYPAD_STYLES.key,
  calcKeySubmit: NUMERIC_KEYPAD_STYLES.submitKey,
  calcKeyEmpty: NUMERIC_KEYPAD_STYLES.emptyKey,
  calcKeyText: NUMERIC_KEYPAD_STYLES.keyText,
  calcKeyYellowText: NUMERIC_KEYPAD_STYLES.clearKeyText,

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  dropdownPopup: { backgroundColor: 'rgba(25,25,28,0.95)', position: 'absolute', top: 60, right: 15, borderRadius: 12, padding: 8, width: 140, borderWidth: 1.2, borderColor: 'rgba(255,255,255,0.15)' },
  dropdownOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 8 },
  dropdownText: { color: '#fff', fontSize: 13 },
  modalCard: { backgroundColor: 'rgba(18,18,20,0.95)', borderTopLeftRadius: 24, borderTopRightRadius: 24, borderRadius: 24, padding: 20, paddingBottom: 25, borderWidth: 1.2, borderColor: 'rgba(255,255,255,0.12)' },
   
  smallModalCard: { backgroundColor: 'rgba(18,18,20,0.95)', width: '100%', alignSelf: 'center', borderTopLeftRadius: 24, borderTopRightRadius: 24, borderRadius: 24, padding: 20, maxHeight: '50%', paddingBottom: 30, borderWidth: 1.2, borderColor: 'rgba(255,255,255,0.12)' },
  categoryScrollList: { width: '100%' },

  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

  accountOptionRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' },
  accountOptionText: { color: '#fff', fontSize: 15 },
  accountOptionBalance: { color: '#888', fontSize: 14 },
  categoryOptionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' },
  categoryOptionText: { color: '#fff', fontSize: 15 }
});