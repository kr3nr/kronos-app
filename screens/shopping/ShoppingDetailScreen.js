import ThemedModal from "../../components/ThemedModal";
import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Modal, TextInput, Dimensions, KeyboardAvoidingView, Platform, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { Alert } from '../../services/appAlert';
import { Ionicons } from '@expo/vector-icons';
import CustomHeader from '../../components/CustomHeader';
import { supabase } from '../../services/supabase';
import ScreenWrapper from '../../components/ScreenWrapper';
import ThemeContent from '../../components/ThemeContent';
import { NUMERIC_KEYPAD_STYLES } from '../../components/numericKeypadStyles';

const { width } = Dimensions.get('window');

const formatCurrencyValue = (num) => {
  const n = parseFloat(num || 0);
  if (isNaN(n)) return '0,00';
  const parts = n.toFixed(2).split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return parts.join(',');
};

export default function ShoppingDetailScreen({ 
  navigation, 
  routeParams, 
  accounts, 
  setAccounts, 
  movements, 
  setMovements, 
  rates,
  onSaveList,
  onDeleteList,
  shoppingLists,
  setShoppingLists,
  userId // <--- ¡Añade esta prop aquí!
}) {
  const [listTitle, setListTitle] = useState(routeParams?.title || 'Lista de compras');
  const [products, setProducts] = useState(routeParams?.products || []);
  const [isCompleted, setIsCompleted] = useState(routeParams?.completed || false);
  const [accountNameUsed, setAccountNameUsed] = useState(routeParams?.accountName || routeParams?.account_name || null);

  const [detailTab, setDetailTab] = useState('pendientes');

  // Estado para el modal de añadir/editar producto
  const [modalVisible, setModalVisible] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [prodName, setProdName] = useState('');
  const [rawDigits, setRawDigits] = useState('0');
  const [prodCurrency, setProdCurrency] = useState('USD');
  const [prodUnit, setProdUnit] = useState('Unidad');
  const [prodQuantity, setProdQuantity] = useState(1);
  const [prodQuantityText, setProdQuantityText] = useState('0,00'); 
  const [activeField, setActiveField] = useState('price'); 

  const [unitMenuVisible, setUnitMenuVisible] = useState(false);
  const [currencyMenuVisible, setCurrencyMenuVisible] = useState(false);

  // Opciones superiores (tres puntos) para cambiar nombre o eliminar lista
  const [optionsMenuVisible, setOptionsMenuVisible] = useState(false);
  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [newTitleInput, setNewTitleInput] = useState(listTitle);
  const [budgetModalVisible, setBudgetModalVisible] = useState(false);
  const [budgetLimit, setBudgetLimit] = useState(''); 
  const [budgetCurrency, setBudgetCurrency] = useState('USD'); 

  // Menú de ordenamiento de productos
  const [sortMenuVisible, setSortMenuVisible] = useState(false);
  const [sortCriteria, setSortCriteria] = useState('none');

  // Modal de finalización
  const [finalizeModalVisible, setFinalizeModalVisible] = useState(false);
  const currentDateObj = new Date();
  const [selectedDay, setSelectedDay] = useState(currentDateObj.getDate());
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(currentDateObj.getMonth());
  const [selectedYear, setSelectedYear] = useState(currentDateObj.getFullYear());
  
  const monthsNames = ['ene.', 'feb.', 'mar.', 'abr.', 'may.', 'jun.', 'jul.', 'ago.', 'sep.', 'oct.', 'nov.', 'dic.'];
  const purchaseDateStr = `${selectedDay} ${monthsNames[selectedMonthIndex]} ${selectedYear}`;

  const [finalizeOption, setFinalizeOption] = useState('solo'); 
  const [selectedPaymentAccount, setSelectedPaymentAccount] = useState(null);
  
  const [isSelectingAccount, setIsSelectingAccount] = useState(false);

  // Estados para el selector de tasa y tasa personalizada
  const [selectedRateSource, setSelectedRateSource] = useState('bcv'); 
  const [customRateValue, setCustomRateValue] = useState('');
  const [customRateModalVisible, setCustomRateModalVisible] = useState(false);
  const KeyboardDismissWrapper = Platform.OS === 'web' ? View : TouchableWithoutFeedback;
  const keyboardDismissWrapperProps = Platform.OS === 'web'
    ? { style: { flex: 1 } }
    : { onPress: Keyboard.dismiss };

  const getCurrentActiveRate = () => {
    const bcv = rates?.bcvRate || 1;
    const eur = rates?.eurRate || bcv;
    const binance = rates?.binanceRate > 0 ? rates.binanceRate : bcv;

    if (selectedRateSource === 'bcv') return bcv;
    if (selectedRateSource === 'eur') return eur;
    if (selectedRateSource === 'binance') return binance;
    if (selectedRateSource === 'custom') return parseFloat(customRateValue) || bcv;
    return bcv;
  };

  const activeRate = getCurrentActiveRate();
  const unitPrice = parseFloat(rawDigits) / 100;

  const filteredProducts = products.filter(p => {
    if (detailTab === 'listos') return p.completed;
    if (detailTab === 'pendientes') return !p.completed;
    return true;
  });

  const totalUsd = products.reduce((acc, p) => {
    const pPrice = parseFloat(p.price || 0);
    const qty = parseFloat(p.quantity || 1);
    let itemTotalUsd = pPrice;
    if (p.unit === 'Unidad') {
      itemTotalUsd = pPrice * qty;
    }
    if (p.currency === 'VES') {
      itemTotalUsd = itemTotalUsd / activeRate;
    }
    return acc + itemTotalUsd;
  }, 0);

  const totalBs = totalUsd * activeRate;

  const numericBudgetLimit = parseFloat(budgetLimit) || 0;
  let budgetRemaining = 0;
  if (numericBudgetLimit > 0) {
    if (budgetCurrency === 'VES') {
      const budgetInUsd = numericBudgetLimit / activeRate;
      budgetRemaining = budgetInUsd - totalUsd;
    } else {
      budgetRemaining = numericBudgetLimit - totalUsd;
    }
  }

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    const calcTotal = (item) => {
      const pr = parseFloat(item.price || 0);
      const qt = parseFloat(item.quantity || 1);
      const t = item.unit === 'Unidad' ? pr * qt : pr;
      return t * (item.currency === 'VES' ? 1/activeRate : 1);
    };
    const totalA = calcTotal(a);
    const totalB = calcTotal(b);
    
    if (sortCriteria === 'alpha') {
      return a.name.localeCompare(b.name);
    } else if (sortCriteria === 'highPrice') {
      return totalB - totalA;
    } else if (sortCriteria === 'lowPrice') {
      return totalA - totalB;
    }
    return 0;
  });

  const handleKeyPress = (val) => {
    if (activeField === 'price') {
      if (val === 'C') {
        setRawDigits('0');
      } else if (val === 'backspace') {
        if (rawDigits.length > 1) {
          setRawDigits(rawDigits.slice(0, -1));
        } else {
          setRawDigits('0');
        }
      } else {
        if (rawDigits === '0') {
          setRawDigits(val);
        } else {
          setRawDigits(rawDigits + val);
        }
      }
    } else {
      if (prodUnit === 'Unidad') return;
      
      let currentClean = prodQuantityText.replace(/\./g, '').replace(',', '');
      
      if (val === 'C') {
        setProdQuantityText('0,00');
        setProdQuantity(0);
      } else if (val === 'backspace') {
        if (currentClean.length > 1) {
          const nextVal = currentClean.slice(0, -1).padStart(3, '0');
          const numericVal = parseInt(nextVal) / 100;
          const formatted = numericVal.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          setProdQuantityText(formatted);
          setProdQuantity(numericVal);
        } else {
          setProdQuantityText('0,00');
          setProdQuantity(0);
        }
      } else {
        if (currentClean === '000' || currentClean === '0') {
          currentClean = val;
        } else {
          currentClean = currentClean + val;
        }
        const numericVal = parseInt(currentClean) / 100;
        const formatted = numericVal.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        setProdQuantityText(formatted);
        setProdQuantity(numericVal);
      }
    }
  };

  const handleSaveProduct = () => {
    if (!prodName.trim()) {
      Alert.alert('Nombre requerido', 'Por favor ingresa el nombre del producto.');
      return;
    }

    const priceVal = unitPrice;
    const finalQty = prodUnit === 'Unidad' ? prodQuantity : parseFloat(prodQuantityText.replace(/\./g, '').replace(',', '.')) || 0;
    const isCompleted = priceVal > 0 ? true : (editingIndex !== null ? products[editingIndex].completed : false);

    const newProduct = {
      name: prodName.trim(),
      price: priceVal,
      currency: prodCurrency,
      unit: prodUnit,
      quantity: finalQty,
      completed: isCompleted
    };

    let updatedProducts = [...products];
    if (editingIndex !== null) {
      updatedProducts[editingIndex] = newProduct;
    } else {
      updatedProducts.push(newProduct);
    }
    setProducts(updatedProducts);
    triggerSaveList(updatedProducts, false, listTitle);

    setModalVisible(false);
    setEditingIndex(null);
    setProdName('');
    setRawDigits('0');
    setProdQuantity(1);
  };

  const triggerSaveList = (currentProducts, isCompleted, titleToSave, accountName = null) => {
    if (onSaveList) {
      const calculatedTotalUsd = currentProducts.reduce((acc, p) => {
        const pPrice = parseFloat(p.price || 0);
        const qty = parseFloat(p.quantity || 1);
        let itemTotalUsd = p.unit === 'Unidad' ? pPrice * qty : pPrice;
        if (p.currency === 'VES') {
          itemTotalUsd = itemTotalUsd / activeRate;
        }
        return acc + itemTotalUsd;
      }, 0);

      onSaveList({
        id: routeParams?.id || 'list_' + Date.now(),
        title: titleToSave,
        date: purchaseDateStr,
        month: 'Oct',
        totalUsd: calculatedTotalUsd,
        productsCount: currentProducts.length,
        completed: isCompleted,
        accountName: accountName,
        products: currentProducts,
        icon: routeParams?.icon || 'basket-outline'
      });
    }
  };

  const openAddModal = () => {
    setEditingIndex(null);
    setProdName('');
    setRawDigits('0');
    setProdCurrency('USD');
    setProdUnit('Unidad');
    setProdQuantity(1);
    setProdQuantityText('0,00');
    setActiveField('price');
    setModalVisible(true);
  };

  const openEditModal = (index) => {
    const p = products[index];
    setEditingIndex(index);
    setProdName(p.name);
    setRawDigits(Math.round((p.price || 0) * 100).toString());
    setProdCurrency(p.currency);
    setProdUnit(p.unit);
    setProdQuantity(p.quantity);
    const formattedQty = (p.quantity || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    setProdQuantityText(formattedQty);
    setActiveField('price');
    setModalVisible(true);
  };

  const handleDeleteProduct = (index) => {
    const updatedProducts = products.filter((_, i) => i !== index);
    setProducts(updatedProducts);
    triggerSaveList(updatedProducts, false, listTitle);
    setModalVisible(false);
  };

  const handleDeleteList = () => {
    Alert.alert(
      'Eliminar lista',
      '¿Estás seguro de que deseas eliminar esta lista de compras?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Eliminar', 
          style: 'destructive', 
          onPress: async () => {
            if (routeParams?.id && onDeleteList) {
              await onDeleteList(routeParams.id);
            }
            navigation('shoppingLists');
          } 
        }
      ]
    );
  };

  const handleConfirmFinalize = async () => {
    if (finalizeOption === 'solo') {
      triggerSaveList(products, true, listTitle, null);
      Alert.alert('¡Lista finalizada!', 'La lista se guardó como completada sin afectar cuentas.');
      navigation('shoppingLists');
      return;
    }

    if (!selectedPaymentAccount) {
      Alert.alert('Cuenta requerida', 'Por favor selecciona la cuenta de donde se debitará el pago.');
      return;
    }

    let amountToSubtract = totalUsd;
    if (selectedPaymentAccount.currency === 'VES') {
      amountToSubtract = totalBs;
    }

    if (parseFloat(selectedPaymentAccount.balance) < amountToSubtract) {
      Alert.alert('Saldo insuficiente', `La cuenta ${selectedPaymentAccount.name} no tiene suficiente saldo.`);
      return;
    }

    const newBalance = parseFloat(selectedPaymentAccount.balance) - amountToSubtract;

    try {
      if (userId) {
        const { error: accError } = await supabase
          .from('accounts')
          .update({ balance: newBalance })
          .eq('id', selectedPaymentAccount.id);

        if (accError) {
          Alert.alert('Error', 'No se pudo actualizar el saldo de la cuenta en la nube.');
          return;
        }
      }

      const updatedAccounts = accounts.map(acc => {
        if (String(acc.id) === String(selectedPaymentAccount.id)) {
          return { ...acc, balance: newBalance };
        }
        return acc;
      });
      setAccounts(updatedAccounts);

      const now = new Date();
      const currentRealTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const formattedDate = now.toLocaleDateString();
      const timeString = `${formattedDate}, ${currentRealTime}`;
      const newMovementTitle = `Pago: ${listTitle}`;
      const finalAmount = -Math.abs(amountToSubtract);

      const movementPayload = {
        user_id: userId || null,
        account_id: selectedPaymentAccount.id,
        title: newMovementTitle,
        category: 'Supermercado',
        amount: finalAmount,
        sub_amount: `${selectedPaymentAccount.currency === 'VES' ? 'Bs. ' : '$ '}${formatCurrencyValue(Math.abs(finalAmount))}`,
        type: 'Egresos',
        month_index: now.getMonth(),
        day: now.getDate(),
        time: timeString
      };

      if (userId) {
        const { data, error } = await supabase
          .from('movements')
          .insert([movementPayload])
          .select();

        if (error) {
          Alert.alert('Error', error.message);
          return;
        }

        if (data && data.length > 0) {
          const createdMovement = {
            ...data[0],
            accountId: data[0].account_id,
            monthIndex: data[0].month_index
          };
          setMovements(prev => [createdMovement, ...prev]);
        }
      } else {
        const localMovement = {
          id: Date.now().toString(),
          accountId: selectedPaymentAccount.id,
          account_id: selectedPaymentAccount.id,
          title: newMovementTitle,
          amount: finalAmount,
          currency: selectedPaymentAccount.currency,
          category: 'Supermercado',
          time: timeString,
          type: 'Egresos',
          month_index: now.getMonth(),
          day: now.getDate()
        };
        setMovements(prev => [localMovement, ...prev]);
      }

      triggerSaveList(products, true, listTitle, selectedPaymentAccount.name);

      setFinalizeModalVisible(false);
      Alert.alert('¡Compra exitosa!', `Lista completada y egreso registrado con la cuenta ${selectedPaymentAccount.name}.`);
      navigation('shoppingLists');

    } catch (err) {
      console.error('Error inesperado al finalizar la lista:', err);
      Alert.alert('Error', 'Ocurrió un error al procesar el pago de la lista.');
    }
  };

  const getProductCountText = (count) => {
    return count === 1 ? '1 producto' : `${count} productos`;
  };

  return (
    <ThemeContent>
    <View style={styles.container}>
      <CustomHeader 
        title={listTitle} 
        onBackPress={() => {
          triggerSaveList(products, false, listTitle);
          navigation('shoppingLists');
        }}
        rightIcon="ellipsis-horizontal"
        onRightPress={() => setOptionsMenuVisible(true)}
      />

      <View style={styles.filterTabsRow}>
        {[
          { key: 'pendientes', label: `Pendientes · ${products.filter(p => !p.completed).length}` },
          { key: 'listos', label: 'Listos' },
          { key: 'todos', label: 'Todos' }
        ].map(tab => (
          <TouchableOpacity 
            key={tab.key}
            style={[styles.filterChipTab, detailTab === tab.key && styles.filterChipTabActive]}
            onPress={() => setDetailTab(tab.key)}
          >
            <Text style={[styles.filterChipTabText, detailTab === tab.key && styles.filterChipTabTextActive]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.totalHeaderCard}>
        <View style={styles.totalHeaderTop}>
          <Text style={styles.totalLabel}>Total de la lista</Text>
          <Text style={styles.totalProductsCount}>{getProductCountText(products.length)}</Text>
        </View>
        <Text style={styles.totalAmount}>${formatCurrencyValue(totalUsd)}</Text>
        <Text style={styles.totalSubInfo}>
          Bs {formatCurrencyValue(totalBs)} · Tasa activa: Bs. {formatCurrencyValue(activeRate)}
        </Text>

        <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#222', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ color: '#aaa', fontSize: 12 }}>Cuenta de pago:</Text>
          <Text style={{ color: accountNameUsed ? '#a3e635' : '#f87171', fontSize: 13, fontWeight: 'bold' }}>
            {accountNameUsed ? `${accountNameUsed} (Pagada)` : 'Ninguna (Sin pagar)'}
          </Text>
        </View>

        <View style={[styles.currencyBadgesRow, { marginTop: 10 }]}>
          {[
            { key: 'bcv', label: 'BCV' },
            { key: 'eur', label: 'Euro' },
            { key: 'binance', label: 'Binance' },
            { key: 'custom', label: selectedRateSource === 'custom' ? `Otra (${customRateValue})` : 'Otra' }
          ].map(rateItem => (
            <TouchableOpacity 
              key={rateItem.key}
              style={[styles.currencyBadge, selectedRateSource === rateItem.key && styles.currencyBadgeActive]}
              onPress={() => {
                if (rateItem.key === 'custom') {
                  setCustomRateModalVisible(true);
                } else {
                  setSelectedRateSource(rateItem.key);
                }
              }}
            >
              <Text style={[styles.badgeText, selectedRateSource === rateItem.key && styles.badgeTextActive]}>
                {rateItem.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScreenWrapper contentContainerStyle={styles.scrollContent}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.productsCountText}>{getProductCountText(sortedProducts.length)}</Text>
          <TouchableOpacity style={styles.sortButton} onPress={() => setSortMenuVisible(!sortMenuVisible)}>
            <Ionicons name="swap-vertical" size={14} color="#888" style={{ marginRight: 4 }} />
            <Text style={styles.sortButtonText}>
              {sortCriteria === 'alpha' ? 'A - Z' : sortCriteria === 'highPrice' ? 'Mayor precio' : sortCriteria === 'lowPrice' ? 'Menor precio' : 'Ordenar'}
            </Text>
          </TouchableOpacity>
        </View>

        {sortMenuVisible && (
          <View style={styles.sortDropdownMenu}>
            {[
              { key: 'none', label: 'Por defecto' },
              { key: 'alpha', label: 'Alfabético (A - Z)' },
              { key: 'highPrice', label: 'Mayor precio' },
              { key: 'lowPrice', label: 'Menor precio' }
            ].map(s => (
              <TouchableOpacity key={s.key} style={styles.dropdownItem} onPress={() => { setSortCriteria(s.key); setSortMenuVisible(false); }}>
                <Text style={[styles.dropdownText, sortCriteria === s.key && { color: '#a3e635' }]}>{s.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {sortedProducts.length === 0 ? (
          <Text style={styles.emptyText}>No hay productos en esta sección. Toca el botón `+` para agregar.</Text>
        ) : (
          sortedProducts.map((item, index) => {
            const unitPriceVal = parseFloat(item.price || 0);
            const totalPrice = item.unit === 'Unidad' ? unitPriceVal * (parseFloat(item.quantity) || 1) : unitPriceVal;
            const isItemVes = item.currency === 'VES';
            
            let subAmountText = '';
            if (unitPriceVal > 0) {
              if (isItemVes) {
                const usdEquivalent = totalPrice / activeRate;
                subAmountText = `$${formatCurrencyValue(usdEquivalent)}`;
              } else {
                const bsEquivalent = totalPrice * activeRate;
                subAmountText = `Bs ${formatCurrencyValue(bsEquivalent)}`;
              }
            } else {
              subAmountText = 'Sin precio asignado';
            }

            const formattedQtyDisplay = item.unit === 'Unidad' ? item.quantity : (parseFloat(item.quantity) || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

            return (
              <TouchableOpacity 
                key={index} 
                style={styles.productCard}
                onPress={() => openEditModal(products.indexOf(item))}
              >
                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#222', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                  <Ionicons name="basket-outline" size={16} color={item.completed ? "#a3e635" : "#aaa"} />
                </View>

                <View style={styles.productInfo}>
                  <Text style={[styles.productName, item.completed && { textDecorationLine: 'line-through', color: '#888' }]}>{item.name}</Text>
                  <Text style={styles.productSub}>
                    {formattedQtyDisplay} {item.unit.toLowerCase()}{item.quantity > 1 && item.unit === 'Unidad' ? 'es' : ''} {unitPriceVal > 0 && item.unit === 'Unidad' ? `· $${formatCurrencyValue(unitPriceVal)} c/u` : ''}
                  </Text>
                </View>
                <View style={styles.productPriceContainer}>
                  <Text style={styles.productPrice}>
                    {unitPriceVal > 0 ? `$${formatCurrencyValue(totalPrice)}` : 'Sin precio'}
                  </Text>
                  <Text style={styles.productSubPrice}>{subAmountText}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#666" style={{ marginLeft: 8 }} />
              </TouchableOpacity>
            );
          })
        )}
      </ScreenWrapper>

      <View style={styles.floatingButtonsContainer}>
        <TouchableOpacity style={styles.fabLeft} onPress={openAddModal}>
          <Ionicons name="add" size={24} color="#a3e635" />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.fabRight}
          onPress={() => {
            if (products.length === 0) {
              Alert.alert('Lista vacía', 'Agrega al menos un producto antes de finalizar.');
              return;
            }
            setFinalizeModalVisible(true);
          }}
        >
          <Ionicons name="checkmark" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      {/* MODAL PARA TASA PERSONALIZADA */}
      <ThemedModal
        visible={customRateModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setCustomRateModalVisible(false)}
      >
        <KeyboardDismissWrapper {...keyboardDismissWrapperProps}>
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ width: '100%' }}>
              <View style={styles.modalCard}>
                <View style={styles.modalHeaderRow}>
                  <Text style={styles.modalHeaderTitle}>Establecer Tasa Personalizada</Text>
                  <TouchableOpacity onPress={() => setCustomRateModalVisible(false)}>
                    <Text style={styles.closeModalText}>✕</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.modalSubTitle}>Introduce la tasa en Bolívares por dólar:</Text>
                
                <TextInput
                  style={styles.customRateInput}
                  placeholder="Ej. 36.50"
                  placeholderTextColor="#666"
                  keyboardType="numeric"
                  value={customRateValue}
                  onChangeText={setCustomRateValue}
                  returnKeyType="done"
                  onSubmitEditing={Keyboard.dismiss}
                />

                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <TouchableOpacity 
                    style={[styles.modalConfirmButton, { backgroundColor: '#333', flex: 1, marginRight: 8 }]} 
                    onPress={() => setCustomRateModalVisible(false)}
                  >
                    <Text style={[styles.modalConfirmButtonText, { color: '#fff' }]}>Cancelar</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.modalConfirmButton, { flex: 1, marginLeft: 8 }]} 
                    onPress={() => {
                      if (!customRateValue || isNaN(parseFloat(customRateValue))) {
                        alert('Por favor introduce una tasa válida.');
                        return;
                      }
                      setSelectedRateSource('custom');
                      setCustomRateModalVisible(false);
                      Keyboard.dismiss();
                    }}
                  >
                    <Text style={styles.modalConfirmButtonText}>Aplicar Tasa</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </View>
        </KeyboardDismissWrapper>
      </ThemedModal>

      {/* MODAL DE OPCIONES SUPERIORES */}
      <ThemedModal
        visible={optionsMenuVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setOptionsMenuVisible(false)}
      >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setOptionsMenuVisible(false)}>
          <View style={styles.optionsDropdownCard}>
            <TouchableOpacity style={styles.optionItemRow} onPress={() => { setOptionsMenuVisible(false); setNewTitleInput(listTitle); setRenameModalVisible(true); }}>
              <Ionicons name="create-outline" size={18} color="#fff" style={{ marginRight: 10 }} />
              <Text style={{ color: '#fff', fontSize: 15 }}>Cambiar nombre</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.optionItemRow} onPress={() => { setOptionsMenuVisible(false); setBudgetModalVisible(true); }}>
              <Ionicons name="wallet-outline" size={18} color="#a3e635" style={{ marginRight: 10 }} />
              <Text style={{ color: '#fff', fontSize: 15 }}>Definir presupuesto</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.optionItemRow} onPress={() => { setOptionsMenuVisible(false); handleDeleteList(); }}>
              <Ionicons name="trash-outline" size={18} color="#f87171" style={{ marginRight: 10 }} />
              <Text style={{ color: '#f87171', fontSize: 15 }}>Eliminar lista</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </ThemedModal>

      {/* MODAL CAMBIAR NOMBRE */}
      <ThemedModal
        visible={renameModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setRenameModalVisible(false)}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.accountModalContent}>
            <Text style={styles.modalTitle}>Cambiar nombre de la lista</Text>
            <View style={styles.inputRow}>
              <TextInput 
                style={{ color: '#fff', fontSize: 16 }}
                value={newTitleInput}
                onChangeText={setNewTitleInput}
                placeholder="Nuevo nombre"
                placeholderTextColor="#666"
              />
            </View>
            <TouchableOpacity style={styles.modalConfirmButton} onPress={() => {
              if (newTitleInput.trim()) {
                setListTitle(newTitleInput.trim());
                triggerSaveList(products, false, newTitleInput.trim());
              }
              setRenameModalVisible(false);
            }}>
              <Text style={styles.modalConfirmButtonText}>Guardar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalCloseButton} onPress={() => setRenameModalVisible(false)}>
              <Text style={styles.modalCloseButtonText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </ThemedModal>

      {/* MODAL DE EDICIÓN / CREACIÓN DE PRODUCTO */}
      <ThemedModal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.productModalContent}>
            <View style={styles.modalHeaderRow}>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.modalHeaderTitle}>{editingIndex !== null ? 'Editar producto' : 'Nuevo producto'}</Text>
              <View style={{ width: 24 }} />
            </View>

            <ScreenWrapper contentContainerStyle={{ paddingBottom: 20 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              
              <TouchableOpacity onPress={() => setActiveField('price')} activeOpacity={0.9}>
                <Text style={[styles.priceDisplay, { color: activeField === 'price' ? '#fff' : '#666' }]}>
                  $ {formatCurrencyValue(unitPrice)}
                </Text>
              </TouchableOpacity>

              <View style={styles.inputRow}>
                <TextInput 
                  style={styles.productNameInput}
                  placeholder="Nombre del producto (ej. Sopa)"
                  placeholderTextColor="#666"
                  value={prodName}
                  onChangeText={setProdName}
                  returnKeyType="done"
                  onSubmitEditing={Keyboard.dismiss}
                />
              </View>

              <View style={styles.selectorsRowCompact}>
                <TouchableOpacity style={styles.selectorChipCompact} onPress={() => setCurrencyMenuVisible(!currencyMenuVisible)}>
                  <Text style={styles.selectorChipTextCompact}>{prodCurrency}</Text>
                  <Ionicons name="chevron-down" size={10} color="#aaa" style={{ marginLeft: 2 }} />
                </TouchableOpacity>

                <TouchableOpacity style={styles.selectorChipCompact} onPress={() => setUnitMenuVisible(!unitMenuVisible)}>
                  <Text style={styles.selectorChipTextCompact}>{prodUnit}</Text>
                  <Ionicons name="chevron-down" size={10} color="#aaa" style={{ marginLeft: 2 }} />
                </TouchableOpacity>

                {prodUnit !== 'Unidad' ? (
                  <TouchableOpacity 
                    onPress={() => setActiveField('quantity')} 
                    style={[
                      styles.inlineQuantityCard, 
                      activeField === 'quantity' && { borderColor: '#a3e635', borderWidth: 1 }
                    ]}
                  >
                    <Text style={[styles.inlineQuantityText, { color: activeField === 'quantity' ? '#fff' : '#666' }]}>
                      {prodQuantityText} {prodUnit === 'Kilos' ? 'kg' : prodUnit === 'Gramos' ? 'g' : 'l'}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.inlineQuantityCard}>
                    <TouchableOpacity onPress={() => setProdQuantity(Math.max(1, prodQuantity - 1))} style={{ paddingHorizontal: 4 }}>
                      <Ionicons name="remove" size={14} color="#fff" />
                    </TouchableOpacity>
                    <Text style={[styles.inlineQuantityText, { color: '#fff', marginHorizontal: 6 }]}>{prodQuantity}</Text>
                    <TouchableOpacity onPress={() => setProdQuantity(prodQuantity + 1)} style={{ paddingHorizontal: 4 }}>
                      <Ionicons name="add" size={14} color="#fff" />
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {currencyMenuVisible && (
                <View style={styles.dropdownMenu}>
                  {['USD', 'VES', 'EUR', 'USDT'].map(curr => (
                    <TouchableOpacity key={curr} style={styles.dropdownItem} onPress={() => { setProdCurrency(curr); setCurrencyMenuVisible(false); }}>
                      <Text style={[styles.dropdownText, prodCurrency === curr && { color: '#a3e635' }]}>{curr}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {unitMenuVisible && (
                <View style={styles.dropdownMenu}>
                  {['Unidad', 'Kilos', 'Gramos', 'Litros'].map(u => (
                    <TouchableOpacity key={u} style={styles.dropdownItem} onPress={() => { setProdUnit(u); setUnitMenuVisible(false); }}>
                      <Text style={[styles.dropdownText, prodUnit === u && { color: '#a3e635' }]}>{u}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <View style={styles.numericPad}>
                {[['1','2','3','C'], ['4','5','6','ok'], ['7','8','9','del'], ['00','0','back']].map((row, rIdx) => (
                  <View key={rIdx} style={styles.padRow}>
                    {row.map(btn => {
                      if (btn === 'ok') {
                        return (
                          <TouchableOpacity key={btn} style={[styles.padButton, styles.padButtonOk]} onPress={handleSaveProduct}>
                            <Ionicons name="checkmark" size={20} color="#000" />
                          </TouchableOpacity>
                        );
                      }
                      if (btn === 'del') {
                        return (
                          <TouchableOpacity key={btn} style={[styles.padButton, styles.padButtonDel]} onPress={() => handleDeleteProduct(editingIndex)}>
                            <Ionicons name="trash-outline" size={18} color="#fff" />
                          </TouchableOpacity>
                        );
                      }
                      if (btn === 'back') {
                        return (
                          <TouchableOpacity key={btn} style={styles.padButton} onPress={() => handleKeyPress('backspace')}>
                            <Ionicons name="backspace-outline" size={20} color="#fff" />
                          </TouchableOpacity>
                        );
                      }
                      return (
                        <TouchableOpacity key={btn} style={styles.padButton} onPress={() => handleKeyPress(btn)}>
                          <Text style={styles.padButtonText}>{btn}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ))}
              </View>
            </ScreenWrapper>
          </View>
        </KeyboardAvoidingView>
      </ThemedModal>

      {/* MODAL PARA DEFINIR PRESUPUESTO */}
      <ThemedModal
        visible={budgetModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setBudgetModalVisible(false)}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.accountModalContent}>
            <Text style={styles.modalTitle}>Definir Presupuesto</Text>
            <Text style={styles.modalSubTitle}>Establece un límite de gasto para esta lista:</Text>
            
            <View style={{ flexDirection: 'row', marginBottom: 15 }}>
              <TouchableOpacity 
                style={[styles.currencyBadge, budgetCurrency === 'USD' && styles.currencyBadgeActive, { paddingVertical: 10, flex: 1, alignItems: 'center', marginRight: 8 }]}
                onPress={() => setBudgetCurrency('USD')}
              >
                <Text style={[styles.badgeText, budgetCurrency === 'USD' && styles.badgeTextActive]}>Dólares ($)</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.currencyBadge, budgetCurrency === 'VES' && styles.currencyBadgeActive, { paddingVertical: 10, flex: 1, alignItems: 'center' }]}
                onPress={() => setBudgetCurrency('VES')}
              >
                <Text style={[styles.badgeText, budgetCurrency === 'VES' && styles.badgeTextActive]}>Bolívares (Bs)</Text>
              </TouchableOpacity>
            </View>

            <TextInput 
              style={styles.customRateInput}
              placeholder={budgetCurrency === 'USD' ? "Ej. 100.00" : "Ej. 3600.00"}
              placeholderTextColor="#666"
              keyboardType="numeric"
              value={budgetLimit}
              onChangeText={setBudgetLimit}
            />

            <TouchableOpacity style={styles.modalConfirmButton} onPress={() => setBudgetModalVisible(false)}>
              <Text style={styles.modalConfirmButtonText}>Guardar Presupuesto</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalCloseButton} onPress={() => { setBudgetLimit(''); setBudgetModalVisible(false); }}>
              <Text style={styles.modalCloseButtonText}>Eliminar Presupuesto</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </ThemedModal>

      {/* MODAL DE FINALIZAR LISTA */}
      <ThemedModal
        visible={finalizeModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          if (isSelectingAccount) {
            setIsSelectingAccount(false);
          } else {
            setFinalizeModalVisible(false);
          }
        }}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.accountModalContentFixed}>
            {!isSelectingAccount ? (
              <>
                <Text style={styles.modalTitle}>Finalizar Lista de Compras</Text>
                <Text style={styles.modalSubTitle}>Selecciona la fecha y el método de cierre:</Text>

                <View style={styles.datePickerCard}>
                  <Text style={{ color: '#888', fontSize: 12, marginBottom: 4 }}>Fecha de la compra:</Text>
                  <View style={styles.datePickerControls}>
                    <View style={styles.datePickerColumn}>
                      <TouchableOpacity onPress={() => setSelectedDay(Math.min(31, selectedDay + 1))}>
                        <Ionicons name="chevron-up" size={18} color="#a3e635" />
                      </TouchableOpacity>
                      <Text style={styles.datePickerText}>{selectedDay}</Text>
                      <TouchableOpacity onPress={() => setSelectedDay(Math.max(1, selectedDay - 1))}>
                        <Ionicons name="chevron-down" size={18} color="#a3e635" />
                      </TouchableOpacity>
                    </View>
                    <Text style={{ color: '#fff', fontSize: 16 }}>/</Text>
                    <View style={styles.datePickerColumn}>
                      <TouchableOpacity onPress={() => setSelectedMonthIndex((selectedMonthIndex + 1) % 12)}>
                        <Ionicons name="chevron-up" size={18} color="#a3e635" />
                      </TouchableOpacity>
                      <Text style={styles.datePickerText}>{monthsNames[selectedMonthIndex]}</Text>
                      <TouchableOpacity onPress={() => setSelectedMonthIndex((selectedMonthIndex - 1 + 12) % 12)}>
                        <Ionicons name="chevron-down" size={18} color="#a3e635" />
                      </TouchableOpacity>
                    </View>
                    <Text style={{ color: '#fff', fontSize: 16 }}>/</Text>
                    <View style={styles.datePickerColumn}>
                      <TouchableOpacity onPress={() => setSelectedYear(selectedYear + 1)}>
                        <Ionicons name="chevron-up" size={18} color="#a3e635" />
                      </TouchableOpacity>
                      <Text style={styles.datePickerText}>{selectedYear}</Text>
                      <TouchableOpacity onPress={() => setSelectedYear(selectedYear - 1)}>
                        <Ionicons name="chevron-down" size={18} color="#a3e635" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                {[
                  { key: 'solo', label: 'Solo finalizar (Sin saldo)', desc: 'Guarda la lista completada sin tocar cuentas.' },
                  { key: 'ves', label: 'Pague en Bolívares (VES)', desc: 'Descuenta el total de una cuenta en Bolívares.' },
                  { key: 'divisa', label: 'Pague en otra moneda (Divisa)', desc: 'Descuenta el total de una cuenta en USD/EUR.' }
                ].map(opt => (
                  <TouchableOpacity 
                    key={opt.key}
                    style={[styles.optionRadioCard, finalizeOption === opt.key && styles.optionRadioCardActive]}
                    onPress={() => {
                      setFinalizeOption(opt.key);
                      if (opt.key === 'solo') setSelectedPaymentAccount(null);
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.optionRadioTitle}>{opt.label}</Text>
                      <Text style={styles.optionRadioDesc}>{opt.desc}</Text>
                    </View>
                    <Ionicons 
                      name={finalizeOption === opt.key ? "radio-button-on" : "radio-button-off"} 
                      size={20} 
                      color={finalizeOption === opt.key ? "#a3e635" : "#666"} 
                    />
                  </TouchableOpacity>
                ))}

                {finalizeOption !== 'solo' && (
                  <TouchableOpacity 
                    style={styles.selectAccountButton}
                    onPress={() => setIsSelectingAccount(true)}
                  >
                    <Text style={{ color: '#aaa', fontSize: 12 }}>Cuenta seleccionada:</Text>
                    <Text style={{ color: '#a3e635', fontSize: 14, fontWeight: 'bold', marginTop: 2 }}>
                      {selectedPaymentAccount ? `${selectedPaymentAccount.name} (${selectedPaymentAccount.currency})` : 'Toca aquí para elegir cuenta'}
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity style={styles.modalConfirmButton} onPress={handleConfirmFinalize}>
                  <Text style={styles.modalConfirmButtonText}>Confirmar y Finalizar</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.modalCloseButton} onPress={() => setFinalizeModalVisible(false)}>
                  <Text style={styles.modalCloseButtonText}>Cancelar</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.modalTitle}>Seleccionar cuenta</Text>
                <Text style={styles.modalSubTitle}>Elige la cuenta para debitar el pago:</Text>
                
                <ScreenWrapper style={{ maxHeight: 280 }} nestedScrollEnabled={true}>
                  {accounts.filter(acc => {
                    if (finalizeOption === 'ves') {
                      return acc.currency === 'VES';
                    } else if (finalizeOption === 'divisa') {
                      return acc.currency !== 'VES';
                    }
                    return true;
                  }).length === 0 ? (
                    <Text style={styles.emptyText}>
                      {finalizeOption === 'ves' ? 'No tienes cuentas en Bolívares.' : 'No tienes cuentas en divisas (USD/EUR).'}
                    </Text>
                  ) : (
                    accounts.filter(acc => {
                      if (finalizeOption === 'ves') {
                        return acc.currency === 'VES';
                      } else if (finalizeOption === 'divisa') {
                        return acc.currency !== 'VES';
                      }
                      return true;
                    }).map(acc => (
                      <TouchableOpacity 
                        key={acc.id} 
                        style={styles.accountOptionItem}
                        onPress={() => {
                          setSelectedPaymentAccount(acc);
                          setIsSelectingAccount(false);
                        }}
                      >
                        <View>
                          <Text style={styles.accountOptionName}>{acc.name}</Text>
                          <Text style={styles.accountOptionCurrency}>{acc.currency}</Text>
                        </View>
                        <Text style={styles.accountOptionBalance}>
                          {acc.currency === 'VES' ? 'Bs. ' : '$ '}{formatCurrencyValue(acc.balance)}
                        </Text>
                      </TouchableOpacity>
                    ))
                  )}
                </ScreenWrapper>

                <TouchableOpacity style={styles.modalCloseButton} onPress={() => setIsSelectingAccount(false)}>
                  <Text style={styles.modalCloseButtonText}>Volver</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </ThemedModal>
    </View>
    </ThemeContent>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },

  filterTabsRow: { flexDirection: 'row', backgroundColor: '#1a1a1a', borderRadius: 20, padding: 4, marginHorizontal: 16, marginBottom: 12 },
  filterChipTab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 16 },
  filterChipTabActive: { backgroundColor: '#333' },
  filterChipTabText: { color: '#888', fontSize: 13, fontWeight: '600' },
  filterChipTabTextActive: { color: '#fff' },

  totalHeaderCard: { backgroundColor: '#1a1a1a', marginHorizontal: 16, marginBottom: 16, padding: 16, borderRadius: 20 },
  totalHeaderTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  totalLabel: { color: '#888', fontSize: 13 },
  totalProductsCount: { color: '#888', fontSize: 13 },
  totalAmount: { color: '#fff', fontSize: 26, fontWeight: 'bold', marginBottom: 2 },
  totalSubInfo: { color: '#aaa', fontSize: 12, marginBottom: 12 },

  currencyBadgesRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#222', paddingTop: 10, justifyContent: 'space-between' },
  currencyBadge: { backgroundColor: '#2a2a2a', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 15, flex: 1, alignItems: 'center', marginHorizontal: 2 },
  currencyBadgeActive: { backgroundColor: '#a3e635' },
  badgeText: { color: '#aaa', fontSize: 11, fontWeight: 'bold' },
  badgeTextActive: { color: '#000' },

  customRateInput: { backgroundColor: '#1a1a1a', color: '#fff', fontSize: 18, padding: 14, borderRadius: 12, marginBottom: 15, borderWidth: 1, borderColor: '#333', textAlign: 'center' },

  scrollContent: { paddingHorizontal: 16, paddingBottom: 100 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  productsCountText: { color: '#888', fontSize: 13, fontWeight: 'bold' },
  sortButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a1a1a', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 12 },
  sortButtonText: { color: '#888', fontSize: 12 },

  sortDropdownMenu: { backgroundColor: '#1a1a1a', borderRadius: 12, padding: 8, marginBottom: 12 },

  productCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a1a1a', padding: 14, borderRadius: 16, marginBottom: 10 },
  productInfo: { flex: 1 },
  productName: { color: '#fff', fontSize: 15, fontWeight: 'bold', marginBottom: 2 },
  productSub: { color: '#888', fontSize: 12 },
  productPriceContainer: { alignItems: 'flex-end' },
  productPrice: { color: '#a3e635', fontSize: 15, fontWeight: 'bold' },
  productSubPrice: { color: '#888', fontSize: 11, marginTop: 2 },

  floatingButtonsContainer: { position: 'absolute', bottom: 24, left: 24, right: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  fabLeft: { backgroundColor: '#1a1a1a', width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#333', elevation: 5 },
  fabRight: { backgroundColor: '#a3e635', width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', elevation: 5 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  productModalContent: { backgroundColor: '#111', borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 20, height: '80%' },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  modalHeaderTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  priceDisplay: { color: '#fff', fontSize: 36, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },

  inputRow: { backgroundColor: '#1a1a1a', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 15 },
  productNameInput: { color: '#fff', fontSize: 16 },

  selectorsRowCompact: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 15, 
    paddingHorizontal: 4 
  },
  selectorChipCompact: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#1a1a1a', 
    paddingVertical: 10, 
    paddingHorizontal: 12, 
    borderRadius: 10, 
    borderWidth: 1,
    borderColor: '#222'
  },
  selectorChipTextCompact: { 
    color: '#fff', 
    fontSize: 13, 
    fontWeight: '500' 
  },
  inlineQuantityCard: {
    flex: 1,
    marginLeft: 8,
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#222'
  },
  inlineQuantityText: {
    fontSize: 14,
    fontWeight: 'bold'
  },

  dropdownMenu: { backgroundColor: '#1a1a1a', borderRadius: 12, padding: 8, marginBottom: 15 },
  dropdownItem: { paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#222' },
  dropdownText: { color: '#fff', fontSize: 14 },

  numericPad: [NUMERIC_KEYPAD_STYLES.container, { marginTop: 'auto' }],
  padRow: NUMERIC_KEYPAD_STYLES.row,
  padButton: NUMERIC_KEYPAD_STYLES.key,
  padButtonOk: NUMERIC_KEYPAD_STYLES.submitKey,
  padButtonDel: NUMERIC_KEYPAD_STYLES.key,
  padButtonText: NUMERIC_KEYPAD_STYLES.keyText,

  accountModalContentFixed: { backgroundColor: '#1a1a1a', borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 20, maxHeight: '90%' },
  accountModalContent: { backgroundColor: '#1a1a1a', borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 24, maxHeight: '70%' },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  modalSubTitle: { color: '#888', fontSize: 13, marginBottom: 12 },

  datePickerCard: { backgroundColor: '#111', borderRadius: 14, padding: 10, marginBottom: 12, borderWidth: 1, borderColor: '#222', alignItems: 'center' },
  datePickerControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%' },
  datePickerColumn: { alignItems: 'center', paddingHorizontal: 14 },
  datePickerText: { color: '#fff', fontSize: 15, fontWeight: 'bold', marginVertical: 2 },
  
  optionRadioCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111', padding: 12, borderRadius: 14, marginBottom: 8, borderWidth: 1, borderColor: '#222' },
  optionRadioCardActive: { borderColor: '#a3e635' },
  optionRadioTitle: { color: '#fff', fontSize: 13, fontWeight: 'bold', marginBottom: 2 },
  optionRadioDesc: { color: '#888', fontSize: 10 },

  selectAccountButton: { backgroundColor: '#111', padding: 12, borderRadius: 14, marginBottom: 12, borderWidth: 1, borderColor: '#333' },

  modalConfirmButton: { marginTop: 4, paddingVertical: 12, alignItems: 'center', backgroundColor: '#a3e635', borderRadius: 14 },
  modalConfirmButtonText: { color: '#000', fontSize: 14, fontWeight: 'bold' },

  accountOptionItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#111', padding: 16, borderRadius: 14, marginBottom: 10 },
  accountOptionName: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  accountOptionCurrency: { color: '#888', fontSize: 12, marginTop: 2 },
  accountOptionBalance: { color: '#a3e635', fontSize: 16, fontWeight: 'bold' },
  modalCloseButton: { marginTop: 8, paddingVertical: 10, alignItems: 'center', backgroundColor: '#333', borderRadius: 14 },
  modalCloseButtonText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },

  optionsDropdownCard: { position: 'absolute', top: 60, right: 16, backgroundColor: '#1a1a1a', borderRadius: 14, padding: 8, borderWidth: 1, borderColor: '#333', width: 180, elevation: 5 },
  optionItemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#222' },

  emptyText: { color: '#666', fontSize: 13, fontStyle: 'italic', textAlign: 'center', marginVertical: 20 }
});