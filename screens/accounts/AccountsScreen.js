import ThemedModal from "../../components/ThemedModal";
import React, { useState } from 'react';
import { 
  StyleSheet, Text, View, TouchableOpacity, ScrollView,
  Modal, TextInput, SafeAreaView, Dimensions, Image, 
  KeyboardAvoidingView, Platform, Keyboard, TouchableWithoutFeedback 
} from 'react-native';
import { Alert } from '../../services/appAlert';
import { Ionicons } from '@expo/vector-icons';
import { nationalBanksList, internationalWalletsList, getAccountLogo } from '../../services/accountsData';
import { supabase } from '../../services/supabase';
import CustomHeader from '../../components/CustomHeader';
import ContextualHelp from '../../components/ContextualHelp';
import ScreenWrapper from '../../components/ScreenWrapper';
import ThemeContent from '../../components/ThemeContent';
import { convertCurrencyAmount, getCurrencyRate, SUPPORTED_CURRENCIES } from '../../services/currencyService';

const { width } = Dimensions.get('window');

// Símbolo de moneda
const getCurrencySymbol = (currency) => {
  return SUPPORTED_CURRENCIES.find(item => item.code === currency)?.symbol || `${currency} `;
};

// Formateo general para listas y balances
const formatCurrencyValue = (num, currency = 'USD', hidden = false) => {
  if (hidden) return '****';
  const n = parseFloat(num || 0);
  if (isNaN(n)) return '0,00';
  
  const parts = n.toFixed(2).split('.');
  if (currency !== 'USD' && currency !== 'USDT') {
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return parts.join(',');
  } else {
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
  }
};

const calculateTotalBalance = (accounts, rates, selectedCurrencyView) => {
  if (!accounts || accounts.length === 0) return 0;

  return accounts.reduce((acc, item) => {
    const balance = parseFloat(item.balance) || 0;
    const convertedBalance = convertCurrencyAmount(balance, item.currency || 'VES', selectedCurrencyView, rates);
    return acc + (convertedBalance ?? 0);
  }, 0);
};

export default function AccountsScreen({
  navigation, accounts, setAccounts, rates, onSelectAccount, userId,
  favoriteAccountId, onFavoriteAccountChange, primaryCurrency = 'VES',
  onPrimaryCurrencyChange, displayCurrencies = ['USD', 'EUR', 'USDT', 'VES']
}) {
  const [filterType, setFilterType] = useState('Todas');
  const [modalCreateVisible, setModalCreateVisible] = useState(false);
  const [accountTypeTab, setAccountTypeTab] = useState('Nacional');
  
  const [newAccName, setNewAccName] = useState('Selecciona una');
  const [newAccNickname, setNewAccNickname] = useState(''); 
  const [selectedCurrency, setSelectedCurrency] = useState('VES'); 
  const [currencyModalVisible, setCurrencyModalVisible] = useState(false);

  const [newAccLabel, setNewAccLabel] = useState('Familiar');
  const [newAccBalance, setNewAccBalance] = useState('0.00');
  const [selectedColor, setSelectedColor] = useState('#a3e635');
  const [selectedLocalLogo, setSelectedLocalLogo] = useState(null);

  const [bankModalVisible, setBankModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [hideBalance, setHideBalance] = useState(false);
  const [sortOrder, setSortOrder] = useState('default');
  const [sortModalVisible, setSortModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  const visibleCurrencies = (displayCurrencies && Array.isArray(displayCurrencies) && displayCurrencies.length) ? displayCurrencies : ['USD', 'EUR', 'USDT', 'VES'];

  const handleBalanceChange = (text) => {
    const cleanText = text.replace(/[^0-9.,]/g, '').replace(',', '.');
    const parts = cleanText.split('.');
    let formattedText = parts[0];
    if (parts.length > 1) {
      formattedText += '.' + parts[1].slice(0, 2);
    }
    setNewAccBalance(formattedText);
  };

  const handleSelectCurrency = (code) => {
    setSelectedCurrency(code);
    setCurrencyModalVisible(false);
  };

  const handleCloseCreateAccount = () => {
    Keyboard.dismiss();
    setCurrencyModalVisible(false);
    setBankModalVisible(false);
    setModalCreateVisible(false);
  };

  const handleAddAccount = async () => {
    if (newAccName === 'Selecciona una') {
      Alert.alert('Error', 'Por favor selecciona un banco o plataforma.');
      return;
    }
    
    const normalizedText = newAccBalance.replace(',', '.');
    const numericBalance = parseFloat(normalizedText) || 0;
    const logoToSave = getAccountLogo(newAccName) || selectedLocalLogo;

    setLoading(true);

    try {
      const nuevaCuentaData = {
        user_id: userId,
        name: newAccName,
        nickname: newAccNickname.trim() !== '' ? newAccNickname.trim() : null,
        balance: numericBalance,
        currency: selectedCurrency,
        type: newAccLabel,
        color: selectedColor,
      };

      const { data, error } = await supabase
        .from('accounts')
        .insert([nuevaCuentaData])
        .select();

      if (error) {
        Alert.alert('Error', error.message);
        setLoading(false);
        return;
      }

      if (data && data.length > 0) {
        const cuentaCreada = {
          ...data[0],
          localLogo: logoToSave,
          isFavorite: false
        };
        setAccounts([...accounts, cuentaCreada]);
      }

      setModalCreateVisible(false);
      setNewAccName('Selecciona una');
      setNewAccNickname('');
      setSelectedCurrency('VES');
      setNewAccBalance('0.00');
    } catch (err) {
      console.error('Error al guardar cuenta.', err);
      Alert.alert('Error', 'No se pudo guardar la cuenta.');
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = (id) => {
    onFavoriteAccountChange?.(String(favoriteAccountId) === String(id) ? null : id);
  };

  // Helper para obtener el balance real calculado de una cuenta
  const getAccountRealBalance = (acc) => parseFloat(acc.balance) || 0;

  const safeAccounts = Array.isArray(accounts) ? accounts : [];

  const filteredAccounts = safeAccounts.filter(acc => {
    if (!acc) return false;
    if (filterType === 'Bolívares') return acc.currency === 'VES';
    if (filterType === 'Internacionales') return acc.currency !== 'VES';
    return true;
  }).sort((a, b) => {
    const balanceA = getAccountRealBalance(a);
    const balanceB = getAccountRealBalance(b);
    if (sortOrder === 'az') return (a.name || '').localeCompare(b.name || '');
    if (sortOrder === 'highest') return balanceB - balanceA;
    if (sortOrder === 'lowest') return balanceA - balanceB;
    return 0;
  });

  const convertedTotal = calculateTotalBalance(safeAccounts, rates, primaryCurrency);

  const getHeaderCurrencySymbol = () => {
    return getCurrencySymbol(primaryCurrency);
  };

  const currentList = (accountTypeTab === 'Nacional' ? nationalBanksList : internationalWalletsList) || [];
  const filteredListOptions = currentList.filter(item => item && (item.name || '').toLowerCase().includes((searchQuery || '').toLowerCase()));
  const KeyboardDismissWrapper = Platform.OS === 'web' ? View : TouchableWithoutFeedback;
  const keyboardDismissWrapperProps = Platform.OS === 'web'
    ? { style: { flex: 1 } }
    : { onPress: Keyboard.dismiss };

  if (bankModalVisible) {
    return (
      <ThemeContent>
      <SafeAreaView style={styles.container}>
        <View style={{ flex: 1, padding: 15 }}>
          <View style={styles.modalHeaderRow}>
            <TouchableOpacity onPress={() => setBankModalVisible(false)}>
              <Text style={styles.closeModalText}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.modalHeaderTitle}>
              {accountTypeTab === 'Nacional' ? 'Bancos de Venezuela' : 'Plataformas Internacionales'}
            </Text>
            <View style={{ width: 20 }} />
          </View>

          <TextInput 
            style={styles.searchBox} 
            placeholder={accountTypeTab === 'Nacional' ? 'Buscar banco...' : 'Buscar plataforma...'} 
            placeholderTextColor="#888"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />

          <ScreenWrapper style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 30 }}>
            {filteredListOptions.map(item => (
              <TouchableOpacity 
                key={item.name} 
                style={styles.bankOptionRow} 
                onPress={() => { 
                  setNewAccName(item.name); 
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
          </ScreenWrapper>
        </View>
      </SafeAreaView>
      </ThemeContent>
    );
  }

  return (
    <ThemeContent>
    <SafeAreaView style={styles.container}>
      <CustomHeader 
        title="Cuentas"
        onBackPress={() => {
          if (typeof navigation === 'function') {
            navigation('home');
          } else if (navigation?.navigate) {
            navigation.navigate('home');
          }
        }}
        rightComponent={
          <ContextualHelp title="Cuentas" tips={[
            'Elige una divisa para ver el balance consolidado.',
            'Filtra por tipo de cuenta y toca una para abrir sus movimientos.',
            'Usa + para agregar una cuenta y la estrella para elegir una sola cuenta predeterminada.',
          ]} />
        }
      />

      <View style={styles.filterTabs}>
        {['Todas', 'Bolívares', 'Internacionales'].map(tab => (
          <TouchableOpacity 
            key={tab} 
            style={[styles.tabButton, filterType === tab && styles.tabButtonActive]}
            onPress={() => setFilterType(tab)}
          >
            <Text style={[styles.tabText, filterType === tab && styles.tabTextActive]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScreenWrapper contentContainerStyle={styles.scrollContent}>
        <View style={styles.balanceCard}>
          <View style={styles.balanceHeader}>
            <Text style={styles.balanceTitle}>Balance total</Text>
            <TouchableOpacity onPress={() => setHideBalance(!hideBalance)}>
              <Text style={styles.eyeIcon}>{hideBalance ? '🙈' : '👁'}</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.balanceAmount}>
            {getHeaderCurrencySymbol()} {getCurrencyRate(primaryCurrency, rates) === null ? '—' : formatCurrencyValue(convertedTotal, primaryCurrency, hideBalance)}
          </Text>
          
          <View style={styles.currencyBadgesRow}>
            {visibleCurrencies.map(curr => (
              <TouchableOpacity key={curr} onPress={() => onPrimaryCurrencyChange?.(curr)} style={[styles.currencyBadge, primaryCurrency === curr && styles.currencyBadgeActive]}>
                <Text style={[styles.badgeText, primaryCurrency === curr && styles.badgeTextActive]}>
                  {SUPPORTED_CURRENCIES.find(currency => currency.code === curr)?.flag} {curr}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

        </View>

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.counterText}>{filteredAccounts.length} cuentas</Text>
          <TouchableOpacity onPress={() => setSortModalVisible(true)}>
            <Text style={styles.orderText}>⇅ Ordenar</Text>
          </TouchableOpacity>
        </View>

        {/* MÓDULO 2: LISTA DE CUENTAS CON SALDO EN TIEMPO REAL */}
        {filteredAccounts.map((acc, index) => {
          if (!acc) return null;
          const realAccBalance = getAccountRealBalance(acc);
          const equivalentUSD = convertCurrencyAmount(realAccBalance, acc.currency || 'VES', 'USD', rates);
          const accountName = acc.name || 'Cuenta';
          const accountLogo = acc.localLogo || getAccountLogo(accountName);
          const displayName = acc.nickname ? acc.nickname : accountName;
          const displaySubName = acc.nickname ? accountName : null;

          return (
                      <TouchableOpacity
                        key={acc.id || `acc-${index}`}
                        style={styles.accountItemCard}
                        activeOpacity={0.7}
                        onPress={() => {
                          if (onSelectAccount) onSelectAccount(acc);
                          if (typeof navigation === 'function') {
                            navigation('accountDetail', acc);
                          } else if (navigation?.navigate) {
                            navigation.navigate('accountDetail', acc);
                          }
                        }}
                      >
              <View style={styles.accColorIcon}>
                {accountLogo ? (
                  <Image source={accountLogo} style={styles.logoImageStyle} resizeMode="contain" />
                ) : (
                  <Text style={styles.accInitialsBadge}>{accountName.slice(0, 2).toUpperCase()}</Text>
                )}
              </View>
              <View style={styles.accInfo}>
                <Text style={styles.accName}>{displayName}</Text>
                <Text style={styles.accSubBalance}>
                  {displaySubName ? `${displaySubName} • ` : ''}
                  {`${getCurrencySymbol(acc.currency)} ${formatCurrencyValue(realAccBalance, acc.currency, hideBalance)}`}
                  {acc.currency !== 'USD' && equivalentUSD !== null ? ` ≈ $${formatCurrencyValue(equivalentUSD, 'USD', hideBalance)}` : ''}
                </Text>
              </View>
              <TouchableOpacity
                onPress={(event) => {
                  event.stopPropagation?.();
                  toggleFavorite(acc.id);
                }}
                accessibilityRole="button"
                accessibilityLabel={`Marcar ${acc.name} como cuenta predeterminada`}
                accessibilityState={{ selected: String(favoriteAccountId) === String(acc.id) }}
              >
                <Text style={[styles.starIcon, String(favoriteAccountId) === String(acc.id) && styles.starIconActive]}>
                  {String(favoriteAccountId) === String(acc.id) ? '★' : '☆'}
                </Text>
              </TouchableOpacity>
            </TouchableOpacity>
          );
        })}

      </ScreenWrapper>

      <TouchableOpacity style={styles.fabButton} onPress={() => setModalCreateVisible(true)}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* Modal de Ordenamiento */}
      <ThemedModal visible={sortModalVisible} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalHeaderTitle}>Ordenar cuentas</Text>
              <TouchableOpacity onPress={() => setSortModalVisible(false)}>
                <Text style={styles.closeModalText}>✕</Text>
              </TouchableOpacity>
            </View>
            {[
              { label: 'Por Defecto', key: 'default' },
              { label: 'Alfabéticamente (De A-Z)', key: 'az' },
              { label: 'Mayor Saldo', key: 'highest' },
              { label: 'Menor Saldo', key: 'lowest' }
            ].map(opt => (
              <TouchableOpacity 
                key={opt.key} 
                style={styles.sortOptionRow}
                onPress={() => { setSortOrder(opt.key); setSortModalVisible(false); }}
              >
                <Text style={[styles.sortOptionText, sortOrder === opt.key && styles.sortOptionTextActive]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ThemedModal>

      {/* Modal Único de Crear Cuenta */}
      <ThemedModal
        visible={modalCreateVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCloseCreateAccount}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <TouchableOpacity
                onPress={handleCloseCreateAccount}
                style={styles.createAccountCloseButton}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel="Cerrar creación de cuenta"
              >
                <Text style={styles.closeModalText}>✕</Text>
              </TouchableOpacity>
              <Text style={styles.modalHeaderTitle}>Nueva cuenta</Text>
              <View style={{ width: 20 }} />
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
              <View style={styles.typeTabsRow}>
                <TouchableOpacity
                  style={[styles.typeTab, accountTypeTab === 'Nacional' && styles.typeTabActive]}
                  onPress={() => { setAccountTypeTab('Nacional'); setNewAccName('Selecciona una'); }}
                >
                  <Text style={[styles.typeTabText, accountTypeTab === 'Nacional' && styles.typeTabTextActive]}>Nacional</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.typeTab, accountTypeTab === 'Internacional' && styles.typeTabActive]}
                  onPress={() => { setAccountTypeTab('Internacional'); setNewAccName('Selecciona una'); }}
                >
                  <Text style={[styles.typeTabText, accountTypeTab === 'Internacional' && styles.typeTabTextActive]}>Internacional</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.inputRow} onPress={() => setBankModalVisible(true)}>
                <Text style={styles.inputLabel}>Cuenta</Text>
                <Text style={styles.inputValue}>{newAccName} &gt;</Text>
              </TouchableOpacity>

              <View style={styles.inputRow}>
                <Text style={styles.inputLabel}>Apodo (Opcional)</Text>
                <TextInput
                  style={styles.inputTextRight}
                  value={newAccNickname}
                  onChangeText={setNewAccNickname}
                  placeholder="Ej. Ahorros, Gastos"
                  placeholderTextColor="#666"
                />
              </View>

              <TouchableOpacity style={styles.inputRow} onPress={() => setCurrencyModalVisible(true)}>
                <Text style={styles.inputLabel}>Moneda</Text>
                <Text style={styles.inputValue}>{selectedCurrency} ({getCurrencySymbol(selectedCurrency)}) &gt;</Text>
              </TouchableOpacity>

              <View style={styles.inputRow}>
                <Text style={styles.inputLabel}>Saldo inicial ({getCurrencySymbol(selectedCurrency)})</Text>
                <TextInput
                  style={styles.inputTextRight}
                  value={newAccBalance}
                  onChangeText={handleBalanceChange}
                  keyboardType="numeric"
                  placeholderTextColor="#888"
                />
              </View>

              <Text style={styles.colorSectionTitle}>COLOR</Text>
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
                onPress={handleAddAccount}
                disabled={loading}
              >
                <Text style={styles.createButtonText}>{loading ? 'Guardando...' : '✓ Crear cuenta'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelCreateButton}
                onPress={handleCloseCreateAccount}
                disabled={loading}
                accessibilityRole="button"
                accessibilityLabel="Cancelar creación de cuenta"
              >
                <Text style={styles.cancelCreateButtonText}>Cancelar</Text>
              </TouchableOpacity>
              {currencyModalVisible && (
                <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end', zIndex: 1000 }]}>
                  <TouchableOpacity style={{ flex: 1 }} onPress={() => setCurrencyModalVisible(false)} />
                  <View style={styles.modalCard}>
                    <View style={styles.modalHeaderRow}>
                      <Text style={styles.modalHeaderTitle}>Seleccionar Moneda</Text>
                      <TouchableOpacity onPress={() => setCurrencyModalVisible(false)}>
                        <Text style={styles.closeModalText}>✕</Text>
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
                        {selectedCurrency === item.code && <Ionicons name="checkmark" size={18} color="#a3e635" />}
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </ThemedModal>

    </SafeAreaView>
    </ThemeContent>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  helpButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#1a1a1a', justifyContent: 'center', alignItems: 'center' },
  filterTabs: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 15, marginVertical: 10 },
  tabButton: { backgroundColor: '#1a1a1a', paddingVertical: 8, paddingHorizontal: 20, borderRadius: 20 },
  tabButtonActive: { backgroundColor: '#333' },
  tabText: { color: '#888', fontWeight: 'bold', fontSize: 13 },
  tabTextActive: { color: '#fff' },
  scrollContent: { padding: 15, paddingBottom: 100 },
  balanceCard: { backgroundColor: '#1a1a1a', padding: 20, borderRadius: 20, marginBottom: 20 },
  balanceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  balanceTitle: { color: '#888', fontSize: 14 },
  eyeIcon: { color: '#888', fontSize: 18 },
  balanceAmount: { color: '#fff', fontSize: 32, fontWeight: 'bold', marginVertical: 10 },
  currencyBadgesRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 5 },
  currencyBadge: { backgroundColor: '#2a2a2a', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 15, marginRight: 8 },
  currencyBadgeActive: { backgroundColor: '#a3e635' },
  badgeText: { color: '#aaa', fontSize: 11, fontWeight: 'bold' },
  badgeTextActive: { color: '#000' },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  counterText: { color: '#888', fontSize: 14 },
  orderText: { color: '#888', fontSize: 14, fontWeight: 'bold' },
  accountItemCard: { backgroundColor: '#1a1a1a', padding: 15, borderRadius: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  accColorIcon: { width: 36, height: 36, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 15, overflow: 'hidden', backgroundColor: '#1f2937' },
  logoImageStyle: { width: '85%', height: '85%' },
  accInitialsBadge: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  accInfo: { flex: 1 },
  accName: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  accSubBalance: { color: '#888', fontSize: 12, marginTop: 3 },
  starIcon: { color: '#666', fontSize: 22 },
  starIconActive: { color: '#a3e635' },
  fabButton: { position: 'absolute', bottom: 25, right: 25, backgroundColor: '#a3e635', width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 5 },
  fabText: { color: '#000', fontSize: 32, fontWeight: 'bold', lineHeight: 34 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#111', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40, borderTopWidth: 1, borderTopColor: '#222' },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  createAccountCloseButton: { minWidth: 36, minHeight: 36, alignItems: 'center', justifyContent: 'center' },
  closeModalText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  modalHeaderTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  sortOptionRow: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#222' },
  sortOptionText: { color: '#aaa', fontSize: 16 },
  sortOptionTextActive: { color: '#a3e635', fontWeight: 'bold' },
  typeTabsRow: { flexDirection: 'row', backgroundColor: '#1a1a1a', borderRadius: 12, padding: 4, marginBottom: 20 },
  typeTab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  typeTabActive: { backgroundColor: '#333' },
  typeTabText: { color: '#888', fontWeight: 'bold', fontSize: 14 },
  typeTabTextActive: { color: '#fff' },
  inputRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1a1a1a', padding: 16, borderRadius: 14, marginBottom: 12 },
  inputLabel: { color: '#fff', fontSize: 15, fontWeight: '500' },
  inputValue: { color: '#888', fontSize: 15 },
  inputTextRight: { color: '#fff', fontSize: 15, textAlign: 'right', flex: 1, marginLeft: 10 },
  colorSectionTitle: { color: '#888', fontSize: 12, fontWeight: 'bold', marginVertical: 10 },
  colorPalette: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25 },
  colorCircle: { width: 40, height: 40, borderRadius: 20 },
  colorCircleSelected: { borderWidth: 3, borderColor: '#fff' },
  createButton: { backgroundColor: '#a3e635', padding: 16, borderRadius: 16, alignItems: 'center' },
  createButtonText: { color: '#000', fontSize: 16, fontWeight: 'bold' },
  cancelCreateButton: { paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  cancelCreateButtonText: { color: '#888', fontSize: 14, fontWeight: 'bold' },
  searchBox: { backgroundColor: '#1a1a1a', color: '#fff', padding: 12, borderRadius: 12, marginBottom: 15 },
  bankOptionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#222' },
  bankRowLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  bankLogoCircle: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 12, overflow: 'hidden', backgroundColor: '#1f2937' },
  bankLogoText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  bankOptionText: { color: '#fff', fontSize: 15, flex: 1 },
  radioOuter: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#666', justifyContent: 'center', alignItems: 'center' },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: 'transparent' },
  tooltipCard: { backgroundColor: '#222', borderRadius: 16, padding: 16, marginTop: 15, borderWidth: 1, borderColor: '#a3e635', width: '100%' },
  tooltipTitle: { color: '#a3e635', fontSize: 14, fontWeight: 'bold', marginBottom: 6 },
  tooltipText: { color: '#ccc', fontSize: 12, lineHeight: 18, marginBottom: 12 },
  tooltipNextBtn: { alignSelf: 'flex-end', backgroundColor: '#a3e635', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 10 },
  tooltipNextText: { color: '#000', fontSize: 11, fontWeight: 'bold' }
});