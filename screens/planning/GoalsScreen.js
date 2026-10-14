import ThemedModal from "../../components/ThemedModal";
import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  SafeAreaView,
  Dimensions,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { Alert } from '../../services/appAlert';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../services/supabase';
import ContextualHelp from '../../components/ContextualHelp';
import ScreenWrapper from '../../components/ScreenWrapper';
import { NUMERIC_KEYPAD_STYLES } from '../../components/numericKeypadStyles';

const { width } = Dimensions.get('window');

// Lista ampliada de iconos disponibles
const AVAILABLE_ICONS = [
  'flag-outline',
  'shield-checkmark',
  'wallet-outline',
  'school-outline',
  'briefcase-outline',
  'home-outline',
  'airplane-outline',
  'car-outline',
  'laptop-outline',
  'phone-portrait-outline',
  'book-outline',
  'card-outline',
  'cash-outline',
  'gift-outline',
  'heart-outline',
];

// Paleta ampliada de colores
const AVAILABLE_COLORS = [
  '#94a3b8', // Gris / Plateado
  '#f87171', // Rojo suave
  '#fb923c', // Naranja
  '#fbbf24', // Amarillo / Ámbar
  '#a3e635', // Verde Lima principal
  '#4ade80', // Verde esmeralda
  '#38bdf8', // Celeste / Azul claro
];

export default function GoalsScreen({ userId, navigation }) {
  const [currentView, setCurrentView] = useState('main'); // 'main', 'wizard', 'detail', 'success'
  const [activeTab, setActiveTab] = useState('Activas'); // 'Activas', 'Completadas'
  const [detailTab, setDetailTab] = useState('Resumen'); // 'Resumen', 'Historial'
  const [loading, setLoading] = useState(true);
  
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [actionModal, setActionModal] = useState(null); // 'agregar', 'retirar'
  const [helpModalVisible, setHelpModalVisible] = useState(false);
  const [settingsMenuVisible, setSettingsMenuVisible] = useState(false);

  const [savingsList, setSavingsList] = useState([]);
  const [goalHistory, setGoalHistory] = useState([]);
  const [userAccounts, setUserAccounts] = useState([]);

  // Estados del asistente / edición
  const [wizardStep, setWizardStep] = useState(1);
  const [isCustomCreation, setIsCustomCreation] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState(null);

  const [newGoalName, setNewGoalName] = useState('');
  const [newGoalAmount, setNewGoalAmount] = useState('0.00');
  const [newCurrentAmount, setNewCurrentAmount] = useState('0.00');
  const [newGoalColor, setNewGoalColor] = useState('#a3e635');
  const [newGoalIcon, setNewGoalIcon] = useState('flag-outline');
  const [targetDate, setTargetDate] = useState('Seleccionar');
  const [selectedAccount, setSelectedAccount] = useState('Principal');
  const [initialSavingsAmount, setInitialSavingsAmount] = useState('0.00');

  const [inputAmount, setInputAmount] = useState('0');
  const [activeKeypadField, setActiveKeypadField] = useState('target');

  const fetchGoals = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;

      if (data) {
        const formatted = data.map(item => ({
          id: item.id,
          name: item.name,
          current: parseFloat(item.current) || 0,
          target: parseFloat(item.target) || 0,
          color: item.color || '#a3e635',
          icon: item.icon || 'flag-outline',
          isProtected: item.is_protected || false,
          isCustom: true,
        }));
        setSavingsList(formatted);
      }
    } catch (error) {
      console.error('Error al cargar metas:', error.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const fetchGoalHistory = useCallback(async (goalId) => {
    if (!goalId) return;
    try {
      const { data, error } = await supabase
        .from('goal_movements')
        .select('*')
        .eq('goal_id', goalId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setGoalHistory(data);
      } else {
        setGoalHistory([]);
      }
    } catch (err) {
      console.error('Error al cargar historial de meta:', err);
    }
  }, []);

  const fetchAccounts = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', userId);

      if (!error && data) {
        setUserAccounts(data);
      }
    } catch (error) {
      console.error('Error al cargar cuentas:', error.message);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      fetchGoals();
      fetchAccounts();
    }
  }, [userId, fetchGoals, fetchAccounts]);

  const handleFactoryReset = async () => {
    Alert.alert(
      "Reiniciar a fábrica",
      "¿Estás seguro de que deseas eliminar todas tus metas y fondos creados?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Sí, eliminar todo",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              const { error } = await supabase
                .from('goals')
                .delete()
                .eq('user_id', userId);

              if (error) throw error;

              setSavingsList([]);
              setSettingsMenuVisible(false);
              Alert.alert("Éxito", "Se han restablecido los parámetros de fábrica.");
            } catch (error) {
              console.error('Error al reiniciar:', error.message);
              Alert.alert("Error", "No se pudieron eliminar las metas.");
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleFinancialKeyPress = (val, currentVal, setVal) => {
    if (val === 'C') {
      setVal('0.00');
    } else if (val === 'del') {
      const digitsOnly = currentVal.replace(/\D/g, '');
      if (digitsOnly.length <= 1) {
        setVal('0.00');
      } else {
        const newDigits = digitsOnly.slice(0, -1);
        const num = parseInt(newDigits, 10) / 100;
        setVal(num.toFixed(2));
      }
    } else {
      const digitsOnly = currentVal.replace(/\D/g, '');
      const newDigits = digitsOnly === '0' ? val : digitsOnly + val;
      const num = parseInt(newDigits, 10) / 100;
      setVal(num.toFixed(2));
    }
  };

  const handleKeyPress = (val, currentVal, setVal) => {
    if (val === 'C') {
      setVal('0');
    } else if (val === 'del') {
      setVal(currentVal.length > 1 ? currentVal.slice(0, -1) : '0');
    } else {
      setVal(currentVal === '0' ? val : currentVal + val);
    }
  };

  const handleSaveGoal = async () => {
    try {
      const targetVal = parseFloat(newGoalAmount) || 0;
      const currentVal = parseFloat(newCurrentAmount) || 0;
      const initialVal = parseFloat(initialSavingsAmount) || 0;

      if (isEditing && editingGoalId) {
        const { error } = await supabase
          .from('goals')
          .update({
            name: newGoalName || 'Meta Personalizada',
            target: targetVal,
            current: currentVal,
            color: newGoalColor,
            icon: newGoalIcon,
          })
          .eq('id', editingGoalId);

        if (error) throw error;

        setSavingsList(savingsList.map(item => 
          item.id === editingGoalId 
            ? { ...item, name: newGoalName, target: targetVal, current: currentVal, color: newGoalColor, icon: newGoalIcon }
            : item
        ));

        setCurrentView('main');
        setIsEditing(false);
        setEditingGoalId(null);
        Alert.alert("¡Éxito!", "Meta actualizada correctamente.");
      } else {
        const newRecord = {
          user_id: userId,
          name: newGoalName || 'Nueva Meta',
          current: initialVal,
          target: targetVal,
          color: newGoalColor,
          icon: newGoalIcon,
          is_protected: false,
        };

        const { data, error } = await supabase
          .from('goals')
          .insert([newRecord])
          .select()
          .single();

        if (error) throw error;

        if (data) {
          setSavingsList([
            ...savingsList,
            {
              id: data.id,
              name: data.name,
              current: parseFloat(data.current),
              target: parseFloat(data.target),
              color: data.color,
              icon: data.icon,
              isProtected: data.is_protected,
              isCustom: true,
            },
          ]);
        }
        setCurrentView('success');
      }
    } catch (error) {
      console.error('Error al guardar meta:', error.message);
      Alert.alert('Error', 'No se pudo guardar la información en la base de datos.');
    }
  };

  const handleUpdateBalance = async (type) => {
    if (!selectedGoal) return;
    const val = parseFloat(inputAmount) || 0;
    if (val <= 0) {
      Alert.alert('Monto inválido', 'Ingresa una cantidad mayor a 0.');
      return;
    }

    const newCurrent = type === 'agregar' 
      ? selectedGoal.current + val 
      : Math.max(0, selectedGoal.current - val);

    try {
      const { error } = await supabase
        .from('goals')
        .update({ current: newCurrent })
        .eq('id', selectedGoal.id);

      if (error) throw error;

      try {
        await supabase.from('goal_movements').insert([{
          goal_id: selectedGoal.id,
          type: type === 'agregar' ? 'Ingreso' : 'Retiro',
          amount: val,
          description: type === 'agregar' ? 'Aporte a meta' : 'Retiro de meta',
          created_at: new Date().toISOString()
        }]);
      } catch (histErr) {
        console.log('Tabla goal_movements opcional:', histErr);
      }

      setSavingsList(savingsList.map(s => {
        if (s.id === selectedGoal.id) {
          return { ...s, current: newCurrent };
        }
        return s;
      }));

      setSelectedGoal({ ...selectedGoal, current: newCurrent });
      setInputAmount('0');
      setActionModal(null);
      Alert.alert('¡Éxito!', type === 'agregar' ? 'Ahorro registrado correctamente.' : 'Retiro registrado correctamente.');
    } catch (error) {
      console.error('Error al actualizar saldo:', error.message);
      Alert.alert('Error', 'No se pudo actualizar el saldo de la meta.');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#a3e635" />
      </SafeAreaView>
    );
  }

  const filteredSavingsList = savingsList.filter(goal => {
    const isCompleted = goal.target > 0 && goal.current >= goal.target;
    if (activeTab === 'Activas') {
      return !isCompleted;
    } else {
      return isCompleted;
    }
  });

  // ==========================================
  // VISTA 1: PRINCIPAL
  // ==========================================
  if (currentView === 'main') {
    const fixedDefaultCards = [
      {
        id: 'default-1',
        name: 'Fondo de Emergencia',
        current: 0,
        color: '#f87171',
        icon: 'shield-checkmark',
      },
      {
        id: 'default-2',
        name: 'Ahorros Generales',
        current: 0,
        color: '#a3e635',
        icon: 'wallet-outline',
      },
    ];

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.iconButton} onPress={() => navigation('home')}>
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Metas y Ahorros</Text>
          <View style={styles.headerRightButtons}>
            <TouchableOpacity style={[styles.iconButton, { marginRight: 8 }]} onPress={() => setSettingsMenuVisible(true)}>
              <Ionicons name="ellipsis-vertical" size={18} color="#fff" />
            </TouchableOpacity>
            <ContextualHelp title="Metas y ahorros" tips={[
              'Elige una meta sugerida o crea una meta personalizada.',
              'Actualiza el progreso al agregar aportes o retiros.',
              'El menú de opciones permite administrar la meta seleccionada.',
            ]} />
          </View>
        </View>

        <ScreenWrapper contentContainerStyle={styles.scrollContent}>
          <Text style={styles.sectionLabel}>AHORROS</Text>
          <View style={styles.gridContainer}>
            {fixedDefaultCards.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.savingCard}
                onPress={() => {
                  setIsEditing(false);
                  setIsCustomCreation(false);
                  setNewGoalName(item.name);
                  setNewGoalColor(item.color);
                  setNewGoalIcon(item.icon);
                  setNewGoalAmount('0.00');
                  setNewCurrentAmount('0.00');
                  setTargetDate('Seleccionar');
                  setSelectedAccount('Principal');
                  setInitialSavingsAmount('0.00');
                  setActiveKeypadField('target');
                  setWizardStep(2);
                  setCurrentView('wizard');
                }}
              >
                <View style={styles.cardHeaderRow}>
                  <TouchableOpacity>
                    <Ionicons name="information-circle-outline" size={18} color="#888" />
                  </TouchableOpacity>
                </View>
                
                <View style={[styles.circleIndicator, { borderColor: item.color }]}>
                  <View style={styles.innerCircle}>
                    <Ionicons name={item.icon} size={24} color={item.color} />
                  </View>
                </View>

                <Text style={styles.cardTitle}>{item.name}</Text>
                <Text style={styles.cardSubtitle}>
                  ${item.current.toFixed(2)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.sectionLabel, { marginTop: 25 }]}>METAS</Text>
          
          <View style={styles.tabsContainer}>
            {['Activas', 'Completadas'].map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[styles.tabButton, activeTab === tab && styles.activeTabButton]}
                onPress={() => setActiveTab(tab)}
              >
                <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>{tab}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {filteredSavingsList.length === 0 ? (
            <View style={styles.emptyStateCard}>
              <View style={styles.emptyIconBg}>
                <Ionicons name="flag-outline" size={22} color="#888" />
              </View>
              <Text style={styles.emptyTitle}>Sin registros en {activeTab}</Text>
              <Text style={styles.emptySubtitle}>
                {activeTab === 'Activas' ? 'No tienes metas en curso actualmente.' : 'Aún no has completado ninguna meta al 100%.'}
              </Text>
            </View>
          ) : (
            <View style={styles.goalsListContainer}>
              {filteredSavingsList.map((goal) => {
                const percentage = goal.target > 0 ? Math.round((goal.current / goal.target) * 100) : 0;
                return (
                  <TouchableOpacity
                    key={goal.id}
                    style={styles.goalHorizontalCard}
                    onPress={() => {
                      setSelectedGoal(goal);
                      fetchGoalHistory(goal.id);
                      setMenuVisible(true);
                    }}
                  >
                    <View style={[styles.goalIconBox, { borderColor: goal.color }]}>
                      <Ionicons name={goal.icon} size={20} color={goal.color} />
                    </View>
                    <View style={styles.goalInfoContainer}>
                      <Text style={styles.goalCardTitle}>{goal.name}</Text>
                      <Text style={styles.goalCardAmounts}>
                        ${goal.current.toFixed(2)} <Text style={{ color: '#666' }}>/ ${goal.target.toFixed(2)}</Text>
                      </Text>
                    </View>
                    <View style={styles.goalPercentageBadge}>
                      <Text style={styles.goalPercentageText}>{percentage}%</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </ScreenWrapper>

        <TouchableOpacity
          style={styles.fab}
          onPress={() => {
            setIsEditing(false);
            setEditingGoalId(null);
            setIsCustomCreation(true);
            setNewGoalName('');
            setNewGoalColor('#a3e635');
            setNewGoalIcon('flag-outline');
            setNewGoalAmount('0.00');
            setNewCurrentAmount('0.00');
            setTargetDate('Seleccionar');
            setSelectedAccount('Principal');
            setInitialSavingsAmount('0.00');
            setActiveKeypadField('target');
            setWizardStep(1);
            setCurrentView('wizard');
          }}
        >
          <Ionicons name="add" size={28} color="#000" />
        </TouchableOpacity>

        {/* MENÚ DE ACCIONES */}
        <ThemedModal visible={menuVisible} transparent animationType="fade">
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setMenuVisible(false)}
          >
            <View style={styles.contextMenu}>
              <TouchableOpacity
                style={styles.contextMenuItem}
                onPress={() => {
                  setMenuVisible(false);
                  setActionModal('agregar');
                }}
              >
                <Ionicons name="add-circle-outline" size={20} color="#fff" />
                <Text style={styles.contextMenuText}>Agregar ahorro</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.contextMenuItem}
                onPress={() => {
                  setMenuVisible(false);
                  setActionModal('retirar');
                }}
              >
                <Ionicons name="arrow-undo-outline" size={20} color="#fff" />
                <Text style={styles.contextMenuText}>Retirar</Text>
              </TouchableOpacity>

              {/* Opción para editar nombre, monto, icono y color */}
              <TouchableOpacity
                style={styles.contextMenuItem}
                onPress={() => {
                  setMenuVisible(false);
                  if (selectedGoal) {
                    setIsEditing(true);
                    setEditingGoalId(selectedGoal.id);
                    setNewGoalName(selectedGoal.name);
                    setNewGoalAmount(String(selectedGoal.target.toFixed(2)));
                    setNewCurrentAmount(String(selectedGoal.current.toFixed(2)));
                    setNewGoalColor(selectedGoal.color);
                    setNewGoalIcon(selectedGoal.icon);
                    setWizardStep(2); // Inicia en el paso de montos con pestañas de edición habilitadas
                    setCurrentView('wizard');
                  }
                }}
              >
                <Ionicons name="create-outline" size={20} color="#a3e635" />
                <Text style={[styles.contextMenuText, { color: '#a3e635' }]}>Editar objetivo</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.contextMenuItem, { borderBottomWidth: 0 }]}
                onPress={() => {
                  setMenuVisible(false);
                  fetchGoalHistory(selectedGoal?.id);
                  setCurrentView('detail');
                }}
              >
                <Ionicons name="information-circle-outline" size={20} color="#fff" />
                <Text style={styles.contextMenuText}>Ver detalles</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </ThemedModal>

        {/* MODAL: Agregar / Retirar */}
        <ThemedModal visible={actionModal !== null} transparent animationType="slide">
          <View style={styles.fullModalContainer}>
            <View style={styles.modalHeaderRow}>
              <TouchableOpacity onPress={() => setActionModal(null)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.modalHeaderTitle}>
                {actionModal === 'agregar' ? 'Agregar ahorro' : 'Retirar ahorro'}
              </Text>
              <TouchableOpacity
                style={styles.smallCheckBtn}
                onPress={() => handleUpdateBalance(actionModal)}
              >
                <Ionicons name="checkmark" size={18} color="#000" />
              </TouchableOpacity>
            </View>

            <View style={styles.amountDisplayContainer}>
              <Text style={styles.targetNameSub}>{selectedGoal?.name}</Text>
              <Text style={styles.bigAmountText}>${inputAmount}</Text>
            </View>

            <View style={styles.numericKeypad}>
              {['1', '2', '3', 'C', '4', '5', '6', '>', '7', '8', '9', '00', '0', 'del'].map((btn, index) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.keyButton, btn === '>' && styles.keyButtonActive]}
                  onPress={() => {
                    if (btn === '>') {
                      handleUpdateBalance(actionModal);
                    } else {
                      handleKeyPress(btn, inputAmount, setInputAmount);
                    }
                  }}
                >
                  {btn === 'del' ? (
                    <Ionicons name="backspace-outline" size={20} color="#fff" />
                  ) : (
                    <Text style={[styles.keyText, btn === '>' && { color: '#000' }]}>{btn}</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ThemedModal>

        <ThemedModal visible={settingsMenuVisible} transparent animationType="fade">
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setSettingsMenuVisible(false)}>
            <View style={[styles.contextMenu, { right: 20, top: 60, position: 'absolute' }]}>
              <TouchableOpacity style={[styles.contextMenuItem, { borderBottomWidth: 0 }]} onPress={() => { setSettingsMenuVisible(false); handleFactoryReset(); }}>
                <Ionicons name="refresh-outline" size={20} color="#f87171" />
                <Text style={[styles.contextMenuText, { color: '#f87171' }]}>Reiniciar a fábrica</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </ThemedModal>

        <ThemedModal visible={helpModalVisible} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.helpCard}>
              <Text style={styles.helpTitle}>💡 Guía de Metas</Text>
              <Text style={styles.helpDesc}>Organiza tus ahorros, visualiza metas activas y completadas, y edítalas en cualquier momento.</Text>
              <TouchableOpacity style={styles.helpCloseBtn} onPress={() => setHelpModalVisible(false)}>
                <Text style={styles.helpCloseText}>Entendido</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ThemedModal>
      </SafeAreaView>
    );
  }

  // ==========================================
  // VISTA 2: ASISTENTE DE CREACIÓN / EDICIÓN
  // ==========================================
  if (currentView === 'wizard') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => {
              if (isEditing) {
                setCurrentView('main');
                setIsEditing(false);
              } else if (isCustomCreation && wizardStep > 1) {
                setWizardStep(wizardStep - 1);
              } else {
                setCurrentView('main');
              }
            }}
          >
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isEditing ? 'Editar meta' : wizardStep === 1 ? 'Nueva meta' : wizardStep === 2 ? 'Definir montos' : wizardStep === 3 ? 'Personaliza tu fondo' : 'Resumen'}
          </Text>
          <View style={{ width: 22 }} />
        </View>

        {/* Pestañas de navegación rápida si estamos editando para cambiar entre Montos e Icono/Color libremente */}
        {isEditing && (
          <View style={styles.editTabsRow}>
            <TouchableOpacity 
              style={[styles.editTabChip, wizardStep === 2 && styles.editTabChipActive]}
              onPress={() => setWizardStep(2)}
            >
              <Ionicons name="calculator-outline" size={16} color={wizardStep === 2 ? '#a3e635' : '#888'} />
              <Text style={[styles.editTabText, wizardStep === 2 && { color: '#a3e635' }]}>Montos</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.editTabChip, wizardStep === 3 && styles.editTabChipActive]}
              onPress={() => setWizardStep(3)}
            >
              <Ionicons name="color-palette-outline" size={16} color={wizardStep === 3 ? '#a3e635' : '#888'} />
              <Text style={[styles.editTabText, wizardStep === 3 && { color: '#a3e635' }]}>Icono y Color</Text>
            </TouchableOpacity>
          </View>
        )}

        {!isEditing && (
          <View style={styles.stepsBarContainer}>
            {(isCustomCreation ? [1, 2, 3, 4] : [2, 3, 4]).map((step) => (
              <View
                key={step}
                style={[styles.stepLine, wizardStep >= step ? styles.stepLineActive : styles.stepLineInactive]}
              />
            ))}
          </View>
        )}

        {wizardStep === 2 ? (
          <View style={{ flex: 1, paddingHorizontal: 16, justifyContent: 'space-between' }}>
            <View>
              <View style={styles.inputCardRow}>
                <Ionicons name="flag-outline" size={18} color="#a3e635" style={{ marginRight: 10 }} />
                <TextInput
                  style={styles.textInputEditName}
                  value={newGoalName}
                  onChangeText={setNewGoalName}
                  placeholder="Nombre de la meta"
                  placeholderTextColor="#666"
                />
              </View>

              <View style={styles.quickOptionsRow}>
                <TouchableOpacity 
                  style={[styles.quickChip, activeKeypadField === 'target' && styles.quickChipActive]}
                  onPress={() => setActiveKeypadField('target')}
                >
                  <Text style={[styles.quickChipText, activeKeypadField === 'target' && { color: '#a3e635' }]}>
                    Objetivo: ${newGoalAmount}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.quickChip, activeKeypadField === 'current' && styles.quickChipActive]}
                  onPress={() => setActiveKeypadField('current')}
                >
                  <Text style={[styles.quickChipText, activeKeypadField === 'current' && { color: '#a3e635' }]}>
                    Ahorrado: ${newCurrentAmount}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.wizardPreviewContainer}>
                <View style={[styles.circleIndicator, { borderColor: newGoalColor }]}>
                  <View style={styles.innerCircle}>
                    <Ionicons name={newGoalIcon} size={26} color={newGoalColor} />
                  </View>
                </View>
                <Text style={styles.bigAmountText}>
                  ${activeKeypadField === 'target' ? newGoalAmount : newCurrentAmount}
                </Text>
                <Text style={styles.wizardSubtitle}>
                  {activeKeypadField === 'target' ? 'Editando monto objetivo' : 'Editando saldo ahorrado'}
                </Text>
              </View>
            </View>

            <View style={styles.numericKeypad}>
              {['1', '2', '3', 'C', '4', '5', '6', '>', '7', '8', '9', '00', '0', 'del'].map((btn, index) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.keyButton, btn === '>' && styles.keyButtonActive]}
                  onPress={() => {
                    if (btn === '>') {
                      if (isEditing) {
                        setWizardStep(3); // Salta a icono y color directamente al presionar '>'
                      } else {
                        setWizardStep(3);
                      }
                    } else {
                      if (activeKeypadField === 'target') {
                        handleFinancialKeyPress(btn, newGoalAmount, setNewGoalAmount);
                      } else {
                        handleFinancialKeyPress(btn, newCurrentAmount, setNewCurrentAmount);
                      }
                    }
                  }}
                >
                  {btn === 'del' ? (
                    <Ionicons name="backspace-outline" size={20} color="#fff" />
                  ) : (
                    <Text style={[styles.keyText, btn === '>' && { color: '#000' }]}>{btn}</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : (
          <ScreenWrapper contentContainerStyle={styles.scrollContent}>
            {wizardStep === 1 && (
              <>
                <Text style={styles.wizardMainTitle}>¿Cuál es tu objetivo?</Text>
                <Text style={styles.wizardSubtitle}>Empieza con una idea o crea la tuya desde cero.</Text>
                <View style={styles.ideasGrid}>
                  {[
                    { name: 'Pagar estudios', icon: 'school-outline' },
                    { name: 'Iniciar negocio', icon: 'briefcase-outline' },
                    { name: 'Curso', icon: 'book-outline' },
                    { name: 'Vivienda', icon: 'home-outline' },
                    { name: 'Viaje', icon: 'airplane-outline' },
                    { name: 'Vehículo', icon: 'car-outline' },
                  ].map((idea, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={styles.ideaCard}
                      onPress={() => {
                        setNewGoalName(idea.name);
                        setNewGoalIcon(idea.icon);
                        setWizardStep(2);
                      }}
                    >
                      <Ionicons name={idea.icon} size={22} color="#a3e635" />
                      <Text style={styles.ideaCardText}>{idea.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {wizardStep === 3 && (
              <>
                <Text style={styles.wizardMainTitle}>Personaliza tu fondo</Text>
                <Text style={styles.wizardSubtitle}>Cambia el icono y el color de tu meta.</Text>

                <View style={styles.previewCardCentered}>
                  <View style={[styles.circleIndicator, { borderColor: newGoalColor }]}>
                    <View style={styles.innerCircle}>
                      <Ionicons name={newGoalIcon} size={26} color={newGoalColor} />
                    </View>
                  </View>
                  <Text style={styles.cardTitle}>{newGoalName || 'Nuevo Fondo'}</Text>
                </View>

                {/* SELECTOR DE ICONOS */}
                <Text style={styles.sectionLabel}>ICONO</Text>
                <View style={styles.iconsPickerRow}>
                  {AVAILABLE_ICONS.map((iconName, i) => (
                    <TouchableOpacity
                      key={i}
                      style={[
                        styles.iconOptionBtn, 
                        newGoalIcon === iconName && { backgroundColor: newGoalColor, borderColor: newGoalColor }
                      ]}
                      onPress={() => setNewGoalIcon(iconName)}
                    >
                      <Ionicons 
                        name={iconName} 
                        size={22} 
                        color={newGoalIcon === iconName ? '#000' : '#a3e635'} 
                      />
                    </TouchableOpacity>
                  ))}
                </View>

                {/* SELECTOR DE COLORES */}
                <Text style={[styles.sectionLabel, { marginTop: 20 }]}>COLOR</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 20 }}>
                  {AVAILABLE_COLORS.map((col, i) => (
                    <TouchableOpacity
                      key={i}
                      style={[styles.colorOption, { backgroundColor: col }, newGoalColor === col && styles.colorSelected]}
                      onPress={() => setNewGoalColor(col)}
                    />
                  ))}
                </View>
              </>
            )}

            {wizardStep === 4 && (
              <>
                <Text style={styles.wizardMainTitle}>Resumen de tu fondo</Text>
                <Text style={styles.wizardSubtitle}>Verifica los detalles antes de guardar.</Text>

                <View style={styles.summaryBox}>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Nombre</Text>
                    <Text style={styles.summaryVal}>{newGoalName}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Monto ahorrado</Text>
                    <Text style={styles.summaryVal}>${newCurrentAmount}</Text>
                  </View>
                  <View style={[styles.summaryRow, { borderBottomWidth: 0 }]}>
                    <Text style={styles.summaryLabel}>Monto objetivo</Text>
                    <Text style={styles.summaryVal}>${newGoalAmount}</Text>
                  </View>
                </View>
              </>
            )}
          </ScreenWrapper>
        )}

        {/* Footer con botón de acción (Guardar o Continuar) */}
        {(wizardStep !== 2 || isEditing) && (
          <View style={styles.wizardFooter}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => {
                if (isEditing) {
                  if (wizardStep === 2) {
                    setWizardStep(3);
                  } else {
                    handleSaveGoal();
                  }
                } else {
                  if (wizardStep < 4) setWizardStep(wizardStep + 1);
                  else handleSaveGoal();
                }
              }}
            >
              <Text style={styles.primaryButtonText}>
                {wizardStep === 3 && isEditing ? '✓ Guardar cambios' : wizardStep === 4 || (isEditing && wizardStep === 3) ? '✓ Guardar cambios' : 'Continuar'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    );
  }

  // ==========================================
  // VISTA 3: ÉXITO
  // ==========================================
  if (currentView === 'success') {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 20 }]}>
        <View style={[styles.circleIndicator, { borderColor: newGoalColor, width: 90, height: 90, marginBottom: 20 }]}>
          <View style={[styles.innerCircle, { width: 70, height: 70 }]}>
            <Ionicons name="checkmark" size={36} color={newGoalColor} />
          </View>
        </View>

        <Text style={styles.successTitle}>¡Fondo creado!</Text>
        <Text style={styles.successSubtitle}>Tu respaldo financiero está listo. ¡Sigue adelante!</Text>

        <TouchableOpacity
          style={[styles.primaryButton, { width: '100%', marginTop: 40 }]}
          onPress={() => setCurrentView('main')}
        >
          <Text style={styles.primaryButtonText}>Ver mis ahorros</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ==========================================
  // VISTA 4: DETALLE E HISTORIAL
  // ==========================================
  if (currentView === 'detail') {
    const goal = selectedGoal;
    if (!goal) return null;
    const percentage = goal.target > 0 ? Math.round((goal.current / goal.target) * 100) : 0;
    const remaining = Math.max(0, goal.target - goal.current);

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setCurrentView('main')}>
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{goal.name}</Text>
          <TouchableOpacity 
            style={styles.iconButton}
            onPress={() => {
              setIsEditing(true);
              setEditingGoalId(goal.id);
              setNewGoalName(goal.name);
              setNewGoalAmount(String(goal.target.toFixed(2)));
              setNewCurrentAmount(String(goal.current.toFixed(2)));
              setNewGoalColor(goal.color);
              setNewGoalIcon(goal.icon);
              setWizardStep(2);
              setCurrentView('wizard');
            }}
          >
            <Ionicons name="create-outline" size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.tabsContainerDetail}>
          {['Resumen', 'Historial'].map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tabButtonDetail, detailTab === tab && styles.activeTabDetail]}
              onPress={() => setDetailTab(tab)}
            >
              <Text style={[styles.tabText, detailTab === tab && styles.activeTabText]}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScreenWrapper contentContainerStyle={styles.scrollContent}>
          {detailTab === 'Resumen' ? (
            <>
              <View style={styles.detailCardMain}>
                <Ionicons name={goal.icon} size={20} color={goal.color} />
                <Text style={styles.detailCardTitle}>{goal.name}</Text>
                <Text style={styles.detailAmountBig}>${goal.current.toFixed(2)}</Text>
                <Text style={styles.detailPercentage}>{percentage}% del objetivo</Text>
              </View>

              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statVal}>${goal.current.toFixed(2)}</Text>
                  <Text style={styles.statLabel}>Ahorrado</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statVal}>${remaining.toFixed(2)}</Text>
                  <Text style={styles.statLabel}>Restante</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statVal}>${goal.target.toFixed(2)}</Text>
                  <Text style={styles.statLabel}>Objetivo</Text>
                </View>
              </View>
            </>
          ) : (
            goalHistory.length === 0 ? (
              <View style={styles.emptyHistoryCard}>
                <Ionicons name="time-outline" size={24} color="#888" />
                <Text style={styles.emptyTitle}>Sin historial</Text>
                <Text style={styles.emptySubtitle}>Cuando agregues o retires dinero de este fondo, aparecerá registrado aquí.</Text>
              </View>
            ) : (
              goalHistory.map((h, i) => (
                <View key={i} style={styles.historyItemCard}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name={h.type === 'Ingreso' ? 'arrow-down-circle' : 'arrow-up-circle'} size={20} color={h.type === 'Ingreso' ? '#a3e635' : '#f87171'} style={{ marginRight: 10 }} />
                    <View>
                      <Text style={{ color: '#fff', fontSize: 13, fontWeight: 'bold' }}>{h.description}</Text>
                      <Text style={{ color: '#888', fontSize: 10, marginTop: 2 }}>{new Date(h.created_at).toLocaleDateString()}</Text>
                    </View>
                  </View>
                  <Text style={{ color: h.type === 'Ingreso' ? '#a3e635' : '#f87171', fontSize: 14, fontWeight: 'bold' }}>
                    {h.type === 'Ingreso' ? '+' : '-'}${parseFloat(h.amount).toFixed(2)}
                  </Text>
                </View>
              ))
            )
          )}
        </ScreenWrapper>
      </SafeAreaView>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { position: 'relative', zIndex: 1000, elevation: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 12 },
  headerRightButtons: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: '600' },
  iconButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: '#333', justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 16, paddingBottom: 100 },
  sectionLabel: { color: '#888', fontSize: 12, fontWeight: '700', letterSpacing: 1, marginBottom: 12 },
  gridContainer: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap' },
  savingCard: { width: (width - 40) / 2, backgroundColor: '#121212', borderRadius: 20, padding: 16, marginBottom: 15, borderWidth: 1, borderColor: '#222', alignItems: 'center' },
  cardHeaderRow: { width: '100%', alignItems: 'flex-end', marginBottom: 5 },
  circleIndicator: { width: 70, height: 70, borderRadius: 35, borderWidth: 3, justifyContent: 'center', alignItems: 'center', marginVertical: 10, backgroundColor: '#181818' },
  innerCircle: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#111', justifyContent: 'center', alignItems: 'center' },
  cardTitle: { color: '#fff', fontSize: 14, fontWeight: '600', textAlign: 'center', marginTop: 5 },
  cardSubtitle: { color: '#888', fontSize: 12, marginTop: 4, textAlign: 'center' },
  tabsContainer: { flexDirection: 'row', backgroundColor: '#121212', borderRadius: 25, padding: 4, marginBottom: 15 },
  tabButton: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 20 },
  activeTabButton: { backgroundColor: '#262626' },
  tabText: { color: '#888', fontSize: 13, fontWeight: '500' },
  activeTabText: { color: '#fff', fontWeight: '600' },
  emptyStateCard: { backgroundColor: '#121212', borderRadius: 20, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: '#222' },
  emptyIconBg: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#1a1a1a', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  emptyTitle: { color: '#fff', fontSize: 16, fontWeight: '600', marginBottom: 6 },
  emptySubtitle: { color: '#888', fontSize: 13, textAlign: 'center', lineHeight: 18 },
  fab: { position: 'absolute', bottom: 25, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: '#a3e635', justifyContent: 'center', alignItems: 'center', shadowColor: '#a3e635', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 5 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  helpCard: { width: '85%', backgroundColor: '#1a1a1a', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#a3e635' },
  helpTitle: { color: '#a3e635', fontSize: 16, fontWeight: '700', marginBottom: 8 },
  helpDesc: { color: '#ccc', fontSize: 13, lineHeight: 18, marginBottom: 20 },
  helpCloseBtn: { backgroundColor: '#a3e635', borderRadius: 16, paddingVertical: 12, alignItems: 'center' },
  helpCloseText: { color: '#000', fontSize: 14, fontWeight: '700' },
  contextMenu: { width: 220, backgroundColor: '#1a1a1a', borderRadius: 16, paddingVertical: 6, borderWidth: 1, borderColor: '#333' },
  contextMenuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#262626' },
  contextMenuText: { color: '#fff', fontSize: 14, marginLeft: 10 },
  fullModalContainer: { flex: 1, backgroundColor: '#000', paddingTop: 40, paddingHorizontal: 20 },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalHeaderTitle: { color: '#fff', fontSize: 16, fontWeight: '600' },
  smallCheckBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#a3e635', justifyContent: 'center', alignItems: 'center' },
  amountDisplayContainer: { alignItems: 'center', marginVertical: 30 },
  targetNameSub: { color: '#888', fontSize: 13, marginBottom: 8 },
  bigAmountText: { color: '#fff', fontSize: 38, fontWeight: '700' },
  numericKeypad: [NUMERIC_KEYPAD_STYLES.grid, { paddingBottom: 20 }],
  keyButton: NUMERIC_KEYPAD_STYLES.gridKey,
  keyButtonActive: NUMERIC_KEYPAD_STYLES.gridSubmitKey,
  keyText: NUMERIC_KEYPAD_STYLES.keyText,
  stepsBarContainer: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 10 },
  stepLine: { flex: 1, height: 3, backgroundColor: '#333', marginHorizontal: 3, borderRadius: 2 },
  stepLineActive: { backgroundColor: '#a3e635' },
  stepLineInactive: { backgroundColor: '#262626' },
  wizardMainTitle: { color: '#fff', fontSize: 22, fontWeight: '700', marginBottom: 6 },
  wizardSubtitle: { color: '#888', fontSize: 13, marginBottom: 20 },
  ideasGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  ideaCard: { width: (width - 45) / 3, aspectRatio: 1, backgroundColor: '#121212', borderRadius: 16, padding: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: '#222' },
  ideaCardText: { color: '#fff', fontSize: 11, textAlign: 'center', marginTop: 8 },
  previewCardCentered: { backgroundColor: '#121212', borderRadius: 20, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: '#222', marginVertical: 15 },
  colorOption: { width: 36, height: 36, borderRadius: 18, marginRight: 12, marginBottom: 12 },
  colorSelected: { borderWidth: 3, borderColor: '#fff' },
  iconsPickerRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  iconOptionBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: '#333', justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  summaryBox: { backgroundColor: '#121212', borderRadius: 16, paddingHorizontal: 16, borderWidth: 1, borderColor: '#222' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#222' },
  summaryLabel: { color: '#888', fontSize: 14 },
  summaryVal: { color: '#fff', fontSize: 14, fontWeight: '600' },
  wizardFooter: { padding: 20, backgroundColor: '#000' },
  primaryButton: { backgroundColor: '#a3e635', borderRadius: 25, paddingVertical: 16, alignItems: 'center' },
  primaryButtonText: { color: '#000', fontSize: 15, fontWeight: '700' },
  successTitle: { color: '#fff', fontSize: 22, fontWeight: '700', marginTop: 10 },
  successSubtitle: { color: '#888', fontSize: 13, textAlign: 'center', marginTop: 5 },
  tabsContainerDetail: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 10 },
  tabButtonDetail: { flex: 1, paddingVertical: 10, alignItems: 'center', backgroundColor: '#121212', marginHorizontal: 4, borderRadius: 20 },
  activeTabDetail: { backgroundColor: '#262626' },
  detailCardMain: { backgroundColor: '#121212', borderRadius: 20, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: '#222', marginBottom: 15 },
  detailCardTitle: { color: '#fff', fontSize: 14, fontWeight: '600', marginTop: 10 },
  detailAmountBig: { color: '#fff', fontSize: 32, fontWeight: '700', marginVertical: 10 },
  detailPercentage: { color: '#888', fontSize: 12 },
  statsRow: { flexDirection: 'row', backgroundColor: '#121212', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#222', justifyContent: 'space-between' },
  statItem: { alignItems: 'center', flex: 1 },
  statVal: { color: '#fff', fontSize: 15, fontWeight: '600', marginBottom: 4 },
  statLabel: { color: '#888', fontSize: 11 },
  emptyHistoryCard: { backgroundColor: '#121212', borderRadius: 20, padding: 30, alignItems: 'center', borderWidth: 1, borderColor: '#222' },
  historyItemCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#121212', padding: 14, borderRadius: 16, marginBottom: 10, borderWidth: 1, borderColor: '#222' },
  wizardPreviewContainer: { alignItems: 'center', marginVertical: 15 },
  inputCardRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#121212', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1, borderColor: '#222', marginBottom: 15 },
  textInputEditName: { color: '#fff', fontSize: 15, fontWeight: '600', flex: 1 },
  quickOptionsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  quickChip: { flex: 1, backgroundColor: '#121212', borderRadius: 12, paddingVertical: 10, alignItems: 'center', marginHorizontal: 4, borderWidth: 1, borderColor: '#222' },
  quickChipActive: { borderColor: '#a3e635', backgroundColor: '#1a1a1a' },
  quickChipText: { color: '#888', fontSize: 12, fontWeight: '500' },
  goalsListContainer: { marginTop: 5 },
  goalHorizontalCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#121212', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#222' },
  goalIconBox: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, justifyContent: 'center', alignItems: 'center', backgroundColor: '#181818', marginRight: 14 },
  goalInfoContainer: { flex: 1 },
  goalCardTitle: { color: '#fff', fontSize: 14, fontWeight: '600', marginBottom: 4 },
  goalCardAmounts: { color: '#fff', fontSize: 13, fontWeight: '500' },
  goalPercentageBadge: { backgroundColor: '#1a1a1a', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: '#333' },
  goalPercentageText: { color: '#a3e635', fontSize: 13, fontWeight: '700' },
  editTabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 15,
  },
  editTabChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#121212',
    paddingVertical: 10,
    borderRadius: 14,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#222',
  },
  editTabChipActive: {
    borderColor: '#a3e635',
    backgroundColor: '#1a1a1a',
  },
  editTabText: {
    color: '#888',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
});