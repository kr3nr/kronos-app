import ThemedModal from "../../components/ThemedModal";
import React, { useRef, useState } from 'react';
import { 
  StyleSheet, Text, View, TouchableOpacity,
  TextInput, Modal, Platform, Image, ScrollView 
} from 'react-native';
import { Alert } from '../../services/appAlert';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import CustomHeader from '../../components/CustomHeader';
import { supabase } from '../../services/supabase';
import ScreenWrapper from '../../components/ScreenWrapper';
import ThemeContent from '../../components/ThemeContent';
import { NUMERIC_KEYPAD_STYLES } from '../../components/numericKeypadStyles';
import {
  calculateCommissionAmount,
  REJECTED_OR_REVERSED_COMMISSION_TYPE,
  VES_COMMISSION_OPTIONS
} from '../../services/movementCommissions';
import { getBolivarRate } from '../../services/currencyService';

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

export default function TransferScreen({ navigation, onGoBack, accounts, setAccounts, movements, setMovements, rates, currentAccount, userId }) {
  const [fromAccount, setFromAccount] = useState(currentAccount || accounts[0]);
  const [toAccount, setToAccount] = useState(accounts.find(a => a.id !== (currentAccount?.id || accounts[0]?.id)) || accounts[0]);

  const [rawCents, setRawCents] = useState('0');
  const [receiptImage, setReceiptImage] = useState(null); 

  // Modales y Estados de Tasas y Comisiones
  const [rateModalVisible, setRateModalVisible] = useState(false);
  const [activeRate, setActiveRate] = useState(rates?.bcvRate || 1);
  const [rateModeLabel, setRateModeLabel] = useState('USD');
  const [selectedRateType, setSelectedRateType] = useState('bcv');
  const [manualRateRawCents, setManualRateRawCents] = useState('0');

  const [commissionModalVisible, setCommissionModalVisible] = useState(false);
  const [selectedCommissionType, setSelectedCommissionType] = useState(null);
  const [savingTransfer, setSavingTransfer] = useState(false);
  const transferSaveLock = useRef(false);
    
  const [fromModalVisible, setFromModalVisible] = useState(false);
  const [toModalVisible, setToModalVisible] = useState(false);
  const [helpModalVisible, setHelpModalVisible] = useState(false);

  const now = new Date();
  const [dateModalVisible, setDateModalVisible] = useState(false);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(now.getMonth());
  const [selectedDay, setSelectedDay] = useState(now.getDate());

  // Estados de hora 12h idénticos al de Agregar Movimientos
  const [timeModalVisible, setTimeModalVisible] = useState(false);
  const rawHours = now.getHours();
  const initialAmPm = rawHours >= 12 ? 'PM' : 'AM';
  const initial12Hours = ((rawHours % 12) || 12).toString().padStart(2, '0');
  const currentMinutes = now.getMinutes().toString().padStart(2, '0');

  const [selectedHour, setSelectedHour] = useState(initial12Hours);
  const [selectedMinute, setSelectedMinute] = useState(currentMinutes);
  const [selectedAmPm, setSelectedAmPm] = useState(initialAmPm);

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

  const manualRateValue = parseInt(manualRateRawCents, 10) / 100;
  const handleManualRateKey = (key) => {
    if (key === '00') {
      if (manualRateRawCents === '0') return;
      setManualRateRawCents(manualRateRawCents + '00');
    } else {
      if (manualRateRawCents === '0') {
        setManualRateRawCents(key);
      } else {
        setManualRateRawCents(manualRateRawCents + key);
      }
    }
  };

  const pickReceiptImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permiso denegado', 'Necesitamos acceso a tus fotos para adjuntar el comprobante.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setReceiptImage(result.assets[0].uri);
    }
  };

  const numericAmount = parseInt(rawCents, 10) / 100;

  const isRejectedOrReversed = selectedCommissionType === REJECTED_OR_REVERSED_COMMISSION_TYPE;
  const commissionAmount = selectedCommissionType === 'paypal'
    ? (numericAmount * 0.054) + 0.30
    : calculateCommissionAmount(selectedCommissionType, 'Egreso', numericAmount);

  const effectiveTransferAmount = isRejectedOrReversed
    ? 0
    : selectedCommissionType === 'paypal'
      ? Math.max(0, numericAmount - commissionAmount)
      : numericAmount;

  const getTransferBolivarRate = currency => {
    const officialRate = getBolivarRate(currency || 'USD', rates);
    if (selectedRateType !== 'custom' || currency === 'VES') return officialRate;

    const referenceRate = getBolivarRate('USD', rates);
    if (!officialRate || !referenceRate) return null;
    return officialRate * (activeRate / referenceRate);
  };
  const fromCurrencyRate = getTransferBolivarRate(fromAccount.currency);
  const toCurrencyRate = getTransferBolivarRate(toAccount.currency);
  const receivedAmount = fromCurrencyRate > 0 && toCurrencyRate > 0
    ? effectiveTransferAmount * fromCurrencyRate / toCurrencyRate
    : 0;

  const outboundAmount = -effectiveTransferAmount;
  const inboundAmount = receivedAmount;

  const handleSwapAccounts = () => {
    const tempAccount = fromAccount;
    setFromAccount(toAccount);
    setToAccount(tempAccount);

    if (receivedAmount > 0) {
      setRawCents(Math.round(receivedAmount * 100).toString());
    }
  };

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

  const handleSaveTransfer = async () => {
    if (numericAmount <= 0 && !isRejectedOrReversed) return;
    if (transferSaveLock.current) return;
    if (fromAccount.id === toAccount.id) {
      Alert.alert('Atención', 'La cuenta de origen y destino no pueden ser la misma.');
      return;
    }

    const totalRequiredBalance = isRejectedOrReversed
      ? commissionAmount
      : selectedCommissionType === 'paypal'
        ? numericAmount
        : (selectedCommissionType ? numericAmount + commissionAmount : numericAmount);

    if (fromAccount.balance < totalRequiredBalance) {
      Alert.alert('Saldo insuficiente', 'El balance de la cuenta de origen no cubre el monto a transferir y/o comisiones.');
      return;
    }

    transferSaveLock.current = true;
    setSavingTransfer(true);
    const newFromBalance = fromAccount.balance - totalRequiredBalance;
    const newToBalance = toAccount.balance + receivedAmount;

    try {
      const updatedAccounts = accounts.map(acc => {
        if (String(acc.id) === String(fromAccount.id)) {
          return { ...acc, balance: newFromBalance };
        }
        if (String(acc.id) === String(toAccount.id)) {
          return { ...acc, balance: newToBalance };
        }
        return acc;
      });

      const generateUuid = () => {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
          return crypto.randomUUID();
        }
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
          const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
      };

const outId = generateUuid();
      const inId = generateUuid();
      const finalTimeString = `${selectedHour}:${selectedMinute} ${selectedAmPm}`;

      const outboundDbRecord = {
        id: outId,
        user_id: userId,
        account_id: fromAccount.id,
        title: `Transferencia a ${toAccount.name}`,
        category: 'Transferencia',
        amount: outboundAmount,
        sub_amount: `${fromAccount.currency === 'VES' ? 'Bs. ' : '$ '}${formatCurrencyValue(effectiveTransferAmount, fromAccount.currency)}`,
        time: finalTimeString,
        type: 'Egresos',
        month_index: selectedMonthIndex,
        day: selectedDay
      };

      const inboundDbRecord = {
        id: inId,
        user_id: userId,
        account_id: toAccount.id,
        title: `Transferencia de ${fromAccount.name}`,
        category: 'Transferencia',
        amount: inboundAmount,
        sub_amount: `${toAccount.currency === 'VES' ? 'Bs. ' : '$ '}${formatCurrencyValue(receivedAmount, toAccount.currency)}`,
        time: finalTimeString,
        type: 'Ingresos',
        month_index: selectedMonthIndex,
        day: selectedDay
      };

      let dbRecordsList = isRejectedOrReversed ? [] : [outboundDbRecord, inboundDbRecord];

      // Las comisiones bancarias se registran como egresos independientes.
      if (commissionAmount > 0 && selectedCommissionType !== 'paypal') {
        const commissionLabel = VES_COMMISSION_OPTIONS.find(option => option.type === selectedCommissionType)?.shortLabel || 'Transferencia';
        const commTitle = isRejectedOrReversed
          ? 'Comisión por operación rechazada/reversada'
          : `Comisión ${commissionLabel}`;
        const commissionDbRecord = {
          id: generateUuid(),
          user_id: userId,
          account_id: fromAccount.id, // Se descuenta de la cuenta de origen
          title: commTitle,
          category: 'Comisiones',
          amount: -commissionAmount,
          sub_amount: `${fromAccount.currency === 'VES' ? 'Bs. ' : '$ '}${formatCurrencyValue(commissionAmount, fromAccount.currency)}`,
          time: finalTimeString,
          type: 'Egresos',
          month_index: selectedMonthIndex,
          day: selectedDay
        };
        dbRecordsList.push(commissionDbRecord);
      }


      if (userId && dbRecordsList.length > 0) {
        const { data: savedRecords, error: movementError } = await supabase
          .from('movements')
          .insert(dbRecordsList)
          .select('id');
        if (movementError) throw movementError;

        const savedIds = (savedRecords || []).map(record => record.id);
        const deleteSavedRecords = async () => {
          if (!savedIds.length) return;
          const { error } = await supabase.from('movements').delete().in('id', savedIds);
          if (error) throw error;
        };

        const { error: fromAccountError } = await supabase
          .from('accounts')
          .update({ balance: newFromBalance })
          .eq('id', fromAccount.id);
        if (fromAccountError) {
          try {
            await deleteSavedRecords();
          } catch (rollbackError) {
            throw new Error(`No se actualizó la cuenta de origen (${fromAccountError.message}) y no se pudieron retirar los movimientos creados (${rollbackError.message}).`);
          }
          throw fromAccountError;
        }

        const { error: toAccountError } = await supabase
          .from('accounts')
          .update({ balance: newToBalance })
          .eq('id', toAccount.id);
        if (toAccountError) {
          const { error: balanceRollbackError } = await supabase
            .from('accounts')
            .update({ balance: fromAccount.balance })
            .eq('id', fromAccount.id);
          try {
            await deleteSavedRecords();
          } catch (movementRollbackError) {
            throw new Error(`No se actualizó la cuenta destino (${toAccountError.message}); movimientos no retirados: ${movementRollbackError.message}${balanceRollbackError ? `; saldo origen no restaurado: ${balanceRollbackError.message}` : ''}.`);
          }
          if (balanceRollbackError) {
            throw new Error(`No se actualizó la cuenta destino (${toAccountError.message}) y no se restauró el saldo de origen (${balanceRollbackError.message}).`);
          }
          throw toAccountError;
        }
      } else if (userId) {
        const { error: fromAccountError } = await supabase
          .from('accounts')
          .update({ balance: newFromBalance })
          .eq('id', fromAccount.id);
        if (fromAccountError) throw fromAccountError;
        const { error: toAccountError } = await supabase
          .from('accounts')
          .update({ balance: newToBalance })
          .eq('id', toAccount.id);
        if (toAccountError) throw toAccountError;
      }

      const formattedNewMovements = dbRecordsList.map(m => ({
        ...m,
        accountId: m.account_id,
        monthIndex: m.month_index,
        day: m.day
      }));

      setAccounts(updatedAccounts);
      setMovements(prev => [...formattedNewMovements, ...prev]);

      if (onGoBack) {
        onGoBack();
      } else {
        const updatedCurrentAccount = updatedAccounts.find(a => String(a.id) === String(fromAccount.id));
        navigation('accountDetail', updatedCurrentAccount);
      }
    } catch (error) {
      console.error('Error general al guardar la transferencia:', error);
      Alert.alert('Error', 'No se pudo completar la transferencia.');
    } finally {
      transferSaveLock.current = false;
      setSavingTransfer(false);
    }
  };

  const isNationalAccount = fromAccount?.currency === 'VES';
  const isTodaySelected = selectedDay === now.getDate() && selectedMonthIndex === now.getMonth() && selectedYear === now.getFullYear();
  const dateButtonDisplayLabel = isTodaySelected ? 'Hoy' : `${selectedDay} ${MONTHS[selectedMonthIndex]?.slice(0, 3)}`;

  return (
    <ThemeContent>
    <View style={styles.container}>
      <CustomHeader 
        title="Nueva transferencia"
        onBackPress={onGoBack}
        helpTitle="Registrar una transferencia"
        helpTips={[
          'Elige la cuenta de origen y la cuenta que recibirá el dinero.',
          'Ingresa el monto enviado; la comisión bancaria se registra como egreso aparte.',
          'PayPal calcula el total incluyendo la comisión.',
        ]}
      />

      <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionHeaderLabel}>ENVIASTE</Text>
        <View style={styles.transferCard}>
          <View style={styles.cardTopRow}>
            <TouchableOpacity style={styles.accountSelectorInline} onPress={() => setFromModalVisible(true)} activeOpacity={0.7}>
              <View style={[styles.accountDot, { backgroundColor: '#f87171' }]} />
              <Text style={styles.accountNameText} numberOfLines={1}>{fromAccount.name}</Text>
              <Ionicons name="chevron-down" size={14} color="#888" style={{ marginLeft: 6 }} />
            </TouchableOpacity>
            <Text style={styles.accountBalanceText}>Disp: {formatCurrencyValue(fromAccount.balance, fromAccount.currency)}</Text>
          </View>
          <View style={styles.amountInputRow}>
            <Text style={styles.currencySymbol}>{fromAccount.currency === 'VES' ? 'Bs ' : '$ '}</Text>
            <Text style={styles.mainAmountText} numberOfLines={1} adjustsFontSizeToFit>
              {formatCurrencyValue(numericAmount, fromAccount.currency)}
            </Text>
          </View>
          {commissionAmount > 0 && (
            <Text style={styles.commissionTagInfo}>
              {isRejectedOrReversed
                ? 'Operación rechazada/reversada: no se transfiere el monto; solo se cobra la comisión fija.'
                : `Comisión ${selectedCommissionType === 'paypal' ? 'PayPal (descontada)' : 'aplicada'}: ${formatCurrencyValue(commissionAmount, fromAccount.currency)}`}
            </Text>
          )}
        </View>

        <TouchableOpacity style={styles.swapButtonCenter} onPress={handleSwapAccounts} activeOpacity={0.7}>
          <Ionicons name="swap-vertical" size={18} color="#a3e635" />
        </TouchableOpacity>

        <Text style={styles.sectionHeaderLabel}>RECIBISTE</Text>
        <View style={styles.transferCard}>
          <View style={styles.cardTopRow}>
            <TouchableOpacity style={styles.accountSelectorInline} onPress={() => setToModalVisible(true)} activeOpacity={0.7}>
              <View style={[styles.accountDot, { backgroundColor: '#a3e635' }]} />
              <Text style={styles.accountNameText} numberOfLines={1}>{toAccount.name}</Text>
              <Ionicons name="chevron-down" size={14} color="#888" style={{ marginLeft: 6 }} />
            </TouchableOpacity>
            <Text style={styles.accountBalanceText}>Disp: {formatCurrencyValue(toAccount.balance, toAccount.currency)}</Text>
          </View>
          <View style={styles.amountInputRow}>
            <Text style={styles.currencySymbol}>{toAccount.currency === 'VES' ? 'Bs ' : '$ '}</Text>
            <Text style={styles.convertedAmountText} numberOfLines={1} adjustsFontSizeToFit>
              +{formatCurrencyValue(receivedAmount, toAccount.currency)}
            </Text>
          </View>
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

          <TouchableOpacity style={[styles.optionChip, selectedRateType !== 'bcv' && { borderColor: '#a3e635', borderWidth: 1.2 }]} onPress={() => setRateModalVisible(true)} activeOpacity={0.7}>
            <Ionicons name="trending-up-outline" size={14} color={selectedRateType !== 'bcv' ? '#a3e635' : '#ccc'} style={{ marginRight: 6 }} />
            <Text style={[styles.optionChipText, selectedRateType !== 'bcv' && { color: '#a3e635' }]}>
              Tasa: Bs {formatRateValue(activeRate)} ({rateModeLabel})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.optionChip, selectedCommissionType && { borderColor: '#fbbf24', borderWidth: 1.2 }]} onPress={() => setCommissionModalVisible(true)} activeOpacity={0.7}>
            <Ionicons name="pricetag-outline" size={14} color={selectedCommissionType ? '#fbbf24' : '#ccc'} style={{ marginRight: 6 }} />
            <Text style={[styles.optionChipText, selectedCommissionType && { color: '#fbbf24' }]}>
              {selectedCommissionType ? 'Comisión aplicada ✓' : 'Comisión'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.optionChip, receiptImage && { borderColor: '#a3e635', borderWidth: 1.2 }]} onPress={pickReceiptImage} activeOpacity={0.7}>
            <Ionicons name="image-outline" size={14} color={receiptImage ? '#a3e635' : '#ccc'} style={{ marginRight: 6 }} />
            <Text style={[styles.optionChipText, receiptImage && { color: '#a3e635' }]}>
              {receiptImage ? 'Factura adjunta ✓' : 'Adjuntar factura'}
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {receiptImage && (
          <View style={styles.receiptPreviewContainer}>
            <Image source={{ uri: receiptImage }} style={styles.receiptThumbnail} />
            <TouchableOpacity onPress={() => setReceiptImage(null)} style={styles.removeReceiptBtn}>
              <Ionicons name="close-circle" size={20} color="#f87171" />
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Teclado numérico alineado */}
      <View style={styles.calculatorPad}>
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
          <TouchableOpacity style={styles.calcKeySubmit} onPress={handleSaveTransfer} activeOpacity={0.7} disabled={savingTransfer}><Ionicons name={savingTransfer ? 'hourglass-outline' : 'checkmark'} size={20} color="#000" /></TouchableOpacity>
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
      </View>

      {/* Modal Hora (Formato 12h con selector AM / PM) */}
      <ThemedModal visible={timeModalVisible} transparent animationType="fade" onRequestClose={() => setTimeModalVisible(false)}>
        <View style={rateModalStyles.modalOverlay}>
          <View style={rateModalStyles.modalContainer}>
            <View style={rateModalStyles.modalHeader}>
              <TouchableOpacity style={rateModalStyles.closeButton} onPress={() => setTimeModalVisible(false)} activeOpacity={0.7}>
                <Ionicons name="close" size={20} color="#fff" />
              </TouchableOpacity>
              <Text style={rateModalStyles.modalTitle}>Hora de transferencia</Text>
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
        </View>
      </ThemedModal>

      {/* Modal Tasa */}
      <ThemedModal visible={rateModalVisible} transparent animationType="fade" onRequestClose={() => setRateModalVisible(false)}>
        <View style={rateModalStyles.modalOverlay}>
          <View style={rateModalStyles.modalContainer}>
            <View style={rateModalStyles.modalHeader}>
              <TouchableOpacity style={rateModalStyles.closeButton} onPress={() => setRateModalVisible(false)} activeOpacity={0.7}>
                <Ionicons name="close" size={20} color="#fff" />
              </TouchableOpacity>
              <Text style={rateModalStyles.modalTitle}>Tasa de cambio</Text>
              <TouchableOpacity style={rateModalStyles.confirmButton} onPress={() => setRateModalVisible(false)} activeOpacity={0.8}>
                <Ionicons name="checkmark" size={20} color="#000" />
              </TouchableOpacity>
            </View>

            <View style={rateModalStyles.tabsRow}>
              <TouchableOpacity style={[rateModalStyles.tabItem, rateModeLabel === 'USD' && rateModalStyles.tabItemActive]} onPress={() => { setActiveRate(rates?.bcvRate || 1); setRateModeLabel('USD'); setSelectedRateType('bcv'); }}>
                <Text style={[rateModalStyles.tabText, rateModeLabel === 'USD' && rateModalStyles.tabTextActive]}>$ USD</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[rateModalStyles.tabItem, rateModeLabel === 'EUR' && rateModalStyles.tabItemActive]} onPress={() => { setActiveRate(rates?.eurRate || 36.5); setRateModeLabel('EUR'); setSelectedRateType('eur'); }}>
                <Text style={[rateModalStyles.tabText, rateModeLabel === 'EUR' && rateModalStyles.tabTextActive]}>€ EUR</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[rateModalStyles.tabItem, rateModeLabel === '₮' && rateModalStyles.tabItemActive]} onPress={() => { setActiveRate(rates?.binanceRate || 37.0); setRateModeLabel('₮'); setSelectedRateType('binance'); }}>
                <Text style={[rateModalStyles.tabText, rateModeLabel === '₮' && rateModalStyles.tabTextActive]}>₮ USDT</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[rateModalStyles.tabItem, rateModeLabel === 'Manual' && rateModalStyles.tabItemActive]} onPress={() => { setRateModeLabel('Manual'); setSelectedRateType('custom'); }}>
                <Text style={[rateModalStyles.tabText, rateModeLabel === 'Manual' && rateModalStyles.tabTextActive]}>Manual</Text>
              </TouchableOpacity>
            </View>

            {rateModeLabel !== 'Manual' ? (
              <View style={rateModalStyles.rateDisplayCard}>
                <View style={rateModalStyles.rateInfoRow}>
                  <Text style={rateModalStyles.rateInfoLeftLabel}>1 {rateModeLabel === 'USD' ? 'USD' : rateModeLabel === 'EUR' ? 'EUR' : '₮'}</Text>
                  <Text style={rateModalStyles.rateInfoRightValue}>Bs {formatRateValue(activeRate)}</Text>
                </View>
              </View>
            ) : (
              <View style={rateModalStyles.manualSectionContainer}>
                <Text style={rateModalStyles.manualTitleLabel}>Tasa personalizada</Text>
                <Text style={rateModalStyles.manualBigValueText}>Bs {formatRateValue(manualRateValue)}</Text>
                <View style={rateModalStyles.miniKeypad}>
                  <View style={rateModalStyles.keyRow}>
                    <TouchableOpacity style={rateModalStyles.keyBtn} onPress={() => handleManualRateKey('1')}><Text style={rateModalStyles.keyText}>1</Text></TouchableOpacity>
                    <TouchableOpacity style={rateModalStyles.keyBtn} onPress={() => handleManualRateKey('2')}><Text style={rateModalStyles.keyText}>2</Text></TouchableOpacity>
                    <TouchableOpacity style={rateModalStyles.keyBtn} onPress={() => handleManualRateKey('3')}><Text style={rateModalStyles.keyText}>3</Text></TouchableOpacity>
                    <TouchableOpacity style={rateModalStyles.keyBtn} onPress={() => setManualRateRawCents('0')}><Text style={rateModalStyles.keyTextYellow}>C</Text></TouchableOpacity>
                  </View>
                  <View style={rateModalStyles.keyRow}>
                    <TouchableOpacity style={rateModalStyles.keyBtn} onPress={() => handleManualRateKey('4')}><Text style={rateModalStyles.keyText}>4</Text></TouchableOpacity>
                    <TouchableOpacity style={rateModalStyles.keyBtn} onPress={() => handleManualRateKey('5')}><Text style={rateModalStyles.keyText}>5</Text></TouchableOpacity>
                    <TouchableOpacity style={rateModalStyles.keyBtn} onPress={() => handleManualRateKey('6')}><Text style={rateModalStyles.keyText}>6</Text></TouchableOpacity>
                    <TouchableOpacity style={rateModalStyles.keyBtn} onPress={() => { setActiveRate(manualRateValue > 0 ? manualRateValue : 1); }}><Ionicons name="checkmark" size={16} color="#a3e635" /></TouchableOpacity>
                  </View>
                  <View style={rateModalStyles.keyRow}>
                    <TouchableOpacity style={rateModalStyles.keyBtn} onPress={() => handleManualRateKey('7')}><Text style={rateModalStyles.keyText}>7</Text></TouchableOpacity>
                    <TouchableOpacity style={rateModalStyles.keyBtn} onPress={() => handleManualRateKey('8')}><Text style={rateModalStyles.keyText}>8</Text></TouchableOpacity>
                    <TouchableOpacity style={rateModalStyles.keyBtn} onPress={() => handleManualRateKey('9')}><Text style={rateModalStyles.keyText}>9</Text></TouchableOpacity>
                    <TouchableOpacity style={rateModalStyles.keyBtn} onPress={() => handleManualRateKey('0')}><Text style={rateModalStyles.keyText}>0</Text></TouchableOpacity>
                  </View>
                </View>
              </View>
            )}
          </View>
        </View>
      </ThemedModal>

      {/* Modal Comisión */}
      <ThemedModal visible={commissionModalVisible} transparent animationType="fade" onRequestClose={() => setCommissionModalVisible(false)}>
        <View style={rateModalStyles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Seleccionar Comisión</Text>
              <TouchableOpacity onPress={() => setCommissionModalVisible(false)}><Ionicons name="close" size={20} color="#fff" /></TouchableOpacity>
            </View>
              
            <TouchableOpacity style={styles.categoryOptionRow} onPress={() => { setSelectedCommissionType(null); setCommissionModalVisible(false); }}>
              <Text style={styles.categoryOptionText}>Sin comisión</Text>
              {!selectedCommissionType && <Ionicons name="checkmark" size={16} color="#a3e635" />}
            </TouchableOpacity>

            {isNationalAccount ? (
              <>
                {VES_COMMISSION_OPTIONS.map(option => (
                  <TouchableOpacity
                    key={option.type}
                    style={styles.categoryOptionRow}
                    onPress={() => { setSelectedCommissionType(option.type); setCommissionModalVisible(false); }}
                  >
                    <Text style={styles.categoryOptionText}>{option.label}</Text>
                    {selectedCommissionType === option.type && <Ionicons name="checkmark" size={16} color="#a3e635" />}
                  </TouchableOpacity>
                ))}
              </>
            ) : (
              <TouchableOpacity style={styles.categoryOptionRow} onPress={() => { setSelectedCommissionType('paypal'); setCommissionModalVisible(false); }}>
                <Text style={styles.categoryOptionText}>Comisión PayPal (5.4% + $0.30 - Resta del monto)</Text>
                {selectedCommissionType === 'paypal' && <Ionicons name="checkmark" size={16} color="#a3e635" />}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ThemedModal>

      {/* Modal Fecha */}
      <ThemedModal visible={dateModalVisible} transparent animationType="fade" onRequestClose={() => setDateModalVisible(false)}>
        <View style={rateModalStyles.modalOverlay}>
          <View style={rateModalStyles.modalContainer}>
            <View style={rateModalStyles.modalHeader}>
              <TouchableOpacity style={rateModalStyles.closeButton} onPress={() => setDateModalVisible(false)}><Ionicons name="close" size={20} color="#fff" /></TouchableOpacity>
              <Text style={rateModalStyles.modalTitle}>Fecha de transferencia</Text>
              <TouchableOpacity style={rateModalStyles.confirmButton} onPress={() => setDateModalVisible(false)}><Ionicons name="checkmark" size={20} color="#000" /></TouchableOpacity>
            </View>

            <View style={rateModalStyles.rateDisplayCard}>
              <View style={rateModalStyles.rateInfoRow}>
                <TouchableOpacity onPress={handlePrevMonth}><Ionicons name="chevron-back" size={20} color="#fff" /></TouchableOpacity>
                <Text style={rateModalStyles.rateInfoRightValue}>{MONTHS[selectedMonthIndex]} de {selectedYear}</Text>
                <TouchableOpacity onPress={handleNextMonth}><Ionicons name="chevron-forward" size={20} color="#fff" /></TouchableOpacity>
              </View>
            </View>

            <View style={{ width: '100%', marginBottom: 10 }}>
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
                  >
                    <Text style={[calendarStyles.dayCellText, selectedDay === d && calendarStyles.dayCellTextSelected]}>{d}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </View>
      </ThemedModal>

      {/* Modal Ayuda */}
      <ThemedModal visible={helpModalVisible} transparent animationType="fade" onRequestClose={() => setHelpModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.helpModalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Ayuda: Transferencias</Text>
              <TouchableOpacity onPress={() => setHelpModalVisible(false)}>
                <Ionicons name="close" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
            <View style={styles.helpItemRow}>
              <Ionicons name="pricetag-outline" size={18} color="#a3e635" style={{ marginRight: 10, marginTop: 2 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.helpItemTitle}>Sincronización con Supabase</Text>
                <Text style={styles.helpItemText}>Las transferencias se guardan automáticamente en tu perfil en la nube y actualizan los saldos de tus cuentas.</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.helpCloseBtn} onPress={() => setHelpModalVisible(false)}>
              <Text style={styles.helpCloseBtnText}>Entendido</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ThemedModal>

      {/* Modal Cuenta Origen */}
      <ThemedModal visible={fromModalVisible} transparent animationType="fade" onRequestClose={() => setFromModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Cuenta de Origen (Envías)</Text>
              <TouchableOpacity onPress={() => setFromModalVisible(false)}><Ionicons name="close" size={20} color="#fff" /></TouchableOpacity>
            </View>
            {accounts.map(acc => (
              <TouchableOpacity key={acc.id} style={styles.accountOptionRow} onPress={() => { setFromAccount(acc); setFromModalVisible(false); }}>
                <Text style={styles.accountOptionText}>{acc.name}</Text>
                <Text style={styles.accountOptionBalance}>{formatCurrencyValue(acc.balance, acc.currency)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ThemedModal>

      {/* Modal Cuenta Destino */}
      <ThemedModal visible={toModalVisible} transparent animationType="fade" onRequestClose={() => setToModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Cuenta de Destino (Recibes)</Text>
              <TouchableOpacity onPress={() => setToModalVisible(false)}><Ionicons name="close" size={20} color="#fff" /></TouchableOpacity>
            </View>
            {accounts.map(acc => (
              <TouchableOpacity key={acc.id} style={styles.accountOptionRow} onPress={() => { setToAccount(acc); setToModalVisible(false); }}>
                <Text style={styles.accountOptionText}>{acc.name}</Text>
                <Text style={styles.accountOptionBalance}>{formatCurrencyValue(acc.balance, acc.currency)}</Text>
              </TouchableOpacity>
            ))}
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
  modalContainer: { width: '100%', maxWidth: 360, backgroundColor: 'rgba(20,20,22,0.92)', borderRadius: 28, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 20 },
  closeButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.08)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  modalTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  confirmButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#a3e635', justifyContent: 'center', alignItems: 'center' },
  tabsRow: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 24, padding: 4, width: '100%', marginBottom: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  tabItem: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 20 },
  tabItemActive: { backgroundColor: 'rgba(255,255,255,0.12)' },
  tabText: { color: '#888', fontSize: 12, fontWeight: 'bold' },
  tabTextActive: { color: '#fff' },
  rateDisplayCard: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 20, paddingVertical: 16, paddingHorizontal: 18, width: '100%', marginBottom: 15, justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  rateInfoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rateInfoLeftLabel: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  rateInfoRightValue: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  manualSectionContainer: { width: '100%', alignItems: 'center', marginBottom: 15 },
  manualTitleLabel: { color: '#888', fontSize: 13, marginBottom: 6 },
  manualBigValueText: { color: '#fff', fontSize: 32, fontWeight: 'bold', marginBottom: 20 },
  miniKeypad: { width: '100%', backgroundColor: 'rgba(10,10,12,0.95)', borderRadius: 20, padding: 10, borderWidth: 1.2, borderColor: 'rgba(255,255,255,0.1)' },
  keyRow: NUMERIC_KEYPAD_STYLES.row,
  keyBtn: NUMERIC_KEYPAD_STYLES.key,
  keyText: NUMERIC_KEYPAD_STYLES.keyText,
  keyTextYellow: NUMERIC_KEYPAD_STYLES.clearKeyText,
  footerNoteText: { color: '#666', fontSize: 11, textAlign: 'center', marginTop: 10 }
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  scrollBody: { paddingHorizontal: 20, paddingVertical: 12, alignItems: 'stretch' },
  sectionHeaderLabel: { color: '#888', fontSize: 11, fontWeight: 'bold', marginBottom: 6, letterSpacing: 0.5 },
  transferCard: { backgroundColor: '#1a1a1a', borderRadius: 20, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#222' },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  accountSelectorInline: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#262626', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 14 },
  accountDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  accountNameText: { color: '#fff', fontSize: 13, fontWeight: 'bold', maxWidth: 140 },
  accountBalanceText: { color: '#888', fontSize: 12 },
  amountInputRow: { flexDirection: 'row', alignItems: 'baseline' },
  currencySymbol: { color: '#aaa', fontSize: 22, fontWeight: 'bold' },
  mainAmountText: { color: '#fff', fontSize: 34, fontWeight: 'bold' },
  convertedAmountText: { color: '#a3e635', fontSize: 34, fontWeight: 'bold' },
  commissionTagInfo: { color: '#fbbf24', fontSize: 12, marginTop: 4 },
  swapButtonCenter: { alignSelf: 'center', backgroundColor: '#1a1a1a', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginVertical: 8, borderWidth: 1, borderColor: '#333' },
  chipsScrollRow: { paddingVertical: 4, marginBottom: 8, alignSelf: 'center' },
  optionChip: { flexDirection: 'row', backgroundColor: '#1a1a1a', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, alignItems: 'center', marginRight: 10, height: 38, borderWidth: 1, borderColor: '#222' },
  optionChipText: { color: '#ccc', fontSize: 12, fontWeight: '500' },
  receiptPreviewContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a1a1a', padding: 10, borderRadius: 14, marginTop: 5, alignSelf: 'flex-start' },
  receiptThumbnail: { width: 45, height: 45, borderRadius: 8, marginRight: 10 },
  removeReceiptBtn: { padding: 4 },
  calculatorPad: NUMERIC_KEYPAD_STYLES.container,
  calcRow: NUMERIC_KEYPAD_STYLES.row,
  calcKey: NUMERIC_KEYPAD_STYLES.key,
  calcKeySubmit: NUMERIC_KEYPAD_STYLES.submitKey,
  calcKeyEmpty: NUMERIC_KEYPAD_STYLES.emptyKey,
  calcKeyText: NUMERIC_KEYPAD_STYLES.keyText,
  calcKeyYellowText: NUMERIC_KEYPAD_STYLES.clearKeyText,
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalCard: { backgroundColor: 'rgba(18,18,20,0.95)', width: '100%', maxWidth: 360, borderRadius: 24, padding: 20, borderWidth: 1.2, borderColor: 'rgba(255,255,255,0.12)' },
  helpModalCard: { backgroundColor: 'rgba(25,25,28,0.95)', borderRadius: 20, borderWidth: 1, borderColor: '#a3e635', padding: 20, width: '100%', maxWidth: 340 },
  helpItemRow: { flexDirection: 'row', marginBottom: 16, alignItems: 'flex-start' },
  helpItemTitle: { color: '#a3e635', fontSize: 14, fontWeight: 'bold', marginBottom: 2 },
  helpItemText: { color: '#ccc', fontSize: 12, lineHeight: 18 },
  helpCloseBtn: { backgroundColor: '#a3e635', paddingVertical: 12, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  helpCloseBtnText: { color: '#000', fontWeight: 'bold', fontSize: 14 },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  accountOptionRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' },
  accountOptionText: { color: '#fff', fontSize: 15 },
  accountOptionBalance: { color: '#888', fontSize: 14 },
  categoryOptionRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' },
  categoryOptionText: { color: '#fff', fontSize: 14 }
});