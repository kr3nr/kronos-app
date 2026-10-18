import ThemedModal from "../../components/ThemedModal";
import React, { useState } from 'react';
import { 
  StyleSheet, Text, View, TouchableOpacity,
  TextInput, Modal, Image 
} from 'react-native';
import { Alert } from '../../services/appAlert';
import { Ionicons } from '@expo/vector-icons';
import { nationalBanksList, internationalWalletsList, getAccountLogo } from '../../services/accountsData';
import { supabase } from '../../services/supabase';
import CustomHeader from '../../components/CustomHeader';
import ScreenWrapper from '../../components/ScreenWrapper';
import { NUMERIC_KEYPAD_STYLES } from '../../components/numericKeypadStyles';

const getCurrencySymbol = (currency) => {
  if (currency === 'EUR') return '€';
  if (currency === 'USDT') return '₮';
  if (currency === 'USD') return '$';
  return 'Bs.';
};

const formatCurrencyValue = (num, currency = 'VES') => {
  const n = parseFloat(num || 0);
  if (isNaN(n)) return currency === 'USD' ? '0.00' : '0,00';
  
  const fixed = n.toFixed(2);
  const [intPart, decPart] = fixed.split('.');

  if (currency === 'USD') {
    const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return `${formattedInt}.${decPart}`;
  } else {
    const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `${formattedInt},${decPart}`;
  }
};

export default function EditAccountScreen({ navigation, accounts, setAccounts, currentAccount }) {
  const [accountTypeTab, setAccountTypeTab] = useState(currentAccount?.currency === 'VES' ? 'Nacional' : 'Internacional');
  const [selectedCurrency, setSelectedCurrency] = useState(currentAccount?.currency || 'VES');
  const [currencyModalVisible, setCurrencyModalVisible] = useState(false);

  const [accName, setAccName] = useState(currentAccount?.name || 'Selecciona una');
  const [accNickname, setAccNickname] = useState(currentAccount?.nickname || '');
  
  const initialCents = currentAccount?.balance !== undefined ? Math.round(Number(currentAccount.balance) * 100).toString() : '0';
  const [rawCents, setRawCents] = useState(initialCents);
  
  const [selectedColor, setSelectedColor] = useState(currentAccount?.color || '#a3e635');
  const [selectedLocalLogo, setSelectedLocalLogo] = useState(currentAccount?.localLogo || null);

  const [bankModalVisible, setBankModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [customBankModalVisible, setCustomBankModalVisible] = useState(false);
  const [customBankInput, setCustomBankInput] = useState('');
  const [loading, setLoading] = useState(false);

  const [keypadVisible, setKeypadVisible] = useState(false);
  const [activeTooltip, setActiveTooltip] = useState(null);

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

  const numericBalance = parseInt(rawCents, 10) / 100;

  const handleSelectCurrency = (code) => {
    setSelectedCurrency(code);
    setCurrencyModalVisible(false);
  };

  const handleUpdateAccount = async () => {
    if (accName === 'Selecciona una') {
      Alert.alert('Error', 'Por favor selecciona un banco o plataforma.');
      return;
    }
    
    const logoToSave = getAccountLogo(accName) || selectedLocalLogo;

    setLoading(true);

    try {
      const updatePayload = {
        name: accName,
        nickname: accNickname.trim() !== '' ? accNickname.trim() : null,
        balance: numericBalance,
        currency: selectedCurrency,
        color: selectedColor,
      };

      const { error } = await supabase
        .from('accounts')
        .update(updatePayload)
        .eq('id', currentAccount.id);

      if (error) {
        Alert.alert('Error', error.message);
        setLoading(false);
        return;
      }

      const updatedAccounts = accounts.map(acc => {
        if (String(acc.id) === String(currentAccount.id)) {
          return {
            ...acc,
            ...updatePayload,
            localLogo: logoToSave
          };
        }
        return acc;
      });

      setAccounts(updatedAccounts);
      const latestAccountData = updatedAccounts.find(a => String(a.id) === String(currentAccount.id));
      navigation('accountDetail', latestAccountData);

    } catch (err) {
      console.error('Error al actualizar cuenta:', err);
      Alert.alert('Error', 'No se pudo actualizar la cuenta.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Eliminar cuenta',
      '¿Estás seguro de que deseas eliminar esta cuenta? Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Eliminar', 
          style: 'destructive', 
          onPress: async () => {
            setLoading(true);
            try {
              const { error } = await supabase
                .from('accounts')
                .delete()
                .eq('id', currentAccount.id);

              if (error) {
                Alert.alert('Error', error.message);
                setLoading(false);
                return;
              }

              const filteredAccounts = accounts.filter(acc => String(acc.id) !== String(currentAccount.id));
              setAccounts(filteredAccounts);
              navigation('accounts');
            } catch (err) {
              console.error('Error al eliminar cuenta:', err);
              Alert.alert('Error', 'No se pudo eliminar la cuenta.');
              setLoading(false);
            }
          } 
        }
      ]
    );
  };

  const currentList = accountTypeTab === 'Nacional' ? nationalBanksList : internationalWalletsList;
  const filteredListOptions = currentList.filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <View style={styles.container}>
      {/* Cabecera estandarizada con CustomHeader */}
      <CustomHeader 
        title="Editar cuenta"
        onBackPress={() => navigation('accountDetail', currentAccount)}
        helpTitle="Editar cuenta"
        helpTips={[
          'Selecciona el tipo y banco de la cuenta.',
          'Puedes cambiar el nombre, la moneda y el saldo.',
          'Guarda para sincronizar los cambios con tu cuenta.',
        ]}
      />

      <ScreenWrapper contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.typeTabsRow}>
          <TouchableOpacity 
            style={[styles.typeTab, accountTypeTab === 'Nacional' && styles.typeTabActive]}
            onPress={() => { setAccountTypeTab('Nacional'); setAccName('Selecciona una'); }}
          >
            <Text style={[styles.typeTabText, accountTypeTab === 'Nacional' && styles.typeTabTextActive]}>Nacional</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.typeTab, accountTypeTab === 'Internacional' && styles.typeTabActive]}
            onPress={() => { setAccountTypeTab('Internacional'); setAccName('Selecciona una'); }}
          >
            <Text style={[styles.typeTabText, accountTypeTab === 'Internacional' && styles.typeTabTextActive]}>Internacional</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.inputRow} onPress={() => setBankModalVisible(true)}>
          <Text style={styles.inputLabel}>Cuenta</Text>
          <Text style={styles.inputValue}>{accName} </Text>
        </TouchableOpacity>

        <View style={styles.inputRow}>
          <Text style={styles.inputLabel}>Apodo (Opcional)</Text>
          <TextInput 
            style={styles.inputTextRight} 
            value={accNickname} 
            onChangeText={setAccNickname} 
            placeholder="Ej. Ahorros, Gastos"
            placeholderTextColor="#666"
          />
        </View>

        <TouchableOpacity style={styles.inputRow} onPress={() => setCurrencyModalVisible(true)}>
          <Text style={styles.inputLabel}>Moneda</Text>
          <Text style={styles.inputValue}>{selectedCurrency} ({getCurrencySymbol(selectedCurrency)}) </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.inputRow} onPress={() => setKeypadVisible(true)}>
          <Text style={styles.inputLabel}>Saldo</Text>
          <Text style={styles.inputBalanceValue}>
            {selectedCurrency === 'VES' ? 'Bs ' : selectedCurrency === 'EUR' ? '€ ' : selectedCurrency === 'USDT' ? '₮ ' : '$ '}
            {formatCurrencyValue(numericBalance, selectedCurrency)}
          </Text>
        </TouchableOpacity>

        {activeTooltip === 'edit' && (
          <View style={styles.tooltipCard}>
            <Text style={styles.tooltipTitle}>Edición de Cuenta</Text>
            <Text style={styles.tooltipText}>Aquí puedes modificar el banco, apodo, divisa o saldo actual. Los cambios se sincronizan al instante en tu cuenta.</Text>
            <TouchableOpacity onPress={() => setActiveTooltip(null)} style={styles.tooltipNextBtn}>
              <Text style={styles.tooltipNextText}>Cerrar ayuda ✓</Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.colorSectionTitle}>COLOR DE ETIQUETA</Text>
        <View style={styles.colorPalette}>
          {['#94a3b8', '#ef4444', '#f97316', '#fbbf24', '#a3e635', '#38bdf8'].map(c => (
            <TouchableOpacity 
              key={c} 
              style={[styles.colorCircle, { backgroundColor: c }, selectedColor === c && styles.colorCircleSelected]} 
              onPress={() => setSelectedColor(c)}
            />
          ))}
        </View>

        <TouchableOpacity 
          style={[styles.createButton, loading && { opacity: 0.7 }]} 
          onPress={handleUpdateAccount}
          disabled={loading}
        >
          <Text style={styles.createButtonText}>{loading ? 'Guardando...' : '✓ Guardar cambios'}</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.deleteButton} 
          onPress={handleDeleteAccount}
          disabled={loading}
        >
          <Ionicons name="trash-outline" size={18} color="#f87171" style={{ marginRight: 8 }} />
          <Text style={styles.deleteButtonText}>Eliminar cuenta</Text>
        </TouchableOpacity>
      </ScreenWrapper>

      {/* MODAL DE SELECCIÓN DE BANCOS / PLATAFORMAS */}
      <ThemedModal visible={bankModalVisible} transparent animationType="slide" onRequestClose={() => setBankModalVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => { setBankModalVisible(false); setSearchQuery(''); }}>
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()} style={styles.modalCardContainer}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalCenteredTitle}>
                {accountTypeTab === 'Nacional' ? 'Bancos de Venezuela' : 'Plataformas Internacionales'}
              </Text>
              <TouchableOpacity onPress={() => { setBankModalVisible(false); setSearchQuery(''); }}>
                <Ionicons name="close" size={20} color="#fff" />
              </TouchableOpacity>
            </View>

            <TextInput 
              style={styles.searchBox} 
              placeholder={accountTypeTab === 'Nacional' ? 'Buscar banco...' : 'Buscar plataforma...'} 
              placeholderTextColor="#888"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />

            <TouchableOpacity
              style={styles.customBankBtn}
              onPress={() => setCustomBankModalVisible(true)}
            >
              <Ionicons name="add-circle-outline" size={18} color="#a3e635" style={{ marginRight: 8 }} />
              <Text style={styles.customBankBtnText}>+ Agregar otro banco personalizado</Text>
            </TouchableOpacity>

            <ScrollView style={{ flex: 1, maxHeight: 400 }} contentContainerStyle={{ paddingBottom: 20 }} showsVerticalScrollIndicator={true} nestedScrollEnabled={true}>
              {filteredListOptions.map(item => (
                <TouchableOpacity 
                  key={item.name} 
                  style={styles.bankOptionRow} 
                  onPress={() => { 
                    setAccName(item.name); 
                    setSelectedColor(item.color);
                    setSelectedLocalLogo(item.localLogo || null);
                    setBankModalVisible(false); 
                    setSearchQuery('');
                  }}
                >
                  <View style={styles.bankRowLeft}>
                    <View style={styles.bankLogoCircle}>
                      {item.localLogo ? (
                        <Image source={item.localLogo} style={styles.logoImageStyle} resizeMode="contain" />
                      ) : (
                        <Text style={styles.bankLogoText}>{item.name.slice(0, 2).toUpperCase()}</Text>
                      )}
                    </View>
                    <Text style={styles.bankOptionText}>{item.name}</Text>
                  </View>
                  <View style={styles.radioOuter}><View style={styles.radioInner} /></View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>

        {/* MODAL PARA BANCO PERSONALIZADO */}
        <ThemedModal visible={customBankModalVisible} transparent animationType="fade" onRequestClose={() => setCustomBankModalVisible(false)}>
          <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' }} activeOpacity={1} onPress={() => setCustomBankModalVisible(false)}>
            <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()} style={styles.customBankCardContainer}>
              <Text style={[styles.modalCenteredTitle, { marginBottom: 6, textAlign: 'center' }]}>Banco Personalizado</Text>
              <Text style={{ color: '#888', fontSize: 12, marginBottom: 15, textAlign: 'center' }}>
                Ingresa el nombre del banco o plataforma adicional
              </Text>
              <TextInput
                style={styles.searchBox}
                placeholder="Ej. Mi Banco, NeoBanco..."
                placeholderTextColor="#888"
                value={customBankInput}
                onChangeText={setCustomBankInput}
                autoFocus
              />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 15, gap: 10 }}>
                <TouchableOpacity
                  style={[styles.customBankActionBtn, { backgroundColor: '#333' }]}
                  onPress={() => setCustomBankModalVisible(false)}
                >
                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.customBankActionBtn, { backgroundColor: '#a3e635' }]}
                  onPress={() => {
                    if (customBankInput.trim()) {
                      setAccName(customBankInput.trim());
                      setSelectedColor('#a3e635');
                      setSelectedLocalLogo(null);
                      setCustomBankInput('');
                      setCustomBankModalVisible(false);
                      setBankModalVisible(false);
                      setSearchQuery('');
                    } else {
                      Alert.alert('Error', 'Ingresa un nombre válido.');
                    }
                  }}
                >
                  <Text style={{ color: '#000', fontWeight: 'bold' }}>Guardar</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </ThemedModal>
      </ThemedModal>

      {/* MODAL DE TECLADO NUMÉRICO DE SALDO */}
      <ThemedModal visible={keypadVisible} transparent animationType="slide" onRequestClose={() => setKeypadVisible(false)}>
        <TouchableOpacity style={styles.keypadModalOverlay} activeOpacity={1} onPress={() => setKeypadVisible(false)}>
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()} style={styles.keypadContainer}>
            <View style={styles.keypadHeader}>
              <Text style={styles.keypadHeaderTitle}>Modificar Saldo</Text>
              <TouchableOpacity onPress={() => setKeypadVisible(false)} style={styles.keypadCloseBtn}>
                <Ionicons name="checkmark" size={22} color="#000" />
              </TouchableOpacity>
            </View>

            <View style={styles.keypadDisplayContainer}>
              <Text style={styles.keypadCurrencySymbol}>{selectedCurrency === 'VES' ? 'Bs ' : '$ '}</Text>
              <Text style={styles.keypadAmountText} numberOfLines={1} adjustsFontSizeToFit>
                {formatCurrencyValue(numericBalance, selectedCurrency)}
              </Text>
            </View>

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
                <TouchableOpacity style={styles.calcKeySubmit} onPress={() => setKeypadVisible(false)} activeOpacity={0.7}><Ionicons name="checkmark" size={20} color="#000" /></TouchableOpacity>
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
          </TouchableOpacity>
        </TouchableOpacity>
      </ThemedModal>

      {/* MODAL DE SELECCIÓN DE MONEDA */}
      <ThemedModal visible={currencyModalVisible} transparent animationType="slide" onRequestClose={() => setCurrencyModalVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setCurrencyModalVisible(false)}>
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()} style={styles.modalCardContainer}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalCenteredTitle}>Seleccionar Moneda</Text>
              <TouchableOpacity onPress={() => setCurrencyModalVisible(false)}>
                <Ionicons name="close" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
            {[
              { label: 'Bolívares (VES)', code: 'VES' },
              { label: 'Dólares (USD)', code: 'USD' },
              { label: 'Euros (EUR)', code: 'EUR' },
              { label: 'Tether (USDT)', code: 'USDT' }
            ].map(item => (
              <TouchableOpacity 
                key={item.code} 
                style={styles.bankOptionRow}
                onPress={() => handleSelectCurrency(item.code)}
              >
                <Text style={styles.bankOptionText}>{item.label}</Text>
                {selectedCurrency === item.code && <Ionicons name="checkmark" size={16} color="#a3e635" />}
              </TouchableOpacity>
            ))}
          </TouchableOpacity>
        </TouchableOpacity>
      </ThemedModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  scrollContent: { padding: 15, paddingBottom: 40, paddingTop: 10 },
  typeTabsRow: { flexDirection: 'row', backgroundColor: '#1a1a1a', borderRadius: 12, padding: 4, marginBottom: 20 },
  customBankBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(163, 230, 53, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(163, 230, 53, 0.3)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  customBankBtnText: {
    color: '#a3e635',
    fontSize: 14,
    fontWeight: 'bold',
  },
  customBankCardContainer: {
    backgroundColor: '#181a20',
    borderRadius: 20,
    padding: 20,
    width: '85%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: '#2d3038',
  },
  customBankActionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeTab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  typeTabActive: { backgroundColor: '#333' },
  typeTabText: { color: '#888', fontWeight: 'bold', fontSize: 14 },
  typeTabTextActive: { color: '#fff' },
  inputRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1a1a1a', padding: 16, borderRadius: 14, marginBottom: 12 },
  inputLabel: { color: '#fff', fontSize: 15, fontWeight: '500' },
  inputValue: { color: '#888', fontSize: 15 },
  inputBalanceValue: { color: '#a3e635', fontSize: 15, fontWeight: 'bold' },
  inputTextRight: { color: '#fff', fontSize: 15, textAlign: 'right', flex: 1, marginLeft: 10 },
  colorSectionTitle: { color: '#888', fontSize: 12, fontWeight: 'bold', marginVertical: 10 },
  colorPalette: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  colorCircle: { width: 40, height: 40, borderRadius: 20 },
  colorCircleSelected: { borderWidth: 3, borderColor: '#fff' },
  createButton: { backgroundColor: '#a3e635', padding: 16, borderRadius: 16, alignItems: 'center', marginBottom: 15 },
  createButtonText: { color: '#000', fontSize: 16, fontWeight: 'bold' },
  deleteButton: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a1a1a', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#f87171' },
  deleteButtonText: { color: '#f87171', fontSize: 16, fontWeight: 'bold' },
  searchBox: { backgroundColor: '#1a1a1a', color: '#fff', padding: 12, borderRadius: 12, marginBottom: 15, borderWidth: 1, borderColor: '#222' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalCardContainer: { backgroundColor: '#111', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40, height: '70%' },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  modalCenteredTitle: { color: '#a3e635', fontSize: 16, fontWeight: 'bold', textAlign: 'center', flex: 1 },
  
  bankOptionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#222' },
  bankOptionText: { color: '#fff', fontSize: 15 },
  bankRowLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  bankLogoCircle: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 12, overflow: 'hidden', backgroundColor: '#1f2937' },
  logoImageStyle: { width: '85%', height: '85%' },
  bankLogoText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  radioOuter: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#666', justifyContent: 'center', alignItems: 'center' },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: 'transparent' },
  
  tooltipCard: { backgroundColor: '#222', borderRadius: 16, padding: 16, marginTop: 15, borderWidth: 1, borderColor: '#a3e635', width: '100%' },
  tooltipTitle: { color: '#a3e635', fontSize: 14, fontWeight: 'bold', marginBottom: 6 },
  tooltipText: { color: '#ccc', fontSize: 12, lineHeight: 18, marginBottom: 12 },
  tooltipNextBtn: { alignSelf: 'flex-end', backgroundColor: '#a3e635', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 10 },
  tooltipNextText: { color: '#000', fontSize: 11, fontWeight: 'bold' },

  keypadModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  keypadContainer: { backgroundColor: '#111', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 15, paddingTop: 20, paddingBottom: 30 },
  keypadHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  keypadHeaderTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  keypadCloseBtn: { backgroundColor: '#a3e635', width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  keypadDisplayContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'baseline', backgroundColor: '#1a1a1a', borderRadius: 16, paddingVertical: 15, marginBottom: 20 },
  keypadCurrencySymbol: { color: '#aaa', fontSize: 20, fontWeight: 'bold' },
  keypadAmountText: { color: '#fff', fontSize: 32, fontWeight: 'bold' },
  
  calculatorPad: NUMERIC_KEYPAD_STYLES.container,
  calcRow: NUMERIC_KEYPAD_STYLES.row,
  calcKey: NUMERIC_KEYPAD_STYLES.key,
  calcKeySubmit: NUMERIC_KEYPAD_STYLES.submitKey,
  calcKeyEmpty: NUMERIC_KEYPAD_STYLES.emptyKey,
  calcKeyText: NUMERIC_KEYPAD_STYLES.keyText,
  calcKeyYellowText: NUMERIC_KEYPAD_STYLES.clearKeyText
});