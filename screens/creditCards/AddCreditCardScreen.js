import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, Alert, SafeAreaView, Switch, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CustomHeader from '../../components/CustomHeader';
import { addCreditCard, updateCreditCard, BANKS_CATALOG } from '../../services/creditCardService';
import { logger } from '../../services/logger';
import ScreenWrapper from '../../components/ScreenWrapper';

// Colores disponibles para personalizar la tarjeta con excelente contraste
const CARD_COLORS = [
  { id: 'dark', label: 'Oscuro Clásico', color: '#161616' },
  { id: 'blue', label: 'Azul Elegante', color: '#1e293b' },
  { id: 'green', label: 'Verde Financiero', color: '#064e3b' },
  { id: 'purple', label: 'Púrpura Premium', color: '#3b0764' },
  { id: 'red', label: 'Rojo Ejecutivo', color: '#7f1d1d' },
];

// Opciones de Divisas disponibles
const CURRENCIES = [
  { id: 'USD', symbol: '$', label: 'Dólares (USD)' },
  { id: 'VES', symbol: 'Bs.', label: 'Bolívares (VES)' },
  { id: 'EUR', symbol: '€', label: 'Euros (EUR)' },
  { id: 'USDT', symbol: '₮', label: 'Tether (USDT)' },
];

export default function AddCreditCardScreen({ navigation, route, userId }) {
  const cardToEdit = route?.params;
  const isEditing = !!cardToEdit;

  const [cardName, setCardName] = useState(isEditing ? cardToEdit.card_name || '' : '');
  
  // Tipo de tarjeta: 'credit' (con límite y fechas) o 'prepaid' (saldo recargable en divisa)
  const [cardType, setCardType] = useState(isEditing ? (cardToEdit.closing_date ? 'credit' : 'prepaid') : 'credit');

  // Banco Emisor o Plataforma
  const initialBank = isEditing 
    ? BANKS_CATALOG.find(b => b.name === cardToEdit.bank_name) || BANKS_CATALOG[0]
    : BANKS_CATALOG[0];
  const [selectedBank, setSelectedBank] = useState(initialBank);

  // Divisa independiente
  const initialCurrency = isEditing ? cardToEdit.currency || 'USD' : 'USD';
  const [selectedCurrency, setSelectedCurrency] = useState(initialCurrency);

  const [lastFourDigits, setLastFourDigits] = useState(isEditing ? cardToEdit.last_four_digits || '' : '');
  const [creditLimit, setCreditLimit] = useState(isEditing ? String(cardToEdit.credit_limit || '') : '');
  const [closingDate, setClosingDate] = useState(isEditing ? String(cardToEdit.closing_date || '') : '15');
  const [dueDate, setDueDate] = useState(isEditing ? String(cardToEdit.due_date || '') : '25');
  const [minPaymentPercentage, setMinPaymentPercentage] = useState(
    isEditing ? String(cardToEdit.minimum_payment_percentage || '10') : '10'
  );
  const [isExcludedFromTotal, setIsExcludedFromTotal] = useState(isEditing ? cardToEdit.is_excluded_from_total ?? true : true);
  
  const initialColor = CARD_COLORS.find(c => c.color === cardToEdit?.card_color) || CARD_COLORS[0];
  const [selectedColor, setSelectedColor] = useState(initialColor);
  const [selectedLogo, setSelectedLogo] = useState(isEditing ? cardToEdit.bank_logo || 'card' : 'card');

  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!cardName.trim() || !lastFourDigits.trim() || !creditLimit.trim()) {
      Alert.alert('Campos incompletos', 'Por favor llena los campos obligatorios (Nombre, Últimos 4 y Límite/Saldo).');
      return;
    }

    if (lastFourDigits.length !== 4) {
      Alert.alert('Dígitos inválidos', 'Ingresa exactamente los últimos 4 dígitos de la tarjeta.');
      return;
    }

    const limitNum = parseFloat(creditLimit);
    if (isNaN(limitNum) || limitNum < 0) {
      Alert.alert('Monto inválido', 'Ingresa un límite o saldo inicial válido.');
      return;
    }

    setSaving(true);

    const isPrepaid = cardType === 'prepaid';

    const cardData = {
      user_id: userId,
      card_name: cardName.trim(),
      bank_name: selectedBank.name,
      last_four_digits: lastFourDigits.trim(),
      currency: selectedCurrency,
      credit_limit: limitNum,
      closing_date: isPrepaid ? null : (parseInt(closingDate, 10) || 1),
      due_date: isPrepaid ? null : (parseInt(dueDate, 10) || 1),
      minimum_payment_percentage: isPrepaid ? 100.00 : (parseFloat(minPaymentPercentage) || 10.00),
      is_excluded_from_total: isExcludedFromTotal,
      card_color: selectedColor.color,
      bank_logo: selectedLogo,
    };

    let result;
    if (isEditing) {
      logger.log('Actualizando tarjeta ID:', cardToEdit.id);
      result = await updateCreditCard(cardToEdit.id, cardData);
    } else {
      cardData.available_limit = limitNum;
      logger.log('Agregando nueva tarjeta:', cardData);
      result = await addCreditCard(cardData);
    }

    setSaving(false);

    if (result.error) {
      logger.error('Error al guardar tarjeta:', result.error);
      Alert.alert('Error', typeof result.error === 'string' ? result.error : JSON.stringify(result.error));
    } else {
      Alert.alert('Éxito', isEditing ? 'Tarjeta actualizada correctamente.' : 'Tarjeta agregada correctamente.', [
        { text: 'OK', onPress: () => navigation('creditCards') }
      ]);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <CustomHeader 
        title={isEditing ? "Editar Tarjeta" : "Nueva Tarjeta"} 
        onBackPress={() => navigation('creditCards')}
      />

      <ScreenWrapper contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Selector de Tipo de Tarjeta (Crédito vs Prepagada) */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Tipo de Tarjeta *</Text>
          <View style={styles.typeSelectorRow}>
            <TouchableOpacity
              style={[styles.typeCardOption, cardType === 'credit' && styles.typeCardOptionActive]}
              onPress={() => setCardType('credit')}
            >
              <Ionicons name="card-outline" size={20} color={cardType === 'credit' ? '#000' : '#a3e635'} />
              <Text style={[styles.typeCardText, cardType === 'credit' && styles.typeCardTextActive]}>
                Crédito Bancario
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.typeCardOption, cardType === 'prepaid' && styles.typeCardOptionActive]}
              onPress={() => setCardType('prepaid')}
            >
              <Ionicons name="wallet-outline" size={20} color={cardType === 'prepaid' ? '#000' : '#a3e635'} />
              <Text style={[styles.typeCardText, cardType === 'prepaid' && styles.typeCardTextActive]}>
                Prepagada / Divisa
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Nombre descriptivo */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Nombre de la Tarjeta *</Text>
          <TextInput
            style={styles.input}
            placeholder={cardType === 'prepaid' ? "Ej. Zinli Personal / Wally USD" : "Ej. Visa Platinum Banesco"}
            placeholderTextColor="#666"
            value={cardName}
            onChangeText={setCardName}
          />
        </View>

        {/* Selector de Banco / Emisor */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Banco o Plataforma Emisora *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.banksScroll}>
            {BANKS_CATALOG.map((bank) => {
              const isSelected = selectedBank.id === bank.id;
              return (
                <TouchableOpacity
                  key={bank.id}
                  style={[styles.bankChip, isSelected && styles.bankChipSelected]}
                  onPress={() => setSelectedBank(bank)}
                >
                  <Text style={[styles.bankChipText, isSelected && styles.bankChipTextSelected]}>
                    {bank.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Selector de Divisa */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Divisa Principal *</Text>
          <View style={styles.currencyRow}>
            {CURRENCIES.map((curr) => {
              const isSelected = selectedCurrency === curr.id;
              return (
                <TouchableOpacity
                  key={curr.id}
                  style={[styles.currencyChip, isSelected && styles.currencyChipSelected]}
                  onPress={() => setSelectedCurrency(curr.id)}
                >
                  <Text style={[styles.currencyText, isSelected && styles.currencyTextSelected]}>
                    {curr.symbol} {curr.id}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Personalización de Color de Fondo */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Color de Fondo</Text>
          <View style={styles.colorsRow}>
            {CARD_COLORS.map((item) => {
              const isSelected = selectedColor.id === item.id;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.colorCircle, { backgroundColor: item.color }, isSelected && styles.colorCircleSelected]}
                  onPress={() => setSelectedColor(item)}
                >
                  {isSelected && <Ionicons name="checkmark" size={16} color="#fff" />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Selección de Icono Representativo */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Icono de la Tarjeta</Text>
          <View style={styles.iconsRow}>
            {['card', 'business', 'shield-checkmark', 'wallet', 'flash'].map((iconName) => {
              const isSelected = selectedLogo === iconName;
              return (
                <TouchableOpacity
                  key={iconName}
                  style={[styles.iconChip, isSelected && styles.iconChipSelected]}
                  onPress={() => setSelectedLogo(iconName)}
                >
                  <Ionicons name={iconName} size={20} color={isSelected ? '#000' : '#a3e635'} />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Últimos 4 dígitos */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Últimos 4 Dígitos *</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej. 4589"
            placeholderTextColor="#666"
            keyboardType="numeric"
            maxLength={4}
            value={lastFourDigits}
            onChangeText={setLastFourDigits}
          />
        </View>

        {/* Límite de Crédito o Saldo Inicial */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            {cardType === 'prepaid' ? `Saldo Inicial (${selectedCurrency}) *` : `Límite de Crédito (${selectedCurrency}) *`}
          </Text>
          <TextInput
            style={styles.input}
            placeholder="0.00"
            placeholderTextColor="#666"
            keyboardType="numeric"
            value={creditLimit}
            onChangeText={setCreditLimit}
          />
          <Text style={styles.helperText}>
            {cardType === 'prepaid' 
              ? 'Las tarjetas prepagadas no generan deuda; se recargan con saldo disponible.' 
              : 'Límite total asignado por la entidad bancaria.'}
          </Text>
        </View>

        {/* Fechas Clave (Solo si es Tarjeta de Crédito) */}
        {cardType === 'credit' && (
          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
              <Text style={styles.label}>Día de Corte *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej. 15"
                placeholderTextColor="#666"
                keyboardType="numeric"
                maxLength={2}
                value={closingDate}
                onChangeText={setClosingDate}
              />
            </View>

            <View style={[styles.inputGroup, { flex: 1, marginLeft: 10 }]}>
              <Text style={styles.label}>Día de Pago *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej. 25"
                placeholderTextColor="#666"
                keyboardType="numeric"
                maxLength={2}
                value={dueDate}
                onChangeText={setDueDate}
              />
            </View>
          </View>
        )}

        {/* Regla de Oro: Excluir del Balance Total */}
        <View style={styles.switchRow}>
          <View style={{ flex: 1, marginRight: 15 }}>
            <Text style={styles.label}>Excluir del Balance Total</Text>
            <Text style={styles.helperText}>Evita que afecte el balance de tus cuentas principales.</Text>
          </View>
          <Switch
            value={isExcludedFromTotal}
            onValueChange={setIsExcludedFromTotal}
            trackColor={{ false: '#333', true: '#a3e635' }}
            thumbColor="#fff"
          />
        </View>

        {/* Botón Guardar */}
        <TouchableOpacity 
          style={[styles.saveButton, saving && { opacity: 0.7 }]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveButtonText}>{saving ? 'Guardando...' : (isEditing ? 'Actualizar Tarjeta' : 'Guardar Tarjeta')}</Text>
        </TouchableOpacity>

      </ScreenWrapper>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 50,
  },
  inputGroup: {
    marginBottom: 18,
  },
  label: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 12,
    color: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 15,
  },
  typeSelectorRow: {
    flexDirection: 'row',
    gap: 10,
  },
  typeCardOption: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  typeCardOptionActive: {
    backgroundColor: '#a3e635',
    borderColor: '#a3e635',
  },
  typeCardText: {
    color: '#aaa',
    fontSize: 13,
    fontWeight: '600',
  },
  typeCardTextActive: {
    color: '#000',
    fontWeight: 'bold',
  },
  banksScroll: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  bankChip: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    marginRight: 10,
  },
  bankChipSelected: {
    backgroundColor: '#a3e635',
    borderColor: '#a3e635',
  },
  bankChipText: {
    color: '#aaa',
    fontSize: 13,
    fontWeight: '500',
  },
  bankChipTextSelected: {
    color: '#000',
    fontWeight: 'bold',
  },
  currencyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  currencyChip: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  currencyChipSelected: {
    backgroundColor: '#a3e635',
    borderColor: '#a3e635',
  },
  currencyText: {
    color: '#aaa',
    fontSize: 12,
    fontWeight: '600',
  },
  currencyTextSelected: {
    color: '#000',
    fontWeight: 'bold',
  },
  colorsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  colorCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorCircleSelected: {
    borderColor: '#a3e635',
    transform: [{ scale: 1.1 }],
  },
  iconsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  iconChip: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconChipSelected: {
    backgroundColor: '#a3e635',
    borderColor: '#a3e635',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  helperText: {
    color: '#888',
    fontSize: 11,
    marginTop: 5,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1a1a1a',
    padding: 15,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 24,
  },
  saveButton: {
    backgroundColor: '#a3e635',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 4,
  },
  saveButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
});