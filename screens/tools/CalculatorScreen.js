import ThemedModal from "../../components/ThemedModal";
import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Modal } from 'react-native';
import CustomHeader from '../../components/CustomHeader';
import ScreenWrapper from '../../components/ScreenWrapper';
import ThemeContent from '../../components/ThemeContent';
import { NUMERIC_KEYPAD_STYLES } from '../../components/numericKeypadStyles';
import { convertCurrencyAmount } from '../../services/currencyService';

const formatCurrencyValue = (num) => {
  const n = parseFloat(num || 0);
  if (isNaN(n)) return '0,00';
  const parts = n.toFixed(2).split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return parts.join(',');
};

export default function CalculatorScreen({ navigation, rates }) {
  const [calcInput, setCalcInput] = useState('0');
  const [sourceCurrency, setSourceCurrency] = useState('USD');
  const [targetCurrency, setTargetCurrency] = useState('VES');
  const [modalSourceVisible, setModalSourceVisible] = useState(false);
  const [modalTargetVisible, setModalTargetVisible] = useState(false);

  const getConversionRate = () => {
    return convertCurrencyAmount(parseFloat(calcInput || '0'), sourceCurrency, targetCurrency, rates) ?? 0;
  };

  const handleCalcPress = (value) => {
    setCalcInput((currentValue) => {
      if (value === 'C') return '0';
      if (value === 'DEL') return currentValue.length > 1 ? currentValue.slice(0, -1) : '0';
      if (value === '.') {
        if (currentValue.includes('.')) return currentValue;
        return `${currentValue || '0'}.`;
      }
      if (currentValue === '0') return value === '00' ? '0' : value;
      return currentValue + value;
    });
  };

  const calculatedResultNumeric = getConversionRate();

  const swapCurrencies = () => {
    const temp = sourceCurrency;
    setSourceCurrency(targetCurrency);
    setTargetCurrency(temp);
  };

  // Cálculo de la tasa unitaria de la conversión actual[cite: 20]
  const unitRateValue = calculatedResultNumeric / (parseFloat(calcInput) || 1);

  return (
    <ThemeContent>
    <View style={styles.container}>
      {/* Cabecera estandarizada con CustomHeader */}
      <CustomHeader 
        title="Calculadora"
        onBackPress={() => navigation('home')}
        rightIcon={null}
        onRightPress={() => {}}
      />

      <View style={styles.contentBody}>
        <View style={styles.calcSection}>
          <TouchableOpacity style={styles.currencyBtnLarge} onPress={() => setModalSourceVisible(true)}>
            <Text style={styles.currencyBtnTextLarge}>{sourceCurrency} ▾</Text>
          </TouchableOpacity>
          <Text style={styles.mainAmount}>
            {sourceCurrency === 'USD' ? '$' : sourceCurrency === 'EUR' ? '€' : sourceCurrency === 'VES' ? 'Bs.' : ''} {formatCurrencyValue(calcInput)}
          </Text>
        </View>

        <TouchableOpacity style={styles.swapButton} onPress={swapCurrencies}>
          <Text style={styles.swapIcon}>⇅</Text>
        </TouchableOpacity>

        <View style={styles.calcSection}>
          <TouchableOpacity style={styles.currencyBtnLarge} onPress={() => setModalTargetVisible(true)}>
            <Text style={styles.currencyBtnTextLarge}>{targetCurrency} ▾</Text>
          </TouchableOpacity>
          
          {/* Monto principal de destino exactamente alineado a la izquierda[cite: 20] */}
          <Text style={styles.targetAmount}>
            {targetCurrency === 'USD' ? '$' : targetCurrency === 'EUR' ? '€' : targetCurrency === 'VES' ? 'Bs.' : ''} {formatCurrencyValue(calculatedResultNumeric)}
          </Text>

          {/* Detalle de tasa unitaria estrictamente centrado[cite: 20] */}
          <Text style={styles.subRateCentered}>
            1 {sourceCurrency} = {targetCurrency === 'VES' ? 'Bs. ' : targetCurrency === 'EUR' ? '€ ' : targetCurrency === 'USDT' ? '' : '$ '}
            {formatCurrencyValue(unitRateValue)} {targetCurrency}
          </Text>

          {/* Fecha y hora de actualización estrictamente centradas[cite: 20] */}
          <Text style={styles.timeTextCentered}>Actualizado {rates.lastUpdated}</Text>
        </View>

        <View style={styles.keypadContainer}>
          {[
            ['1', '2', '3', 'DEL'],
            ['4', '5', '6', 'C'],
            ['7', '8', '9', null],
            ['.', '0', '00', null],
          ].map((row, rowIndex) => (
            <View key={rowIndex} style={styles.keyRow}>
              {row.map((btn, btnIndex) => btn ? (
                <TouchableOpacity
                  key={btn}
                  style={styles.keyButton}
                  onPress={() => handleCalcPress(btn)}
                  accessibilityRole="button"
                  accessibilityLabel={btn === 'DEL' ? 'Borrar último dígito' : btn === 'C' ? 'Limpiar monto' : btn}
                >
                  <Text style={btn === 'C' ? styles.clearKeyText : styles.keyText}>
                    {btn === 'DEL' ? '⌫' : btn}
                  </Text>
                </TouchableOpacity>
              ) : (
                <View key={`empty-${btnIndex}`} style={styles.emptyKey} />
              ))}
            </View>
          ))}
        </View>
      </View>

      {/* Modales de selección[cite: 20] */}
      <ThemedModal visible={modalSourceVisible} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Moneda Origen</Text>
            {['USD', 'EUR', 'VES', 'USDT'].filter(c => c !== targetCurrency).map(c => (
              <TouchableOpacity key={c} style={styles.modalOption} onPress={() => { setSourceCurrency(c); setModalSourceVisible(false); }}>
                <Text style={styles.modalOptionText}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ThemedModal>

      <ThemedModal visible={modalTargetVisible} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Moneda Destino</Text>
            {['USD', 'EUR', 'VES', 'USDT'].filter(c => c !== sourceCurrency).map(c => (
              <TouchableOpacity key={c} style={styles.modalOption} onPress={() => { setTargetCurrency(c); setModalTargetVisible(false); }}>
                <Text style={styles.modalOptionText}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ThemedModal>
    </View>
    </ThemeContent>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  contentBody: { flex: 1, padding: 15, justifyContent: 'space-between', paddingTop: 10 },
  calcSection: { paddingVertical: 2, alignItems: 'flex-start', width: '100%' },
  currencyBtnLarge: { backgroundColor: '#1f2937', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, marginBottom: 4 },
  currencyBtnTextLarge: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  mainAmount: { color: '#fff', fontSize: 32, fontWeight: 'bold', textAlign: 'left', width: '100%' },
  targetAmount: { color: '#fff', fontSize: 28, fontWeight: 'bold', textAlign: 'left', width: '100%' },
  subRateCentered: { color: '#888', fontSize: 12, marginTop: 4, textAlign: 'center', width: '100%' },
  timeTextCentered: { color: '#666', fontSize: 11, marginTop: 2, textAlign: 'center', width: '100%' },
  swapButton: { backgroundColor: '#a3e635', width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', alignSelf: 'center', marginVertical: 2 },
  swapIcon: { color: '#000', fontSize: 18, fontWeight: 'bold' },
  keypadContainer: NUMERIC_KEYPAD_STYLES.container,
  keyRow: NUMERIC_KEYPAD_STYLES.row,
  keyButton: NUMERIC_KEYPAD_STYLES.key,
  keyText: NUMERIC_KEYPAD_STYLES.keyText,
  clearKeyText: NUMERIC_KEYPAD_STYLES.clearKeyText,
  emptyKey: NUMERIC_KEYPAD_STYLES.emptyKey,
  modalOverlay: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.8)', padding: 20 },
  modalContent: { backgroundColor: '#1a1a1a', padding: 20, borderRadius: 20 },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  modalOption: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#333' },
  modalOptionText: { color: '#fff', fontSize: 16, textAlign: 'center' }
});