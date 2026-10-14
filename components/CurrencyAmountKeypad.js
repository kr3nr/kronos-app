import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NUMERIC_KEYPAD_STYLES } from './numericKeypadStyles';
import ThemeContent from './ThemeContent';

const CURRENCY_FORMATS = {
  USD: { locale: 'en-US', symbol: '$' },
  USDT: { locale: 'en-US', symbol: '₮' },
  EUR: { locale: 'de-DE', symbol: '€' },
  VES: { locale: 'es-VE', symbol: 'Bs.' },
  GBP: { locale: 'en-GB', symbol: '£' },
  CAD: { locale: 'en-CA', symbol: 'C$' },
  MXN: { locale: 'es-MX', symbol: 'MX$' },
  COP: { locale: 'es-CO', symbol: 'COL$' },
  BRL: { locale: 'pt-BR', symbol: 'R$' },
  ARS: { locale: 'es-AR', symbol: 'AR$' },
  CLP: { locale: 'es-CL', symbol: 'CL$' },
  PEN: { locale: 'es-PE', symbol: 'S/' },
};

const ROWS = [
  ['1', '2', '3', 'backspace'],
  ['4', '5', '6', 'clear'],
  ['7', '8', '9', null],
  ['decimal', '0', '00', null],
];

export const getCurrencyDisplay = (minorUnits, currency = 'USD') => {
  const format = CURRENCY_FORMATS[currency] || CURRENCY_FORMATS.USD;
  const value = Math.max(0, Number.parseInt(minorUnits || '0', 10) || 0) / 100;
  return `${format.symbol} ${value.toLocaleString(format.locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

export default function CurrencyAmountKeypad({
  currency = 'USD',
  minorUnits = '0',
  onChange,
  title = 'Monto',
  hint,
  disabled = false,
}) {
  const decimalSeparator = CURRENCY_FORMATS[currency]?.locale === 'de-DE'
    || ['es-VE', 'es-CO', 'pt-BR', 'es-AR', 'es-CL'].includes(CURRENCY_FORMATS[currency]?.locale)
    ? ','
    : '.';

  const handlePress = (key) => {
    if (disabled) return;
    const current = String(minorUnits || '0').replace(/\D/g, '') || '0';
    if (key === 'clear') {
      onChange('0');
      return;
    }
    if (key === 'backspace') {
      onChange(current.slice(0, -1) || '0');
      return;
    }
    if (key === 'decimal') return;
    const next = key === '00' ? `${current}00` : `${current}${key}`;
    onChange(next.replace(/^0+(?=\d)/, '').slice(0, 14) || '0');
  };

  return (
    <ThemeContent>
    <View style={styles.container}>
      <View style={styles.amountPanel}>
        <View style={styles.amountTitleRow}>
          <Text style={styles.amountTitle}>{title}</Text>
          <Text style={styles.currencyBadge}>{currency}</Text>
        </View>
        <Text style={styles.amountValue} numberOfLines={1} adjustsFontSizeToFit>
          {getCurrencyDisplay(minorUnits, currency)}
        </Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>

      <View style={styles.keypad}>
        {ROWS.map((row, rowIndex) => (
          <View key={rowIndex} style={NUMERIC_KEYPAD_STYLES.row}>
            {row.map((key, keyIndex) => {
              if (!key) {
                return <View key={`empty-${keyIndex}`} style={NUMERIC_KEYPAD_STYLES.emptyKey} />;
              }
              const isClear = key === 'clear';
              const isBackspace = key === 'backspace';
              const label = key === 'decimal' ? decimalSeparator : isClear ? 'C' : key;
              return (
                <TouchableOpacity
                  key={key}
                  style={[NUMERIC_KEYPAD_STYLES.key, disabled && styles.disabledKey]}
                  onPress={() => handlePress(key)}
                  disabled={disabled}
                  accessibilityRole="button"
                  accessibilityLabel={isBackspace ? 'Borrar último dígito' : isClear ? 'Limpiar monto' : label}
                >
                  {isBackspace
                    ? <Ionicons name="backspace-outline" size={19} color="#fff" />
                    : <Text style={isClear ? NUMERIC_KEYPAD_STYLES.clearKeyText : NUMERIC_KEYPAD_STYLES.keyText}>{label}</Text>}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
    </View>
    </ThemeContent>
  );
}

const styles = StyleSheet.create({
  container: { borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(12,13,16,0.92)' },
  amountPanel: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 12 },
  amountTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  amountTitle: { color: '#9ca3af', fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },
  currencyBadge: { color: '#a3e635', fontSize: 10, fontWeight: '800', backgroundColor: 'rgba(163,230,53,0.1)', overflow: 'hidden', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  amountValue: { color: '#fff', fontSize: 30, fontWeight: '800', textAlign: 'right', marginTop: 5 },
  hint: { color: '#7b8190', fontSize: 11, marginTop: 5 },
  keypad: [NUMERIC_KEYPAD_STYLES.container, { paddingTop: 10, backgroundColor: 'transparent', borderTopColor: 'rgba(255,255,255,0.07)' }],
  disabledKey: { opacity: 0.5 },
});
