import ThemedModal from "../../components/ThemedModal";
import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, Text, View, TouchableOpacity,
  TextInput, Platform, KeyboardAvoidingView, Modal, Keyboard 
} from 'react-native';
import { Alert } from '../../services/appAlert';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../services/supabase';
import { fetchCurrencyRates } from '../../services/currencyService';
import { financingPlatforms } from '../../services/accountsData';
import CustomHeader from '../../components/CustomHeader';
import ScreenWrapper from '../../components/ScreenWrapper';
import { NUMERIC_KEYPAD_STYLES } from '../../components/numericKeypadStyles';

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

// Función de formateo ajustada según la divisa (VES/EUR vs USD)
const formatCurrencyValue = (num, currency) => {
  const n = parseFloat(num || 0);
  if (isNaN(n)) return currency === 'USD' ? '0.00' : '0,00';
  
  const fixedStr = n.toFixed(2);
  const [intPart, decPart] = fixedStr.split('.');

  if (currency === 'USD') {
    const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return `${formattedInt}.${decPart}`;
  } else {
    const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `${formattedInt},${decPart}`;
  }
};

export default function DebtFormScreen({ navigation, route, userId }) {
  const { type = 'pay', category = 'borrowed' } = route?.params || {};

  const [currency, setCurrency] = useState('VES');
  const [calculatorRawValue, setCalculatorRawValue] = useState('0');
  const [contactName, setContactName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [accountModalVisible, setAccountModalVisible] = useState(false);

  // Estado para la tasa BCV real del servicio
  const [bcvRate, setBcvRate] = useState(0);

  // Estados unificados para Plan de Pago / Fecha / Cuotas
  const [planModalVisible, setPlanModalVisible] = useState(false);
  const [paymentType, setPaymentType] = useState('Único'); // 'Único' o 'Cuotas'

  // Estados del botón dinámico de Plan de pago
  const [planButtonLabel, setPlanButtonLabel] = useState('Plan de pago');

  // Estados de Fecha Interactiva (Calendario completo)
  const [dateModalVisible, setDateModalVisible] = useState(false);
  const [selectedYear, setSelectedYear] = useState(2026);
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(9); // Octubre
  const [selectedDay, setSelectedDay] = useState(2);

  // Estados de cuotas específicos
  const [installmentsCount, setInstallmentsCount] = useState(3);
  const [installmentsFrequency, setInstallmentsFrequency] = useState('Mensual (Cada 30 días)');

  // Financiación / Plataforma
  const [platform, setPlatform] = useState(financingPlatforms[0] || 'Cashea');
  const [platformModalVisible, setPlatformModalVisible] = useState(false);

  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      if (!userId) return;
      try {
        const { data, error } = await supabase
          .from('accounts')
          .select('*')
          .eq('user_id', userId);

        if (error) throw error;
        if (data && data.length > 0) {
          setAccounts(data);
          setSelectedAccount(data[0]);
        }
      } catch (err) {
        console.error('Error al cargar cuentas:', err);
      }

      try {
        const rates = await fetchCurrencyRates();
        if (rates && rates.bcvRate) {
          setBcvRate(rates.bcvRate);
        }
      } catch (err) {
        console.error('Error al obtener la tasa BCV:', err);
      }
    };
    loadData();

    const keyboardDidShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setIsKeyboardVisible(true)
    );
    const keyboardDidHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setIsKeyboardVisible(false)
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, [userId]);

  const handlePressKey = (key) => {
    if (key === '00') {
      if (calculatorRawValue === '0') return;
      if (calculatorRawValue.length > 10) return;
      setCalculatorRawValue(calculatorRawValue + '00');
    } else {
      if (calculatorRawValue === '0') {
        setCalculatorRawValue(key);
      } else {
        if (calculatorRawValue.length > 12) return;
        setCalculatorRawValue(calculatorRawValue + key);
      }
    }
  };

  const handleDeleteKey = () => {
    if (calculatorRawValue.length <= 1) {
      setCalculatorRawValue('0');
    } else {
      setCalculatorRawValue(calculatorRawValue.slice(0, -1));
    }
  };

  const handleClearKey = () => setCalculatorRawValue('0');

  const numericAmount = parseInt(calculatorRawValue, 10) / 100;

  const handleSaveDebt = async () => {
    if (numericAmount <= 0) {
      Alert.alert('Error', 'Ingresa un monto válido.');
      return;
    }
    if (!contactName.trim() && category !== 'financing') {
      Alert.alert('Error', 'Por favor ingresa el nombre de la persona.');
      return;
    }

    try {
      const dueDateObj = new Date(selectedYear, selectedMonthIndex, selectedDay);
      const debtPayload = {
        user_id: userId,
        type: type,
        category: category,
        amount: numericAmount,
        currency: currency,
        account_id: selectedAccount?.id || null,
        platform: category === 'financing' ? platform : null,
        contact_name: category === 'financing' ? platform : contactName,
        description: description,
        due_date: dueDateObj.toISOString(),
        status: 'pending'
      };

      const { error } = await supabase.from('debts').insert([debtPayload]);
      if (error) throw error;

      navigation('debts');
    } catch (err) {
      console.error('Error al guardar deuda:', err);
      Alert.alert('Error', 'No se pudo guardar la deuda.');
    }
  };

  const getTitle = () => {
    if (category === 'borrowed') return 'Me prestaron Dinero';
    if (category === 'financing') return 'Financiamiento';
    if (category === 'lent') return 'Presté Dinero';
    if (category === 'fiado') return 'Fiado';
    return 'Deuda';
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

  const handleConfirmPlan = () => {
    if (paymentType === 'Único') {
      setPlanButtonLabel(`${selectedDay} ${MONTHS[selectedMonthIndex]?.slice(0, 3)}.`);
    } else {
      const freqShort = installmentsFrequency.includes('Semanal') ? 'Semanal' : installmentsFrequency.includes('Quincenal') ? 'Quincenal' : 'Mensual';
      setPlanButtonLabel(`${installmentsCount} cuotas (${freqShort})`);
    }
    setPlanModalVisible(false);
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      style={styles.container}
    >
      {/* Cabecera estandarizada con CustomHeader */}
      <CustomHeader 
        title={getTitle()}
        onBackPress={() => navigation('debts')}
        rightIcon={null}
        onRightPress={() => {}}
      />

      <ScreenWrapper contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
        {/* Selector Divisa */}
        <View style={styles.currencyToggleRow}>
          <TouchableOpacity 
            style={[styles.currencyBtn, currency === 'VES' && styles.currencyBtnActive]}
            onPress={() => setCurrency('VES')}
          >
            <Text style={[styles.currencyText, currency === 'VES' && styles.currencyTextActive]}>Bs Bolívares</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.currencyBtn, currency === 'USD' && styles.currencyBtnActive]}
            onPress={() => setCurrency('USD')}
          >
            <Text style={[styles.currencyText, currency === 'USD' && styles.currencyTextActive]}>$ Dólares</Text>
          </TouchableOpacity>
        </View>

        {/* Display del Monto con formato dinámico según divisa */}
        <View style={styles.amountDisplayContainer}>
          <Text style={styles.amountDisplayText}>
            {currency === 'VES' ? 'Bs ' : '$ '}{formatCurrencyValue(numericAmount, currency)}
          </Text>
        </View>

        {/* Botón de Selección de Cuenta */}
        <TouchableOpacity 
          style={styles.accountSelectorLarge}
          onPress={() => setAccountModalVisible(true)}
        >
          <Ionicons name="wallet-outline" size={16} color="#a3e635" style={{ marginRight: 8 }} />
          <Text style={styles.accountSelectorText}>
            {selectedAccount ? selectedAccount.name : 'Selecciona una cuenta'}
          </Text>
          <Ionicons name="chevron-down" size={14} color="#888" style={{ marginLeft: 'auto' }} />
        </TouchableOpacity>

        {/* Si es Financiamiento */}
        {category === 'financing' && (
          <TouchableOpacity 
            style={styles.accountSelectorLarge}
            onPress={() => setPlatformModalVisible(true)}
          >
            <Ionicons name="layers-outline" size={16} color="#a3e635" style={{ marginRight: 8 }} />
            <Text style={styles.accountSelectorText}>{platform}</Text>
            <Ionicons name="chevron-down" size={14} color="#888" style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
        )}

        {/* Formulario Unido */}
        {category !== 'financing' ? (
          <View style={styles.unifiedCard}>
            <TextInput 
              style={styles.unifiedInputTop}
              placeholder={type === 'pay' ? 'Quién te prestó' : 'A quién le prestaste / fiaste'}
              placeholderTextColor="#666"
              value={contactName}
              onChangeText={setContactName}
            />
            <View style={styles.unifiedDivider} />
            <TextInput 
              style={styles.unifiedInputBottom}
              placeholder="Para qué fue (Opcional)"
              placeholderTextColor="#666"
              value={description}
              onChangeText={setDescription}
            />
          </View>
        ) : (
          <View style={styles.unifiedCard}>
            <TextInput 
              style={styles.unifiedInputSingle}
              placeholder="Descripción de la compra"
              placeholderTextColor="#666"
              value={description}
              onChangeText={setDescription}
            />
          </View>
        )}

        {/* Fila inferior */}
        <View style={styles.actionButtonsRow}>
          <TouchableOpacity 
            style={styles.actionChipBtnDate} 
            onPress={() => setDateModalVisible(true)}
          >
            <Ionicons name="calendar-outline" size={11} color="#a3e635" style={{ marginRight: 3 }} />
            <Text style={styles.actionChipText} numberOfLines={1} adjustsFontSizeToFit>{selectedDay} {MONTHS[selectedMonthIndex]?.slice(0, 3)}</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionChipBtnPlan} 
            onPress={() => setPlanModalVisible(true)}
          >
            <Ionicons name="flag-outline" size={11} color="#3b82f6" style={{ marginRight: 3 }} />
            <Text style={styles.actionChipText} numberOfLines={1} adjustsFontSizeToFit>{planButtonLabel}</Text>
          </TouchableOpacity>

          {currency === 'VES' && (
            <View style={styles.rateChipOnly}>
              <Text style={styles.rateChipText} numberOfLines={1} adjustsFontSizeToFit>
                {bcvRate > 0 ? formatCurrencyValue(bcvRate, 'VES') : '0,00'}
              </Text>
            </View>
          )}
        </View>
      </ScreenWrapper>

      {/* Teclado Numérico */}
      {!isKeyboardVisible && (
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
            <TouchableOpacity style={styles.calcKeySubmit} onPress={handleSaveDebt} activeOpacity={0.7}>
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
        </View>
      )}

      {/* MODAL: Calendario */}
      <ThemedModal visible={dateModalVisible} transparent animationType="slide" onRequestClose={() => setDateModalVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setDateModalVisible(false)}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ width: '100%' }}>
            <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalCard}>
                <View style={styles.modalHeaderRow}>
                  <TouchableOpacity onPress={() => setDateModalVisible(false)}><Ionicons name="close" size={20} color="#fff" /></TouchableOpacity>
                  <Text style={styles.modalTitle}>Seleccionar Fecha</Text>
                  <TouchableOpacity onPress={() => { setPlanButtonLabel(`${selectedDay} ${MONTHS[selectedMonthIndex]?.slice(0, 3)}.`); setDateModalVisible(false); }}><Ionicons name="checkmark" size={20} color="#a3e635" /></TouchableOpacity>
                </View>

                <View style={styles.monthNavRow}>
                  <TouchableOpacity onPress={handlePrevMonth}><Ionicons name="chevron-back" size={20} color="#fff" /></TouchableOpacity>
                  <Text style={styles.subHeaderModalText}>{MONTHS[selectedMonthIndex]} de {selectedYear}</Text>
                  <TouchableOpacity onPress={handleNextMonth}><Ionicons name="chevron-forward" size={20} color="#fff" /></TouchableOpacity>
                </View>

                <View style={styles.weekDaysRow}>
                  {['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'].map((w, index) => (
                    <Text key={index} style={styles.weekDayText}>{w}</Text>
                  ))}
                </View>

                <View style={styles.daysGrid}>
                  {blanksArray.map(b => (
                    <View key={`blank-${b}`} style={styles.dayCellEmpty} />
                  ))}
                  {daysArray.map(d => (
                    <TouchableOpacity 
                      key={d} 
                      style={[styles.dayCell, selectedDay === d && styles.dayCellSelected]}
                      onPress={() => setSelectedDay(d)}
                    >
                      <Text style={[styles.dayCellText, selectedDay === d && styles.dayCellTextSelected]}>{d}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </ThemedModal>

      {/* MODAL UNIFICADO: Plan de Pago */}
      <ThemedModal visible={planModalVisible} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setPlanModalVisible(false)}>
          <View style={styles.bottomSheetCard}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Plan de pago</Text>
              <TouchableOpacity onPress={() => setPlanModalVisible(false)}>
                <Ionicons name="close" size={22} color="#fff" />
              </TouchableOpacity>
            </View>

            <View style={styles.segmentRowModal}>
              <TouchableOpacity 
                style={[styles.segmentBtnModal, paymentType === 'Único' && styles.segmentBtnModalActive]}
                onPress={() => setPaymentType('Único')}
              >
                <Text style={[styles.segmentTextModal, paymentType === 'Único' && styles.segmentTextModalActive]}>Pago único</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.segmentBtnModal, paymentType === 'Cuotas' && styles.segmentBtnModalActive]}
                onPress={() => setPaymentType('Cuotas')}
              >
                <Text style={[styles.segmentTextModal, paymentType === 'Cuotas' && styles.segmentTextModalActive]}>Cuotas</Text>
              </TouchableOpacity>
            </View>

            {paymentType === 'Único' ? (
              <>
                <TouchableOpacity 
                  style={styles.sheetOptionRow}
                  onPress={() => { setPlanModalVisible(false); setDateModalVisible(true); }}
                >
                  <Ionicons name="calendar-outline" size={18} color="#a3e635" style={{ marginRight: 12 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#fff', fontSize: 14, fontWeight: 'bold' }}>Fecha de vencimiento</Text>
                    <Text style={{ color: '#888', fontSize: 11 }}>{selectedDay} de {MONTHS[selectedMonthIndex]}</Text>
                  </View>
                  <Text style={{ color: '#a3e635', fontSize: 13, fontWeight: 'bold' }}>Elegir &gt;</Text>
                </TouchableOpacity>

                <Text style={[styles.sheetSubHeader, { marginTop: 15 }]}>Accesos rápidos de vencimiento:</Text>
                <ScreenWrapper horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 8 }}>
                  {['Hoy', 'Mañana', 'En 1 semana', 'En 1 mes'].map((opt, i) => (
                    <TouchableOpacity 
                      key={i} 
                      style={styles.quickDateChip}
                      onPress={() => { 
                        if (opt === 'Hoy') setSelectedDay(2);
                        if (opt === 'Mañana') setSelectedDay(3);
                        if (opt === 'En 1 semana') setSelectedDay(9);
                        if (opt === 'En 1 mes') setSelectedDay(2);
                        setPlanButtonLabel(opt);
                        setPlanModalVisible(false); 
                      }}
                    >
                      <Text style={styles.quickDateChipText}>{opt}</Text>
                    </TouchableOpacity>
                  ))}
                </ScreenWrapper>
              </>
            ) : (
              <>
                <Text style={styles.sheetSubHeader}>CANTIDAD DE CUOTAS</Text>
                <View style={styles.counterRow}>
                  <TouchableOpacity 
                    style={styles.counterBtn} 
                    onPress={() => setInstallmentsCount(prev => Math.max(1, prev - 1))}
                  >
                    <Ionicons name="remove" size={18} color="#fff" />
                  </TouchableOpacity>
                  <View style={{ alignItems: 'center' }}>
                    <Text style={styles.counterNumber}>{installmentsCount}</Text>
                    <Text style={styles.counterSub}>cuotas</Text>
                  </View>
                  <TouchableOpacity 
                    style={styles.counterBtn} 
                    onPress={() => setInstallmentsCount(prev => prev + 1)}
                  >
                    <Ionicons name="add" size={18} color="#fff" />
                  </TouchableOpacity>
                </View>

                <Text style={[styles.sheetSubHeader, { marginTop: 15 }]}>FRECUENCIA</Text>
                {['Semanal (Cada 7 days)', 'Quincenal (Cada 15 days)', 'Mensual (Cada 30 days)'].map((freq, i) => (
                  <TouchableOpacity 
                    key={i} 
                    style={styles.sheetOptionRow}
                    onPress={() => setInstallmentsFrequency(freq)}
                  >
                    <Text style={{ color: '#fff', fontSize: 13, flex: 1 }}>{freq}</Text>
                    {installmentsFrequency === freq && <Ionicons name="checkmark-circle" size={18} color="#a3e635" />}
                  </TouchableOpacity>
                ))}

                <View style={styles.previewBox}>
                  <Text style={styles.previewTitle}>VISTA PREVIA</Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginVertical: 4 }}>
                    <Text style={{ color: '#888', fontSize: 11 }}>Primera: {selectedDay} {MONTHS[selectedMonthIndex]?.slice(0, 3)}.</Text>
                    <Text style={{ color: '#888', fontSize: 11 }}>Última: {selectedDay} {MONTHS[(selectedMonthIndex + installmentsCount) % 12]?.slice(0, 3)}. 2027</Text>
                  </View>
                  <Text style={{ color: '#ccc', fontSize: 11, marginTop: 4 }}>{installmentsCount} cuotas · {installmentsFrequency.toLowerCase()}</Text>
                </View>
              </>
            )}

            <TouchableOpacity 
              style={styles.confirmModalBtn} 
              onPress={handleConfirmPlan}
            >
              <Text style={styles.confirmModalBtnText}>Confirmar Plan</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </ThemedModal>

      {/* MODAL: Seleccionar Cuenta */}
      <ThemedModal visible={accountModalVisible} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setAccountModalVisible(false)}>
          <View style={styles.bottomSheetCard}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Selecciona una cuenta</Text>
              <TouchableOpacity onPress={() => setAccountModalVisible(false)}>
                <Ionicons name="close" size={22} color="#fff" />
              </TouchableOpacity>
            </View>
            {accounts.map((acc, index) => (
              <TouchableOpacity 
                key={index} 
                style={styles.sheetOptionRow}
                onPress={() => { setSelectedAccount(acc); setAccountModalVisible(false); }}
              >
                <Ionicons name="wallet-outline" size={18} color="#a3e635" style={{ marginRight: 12 }} />
                <Text style={{ color: '#fff', fontSize: 14, fontWeight: 'bold' }}>{acc.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </ThemedModal>

      {/* MODAL: Seleccionar Plataforma */}
      <ThemedModal visible={platformModalVisible} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setPlatformModalVisible(false)}>
          <View style={styles.bottomSheetCard}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Elige la plataforma</Text>
              <TouchableOpacity onPress={() => setPlatformModalVisible(false)}>
                <Ionicons name="close" size={22} color="#fff" />
              </TouchableOpacity>
            </View>
            {financingPlatforms.map((plat, index) => (
              <TouchableOpacity 
                key={index} 
                style={styles.sheetOptionRow}
                onPress={() => { setPlatform(plat); setPlatformModalVisible(false); }}
              >
                <Ionicons name="checkmark-circle-outline" size={18} color="#a3e635" style={{ marginRight: 12 }} />
                <Text style={{ color: '#fff', fontSize: 14, fontWeight: 'bold' }}>{plat}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </ThemedModal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  scrollBody: { paddingHorizontal: 15, paddingBottom: 15, paddingTop: 10 },
  
  currencyToggleRow: { flexDirection: 'row', backgroundColor: '#1a1a1a', borderRadius: 16, padding: 3, borderWidth: 1, borderColor: '#222', marginBottom: 12, width: '60%', alignSelf: 'center' },
  currencyBtn: { flex: 1, paddingVertical: 6, alignItems: 'center', borderRadius: 12 },
  currencyBtnActive: { backgroundColor: '#333' },
  currencyText: { color: '#888', fontSize: 11, fontWeight: 'bold' },
  currencyTextActive: { color: '#fff' },

  amountDisplayContainer: { alignItems: 'center', marginVertical: 6 },
  amountDisplayText: { color: '#fff', fontSize: 30, fontWeight: 'bold' },

  accountSelectorLarge: { backgroundColor: '#1a1a1a', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#333' },
  accountSelectorText: { color: '#fff', fontSize: 13, fontWeight: '600' },

  unifiedCard: { backgroundColor: '#1a1a1a', borderRadius: 14, borderWidth: 1, borderColor: '#222', marginBottom: 12, overflow: 'hidden' },
  unifiedInputTop: { paddingHorizontal: 14, paddingVertical: 12, color: '#fff', fontSize: 13 },
  unifiedInputBottom: { paddingHorizontal: 14, paddingVertical: 12, color: '#fff', fontSize: 13 },
  unifiedInputSingle: { paddingHorizontal: 14, paddingVertical: 14, color: '#fff', fontSize: 13 },
  unifiedDivider: { height: 1, backgroundColor: '#2a2a2a' },

  actionButtonsRow: { flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center', marginBottom: 8 },
  actionChipBtnDate: { width: 95, height: 36, backgroundColor: '#1a1a1a', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4, borderRadius: 12, marginRight: 6, borderWidth: 1, borderColor: '#222' },
  actionChipBtnPlan: { width: 145, height: 36, backgroundColor: '#1a1a1a', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4, borderRadius: 12, marginRight: 6, borderWidth: 1, borderColor: '#222' },
  actionChipText: { color: '#ccc', fontSize: 10.5, fontWeight: '600' },

  rateChipOnly: { width: 75, height: 36, backgroundColor: '#111', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4, borderRadius: 12, borderWidth: 1, borderColor: '#222' },
  rateChipText: { color: '#a3e635', fontSize: 11, fontWeight: 'bold' },

  calculatorPad: NUMERIC_KEYPAD_STYLES.container,
  calcRow: NUMERIC_KEYPAD_STYLES.row,
  calcKey: NUMERIC_KEYPAD_STYLES.key,
  calcKeySubmit: NUMERIC_KEYPAD_STYLES.submitKey,
  calcKeyEmpty: NUMERIC_KEYPAD_STYLES.emptyKey,
  calcKeyText: NUMERIC_KEYPAD_STYLES.keyText,
  calcKeyYellowText: NUMERIC_KEYPAD_STYLES.clearKeyText,

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  bottomSheetCard: { backgroundColor: '#141414', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 20, paddingBottom: 40, borderWidth: 1, borderColor: '#333' },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sheetTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  sheetSubHeader: { color: '#888', fontSize: 11, marginBottom: 6, fontWeight: 'bold' },
  sheetOptionRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a1a1a', padding: 12, borderRadius: 14, marginBottom: 8, borderWidth: 1, borderColor: '#222' },

  modalCard: { backgroundColor: '#111', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40 },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  monthNavRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, paddingHorizontal: 10 },
  subHeaderModalText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  weekDaysRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 10 },
  weekDayText: { color: '#666', fontSize: 11, fontWeight: 'bold', width: '13%', textAlign: 'center' },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start' },
  dayCellEmpty: { width: '14.2%', aspectRatio: 1, marginVertical: 2 },
  dayCell: { width: '14.2%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center', marginVertical: 2, borderRadius: 8 },
  dayCellSelected: { backgroundColor: '#a3e635' },
  dayCellText: { color: '#fff', fontSize: 13 },
  dayCellTextSelected: { color: '#000', fontWeight: 'bold' },

  segmentRowModal: { flexDirection: 'row', backgroundColor: '#1a1a1a', borderRadius: 16, padding: 3, borderWidth: 1, borderColor: '#222', marginBottom: 15 },
  segmentBtnModal: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 12 },
  segmentBtnModalActive: { backgroundColor: '#333' },
  segmentTextModal: { color: '#888', fontSize: 12, fontWeight: 'bold' },
  segmentTextModalActive: { color: '#fff' },

  counterRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1a1a1a', padding: 12, borderRadius: 16, borderWidth: 1, borderColor: '#222', marginBottom: 10 },
  counterBtn: { width: 36, height: 36, backgroundColor: '#222', borderRadius: 18, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#333' },
  counterNumber: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  counterSub: { color: '#888', fontSize: 10 },

  quickDateChip: { backgroundColor: '#222', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 14, marginRight: 8, borderWidth: 1, borderColor: '#333' },
  quickDateChipText: { color: '#fff', fontSize: 12, fontWeight: '600' },

  previewBox: { backgroundColor: '#1a1a1a', padding: 12, borderRadius: 14, marginVertical: 10, borderWidth: 1, borderColor: '#222' },
  previewTitle: { color: '#a3e635', fontSize: 11, fontWeight: 'bold', marginBottom: 4 },

  confirmModalBtn: { backgroundColor: '#a3e635', paddingVertical: 12, borderRadius: 16, alignItems: 'center', marginTop: 10 },
  confirmModalBtnText: { color: '#000', fontSize: 14, fontWeight: 'bold' }
});