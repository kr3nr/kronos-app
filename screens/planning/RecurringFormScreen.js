import ThemedModal from "../../components/ThemedModal";
import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, Text, View, TouchableOpacity,
  TextInput, Modal, ScrollView
} from 'react-native';
import { Alert } from '../../services/appAlert';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../services/supabase';
import { getUserCategoriesService } from '../../services/categoryService';
import CustomHeader from '../../components/CustomHeader';
import { fetchCurrencyRates } from '../../services/currencyService';
import ScreenWrapper from '../../components/ScreenWrapper';
import { NUMERIC_KEYPAD_STYLES } from '../../components/numericKeypadStyles';
import * as ImagePicker from 'expo-image-picker';

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const WORLD_CURRENCIES = [
  { code: 'USD', symbol: '🇺🇸', name: 'Dólar Estadounidense' },
  { code: 'EUR', symbol: '🇪🇺', name: 'Euro' },
  { code: 'VES', symbol: '🇻🇪', name: 'Bolívar' },
  { code: 'USDT', symbol: '₮', name: 'Tether' },
  { code: 'MXN', symbol: '🇲🇽', name: 'Peso Mexicano' },
  { code: 'COP', symbol: '🇨🇴', name: 'Peso Colombiano' },
  { code: 'ARS', symbol: '🇦🇷', name: 'Peso Argentino' },
  { code: 'CLP', symbol: '🇨🇱', name: 'Peso Chileno' },
  { code: 'GBP', symbol: '🇬🇧', name: 'Libra Esterlina' },
  { code: 'BRL', symbol: '🇧🇷', name: 'Real Brasileño' },
  { code: 'CAD', symbol: '🇨🇦', name: 'Dólar Canadiense' },
  { code: 'PEN', symbol: '🇵🇪', name: 'Sol Peruano' }
];

const formatCurrencyValue = (num, currency) => {
  const n = parseFloat(num || 0);
  if (isNaN(n)) return currency === 'VES' ? '0,00' : '0.00';
  const fixedStr = n.toFixed(2);
  const [intPart, decPart] = fixedStr.split('.');

  if (currency === 'VES') {
    const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `${formattedInt},${decPart}`;
  } else {
    const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return `${formattedInt}.${decPart}`;
  }
};

const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

// Funciones auxiliares para evitar desfases de zona horaria al cargar y guardar fechas
const parseLocalDate = (dateStr) => {
  if (!dateStr) return new Date();
  const parts = String(dateStr).split('T')[0].split('-');
  if (parts.length === 3) {
    return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  }
  return new Date(dateStr);
};

const formatLocalDateString = (dateObj) => {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function RecurringFormScreen({ navigation, route }) {
  const { userId, templateId, itemData } = route?.params || {};

  const [txType, setTxType] = useState(
    itemData?.type ? (itemData.type.toLowerCase().includes('ingreso') ? 'Ingreso' : 'Egreso') : 'Egreso'
  ); 
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false);
  
  const [currency, setCurrency] = useState(itemData?.currency || 'USD');
  const [worldCurrencyModalVisible, setWorldCurrencyModalVisible] = useState(false);

  const [applyPayPalFee, setApplyPayPalFee] = useState(itemData?.apply_paypal_fee || false);

  const [rateType, setRateType] = useState(itemData?.rate_type || 'bcv');
  const [rateModalVisible, setRateModalVisible] = useState(false);
  
  const [customForeignRate, setCustomForeignRate] = useState('18.0');
  const [editRateModalVisible, setEditRateModalVisible] = useState(false);
  
  const initialCents = itemData?.amount ? Math.round(parseFloat(itemData.amount) * 100).toString() : '0';
  const [calculatorRawValue, setCalculatorRawValue] = useState(initialCents);
   
  const [name, setName] = useState(itemData?.title || itemData?.name || '');
  const [selectedAccount, setSelectedAccount] = useState(itemData?.account || 'Sin cuenta');
  const [category, setCategory] = useState(itemData?.category || 'Sin categoría');
  const [expandedCategoryName, setExpandedCategoryName] = useState(null);
  const [frequency, setFrequency] = useState(itemData?.frequency || 'Sin repetición');
  const [domainLogo, setDomainLogo] = useState(itemData?.logo_domain || '');
  const [customDays, setCustomDays] = useState(itemData?.custom_days || '');

  const [isTemplate, setIsTemplate] = useState(itemData?.is_scheduled !== false);

  const now = new Date();
  const [startDate, setStartDate] = useState(itemData?.start_date ? parseLocalDate(itemData.start_date) : now);
  const [endDate, setEndDate] = useState(itemData?.end_date ? parseLocalDate(itemData.end_date) : null);

  const [startDateModalVisible, setStartDateModalVisible] = useState(false);
  const [endDateModalVisible, setEndDateModalVisible] = useState(false);

  const [startYear, setStartYear] = useState(startDate.getFullYear());
  const [startMonthIndex, setStartMonthIndex] = useState(startDate.getMonth());
  const [startDay, setStartDay] = useState(startDate.getDate());

  const handleOpenStartDateModal = () => {
    setStartYear(startDate.getFullYear());
    setStartMonthIndex(startDate.getMonth());
    setStartDay(startDate.getDate());
    setStartDateModalVisible(true);
  };

  const [endYear, setEndYear] = useState(endDate ? endDate.getFullYear() : now.getFullYear());
  const [endMonthIndex, setEndMonthIndex] = useState(endDate ? endDate.getMonth() : now.getMonth());
  const [endDay, setEndDay] = useState(endDate ? endDate.getDate() : now.getDate());

  const handleOpenEndDateModal = () => {
    if (endDate) {
      setEndYear(endDate.getFullYear());
      setEndMonthIndex(endDate.getMonth());
      setEndDay(endDate.getDate());
    } else {
      setEndYear(now.getFullYear());
      setEndMonthIndex(now.getMonth());
      setEndDay(now.getDate());
    }
    setEndDateModalVisible(true);
  };

  const [accountsList, setAccountsList] = useState([]);
  const [categoriesList, setCategoriesList] = useState([]);

  const [accountModalVisible, setAccountModalVisible] = useState(false);
  const [freqModalVisible, setFreqModalVisible] = useState(false);
  const [catModalVisible, setCatModalVisible] = useState(false);
  const [logoModalVisible, setLogoModalVisible] = useState(false);

  const [liveRates, setLiveRates] = useState({ bcvRate: 36.5, eurRate: 40.0, binanceRate: 37.0 });

  useEffect(() => {
    const fetchData = async () => {
      if (!userId) return;
      try {
        const rates = await fetchCurrencyRates();
        if (rates) {
          setLiveRates(rates);
        }

        const { data: accData } = await supabase
          .from('accounts')
          .select('*')
          .eq('user_id', userId);
         
        if (accData && accData.length > 0) {
          setAccountsList(accData);
          if (!itemData?.account) {
            setSelectedAccount(accData[0].name);
          }
        }

        const cats = await getUserCategoriesService(userId);
        setCategoriesList(cats || []);
      } catch (err) {
        console.error('Error al cargar datos iniciales:', err);
      }
    };

    fetchData();
  }, [userId, itemData?.account]);

  const currentAccountObj = accountsList.find(acc => acc.name === selectedAccount);
  const accountCurrency = currentAccountObj ? currentAccountObj.currency : currency;
  const isCrossCurrencyConversion = (currency === 'USD' && accountCurrency === 'VES') || (currency === 'VES' && accountCurrency === 'USD');

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

  let numericAmount = parseInt(calculatorRawValue, 10) / 100;

  const calculateFinalAmount = () => {
    if (numericAmount <= 0) return 0;

    let currentAmount = numericAmount;

    if (applyPayPalFee) {
      const fee = (currentAmount * 0.054) + 0.30;
      currentAmount = currentAmount - fee;
      if (currentAmount < 0) currentAmount = 0;
    }

    const isWorldCurr = !['VES', 'USD'].includes(currency);
    if (isWorldCurr) {
      const rateVal = parseFloat(customForeignRate) || 1.0;
      if (rateVal > 0) {
        if (['MXN', 'COP', 'ARS', 'CLP', 'BRL', 'CAD'].includes(currency)) {
          return currentAmount / rateVal;
        }
        return currentAmount * rateVal;
      }
    } else if (currency === 'VES') {
      const activeRate = rateType === 'bcv' ? liveRates.bcvRate : liveRates.binanceRate;
      if (activeRate > 0) {
        return currentAmount / activeRate;
      }
    }

    return currentAmount;
  };

  const finalProcessedAmount = calculateFinalAmount();

const handleSaveTemplate = async () => {
    if (numericAmount <= 0) {
      Alert.alert('Error', 'Por favor ingresa un monto válido.');
      return;
    }
    if (!name.trim()) {
      Alert.alert('Error', 'Por favor ingresa un nombre para la plantilla.');
      return;
    }
  
    const finalFreq = frequency === 'Personalizado' ? `Cada ${customDays} days` : frequency;

    const payload = {
      user_id: userId || 'local-user',
      name: name.trim(),
      type: txType.toLowerCase(),
      amount: finalProcessedAmount,
      currency: currency,
      rate_type: isCrossCurrencyConversion || currency === 'VES' ? rateType : null,
      apply_paypal_fee: applyPayPalFee,
      account: selectedAccount,
      category: category,
      frequency: finalFreq,
      logo_domain: domainLogo.trim() || null,
      start_date: formatLocalDateString(startDate),
      end_date: endDate ? formatLocalDateString(endDate) : null
    };

    // 2. Payload unificado para la tabla debts (Pagar / Cobrar)
    const debtPayload = {
      user_id: userId || 'local-user',
      type: txType.toLowerCase() === 'ingreso' ? 'receive' : 'pay',
      category: category,
      amount: finalProcessedAmount,
      currency: currency,
      contact_name: name.trim(),
      description: `Pago recurrente (${finalFreq})`,
      due_date: `${formatLocalDateString(startDate)}T00:00:00Z`,
      status: 'pending'
    };
  
    try {
      if (userId) {
        if (templateId) {
          const { error } = await supabase
            .from('recurring_templates')
            .update(payload)
            .eq('id', templateId);
           
          if (error) throw error;
        } else {
          const { error: templateError } = await supabase
            .from('recurring_templates')
            .insert([payload]);
           
          if (templateError) throw templateError;

          const { error: debtError } = await supabase
            .from('debts')
            .insert([debtPayload]);

          if (debtError) {
            console.error('Error al sincronizar con debts:', debtError);
          }
        }
      }
      Alert.alert('Éxito', templateId ? 'Plantilla actualizada correctamente.' : 'Plantilla guardada y programada en Pagar/Cobrar.');
      navigation.goBack();
    } catch (err) {
      console.error('Error al guardar/actualizar plantilla en Supabase:', err);
      Alert.alert('Error', 'No se pudo guardar la plantilla en la nube.');
    }
  };

  const handleDeleteTemplate = () => {
    Alert.alert(
      'Eliminar plantilla',
      '¿Estás seguro de que deseas eliminar este pago recurrente?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Eliminar', 
          style: 'destructive', 
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('recurring_templates')
                .delete()
                .eq('id', templateId);
              if (error) throw error;
              Alert.alert('Eliminado', 'La plantilla ha sido borrada.');
              navigation.goBack();
            } catch (err) {
              console.error('Error al eliminar:', err);
              Alert.alert('Error', 'No se pudo eliminar la plantilla.');
            }
          }
        }
      ]
    );
  };

  const startDateDisplayLabel = `${startDate.getDate()} ${MONTHS[startDate.getMonth()]?.slice(0, 3)} ${startDate.getFullYear()}`;
  const endDateDisplayLabel = endDate ? `${endDate.getDate()} ${MONTHS[endDate.getMonth()]?.slice(0, 3)} ${endDate.getFullYear()}` : 'Sin fecha de fin';

  const isWorldCurrency = !['VES', 'USD'].includes(currency);

  return (
    <View style={styles.container}>
      <CustomHeader 
        title={templateId ? "Editar plantilla" : "Nueva plantilla"}
        onBackPress={() => navigation.goBack()}
        showHelp={false}
        rightComponent={
          <TouchableOpacity style={styles.typeBadge} onPress={() => setTypeDropdownOpen(!typeDropdownOpen)} activeOpacity={0.7}>
            <Ionicons 
              name={txType === 'Egreso' ? "arrow-down-circle" : "arrow-up-circle"} 
              size={14} 
              color={txType === 'Egreso' ? "#f87171" : "#a3e635"} 
            />
            <Text style={styles.typeBadgeText}>{txType}</Text>
            <Ionicons name="chevron-down" size={12} color="#aaa" />
          </TouchableOpacity>
        }
      />

      {typeDropdownOpen && (
        <View style={styles.dropdownPopup}>
          <TouchableOpacity style={styles.dropdownOption} onPress={() => { setTxType('Egreso'); setTypeDropdownOpen(false); }}>
            <Ionicons name="arrow-down-circle" size={16} color="#f87171" style={{ marginRight: 10 }} />
            <Text style={styles.dropdownText}>Egreso</Text>
            {txType === 'Egreso' && <Ionicons name="checkmark" size={16} color="#a3e635" style={{ marginLeft: 'auto' }} />}
          </TouchableOpacity>
          <TouchableOpacity style={styles.dropdownOption} onPress={() => { setTxType('Ingreso'); setTypeDropdownOpen(false); }}>
            <Ionicons name="arrow-up-circle" size={16} color="#a3e635" style={{ marginRight: 10 }} />
            <Text style={styles.dropdownText}>Ingreso</Text>
            {txType === 'Ingreso' && <Ionicons name="checkmark" size={16} color="#a3e635" style={{ marginLeft: 'auto' }} />}
          </TouchableOpacity>
        </View>
      )}

      <ScreenWrapper contentContainerStyle={styles.mainContentLayout} showsVerticalScrollIndicator={false}>
        <View style={styles.currencyToggleRow}>
          <TouchableOpacity 
            style={[styles.toggleBtn, currency === 'VES' && styles.toggleBtnActive]}
            onPress={() => setCurrency('VES')}
            activeOpacity={0.7}
          >
            <Text numberOfLines={1} style={[styles.toggleText, currency === 'VES' && styles.toggleTextActive]}>Bs Bolívares</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.toggleBtn, currency === 'USD' && styles.toggleBtnActive]}
            onPress={() => setCurrency('USD')}
            activeOpacity={0.7}
          >
            <Text numberOfLines={1} style={[styles.toggleText, currency === 'USD' && styles.toggleTextActive]}>$ Dólares</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.toggleBtn, isWorldCurrency && styles.toggleBtnActive]}
            onPress={() => setWorldCurrencyModalVisible(true)}
            activeOpacity={0.7}
          >
            <Text numberOfLines={1} style={[styles.toggleText, isWorldCurrency && styles.toggleTextActive]}>
              {isWorldCurrency ? `🌐 ${currency}` : '🌐 Otras'}
            </Text>
          </TouchableOpacity>
        </View>

        {(currency === 'VES' || isCrossCurrencyConversion) && (
          <TouchableOpacity 
            style={styles.rateTypeSelectorBanner} 
            onPress={() => setRateModalVisible(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="trending-up-outline" size={14} color="#a3e635" style={{ marginRight: 6 }} />
            <Text style={styles.rateTypeBannerText}>
              Tasa de conversión: <Text style={{ color: '#fff', fontWeight: 'bold' }}>
                {rateType === 'bcv' ? 'BCV Oficial' : 'Binance P2P'}
              </Text>
            </Text>
            <Ionicons name="chevron-forward" size={12} color="#888" style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
        )}

        <View style={styles.amountDisplayContainer}>
          <Text style={styles.mainAmountText}>
            {currency === 'VES' ? 'Bs ' : '$ '}
            {formatCurrencyValue(finalProcessedAmount, currency)}
          </Text>
          {isCrossCurrencyConversion && (
            <Text style={styles.subConvertedInfo}>
              Conversión automática aplicada a cuenta en {accountCurrency} ({rateType === 'bcv' ? 'BCV' : 'Binance'})
            </Text>
          )}
          {applyPayPalFee && (
            <Text style={styles.subConvertedInfo}>
              Descuento de PayPal (5.4% + $0.30) aplicado.
            </Text>
          )}
        </View>

        {txType === 'Ingreso' && (
          <TouchableOpacity 
            style={[styles.paypalToggleBox, applyPayPalFee && styles.paypalToggleBoxActive]} 
            onPress={() => setApplyPayPalFee(!applyPayPalFee)}
            activeOpacity={0.8}
          >
            <Ionicons name={applyPayPalFee ? "checkbox" : "square-outline"} size={18} color={applyPayPalFee ? "#38bdf8" : "#888"} style={{ marginRight: 8 }} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.paypalToggleText, applyPayPalFee && { color: '#fff' }]}>Descontar comisión de PayPal (5.4% + $0.30)</Text>
            </View>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.accountSelectorCard} onPress={() => setAccountModalVisible(true)} activeOpacity={0.7}>
          <View style={styles.accountCardInner}>
            <View style={styles.accountIconContainer}>
              <Ionicons name="wallet-outline" size={16} color="#a3e635" />
            </View>
            <View style={styles.accountTextContainer}>
              <Text style={styles.accountCardName} numberOfLines={1}>{selectedAccount}</Text>
              <Text style={styles.accountCardBalance}>Cuenta seleccionada ({accountCurrency})</Text>
            </View>
            <Ionicons name="chevron-down" size={12} color="#888" style={styles.accountChevron} />
          </View>
        </TouchableOpacity>

        <View style={styles.descriptionRow}>
          <TextInput 
            style={styles.descriptionInput}
            placeholder="Nombre (ej. Netflix, Ingreso USD a Bs)"
            placeholderTextColor="#777"
            value={name}
            onChangeText={setName}
          />
          <Text style={styles.descriptionTagLabel}>Tu {txType.toLowerCase()}</Text>
        </View>

        <View style={styles.chipsRow}>
          <TouchableOpacity style={styles.optionChip} onPress={() => setCatModalVisible(true)} activeOpacity={0.7}>
            <Ionicons name="pricetag-outline" size={14} color="#ccc" style={{ marginRight: 6 }} />
            <Text style={styles.optionChipText} numberOfLines={1}>{category}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.optionChip} onPress={() => setFreqModalVisible(true)} activeOpacity={0.7}>
            <Ionicons name="repeat-outline" size={14} color="#ccc" style={{ marginRight: 6 }} />
            <Text style={styles.optionChipText} numberOfLines={1}>
              {frequency === 'Personalizado' ? `Cada ${customDays || 0} días` : frequency}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.optionChip} onPress={() => setLogoModalVisible(true)} activeOpacity={0.7}>
            <Ionicons name="image-outline" size={14} color="#ccc" style={{ marginRight: 6 }} />
            <Text style={styles.optionChipText} numberOfLines={1}>Logo</Text>
          </TouchableOpacity>
        </View>

        {frequency !== 'Sin repetición' && (
          <View style={styles.chipsRow}>
            <TouchableOpacity style={styles.optionChip} onPress={handleOpenStartDateModal} activeOpacity={0.7}>
              <Ionicons name="calendar-outline" size={14} color="#a3e635" style={{ marginRight: 6 }} />
              <Text style={[styles.optionChipText, { color: '#fff' }]} numberOfLines={1}>{startDateDisplayLabel}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.optionChip} onPress={handleOpenEndDateModal} activeOpacity={0.7}>
              <Ionicons name="flag-outline" size={14} color="#a3e635" style={{ marginRight: 6 }} />
              <Text style={[styles.optionChipText, { color: '#fff' }]} numberOfLines={1}>{endDateDisplayLabel}</Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity 
          style={[styles.templateActionToggle, isTemplate && styles.templateActionToggleActive]} 
          onPress={() => setIsTemplate(!isTemplate)}
          activeOpacity={0.8}
        >
          <Ionicons name={isTemplate ? "checkbox" : "square-outline"} size={18} color={isTemplate ? "#a3e635" : "#888"} style={{ marginRight: 8 }} />
          <Text style={[styles.templateActionToggleText, isTemplate && { color: '#a3e635' }]}>Guardar como plantilla de acceso rápido</Text>
        </TouchableOpacity>

        {templateId && (
          <TouchableOpacity style={styles.deleteTemplateBtn} onPress={handleDeleteTemplate} activeOpacity={0.7}>
            <Ionicons name="trash-outline" size={16} color="#f87171" style={{ marginRight: 6 }} />
            <Text style={styles.deleteTemplateText}>Eliminar esta plantilla</Text>
          </TouchableOpacity>
        )}
      </ScreenWrapper>

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
          <TouchableOpacity style={styles.calcKeySubmit} onPress={handleSaveTemplate} activeOpacity={0.7}>
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

      <ThemedModal visible={startDateModalVisible} transparent animationType="fade" onRequestClose={() => setStartDateModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.calendarModalContainer}>
            <View style={styles.modalHeaderRow}>
              <TouchableOpacity style={styles.closeButtonModal} onPress={() => setStartDateModalVisible(false)} activeOpacity={0.7}>
                <Ionicons name="close" size={20} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Fecha de pago</Text>
              <TouchableOpacity style={styles.confirmButtonModal} onPress={() => {
                setStartDate(new Date(startYear, startMonthIndex, startDay));
                setStartDateModalVisible(false);
              }} activeOpacity={0.8}>
                <Ionicons name="checkmark" size={20} color="#000" />
              </TouchableOpacity>
            </View>

            <View style={styles.rateDisplayCard}>
              <View style={styles.rateInfoRow}>
                <TouchableOpacity onPress={() => {
                  if (startMonthIndex > 0) setStartMonthIndex(startMonthIndex - 1);
                  else { setStartMonthIndex(11); setStartYear(startYear - 1); }
                }} activeOpacity={0.7}>
                  <Ionicons name="chevron-back" size={20} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.rateInfoRightValue}>{MONTHS[startMonthIndex]} de {startYear}</Text>
                <TouchableOpacity onPress={() => {
                  if (startMonthIndex < 11) setStartMonthIndex(startMonthIndex + 1);
                  else { setStartMonthIndex(0); setStartYear(startYear + 1); }
                }} activeOpacity={0.7}>
                  <Ionicons name="chevron-forward" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={{ width: '100%', marginBottom: 10 }}>
              <View style={calendarStyles.weekDaysRow}>
                {['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'].map((w, index) => (
                  <Text key={index} style={calendarStyles.weekDayText}>{w}</Text>
                ))}
              </View>
              <View style={calendarStyles.daysGrid}>
                {Array.from({ length: getFirstDayOfMonth(startYear, startMonthIndex) }).map((_, b) => (
                  <View key={`start-blank-${b}`} style={calendarStyles.dayCellEmpty} />
                ))}
                {Array.from({ length: getDaysInMonth(startYear, startMonthIndex) }, (_, i) => i + 1).map(d => (
                  <TouchableOpacity 
                    key={`start-day-${d}`} 
                    style={[calendarStyles.dayCell, startDay === d && calendarStyles.dayCellSelected]}
                    onPress={() => setStartDay(d)}
                    activeOpacity={0.7}
                  >
                    <Text style={[calendarStyles.dayCellText, startDay === d && calendarStyles.dayCellTextSelected]}>{d}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </View>
      </ThemedModal>

      <ThemedModal visible={endDateModalVisible} transparent animationType="fade" onRequestClose={() => setEndDateModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.calendarModalContainer}>
            <View style={styles.modalHeaderRow}>
              <TouchableOpacity style={styles.closeButtonModal} onPress={() => setEndDateModalVisible(false)} activeOpacity={0.7}>
                <Ionicons name="close" size={20} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Fecha de finalización</Text>
              <TouchableOpacity style={styles.confirmButtonModal} onPress={() => {
                setEndDate(new Date(endYear, endMonthIndex, endDay));
                setEndDateModalVisible(false);
              }} activeOpacity={0.8}>
                <Ionicons name="checkmark" size={20} color="#000" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={{ backgroundColor: 'rgba(248,113,113,0.15)', paddingVertical: 10, borderRadius: 14, alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: 'rgba(248,113,113,0.3)', width: '100%' }}
              onPress={() => { setEndDate(null); setEndDateModalVisible(false); }}
            >
              <Text style={{ color: '#f87171', fontWeight: 'bold', fontSize: 13 }}>Sin fecha de fin</Text>
            </TouchableOpacity>

            <View style={styles.rateDisplayCard}>
              <View style={styles.rateInfoRow}>
                <TouchableOpacity onPress={() => {
                  if (endMonthIndex > 0) setEndMonthIndex(endMonthIndex - 1);
                  else { setEndMonthIndex(11); setEndYear(endYear - 1); }
                }} activeOpacity={0.7}>
                  <Ionicons name="chevron-back" size={20} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.rateInfoRightValue}>{MONTHS[endMonthIndex]} de {endYear}</Text>
                <TouchableOpacity onPress={() => {
                  if (endMonthIndex < 11) setEndMonthIndex(endMonthIndex + 1);
                  else { setEndMonthIndex(0); setEndYear(endYear + 1); }
                }} activeOpacity={0.7}>
                  <Ionicons name="chevron-forward" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={{ width: '100%', marginBottom: 10 }}>
              <View style={calendarStyles.weekDaysRow}>
                {['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'].map((w, index) => (
                  <Text key={index} style={calendarStyles.weekDayText}>{w}</Text>
                ))}
              </View>
              <View style={calendarStyles.daysGrid}>
                {Array.from({ length: getFirstDayOfMonth(endYear, endMonthIndex) }).map((_, b) => (
                  <View key={`end-blank-${b}`} style={calendarStyles.dayCellEmpty} />
                ))}
                {Array.from({ length: getDaysInMonth(endYear, endMonthIndex) }, (_, i) => i + 1).map(d => (
                  <TouchableOpacity 
                    key={`end-day-${d}`} 
                    style={[calendarStyles.dayCell, endDay === d && calendarStyles.dayCellSelected]}
                    onPress={() => setEndDay(d)}
                    activeOpacity={0.7}
                  >
                    <Text style={[calendarStyles.dayCellText, endDay === d && calendarStyles.dayCellTextSelected]}>{d}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </View>
      </ThemedModal>

      <ThemedModal visible={worldCurrencyModalVisible} transparent animationType="slide" onRequestClose={() => setWorldCurrencyModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.smallModalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>🌐 Monedas Internacionales</Text>
              <TouchableOpacity onPress={() => setWorldCurrencyModalVisible(false)}><Ionicons name="close" size={20} color="#fff" /></TouchableOpacity>
            </View>
            <ScreenWrapper style={{ maxHeight: 250 }} showsVerticalScrollIndicator={true}>
              {WORLD_CURRENCIES.map((item) => (
                <TouchableOpacity 
                  key={item.code} 
                  style={styles.categoryOptionRow}
                  onPress={() => { 
                    setCurrency(item.code); 
                    setWorldCurrencyModalVisible(false); 
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ fontSize: 16, marginRight: 10 }}>{item.symbol}</Text>
                    <Text style={styles.categoryOptionText}>{item.name} ({item.code})</Text>
                  </View>
                  {currency === item.code && <Ionicons name="checkmark" size={16} color="#a3e635" />}
                </TouchableOpacity>
              ))}
            </ScreenWrapper>
          </View>
        </View>
      </ThemedModal>

      <ThemedModal visible={rateModalVisible} transparent animationType="fade" onRequestClose={() => setRateModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.smallModalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Tipo de Tasa de Conversión</Text>
              <TouchableOpacity onPress={() => setRateModalVisible(false)}><Ionicons name="close" size={20} color="#fff" /></TouchableOpacity>
            </View>
            <TouchableOpacity 
              style={styles.categoryOptionRow}
              onPress={() => { setRateType('bcv'); setRateModalVisible(false); }}
            >
              <Text style={styles.categoryOptionText}>BCV Oficial (Banco Central)</Text>
              {rateType === 'bcv' && <Ionicons name="checkmark" size={16} color="#a3e635" />}
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.categoryOptionRow}
              onPress={() => { setRateType('binance'); setRateModalVisible(false); }}
            >
              <Text style={styles.categoryOptionText}>Binance P2P (Tasa libre del día)</Text>
              {rateType === 'binance' && <Ionicons name="checkmark" size={16} color="#a3e635" />}
            </TouchableOpacity>
          </View>
        </View>
      </ThemedModal>

      <ThemedModal visible={accountModalVisible} transparent animationType="slide" onRequestClose={() => setAccountModalVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setAccountModalVisible(false)}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Seleccionar cuenta</Text>
              <TouchableOpacity onPress={() => setAccountModalVisible(false)}><Ionicons name="close" size={20} color="#fff" /></TouchableOpacity>
            </View>
            {accountsList.length === 0 ? (
              <Text style={{ color: '#888', textAlign: 'center', padding: 15 }}>No hay cuentas registradas</Text>
            ) : (
              accountsList.map((acc) => (
                <TouchableOpacity 
                  key={acc.id} 
                  style={styles.accountOptionRow}
                  onPress={() => { setSelectedAccount(acc.name); setAccountModalVisible(false); }}
                >
                  <Text style={styles.accountOptionText}>{acc.name}</Text>
                  <Text style={styles.accountOptionBalance}>{acc.currency} {formatCurrencyValue(acc.balance, acc.currency)}</Text>
                </TouchableOpacity>
              ))
            )}
          </View>
        </TouchableOpacity>
      </ThemedModal>

<ThemedModal visible={catModalVisible} transparent animationType="slide" onRequestClose={() => setCatModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={{ flex: 1, width: '100%' }} activeOpacity={1} onPress={() => setCatModalVisible(false)} />
          <View style={[styles.smallModalCard, { maxHeight: '70%' }]}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Seleccionar categoría ({txType})</Text>
              <TouchableOpacity onPress={() => setCatModalVisible(false)}><Ionicons name="close" size={20} color="#fff" /></TouchableOpacity>
            </View>
            <ScrollView
              style={{ width: '100%' }}
              contentContainerStyle={{ paddingBottom: 20 }}
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}
              keyboardShouldPersistTaps="handled"
            >
              {(() => {
                // Filtro flexible y robusto para capturar ingresos o egresos sin importar mayúsculas/minúsculas
                const isCurrentIncome = txType.toLowerCase().includes('ingreso');
                const parentCategories = categoriesList.filter(c => {
                  if (c.parent_id) return false;
                  const cType = String(c.type || '').toLowerCase();
                  return isCurrentIncome ? cType.includes('ingreso') : cType.includes('egreso');
                });

                if (parentCategories.length === 0) {
                  return <Text style={{ color: '#888', textAlign: 'center', padding: 20 }}>No hay categorías de {txType.toLowerCase()}s disponibles</Text>;
                }

                return parentCategories.map((cat) => {
                  const subCategories = categoriesList.filter(sub => String(sub.parent_id) === String(cat.id));
                  const hasSubCategories = subCategories.length > 0;
                  const isExpanded = expandedCategoryName === cat.name;

                  return (
                    <View key={cat.id || cat.name}>
                      <View style={[styles.categoryOptionRow, { paddingRight: 8 }]}>
                        <TouchableOpacity
                          style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}
                          onPress={() => { setCategory(cat.name); setCatModalVisible(false); }}
                        >
                          <Ionicons name={cat.icon || 'pricetag-outline'} size={16} color={cat.color || '#a3e635'} style={{ marginRight: 10 }} />
                          <Text style={styles.categoryOptionText}>{cat.name}</Text>
                        </TouchableOpacity>

                        {category === cat.name && (
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
                          key={sub.id || sub.name}
                          style={[styles.categoryOptionRow, { paddingLeft: 30, backgroundColor: 'rgba(255,255,255,0.02)' }]}
                          onPress={() => { setCategory(sub.name); setCatModalVisible(false); }}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Ionicons name={sub.icon || 'pricetag-outline'} size={14} color={sub.color || '#ccc'} style={{ marginRight: 10 }} />
                            <Text style={[styles.categoryOptionText, { fontSize: 13, color: '#ccc' }]}>└ {sub.name}</Text>
                          </View>
                          {category === sub.name && <Ionicons name="checkmark" size={16} color="#a3e635" />}
                        </TouchableOpacity>
                      ))}
                    </View>
                  );
                });
              })()}
            </ScrollView>
          </View>
        </View>
      </ThemedModal>

<ThemedModal visible={freqModalVisible} transparent animationType="slide" onRequestClose={() => setFreqModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={{ flex: 1, width: '100%' }} activeOpacity={1} onPress={() => setFreqModalVisible(false)} />
          <View style={[styles.smallModalCard, { maxHeight: '70%' }]}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Frecuencia de pago</Text>
              <TouchableOpacity onPress={() => setFreqModalVisible(false)}><Ionicons name="close" size={20} color="#fff" /></TouchableOpacity>
            </View>
            <ScrollView
              style={{ width: '100%' }}
              contentContainerStyle={{ paddingBottom: 20 }}
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}
              keyboardShouldPersistTaps="handled"
            >
              {[
                { label: 'Sin repetición' },
                { label: 'Semanal' },
                { label: 'Quincenal' },
                { label: 'Mensual' },
                { label: 'Trimestral' },
                { label: 'Semestral' },
                { label: 'Anual' },
                { label: 'Personalizado' }
              ].map((item) => (
                <View key={item.label}>
                  <TouchableOpacity
                    style={styles.categoryOptionRow}
                    onPress={() => {
                      setFrequency(item.label);
                      if (item.label !== 'Personalizado') {
                        setFreqModalVisible(false);
                      }
                    }}
                  >
                    <Text style={styles.categoryOptionText}>{item.label}</Text>
                    {frequency === item.label && <Ionicons name="checkmark" size={16} color="#a3e635" />}
                  </TouchableOpacity>

                  {item.label === 'Personalizado' && frequency === 'Personalizado' && (
                    <View style={{ paddingVertical: 10, paddingHorizontal: 4 }}>
                      <TextInput
                        style={styles.descriptionInputModal}
                        placeholder="Cantidad de días (ej. 45)"
                        placeholderTextColor="#666"
                        keyboardType="numeric"
                        value={customDays}
                        onChangeText={setCustomDays}
                      />
                      <TouchableOpacity
                        style={styles.confirmModalBtn}
                        onPress={() => setFreqModalVisible(false)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.confirmModalBtnText}>Guardar frecuencia</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </ThemedModal>

      <ThemedModal visible={logoModalVisible} transparent animationType="slide" onRequestClose={() => setLogoModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={{ flex: 1, width: '100%' }} activeOpacity={1} onPress={() => setLogoModalVisible(false)} />
          <View style={styles.smallModalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Adjuntar Logo o Imagen</Text>
              <TouchableOpacity onPress={() => setLogoModalVisible(false)}><Ionicons name="close" size={20} color="#fff" /></TouchableOpacity>
            </View>

            <View style={{ paddingVertical: 10 }}>
              <TouchableOpacity
                style={[styles.confirmModalBtn, { marginBottom: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }]}
                onPress={async () => {
                  try {
                    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
                    if (!permissionResult.granted) {
                      Alert.alert('Permiso requerido', 'Se necesitan permisos para acceder a la galería.');
                      return;
                    }
                    const result = await ImagePicker.launchImageLibraryAsync({
                      mediaTypes: ImagePicker.MediaTypeOptions.Images,
                      allowsEditing: true,
                      aspect: [1, 1],
                      quality: 0.8,
                    });

                    if (!result.canceled && result.assets && result.assets.length > 0) {
                      setDomainLogo(result.assets[0].uri);
                      setLogoModalVisible(false);
                    }
                  } catch (e) {
                    console.error('Error al seleccionar imagen:', e);
                    Alert.alert('Error', 'No se pudo seleccionar la imagen.');
                  }
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="image-outline" size={18} color="#000" style={{ marginRight: 8 }} />
                <Text style={styles.confirmModalBtnText}>Seleccionar desde la galería</Text>
              </TouchableOpacity>

              <Text style={{ color: '#888', fontSize: 12, textAlign: 'center', marginVertical: 6 }}>O ingresa una URL de imagen:</Text>

              <TextInput
                style={styles.descriptionInputModal}
                placeholder="https://ejemplo.com/logo.png"
                placeholderTextColor="#666"
                value={domainLogo.startsWith('file://') || domainLogo.startsWith('content://') ? '' : domainLogo}
                onChangeText={setDomainLogo}
              />

              <TouchableOpacity
                style={[styles.confirmModalBtn, { backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }]}
                onPress={() => setLogoModalVisible(false)}
                activeOpacity={0.8}
              >
                <Text style={[styles.confirmModalBtnText, { color: '#fff' }]}>Aceptar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ThemedModal>
    </View>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  typeBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.07)', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1.2, borderColor: 'rgba(255, 255, 255, 0.15)' },
  typeBadgeText: { color: '#fff', fontSize: 12, fontWeight: 'bold', marginHorizontal: 5 },
  
  mainContentLayout: { flexGrow: 1, paddingHorizontal: 15, justifyContent: 'center', paddingBottom: 20 },

  currencyToggleRow: { 
    flexDirection: 'row', 
    backgroundColor: 'rgba(255, 255, 255, 0.05)', 
    borderRadius: 20, 
    padding: 4, 
    marginBottom: 10, 
    width: '100%', 
    maxWidth: 340,
    alignSelf: 'center', 
    borderWidth: 1.2, 
    borderColor: 'rgba(255, 255, 255, 0.12)' 
  },
  toggleBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', justifyContent: 'center', borderRadius: 16 },
  toggleBtnActive: { backgroundColor: 'rgba(255, 255, 255, 0.12)' },
  toggleText: { color: '#888', fontSize: 12, fontWeight: 'bold' },
  toggleTextActive: { color: '#a3e635' },

  rateTypeSelectorBanner: {
    flexDirection: 'row',
    backgroundColor: 'rgba(163, 230, 53, 0.08)',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(163, 230, 53, 0.25)',
    maxWidth: 340,
    alignSelf: 'center',
    width: '100%'
  },
  rateTypeBannerText: { color: '#ccc', fontSize: 12 },

  paypalToggleBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
    maxWidth: 340,
    alignSelf: 'center',
    width: '100%'
  },
  paypalToggleBoxActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderColor: 'rgba(56, 189, 248, 0.5)'
  },
  paypalToggleText: { color: '#888', fontSize: 12, fontWeight: 'bold' },
  
  amountDisplayContainer: { alignItems: 'center', marginBottom: 15 },
  mainAmountText: { color: '#fff', fontSize: 36, fontWeight: 'bold' },
  subConvertedInfo: { color: '#888', fontSize: 11, marginTop: 4, textAlign: 'center', paddingHorizontal: 10 },
  
  accountSelectorCard: { 
    backgroundColor: 'rgba(255, 255, 255, 0.07)', 
    borderRadius: 24, 
    paddingVertical: 10, 
    paddingHorizontal: 16, 
    marginBottom: 15, 
    alignSelf: 'center',
    width: '78%',
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.18)'
  },
  accountCardInner: { flexDirection: 'row', alignItems: 'center' },
  accountIconContainer: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
    borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)'
  },
  accountTextContainer: { flex: 1, alignItems: 'flex-start' },
  accountCardName: { color: '#fff', fontSize: 14, fontWeight: 'bold', marginBottom: 2 },
  accountCardBalance: { color: '#888', fontSize: 12 },
  accountChevron: { marginLeft: 8 },
  
  descriptionRow: { flexDirection: 'row', backgroundColor: 'rgba(255, 255, 255, 0.06)', borderRadius: 16, paddingHorizontal: 15, alignItems: 'center', height: 48, marginBottom: 12, borderWidth: 1.2, borderColor: 'rgba(255, 255, 255, 0.12)' },
  descriptionInput: { flex: 1, color: '#fff', fontSize: 14 },
  descriptionTagLabel: { color: '#777', fontSize: 13 },
  
  chipsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  optionChip: { flex: 1, flexDirection: 'row', backgroundColor: 'rgba(255, 255, 255, 0.07)', paddingVertical: 10, paddingHorizontal: 10, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginHorizontal: 4, height: 40, borderWidth: 1.2, borderColor: 'rgba(255, 255, 255, 0.14)' },
  optionChipText: { color: '#ccc', fontSize: 12, fontWeight: '500' },

  templateActionToggle: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1.2,
    borderColor: 'rgba(255,255,255,0.1)',
    marginTop: 6,
    marginHorizontal: 4
  },
  templateActionToggleActive: {
    backgroundColor: 'rgba(163,230,53,0.08)',
    borderColor: 'rgba(163,230,53,0.3)'
  },
  templateActionToggleText: {
    color: '#888',
    fontSize: 13,
    fontWeight: 'bold'
  },

  deleteTemplateBtn: { backgroundColor: 'rgba(248,113,113,0.1)', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 12, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(248,113,113,0.3)', marginTop: 10, marginHorizontal: 4 },
  deleteTemplateText: { color: '#f87171', fontSize: 13, fontWeight: 'bold' },
  
  calculatorPad: NUMERIC_KEYPAD_STYLES.container,
  calcRow: NUMERIC_KEYPAD_STYLES.row,
  calcKey: NUMERIC_KEYPAD_STYLES.key,
  calcKeySubmit: NUMERIC_KEYPAD_STYLES.submitKey,
  calcKeyEmpty: NUMERIC_KEYPAD_STYLES.emptyKey,
  calcKeyText: NUMERIC_KEYPAD_STYLES.keyText,
  calcKeyYellowText: NUMERIC_KEYPAD_STYLES.clearKeyText,

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  dropdownPopup: { backgroundColor: 'rgba(25,25,28,0.95)', position: 'absolute', top: 60, right: 15, borderRadius: 12, padding: 8, width: 140, borderWidth: 1.2, borderColor: 'rgba(255,255,255,0.15)', zIndex: 100 },
  dropdownOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 8 },
  dropdownText: { color: '#fff', fontSize: 13 },
  
  modalCard: { backgroundColor: 'rgba(18,18,20,0.95)', width: '100%', borderRadius: 24, padding: 20, borderWidth: 1.2, borderColor: 'rgba(255,255,255,0.12)' },
  smallModalCard: { backgroundColor: 'rgba(18,18,20,0.95)', width: '100%', alignSelf: 'center', borderRadius: 24, padding: 20, maxHeight: '50%', borderWidth: 1.2, borderColor: 'rgba(255,255,255,0.12)' },
  calendarModalContainer: { width: '100%', maxWidth: 360, backgroundColor: 'rgba(20,20,22,0.92)', borderRadius: 28, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },

  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 15 },
  modalTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  closeButtonModal: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.08)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  confirmButtonModal: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#a3e635', justifyContent: 'center', alignItems: 'center' },

  rateDisplayCard: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 20, paddingVertical: 14, paddingHorizontal: 18, width: '100%', marginBottom: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  rateInfoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rateInfoRightValue: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

  descriptionInputModal: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, color: '#fff', fontSize: 13, borderWidth: 1.2, borderColor: 'rgba(255,255,255,0.12)', marginBottom: 12 },
  confirmModalBtn: { backgroundColor: '#a3e635', paddingVertical: 12, borderRadius: 16, alignItems: 'center' },
  confirmModalBtnText: { color: '#000', fontSize: 14, fontWeight: 'bold' },

  accountOptionRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' },
  accountOptionText: { color: '#fff', fontSize: 15 },
  accountOptionBalance: { color: '#888', fontSize: 14 },
  categoryOptionRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' },
  categoryOptionText: { color: '#fff', fontSize: 15 },
  categoryScrollList: { maxHeight: 280 }
});