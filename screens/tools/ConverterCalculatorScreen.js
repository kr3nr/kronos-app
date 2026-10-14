import ThemedModal from "../../components/ThemedModal";
import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Dimensions, Modal, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CustomHeader from '../../components/CustomHeader';
import ScreenWrapper from '../../components/ScreenWrapper';
import { NUMERIC_KEYPAD_STYLES } from '../../components/numericKeypadStyles';
import { calculateCommissionAmount, VES_COMMISSION_OPTIONS } from '../../services/movementCommissions';
import { convertCurrencyAmount } from '../../services/currencyService';

const { width } = Dimensions.get('window');

// Formateador estricto según la regla de monedas acordada[cite: 18]
const formatCurrency = (num, currency) => {
  const n = parseFloat(num || 0);
  if (isNaN(n)) return currency === 'VES' || currency === 'EUR' ? '0,00' : '0.00';
  
  const parts = n.toFixed(2).split('.');
  if (currency === 'VES' || currency === 'EUR') {
    // VES / EUR: Puntos para miles, coma para decimales (ej. 1.250,00)[cite: 18]
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return parts.join(',');
  } else {
    // USD / USDT: Comas para miles, punto para decimales (ej. 1,250.00)[cite: 18]
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
  }
};

const COMMISSION_OPTIONS = [
  ...VES_COMMISSION_OPTIONS.map(({ type, label }) => ({
    name: label,
    type: 'VES',
    commissionType: type,
    category: 'Bancos Nacionales (Bolívares)'
  })),
  { name: 'Binance P2P Maker (0.25%)', type: 'USD', pct: 0.25, minBs: 0, fixedUsd: 0, category: 'Plataformas Internacionales' },
  { name: 'Binance Spot (0.10%)', type: 'USD', pct: 0.10, minBs: 0, fixedUsd: 0, category: 'Plataformas Internacionales' },
  { name: 'Wally Tech (3.5% + 7%)', type: 'USD', pct: 3.75, minBs: 0, fixedUsd: 0, category: 'Plataformas Internacionales' },
  { name: 'Zinli Recarga (1%)', type: 'USD', pct: 1.0, minBs: 0, fixedUsd: 0, category: 'Plataformas Internacionales' },
  { name: 'PayPal (5.4% + $0.30)', type: 'USD', pct: 5.4, minBs: 0, fixedUsd: 0.30, category: 'Plataformas Internacionales' }
];

export default function ConverterCalculatorScreen({ navigation, rates }) {
  const [displayValue, setDisplayValue] = useState('0');
  
  // Estados para el modo Conversor[cite: 18]
  const [sourceCurrency, setSourceCurrency] = useState('USD');
  const [targetCurrency, setTargetCurrency] = useState('VES');

  // Estado para pestañas superiores ('converter' o 'commission')[cite: 18]
  const [calculatorMode, setCalculatorMode] = useState('converter');

  // Estado para mostrar/ocultar ayuda contextual[cite: 18]
  const [showHelpTooltip, setShowHelpTooltip] = useState(false);

  // Estado para abrir/cerrar el modal selector de comisiones[cite: 18]
  const [isCommissionModalVisible, setIsCommissionModalVisible] = useState(false);

  // Estados para el modo Comisiones[cite: 18]
  const [selectedCommission, setSelectedCommission] = useState(COMMISSION_OPTIONS[0]);

  const bcvRate = rates?.bcvRate || 1;
  const eurRate = rates?.eurRate || 1;
  const binanceRate = rates?.binanceRate || 1;

  // Validación para evitar conversión entre la misma moneda[cite: 18]
  const handleSelectSource = (curr) => {
    if (curr === targetCurrency) return;
    setSourceCurrency(curr);
  };

  const handleSelectTarget = (curr) => {
    if (curr === sourceCurrency) return;
    setTargetCurrency(curr);
  };

  // Lógica del teclado numérico unificado[cite: 18]
  const handlePressKey = (val) => {
    setDisplayValue((currentValue) => {
      if (val === 'C') return '0';
      if (val === 'backspace') {
        return currentValue.length > 1 ? currentValue.slice(0, -1) : '0';
      }
      if (val === '.') {
        if (currentValue.includes('.')) return currentValue;
        return `${currentValue || '0'}.`;
      }
      if (currentValue === '0') return val === '00' ? '0' : val;
      return currentValue + val;
    });
  };

  const numericAmount = parseFloat(displayValue) || 0;
  
  // Conversión de monedas[cite: 18]
  const convertAmount = () => {
    return convertCurrencyAmount(numericAmount, sourceCurrency, targetCurrency, rates) ?? 0;
  };

  const convertedValue = convertAmount();

  const getTargetRateText = () => {
    if (targetCurrency === 'VES') return `Tasa BCV referencia: Bs. ${formatCurrency(bcvRate, 'VES')}`;
    if (targetCurrency === 'EUR') return `Tasa Euro referencia: € ${formatCurrency(eurRate, 'EUR')}`;
    if (targetCurrency === 'USDT') return `Tasa Binance P2P: ${formatCurrency(binanceRate, 'USD')} USDT`;
    return `Tasa USD referencia: $ ${formatCurrency(bcvRate, 'USD')}`;
  };

  // Lógica de cálculo de comisiones reales[cite: 18]
  const calculateCommission = () => {
    if (selectedCommission.type === 'VES') {
      const finalFee = calculateCommissionAmount(selectedCommission.commissionType, 'Egreso', numericAmount);
      const total = numericAmount + finalFee;
      return { fee: finalFee, total };
    } else {
      const calculatedPct = (numericAmount * selectedCommission.pct) / 100;
      const finalFee = calculatedPct + selectedCommission.fixedUsd;
      const total = numericAmount + finalFee;
      return { fee: finalFee, total };
    }
  };

  const commissionData = calculateCommission();

  return (
    <View style={styles.container}>
      {/* Cabecera estandarizada con CustomHeader */}
      <CustomHeader 
        title="Calculadora y Tasas"
        onBackPress={() => navigation('home')}
        helpTitle="Calculadora y tasas"
        helpTips={[
          'Usa las pestañas para cambiar entre conversión y cálculo de comisiones.',
          'Selecciona las monedas o plataforma antes de ingresar el monto.',
          'Los resultados se actualizan al cambiar los datos.',
        ]}
      />

      {/* Tarjeta de Ayuda Contextual (Tooltip)[cite: 18] */}
      {showHelpTooltip && (
        <View style={styles.tooltipCard}>
          <Text style={styles.tooltipTitle}>💡 Guía Rápida</Text>
          <Text style={styles.tooltipText}>
            {calculatorMode === 'converter' 
              ? 'Convierte montos entre USD, VES, EUR y USDT con tasas oficiales del BCV y Binance P2P.'
              : 'Selecciona la plataforma o banco y calcula instantáneamente la comisión aplicable.'}
          </Text>
          <TouchableOpacity onPress={() => setShowHelpTooltip(false)} style={styles.tooltipCloseBtn}>
            <Text style={styles.tooltipCloseText}>Entendido ✓</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Pestañas Superiores con mayor separación y centrado[cite: 18] */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity 
          style={[styles.tabButton, calculatorMode === 'converter' && styles.tabButtonActive]}
          onPress={() => setCalculatorMode('converter')}
        >
          <Ionicons name="swap-horizontal-outline" size={16} color={calculatorMode === 'converter' ? '#000' : '#888'} style={{ marginRight: 6 }} />
          <Text style={[styles.tabText, calculatorMode === 'converter' && styles.tabTextActive]}>Conversor</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tabButton, calculatorMode === 'commission' && styles.tabButtonActive]}
          onPress={() => setCalculatorMode('commission')}
        >
          <Ionicons name="calculator-outline" size={16} color={calculatorMode === 'commission' ? '#000' : '#888'} style={{ marginRight: 6 }} />
          <Text style={[styles.tabText, calculatorMode === 'commission' && styles.tabTextActive]}>Comisiones</Text>
        </TouchableOpacity>
      </View>

      <ScreenWrapper contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {calculatorMode === 'converter' ? (
          /* ================= MODO CONVERSOR ================= */
          <>
            <View style={[styles.transferCard, styles.converterTransferCard]}>
              <Text style={styles.cardSectionLabel}>MONEDA ORIGEN</Text>
              <View style={styles.chipsRow}>
                {['USD', 'VES', 'EUR', 'USDT'].map(curr => (
                  <TouchableOpacity 
                    key={'src_' + curr} 
                    style={[styles.currencyChip, sourceCurrency === curr && styles.currencyChipActive, curr === targetCurrency && styles.currencyChipDisabled]}
                    onPress={() => handleSelectSource(curr)}
                    disabled={curr === targetCurrency}
                  >
                    <Text style={[styles.currencyChipText, sourceCurrency === curr && styles.currencyChipTextActive]}>{curr}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.amountInputRow}>
                <Text style={styles.currencySymbol}>{sourceCurrency === 'VES' ? 'Bs ' : sourceCurrency === 'EUR' ? '€ ' : '$ '}</Text>
                <Text style={styles.mainAmountText}>{formatCurrency(numericAmount, sourceCurrency)}</Text>
              </View>
            </View>

            <TouchableOpacity 
              style={styles.swapButtonCenter} 
              onPress={() => {
                const temp = sourceCurrency;
                setSourceCurrency(targetCurrency);
                setTargetCurrency(temp);
              }}
            >
              <Ionicons name="swap-vertical" size={18} color="#a3e635" />
            </TouchableOpacity>

            <View style={[styles.transferCard, styles.converterTransferCard]}>
              <Text style={styles.cardSectionLabel}>MONEDA DESTINO</Text>
              <View style={styles.chipsRow}>
                {['VES', 'USD', 'EUR', 'USDT'].map(curr => (
                  <TouchableOpacity 
                    key={'tgt_' + curr} 
                    style={[styles.currencyChip, targetCurrency === curr && styles.currencyChipActive, curr === sourceCurrency && styles.currencyChipDisabled]}
                    onPress={() => handleSelectTarget(curr)}
                    disabled={curr === sourceCurrency}
                  >
                    <Text style={[styles.currencyChipText, targetCurrency === curr && styles.currencyChipTextActive]}>{curr}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.amountInputRow}>
                <Text style={styles.currencySymbol}>
                  {targetCurrency === 'VES' ? 'Bs ' : targetCurrency === 'EUR' ? '€ ' : targetCurrency === 'USDT' ? '' : '$ '}
                </Text>
                <Text style={styles.convertedAmountText}>
                  {formatCurrency(convertedValue, targetCurrency)} {targetCurrency === 'USDT' ? 'USDT' : ''}
                </Text>
              </View>
            </View>

            <Text style={styles.rateInfoText}>{getTargetRateText()}</Text>
          </>
        ) : (
          /* ================= MODO COMISIONES ================= */
          <>
            {/* Selector Desplegable Compacto (Estilo fila limpia)[cite: 18] */}
            <View style={styles.transferCard}>
              <Text style={styles.cardSectionLabel}>SELECCIONA BANCO / PASARELA</Text>
              <TouchableOpacity 
                style={styles.dropdownSelector} 
                onPress={() => setIsCommissionModalVisible(true)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.dropdownSelectedTitle} numberOfLines={1}>{selectedCommission.name}</Text>
                  <Text style={styles.dropdownSelectedSub}>{selectedCommission.category}</Text>
                </View>
                <Ionicons name="chevron-down" size={18} color="#a3e635" />
              </TouchableOpacity>
            </View>

            {/* Tarjeta de Resultados Optimizada y Visible de Inmediato[cite: 18] */}
            <View style={styles.transferCard}>
              <Text style={styles.cardSectionLabel}>RESULTADO DE COMISIÓN</Text>
              
              <View style={styles.commissionResultHeader}>
                <Text style={styles.outputLabel}>Monto Base:</Text>
                <Text style={styles.baseAmountSmall}>
                  {selectedCommission.type === 'VES' ? 'Bs ' : '$ '}{formatCurrency(numericAmount, selectedCommission.type)}
                </Text>
              </View>

              <View style={styles.commissionDetailRowCompact}>
                <Text style={styles.commissionSubTextSmall}>
                  Comisión: {selectedCommission.type === 'VES' ? 'Bs ' : '$ '}{formatCurrency(commissionData.fee, selectedCommission.type)}
                </Text>
              </View>

              <View style={styles.totalRowCompact}>
                <Text style={styles.totalLabelCompact}>Total a Debitar:</Text>
                <Text style={styles.totalAmountValueLarge}>
                  {selectedCommission.type === 'VES' ? 'Bs ' : '$ '}{formatCurrency(commissionData.total, selectedCommission.type)}
                </Text>
              </View>
            </View>
          </>
        )}

      </ScreenWrapper>

      {/* Modal Desplegable para seleccionar la comisión[cite: 18] */}
      <ThemedModal
        visible={isCommissionModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsCommissionModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Seleccionar Comisión</Text>
              <TouchableOpacity onPress={() => setIsCommissionModalVisible(false)}>
                <Ionicons name="close" size={22} color="#fff" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={COMMISSION_OPTIONS}
              keyExtractor={(item, index) => index.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={[styles.modalItem, selectedCommission.name === item.name && styles.modalItemActive]}
                  onPress={() => {
                    setSelectedCommission(item);
                    setIsCommissionModalVisible(false);
                  }}
                >
                  <Text style={[styles.modalItemText, selectedCommission.name === item.name && styles.modalItemTextActive]}>
                    {item.name}
                  </Text>
                  <Text style={styles.modalItemCategory}>{item.category}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </ThemedModal>

      {/* Teclado Numérico[cite: 18] */}
      <View style={styles.calculatorPad}>
        <View style={styles.calcRow}>
          <TouchableOpacity style={styles.calcKey} onPress={() => handlePressKey('1')}><Text style={styles.calcKeyText}>1</Text></TouchableOpacity>
          <TouchableOpacity style={styles.calcKey} onPress={() => handlePressKey('2')}><Text style={styles.calcKeyText}>2</Text></TouchableOpacity>
          <TouchableOpacity style={styles.calcKey} onPress={() => handlePressKey('3')}><Text style={styles.calcKeyText}>3</Text></TouchableOpacity>
          <TouchableOpacity style={styles.calcKey} onPress={() => handlePressKey('backspace')} accessibilityRole="button" accessibilityLabel="Borrar último dígito">
            <Ionicons name="backspace-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
        <View style={styles.calcRow}>
          <TouchableOpacity style={styles.calcKey} onPress={() => handlePressKey('4')}><Text style={styles.calcKeyText}>4</Text></TouchableOpacity>
          <TouchableOpacity style={styles.calcKey} onPress={() => handlePressKey('5')}><Text style={styles.calcKeyText}>5</Text></TouchableOpacity>
          <TouchableOpacity style={styles.calcKey} onPress={() => handlePressKey('6')}><Text style={styles.calcKeyText}>6</Text></TouchableOpacity>
          <TouchableOpacity style={styles.calcKey} onPress={() => handlePressKey('C')} accessibilityRole="button" accessibilityLabel="Limpiar monto">
            <Text style={styles.calcKeyYellowText}>C</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.calcRow}>
          <TouchableOpacity style={styles.calcKey} onPress={() => handlePressKey('7')}><Text style={styles.calcKeyText}>7</Text></TouchableOpacity>
          <TouchableOpacity style={styles.calcKey} onPress={() => handlePressKey('8')}><Text style={styles.calcKeyText}>8</Text></TouchableOpacity>
          <TouchableOpacity style={styles.calcKey} onPress={() => handlePressKey('9')}><Text style={styles.calcKeyText}>9</Text></TouchableOpacity>
          <View style={styles.calcKeyEmpty} />
        </View>
        <View style={styles.calcRow}>
          <TouchableOpacity style={styles.calcKey} onPress={() => handlePressKey('.')}><Text style={styles.calcKeyText}>.</Text></TouchableOpacity>
          <TouchableOpacity style={styles.calcKey} onPress={() => handlePressKey('0')}><Text style={styles.calcKeyText}>0</Text></TouchableOpacity>
          <TouchableOpacity style={styles.calcKey} onPress={() => handlePressKey('00')}><Text style={styles.calcKeyText}>00</Text></TouchableOpacity>
          <View style={styles.calcKeyEmpty} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },

  tooltipCard: { backgroundColor: '#222', borderRadius: 14, padding: 12, marginHorizontal: 15, marginBottom: 8, borderWidth: 1, borderColor: '#a3e635' },
  tooltipTitle: { color: '#a3e635', fontSize: 13, fontWeight: 'bold', marginBottom: 4 },
  tooltipText: { color: '#ccc', fontSize: 11, lineHeight: 16, marginBottom: 8 },
  tooltipCloseBtn: { alignSelf: 'flex-end', backgroundColor: '#a3e635', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 8 },
  tooltipCloseText: { color: '#000', fontSize: 10, fontWeight: 'bold' },

  // Pestañas Superiores con mayor separación y centrado[cite: 18]
  tabsContainer: { flexDirection: 'row', backgroundColor: '#1a1a1a', borderRadius: 20, padding: 4, marginHorizontal: 15, marginBottom: 12, marginTop: 4, borderWidth: 1, borderColor: '#222' },
  tabButton: { flex: 1, flexDirection: 'row', paddingVertical: 10, alignItems: 'center', justifyContent: 'center', borderRadius: 16 },
  tabButtonActive: { backgroundColor: '#a3e635' },
  tabText: { color: '#888', fontSize: 13, fontWeight: '600' },
  tabTextActive: { color: '#000', fontWeight: 'bold' },

  scrollContent: { paddingHorizontal: 15, paddingBottom: 5, paddingTop: 10 },
  
  transferCard: { backgroundColor: '#1a1a1a', padding: 12, borderRadius: 16, marginBottom: 6, borderWidth: 1, borderColor: '#222' },
  converterTransferCard: { marginBottom: 0 },
  cardSectionLabel: { color: '#888', fontSize: 10, fontWeight: 'bold', marginBottom: 6 },
  
  chipsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  currencyChip: { backgroundColor: '#222', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 10, flex: 1, marginHorizontal: 2, alignItems: 'center', borderWidth: 1, borderColor: '#333' },
  currencyChipActive: { backgroundColor: '#a3e635', borderColor: '#a3e635' },
  currencyChipDisabled: { opacity: 0.35 },
  currencyChipText: { color: '#aaa', fontSize: 11, fontWeight: 'bold' },
  currencyChipTextActive: { color: '#000' },

  // Selector estilo desplegable limpio para comisiones[cite: 18]
  dropdownSelector: { backgroundColor: '#222', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#333' },
  dropdownSelectedTitle: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  dropdownSelectedSub: { color: '#888', fontSize: 10, marginTop: 2 },

  // Estilos compactos para resultados de comisiones[cite: 18]
  commissionResultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  outputLabel: { color: '#888', fontSize: 11 },
  baseAmountSmall: { color: '#fff', fontSize: 14, fontWeight: '600' },
  commissionDetailRowCompact: { marginBottom: 4 },
  commissionSubTextSmall: { color: '#fbbf24', fontSize: 11, fontWeight: '600' },
  totalRowCompact: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#333', paddingTop: 6, marginTop: 2 },
  totalLabelCompact: { color: '#aaa', fontSize: 12, fontWeight: 'bold' },
  totalAmountValueLarge: { color: '#a3e635', fontSize: 24, fontWeight: 'bold' },

  amountInputRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'flex-end', paddingVertical: 2 },
  currencySymbol: { color: '#aaa', fontSize: 16, fontWeight: 'bold' },
  mainAmountText: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  convertedAmountText: { color: '#a3e635', fontSize: 22, fontWeight: 'bold' },

  swapButtonCenter: { alignSelf: 'center', backgroundColor: '#1a1a1a', width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center', marginVertical: 10, borderWidth: 1, borderColor: '#333' },
  rateInfoText: { color: '#666', fontSize: 11, marginTop: 4, textAlign: 'right', fontStyle: 'italic' },

  // Estilos del Modal Desplegable[cite: 18]
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#1a1a1a', borderRadius: 20, padding: 16, maxHeight: '70%', borderWidth: 1, borderColor: '#333' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, borderBottomWidth: 1, borderBottomColor: '#333', paddingBottom: 8 },
  modalTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  modalItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#222' },
  modalItemActive: { backgroundColor: '#252525', borderRadius: 8, paddingHorizontal: 8 },
  modalItemText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  modalItemCategory: { color: '#888', fontSize: 10, marginTop: 2 },

  calculatorPad: NUMERIC_KEYPAD_STYLES.container,
  calcRow: NUMERIC_KEYPAD_STYLES.row,
  calcKey: NUMERIC_KEYPAD_STYLES.key,
  calcKeyEmpty: NUMERIC_KEYPAD_STYLES.emptyKey,
  calcKeyText: NUMERIC_KEYPAD_STYLES.keyText,
  calcKeyYellowText: NUMERIC_KEYPAD_STYLES.clearKeyText
});