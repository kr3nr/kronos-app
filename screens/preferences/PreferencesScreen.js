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
  Modal,
  ActivityIndicator,
  Image,
  TouchableWithoutFeedback,
  Keyboard,
  KeyboardAvoidingView,
} from 'react-native';
import { Alert } from '../../services/appAlert';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
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

  // Estados de datos de perfil
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
  const KeyboardDismissWrapper = Platform.OS === 'web' ? View : TouchableWithoutFeedback;
  const keyboardDismissWrapperProps = Platform.OS === 'web'
    ? { style: { flex: 1 } }
    : { onPress: Keyboard.dismiss };

  // Estados internos de configuración
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
  const displayCurrencies = settings.displayCurrencies?.length
    ? settings.displayCurrencies
    : ['USD', 'EUR', 'USDT', 'VES'];
  const notificationSettings = settings.notifications || {};
  const preferenceDefaults = {
    emailNews: true,
    emailReceipts: true,
    emailSummaries: false,
    pushReminders: false,
  };
  const savedNotificationSettings = { ...preferenceDefaults, ...notificationSettings };

  const usageData = [
    { label: 'Cuentas', count: accounts.length, icon: 'wallet-outline', color: '#a3e635' },
    { label: 'Movimientos', count: movements.length, icon: 'swap-horizontal-outline', color: '#38bdf8' },
    { label: 'Categorías', count: categories.length, icon: 'pricetags-outline', color: '#c084fc' },
    { label: 'Metas', count: goals.length, icon: 'flag-outline', color: '#fbbf24' },
    { label: 'Listas de compras', count: shoppingLists.length, icon: 'cart-outline', color: '#fb923c' },
    { label: 'Pagos programados', count: transactions.filter(item => item.type === 'pay' || item.type === 'receive').length, icon: 'calendar-outline', color: '#f472b6' },
    { label: 'Plantillas recurrentes', count: recurringTemplates.length, icon: 'repeat-outline', color: '#34d399' },
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
      setSecurityError('La configuración de seguridad aún no está lista. Cierra y vuelve a abrir esta pantalla.');
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
      setSecurityError('No se pudo guardar el PIN de forma segura. Inténtalo de nuevo.');
    } finally {
      setSecurityBusy(false);
    }
  };

  const disablePin = async () => {
    setSecurityError('');
    if (!securityConfigReady) {
      setSecurityError('La configuración de seguridad aún no está lista. Cierra y vuelve a abrir esta pantalla.');
      return;
    }
    setSecurityBusy(true);
    try {
      const currentResult = await verifyLocalPin(userId, currentPin);
      if (!currentResult.success) {
        setSecurityError('El PIN actual no es correcto.');
        return;
      }
      const updated = await removeLocalPin(userId);
      setSecurityConfig(updated);
      onLocalSecurityChanged?.(updated);
      setCurrentPin('');
      setNewPin('');
      setConfirmPin('');
      showAlert('Bloqueo desactivado', 'Se eliminó el PIN y la biometría local de este dispositivo.');
    } catch (error) {
      console.error('Error al desactivar el PIN local:', error);
      setSecurityError('No se pudo desactivar el bloqueo. Inténtalo de nuevo.');
    } finally {
      setSecurityBusy(false);
    }
  };

  const toggleBiometrics = async (enabled) => {
    setSecurityError('');
    if (!securityConfigReady) {
      setSecurityError('La configuración de seguridad aún no está lista. Cierra y vuelve a abrir esta pantalla.');
      return;
    }
    if (!securityConfig.pinHash) {
      setSecurityError('Configura primero un PIN: será el método alternativo de desbloqueo.');
      return;
    }
    if (enabled && !biometricsAvailable) {
      setSecurityError('Este dispositivo no tiene biometría configurada. Registra tu huella o rostro en los ajustes del dispositivo.');
      return;
    }
    setSecurityBusy(true);
    try {
      const updated = await setLocalBiometricEnabled(userId, enabled);
      setSecurityConfig(updated);
      onLocalSecurityChanged?.(updated);
    } catch (error) {
      console.error('Error al actualizar la biometría local:', error);
      setSecurityError('No se pudo actualizar la opción biométrica. Inténtalo de nuevo.');
    } finally {
      setSecurityBusy(false);
    }
  };

  const savePreference = (key, value) => {
    if (onUpdateSetting) onUpdateSetting(key, value);
  };

  const toggleDisplayCurrency = (currencyCode) => {
    const isEnabled = displayCurrencies.includes(currencyCode);
    if (isEnabled && displayCurrencies.length === 1) {
      showAlert('Debe quedar una divisa', 'Mantén al menos una divisa visible en el inicio y en cuentas.');
      return;
    }
    const updatedCurrencies = isEnabled
      ? displayCurrencies.filter(code => code !== currencyCode)
      : SUPPORTED_CURRENCIES.map(currency => currency.code).filter(code => displayCurrencies.includes(code) || code === currencyCode);
    savePreference('displayCurrencies', updatedCurrencies);
  };

  const updateNotificationPreference = async (key, value) => {
    if (key.startsWith('push') && value) {
      if (Platform.OS === 'web') {
        showAlert('Notificaciones push', 'Las notificaciones push de Kronos requieren la aplicación instalada en iOS o Android.');
        return;
      }
      try {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== 'granted') {
          setNotificationPermission(false);
          showAlert('Permiso denegado', 'Activa las notificaciones de Kronos en los ajustes del dispositivo para habilitar esta opción.');
          return;
        }
        setNotificationPermission(true);
      } catch (error) {
        console.error('Error al solicitar permisos de notificaciones:', error);
        showAlert('Error de permisos', 'No se pudo solicitar permiso para las notificaciones. Inténtalo de nuevo.');
        return;
      }
    }
    savePreference('notifications', { ...savedNotificationSettings, [key]: value });
  };

  // Cargar perfil del usuario desde Supabase
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

  // Guardar cambios del perfil en Supabase
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

  // Selector de imagen de galería
  const pickImageFromGallery = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        showAlert("Permiso denegado", "Se requieren permisos para acceder a la galería.");
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
      showAlert("Error", "No se pudo cargar la imagen.");
    }
  };

  // Función para Cerrar Sesión
  const handleSignOut = () => {
    showAlert(
      "Cerrar sesión",
      "¿Estás seguro de que deseas cerrar sesión en Kronos?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Sí, cerrar sesión",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              if (!onLogout) {
                throw new Error('La acción para cerrar sesión no está disponible.');
              }
              await onLogout();
            } catch (err) {
              console.error('Error al cerrar sesión:', err);
              setLoading(false);
              showAlert("Error al cerrar sesión", err.message || "No se pudo completar el cierre de sesión.");
            }
          }
        }
      ]
    );
  };

  // Zona de peligro: Comenzar de cero
  const handleFactoryReset = () => {
    showAlert(
      "Comenzar de cero",
      "¿Estás seguro de que deseas borrar todos tus registros, cuentas y movimientos de tu cuenta?",
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
              showAlert("Restablecido", "Todos los datos de tu cuenta han sido eliminados correctamente.");
              await fetchUserSettings();
            } catch (err) {
              console.error('Error al restablecer los datos:', err);
              showAlert("Error al restablecer los datos", err.message || "No se pudieron restablecer los datos.");
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleDeleteAccount = () => {
    showAlert(
      "Eliminación no disponible",
      "La eliminación permanente de cuentas no está configurada. Contacta con soporte para solicitarla."
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

      <ScreenWrapper contentContainerStyle={styles.scrollContent}>
        
        {/* BLOQUE 1: CUENTA */}
        <View style={styles.groupCard}>
          <TouchableOpacity style={styles.groupItem} onPress={() => setActiveModal('profile')} activeOpacity={0.7}>
            <View style={styles.rowInfo}>
              <View style={styles.iconBox}>
                <Ionicons name="person-outline" size={20} color="#a3e635" />
              </View>
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={styles.cardTitle}>Perfil</Text>
                <Text style={styles.cardSubtitle} numberOfLines={1}>Tu nombre, foto, correo y datos personales</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#888" />
          </TouchableOpacity>

          <View style={styles.groupDivider} />

          <TouchableOpacity style={styles.groupItem} onPress={() => setActiveModal('security')} activeOpacity={0.7}>
            <View style={styles.rowInfo}>
              <View style={styles.iconBox}>
                <Ionicons name="shield-checkmark-outline" size={20} color="#a3e635" />
              </View>
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={styles.cardTitle}>Seguridad</Text>
                <Text style={styles.cardSubtitle} numberOfLines={1}>PIN de acceso y biometría</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#888" />
          </TouchableOpacity>
        </View>

        {/* BLOQUE 2: PREFERENCIAS */}
        <View style={styles.groupCard}>
          <TouchableOpacity style={styles.groupItem} onPress={() => setActiveModal('appearance')} activeOpacity={0.7}>
            <View style={styles.rowInfo}>
              <View style={styles.iconBox}>
                <Ionicons name="color-palette-outline" size={20} color="#a3e635" />
              </View>
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={styles.cardTitle}>Apariencia</Text>
                <Text style={styles.cardSubtitle} numberOfLines={1}>Tema claro, oscuro o el sistema</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#888" />
          </TouchableOpacity>

          <View style={styles.groupDivider} />

          <TouchableOpacity style={styles.groupItem} onPress={() => setActiveModal('currencies')} activeOpacity={0.7}>
            <View style={styles.rowInfo}>
              <View style={styles.iconBox}>
                <Ionicons name="cash-outline" size={20} color="#a3e635" />
              </View>
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={styles.cardTitle}>Divisas visibles</Text>
                <Text style={styles.cardSubtitle} numberOfLines={1}>Elige cuáles mostrar en inicio y cuentas</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#888" />
          </TouchableOpacity>

          <View style={styles.groupDivider} />

          <TouchableOpacity style={styles.groupItem} onPress={() => setActiveModal('notifications')} activeOpacity={0.7}>
            <View style={styles.rowInfo}>
              <View style={styles.iconBox}>
                <Ionicons name="notifications-outline" size={20} color="#a3e635" />
              </View>
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={styles.cardTitle}>Notificaciones</Text>
                <Text style={styles.cardSubtitle} numberOfLines={1}>Correo y notificaciones push</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#888" />
          </TouchableOpacity>

          <View style={styles.groupDivider} />

          <TouchableOpacity style={styles.groupItem} onPress={() => setActiveModal('usage')} activeOpacity={0.7}>
            <View style={styles.rowInfo}>
              <View style={styles.iconBox}>
                <Ionicons name="stats-chart-outline" size={20} color="#a3e635" />
              </View>
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={styles.cardTitle}>Uso</Text>
                <Text style={styles.cardSubtitle} numberOfLines={1}>Lo que llevas usado de cada límite</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#888" />
          </TouchableOpacity>
        </View>

        {/* BLOQUE 3: SESIÓN Y ZONA DE PELIGRO */}
        <View style={styles.groupCard}>
          {/* Opción de Cerrar Sesión */}
          <TouchableOpacity style={styles.groupItem} onPress={handleSignOut} activeOpacity={0.7}>
            <View style={styles.rowInfo}>
              <View style={styles.iconBoxRed}>
                <Ionicons name="log-out-outline" size={20} color="#f87171" />
              </View>
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={[styles.cardTitle, { color: '#f87171' }]}>Cerrar sesión</Text>
                <Text style={styles.cardSubtitle} numberOfLines={1}>Finaliza tu sesión actual de forma segura</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#888" />
          </TouchableOpacity>

          <View style={styles.groupDivider} />

          <TouchableOpacity style={styles.groupItem} onPress={handleFactoryReset} activeOpacity={0.7}>
            <View style={styles.rowInfo}>
              <View style={styles.iconBoxRed}>
                <Ionicons name="refresh-outline" size={20} color="#f87171" />
              </View>
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={[styles.cardTitle, { color: '#f87171' }]}>Comenzar de cero</Text>
                <Text style={styles.cardSubtitle} numberOfLines={1}>Borra tus datos registrados, no la cuenta</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#888" />
          </TouchableOpacity>

          <View style={styles.groupDivider} />

          <TouchableOpacity style={styles.groupItem} onPress={handleDeleteAccount} activeOpacity={0.7}>
            <View style={styles.rowInfo}>
              <View style={styles.iconBoxRed}>
                <Ionicons name="trash-outline" size={20} color="#f87171" />
              </View>
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={[styles.cardTitle, { color: '#f87171' }]}>Eliminar cuenta</Text>
                <Text style={styles.cardSubtitle} numberOfLines={1}>La eliminación permanente no está disponible todavía</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#888" />
          </TouchableOpacity>
        </View>

        {/* PIE DE PÁGINA */}
        <View style={styles.footerContainer}>
          <Text style={styles.versionText}>
            Versión {Constants.expoConfig?.version || '1.0.0'}
          </Text>
          <View style={[styles.footerLogoContainer, isLightTheme && styles.footerLogoContainerLight]}>
            <Image source={require('../../assets/name-app.png')} style={styles.footerLogo} resizeMode="contain" />
          </View>
        </View>

      </ScreenWrapper>

{/* MODAL: PERFIL */}
<ThemedModal visible={activeModal === 'profile'} transparent animationType="slide" onRequestClose={() => setActiveModal(null)}>
  <View style={styles.modalOverlay}>
    <TouchableOpacity style={{ flex: 1, justifyContent: 'flex-end' }} activeOpacity={1} onPress={() => setActiveModal(null)}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ width: '100%' }}>
        <TouchableWithoutFeedback>
          <View style={[styles.modalContent, { maxHeight: '85%' }]} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Editar Perfil</Text>
              <TouchableOpacity onPress={() => setActiveModal(null)}>
                <Ionicons name="close" size={22} color="#fff" />
              </TouchableOpacity>
            </View>

            <ScrollView
              contentContainerStyle={styles.profileEditorContent}
              showsVerticalScrollIndicator={true}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            >
              <View style={styles.avatarSection}>
                <View style={styles.avatarPickerWrap}>
                  {renderBackgroundView(
                    userData.avatarBg,
                    /^(https?:|file:|blob:|content:)/.test(userData.avatar || '') ? (
                      <Image source={{ uri: userData.avatar }} style={styles.avatarImageStyle} />
                    ) : (
                      <Ionicons name={userData.avatar || 'person'} size={34} color="#fff" />
                    ),
                    styles.avatarPreviewContainer
                  )}
                  <TouchableOpacity
                    style={styles.avatarCameraButton}
                    onPress={pickImageFromGallery}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel="Elegir foto de perfil"
                  >
                    <Ionicons name="camera" size={14} color="#000" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.avatarSectionSub}>Elige un icono o toca la cámara para usar una foto</Text>
              </View>

              <Text style={styles.sectionLabel}>ICONO</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalIconsContainer}
                keyboardShouldPersistTaps="handled"
              >
                {PROFILE_ICONS.map((iconName) => (
                  <TouchableOpacity
                    key={iconName}
                    style={[styles.iconChoiceItemSmall, userData.avatar === iconName && styles.selectedChoiceItem]}
                    onPress={() => setUserData({ ...userData, avatar: iconName })}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={`Icono ${iconName}`}
                  >
                    <Ionicons name={iconName} size={22} color={userData.avatar === iconName ? '#a3e635' : '#fff'} />
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={[styles.sectionLabel, styles.backgroundSectionLabel]}>COLOR DE FONDO</Text>
              <View style={styles.backgroundGrid}>
                {PROFILE_BACKGROUNDS.map((item) => (
                  <TouchableOpacity
                    key={item.value}
                    onPress={() => setUserData({ ...userData, avatarBg: item.value })}
                    activeOpacity={0.7}
                    style={styles.backgroundChoice}
                    accessibilityRole="button"
                    accessibilityLabel={`Fondo ${item.label}`}
                  >
                    {renderBackgroundView(
                      item.value,
                      userData.avatarBg === item.value ? <Ionicons name="checkmark" size={16} color="#fff" /> : null,
                      [styles.colorSwatch, userData.avatarBg === item.value && styles.selectedColorSwatch]
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              <View style={{ marginVertical: 16, backgroundColor: '#222', height: 1 }} />

              <Text style={styles.inputLabel}>Nombre completo</Text>
              <TextInput style={styles.input} value={userData.name} onChangeText={(val) => setUserData({...userData, name: val})} placeholder="Ej. Juan Pérez" placeholderTextColor="#666" />

              <Text style={styles.inputLabel}>Correo electrónico</Text>
              <TextInput style={styles.input} value={userData.email} onChangeText={(val) => setUserData({...userData, email: val})} keyboardType="email-address" placeholder="correo@ejemplo.com" placeholderTextColor="#666" />

              <Text style={styles.inputLabel}>Teléfono</Text>
              <TextInput style={styles.input} value={userData.phone} onChangeText={(val) => setUserData({...userData, phone: val})} keyboardType="phone-pad" placeholder="Ej. 04121234567" placeholderTextColor="#666" />

              <Text style={styles.inputLabel}>Fecha de nacimiento</Text>
              <TextInput style={styles.input} value={userData.birthdate} onChangeText={(val) => setUserData({...userData, birthdate: val})} placeholder="AAAA-MM-DD" placeholderTextColor="#666" />

              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveProfile}>
                <Text style={styles.saveBtnText}>Guardar cambios</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </TouchableOpacity>
  </View>
</ThemedModal>

      {/* MODAL: SEGURIDAD */}
      <ThemedModal visible={activeModal === 'security'} transparent animationType="slide" onRequestClose={() => setActiveModal(null)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setActiveModal(null)}>
          <KeyboardAvoidingView style={{ flex: 1, width: '100%', justifyContent: 'flex-end' }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <KeyboardDismissWrapper {...keyboardDismissWrapperProps}>
            <View style={[styles.modalContent, { maxHeight: '80%' }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Seguridad y Acceso</Text>
                <TouchableOpacity onPress={() => setActiveModal(null)}>
                  <Ionicons name="close" size={22} color="#fff" />
                </TouchableOpacity>
              </View>
              <ScrollView contentContainerStyle={{ paddingBottom: 20 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}>
                <View style={styles.securityInfo}>
                  <Ionicons name={securityConfig.pinHash ? 'shield-checkmark' : 'shield-outline'} size={22} color="#a3e635" />
                  <Text style={styles.securityInfoText}>
                    {Platform.OS === 'web'
                      ? 'El PIN bloquea la interfaz de Kronos en este navegador y se guarda localmente. No sustituye el bloqueo de sesión ni protege contra alguien con acceso técnico al navegador.'
                      : 'Kronos se bloqueará al abrirse y al volver del segundo plano. El PIN se almacena de forma protegida por el sistema operativo; la biometría de este dispositivo es opcional.'}
                  </Text>
                </View>
                {securityConfig.pinHash ? (
                  <Text style={styles.securityStatus}>Bloqueo con PIN activado</Text>
                ) : (
                  <Text style={styles.securityStatus}>El bloqueo está desactivado</Text>
                )}
                {!securityConfigReady && <ActivityIndicator color="#a3e635" style={{ marginBottom: 12 }} />}
                {securityConfig.pinHash && (
                  <TextInput
                    style={styles.input}
                    value={currentPin}
                    onChangeText={value => setCurrentPin(value.replace(/\D/g, '').slice(0, 6))}
                    keyboardType="number-pad"
                    secureTextEntry
                    maxLength={6}
                    placeholder="PIN actual (6 dígitos)"
                    placeholderTextColor="#777"
                    accessibilityLabel="PIN actual"
                  />
                )}
                <TextInput
                  style={styles.input}
                  value={newPin}
                  onChangeText={value => setNewPin(value.replace(/\D/g, '').slice(0, 6))}
                  keyboardType="number-pad"
                  secureTextEntry
                  maxLength={6}
                  placeholder={securityConfig.pinHash ? 'Nuevo PIN (6 dígitos)' : 'Crear PIN (6 dígitos)'}
                  placeholderTextColor="#777"
                  accessibilityLabel={securityConfig.pinHash ? 'Nuevo PIN' : 'Crear PIN'}
                />
                <TextInput
                  style={styles.input}
                  value={confirmPin}
                  onChangeText={value => setConfirmPin(value.replace(/\D/g, '').slice(0, 6))}
                  keyboardType="number-pad"
                  secureTextEntry
                  maxLength={6}
                  placeholder="Confirmar PIN"
                  placeholderTextColor="#777"
                  accessibilityLabel="Confirmar PIN"
                />
                {!!securityError && <Text style={styles.securityError}>{securityError}</Text>}
                <TouchableOpacity style={styles.saveBtn} onPress={savePin} disabled={securityBusy || !securityConfigReady}>
                  <Text style={styles.saveBtnText}>{securityBusy ? 'Guardando…' : securityConfig.pinHash ? 'Cambiar PIN' : 'Activar bloqueo con PIN'}</Text>
                </TouchableOpacity>
                {securityConfig.pinHash && (
                  <>
                    <View style={styles.switchRowModal}>
                      <View style={{ flex: 1, paddingRight: 12 }}>
                        <Text style={styles.rowText}>Usar biometría</Text>
                        <Text style={styles.securityHint}>
                          {Platform.OS === 'web' ? 'Disponible solo en iOS y Android.' : biometricsAvailable ? 'Usa la huella o el rostro configurado en el dispositivo.' : 'No hay biometría configurada en este dispositivo.'}
                        </Text>
                      </View>
                      <Switch
                        value={securityConfig.biometricEnabled}
                        onValueChange={toggleBiometrics}
                        disabled={securityBusy || !securityConfigReady || !biometricsAvailable}
                        trackColor={{ false: '#333', true: '#a3e635' }}
                        thumbColor="#fff"
                      />
                    </View>
                    <TouchableOpacity style={styles.removePinButton} onPress={disablePin} disabled={securityBusy || !securityConfigReady}>
                      <Text style={styles.removePinText}>Desactivar el bloqueo</Text>
                    </TouchableOpacity>
                  </>
                )}
              </ScrollView>
            </View>
          </KeyboardDismissWrapper>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </ThemedModal>

      {/* MODAL: APARIENCIA */}
      <ThemedModal visible={activeModal === 'appearance'} transparent animationType="slide" onRequestClose={() => setActiveModal(null)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setActiveModal(null)}>
          <TouchableWithoutFeedback>
            <View style={[styles.modalContent, { maxHeight: '80%' }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Apariencia</Text>
                <TouchableOpacity onPress={() => setActiveModal(null)}>
                  <Ionicons name="close" size={22} color="#fff" />
                </TouchableOpacity>
              </View>
              <ScrollView contentContainerStyle={{ paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
                <Text style={styles.appearanceHint}>Elige cómo quieres ver Kronos en este dispositivo.</Text>
                {[
                  { value: 'light', label: 'Claro', icon: 'sunny-outline' },
                  { value: 'dark', label: 'Oscuro', icon: 'moon-outline' },
                  { value: 'system', label: 'Como el dispositivo', icon: 'phone-portrait-outline' },
                ].map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[styles.themeOption, themeMode === option.value && styles.themeOptionActive]}
                    onPress={() => savePreference('themeMode', option.value)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: themeMode === option.value }}
                  >
                    <Ionicons name={option.icon} size={20} color={themeMode === option.value ? '#a3e635' : '#aaa'} />
                    <Text style={styles.rowText}>{option.label}</Text>
                    {themeMode === option.value && <Ionicons name="checkmark-circle" size={19} color="#a3e635" />}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </ThemedModal>

      <ThemedModal visible={activeModal === 'currencies'} transparent animationType="slide" onRequestClose={() => setActiveModal(null)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setActiveModal(null)}>
          <TouchableWithoutFeedback>
            <View style={[styles.modalContent, { maxHeight: '80%', flexShrink: 1 }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Divisas visibles</Text>
                <TouchableOpacity onPress={() => setActiveModal(null)}>
                  <Ionicons name="close" size={22} color="#fff" />
                </TouchableOpacity>
              </View>
              <View style={styles.currencyPickerIntro}>
                <View style={styles.currencyPickerInfo}>
                  <Ionicons name="swap-horizontal-outline" size={16} color="#a3e635" />
                  <Text style={styles.currencyPickerHint}>Elige la moneda principal y las divisas visibles en Inicio y Cuentas.</Text>
                </View>
                <Text style={styles.currencyPickerCount}>{displayCurrencies.length} activas</Text>
              </View>
              <Text style={{ color: '#aaa', fontSize: 12, fontWeight: '600', marginTop: 14, marginBottom: 8 }}>
                MONEDA PRINCIPAL
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 12 }}>
                {SUPPORTED_CURRENCIES.map(currency => {
                  const code = currency.code;
                  const selected = (settings.primaryCurrency || 'VES') === code;
                  return (
                    <TouchableOpacity
                      key={code}
                      onPress={() => savePreference('primaryCurrency', code)}
                      style={{
                        width: '23%',
                        alignItems: 'center',
                        paddingVertical: 10,
                        marginBottom: 8,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: selected ? '#a3e635' : '#333',
                        backgroundColor: selected ? 'rgba(163, 230, 53, 0.12)' : '#191a1c'
                      }}
                    >
                      <Text style={{ color: selected ? '#a3e635' : '#ddd', fontWeight: '700' }}>
                        {currency?.symbol} {code}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Text style={{ color: '#aaa', fontSize: 12, fontWeight: '600', marginTop: 4, marginBottom: 8 }}>
                PAÍS DE USO
              </Text>
              <Text style={styles.currencyPickerHint}>
                Las tasas BCV y Binance P2P se usan solo en Venezuela cuando la moneda principal es VES.
              </Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, marginBottom: 14 }}>
                {[
                  { code: 'VE', label: 'Venezuela' },
                  { code: 'INTL', label: 'Otro país' },
                ].map(option => {
                  const selected = (settings.workingCountry || 'VE') === option.code;
                  return (
                    <TouchableOpacity
                      key={option.code}
                      onPress={() => savePreference('workingCountry', option.code)}
                      style={{
                        width: '48%',
                        alignItems: 'center',
                        paddingVertical: 11,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: selected ? '#a3e635' : '#333',
                        backgroundColor: selected ? 'rgba(163, 230, 53, 0.12)' : '#191a1c'
                      }}
                    >
                      <Text style={{ color: selected ? '#a3e635' : '#ddd', fontWeight: '700' }}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={styles.currencyGrid} showsVerticalScrollIndicator>
              {SUPPORTED_CURRENCIES.map(currency => {
                const selected = displayCurrencies.includes(currency.code);
                const bolivarRate = getBolivarRate(currency.code, rates);
                const rateText = bolivarRate
                  ? `${bolivarRate.toLocaleString('es-VE', { maximumFractionDigits: 3 })} Bs.`
                  : '—';
                return (
                  <TouchableOpacity
                    key={currency.code}
                    style={[styles.currencyTile, selected && styles.currencyTileActive]}
                    onPress={() => toggleDisplayCurrency(currency.code)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: selected }}
                  >
                    <View style={styles.currencyTileTop}>
                      <Text style={[styles.currencyOptionSymbol, selected && styles.currencyOptionSymbolActive]}>{currency.symbol}</Text>
                      {selected && <Ionicons name="checkmark-circle" size={16} color="#a3e635" />}
                    </View>
                    <Text style={[styles.currencyTileCode, selected && styles.currencyTileCodeActive]}>{currency.code}</Text>
                    <Text style={styles.currencyTileRate} numberOfLines={1}>1 {currency.code} = {rateText}</Text>
                  </TouchableOpacity>
                );
              })}
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </ThemedModal>

      {/* MODAL: NOTIFICACIONES */}
      <ThemedModal visible={activeModal === 'notifications'} transparent animationType="slide" onRequestClose={() => setActiveModal(null)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setActiveModal(null)}>
          <TouchableWithoutFeedback>
            <View style={[styles.modalContent, { maxHeight: '85%' }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Notificaciones</Text>
                <TouchableOpacity onPress={() => setActiveModal(null)}>
                  <Ionicons name="close" size={22} color="#fff" />
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={{ paddingBottom: 30 }} showsVerticalScrollIndicator={false}>
                <Text style={[styles.sectionLabel, { marginBottom: 10 }]}>POR CORREO</Text>
                <View style={styles.switchRowModal}><Text style={styles.rowText}>Noticias y actualizaciones</Text><Switch value={savedNotificationSettings.emailNews} onValueChange={(value) => updateNotificationPreference('emailNews', value)} trackColor={{ false: '#333', true: '#a3e635' }} thumbColor={'#fff'} /></View>
                <View style={styles.switchRowModal}><Text style={styles.rowText}>Recibos de pago</Text><Switch value={savedNotificationSettings.emailReceipts} onValueChange={(value) => updateNotificationPreference('emailReceipts', value)} trackColor={{ false: '#333', true: '#a3e635' }} thumbColor={'#fff'} /></View>
                <View style={styles.switchRowModal}><Text style={styles.rowText}>Resúmenes financieros</Text><Switch value={savedNotificationSettings.emailSummaries} onValueChange={(value) => updateNotificationPreference('emailSummaries', value)} trackColor={{ false: '#333', true: '#a3e635' }} thumbColor={'#fff'} /></View>
                <Text style={styles.appearanceHint}>Estas preferencias quedan guardadas. El envío de correos requiere configurar un servicio de correo.</Text>

                <Text style={[styles.sectionLabel, { marginTop: 20, marginBottom: 10 }]}>NOTIFICACIONES PUSH</Text>
                <View style={styles.notificationPermissionCard}>
                  <Ionicons name={notificationPermission ? 'notifications' : 'notifications-off-outline'} size={18} color={notificationPermission ? '#a3e635' : '#fbbf24'} />
                  <Text style={styles.notificationPermissionText}>
                    {Platform.OS === 'web'
                      ? 'Las notificaciones push requieren la app instalada en iOS o Android.'
                      : notificationPermission ? 'Permiso concedido por el dispositivo.' : 'El dispositivo aún no ha concedido permiso para notificar.'}
                  </Text>
                </View>
                <View style={styles.switchRowModal}><Text style={styles.rowText}>Recordatorios de pago</Text><Switch value={savedNotificationSettings.pushReminders} onValueChange={(value) => updateNotificationPreference('pushReminders', value)} trackColor={{ false: '#333', true: '#a3e635' }} thumbColor={'#fff'} /></View>
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </ThemedModal>

      {/* MODAL: USO DINÁMICO */}
      <ThemedModal visible={activeModal === 'usage'} transparent animationType="slide" onRequestClose={() => setActiveModal(null)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setActiveModal(null)}>
          <TouchableWithoutFeedback>
            <View style={[styles.modalContent, { maxHeight: '85%' }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Uso</Text>
                <TouchableOpacity onPress={() => setActiveModal(null)}>
                  <Ionicons name="close" size={22} color="#fff" />
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
                
                <View style={styles.usageSummary}>
                  <Ionicons name="sparkles" size={22} color="#a3e635" />
                  <Text style={styles.usageSummaryText}>
                    Tienes {usageData.reduce((total, item) => total + item.count, 0)} registros organizados en Kronos.
                  </Text>
                </View>
                <View style={styles.usageGrid}>
                  {usageData.map((item) => (
                    <View key={item.label} style={styles.usageTile}>
                      <View style={[styles.usageIcon, { backgroundColor: `${item.color}22` }]}>
                        <Ionicons name={item.icon} size={19} color={item.color} />
                      </View>
                      <Text style={styles.usageCount}>{item.count}</Text>
                      <Text style={styles.usageLabel}>{item.label}</Text>
                    </View>
                  ))}
                </View>

              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </ThemedModal>

    </View>
    </ThemeContent>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  sectionLabel: { color: '#888', fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 6 },
  
  groupCard: { backgroundColor: '#1a1a1a', borderRadius: 20, marginBottom: 16, borderWidth: 1, borderColor: '#222', overflow: 'hidden' },
  groupItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  groupDivider: { height: 1, backgroundColor: '#262626', marginHorizontal: 16 },

  rowInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  iconBox: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#111', borderWidth: 1, borderColor: '#333', justifyContent: 'center', alignItems: 'center' },
  iconBoxRed: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(248, 113, 113, 0.1)', borderWidth: 1, borderColor: 'rgba(248, 113, 113, 0.3)', justifyContent: 'center', alignItems: 'center' },
  
  cardTitle: { color: '#fff', fontSize: 14, fontWeight: '600' },
  cardSubtitle: { color: '#888', fontSize: 11, marginTop: 2 },
  
  footerContainer: { alignItems: 'center', marginTop: 10, marginBottom: 20 },
  versionText: { color: '#888', fontSize: 12, marginBottom: 8 },
  footerLogoContainer: { alignItems: 'center', justifyContent: 'center' },
  footerLogoContainerLight: { backgroundColor: '#17231d', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5 },
  footerLogo: { width: 90, height: 22 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
    modalContent: {
      backgroundColor: '#111',
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 20,
      borderWidth: 1,
      borderColor: '#333',
      maxHeight: '85%',
    },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    modalTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },

    profileEditorContent: { paddingBottom: 80 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  modalTitle: { color: '#fff', fontSize: 16, fontWeight: '700', },

  profileEditorContent: { paddingBottom: 80, flexGrow: 1, },
  avatarSection: { alignItems: 'center', marginBottom: 16 },
  avatarPickerWrap: { width: 72, height: 72, marginBottom: 7, position: 'relative' },
  avatarPreviewContainer: { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: '#333', overflow: 'hidden' },
  avatarImageStyle: { width: '100%', height: '100%', borderRadius: 32 },
  avatarSectionSub: { color: '#888', fontSize: 11, textAlign: 'center' },
  avatarCameraButton: { position: 'absolute', right: -2, bottom: 0, width: 24, height: 24, borderRadius: 12, backgroundColor: '#a3e635', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#111' },

  iconsGridCompact: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, justifyContent: 'flex-start' },
  iconChoicesScroll: { maxHeight: 146, marginBottom: 4 },
  iconChoiceItemSmall: { width: 42, height: 42, borderRadius: 12, backgroundColor: '#1a1a1a', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#222' },
  selectedChoiceItem: { borderColor: '#a3e635', borderWidth: 2 },
  horizontalIconsContainer: { flexDirection: 'row', gap: 3, paddingVertical: 8, paddingRight: 15 },
  backgroundSectionLabel: { marginTop: 18 },
  backgroundGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'flex-start' },
  backgroundChoice: { width: 36, height: 36 },
  colorSwatch: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', overflow: 'hidden' },
  selectedColorSwatch: { borderWidth: 2, borderColor: '#fff' },

  usageSummary: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 15, borderRadius: 16, backgroundColor: 'rgba(163,230,53,0.1)', marginBottom: 14 },
  usageSummaryText: { flex: 1, color: '#d9f99d', fontSize: 14, fontWeight: '600', lineHeight: 20 },
  usageGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10 },
  usageTile: { width: '47%', minHeight: 112, alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 16, backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: '#292929' },
  usageIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  usageCount: { color: '#fff', fontSize: 23, fontWeight: '800' },
  usageLabel: { color: '#aaa', fontSize: 11, fontWeight: '600', textAlign: 'center', marginTop: 2 },

  switchRowModal: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#222' },
  appearanceHint: { color: '#999', fontSize: 13, lineHeight: 19, marginBottom: 12 },
  themeOption: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: '#292929', marginBottom: 8 },
  themeOptionActive: { borderColor: '#a3e635', backgroundColor: 'rgba(163,230,53,0.08)' },
  currencyPickerIntro: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 12 },
  currencyPickerInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 7 },
  currencyPickerHint: { flex: 1, color: '#999', fontSize: 11, lineHeight: 16 },
  currencyPickerCount: { color: '#a3e635', fontSize: 11, fontWeight: '700', backgroundColor: 'rgba(163,230,53,0.1)', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 12, overflow: 'hidden' },
  currencyGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingBottom: 12 },
  currencyTile: { width: '31.5%', minHeight: 82, paddingHorizontal: 9, paddingVertical: 8, marginBottom: 8, borderRadius: 14, backgroundColor: '#191a1c', borderWidth: 1, borderColor: '#292a2d' },
  currencyTileActive: { backgroundColor: 'rgba(163,230,53,0.09)', borderColor: 'rgba(163,230,53,0.65)' },
  currencyTileTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 19 },
  currencyOptionSymbol: { color: '#8b8b8b', fontSize: 14, fontWeight: '700' },
  currencyOptionSymbolActive: { color: '#a3e635' },
  currencyTileCode: { color: '#f4f4f5', fontSize: 13, fontWeight: '800', marginTop: 2 },
  currencyTileCodeActive: { color: '#d9f99d' },
  currencyTileRate: { color: '#8a8a8a', fontSize: 9, marginTop: 3 },
  securityInfo: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: '#1a1a1a', padding: 14, borderRadius: 14, marginBottom: 14 },
  securityInfoText: { color: '#bbb', flex: 1, fontSize: 13, lineHeight: 19 },
  securityStatus: { color: '#a3e635', fontSize: 13, fontWeight: '700', marginBottom: 12 },
  securityError: { color: '#f87171', fontSize: 12, lineHeight: 18, marginBottom: 8 },
  securityHint: { color: '#888', fontSize: 11, lineHeight: 16, marginTop: 4 },
  removePinButton: { alignItems: 'center', paddingVertical: 14, marginTop: 8 },
  removePinText: { color: '#f87171', fontSize: 13, fontWeight: '700' },
  notificationPermissionCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#1a1a1a', padding: 12, borderRadius: 12, marginBottom: 8 },
  notificationPermissionText: { color: '#aaa', fontSize: 12, flex: 1, lineHeight: 17 },
  rowText: { color: '#fff', fontSize: 14 },
  inputLabel: { color: '#888', fontSize: 12, marginBottom: 6, fontWeight: '600' },
  input: { backgroundColor: '#1a1a1a', borderRadius: 12, padding: 12, color: '#fff', fontSize: 14, borderWidth: 1, borderColor: '#333', marginBottom: 14 },
  saveBtn: { backgroundColor: '#a3e635', borderRadius: 20, paddingVertical: 14, alignItems: 'center', marginTop: 10 },
  saveBtnText: { color: '#000', fontSize: 14, fontWeight: '700' },
});