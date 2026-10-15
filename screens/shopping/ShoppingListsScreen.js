import ThemedModal from "../../components/ThemedModal";
import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Modal, Dimensions, TouchableWithoutFeedback, ScrollView } from 'react-native';
import { Alert } from '../../services/appAlert';
import { Ionicons } from '@expo/vector-icons';
import CustomHeader from '../../components/CustomHeader';
import { supabase } from '../../services/supabase';
import { logAppError } from '../../services/logger';
import ScreenWrapper from '../../components/ScreenWrapper';
import ThemeContent from '../../components/ThemeContent';

const { width } = Dimensions.get('window');

const formatCurrencyValue = (num) => {
  const n = parseFloat(num || 0);
  if (isNaN(n)) return '0,00';
  const parts = n.toFixed(2).split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return parts.join(',');
};

export default function ShoppingListsScreen({ 
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
  userId
}) {
  const [activeTab, setActiveTab] = useState('activos');

  const [selectedListToComplete, setSelectedListToComplete] = useState(null);
  const [accountModalVisible, setAccountModalVisible] = useState(false);

  // Estados para el menú flotante de 3 puntos en listas completadas
  const [activeMenuId, setActiveMenuId] = useState(null);

  // Estado para el modal "Ver detalles" de listas completadas
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [selectedCompletedList, setSelectedCompletedList] = useState(null);

  // Estado para el sistema de ayuda flotante contextual por módulos
  const [activeTooltip, setActiveTooltip] = useState(null);

  const filteredLists = (shoppingLists || []).filter(l => activeTab === 'activos' ? !l.completed : l.completed);

  // Función auxiliar para pluralizar correctamente "producto / productos"
  const getProductCountText = (count) => {
    return count === 1 ? '1 producto' : `${count} productos`;
  };

  const handleCreateNewList = () => {
    const newList = {
      id: 'list_' + Date.now(),
      title: 'Lista de compras',
      date: new Date().toLocaleDateString(),
      month: 'Sep',
      totalUsd: 0.00,
      productsCount: 0,
      completed: false,
      accountId: null,
      products: []
    };
    
    setShoppingLists([newList, ...(shoppingLists || [])]);
    navigation('shoppingDetail', newList);
  };

const confirmCompleteWithAccount = async (account) => {
    if (!selectedListToComplete) return;

    // Calculamos el total real de la lista seleccionada
    const totalUsd = selectedListToComplete.products 
      ? selectedListToComplete.products.reduce((acc, p) => {
          const pr = parseFloat(p.price || 0);
          const qt = parseFloat(p.quantity || 1);
          return acc + (p.unit === 'Unidad' ? pr * qt : pr);
        }, 0) 
      : (selectedListToComplete.totalUsd || 0);

    const bcvRate = rates?.bcvRate || 1;
    let amountToSubtract = totalUsd;
    if (account.currency === 'VES') {
      amountToSubtract = totalUsd * bcvRate;
    }

    if (parseFloat(account.balance) < amountToSubtract) {
      Alert.alert('Saldo insuficiente', `La cuenta ${account.name} no tiene suficiente saldo.`);
      return;
    }

    const newBalance = parseFloat(account.balance) - amountToSubtract;
    
    // 1. Actualización secuencial segura para evitar choques en Web / IndexedDB
    const updatedAccounts = accounts.map(acc => {
      if (acc.id === account.id) {
        return { ...acc, balance: newBalance };
      }
      return acc;
    });
    setAccounts(updatedAccounts);

    // Actualizamos el saldo de la cuenta en Supabase de forma aislada
    if (userId) {
      try {
        const { error: accError } = await supabase
          .from('accounts')
          .update({ balance: newBalance })
          .eq('id', account.id)
          .eq('user_id', userId);

        if (accError) {
          logAppError('Actualizar Cuenta Supabase', accError, true);
        }
      } catch (error) {
        logAppError('Excepción Actualizar Cuenta', error, true);
      }
    }

    // Creamos la marca temporal exacta con fecha y hora
    const now = new Date();
    const formattedDate = now.toLocaleDateString();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const timeString = `${formattedDate}, ${hours}:${minutes}`;

    const newMovementTitle = `Pago: ${selectedListToComplete.title}`;
    const finalAmount = -Math.abs(amountToSubtract);

    // Payload unificado adaptado perfectamente a la tabla movements de Supabase
    const newMovementPayload = {
      user_id: userId || null,
      account_id: account.id,
      title: newMovementTitle,
      category: 'Supermercado',
      amount: finalAmount,
      sub_amount: `${account.currency === 'VES' ? 'Bs. ' : '$ '}${formatCurrencyValue(Math.abs(finalAmount), account.currency)}`,
      type: 'Egresos',
      month_index: now.getMonth(),
      day: now.getDate(),
      time: timeString
    };

    // Guardamos el movimiento en la tabla movements de Supabase de forma secuencial
    if (userId) {
      try {
        const { data, error } = await supabase
          .from('movements')
          .insert([newMovementPayload])
          .select();

        if (error) {
          logAppError('Insertar Movimiento Supabase', error, true);
        } else if (data && data.length > 0) {
          const createdMovement = {
            ...data[0],
            accountId: data[0].account_id,
            monthIndex: data[0].month_index
          };
          setMovements([createdMovement, ...movements]);
        }
      } catch (error) {
        logAppError('Excepción Insertar Movimiento', error, true);
      }
    } else {
      const localMovement = {
        id: Date.now().toString(),
        accountId: account.id,
        account_id: account.id,
        title: newMovementTitle,
        amount: finalAmount,
        currency: account.currency,
        category: 'Supermercado',
        time: timeString,
        type: 'Egresos',
        month_index: now.getMonth(),
        day: now.getDate()
      };
      setMovements([localMovement, ...movements]);
    }

    // Actualizamos la lista como completada, asociando explícitamente ambas nomenclaturas de cuenta
const updatedLists = shoppingLists.map(l => l.id === selectedListToComplete.id ? {  
      ...l,  
      completed: true,  
      accountName: account.name,
      account_name: account.name, 
      completedAt: timeString  
    } : l);

    setShoppingLists(updatedLists);
    
    // 🔔 ¡ESTO ES LO QUE FALTABA! Notificamos al componente padre (App.js) para que guarde el cambio globalmente
    const targetList = updatedLists.find(l => l.id === selectedListToComplete.id);
    if (onSaveList && targetList) {
      onSaveList(targetList);
    }

    // Sincronizamos también el cambio directamente en la tabla shopping_lists de Supabase si hay userId
    if (userId) {
      try {
        if (targetList) {
          await supabase
            .from('shopping_lists')
            .upsert([
              {
                id: targetList.id,
                user_id: userId,
                title: targetList.title,
                date: targetList.date,
                total_usd: totalUsd,
                products_count: targetList.products?.length || 0,
                completed: true,
                account_name: account.name,
                products: targetList.products || [],
                icon: targetList.icon || 'basket-outline'
              }
            ], { onConflict: 'id' });
        }
      } catch (err) {
        logAppError('Error al sincronizar lista pagada en Supabase', err, false);
      }
    }

    // Actualizamos también la lista seleccionada actual para reflejar los cambios al instante en el modal
    if (targetList) {
      setSelectedCompletedList(targetList);
    }
    
    // Cerramos modales de selección de cuenta
    setAccountModalVisible(false);
    setSelectedListToComplete(null);

    // 2. Confirmación visual clara e informativa al usuario
    Alert.alert(
      '¡Pago y Movimiento Registrado!', 
      `Se ha descontado exitosamente de la cuenta "${account.name}" y se ha vinculado al historial de movimientos.`
    );
  };

  const handleReuseList = (list) => {
    const clonedList = {
      ...list,
      id: 'list_' + Date.now(),
      title: `${list.title} (Copia)`,
      completed: false,
      completedAt: null,
      accountName: null
    };
    setShoppingLists([clonedList, ...shoppingLists]);
    setActiveTab('activos');
    setActiveMenuId(null);
  };

  const handleDeleteCompletedList = async (listId) => {
    try {
      setActiveMenuId(null);
      if (onDeleteList) {
        await onDeleteList(listId);
      }
    } catch (error) {
      logAppError('Eliminar Lista Completada', error, false);
    }
  };

  return (
    <ThemeContent>
    <View style={styles.container}>
      <CustomHeader 
        title="Lista de compras"
        onBackPress={() => navigation('home')}
        helpTitle="Listas de compras"
        helpTips={[
          'Cambia entre Activas y Completadas para organizar tus listas.',
          'Toca una lista para ver o editar sus productos.',
          'El gráfico resume el gasto de las listas finalizadas; usa + para crear una.',
        ]}
      />

      <ScreenWrapper contentContainerStyle={styles.scrollContent}>
        {/* Pestañas Activas / Completadas */}
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'activos' && styles.tabButtonActive]}
            onPress={() => setActiveTab('activos')}
          >
            <Text style={[styles.tabText, activeTab === 'activos' && styles.tabTextActive]}>Activas</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'completados' && styles.tabButtonActive]}
            onPress={() => setActiveTab('completados')}
          >
            <Text style={[styles.tabText, activeTab === 'completados' && styles.tabTextActive]}>Completadas</Text>
          </TouchableOpacity>
        </View>

        {/* Sección de Egresos de Mercado */}
        <View style={styles.chartCard}>
          <Text style={styles.chartHeaderTitle}>EGRESOS DE MERCADO</Text>
          <View style={styles.barsRow}>
            {['Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep'].map((month) => {
              const completedInMonth = (shoppingLists || []).filter(l => l.completed && l.month === month);
              const val = completedInMonth.reduce((acc, l) => acc + (l.totalUsd || 0), 0);
              const hasData = val > 0;

              return (
                <View key={month} style={styles.barColumn}>
                  {hasData && <Text style={styles.barValueText}>${formatCurrencyValue(val)}</Text>}
                  <View style={[styles.barPillar, hasData && styles.barPillarActive]} />
                  <Text style={styles.barMonthText}>{month}</Text>
                </View>
              );
            })}
          </View>

          {activeTooltip === 'chart' && (
            <View style={styles.tooltipCard}>
              <Text style={styles.tooltipTitle}>📊 Gráfico de Egresos</Text>
              <Text style={styles.tooltipText}>Aquí visualizas el total gastado en tus compras de supermercado por mes de forma automática según las listas que hayas finalizado.</Text>
              <TouchableOpacity onPress={() => setActiveTooltip('lists')} style={styles.tooltipNextBtn}>
                <Text style={styles.tooltipNextText}>Siguiente: Listas &gt;</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Listas de Compras */}
        <View style={styles.listsSection}>
          {filteredLists.length === 0 ? (
            <Text style={styles.emptyText}>No hay listas {activeTab}.</Text>
          ) : (
            filteredLists.map((item, index) => {
              const realCount = item.products ? item.products.length : (item.productsCount || 0);
              const realTotal = item.products 
                ? item.products.reduce((acc, p) => {
                    const pr = parseFloat(p.price || 0);
                    const qt = parseFloat(p.quantity || 1);
                    const itemTotal = p.unit === 'Unidad' ? pr * qt : pr;
                    return acc + itemTotal;
                  }, 0) 
                : (item.totalUsd || 0);

              const cardZIndex = filteredLists.length - index;

              return (
                <View key={item.id} style={[styles.cardWrapper, { zIndex: activeMenuId === item.id ? 999 : cardZIndex }]}>
                  <TouchableOpacity 
                    style={styles.listCard}
                    activeOpacity={0.2}
                    onPress={() => {
                      if (item.completed) {
                        // Si ya está completada, al tocarla directamente abrimos su modal de detalles en lugar de editarla
                        const freshList = (shoppingLists || []).find(l => l.id === item.id) || item;
                        setSelectedCompletedList(freshList);
                        setDetailsModalVisible(true);
                        setActiveMenuId(null);
                      } else {
                        // Si está activa, entra normalmente a la pantalla de detalle para editar productos
                        navigation('shoppingDetail', {
                          id: item.id,
                          title: item.title,
                          products: item.products,
                          completed: item.completed,
                          accountName: item.accountName || item.account_name,
                          completedAt: item.completedAt,
                          totalUsd: item.totalUsd,
                          icon: item.icon
                        });
                      }
                    }}
                  >
                    <View style={styles.listIconBox}>
                      <Ionicons name="basket-outline" size={20} color={item.completed ? "#888" : "#a3e635"} />
                    </View>

                    <View style={styles.listInfo}>
                      <Text style={styles.listTitle}>{item.title}</Text>
                      <Text style={styles.listSubtitle}>
                        {realCount > 0 ? `${getProductCountText(realCount)} · ${item.date}` : 'Sin productos'}
                        {item.completed && (item.accountName || item.account_name) ? ` · Pagado con ${item.accountName || item.account_name}` : ''}
                      </Text>
                    </View>

                    <Text style={styles.listAmount}>${formatCurrencyValue(realTotal)}</Text>

                    {item.completed ? (
                      <TouchableOpacity 
                        style={styles.menuIconButton} 
                        onPress={() => setActiveMenuId(activeMenuId === item.id ? null : item.id)}
                      >
                        <Ionicons name="ellipsis-horizontal" size={18} color="#aaa" />
                      </TouchableOpacity>
                    ) : (
                      <Ionicons name="chevron-forward" size={16} color="#666" style={{ marginLeft: 4 }} />
                    )}
                  </TouchableOpacity>

                  {activeMenuId === item.id && (
                    <View style={styles.floatingActionMenu}>
                      <TouchableOpacity 
                        style={styles.menuOptionRow} 
                        onPress={() => {
                          const freshList = (shoppingLists || []).find(l => l.id === item.id) || item;
                          setSelectedCompletedList(freshList);
                          setDetailsModalVisible(true);
                          setActiveMenuId(null);
                        }}
                      >
                        <Ionicons name="eye-outline" size={16} color="#fff" style={{ marginRight: 8 }} />
                        <Text style={styles.menuOptionText}>Ver detalles</Text>
                      </TouchableOpacity>

                      <TouchableOpacity 
                        style={styles.menuOptionRow} 
                        onPress={() => handleReuseList(item)}
                      >
                        <Ionicons name="copy-outline" size={16} color="#a3e635" style={{ marginRight: 8 }} />
                        <Text style={[styles.menuOptionText, { color: '#a3e635' }]}>Reutilizar</Text>
                      </TouchableOpacity>

                      <TouchableOpacity 
                        style={[styles.menuOptionRow, { borderBottomWidth: 0 }]} 
                        onPress={() => handleDeleteCompletedList(item.id)}
                      >
                        <Ionicons name="trash-outline" size={16} color="#f87171" style={{ marginRight: 8 }} />
                        <Text style={[styles.menuOptionText, { color: '#f87171' }]}>Eliminar</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })
          )}

          {activeTooltip === 'lists' && (
            <View style={styles.tooltipCard}>
              <Text style={styles.tooltipTitle}>📋 Gestión de Listas</Text>
              <Text style={styles.tooltipText}>Crea listas activas con el botón '+'. Al completarlas, usa el menú de 3 puntos en las completadas para ver detalles, reutilizarlas o eliminarlas.</Text>
              <TouchableOpacity onPress={() => setActiveTooltip(null)} style={styles.tooltipNextBtn}>
                <Text style={styles.tooltipNextText}>Cerrar ayuda ✓</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScreenWrapper>

      {activeTab === 'activos' && (
        <TouchableOpacity style={styles.fabButton} onPress={handleCreateNewList}>
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      )}

{/* MODAL VER DETALLES DE LISTA COMPLETADA */}
      {detailsModalVisible && selectedCompletedList && (
        <ThemedModal
          visible={detailsModalVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => {
            setDetailsModalVisible(false);
            setSelectedCompletedList(null);
          }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              {/* 1. Cabecera Fija */}
              <View style={styles.modalHeaderRow}>
                <Text style={styles.modalHeaderTitle} numberOfLines={1}>{selectedCompletedList.title}</Text>
                <TouchableOpacity
                  onPress={() => {
                    setDetailsModalVisible(false);
                    setSelectedCompletedList(null);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.closeModalText}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* 2. Contenido Deslizable con flex: 1 */}
              <ScrollView
                style={{ flex: 1, marginVertical: 4 }}
                showsVerticalScrollIndicator={true}
                nestedScrollEnabled={true}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingBottom: 20 }}
              >
                <View style={styles.detailsSummaryCard}>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Monto total:</Text>
                    <Text style={styles.summaryValueHighlight}>
                      ${formatCurrencyValue(
                        selectedCompletedList.products
                          ? selectedCompletedList.products.reduce((acc, p) => {
                              const pr = parseFloat(p.price || 0);
                              const qt = parseFloat(p.quantity || 1);
                              return acc + (p.unit === 'Unidad' ? pr * qt : pr);
                            }, 0)
                          : selectedCompletedList.totalUsd
                      )}
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Fecha de finalización:</Text>
                    <Text style={styles.summaryValue}>{selectedCompletedList.completedAt || selectedCompletedList.date || 'N/A'}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Cuenta de pago:</Text>
                    <Text style={styles.summaryValue}>
                      {selectedCompletedList.accountName || selectedCompletedList.account_name || 'Ninguna (Sin pagar)'}
                    </Text>
                  </View>
                </View>

                {/* Botón de pago / cambio de cuenta */}
                <TouchableOpacity
                  style={styles.payNowButtonInModal}
                  activeOpacity={0.8}
                  onPress={() => {
                    setSelectedListToComplete(selectedCompletedList);
                    setDetailsModalVisible(false);
                    setAccountModalVisible(true);
                  }}
                >
                  <Ionicons name="card-outline" size={18} color="#000" style={{ marginRight: 6 }} />
                  <Text style={styles.payNowButtonText}>
                    {selectedCompletedList.accountName || selectedCompletedList.account_name ? 'Cambiar cuenta / Repagar' : 'Pagar lista con cuenta'}
                  </Text>
                </TouchableOpacity>

                <Text style={styles.productsHeaderTitle}>Productos comprados ({selectedCompletedList.products?.length || 0}):</Text>

                {(!selectedCompletedList.products || selectedCompletedList.products.length === 0) ? (
                  <Text style={styles.emptyText}>No hay productos registrados en esta lista.</Text>
                ) : (
                  selectedCompletedList.products.map((p, idx) => {
                    const pr = parseFloat(p.price || 0);
                    const qt = parseFloat(p.quantity || 1);
                    const productTotal = p.unit === 'Unidad' ? pr * qt : pr;
                    const formattedQty = p.unit === 'Unidad' ? p.quantity : qt.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

                    return (
                      <View key={idx} style={styles.productDetailItem}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.productDetailName}>{p.name}</Text>
                          <Text style={styles.productDetailSub}>
                            {formattedQty} {p.unit?.toLowerCase()} {p.unit === 'Unidad' && pr > 0 ? `· $${formatCurrencyValue(pr)} c/u` : ''}
                          </Text>
                        </View>
                        <Text style={styles.productDetailTotal}>${formatCurrencyValue(productTotal)}</Text>
                      </View>
                    );
                  })
                )}
              </ScrollView>

              {/* 3. Botón Fijo Inferior */}
              <TouchableOpacity
                style={[styles.modalCloseButton, { marginTop: 8 }]}
                activeOpacity={0.8}
                onPress={() => {
                  setDetailsModalVisible(false);
                  setSelectedCompletedList(null);
                }}
              >
                <Text style={styles.modalCloseButtonText}>Cerrar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ThemedModal>
      )}


      {/* Modal selección de cuenta */}
      <ThemedModal
        visible={accountModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setAccountModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalHeaderTitle}>Seleccionar cuenta de pago</Text>
              <TouchableOpacity onPress={() => setAccountModalVisible(false)}>
                <Text style={styles.closeModalText}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubTitle}>Elige de qué cuenta deseas descontar el total de la compra:</Text>
            
            <ScreenWrapper style={{ maxHeight: 250 }} nestedScrollEnabled={true}>
              {accounts.length === 0 ? (
                <Text style={styles.emptyText}>No tienes cuentas registradas.</Text>
              ) : (
                accounts.map(acc => (
                  <TouchableOpacity 
                    key={acc.id} 
                    style={styles.accountOptionItem}
                    onPress={() => confirmCompleteWithAccount(acc)}
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

            <TouchableOpacity style={styles.modalCloseButton} onPress={() => setAccountModalVisible(false)}>
              <Text style={styles.modalCloseButtonText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ThemedModal>
    </View>
    </ThemeContent>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  scrollContent: { padding: 15, paddingBottom: 100 },
  tabContainer: { flexDirection: 'row', backgroundColor: '#1a1a1a', borderRadius: 25, padding: 4, marginBottom: 20 },
  tabButton: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 20 },
  tabButtonActive: { backgroundColor: '#333' },
  tabText: { color: '#888', fontSize: 14, fontWeight: '600' },
  tabTextActive: { color: '#fff' },
  chartCard: { backgroundColor: '#1a1a1a', borderRadius: 20, padding: 16, marginBottom: 20 },
  chartHeaderTitle: { color: '#888', fontSize: 12, fontWeight: 'bold', marginBottom: 15 },
  barsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 120, paddingHorizontal: 4 },
  barColumn: { alignItems: 'center', flex: 1 },
  barValueText: { color: '#aaa', fontSize: 9, marginBottom: 4 },
  barPillar: { width: 24, height: 80, backgroundColor: '#111', borderRadius: 8 },
  barPillarActive: { backgroundColor: '#a3e635' },
  barMonthText: { color: '#888', fontSize: 11, marginTop: 8 },
  listsSection: { marginBottom: 20 },
  cardWrapper: { position: 'relative', marginBottom: 12 },
  listCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a1a1a', padding: 16, borderRadius: 16 },
  listIconBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#111', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  listInfo: { flex: 1 },
  listTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 2 },
  listSubtitle: { color: '#888', fontSize: 12 },
  listAmount: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginRight: 12 },
  menuIconButton: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#111', justifyContent: 'center', alignItems: 'center', marginLeft: 4 },
  floatingActionMenu: { position: 'absolute', top: 65, right: 16, backgroundColor: '#1a1a1a', borderRadius: 14, padding: 6, borderWidth: 1, borderColor: '#333', width: 150, zIndex: 9999, elevation: 10 },
  menuOptionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: '#222' },
  menuOptionText: { color: '#fff', fontSize: 13, fontWeight: '500' },
  fabButton: { position: 'absolute', bottom: 25, right: 25, backgroundColor: '#a3e635', width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 5 },
  fabText: { color: '#000', fontSize: 32, fontWeight: 'bold', lineHeight: 34 },
  emptyText: { color: '#666', fontSize: 13, fontStyle: 'italic', textAlign: 'center', marginVertical: 20 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
modalCard: {
    backgroundColor: '#111',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    height: '82%', // Cambiamos maxHeight por height fija para asegurar el espacio de flexbox
    borderTopWidth: 1,
    borderTopColor: '#222',
    justifyContent: 'space-between' // Distribuye elementos arriba, centro y abajo
  },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  closeModalText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  modalHeaderTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  modalSubTitle: { color: '#888', fontSize: 13, marginBottom: 15 },
  tooltipCard: { backgroundColor: '#222', borderRadius: 16, padding: 16, marginTop: 15, borderWidth: 1, borderColor: '#a3e635', width: '100%' },
  tooltipTitle: { color: '#a3e635', fontSize: 14, fontWeight: 'bold', marginBottom: 6 },
  tooltipText: { color: '#ccc', fontSize: 12, lineHeight: 18, marginBottom: 12 },
  tooltipNextBtn: { alignSelf: 'flex-end', backgroundColor: '#a3e635', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 10 },
  tooltipNextText: { color: '#000', fontSize: 11, fontWeight: 'bold' },
  detailsSummaryCard: { backgroundColor: '#1a1a1a', borderRadius: 14, padding: 12, marginBottom: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  summaryLabel: { color: '#888', fontSize: 13 },
  summaryValue: { color: '#fff', fontSize: 13, fontWeight: '500' },
  summaryValueHighlight: { color: '#a3e635', fontSize: 15, fontWeight: 'bold' },
  payNowButtonInModal: { flexDirection: 'row', backgroundColor: '#a3e635', paddingVertical: 12, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  payNowButtonText: { color: '#000', fontSize: 14, fontWeight: 'bold' },
  productsHeaderTitle: { color: '#aaa', fontSize: 12, fontWeight: 'bold', marginBottom: 8 },
  productDetailItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1a1a1a', padding: 10, borderRadius: 10, marginBottom: 6 },
  productDetailName: { color: '#fff', fontSize: 14, fontWeight: 'bold', marginBottom: 2 },
  productDetailSub: { color: '#888', fontSize: 11 },
  productDetailTotal: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  accountOptionItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1a1a1a', padding: 16, borderRadius: 14, marginBottom: 10 },
  accountOptionName: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  accountOptionCurrency: { color: '#888', fontSize: 12, marginTop: 2 },
  accountOptionBalance: { color: '#a3e635', fontSize: 16, fontWeight: 'bold' },
  modalCloseButton: { marginTop: 15, paddingVertical: 12, alignItems: 'center', backgroundColor: '#333', borderRadius: 14 },
  modalCloseButtonText: { color: '#fff', fontSize: 14, fontWeight: 'bold' }
});