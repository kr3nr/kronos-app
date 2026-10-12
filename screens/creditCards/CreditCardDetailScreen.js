import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ActivityIndicator, SafeAreaView, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CustomHeader from '../../components/CustomHeader';
import { updateCreditCard, BANKS_CATALOG } from '../../services/creditCardService';
import { supabase } from '../../services/supabase';
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

export default function CreditCardDetailScreen({ navigation, route }) {
  const routeParams = route?.params;
  const cardId = routeParams?.id || routeParams?.card_id || routeParams?.card?.id;

  const [card, setCard] = useState(routeParams?.card || routeParams || {});
  const [loading, setLoading] = useState(true);

  // Estados para el modo de edición completa (incluyendo diseño visual y banco)
  const [isEditing, setIsEditing] = useState(false);
  const [editableCardName, setEditableCardName] = useState('');
  const [editableLastFour, setEditableLastFour] = useState('');
  const [editableClosingDate, setEditableClosingDate] = useState('');
  const [editableDueDate, setEditableDueDate] = useState('');
  const [rawDebt, setRawDebt] = useState('');
  const [rawAvailable, setRawAvailable] = useState('');
  const [selectedBank, setSelectedBank] = useState('');
  
  // Nuevos estados de personalización visual para edición
  const [selectedColor, setSelectedColor] = useState(CARD_COLORS[0]);
  const [selectedLogo, setSelectedLogo] = useState('card');
  const [saving, setSaving] = useState(false);

  const loadCardFromSupabase = useCallback(async () => {
    if (!cardId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('credit_cards')
        .select('*')
        .eq('id', cardId)
        .single();

      if (!error && data) {
        setCard(data);
      }
    } catch (err) {
      logger.error('Excepción al cargar tarjeta:', err);
    } finally {
      setLoading(false);
    }
  }, [cardId]);

  useEffect(() => {
    if (cardId) {
      loadCardFromSupabase();
    } else {
      setLoading(false);
    }
  }, [cardId, loadCardFromSupabase]);

  const creditLimit = Number(card.credit_limit) || 0;
  const availableLimit = Number(card.available_limit) || 0;
  const usedAmount = creditLimit - availableLimit;
  
  const minPaymentPercentage = Number(card.minimum_payment_percentage) || 10;
  
  const monthlyInterestRate = 0.60 / 12;
  const estimatedMonthlyInterest = usedAmount > 0 ? usedAmount * monthlyInterestRate : 0;
  const suggestedMinPayment = (usedAmount * (minPaymentPercentage / 100)) + estimatedMonthlyInterest;

  const isUSD = card.currency === 'USD';
  const currencySymbol = isUSD ? '$' : 'Bs.';

  // Planes de pago inteligentes
  const plan1Month = usedAmount;
  const plan3Months = usedAmount > 0 ? usedAmount / 3 : 0;
  const plan6Months = usedAmount > 0 ? usedAmount / 6 : 0;

  const formatAsCurrency = (val) => {
    const cleaned = val.replace(/\D/g, '');
    if (!cleaned) return isUSD ? '$ 0.00' : 'Bs. 0,00';

    const numericValue = parseInt(cleaned, 10) / 100;
    
    if (isUSD) {
      return `$ ${numericValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    } else {
      return `Bs. ${numericValue.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
  };

  const handleDebtChange = (text) => {
    setRawDebt(text.replace(/\D/g, ''));
  };

  const handleAvailableChange = (text) => {
    setRawAvailable(text.replace(/\D/g, ''));
  };

  const handleStartEdit = () => {
    setEditableCardName(card.card_name || '');
    setEditableLastFour(card.last_four_digits || '');
    setEditableClosingDate(card.closing_date ? card.closing_date.toString() : '');
    setEditableDueDate(card.due_date ? card.due_date.toString() : '');
    setRawDebt(Math.round(usedAmount * 100).toString());
    setRawAvailable(Math.round(availableLimit * 100).toString());
    setSelectedBank(card.bank_name || (BANKS_CATALOG[0]?.name ?? ''));
    
    const currentThemeColor = CARD_COLORS.find(c => c.color === card.card_color) || CARD_COLORS[0];
    setSelectedColor(currentThemeColor);
    setSelectedLogo(card.bank_logo || 'card');

    setIsEditing(true);
  };

  const handleSaveAll = async () => {
    if (!cardId) {
      Alert.alert('Error', 'No se pudo identificar el ID de la tarjeta.');
      return;
    }

    if (editableLastFour.length !== 4) {
      Alert.alert('Dígitos inválidos', 'Los últimos dígitos deben ser exactamente 4.');
      return;
    }

    try {
      setSaving(true);
      const newDebt = rawDebt ? parseInt(rawDebt, 10) / 100 : 0;
      const newAvailable = rawAvailable ? parseInt(rawAvailable, 10) / 100 : 0;
      
      const updatedData = {
        card_name: editableCardName.trim(),
        bank_name: selectedBank.trim(),
        last_four_digits: editableLastFour.trim(),
        closing_date: parseInt(editableClosingDate, 10) || null,
        due_date: parseInt(editableDueDate, 10) || null,
        available_limit: newAvailable,
        credit_limit: newDebt + newAvailable,
        card_color: selectedColor.color,
        bank_logo: selectedLogo,
      };

      const { error } = await updateCreditCard(cardId, updatedData);
      
      if (error) {
        Alert.alert('Error', 'No se pudieron actualizar los datos: ' + (error.message || JSON.stringify(error)));
      } else {
        setCard(prev => ({
          ...prev,
          ...updatedData
        }));
        setIsEditing(false);
        Alert.alert('Éxito', 'Tarjeta actualizada correctamente.');
        await loadCardFromSupabase();
      }
    } catch (err) {
      logger.error('Error al guardar tarjeta:', err);
      Alert.alert('Error', 'Ocurrió un error inesperado al guardar.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCard = () => {
    Alert.alert(
      'Eliminar Tarjeta',
      '¿Estás seguro de que deseas eliminar esta tarjeta de crédito? Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Eliminar', 
          style: 'destructive', 
          onPress: async () => {
            try {
              const { error } = await supabase.from('credit_cards').delete().eq('id', cardId);
              if (error) {
                Alert.alert('Error', 'No se pudo eliminar la tarjeta.');
              } else {
                Alert.alert('Eliminada', 'La tarjeta ha sido eliminada correctamente.');
                navigation('creditCards');
              }
            } catch (err) {
              logger.error('Error al eliminar tarjeta:', err);
            }
          }
        }
      ]
    );
  };

  const handleOpenHeaderMenu = () => {
    Alert.alert(
      'Opciones de Tarjeta',
      'Selecciona una opción:',
      [
        { text: 'Ayuda', onPress: () => Alert.alert('Ayuda', 'Aquí puedes gestionar los límites, fechas de corte y pagos de tu tarjeta de crédito para mantener tus finanzas al día.') },
        { text: 'Eliminar tarjeta', onPress: handleDeleteCard, style: 'destructive' },
        { text: 'Cancelar', style: 'cancel' }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <CustomHeader 
        title={card.card_name || 'Detalle de Tarjeta'} 
        onBackPress={() => navigation('creditCards')}
        rightComponent={
          <TouchableOpacity onPress={handleOpenHeaderMenu} style={styles.headerMenuButton}>
            <Ionicons name="ellipsis-vertical" size={18} color="#fff" />
          </TouchableOpacity>
        }
      />

      <ScreenWrapper contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Tarjeta Visual Estilizada con Alto Contraste */}
        <View style={[styles.creditCardVisual, { backgroundColor: isEditing ? selectedColor.color : (card.card_color || '#161616') }]}>
          <View style={styles.cardVisualHeader}>
            <View style={styles.bankHeaderLeft}>
              <Ionicons name={isEditing ? selectedLogo : (card.bank_logo || 'card')} size={18} color="#a3e635" />
              <Text style={styles.bankHeaderName} numberOfLines={1}>{isEditing ? (selectedBank || 'Selecciona Banco') : (card.bank_name || 'Banco Emisor')}</Text>
            </View>
            
            {!isEditing && (
              <TouchableOpacity onPress={handleStartEdit} style={styles.cardEditBadge}>
                <Text style={styles.editText}>Editar Tarjeta</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.cardChipContainer}>
            <View style={styles.cardChipSim}>
              <View style={styles.chipLines} />
            </View>
            <Ionicons name="wifi-outline" size={20} color="#a3e635" style={{ transform: [{ rotate: '90deg' }] }} />
          </View>

          <View style={styles.cardVisualBody}>
            {isEditing ? (
              <View style={styles.editRowGroup}>
                <View style={{ flex: 2, marginRight: 8 }}>
                  <Text style={styles.inputLabelSmall}>Nombre de Tarjeta</Text>
                  <TextInput
                    style={styles.inputEditSmall}
                    value={editableCardName}
                    onChangeText={setEditableCardName}
                    placeholder="Nombre"
                    placeholderTextColor="#aaa"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabelSmall}>Últimos 4</Text>
                  <TextInput
                    style={styles.inputEditSmall}
                    keyboardType="numeric"
                    maxLength={4}
                    value={editableLastFour}
                    onChangeText={setEditableLastFour}
                    placeholder="0000"
                    placeholderTextColor="#aaa"
                  />
                </View>
              </View>
            ) : (
              <View style={styles.cardInfoRow}>
                <Text style={styles.cardVisualName} numberOfLines={1}>{card.card_name || 'Mi Tarjeta'}</Text>
                <Text style={styles.cardVisualDigits}>•••• {card.last_four_digits || '----'}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Si estamos editando, mostramos el selector de banco y personalización visual */}
        {isEditing && (
          <View style={styles.summaryCard}>
            <Text style={styles.sectionSubTitle}>Seleccionar Banco Emisor</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
              {BANKS_CATALOG.map((bank) => {
                const isSelected = selectedBank === bank.name;
                return (
                  <TouchableOpacity
                    key={bank.id || bank.name}
                    style={[styles.bankChip, isSelected && styles.bankChipSelected]}
                    onPress={() => setSelectedBank(bank.name)}
                  >
                    <Text style={[styles.bankChipText, isSelected && styles.bankChipTextSelected]}>{bank.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Text style={styles.sectionSubTitle}>Personalización Visual</Text>
            
            <Text style={styles.labelSub}>Color de Fondo</Text>
            <View style={styles.colorsRow}>
              {CARD_COLORS.map((item) => {
                const isSelected = selectedColor.id === item.id;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.colorCircle, { backgroundColor: item.color }, isSelected && styles.colorCircleSelected]}
                    onPress={() => setSelectedColor(item)}
                  >
                    {isSelected && <Ionicons name="checkmark" size={14} color="#fff" />}
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.labelSub, { marginTop: 14 }]}>Icono / Símbolo</Text>
            <View style={styles.iconsRow}>
              {['card', 'business', 'shield-checkmark', 'wallet', 'flash'].map((iconName) => {
                const isSelected = selectedLogo === iconName;
                return (
                  <TouchableOpacity
                    key={iconName}
                    style={[styles.iconChip, isSelected && styles.iconChipSelected]}
                    onPress={() => setSelectedLogo(iconName)}
                  >
                    <Ionicons name={iconName} size={18} color={isSelected ? '#000' : '#a3e635'} />
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Tarjeta Resumen de Saldos y Límites */}
        <View style={styles.summaryCard}>
          <Text style={styles.sectionSubTitle}>Saldos y Límites</Text>

          <View style={styles.amountsGrid}>
            <View style={{ flex: 1, marginRight: 6 }}>
              <Text style={styles.label}>Disponible</Text>
              {isEditing ? (
                <TextInput
                  style={styles.inputEdit}
                  keyboardType="numeric"
                  value={formatAsCurrency(rawAvailable)}
                  onChangeText={handleAvailableChange}
                  placeholder={isUSD ? '$ 0.00' : 'Bs. 0,00'}
                  placeholderTextColor="#888"
                />
              ) : (
                <Text style={styles.availableValue} numberOfLines={1} adjustsFontSizeToFit>
                  {currencySymbol} {availableLimit.toLocaleString(isUSD ? 'en-US' : 'es-VE', { minimumFractionDigits: 2 })}
                </Text>
              )}
            </View>

            <View style={{ flex: 1, alignItems: 'flex-end', marginLeft: 6 }}>
              <Text style={styles.label}>Deuda Actual</Text>
              {isEditing ? (
                <TextInput
                  style={[styles.inputEdit, { textAlign: 'right' }]}
                  keyboardType="numeric"
                  value={formatAsCurrency(rawDebt)}
                  onChangeText={handleDebtChange}
                  placeholder={isUSD ? '$ 0.00' : 'Bs. 0,00'}
                  placeholderTextColor="#888"
                />
              ) : (
                <Text style={styles.debtValue} numberOfLines={1} adjustsFontSizeToFit>
                  {currencySymbol} {usedAmount.toLocaleString(isUSD ? 'en-US' : 'es-VE', { minimumFractionDigits: 2 })}
                </Text>
              )}
            </View>
          </View>

          {/* Bloque de Pago Mínimo Sugerido */}
          <View style={styles.minPaymentBox}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.minPaymentLabel}>Pago mínimo sugerido (+ intereses)</Text>
              <Text style={styles.minPaymentAmount} numberOfLines={1} adjustsFontSizeToFit>
                {currencySymbol} {suggestedMinPayment.toLocaleString(isUSD ? 'en-US' : 'es-VE', { minimumFractionDigits: 2 })}
              </Text>
            </View>
            <Ionicons name="alert-circle-outline" size={24} color="#fbbf24" />
          </View>

          {/* Fechas Clave de Corte y Pago */}
          <View style={styles.datesContainer}>
            <View style={styles.dateBadge}>
              <View style={styles.dateBadgeHeader}>
                <Ionicons name="calendar-outline" size={13} color="#a3e635" style={{ marginRight: 4 }} />
                <Text style={styles.dateLabel} numberOfLines={1}>Corte</Text>
              </View>
              {isEditing ? (
                <TextInput
                  style={styles.inputDateEdit}
                  keyboardType="numeric"
                  maxLength={2}
                  value={editableClosingDate}
                  onChangeText={setEditableClosingDate}
                  placeholder="Día"
                  placeholderTextColor="#888"
                />
              ) : (
                <Text style={styles.dateValue} numberOfLines={1}>Día {card.closing_date || 'N/A'}</Text>
              )}
            </View>

            <View style={styles.dateBadge}>
              <View style={styles.dateBadgeHeader}>
                <Ionicons name="time-outline" size={13} color="#fbbf24" style={{ marginRight: 4 }} />
                <Text style={styles.dateLabel} numberOfLines={1}>Pago</Text>
              </View>
              {isEditing ? (
                <TextInput
                  style={styles.inputDateEdit}
                  keyboardType="numeric"
                  maxLength={2}
                  value={editableDueDate}
                  onChangeText={setEditableDueDate}
                  placeholder="Día"
                  placeholderTextColor="#888"
                />
              ) : (
                <Text style={styles.dateValue} numberOfLines={1}>Día {card.due_date || 'N/A'}</Text>
              )}
            </View>
          </View>
        </View>

        {/* Sección Inteligente: Planes de Pago (Omitida en modo edición) */}
        {!isEditing && (
          <View style={styles.plansCard}>
            <View style={styles.plansHeaderRow}>
              <Ionicons name="flash-outline" size={16} color="#a3e635" style={{ marginRight: 6 }} />
              <Text style={styles.sectionTitle}>Planes de Pago Inteligentes</Text>
            </View>
            <Text style={styles.plansSubDescription}>
              Estrategia sugerida para liquidar tu deuda minimizando cargos financieros:
            </Text>

            <View style={styles.planOptionItem}>
              <View style={styles.planItemLeft}>
                <View style={styles.planTitleRow}>
                  <Text style={styles.planOptionTitle}>Pago Total (1 Mes)</Text>
                  <View style={styles.tagCero}>
                    <Text style={styles.tagCeroText}>0% Intereses</Text>
                  </View>
                </View>
                <Text style={styles.planOptionDesc}>Liquida antes del corte.</Text>
              </View>
              <Text style={styles.planOptionAmount} numberOfLines={1} adjustsFontSizeToFit>
                {currencySymbol} {plan1Month.toLocaleString(isUSD ? 'en-US' : 'es-VE', { minimumFractionDigits: 2 })}
              </Text>
            </View>

            <View style={styles.planOptionItem}>
              <View style={styles.planItemLeft}>
                <Text style={styles.planOptionTitle}>Plan Cómodo (3 Meses)</Text>
                <Text style={styles.planOptionDesc}>Cuotas estables mensuales.</Text>
              </View>
              <Text style={[styles.planOptionAmount, { color: '#fbbf24' }]} numberOfLines={1} adjustsFontSizeToFit>
                {currencySymbol} {plan3Months.toLocaleString(isUSD ? 'en-US' : 'es-VE', { minimumFractionDigits: 2 })} <Text style={styles.perMonthText}>/mes</Text>
              </Text>
            </View>

            <View style={[styles.planOptionItem, { borderBottomWidth: 0 }]}>
              <View style={styles.planItemLeft}>
                <Text style={styles.planOptionTitle}>Plan Holgado (6 Meses)</Text>
                <Text style={styles.planOptionDesc}>Cuotas reducidas flexibles.</Text>
              </View>
              <Text style={[styles.planOptionAmount, { color: '#a3e635' }]} numberOfLines={1} adjustsFontSizeToFit>
                {currencySymbol} {plan6Months.toLocaleString(isUSD ? 'en-US' : 'es-VE', { minimumFractionDigits: 2 })} <Text style={styles.perMonthText}>/mes</Text>
              </Text>
            </View>
          </View>
        )}

        {/* Botones de Guardar / Cancelar al final del todo (Solo en modo edición) */}
        {isEditing && (
          <View style={styles.bottomEditActions}>
            <TouchableOpacity 
              style={styles.saveButton}
              onPress={handleSaveAll}
              activeOpacity={0.85}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={20} color="#000" style={{ marginRight: 6 }} />
                  <Text style={styles.saveButtonText}>Guardar Cambios</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={() => setIsEditing(false)}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        )}

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
    padding: 16,
    paddingBottom: 40,
  },
  headerMenuButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  creditCardVisual: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#444',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  cardVisualHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  bankHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  bankHeaderName: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
    marginLeft: 6,
    flex: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  cardEditBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  editText: {
    color: '#a3e635',
    fontSize: 11,
    fontWeight: 'bold',
  },
  cardChipContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardChipSim: {
    width: 38,
    height: 26,
    backgroundColor: '#fbbf24',
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.95,
  },
  chipLines: {
    width: '80%',
    height: '80%',
    borderWidth: 1,
    borderColor: '#d97706',
    borderRadius: 3,
  },
  cardVisualBody: {
    marginTop: 2,
  },
  cardInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  cardVisualName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  cardVisualDigits: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 1.5,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  editRowGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputLabelSmall: {
    color: '#ddd',
    fontSize: 10,
    marginBottom: 3,
    fontWeight: '600',
  },
  inputEditSmall: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderWidth: 1,
    borderColor: '#a3e635',
    borderRadius: 8,
    color: '#fff',
    fontSize: 13,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  summaryCard: {
    backgroundColor: '#161616',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 14,
  },
  sectionSubTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  labelSub: {
    color: '#888',
    fontSize: 12,
    marginBottom: 6,
  },
  bankChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#333',
    marginRight: 8,
  },
  bankChipSelected: {
    backgroundColor: '#a3e635',
    borderColor: '#a3e635',
  },
  bankChipText: {
    color: '#888',
    fontSize: 12,
    fontWeight: '600',
  },
  bankChipTextSelected: {
    color: '#000',
    fontWeight: 'bold',
  },
  colorsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  colorCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
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
    gap: 8,
  },
  iconChip: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconChipSelected: {
    backgroundColor: '#a3e635',
    borderColor: '#a3e635',
  },
  bottomEditActions: {
    marginBottom: 20,
  },
  saveButton: {
    backgroundColor: '#a3e635',
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  saveButtonText: {
    color: '#000',
    fontSize: 15,
    fontWeight: 'bold',
  },
  cancelButton: {
    marginTop: 10,
    paddingVertical: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#888',
    fontSize: 13,
    fontWeight: '600',
  },
  amountsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  label: {
    color: '#888',
    fontSize: 11,
    marginBottom: 2,
  },
  debtValue: {
    color: '#f87171',
    fontSize: 16,
    fontWeight: 'bold',
  },
  availableValue: {
    color: '#a3e635',
    fontSize: 16,
    fontWeight: 'bold',
  },
  inputEdit: {
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#a3e635',
    borderRadius: 8,
    color: '#fff',
    fontSize: 14,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  minPaymentBox: {
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 14,
  },
  minPaymentLabel: {
    color: '#888',
    fontSize: 11,
    marginBottom: 2,
  },
  minPaymentAmount: {
    color: '#fbbf24',
    fontSize: 16,
    fontWeight: 'bold',
  },
  datesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#222',
    paddingTop: 12,
  },
  dateBadge: {
    flex: 1,
    backgroundColor: '#111',
    borderRadius: 10,
    padding: 10,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#222',
  },
  dateBadgeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  dateLabel: {
    color: '#888',
    fontSize: 10,
  },
  dateValue: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  inputDateEdit: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#a3e635',
    borderRadius: 6,
    color: '#fff',
    fontSize: 12,
    paddingHorizontal: 6,
    paddingVertical: 3,
    marginTop: 2,
    textAlign: 'center',
  },
  plansCard: {
    backgroundColor: '#161616',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 16,
  },
  plansHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  plansSubDescription: {
    color: '#888',
    fontSize: 11,
    marginBottom: 10,
    lineHeight: 16,
  },
  planOptionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  planItemLeft: {
    flex: 1,
    marginRight: 10,
  },
  planTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  planOptionTitle: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  planOptionDesc: {
    color: '#888',
    fontSize: 10,
    marginTop: 1,
  },
  planOptionAmount: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'right',
  },
  perMonthText: {
    fontSize: 9,
    color: '#888',
    fontWeight: 'normal',
  },
  tagCero: {
    backgroundColor: '#064e3b',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 6,
  },
  tagCeroText: {
    color: '#a3e635',
    fontSize: 9,
    fontWeight: 'bold',
  },
});