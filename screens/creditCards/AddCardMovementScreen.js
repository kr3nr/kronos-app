import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, SafeAreaView, Image } from 'react-native';
import { Alert } from '../../services/appAlert';
import { Ionicons } from '@expo/vector-icons';
import CustomHeader from '../../components/CustomHeader';
import { addCardMovement } from '../../services/creditCardService';
import ScreenWrapper from '../../components/ScreenWrapper';
import CurrencyAmountKeypad, { getCurrencyDisplay } from '../../components/CurrencyAmountKeypad';
import CreditCardSurface from '../../components/CreditCardSurface';

export default function AddCardMovementScreen({ navigation, route }) {
  const card = route?.params || {};
  
  const [movementType, setMovementType] = useState('consumo'); // 'consumo' o 'pago'
  const [amountCents, setAmountCents] = useState('0');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (amountCents === '0') {
      Alert.alert('Monto requerido', 'Por favor ingresa el monto del movimiento.');
      return;
    }

    const amountNum = (parseInt(amountCents, 10) || 0) / 100;
    if (isNaN(amountNum) || amountNum <= 0) {
      Alert.alert('Monto inválido', 'Ingresa un valor numérico mayor a cero.');
      return;
    }

    // Si es un consumo, validamos que no exceda el límite disponible
    const availableLimit = Number(card.available_limit) || 0;
    if (movementType === 'consumo' && amountNum > availableLimit) {
      Alert.alert('Límite excedido', 'El monto del consumo supera el límite disponible de la tarjeta.');
      return;
    }

    setSaving(true);

    const movementData = {
      card_id: card.id,
      user_id: card.user_id,
      amount: amountNum,
      currency: card.currency,
      type: movementType,
      description: description.trim() || (movementType === 'consumo' ? 'Consumo de tarjeta' : 'Pago de tarjeta'),
      date: new Date().toISOString(),
    };

    const { error } = await addCardMovement(
      movementData, 
      card.id, 
      card.available_limit, 
      card.credit_limit, 
      movementType, 
      amountNum
    );

    setSaving(false);

    if (error) {
      Alert.alert('Error', 'No se pudo registrar el movimiento.');
    } else {
      Alert.alert('Éxito', movementType === 'consumo' ? 'Consumo registrado correctamente.' : 'Pago registrado correctamente.', [
        { text: 'OK', onPress: () => navigation('creditCardDetail', { ...card, available_limit: movementType === 'consumo' ? availableLimit - amountNum : Math.min(Number(card.credit_limit), availableLimit + amountNum) }) }
      ]);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <CustomHeader 
        title="Registrar Movimiento" 
        onBackPress={() => navigation('creditCardDetail', card)}
      />

      <ScreenWrapper contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <CreditCardSurface color={card.card_color} style={styles.cardSummary}>
          <View style={styles.cardSummaryTop}>
            <View style={styles.cardSummaryIssuer}>
              <View style={styles.cardSummaryIcon}><Ionicons name={card.bank_logo || 'card-outline'} size={17} color="#fff" /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardSummaryBank} numberOfLines={1}>{card.bank_name || 'Tarjeta'}</Text>
                <Text style={styles.cardSummaryName} numberOfLines={1}>{card.card_name || 'Mi tarjeta'}</Text>
              </View>
            </View>
            <Text style={styles.cardSummaryCurrency}>{card.currency || 'USD'}</Text>
          </View>
          <View style={styles.cardSummaryBottom}>
            <Text style={styles.cardSummaryDigits}>••••  {card.last_four_digits || '----'}</Text>
            <Image source={require('../../assets/name-app.png')} style={styles.cardBrandLogo} resizeMode="contain" />
          </View>
        </CreditCardSurface>

        <View style={styles.typeSelectorRow}>
          <TouchableOpacity 
            style={[styles.typeButton, movementType === 'consumo' && styles.typeButtonConsumoActive]}
            onPress={() => setMovementType('consumo')}
          >
            <Ionicons name="arrow-down-outline" size={18} color={movementType === 'consumo' ? '#fff' : '#888'} />
            <Text style={[styles.typeButtonText, movementType === 'consumo' && styles.typeButtonTextActive]}>Consumo</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.typeButton, movementType === 'pago' && styles.typeButtonPagoActive]}
            onPress={() => setMovementType('pago')}
          >
            <Ionicons name="arrow-up-outline" size={18} color={movementType === 'pago' ? '#000' : '#888'} />
            <Text style={[styles.typeButtonText, movementType === 'pago' && styles.typeButtonPagoTextActive]}>Pago / Abono</Text>
          </TouchableOpacity>
        </View>

        <CurrencyAmountKeypad
          title={movementType === 'consumo' ? 'Monto del consumo' : 'Monto del pago'}
          currency={card.currency || 'USD'}
          minorUnits={amountCents}
          onChange={setAmountCents}
          disabled={saving}
          hint={movementType === 'consumo' ? `Disponible: ${getCurrencyDisplay(Math.round(Number(card.available_limit || 0) * 100), card.currency || 'USD')}` : 'El abono aumentará el disponible de la tarjeta.'}
        />

        {/* Descripción / Comercio */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Descripción o Comercio</Text>
          <TextInput
            style={styles.input}
            placeholder={movementType === 'consumo' ? 'Ej. Supermercado, Farmacia...' : 'Ej. Pago parcial desde cuenta'}
            placeholderTextColor="#666"
            value={description}
            onChangeText={setDescription}
          />
        </View>

        {/* Botón Guardar */}
        <TouchableOpacity 
          style={[styles.saveButton, saving && { opacity: 0.7 }]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveButtonText}>{saving ? 'Guardando...' : 'Registrar Movimiento'}</Text>
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
  scrollContent: { padding: 18, paddingBottom: 50 },
  cardSummary: { padding: 16, marginBottom: 18, minHeight: 108 },
  cardSummaryTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  cardSummaryIssuer: { flex: 1, flexDirection: 'row', alignItems: 'center', marginRight: 8 },
  cardSummaryIcon: { width: 32, height: 32, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center', marginRight: 9 },
  cardSummaryBank: { color: '#fff', fontSize: 12, fontWeight: '700' },
  cardSummaryName: { color: 'rgba(255,255,255,0.72)', fontSize: 11, marginTop: 2 },
  cardSummaryCurrency: { color: '#fff', fontSize: 10, fontWeight: '800', backgroundColor: 'rgba(255,255,255,0.16)', overflow: 'hidden', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 },
  cardSummaryBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 },
  cardSummaryDigits: { color: '#fff', fontSize: 13, fontWeight: '700', letterSpacing: 1.1 },
  cardBrandLogo: { width: 70, height: 18, opacity: 0.92 },
  typeSelectorRow: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 20,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 10,
  },
  typeButtonConsumoActive: {
    backgroundColor: '#f87171',
  },
  typeButtonPagoActive: {
    backgroundColor: '#a3e635',
  },
  typeButtonText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  typeButtonTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  typeButtonPagoTextActive: {
    color: '#000',
    fontWeight: 'bold',
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
  inputGroup: { marginTop: 16, padding: 14, borderRadius: 16, backgroundColor: '#111215', borderWidth: 1, borderColor: '#23252a' },
  saveButton: {
    backgroundColor: '#a3e635',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
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