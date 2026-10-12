import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Modal } from 'react-native';
import CustomHeader from '../../components/CustomHeader';
import ScreenWrapper from '../../components/ScreenWrapper';

const formatCurrencyValue = (num) => {
  const n = parseFloat(num || 0);
  if (isNaN(n)) return '0,00';
  const parts = n.toFixed(2).split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return parts.join(',');
};

export default function CalculatorScreen({ navigation, rates }) {
  const [calcInput, setCalcInput] = useState('1.00');
  const [sourceCurrency, setSourceCurrency] = useState('USD');
  const [targetCurrency, setTargetCurrency] = useState('VES');
  const [modalSourceVisible, setModalSourceVisible] = useState(false);
  const [modalTargetVisible, setModalTargetVisible] = useState(false);

  const getConversionRate = () => {
    if (sourceCurrency === targetCurrency) return 1;
    let valueInUSD = parseFloat(calcInput || '0');

    if (sourceCurrency === 'EUR') valueInUSD = (parseFloat(calcInput || '0') * rates.eurRate) / rates.bcvRate;
    else if (sourceCurrency === 'VES') valueInUSD = parseFloat(calcInput || '0') / rates.bcvRate;
    else if (sourceCurrency === 'USDT') valueInUSD = parseFloat(calcInput || '0') * (rates.p2pRate / rates.bcvRate);

    if (targetCurrency === 'USD') return valueInUSD;
    if (targetCurrency === 'EUR') return (valueInUSD * rates.bcvRate) / rates.eurRate;
    if (targetCurrency === 'VES') return valueInUSD * rates.bcvRate;
    if (targetCurrency === 'USDT') return valueInUSD * (rates.bcvRate / rates.p2pRate);

    return valueInUSD;
  };

  const handleCalcPress = (value) => {
    if (value === 'C') setCalcInput('0');
    else if (value === 'DEL') setCalcInput(prev => prev.length > 1 ? prev.slice(0, -1) : '0');
    else setCalcInput(prev => prev === '0' ? value : prev + value);
  };

  const calculatedResultNumeric = getConversionRate();

  const swapCurrencies = () => {
    const temp = sourceCurrency;
    setSourceCurrency(targetCurrency);
    setTargetCurrency(temp);
  };

  // Cálculo de la tasa unitaria de la conversión actual[cite: 20]
  const unitRateValue = calculatedResultNumeric / parseFloat(calcInput || '1');

  return (
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
          {[['÷', '×', '-', '+'], ['1', '2', '3', '⌫'], ['4', '5', '6', 'C'], ['7', '8', '9', '➔'], [',', '0', '00']].map((row, rowIndex) => (
            <View key={rowIndex} style={styles.keyRow}>
              {row.map((btn, btnIndex) => (
                <TouchableOpacity 
                  key={btnIndex} 
                  style={[styles.keyButton, btn === '➔' && styles.keyButtonAction]} 
                  onPress={() => {
                    if (btn === '⌫') handleCalcPress('DEL');
                    else if (btn === 'C') handleCalcPress('C');
                    else if (['1','2','3','4','5','6','7','8','9','0','00',','].includes(btn)) handleCalcPress(btn === ',' ? '.' : btn);
                  }}
                >
                  <Text style={[styles.keyText, btn === '➔' && styles.keyTextAction]}>{btn}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </View>
      </View>

      {/* Modales de selección[cite: 20] */}
      <Modal visible={modalSourceVisible} transparent={true} animationType="fade">
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
      </Modal>

      <Modal visible={modalTargetVisible} transparent={true} animationType="fade">
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
      </Modal>
    </View>
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
  keypadContainer: { paddingBottom: 5 },
  keyRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  keyButton: { backgroundColor: '#1f2937', flex: 1, height: 46, marginHorizontal: 3, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  keyButtonAction: { backgroundColor: '#a3e635' },
  keyText: { color: '#fff', fontSize: 18, fontWeight: '500' },
  keyTextAction: { color: '#000', fontWeight: 'bold' },
  modalOverlay: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.8)', padding: 20 },
  modalContent: { backgroundColor: '#1a1a1a', padding: 20, borderRadius: 20 },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  modalOption: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#333' },
  modalOptionText: { color: '#fff', fontSize: 16, textAlign: 'center' }
});