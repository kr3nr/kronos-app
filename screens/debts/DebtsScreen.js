import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, Text, View, TouchableOpacity,
  Modal, Dimensions, Alert 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../services/supabase';
import CustomHeader from '../../components/CustomHeader';
import ScreenWrapper from '../../components/ScreenWrapper';

const { width } = Dimensions.get('window');
const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const formatCurrencyValue = (num, currency = 'VES') => {
  const n = parseFloat(num || 0);
  if (isNaN(n)) return currency === 'USD' || currency === 'USDT' ? '0.00' : '0,00';
  const parts = n.toFixed(2).split('.');
  if (currency === 'USD' || currency === 'USDT') {
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
  } else {
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return parts.join(',');
  }
};

export default function DebtsScreen({ navigation, userId, accounts, setAccounts, setMovements, setTransactions }) {
  const [activeTab, setActiveTab] = useState('pay'); // 'pay' o 'receive'
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(new Date().getMonth()); 
  const [debtsList, setDebtsList] = useState([]);
  
  // Modales
  const [typeModalVisible, setTypeModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState('pay'); // 'pay' o 'receive'
  const [noDateModalVisible, setNoDateModalVisible] = useState(false);
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [historyTab, setHistoryTab] = useState('liquidated'); // 'liquidated' o 'collected'
  const [helpModalVisible, setHelpModalVisible] = useState(false);

  // Estados para procesar el pago/cobro de una deuda específica
  const [settleModalVisible, setSettleModalVisible] = useState(false);
  const [selectedDebtToSettle, setSelectedDebtToSettle] = useState(null);
  const [accountSelectorModalVisible, setAccountSelectorModalVisible] = useState(false);

  useEffect(() => {
    const loadDebtsAndRecurring = async () => {
      if (!userId) return;
      try {
        const { data: debtsData, error: debtsError } = await supabase
          .from('debts')
          .select('*')
          .eq('user_id', userId);

        if (debtsError) throw debtsError;

        const { data: recurringData, error: recError } = await supabase
          .from('recurring_templates')
          .select('*')
          .eq('user_id', userId);

        if (recError) throw recError;

        const formattedRecurring = (recurringData || []).map(r => ({
          id: `rec-${r.id}`,
          contact_name: r.name,
          type: (r.type || '').toLowerCase() === 'ingreso' ? 'receive' : 'pay',
          amount: r.amount,
          currency: r.currency || 'USD',
          category: r.category,
          description: `Recurrente (${r.frequency || 'Mensual'})`,
          due_date: r.start_date ? `${r.start_date}T00:00:00Z` : null,
          status: 'pending'
        }));

        const combinedList = [...(debtsData || []), ...formattedRecurring];
        setDebtsList(combinedList);
        
        if (setTransactions) setTransactions(combinedList);
      } catch (err) {
        console.error('Error al cargar deudas y recurrentes:', err);
      }
    };

    loadDebtsAndRecurring();
  }, [selectedMonthIndex, userId, setTransactions]);

  const handlePrevMonth = () => setSelectedMonthIndex(prev => (prev > 0 ? prev - 1 : 11));
  const handleNextMonth = () => setSelectedMonthIndex(prev => (prev < 11 ? prev + 1 : 0));

  const filteredDebts = debtsList.filter(d => {
    const dDate = new Date(d.due_date);
    return d.type === activeTab && dDate.getMonth() === selectedMonthIndex && d.status === 'pending';
  });

  const totalPayAmount = debtsList
    .filter(d => d.type === 'pay' && d.status === 'pending')
    .reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);

  const totalReceiveAmount = debtsList
    .filter(d => d.type === 'receive' && d.status === 'pending')
    .reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);

  const noDateDebts = debtsList.filter(d => !d.due_date && d.status === 'pending' && d.type === activeTab);
  const historyDebts = debtsList.filter(d => d.status !== 'pending');

  const handleExecuteSettleDebt = async (targetAccount) => {
    if (!selectedDebtToSettle) return;

    const isPay = selectedDebtToSettle.type === 'pay';
    const amountVal = parseFloat(selectedDebtToSettle.amount) || 0;

    if (isPay && targetAccount.balance < amountVal) {
      Alert.alert('Saldo insuficiente', 'La cuenta seleccionada no tiene suficiente saldo para cubrir este pago.');
      return;
    }

    try {
      const newBalance = isPay ? targetAccount.balance - amountVal : targetAccount.balance + amountVal;

      if (userId) {
        const { error: accError } = await supabase
          .from('accounts')
          .update({ balance: newBalance })
          .eq('id', targetAccount.id);

        if (accError) throw accError;
      }

      const isVirtualRec = String(selectedDebtToSettle.id).startsWith('rec-');
      const newStatus = isPay ? 'liquidated' : 'collected';

      if (!isVirtualRec && userId) {
        const { error: debtError } = await supabase
          .from('debts')
          .update({ status: newStatus })
          .eq('id', selectedDebtToSettle.id);

        if (debtError) throw debtError;
      }

      const now = new Date();
      const movementPayload = {
        user_id: userId,
        account_id: targetAccount.id,
        title: isPay ? `Pago a ${selectedDebtToSettle.contact_name}` : `Cobro de ${selectedDebtToSettle.contact_name}`,
        category: selectedDebtToSettle.category || 'Deudas',
        amount: isPay ? -amountVal : amountVal,
        sub_amount: `${targetAccount.currency === 'VES' ? 'Bs. ' : '$ '}${formatCurrencyValue(amountVal, targetAccount.currency)}`,
        type: isPay ? 'Egresos' : 'Ingresos',
        month_index: selectedMonthIndex,
        day: now.getDate(),
        time: `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
      };

      if (userId) {
        const { data: movData, error: movError } = await supabase
          .from('movements')
          .insert([movementPayload])
          .select();

        if (movError) throw movError;

        if (movData && setMovements) {
          setMovements(prev => [{ ...movData[0], accountId: movData[0].account_id, monthIndex: movData[0].month_index }, ...prev]);
        }
      }

      const updatedAccounts = (accounts || []).map(acc => String(acc.id) === String(targetAccount.id) ? { ...acc, balance: newBalance } : acc);
      if (setAccounts) setAccounts(updatedAccounts);

      const updatedDebts = debtsList.map(d => String(d.id) === String(selectedDebtToSettle.id) ? { ...d, status: newStatus } : d);
      setDebtsList(updatedDebts);
      
      if (setTransactions) setTransactions(updatedDebts);

      setAccountSelectorModalVisible(false);
      setSettleModalVisible(false);
      setSelectedDebtToSettle(null);

      Alert.alert('¡Éxito!', isPay ? 'Deuda marcada como pagada y registrada como egreso.' : 'Deuda marcada como cobrada y registrada como ingreso.');

    } catch (err) {
      console.error('Error al pagar/cobrar deuda:', err);
      Alert.alert('Error', 'No se pudo completar la operación en la base de datos.');
    }
  };

  return (
    <View style={styles.container}>
      <CustomHeader 
        title="Pagar / Cobrar"
        onBackPress={() => navigation('home')}
        rightComponent={
          <View style={styles.topRightActionsRow}>
            <TouchableOpacity 
              onPress={() => setHistoryModalVisible(true)} 
              style={[styles.topIconButton, { marginRight: 8 }]}
            >
              <Ionicons name="time-outline" size={18} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => setHelpModalVisible(true)} 
              style={styles.topIconButton}
            >
              <Ionicons name="help-outline" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        }
      />

      <ScreenWrapper contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
        {/* Pestañas superiores */}
        <View style={styles.segmentRow}>
          <TouchableOpacity 
            style={[styles.segmentBtn, activeTab === 'pay' && styles.segmentBtnActive]}
            onPress={() => setActiveTab('pay')}
          >
            <Text style={[styles.segmentText, activeTab === 'pay' && styles.segmentTextActive]}>Por pagar</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.segmentBtn, activeTab === 'receive' && styles.segmentBtnActive]}
            onPress={() => setActiveTab('receive')}
          >
            <Text style={[styles.segmentText, activeTab === 'receive' && styles.segmentTextActive]}>Por cobrar</Text>
          </TouchableOpacity>
        </View>

        {/* Botones de acción rápida */}
        <View style={styles.quickActionsRow}>
          <TouchableOpacity 
            style={styles.quickActionItem}
            onPress={() => { setModalMode('pay'); setTypeModalVisible(true); }}
          >
            <View style={styles.quickIconCircle}><Ionicons name="arrow-down" size={20} color="#fff" /></View>
            <Text style={styles.quickActionLabel}>Por pagar</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.quickActionItem}
            onPress={() => { setModalMode('receive'); setTypeModalVisible(true); }}
          >
            <View style={styles.quickIconCircle}><Ionicons name="arrow-up" size={20} color="#fff" /></View>
            <Text style={styles.quickActionLabel}>Por cobrar</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.quickActionItem}
            onPress={() => setNoDateModalVisible(true)}
          >
            <View style={styles.quickIconCircle}><Ionicons name="calendar-outline" size={20} color="#fff" /></View>
            <Text style={styles.quickActionLabel}>Sin fecha</Text>
          </TouchableOpacity>
        </View>

        {/* Selector de Mes */}
        <View style={styles.monthSelectorCard}>
          <TouchableOpacity style={styles.monthArrowBtn} onPress={handlePrevMonth}>
            <Ionicons name="chevron-back" size={18} color="#a3e635" />
          </TouchableOpacity>
          <Text style={styles.monthText}>{MONTHS[selectedMonthIndex]}</Text>
          <TouchableOpacity style={styles.monthArrowBtn} onPress={handleNextMonth}>
            <Ionicons name="chevron-forward" size={18} color="#a3e635" />
          </TouchableOpacity>
        </View>

        {/* Resumen Totales */}
        <View style={styles.totalsRow}>
          <View style={styles.totalCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
              <View style={[styles.miniDot, { backgroundColor: '#f87171' }]} />
              <Text style={styles.totalCardLabel}>Por pagar</Text>
            </View>
            <Text style={styles.totalCardVal}>$ {totalPayAmount.toFixed(2)}</Text>
          </View>

          <View style={styles.totalCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
              <View style={[styles.miniDot, { backgroundColor: '#10b981' }]} />
              <Text style={styles.totalCardLabel}>Por cobrar</Text>
            </View>
            <Text style={styles.totalCardVal}>$ {totalReceiveAmount.toFixed(2)}</Text>
          </View>
        </View>

        {/* Lista de deudas del mes */}
        {filteredDebts.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="calendar-outline" size={32} color="#666" style={{ marginBottom: 12 }} />
            <Text style={styles.emptyTitle}>Sin pagos próximos</Text>
            <Text style={styles.emptySubtitle}>Nada vence en este mes. Cambia de mes o registra una deuda para verla aquí.</Text>
          </View>
        ) : (
          filteredDebts.map((debt, index) => (
            <TouchableOpacity 
              key={index} 
              style={styles.proDebtCard}
              onPress={() => {
                setSelectedDebtToSettle(debt);
                setSettleModalVisible(true);
              }}
              activeOpacity={0.8}
            >
              <View style={styles.proCardHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                  <View style={[styles.proIconBox, { backgroundColor: debt.type === 'pay' ? 'rgba(248, 113, 113, 0.12)' : 'rgba(163, 230, 53, 0.12)' }]}>
                    <Ionicons name={debt.type === 'pay' ? 'arrow-down' : 'arrow-up'} size={16} color={debt.type === 'pay' ? '#f87171' : '#a3e635'} />
                  </View>
                  <View style={{ flex: 1, marginRight: 10 }}>
                    <Text style={styles.proContactName} numberOfLines={1}>{debt.contact_name}</Text>
                    <Text style={styles.proCategoryTag} numberOfLines={1}>{debt.description || debt.platform || 'Deuda registrada'}</Text>
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.proAmountText, { color: debt.type === 'pay' ? '#f87171' : '#a3e635' }]}>
                    $ {parseFloat(debt.amount).toFixed(2)}
                  </Text>
                </View>
              </View>

              <View style={styles.proCardDivider} />

              <View style={styles.proCardFooter}>
                <Text style={styles.proStatusHint}>Toca para marcar como {debt.type === 'pay' ? 'pagado' : 'cobrado'}</Text>
                <View style={styles.proActionBadge}>
                  <Text style={styles.proActionBadgeText}>Pagar ✓</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScreenWrapper>

      {/* MODAL: Confirmar liquidación */}
      <Modal visible={settleModalVisible} transparent animationType="slide" onRequestClose={() => setSettleModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.bottomSheetCard}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>
                {selectedDebtToSettle?.type === 'pay' ? 'Marcar como Pagado' : 'Marcar como Cobrado'}
              </Text>
              <TouchableOpacity onPress={() => setSettleModalVisible(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.confirmInfoBox}>
              <Ionicons name="alert-circle-outline" size={24} color="#a3e635" style={{ marginRight: 12 }} />
              <Text style={styles.confirmInfoText}>
                Vas a pagar la deuda de <Text style={{ color: '#fff', fontWeight: 'bold' }}>{selectedDebtToSettle?.contact_name}</Text> por <Text style={{ color: '#fff', fontWeight: 'bold' }}>$ {parseFloat(selectedDebtToSettle?.amount || 0).toFixed(2)}</Text>. Esto actualizará tu saldo e historial.
              </Text>
            </View>
            
            <TouchableOpacity 
              style={styles.primaryActionBtn} 
              onPress={() => {
                setSettleModalVisible(false);
                setAccountSelectorModalVisible(true);
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryActionBtnText}>Seleccionar cuenta y confirmar</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.secondaryActionBtn} 
              onPress={() => setSettleModalVisible(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.secondaryActionBtnText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL: Seleccionar Cuenta */}
      <Modal visible={accountSelectorModalVisible} transparent animationType="slide" onRequestClose={() => setAccountSelectorModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.bottomSheetCard}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Selecciona la cuenta</Text>
              <TouchableOpacity onPress={() => setAccountSelectorModalVisible(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
            <Text style={{ color: '#888', fontSize: 12, marginBottom: 15 }}>
              {selectedDebtToSettle?.type === 'pay' ? '¿De qué cuenta saldrá el dinero para pagar?' : '¿A qué cuenta ingresará el dinero cobrado?'}
            </Text>
            {accounts && accounts.length > 0 ? (
              accounts.map(acc => (
                <TouchableOpacity 
                  key={acc.id} 
                  style={styles.sheetOptionRow}
                  onPress={() => handleExecuteSettleDebt(acc)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="wallet-outline" size={18} color="#a3e635" style={{ marginRight: 12 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sheetOptTitle}>{acc.name}</Text>
                    <Text style={styles.sheetOptSub}>Saldo disp: {formatCurrencyValue(acc.balance, acc.currency)}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#666" />
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyAccountsBox}>
                <Ionicons name="wallet-outline" size={28} color="#f87171" style={{ marginBottom: 8 }} />
                <Text style={{ color: '#f87171', textAlign: 'center', fontSize: 13, fontWeight: 'bold' }}>No tienes cuentas registradas.</Text>
                <Text style={{ color: '#888', textAlign: 'center', fontSize: 11, marginTop: 4 }}>Crea una cuenta en el inicio para poder realizar transacciones.</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* MODAL: Tipo de deuda */}
      <Modal visible={typeModalVisible} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setTypeModalVisible(false)}>
          <View style={styles.bottomSheetCard}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>
                {modalMode === 'pay' ? '¿Qué tipo de deuda es?' : '¿Cómo fue el préstamo?'}
              </Text>
              <TouchableOpacity onPress={() => setTypeModalVisible(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={18} color="#fff" />
              </TouchableOpacity>
            </View>

            {modalMode === 'pay' ? (
              <>
                <TouchableOpacity 
                  style={styles.sheetOptionRow}
                  onPress={() => { setTypeModalVisible(false); navigation('debtForm', { type: 'pay', category: 'borrowed' }); }}
                >
                  <Ionicons name="wallet-outline" size={20} color="#a3e635" style={{ marginRight: 15 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sheetOptTitle}>Me prestaron Dinero</Text>
                    <Text style={styles.sheetOptSub}>Alguien me prestó dinero</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#666" />
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.sheetOptionRow}
                  onPress={() => { setTypeModalVisible(false); navigation('debtForm', { type: 'pay', category: 'financing' }); }}
                >
                  <Ionicons name="card-outline" size={20} color="#3b82f6" style={{ marginRight: 15 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sheetOptTitle}>Financiamiento</Text>
                    <Text style={styles.sheetOptSub}>Compré algo a crédito o en cuotas</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#666" />
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity 
                  style={styles.sheetOptionRow}
                  onPress={() => { setTypeModalVisible(false); navigation('debtForm', { type: 'receive', category: 'lent' }); }}
                >
                  <Ionicons name="cash-outline" size={20} color="#a3e635" style={{ marginRight: 15 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sheetOptTitle}>Presté Dinero</Text>
                    <Text style={styles.sheetOptSub}>El dinero salió de mi cuenta</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#666" />
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.sheetOptionRow}
                  onPress={() => { setTypeModalVisible(false); navigation('debtForm', { type: 'receive', category: 'fiado' }); }}
                >
                  <Ionicons name="storefront-outline" size={20} color="#fbbf24" style={{ marginRight: 15 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sheetOptTitle}>Fiado</Text>
                    <Text style={styles.sheetOptSub}>Vendiste algo y aún no te pagan</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#666" />
                </TouchableOpacity>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* MODAL: Sin fecha */}
      <Modal visible={noDateModalVisible} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setNoDateModalVisible(false)}>
          <View style={styles.bottomSheetCard}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Sin fecha de pago</Text>
              <TouchableOpacity onPress={() => setNoDateModalVisible(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
            {noDateDebts.length === 0 ? (
              <View style={{ padding: 25, alignItems: 'center' }}>
                <Ionicons name="checkmark-circle-outline" size={32} color="#a3e635" style={{ marginBottom: 10 }} />
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 4 }}>Todo en orden</Text>
                <Text style={{ color: '#888', fontSize: 12, textAlign: 'center' }}>Cada deuda tiene su fecha de pago asignada. Sigue así.</Text>
              </View>
            ) : (
              noDateDebts.map((d, i) => (
                <View key={i} style={styles.debtItemCard}>
                  <Text style={styles.debtContactName}>{d.contact_name}</Text>
                  <Text style={styles.debtAmount}>$ {parseFloat(d.amount).toFixed(2)}</Text>
                </View>
              ))
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* MODAL: Historial */}
      <Modal visible={historyModalVisible} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setHistoryModalVisible(false)}>
          <View style={styles.bottomSheetCard}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Historial</Text>
              <TouchableOpacity onPress={() => setHistoryModalVisible(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
            <View style={styles.segmentRow}>
              <TouchableOpacity 
                style={[styles.segmentBtn, historyTab === 'liquidated' && styles.segmentBtnActive]}
                onPress={() => setHistoryTab('liquidated')}
              >
                <Text style={[styles.segmentText, historyTab === 'liquidated' && styles.segmentTextActive]}>Liquidadas</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.segmentBtn, historyTab === 'collected' && styles.segmentBtnActive]}
                onPress={() => setHistoryTab('collected')}
              >
                <Text style={[styles.segmentText, historyTab === 'collected' && styles.segmentTextActive]}>Cobradas</Text>
              </TouchableOpacity>
            </View>
            {historyDebts.length === 0 ? (
              <View style={{ padding: 25, alignItems: 'center' }}>
                <Ionicons name="time-outline" size={32} color="#666" style={{ marginBottom: 10 }} />
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 4 }}>Nada liquidado aún</Text>
                <Text style={{ color: '#888', fontSize: 12, textAlign: 'center' }}>Aquí aparecerán las deudas que termines de pagar o cobrar.</Text>
              </View>
            ) : (
              historyDebts.map((d, i) => (
                <View key={i} style={styles.debtItemCard}>
                  <Text style={styles.debtContactName}>{d.contact_name}</Text>
                  <Text style={[styles.debtAmount, { color: d.status === 'liquidated' ? '#f87171' : '#a3e635' }]}>
                    $ {parseFloat(d.amount).toFixed(2)} ({d.status === 'liquidated' ? 'Pagado' : 'Cobrado'})
                  </Text>
                </View>
              ))
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* MODAL: Ayuda (Tooltip) */}
      <Modal visible={helpModalVisible} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setHelpModalVisible(false)}>
          <View style={styles.tooltipCard}>
            <Text style={styles.tooltipTitle}>💡 Guía de Por Cobrar / Pagar</Text>
            <Text style={styles.tooltipText}>Lleva el control exacto de tus deudas y toca cualquier elemento de la lista para marcarlo como pagado o cobrado eligiendo la cuenta de impacto.</Text>
            <TouchableOpacity onPress={() => setHelpModalVisible(false)} style={styles.tooltipCloseBtn}>
              <Text style={styles.tooltipCloseText}>Entendido ✓</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  topRightActionsRow: { flexDirection: 'row', alignItems: 'center' },
  topIconButton: { width: 36, height: 36, backgroundColor: '#1a1a1a', borderRadius: 18, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#333' },
  scrollBody: { paddingHorizontal: 15, paddingBottom: 40, paddingTop: 10 },
  segmentRow: { flexDirection: 'row', backgroundColor: '#1a1a1a', borderRadius: 20, padding: 4, borderWidth: 1, borderColor: '#222', marginBottom: 20 },
  segmentBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 16 },
  segmentBtnActive: { backgroundColor: '#333' },
  segmentText: { color: '#888', fontSize: 13, fontWeight: 'bold' },
  segmentTextActive: { color: '#fff' },
  quickActionsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  quickActionItem: { flex: 1, backgroundColor: '#1a1a1a', borderRadius: 20, padding: 15, alignItems: 'center', marginHorizontal: 4, borderWidth: 1, borderColor: '#222' },
  quickIconCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#252525', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  quickActionLabel: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  monthSelectorCard: { backgroundColor: '#1a1a1a', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 20, marginBottom: 15, borderWidth: 1, borderColor: '#222' },
  monthArrowBtn: { padding: 6 },
  monthText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  totalsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  totalCard: { flex: 1, backgroundColor: '#1a1a1a', borderRadius: 20, padding: 16, marginHorizontal: 4, borderWidth: 1, borderColor: '#222' },
  miniDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  totalCardLabel: { color: '#888', fontSize: 12, fontWeight: 'bold' },
  totalCardVal: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  emptyCard: { backgroundColor: '#1a1a1a', borderRadius: 24, padding: 30, alignItems: 'center', borderWidth: 1, borderColor: '#222', marginTop: 10 },
  emptyTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 6 },
  emptySubtitle: { color: '#888', fontSize: 12, textAlign: 'center', lineHeight: 18 },
  
  proDebtCard: { backgroundColor: '#1a1a1a', borderRadius: 20, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#222' },
  proCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  proIconBox: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  proContactName: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  proCategoryTag: { color: '#888', fontSize: 11, marginTop: 2 },
  proAmountText: { fontSize: 18, fontWeight: 'bold' },
  proCardDivider: { height: 1, backgroundColor: '#252525', marginVertical: 12 },
  proCardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  proStatusHint: { color: '#888', fontSize: 11 },
  proActionBadge: { backgroundColor: 'rgba(163, 230, 53, 0.1)', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(163, 230, 53, 0.2)' },
  proActionBadgeText: { color: '#a3e635', fontSize: 11, fontWeight: 'bold' },

  debtItemCard: { backgroundColor: '#1a1a1a', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderRadius: 18, marginBottom: 10, borderWidth: 1, borderColor: '#222' },
  debtContactName: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  debtAmount: { fontSize: 15, fontWeight: 'bold' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  bottomSheetCard: { backgroundColor: '#141414', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 35, borderWidth: 1, borderColor: '#222' },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sheetTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  modalCloseBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#1a1a1a', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#333' },
  confirmInfoBox: { flexDirection: 'row', backgroundColor: '#1a1a1a', padding: 14, borderRadius: 16, marginBottom: 20, alignItems: 'center', borderWidth: 1, borderColor: '#222' },
  confirmInfoText: { color: '#ccc', fontSize: 12, flex: 1, lineHeight: 18 },
  primaryActionBtn: { backgroundColor: '#a3e635', paddingVertical: 14, borderRadius: 16, alignItems: 'center', marginBottom: 10 },
  primaryActionBtnText: { color: '#000', fontWeight: 'bold', fontSize: 14 },
  secondaryActionBtn: { backgroundColor: '#1a1a1a', paddingVertical: 14, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#333' },
  secondaryActionBtnText: { color: '#888', fontWeight: 'bold', fontSize: 14 },
  sheetOptionRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a1a1a', padding: 16, borderRadius: 16, marginBottom: 10, borderWidth: 1, borderColor: '#222' },
  sheetOptTitle: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  sheetOptSub: { color: '#888', fontSize: 11, marginTop: 2 },
  emptyAccountsBox: { padding: 25, alignItems: 'center', backgroundColor: '#1a1a1a', borderRadius: 16, borderWidth: 1, borderColor: '#222' },
  tooltipCard: { backgroundColor: '#222', borderRadius: 16, padding: 20, margin: 20, borderWidth: 1, borderColor: '#a3e635', alignSelf: 'center', width: '90%' },
  tooltipTitle: { color: '#a3e635', fontSize: 14, fontWeight: 'bold', marginBottom: 8 },
  tooltipText: { color: '#ccc', fontSize: 12, lineHeight: 18, marginBottom: 15 },
  tooltipCloseBtn: { alignSelf: 'flex-end', backgroundColor: '#a3e635', paddingVertical: 6, paddingHorizontal: 14, borderRadius: 10 },
  tooltipCloseText: { color: '#000', fontSize: 11, fontWeight: 'bold' }
});