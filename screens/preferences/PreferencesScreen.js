import ThemedModal from "../../components/ThemedModal";
import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Switch,
  TextInput,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { Alert } from '../../services/appAlert';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import * as Notifications from 'expo-notifications';
import { canUseBiometrics, getLocalSecurity, removeLocalPin, saveLocalPin, setLocalBiometricEnabled, verifyLocalPin } from '../../services/localSecurity';
import { supabase } from '../../services/supabase';
import ThemeContent from '../../components/ThemeContent';
import { useAppTheme } from '../../components/ThemeContext';
import CustomHeader from '../../components/CustomHeader';
import ScreenWrapper from '../../components/ScreenWrapper';
import { getBolivarRate, SUPPORTED_CURRENCIES } from '../../services/currencyService';
import Constants from 'expo-constants';

const PROFILE_ICONS = [
  'person', 'person-circle', 'people', 'happy', 'glasses', 'paw', 'leaf', 'flower',
  'wallet', 'cash', 'card', 'business', 'briefcase', 'rocket', 'trophy', 'fitness',
  'football', 'musical-notes', 'book', 'bulb', 'earth', 'airplane', 'car', 'home',
  'heart', 'star', 'shield-checkmark', 'key', 'construct', 'headset', 'phone-portrait',
  'logo-bitcoin', 'logo-usd', 'trending-up', 'pie-chart', 'diamond', 'sparkles',
];

const PROFILE_BACKGROUNDS = [
  { label: 'Lima', value: '#a3e635' },
  { label: 'Celeste', value: '#38bdf8' },
  { label: 'Ámbar', value: '#fbbf24' },
  { label: 'Coral', value: '#f87171' },
  { label: 'Morado', value: '#c084fc' },
  { label: 'Naranja', value: '#fb923c' },
  { label: 'Menta', value: '#34d399' },
  { label: 'Rosa', value: '#f472b6' },
  { label: 'Azul', value: '#818cf8' },
  { label: 'Océano', value: 'gradient:#06b6d4|#3b82f6' },
  { label: 'Atardecer', value: 'gradient:#f97316|#ec4899' },
  { label: 'Aurora', value: 'gradient:#22c55e|#14b8a6' },
  { label: 'Lavanda', value: 'gradient:#8b5cf6|#ec4899' },
  { label: 'Fuego', value: 'gradient:#ef4444|#f59e0b' },
  { label: 'Noche', value: 'gradient:#1d4ed8|#7c3aed' },
  { label: 'Lima suave', value: 'gradient:#84cc16|#10b981' },
];

export default function PreferencesScreen({
  userId,
  navigation,
  accounts = [],
  transactions = [],
  movements = [],
  goals = [],
  shoppingLists = [],
  recurringTemplates = [],
  categories = [],
  settings = {},
  rates,
  onUpdateSetting,
  onLocalSecurityChanged,
  onProfileUpdated,
  onLogout,
  initialModal = null,
}) {
  const [loading, setLoading] = useState(true);
  const { height: windowHeight } = useWindowDimensions();
  const modalHeight = Math.min(Math.round(windowHeight * 0.82), 680);

  // Módulo Perfil
  const [userData, setUserData] = useState({
    name: '',
    email: '',
    phone: '',
    birthdate: '',
    avatar: 'person',
    avatarBg: '#a3e635',
  });

  const [activeModal, setActiveModal] = useState(initialModal);
  const isLightTheme = useAppTheme() === 'light';
  const showAlert = (title, message, buttons) => Alert.alert(title, message, buttons);

  const [notificationPermission, setNotificationPermission] = useState(false);
  const [securityConfig, setSecurityConfig] = useState({ pinHash: null, pinSalt: null, biometricEnabled: false });
  const [biometricsAvailable, setBiometricsAvailable] = useState(false);
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [securityBusy, setSecurityBusy] = useState(false);
  const [securityError, setSecurityError] = useState('');
  const [securityConfigReady, setSecurityConfigReady] = useState(false);
  const themeMode = settings.themeMode || 'system';

  const displayCurrencies = Array.isArray(settings.displayCurrencies) && settings.displayCurrencies.length > 0
    ? settings.displayCurrencies
    : ['USD', 'EUR', 'USDT', 'VES'];

  // Estados temporales para el módulo de divisas
  const [tempPrimaryCurrency, setTempPrimaryCurrency] = useState(settings.primaryCurrency || 'VES');
  const [tempCountry, setTempCountry] = useState(settings.workingCountry || 'VE');
  const [tempDisplayCurrencies, setTempDisplayCurrencies] = useState(displayCurrencies);

  useEffect(() => {
    if (activeModal === 'currencies') {
      setTempPrimaryCurrency(settings.primaryCurrency || 'VES');
      setTempCountry(settings.workingCountry || 'VE');
      setTempDisplayCurrencies(displayCurrencies);
    }
  }, [activeModal, settings.primaryCurrency, settings.workingCountry, displayCurrencies]);

  const notificationSettings = settings.notifications || {};
  const preferenceDefaults = {
    emailNews: true,
    emailReceipts: true,
    emailSummaries: false,
    pushReminders: false,
  };
  const savedNotificationSettings = { ...preferenceDefaults, ...notificationSettings };

  // Tarjetas del módulo de USO estructuradas como habilidades RPG de videojuego (INTACTO)
  const scheduledCount = transactions.filter(item => item.type === 'pay' || item.type === 'receive').length;
  const usageSkills = [
    {
      id: 'accounts',
      skillName: 'Bóvedas de Liquidez',
      label: 'Cuentas bancarias y efectivo',
      type: 'PASIVA',
      rank: 'RANGO S',
      count: accounts.length,
      unit: accounts.length === 1 ? 'Bóveda' : 'Bóvedas',
      icon: 'wallet-outline',
      color: '#a3e635',
      description: 'Gestión de fondos, efectivo y cuentas bancarias. Monitorea tu liquidez en tiempo real.',
      power: Math.min(100, Math.max(20, accounts.length * 20)),
    },
    {
      id: 'movements',
      skillName: 'Bitácora de Transacciones',
      label: 'Movimientos financieros',
      type: 'ACTIVA',
      rank: 'RANGO S+',
      count: movements.length,
      unit: movements.length === 1 ? 'Registro' : 'Registros',
      icon: 'swap-horizontal-outline',
      color: '#38bdf8',
      description: 'Historial táctico de ingresos, gastos y transferencias. Cada movimiento fortalece tu balance.',
      power: Math.min(100, Math.max(20, movements.length * 5)),
    },
    {
      id: 'categories',
      skillName: 'Clasificación Táctica',
      label: 'Categorías de gastos',
      type: 'PASIVA',
      rank: 'RANGO A',
      count: categories.length,
      unit: categories.length === 1 ? 'Clase' : 'Clases',
      icon: 'pricetags-outline',
      color: '#c084fc',
      description: 'Etiquetas personalizadas para clasificar y controlar tus gastos por sector.',
      power: Math.min(100, Math.max(20, categories.length * 10)),
    },
    {
      id: 'goals',
      skillName: 'Misiones & Objetivos',
      label: 'Metas de ahorro',
      type: 'MISIÓN',
      rank: 'RANGO EX',
      count: goals.length,
      unit: goals.length === 1 ? 'Misión' : 'Misiones',
      icon: 'flag-outline',
      color: '#fbbf24',
      description: 'Hitos de financiamiento con seguimiento de progreso para alcanzar tus victorias económicas.',
      power: Math.min(100, Math.max(20, goals.length * 25)),
    },
    {
      id: 'shopping',
      skillName: 'Inventario de Provisiones',
      label: 'Listas de compras',
      type: 'INVENTARIO',
      rank: 'RANGO B',
      count: shoppingLists.length,
      unit: shoppingLists.length === 1 ? 'Lista' : 'Listas',
      icon: 'cart-outline',
      color: '#fb923c',
      description: 'Listas de insumos e ítems pendientes por reabastecer sin salirte del presupuesto.',
      power: Math.min(100, Math.max(20, shoppingLists.length * 20)),
    },
    {
      id: 'scheduled',
      skillName: 'Ejecución Programada',
      label: 'Pagos y cobros agendados',
      type: 'AUTOMÁTICA',
      rank: 'RANGO A',
      count: scheduledCount,
      unit: scheduledCount === 1 ? 'Alerta' : 'Alertas',
      icon: 'calendar-outline',
      color: '#f472b6',
      description: 'Alertas automáticas para cumplir cobros y deudas en la fecha exacta.',
      power: Math.min(100, Math.max(20, scheduledCount * 25)),
    },
    {
      id: 'recurring',
      skillName: 'Conjuración Recurrente',
      label: 'Plantillas automáticas',
      type: 'COMBO',
      rank: 'RANGO A',
      count: recurringTemplates.length,
      unit: recurringTemplates.length === 1 ? 'Plantilla' : 'Plantillas',
      icon: 'repeat-outline',
      color: '#34d399',
      description: 'Modelos preconfigurados para acelerar el registro de operaciones habituales.',
      power: Math.min(100, Math.max(20, recurringTemplates.length * 20)),
    },
  ];

  useEffect(() => {
    if (Platform.OS === 'web') return;
    Notifications.getPermissionsAsync()
      .then(({ status }) => setNotificationPermission(status === 'granted'))
      .catch((error) => console.error('Error al consultar permisos de notificaciones:', error));
  }, []);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setSecurityConfigReady(false);
    Promise.all([getLocalSecurity(userId), canUseBiometrics()])
      .then(([config, available]) => {
        if (cancelled) return;
        setSecurityConfig(config);
        setBiometricsAvailable(available);
        setSecurityConfigReady(true);
      })
      .catch((error) => {
        console.error('Error al cargar la configuración de seguridad local:', error);
        if (!cancelled) setSecurityError('No se pudo cargar la configuración de seguridad local.');
      });
    return () => { cancelled = true; };
  }, [userId]);

  const savePin = async () => {
    setSecurityError('');
    if (!securityConfigReady) {
      setSecurityError('La configuración de seguridad aún no está lista.');
      return;
    }
    if (newPin.length !== 6 || !/^\d{6}$/.test(newPin)) {
      setSecurityError('El PIN debe tener exactamente 6 dígitos.');
      return;
    }
    if (newPin !== confirmPin) {
      setSecurityError('Los PIN ingresados no coinciden.');
      return;
    }
    setSecurityBusy(true);
    try {
      if (securityConfig.pinHash) {
        const currentResult = await verifyLocalPin(userId, currentPin);
        if (!currentResult.success) {
          setSecurityError('El PIN actual no es correcto.');
          return;
        }
      }
      const updated = await saveLocalPin(userId, newPin);
      setSecurityConfig(updated);
      onLocalSecurityChanged?.(updated);
      setCurrentPin('');
      setNewPin('');
      setConfirmPin('');
      showAlert('PIN actualizado', 'El bloqueo de Kronos ya está protegido con tu nuevo PIN.');
    } catch (error) {
      console.error('Error al guardar el PIN local:', error);
      setSecurityError('No se pudo guardar el PIN de forma segura.');
    } finally {
      setSecurityBusy(false);
    }
  };

  const disablePin = async () => {
    setSecurityError('');
    if (!securityConfigReady) {
      setSecurityError('La configuración de seguridad aún no está lista.');
      return;
    }
    setSecurityBusy(true);
    try {
      const updated = await removeLocalPin(userId);
      setSecurityConfig(updated);
      onLocalSecurityChanged?.(updated);
      setCurrentPin('');
      setNewPin('');
      setConfirmPin('');
      showAlert('Bloqueo eliminado', 'Se desactivó la protección por PIN y biometría local.');
    } catch (error) {
      console.error('Error al desactivar el PIN local:', error);
      setSecurityError('No se pudo desactivar el bloqueo.');
    } finally {
      setSecurityBusy(false);
    }
  };

  const handleConfirmRemovePin = () => {
    showAlert(
      'Eliminar bloqueo de pantalla',
      '¿Estás seguro de que deseas desactivar el PIN y la protección biométrica en este dispositivo?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sí, eliminar bloqueo',
          style: 'destructive',
          onPress: disablePin,
        },
      ]
    );
  };

  const toggleBiometrics = async (enabled) => {
    setSecurityError('');
    if (!securityConfigReady) {
      setSecurityError('La configuración de seguridad aún no está lista.');
      return;
    }
    if (!securityConfig.pinHash) {
      setSecurityError('Configura primero un PIN.');
      return;
    }
    if (enabled && !biometricsAvailable) {
      setSecurityError('Este dispositivo no tiene biometría configurada.');
      return;
    }
    setSecurityBusy(true);
    try {
      const updated = await setLocalBiometricEnabled(userId, enabled);
      setSecurityConfig(updated);
      onLocalSecurityChanged?.(updated);
    } catch (error) {
      console.error('Error al actualizar la biometría local:', error);
      setSecurityError('No se pudo actualizar la opción biométrica.');
    } finally {
      setSecurityBusy(false);
    }
  };

  const savePreference = (key, value) => {
    if (onUpdateSetting) onUpdateSetting(key, value);
  };

  // Manejadores del módulo de Divisas
  const toggleTempDisplayCurrency = (currencyCode) => {
    if (tempDisplayCurrencies.includes(currencyCode)) {
      if (tempDisplayCurrencies.length <= 1) {
        showAlert('Debe quedar una divisa', 'Mantén al menos una divisa visible.');
        return;
      }
      setTempDisplayCurrencies(tempDisplayCurrencies.filter(c => c !== currencyCode));
    } else {
      setTempDisplayCurrencies([...tempDisplayCurrencies, currencyCode]);
    }
  };

  const handleSelectAllCurrencies = () => {
    setTempDisplayCurrencies(SUPPORTED_CURRENCIES.map(c => c.code));
  };

  const handleSaveAllCurrencies = () => {
    savePreference('primaryCurrency', tempPrimaryCurrency);
    savePreference('workingCountry', tempCountry);
    savePreference('displayCurrencies', tempDisplayCurrencies);
    showAlert('Guardado', 'Las preferencias de divisas se han actualizado correctamente.');
    setActiveModal(null);
  };

  const updateNotificationPreference = async (key, value) => {
    if (key.startsWith('push') && value) {
      if (Platform.OS === 'web') {
        showAlert('Notificaciones push', 'Requieren la aplicación móvil.');
        return;
      }
      try {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== 'granted') {
          setNotificationPermission(false);
          showAlert('Permiso denegado', 'Activa las notificaciones en los ajustes del dispositivo.');
          return;
        }
        setNotificationPermission(true);
      } catch (error) {
        console.error('Error al solicitar permisos de notificaciones:', error);
        return;
      }
    }
    savePreference('notifications', { ...savedNotificationSettings, [key]: value });
  };

  // Módulo Perfil
  const fetchUserSettings = useCallback(async () => {
    try {
      setLoading(true);
      if (!userId) return;

      const { data: { session } } = await supabase.auth.getSession();
      const authEmail = session?.user?.email || '';

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Error al cargar perfil:', profileError.message);
      }

      if (profile) {
        setUserData({
          name: profile.full_name || '',
          email: profile.email || authEmail,
          phone: profile.phone || '',
          birthdate: profile.birthdate || '',
          avatar: profile.avatar || 'person',
          avatarBg: profile.avatar_bg || '#a3e635',
        });
      } else {
        const defaultProfile = {
          id: userId,
          email: authEmail,
          full_name: '',
          phone: '',
          birthdate: null,
          avatar: 'person',
          updated_at: new Date(),
        };
        await supabase.from('profiles').upsert([defaultProfile]);
        setUserData({
          name: '',
          email: authEmail,
          phone: '',
          birthdate: '',
          avatar: 'person',
          avatarBg: '#a3e635',
        });
      }
    } catch (err) {
      console.error('Error general cargando configuración:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchUserSettings();
  }, [fetchUserSettings]);

  const handleSaveProfile = async () => {
    try {
      setLoading(true);

      const profileUpdates = {
        id: userId,
        full_name: userData.name || '',
        email: userData.email || '',
        phone: userData.phone || '',
        birthdate: userData.birthdate && userData.birthdate.trim() !== '' ? userData.birthdate : null,
        avatar: userData.avatar || 'person',
        avatar_bg: userData.avatarBg || '#a3e635',
        updated_at: new Date(),
      };

      const { error } = await supabase
        .from('profiles')
        .upsert(profileUpdates);

      if (error) throw error;

      showAlert("¡Éxito!", "Perfil actualizado correctamente.");

      if (onProfileUpdated) {
        onProfileUpdated();
      }

      setActiveModal(null);
      fetchUserSettings();
    } catch (err) {
      console.error('Error al guardar perfil:', err.message);
      showAlert("Error", "No se pudo actualizar el perfil.");
    } finally {
      setLoading(false);
    }
  };

  const pickImageFromGallery = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        showAlert("Permiso denegado", "Se requieren permisos para la galería.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setUserData({ ...userData, avatar: result.assets[0].uri, avatarBg: 'transparent' });
      }
    } catch (error) {
      console.error('Error al seleccionar imagen:', error);
    }
  };

  const handleSignOut = () => {
    showAlert(
      "Cerrar sesión",
      "¿Estás seguro de que deseas cerrar sesión?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Sí, cerrar sesión",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              if (!onLogout) throw new Error('No disponible');
              await onLogout();
            } catch (err) {
              setLoading(false);
              showAlert("Error", err.message);
            }
          }
        }
      ]
    );
  };

  const handleFactoryReset = () => {
    showAlert(
      "Comenzar de cero",
      "¿Borrar todos tus registros y cuentas?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Sí, borrar todo",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              for (const table of ['transactions', 'accounts', 'goals', 'movements']) {
                const { error } = await supabase.from(table).delete().eq('user_id', userId);
                if (error) throw error;
              }
              showAlert("Restablecido", "Datos eliminados correctamente.");
              await fetchUserSettings();
            } catch (err) {
              showAlert("Error", err.message);
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <ThemeContent>
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" color="#a3e635" />
        </View>
      </ThemeContent>
    );
  }

  const renderBackgroundView = (bgValue, children, styleExtra) => {
    if (bgValue?.startsWith('gradient:')) {
      const colors = bgValue.slice('gradient:'.length).split('|');
      return (
        <LinearGradient colors={colors} style={styleExtra}>
          {children}
        </LinearGradient>
      );
    }

    return (
      <View style={[styleExtra, { backgroundColor: bgValue || '#1a1a1a' }]}>
        {children}
      </View>
    );
  };

  return (
    <ThemeContent>
      <View style={styles.container}>
        <CustomHeader
          title="Configuración"
          onBackPress={() => navigation('home')}
        />

        {/* Pantalla principal con tarjetas de menú */}
        <ScreenWrapper contentContainerStyle={styles.scrollContent}>

          {/* GRUPO 1: PERFIL & SEGURIDAD */}
          <View style={styles.groupCard}>
            <TouchableOpacity style={styles.groupItem} onPress={() => setActiveModal('profile')} activeOpacity={0.7}>
              <View style={styles.rowInfo}>
                <View style={styles.iconBox}><Ionicons name="person-outline" size={20} color="#a3e635" /></View>
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text style={styles.cardTitle}>Perfil</Text>
                  <Text style={styles.cardSubtitle} numberOfLines={1}>Tus datos personales</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#888" />
            </TouchableOpacity>

            <View style={styles.groupDivider} />

            <TouchableOpacity style={styles.groupItem} onPress={() => setActiveModal('security')} activeOpacity={0.7}>
              <View style={styles.rowInfo}>
                <View style={styles.iconBox}><Ionicons name="shield-checkmark-outline" size={20} color="#a3e635" /></View>
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text style={styles.cardTitle}>Seguridad</Text>
                  <Text style={styles.cardSubtitle} numberOfLines={1}>PIN y protección biométrica</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#888" />
            </TouchableOpacity>
          </View>

          {/* GRUPO 2: PREFERENCIAS DE LA APP */}
          <View style={styles.groupCard}>
            <TouchableOpacity style={styles.groupItem} onPress={() => setActiveModal('appearance')} activeOpacity={0.7}>
              <View style={styles.rowInfo}>
                <View style={styles.iconBox}><Ionicons name="color-palette-outline" size={20} color="#a3e635" /></View>
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text style={styles.cardTitle}>Apariencia</Text>
                  <Text style={styles.cardSubtitle} numberOfLines={1}>Tema de la interfaz</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#888" />
            </TouchableOpacity>

            <View style={styles.groupDivider} />

            <TouchableOpacity style={styles.groupItem} onPress={() => setActiveModal('currencies')} activeOpacity={0.7}>
              <View style={styles.rowInfo}>
                <View style={styles.iconBox}><Ionicons name="cash-outline" size={20} color="#a3e635" /></View>
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text style={styles.cardTitle}>Divisas visibles</Text>
                  <Text style={styles.cardSubtitle} numberOfLines={1}>Monedas principales y tasas</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#888" />
            </TouchableOpacity>

            <View style={styles.groupDivider} />

            <TouchableOpacity style={styles.groupItem} onPress={() => setActiveModal('notifications')} activeOpacity={0.7}>
              <View style={styles.rowInfo}>
                <View style={styles.iconBox}><Ionicons name="notifications-outline" size={20} color="#a3e635" /></View>
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text style={styles.cardTitle}>Notificaciones</Text>
                  <Text style={styles.cardSubtitle} numberOfLines={1}>Alertas y avisos</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#888" />
            </TouchableOpacity>

            <View style={styles.groupDivider} />

            <TouchableOpacity style={styles.groupItem} onPress={() => setActiveModal('usage')} activeOpacity={0.7}>
              <View style={styles.rowInfo}>
                <View style={styles.iconBox}><Ionicons name="stats-chart-outline" size={20} color="#a3e635" /></View>
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text style={styles.cardTitle}>Uso</Text>
                  <Text style={styles.cardSubtitle} numberOfLines={1}>Capacidades y estadísticas de la app</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#888" />
            </TouchableOpacity>
          </View>

          {/* GRUPO 3: ACCIONES GENERALES */}
          <View style={styles.groupCard}>
            <TouchableOpacity style={styles.groupItem} onPress={handleSignOut} activeOpacity={0.7}>
              <View style={styles.rowInfo}>
                <View style={styles.iconBoxRed}><Ionicons name="log-out-outline" size={20} color="#f87171" /></View>
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text style={[styles.cardTitle, { color: '#f87171' }]}>Cerrar sesión</Text>
                  <Text style={styles.cardSubtitle} numberOfLines={1}>Finalizar sesión actual</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#888" />
            </TouchableOpacity>

            <View style={styles.groupDivider} />

            <TouchableOpacity style={styles.groupItem} onPress={handleFactoryReset} activeOpacity={0.7}>
              <View style={styles.rowInfo}>
                <View style={styles.iconBoxRed}><Ionicons name="refresh-outline" size={20} color="#f87171" /></View>
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text style={[styles.cardTitle, { color: '#f87171' }]}>Comenzar de cero</Text>
                  <Text style={styles.cardSubtitle} numberOfLines={1}>Restablecer datos de la cuenta</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#888" />
            </TouchableOpacity>
          </View>

          <View style={styles.footerContainer}>
            <Text style={styles.versionText}>Kronos v{Constants.expoConfig?.version || '1.0.1'}</Text>
          </View>

        </ScreenWrapper>

        {/* MODALES UBICADOS A NIVEL RAÍZ FUERA DE SCREENWRAPPER */}

        {/* MODAL: PERFIL (Con Selectores Compactos Horizontales) */}
        <ThemedModal visible={activeModal === 'profile'} transparent animationType="slide" onRequestClose={() => setActiveModal(null)}>
          <View style={styles.modalOverlayContainer}>
            <TouchableOpacity style={styles.modalTopBackdrop} activeOpacity={1} onPress={() => setActiveModal(null)} />
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ width: '100%' }}>
              <View style={[styles.modalSheetCard, { maxHeight: modalHeight }]}>
                <View style={styles.modalFixedHeader}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Editar Perfil</Text>
                    <TouchableOpacity onPress={() => setActiveModal(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                      <Ionicons name="close" size={22} color="#fff" />
                    </TouchableOpacity>
                  </View>
                </View>
                <ScrollView
                  style={styles.modalScrollBody}
                  contentContainerStyle={styles.modalScrollContentContainer}
                  showsVerticalScrollIndicator={true}
                  keyboardShouldPersistTaps="handled"
                  overScrollMode="always"
                >
                  <View style={styles.avatarSection}>
                    <View style={styles.avatarPickerWrap}>
                      {renderBackgroundView(userData.avatarBg, /^(https?:|file:|blob:|content:)/.test(userData.avatar || '') ? <Image source={{ uri: userData.avatar }} style={styles.avatarImageStyle} /> : <Ionicons name={userData.avatar || 'person'} size={34} color="#fff" />, styles.avatarPreviewContainer)}
                      <TouchableOpacity style={styles.avatarCameraButton} onPress={pickImageFromGallery} activeOpacity={0.8}>
                        <Ionicons name="camera" size={14} color="#000" />
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.avatarSubHint}>Toca la cámara para subir foto o elige abajo</Text>
                  </View>

                  {/* SELECTOR DE COLOR / FONDO DE AVATAR (HORIZONTAL COMPACTO) */}
                  <Text style={styles.inputLabel}>Fondo o color del avatar</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.compactRowScroll}>
                    {PROFILE_BACKGROUNDS.map((bg) => {
                      const isSelected = userData.avatarBg === bg.value;
                      return (
                        <TouchableOpacity
                          key={bg.label}
                          style={[styles.compactBgOption, isSelected && styles.compactBgOptionActive]}
                          onPress={() => setUserData({ ...userData, avatarBg: bg.value })}
                          activeOpacity={0.7}
                        >
                          {renderBackgroundView(bg.value, null, styles.compactBgSwatch)}
                          <Text style={[styles.compactBgLabel, isSelected && { color: '#a3e635', fontWeight: '700' }]} numberOfLines={1}>{bg.label}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>

                  {/* SELECTOR DE ICONO DE AVATAR (HORIZONTAL COMPACTO) */}
                  <Text style={styles.inputLabel}>Icono del avatar</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.compactRowScroll}>
                    {PROFILE_ICONS.map((iconName) => {
                      const isSelected = userData.avatar === iconName;
                      return (
                        <TouchableOpacity
                          key={iconName}
                          style={[styles.compactIconOption, isSelected && styles.compactIconOptionActive]}
                          onPress={() => setUserData({ ...userData, avatar: iconName })}
                          activeOpacity={0.7}
                        >
                          <Ionicons name={iconName} size={20} color={isSelected ? '#a3e635' : '#ccc'} />
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>

                  <Text style={styles.inputLabel}>Nombre completo</Text>
                  <TextInput style={styles.input} value={userData.name} onChangeText={(val) => setUserData({...userData, name: val})} placeholder="Ej. Juan Pérez" placeholderTextColor="#666" />
                  <Text style={styles.inputLabel}>Correo electrónico</Text>
                  <TextInput style={styles.input} value={userData.email} onChangeText={(val) => setUserData({...userData, email: val})} keyboardType="email-address" placeholder="correo@ejemplo.com" placeholderTextColor="#666" />
                  <Text style={styles.inputLabel}>Teléfono</Text>
                  <TextInput style={styles.input} value={userData.phone} onChangeText={(val) => setUserData({...userData, phone: val})} keyboardType="phone-pad" placeholder="Ej. 04121234567" placeholderTextColor="#666" />
                  <Text style={styles.inputLabel}>Fecha de nacimiento</Text>
                  <TextInput style={styles.input} value={userData.birthdate} onChangeText={(val) => setUserData({...userData, birthdate: val})} placeholder="AAAA-MM-DD" placeholderTextColor="#666" />
                </ScrollView>
                <View style={styles.modalFixedFooter}>
                  <TouchableOpacity style={styles.saveBtnFixed} onPress={handleSaveProfile} activeOpacity={0.8}>
                    <Text style={styles.saveBtnText}>Guardar cambios</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </View>
        </ThemedModal>

        {/* MODAL: SEGURIDAD (Compacto y Visible 100%) */}
        <ThemedModal visible={activeModal === 'security'} transparent animationType="slide" onRequestClose={() => setActiveModal(null)}>
          <View style={styles.modalOverlayContainer}>
            <TouchableOpacity style={styles.modalTopBackdrop} activeOpacity={1} onPress={() => setActiveModal(null)} />
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ width: '100%' }}>
              <View style={[styles.modalSheetCard, { maxHeight: modalHeight }]}>
                <View style={styles.modalFixedHeader}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Seguridad y Acceso</Text>
                    <TouchableOpacity onPress={() => setActiveModal(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                      <Ionicons name="close" size={22} color="#fff" />
                    </TouchableOpacity>
                  </View>
                </View>

                <ScrollView
                  style={styles.modalScrollBody}
                  contentContainerStyle={styles.modalScrollContentContainerCompact}
                  showsVerticalScrollIndicator={true}
                  keyboardShouldPersistTaps="handled"
                  overScrollMode="always"
                >
                  {/* Estado actual de la seguridad */}
                  <View style={[styles.securityStatusCard, securityConfig.pinHash && styles.securityStatusCardActive]}>
                    <Ionicons name={securityConfig.pinHash ? 'shield-checkmark' : 'shield-outline'} size={24} color={securityConfig.pinHash ? '#a3e635' : '#888'} />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.securityStatusTitle}>
                        {securityConfig.pinHash ? 'Bloqueo de Pantalla Activo' : 'Bloqueo Desactivado'}
                      </Text>
                      <Text style={styles.securityStatusSubtitle}>
                        {securityConfig.pinHash
                          ? 'Kronos está protegido con PIN de 6 dígitos'
                          : 'Configura un PIN para proteger tu información sensible'}
                      </Text>
                    </View>
                  </View>

                  {!securityConfigReady && <ActivityIndicator color="#a3e635" style={{ marginVertical: 12 }} />}

                  {/* Configuración de PIN */}
                  <Text style={styles.sectionHeaderTitle}>
                    {securityConfig.pinHash ? 'CAMBIAR PIN DE ACCESO' : 'CREAR PIN DE ACCESO'}
                  </Text>

                  {securityConfig.pinHash && (
                    <>
                      <Text style={styles.inputLabel}>PIN actual</Text>
                      <TextInput
                        style={styles.input}
                        value={currentPin}
                        onChangeText={value => setCurrentPin(value.replace(/\D/g, '').slice(0, 6))}
                        keyboardType="number-pad"
                        secureTextEntry
                        maxLength={6}
                        placeholder="Ingresa tu PIN actual"
                        placeholderTextColor="#666"
                      />
                    </>
                  )}

                  <Text style={styles.inputLabel}>{securityConfig.pinHash ? 'Nuevo PIN (6 dígitos)' : 'Crear PIN (6 dígitos)'}</Text>
                  <TextInput
                    style={styles.input}
                    value={newPin}
                    onChangeText={value => setNewPin(value.replace(/\D/g, '').slice(0, 6))}
                    keyboardType="number-pad"
                    secureTextEntry
                    maxLength={6}
                    placeholder="Ej. 123456"
                    placeholderTextColor="#666"
                  />

                  <Text style={styles.inputLabel}>Confirmar PIN</Text>
                  <TextInput
                    style={styles.input}
                    value={confirmPin}
                    onChangeText={value => setConfirmPin(value.replace(/\D/g, '').slice(0, 6))}
                    keyboardType="number-pad"
                    secureTextEntry
                    maxLength={6}
                    placeholder="Repite el PIN"
                    placeholderTextColor="#666"
                  />

                  {!!securityError && <Text style={styles.securityError}>{securityError}</Text>}

                  <TouchableOpacity
                    style={styles.saveBtn}
                    onPress={savePin}
                    disabled={securityBusy || !securityConfigReady}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.saveBtnText}>
                      {securityBusy ? 'Procesando...' : securityConfig.pinHash ? 'Actualizar PIN' : 'Activar Bloqueo'}
                    </Text>
                  </TouchableOpacity>

                  {/* Opciones adicionales cuando el PIN está activo */}
                  {securityConfig.pinHash && (
                    <>
                      <View style={styles.dividerLine} />

                      <Text style={styles.sectionHeaderTitle}>AUTENTICACIÓN BIOMÉTRICA</Text>
                      <View style={styles.switchRowModal}>
                        <View style={{ flex: 1, marginRight: 10 }}>
                          <Text style={styles.rowText}>Huella dactilar / Face ID</Text>
                          <Text style={styles.rowSubtext}>Permite desbloquear la app sin escribir tu PIN</Text>
                        </View>
                        <Switch
                          value={securityConfig.biometricEnabled}
                          onValueChange={toggleBiometrics}
                          disabled={securityBusy || !biometricsAvailable}
                          trackColor={{ false: '#333', true: '#a3e635' }}
                          thumbColor="#fff"
                        />
                      </View>

                      {/* ZONA DE ELIMINACIÓN DE BLOQUEO */}
                      <View style={styles.dangerZoneCard}>
                        <View style={styles.dangerZoneHeader}>
                          <Ionicons name="trash-outline" size={20} color="#f87171" />
                          <Text style={styles.dangerZoneTitle}>Eliminar bloqueo de seguridad</Text>
                        </View>
                        <Text style={styles.dangerZoneSubtitle}>
                          Remueve la protección por PIN y biometría de este dispositivo. Cualquiera con acceso al teléfono podrá abrir Kronos.
                        </Text>
                        <TouchableOpacity
                          style={styles.dangerZoneBtn}
                          onPress={handleConfirmRemovePin}
                          disabled={securityBusy}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="lock-open-outline" size={16} color="#fff" style={{ marginRight: 6 }} />
                          <Text style={styles.dangerZoneBtnText}>
                            {securityBusy ? 'Procesando...' : 'Eliminar bloqueo'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  )}
                </ScrollView>
              </View>
            </KeyboardAvoidingView>
          </View>
        </ThemedModal>

        {/* MODAL: APARIENCIA (Compacto y Visible 100%) */}
        <ThemedModal visible={activeModal === 'appearance'} transparent animationType="slide" onRequestClose={() => setActiveModal(null)}>
          <View style={styles.modalOverlayContainer}>
            <TouchableOpacity style={styles.modalTopBackdrop} activeOpacity={1} onPress={() => setActiveModal(null)} />
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ width: '100%' }}>
              <View style={[styles.modalSheetCard, { maxHeight: modalHeight }]}>
                <View style={styles.modalFixedHeader}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Apariencia</Text>
                    <TouchableOpacity onPress={() => setActiveModal(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                      <Ionicons name="close" size={22} color="#fff" />
                    </TouchableOpacity>
                  </View>
                </View>
                <ScrollView
                  style={styles.modalScrollBody}
                  contentContainerStyle={styles.modalScrollContentContainerCompact}
                  showsVerticalScrollIndicator={true}
                  overScrollMode="always"
                >
                  {[
                    { value: 'light', label: 'Claro', icon: 'sunny-outline', desc: 'Interfaz clara con fondo blanco y contrastes legibles' },
                    { value: 'dark', label: 'Oscuro', icon: 'moon-outline', desc: 'Interfaz oscura optimizada para baja luminosidad' },
                    { value: 'system', label: 'Sistema', icon: 'phone-portrait-outline', desc: 'Se adapta automáticamente a la configuración de tu teléfono' },
                  ].map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[styles.themeOptionCard, themeMode === option.value && styles.themeOptionCardActive]}
                      onPress={() => savePreference('themeMode', option.value)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.themeOptionIconBox}>
                        <Ionicons name={option.icon} size={22} color={themeMode === option.value ? '#a3e635' : '#aaa'} />
                      </View>
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={[styles.themeOptionLabel, themeMode === option.value && { color: '#a3e635' }]}>
                          {option.label}
                        </Text>
                        <Text style={styles.themeOptionDesc}>{option.desc}</Text>
                      </View>
                      {themeMode === option.value && (
                        <Ionicons name="checkmark-circle" size={22} color="#a3e635" />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </KeyboardAvoidingView>
          </View>
        </ThemedModal>

        {/* MODAL: DIVISAS VISIBLES (Con botón visible para guardar preferencias) */}
        <ThemedModal visible={activeModal === 'currencies'} transparent animationType="slide" onRequestClose={() => setActiveModal(null)}>
          <View style={styles.modalOverlayContainer}>
            <TouchableOpacity style={styles.modalTopBackdrop} activeOpacity={1} onPress={() => setActiveModal(null)} />
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ width: '100%' }}>
              <View style={[styles.modalSheetCard, { height: modalHeight }]}>

                {/* CABECERA FIJA */}
                <View style={styles.modalFixedHeader}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Divisas Visibles y Tasas</Text>
                    <TouchableOpacity onPress={() => setActiveModal(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                      <Ionicons name="close" size={22} color="#fff" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* ZONA CENTRAL SCROLLABLE */}
                <View style={styles.modalBodyContainer}>
                  <ScrollView
                    style={styles.modalScrollView}
                    contentContainerStyle={styles.modalScrollContentContainer}
                    showsVerticalScrollIndicator={true}
                    overScrollMode="always"
                  >

                    {/* MONEDA PRINCIPAL */}
                    <Text style={styles.currencySectionHeader}>MONEDA PRINCIPAL</Text>
                    <Text style={styles.currencySectionSubtitle}>Moneda predeterminada para calcular totales y saldos</Text>

                    <View style={styles.currencySubGrid}>
                      {SUPPORTED_CURRENCIES.map(currency => {
                        const code = currency.code;
                        const selected = tempPrimaryCurrency === code;
                        return (
                          <TouchableOpacity
                            key={code}
                            onPress={() => setTempPrimaryCurrency(code)}
                            style={[styles.currencySubOption, selected && styles.currencySubOptionActive]}
                            activeOpacity={0.7}
                          >
                            <Text style={[styles.currencySubCode, selected && { color: '#a3e635' }]}>
                              {currency?.symbol} {code}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    {/* PAÍS DE USO */}
                    <Text style={styles.currencySectionHeader}>PAÍS DE OPERACIÓN</Text>
                    <Text style={styles.currencySectionSubtitle}>Optimiza la obtención de tasas de cambio según tu ubicación</Text>

                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
                      {[
                        { code: 'VE', label: 'Venezuela (Bs / BCV)' },
                        { code: 'INTL', label: 'Otro país / Global' },
                      ].map(option => {
                        const selected = tempCountry === option.code;
                        return (
                          <TouchableOpacity
                            key={option.code}
                            onPress={() => setTempCountry(option.code)}
                            style={[styles.currencySubOptionWide, selected && styles.currencySubOptionActive]}
                            activeOpacity={0.7}
                          >
                            <Text style={[styles.currencySubCode, selected && { color: '#a3e635' }]}>
                              {option.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    {/* DIVISAS HABILITADAS */}
                    <View style={styles.currencyListHeaderRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.currencySectionHeader}>DIVISAS HABILITADAS</Text>
                        <Text style={styles.currencySectionSubtitle}>Selecciona las monedas visibles en Inicio y Cuentas</Text>
                      </View>
                      <TouchableOpacity onPress={handleSelectAllCurrencies} style={styles.quickActionPill}>
                        <Text style={styles.quickActionPillText}>Todas</Text>
                      </TouchableOpacity>
                    </View>

                    {SUPPORTED_CURRENCIES.map(currency => {
                      const selected = tempDisplayCurrencies.includes(currency.code);
                      const bolivarRate = getBolivarRate(currency.code, rates);
                      const rateText = bolivarRate ? `${bolivarRate.toLocaleString('es-VE', { maximumFractionDigits: 3 })} Bs.` : '—';
                      return (
                        <TouchableOpacity
                          key={currency.code}
                          style={[styles.currencyListRow, selected && styles.currencyListRowActive]}
                          onPress={() => toggleTempDisplayCurrency(currency.code)}
                          activeOpacity={0.7}
                        >
                          <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                              <Text style={[styles.currencyListSymbol, selected && { color: '#a3e635' }]}>{currency.symbol}</Text>
                              <Text style={[styles.currencyListCode, selected && { color: '#fff' }]}>{currency.code} - {currency.name}</Text>
                            </View>
                            <Text style={styles.currencyListRate}>Referencia BCV: 1 {currency.code} = {rateText}</Text>
                          </View>
                          <Ionicons name={selected ? "checkbox" : "square-outline"} size={22} color={selected ? "#a3e635" : "#555"} />
                        </TouchableOpacity>
                      );
                    })}

                  </ScrollView>
                </View>

                {/* PIE DE PÁGINA FIJO CON BOTÓN GUARDAR */}
                <View style={styles.modalFixedFooter}>
                  <TouchableOpacity style={styles.saveBtnFixed} onPress={handleSaveAllCurrencies} activeOpacity={0.8}>
                    <Ionicons name="checkmark-circle-outline" size={18} color="#000" style={{ marginRight: 6 }} />
                    <Text style={styles.saveBtnText}>Guardar preferencias de divisas</Text>
                  </TouchableOpacity>
                </View>

              </View>
            </KeyboardAvoidingView>
          </View>
        </ThemedModal>

        {/* MODAL: NOTIFICACIONES (Compacto y Visible 100%) */}
        <ThemedModal visible={activeModal === 'notifications'} transparent animationType="slide" onRequestClose={() => setActiveModal(null)}>
          <View style={styles.modalOverlayContainer}>
            <TouchableOpacity style={styles.modalTopBackdrop} activeOpacity={1} onPress={() => setActiveModal(null)} />
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ width: '100%' }}>
              <View style={[styles.modalSheetCard, { maxHeight: modalHeight }]}>
                <View style={styles.modalFixedHeader}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Notificaciones y Alertas</Text>
                    <TouchableOpacity onPress={() => setActiveModal(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                      <Ionicons name="close" size={22} color="#fff" />
                    </TouchableOpacity>
                  </View>
                </View>

                <ScrollView
                  style={styles.modalScrollBody}
                  contentContainerStyle={styles.modalScrollContentContainerCompact}
                  showsVerticalScrollIndicator={true}
                  overScrollMode="always"
                >
                  <View style={styles.switchRowModal}>
                    <View style={{ flex: 1, marginRight: 10 }}>
                      <Text style={styles.rowText}>Noticias y novedades</Text>
                      <Text style={styles.rowSubtext}>Avisos sobre nuevas funciones y actualizaciones de Kronos</Text>
                    </View>
                    <Switch
                      value={savedNotificationSettings.emailNews}
                      onValueChange={(value) => updateNotificationPreference('emailNews', value)}
                      trackColor={{ false: '#333', true: '#a3e635' }}
                      thumbColor="#fff"
                    />
                  </View>

                  <View style={styles.switchRowModal}>
                    <View style={{ flex: 1, marginRight: 10 }}>
                      <Text style={styles.rowText}>Recibos de pago</Text>
                      <Text style={styles.rowSubtext}>Confirmaciones por correo al registrar transacciones</Text>
                    </View>
                    <Switch
                      value={savedNotificationSettings.emailReceipts}
                      onValueChange={(value) => updateNotificationPreference('emailReceipts', value)}
                      trackColor={{ false: '#333', true: '#a3e635' }}
                      thumbColor="#fff"
                    />
                  </View>

                  <View style={styles.switchRowModal}>
                    <View style={{ flex: 1, marginRight: 10 }}>
                      <Text style={styles.rowText}>Resúmenes financieros</Text>
                      <Text style={styles.rowSubtext}>Informes periódicos de tu balance e historial</Text>
                    </View>
                    <Switch
                      value={savedNotificationSettings.emailSummaries}
                      onValueChange={(value) => updateNotificationPreference('emailSummaries', value)}
                      trackColor={{ false: '#333', true: '#a3e635' }}
                      thumbColor="#fff"
                    />
                  </View>

                  <View style={styles.switchRowModal}>
                    <View style={{ flex: 1, marginRight: 10 }}>
                      <Text style={styles.rowText}>Recordatorios push</Text>
                      <Text style={styles.rowSubtext}>Alertas en tiempo real sobre pagos pendientes y metas</Text>
                    </View>
                    <Switch
                      value={savedNotificationSettings.pushReminders}
                      onValueChange={(value) => updateNotificationPreference('pushReminders', value)}
                      trackColor={{ false: '#333', true: '#a3e635' }}
                      thumbColor="#fff"
                    />
                  </View>
                </ScrollView>
              </View>
            </KeyboardAvoidingView>
          </View>
        </ThemedModal>

        {/* MODAL: USO (Estilo Habilidades de Videojuego RPG - INTACTO) */}
        <ThemedModal visible={activeModal === 'usage'} transparent animationType="slide" onRequestClose={() => setActiveModal(null)}>
          <View style={styles.modalOverlayContainer}>
            <TouchableOpacity style={styles.modalTopBackdrop} activeOpacity={1} onPress={() => setActiveModal(null)} />
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ width: '100%' }}>
              <View style={[styles.modalSheetCard, { height: modalHeight }]}>

                {/* CABECERA FIJA */}
                <View style={styles.modalFixedHeader}>
                  <View style={styles.modalHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Ionicons name="game-controller-outline" size={22} color="#a3e635" />
                      <Text style={styles.modalTitle}>Árbol de Habilidades Kronos</Text>
                    </View>
                    <TouchableOpacity onPress={() => setActiveModal(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                      <Ionicons name="close" size={22} color="#fff" />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.rpgModalSubtitle}>
                    Estadísticas y capacidades activas en tu sistema de gestión financiera
                  </Text>
                </View>

                {/* ZONA CENTRAL CON SCROLL PARA LAS TARJETAS DE HABILIDADES */}
                <View style={styles.modalBodyContainer}>
                  <ScrollView
                    style={styles.modalScrollView}
                    contentContainerStyle={styles.modalScrollContentContainer}
                    showsVerticalScrollIndicator={true}
                    overScrollMode="always"
                  >
                    <View style={styles.rpgSkillsContainer}>
                      {usageSkills.map((skill) => (
                        <View key={skill.id} style={[styles.skillCard, { borderColor: `${skill.color}45` }]}>

                          {/* Cabecera de la habilidad: Tipo y Rango */}
                          <View style={styles.skillHeaderRow}>
                            <View style={[styles.skillTypeBadge, { backgroundColor: `${skill.color}18`, borderColor: `${skill.color}50` }]}>
                              <Ionicons name="flash" size={10} color={skill.color} style={{ marginRight: 4 }} />
                              <Text style={[styles.skillTypeText, { color: skill.color }]}>{skill.type}</Text>
                            </View>
                            <View style={styles.skillRankBadge}>
                              <Text style={styles.skillRankText}>{skill.rank}</Text>
                            </View>
                          </View>

                          {/* Cuerpo de la tarjeta: Icono, Nombre y Contador */}
                          <View style={styles.skillBodyRow}>
                            <View style={[styles.skillIconBox, { backgroundColor: `${skill.color}15`, borderColor: `${skill.color}60` }]}>
                              <Ionicons name={skill.icon} size={22} color={skill.color} />
                            </View>

                            <View style={styles.skillTitleWrap}>
                              <Text style={styles.skillNameText}>{skill.skillName}</Text>
                              <Text style={styles.skillLabelText}>{skill.label}</Text>
                            </View>

                            <View style={[styles.skillStatBadge, { borderColor: `${skill.color}50`, backgroundColor: 'rgba(0,0,0,0.4)' }]}>
                              <Text style={[styles.skillStatValue, { color: skill.color }]}>{skill.count}</Text>
                              <Text style={styles.skillStatUnit}>{skill.unit}</Text>
                            </View>
                          </View>

                          {/* Explicación descriptiva de la habilidad */}
                          <Text style={styles.skillDescriptionText}>{skill.description}</Text>

                          {/* Barra de energía / Carga de habilidad RPG */}
                          <View style={styles.skillPowerTrack}>
                            <View style={[styles.skillPowerFill, { width: `${skill.power}%`, backgroundColor: skill.color }]} />
                          </View>

                        </View>
                      ))}
                    </View>
                  </ScrollView>
                </View>

                {/* PIE DE PÁGINA FIJO */}
                <View style={styles.modalFixedFooter}>
                  <TouchableOpacity style={styles.saveBtnFixed} onPress={() => setActiveModal(null)} activeOpacity={0.8}>
                    <Ionicons name="checkmark-circle-outline" size={18} color="#000" style={{ marginRight: 6 }} />
                    <Text style={styles.saveBtnText}>Entendido</Text>
                  </TouchableOpacity>
                </View>

              </View>
            </KeyboardAvoidingView>
          </View>
        </ThemedModal>

      </View>
    </ThemeContent>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  scrollContent: { padding: 16, paddingBottom: 50 },
  groupCard: { backgroundColor: '#1a1a1a', borderRadius: 20, marginBottom: 16, borderWidth: 1, borderColor: '#222', overflow: 'hidden' },
  groupItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  groupDivider: { height: 1, backgroundColor: '#262626', marginHorizontal: 16 },
  rowInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  iconBox: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#111', borderWidth: 1, borderColor: '#333', justifyContent: 'center', alignItems: 'center' },
  iconBoxRed: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(248, 113, 113, 0.1)', borderWidth: 1, borderColor: 'rgba(248, 113, 113, 0.3)', justifyContent: 'center', alignItems: 'center' },
  cardTitle: { color: '#fff', fontSize: 14, fontWeight: '600' },
  cardSubtitle: { color: '#888', fontSize: 11, marginTop: 2 },
  footerContainer: { alignItems: 'center', marginTop: 10, marginBottom: 20 },
  versionText: { color: '#666', fontSize: 12 },

  // Estructura de Modal con Alto Determinado e Independiente
  modalOverlayContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.80)',
    justifyContent: 'flex-end',
  },
  modalTopBackdrop: {
    flex: 1,
    width: '100%',
  },
  modalSheetCard: {
    backgroundColor: '#121316',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: '#2d3038',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  modalFixedHeader: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#262832',
    backgroundColor: '#121316',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { color: '#fff', fontSize: 17, fontWeight: '700' },
  modalBodyContainer: {
    flex: 1,
    backgroundColor: '#0d0e11',
  },
  modalScrollView: {
    flexShrink: 1,
    width: '100%',
  },
  modalScrollContentContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 40,
  },
  modalScrollContentContainerCompact: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 24,
  },
  modalFixedFooter: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
    borderTopWidth: 1,
    borderTopColor: '#262832',
    backgroundColor: '#121316',
  },

  // Perfil (Sin modificar)
  avatarSection: { alignItems: 'center', marginBottom: 16 },
  avatarPickerWrap: { width: 72, height: 72, marginBottom: 7, position: 'relative' },
  avatarPreviewContainer: { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: '#333', overflow: 'hidden' },
  avatarImageStyle: { width: '100%', height: '100%', borderRadius: 32 },
  avatarCameraButton: { position: 'absolute', right: -2, bottom: 0, width: 24, height: 24, borderRadius: 12, backgroundColor: '#a3e635', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#111' },
  avatarSubHint: { color: '#888', fontSize: 11, marginTop: 6, textAlign: 'center' },

  // Selectores de Avatar Compactos Horizontales
  compactRowScroll: {
    gap: 8,
    paddingVertical: 4,
    paddingBottom: 12,
  },
  compactBgOption: {
    width: 60,
    alignItems: 'center',
  },
  compactBgOptionActive: {
    opacity: 1,
  },
  compactBgSwatch: {
    width: 52,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  compactBgLabel: {
    color: '#888',
    fontSize: 9,
    marginTop: 3,
    textAlign: 'center',
  },
  compactIconOption: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#181a20',
    borderWidth: 1,
    borderColor: '#2d3038',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  compactIconOptionActive: {
    borderColor: '#a3e635',
    backgroundColor: 'rgba(163,230,53,0.12)',
  },

  // Estilos de Seguridad
  securityStatusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1c22',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2a2d36',
    marginBottom: 16,
  },
  securityStatusCardActive: {
    borderColor: 'rgba(163, 230, 53, 0.4)',
    backgroundColor: 'rgba(163, 230, 53, 0.06)',
  },
  securityStatusTitle: { color: '#fff', fontSize: 14, fontWeight: '700' },
  securityStatusSubtitle: { color: '#888', fontSize: 11, marginTop: 2 },
  sectionHeaderTitle: { color: '#888', fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginBottom: 8, marginTop: 10 },
  dividerLine: { height: 1, backgroundColor: '#262930', marginVertical: 16 },

  // Zona de Peligro / Eliminar Bloqueo
  dangerZoneCard: {
    backgroundColor: 'rgba(248, 113, 113, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.3)',
    borderRadius: 16,
    padding: 14,
    marginTop: 18,
  },
  dangerZoneHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  dangerZoneTitle: { color: '#f87171', fontSize: 13, fontWeight: '700', marginLeft: 8 },
  dangerZoneSubtitle: { color: '#aaa', fontSize: 11, lineHeight: 16, marginBottom: 12 },
  dangerZoneBtn: {
    backgroundColor: '#ef4444',
    borderRadius: 12,
    paddingVertical: 11,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dangerZoneBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  // Apariencia
  themeOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#181a20',
    borderWidth: 1,
    borderColor: '#262832',
    marginBottom: 10,
  },
  themeOptionCardActive: {
    borderColor: '#a3e635',
    backgroundColor: 'rgba(163, 230, 53, 0.08)',
  },
  themeOptionIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#111318',
    justifyContent: 'center',
    alignItems: 'center',
  },
  themeOptionLabel: { color: '#fff', fontSize: 14, fontWeight: '700' },
  themeOptionDesc: { color: '#777', fontSize: 11, marginTop: 2 },

  // Divisas Visibles
  currencySectionHeader: { color: '#aaa', fontSize: 11, fontWeight: '700', letterSpacing: 0.8 },
  currencySectionSubtitle: { color: '#666', fontSize: 11, marginBottom: 10, marginTop: 2 },
  currencySubGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 14, rowGap: 10 },
  currencySubOption: { width: '23%', alignItems: 'center', paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: '#2d3038', backgroundColor: '#181a20' },
  currencySubOptionWide: { width: '48%', alignItems: 'center', paddingVertical: 11, borderRadius: 12, borderWidth: 1, borderColor: '#2d3038', backgroundColor: '#181a20' },
  currencySubOptionActive: { borderColor: '#a3e635', backgroundColor: 'rgba(163, 230, 53, 0.12)' },
  currencySubCode: { color: '#ccc', fontWeight: '700', fontSize: 12 },
  currencyListHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  quickActionPill: { backgroundColor: '#1f222a', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#333' },
  quickActionPillText: { color: '#a3e635', fontSize: 11, fontWeight: '600' },
  currencyListRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 13, borderRadius: 14, backgroundColor: '#181a20', borderWidth: 1, borderColor: '#262832', marginBottom: 8 },
  currencyListRowActive: { backgroundColor: 'rgba(163,230,53,0.08)', borderColor: 'rgba(163,230,53,0.5)' },
  currencyListSymbol: { color: '#888', fontSize: 15, fontWeight: '700' },
  currencyListCode: { color: '#888', fontSize: 13, fontWeight: '600' },
  currencyListRate: { color: '#666', fontSize: 11, marginTop: 2 },

  // Notificaciones
  switchRowModal: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#22252e' },
  rowText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  rowSubtext: { color: '#777', fontSize: 11, marginTop: 2 },

  // Tarjetas de Habilidades RPG (Módulo USO)
  rpgModalSubtitle: { color: '#888', fontSize: 12, marginTop: 4 },
  rpgSkillsContainer: { width: '100%' },
  skillCard: {
    backgroundColor: '#16181f',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    position: 'relative',
    overflow: 'hidden',
    marginBottom: 12,
  },
  skillHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  skillTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  skillTypeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  skillRankBadge: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  skillRankText: { color: '#fbbf24', fontSize: 10, fontWeight: '800' },
  skillBodyRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  skillIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    marginRight: 12,
  },
  skillTitleWrap: { flex: 1 },
  skillNameText: { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 0.2 },
  skillLabelText: { color: '#888', fontSize: 11, marginTop: 2 },
  skillStatBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  skillStatValue: { fontSize: 18, fontWeight: '900' },
  skillStatUnit: { color: '#888', fontSize: 9, fontWeight: '700', textTransform: 'uppercase' },
  skillDescriptionText: { color: '#bbb', fontSize: 12, lineHeight: 17, marginBottom: 12 },
  skillPowerTrack: { height: 4, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' },
  skillPowerFill: { height: '100%', borderRadius: 2 },

  // Formulario e Inputs Generales
  inputLabel: { color: '#aaa', fontSize: 12, marginBottom: 6, fontWeight: '600' },
  input: { backgroundColor: '#181a20', borderRadius: 12, padding: 12, color: '#fff', fontSize: 14, borderWidth: 1, borderColor: '#2d3038', marginBottom: 12 },
  securityError: { color: '#f87171', fontSize: 12, marginBottom: 10, fontWeight: '600' },
  saveBtn: {
    backgroundColor: '#a3e635',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginTop: 14,
  },
  saveBtnFixed: {
    backgroundColor: '#a3e635',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  saveBtnText: { color: '#000', fontSize: 14, fontWeight: '800' },
});
