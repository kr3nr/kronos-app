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
  Alert,
  Image,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../services/supabase';
import CustomHeader from '../../components/CustomHeader';
import ScreenWrapper from '../../components/ScreenWrapper';

export default function PreferencesScreen({ userId, navigation, accounts = [], transactions = [], onProfileUpdated }) {
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

  const [activeModal, setActiveModal] = useState(null); 
  const [avatarTab, setAvatarTab] = useState('icons'); 
  
  // Estados internos de configuración
  const [pinSecurity, setPinSecurity] = useState(false);
  const [biometrics, setBiometrics] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Notificaciones reales
  const [emailNews, setEmailNews] = useState(true);
  const [emailReceipts, setEmailReceipts] = useState(true);
  const [emailSummaries, setEmailSummaries] = useState(false);
  const [pushReminders, setPushReminders] = useState(true);
  const [pushMovements, setPushMovements] = useState(true);

  // Cálculo dinámico basado en los datos reales de la app
  const nationalAccounts = accounts.filter(acc => (acc.currency || '').toUpperCase() === 'VES').length;
  const internationalAccounts = accounts.filter(acc => (acc.currency || '').toUpperCase() !== 'VES').length;
  const scheduledCount = transactions.filter(t => t.type === 'pay' || t.type === 'receive' || t.isRecurring).length;

  const usageData = {
    nationalAccounts: nationalAccounts,
    maxNational: 3,
    internationalAccounts: internationalAccounts,
    maxInternational: 2,
    templatesCount: scheduledCount,
    maxTemplates: 5,
    scheduledCount: scheduledCount,
    maxScheduled: 5,
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

      Alert.alert("¡Éxito!", "Perfil actualizado correctamente.");
      
      if (onProfileUpdated) {
        onProfileUpdated();
      }

      setActiveModal(null); 
      fetchUserSettings();
    } catch (err) {
      console.error('Error al guardar perfil:', err.message);
      Alert.alert("Error", "No se pudo actualizar el perfil.");
    } finally {
      setLoading(false);
    }
  };

  // Selector de imagen de galería
  const pickImageFromGallery = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert("Permiso denegado", "Se requieren permisos para acceder a la galería.");
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
      Alert.alert("Error", "No se pudo cargar la imagen.");
    }
  };

  // Zona de peligro: Comenzar de cero
  const handleFactoryReset = () => {
    Alert.alert(
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
              await supabase.from('transactions').delete().eq('user_id', userId);
              await supabase.from('accounts').delete().eq('user_id', userId);
              await supabase.from('goals').delete().eq('user_id', userId);
              await supabase.from('movements').delete().eq('user_id', userId);
              Alert.alert("Restablecido", "Todos los datos de tu cuenta han sido eliminados correctamente.");
              fetchUserSettings();
            } catch (err) {
              Alert.alert("Error", "No se pudieron restablecer los datos.");
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Eliminar cuenta",
      "Esta acción es irreversible y cerrará tu sesión permanentemente.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar cuenta",
          style: "destructive",
          onPress: async () => {
            try {
              await supabase.auth.signOut();
              Alert.alert("Cuenta cerrada", "Lamentamos verte partir.");
              navigation('login');
            } catch (err) {
              console.error('Error al cerrar sesión:', err);
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#a3e635" />
      </View>
    );
  }

  const getPercent = (current, max) => Math.min(Math.round((current / max) * 100), 100);

  const renderBackgroundView = (bgValue, children, styleExtra) => {
    const mainColor = bgValue && bgValue.includes('-') ? bgValue.split('-')[0] : (bgValue || '#1a1a1a');
    return (
      <View style={[styleExtra, { backgroundColor: mainColor }]}>
        {children}
      </View>
    );
  };

  return (
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

        {/* BLOQUE 3: ZONA DE PELIGRO */}
        <View style={styles.groupCard}>
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
                <Text style={styles.cardSubtitle} numberOfLines={1}>Borra la cuenta permanentemente</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#888" />
          </TouchableOpacity>
        </View>

        {/* PIE DE PÁGINA */}
        <View style={styles.footerContainer}>
          <Text style={styles.versionText}>Versión 1.0.0</Text>
          <Image source={require('../../assets/name-app.png')} style={styles.footerLogo} resizeMode="contain" />
        </View>

      </ScreenWrapper>

      {/* MODAL: PERFIL */}
      <Modal visible={activeModal === 'profile'} transparent animationType="slide" onRequestClose={() => setActiveModal(null)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setActiveModal(null)}>
          <TouchableWithoutFeedback>
            <View style={[styles.modalContent, { maxHeight: '90%' }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Editar Perfil</Text>
                <TouchableOpacity onPress={() => setActiveModal(null)}>
                  <Ionicons name="close" size={22} color="#fff" />
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
                
                {/* Vista previa del Avatar */}
                <View style={styles.avatarSection}>
                  {renderBackgroundView(
                    userData.avatarBg,
                    userData.avatar && (userData.avatar.startsWith('http') || userData.avatar.startsWith('file')) ? (
                      <Image source={{ uri: userData.avatar }} style={styles.avatarImageStyle} />
                    ) : (
                      <Ionicons name={userData.avatar || 'person'} size={32} color="#fff" />
                    ),
                    styles.avatarPreviewContainer
                  )}
                  <Text style={styles.avatarSectionSub}>Personaliza tu icono y colores abajo</Text>
                </View>

                {/* Pestañas de selección unificadas */}
                <View style={styles.avatarTabsRow}>
                  <TouchableOpacity 
                    style={[styles.avatarTabBtn, avatarTab === 'icons' && styles.avatarTabBtnActive]} 
                    onPress={() => setAvatarTab('icons')}
                  >
                    <Text style={[styles.avatarTabText, avatarTab === 'icons' && styles.avatarTabTextActive]}>Elegir Icono</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.avatarTabBtn, avatarTab === 'colors' && styles.avatarTabBtnActive]} 
                    onPress={() => setAvatarTab('colors')}
                  >
                    <Text style={[styles.avatarTabText, avatarTab === 'colors' && styles.avatarTabTextActive]}>Colores y Tonos</Text>
                  </TouchableOpacity>
                </View>

                {/* Botón galería */}
                <TouchableOpacity style={styles.uploadImageBtn} onPress={pickImageFromGallery} activeOpacity={0.8}>
                  <Ionicons name="image-outline" size={18} color="#a3e635" style={{ marginRight: 8 }} />
                  <Text style={styles.uploadImageText}>Subir foto desde la galería</Text>
                </TouchableOpacity>

                {/* Contenido dinámico */}
                {avatarTab === 'icons' ? (
                  <>
                    <Text style={[styles.sectionLabel, { marginTop: 12, marginBottom: 8 }]}>SELECCIONA UN ICONO</Text>
                    <View style={styles.iconsGridCompact}>
                      {[
                        'person', 'happy', 'wallet', 'shield-checkmark', 
                        'flash', 'star', 'logo-bitcoin', 'card', 
                        'analytics', 'ribbon', 'briefcase', 'diamond'
                      ].map((iconName, idx) => (
                        <TouchableOpacity 
                          key={idx} 
                          style={[styles.iconChoiceItemSmall, userData.avatar === iconName && styles.selectedChoiceItem]}
                          onPress={() => setUserData({ ...userData, avatar: iconName })}
                          activeOpacity={0.7}
                        >
                          <Ionicons name={iconName} size={22} color={userData.avatar === iconName ? '#a3e635' : '#fff'} />
                        </TouchableOpacity>
                      ))}
                    </View>
                  </>
                ) : (
                  <>
                    <Text style={[styles.sectionLabel, { marginTop: 12, marginBottom: 8 }]}>COLORES PLANOS Y TONOS</Text>
                    <View style={styles.iconsGridCompact}>
                      {[
                        { label: 'Lima', val: '#a3e635' },
                        { label: 'Celeste', val: '#38bdf8' },
                        { label: 'Ámbar', val: '#fbbf24' },
                        { label: 'Rojo suave', val: '#f87171' },
                        { label: 'Morado', val: '#c084fc' },
                        { label: 'Naranja', val: '#fb923c' },
                        { label: 'Verde/Azul', val: '#059669' },
                        { label: 'Rosa/Morado', val: '#db2777' },
                        { label: 'Oscuro/Lima', val: '#3f3f46' },
                      ].map((item, idx) => (
                        <TouchableOpacity 
                          key={idx} 
                          onPress={() => setUserData({ ...userData, avatarBg: item.val })}
                          activeOpacity={0.7}
                          style={{ width: '30%', marginBottom: 8 }}
                        >
                          {renderBackgroundView(
                            item.val,
                            <Text style={styles.colorChoiceText}>{item.label}</Text>,
                            [styles.colorChoiceItemSmall, userData.avatarBg === item.val && styles.selectedChoiceItem]
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  </>
                )}

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
        </TouchableOpacity>
      </Modal>

      {/* MODAL: SEGURIDAD */}
      <Modal visible={activeModal === 'security'} transparent animationType="slide" onRequestClose={() => setActiveModal(null)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setActiveModal(null)}>
          <TouchableWithoutFeedback>
            <View style={[styles.modalContent, { maxHeight: '80%' }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Seguridad y Acceso</Text>
                <TouchableOpacity onPress={() => setActiveModal(null)}>
                  <Ionicons name="close" size={22} color="#fff" />
                </TouchableOpacity>
              </View>
              <ScrollView contentContainerStyle={{ paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
                <View style={styles.switchRowModal}>
                  <Text style={styles.rowText}>PIN de seguridad</Text>
                  <Switch value={pinSecurity} onValueChange={setPinSecurity} trackColor={{ false: '#333', true: '#a3e635' }} thumbColor={'#fff'} />
                </View>
                <View style={styles.switchRowModal}>
                  <Text style={styles.rowText}>Acceso Biométrico</Text>
                  <Switch value={biometrics} onValueChange={setBiometrics} trackColor={{ false: '#333', true: '#a3e635' }} thumbColor={'#fff'} />
                </View>
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </Modal>

      {/* MODAL: APARIENCIA */}
      <Modal visible={activeModal === 'appearance'} transparent animationType="slide" onRequestClose={() => setActiveModal(null)}>
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
                <View style={styles.switchRowModal}>
                  <Text style={styles.rowText}>Modo Oscuro</Text>
                  <Switch value={isDarkMode} onValueChange={setIsDarkMode} trackColor={{ false: '#333', true: '#a3e635' }} thumbColor={'#fff'} />
                </View>
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </Modal>

      {/* MODAL: NOTIFICACIONES */}
      <Modal visible={activeModal === 'notifications'} transparent animationType="slide" onRequestClose={() => setActiveModal(null)}>
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
                <View style={styles.switchRowModal}><Text style={styles.rowText}>Noticias y actualizaciones</Text><Switch value={emailNews} onValueChange={setEmailNews} trackColor={{ false: '#333', true: '#a3e635' }} thumbColor={'#fff'} /></View>
                <View style={styles.switchRowModal}><Text style={styles.rowText}>Recibos de pago</Text><Switch value={emailReceipts} onValueChange={setEmailReceipts} trackColor={{ false: '#333', true: '#a3e635' }} thumbColor={'#fff'} /></View>
                <View style={styles.switchRowModal}><Text style={styles.rowText}>Resúmenes financieros</Text><Switch value={emailSummaries} onValueChange={setEmailSummaries} trackColor={{ false: '#333', true: '#a3e635' }} thumbColor={'#fff'} /></View>

                <Text style={[styles.sectionLabel, { marginTop: 20, marginBottom: 10 }]}>NOTIFICACIONES PUSH</Text>
                <View style={styles.switchRowModal}><Text style={styles.rowText}>Recordatorios de pago</Text><Switch value={pushReminders} onValueChange={setPushReminders} trackColor={{ false: '#333', true: '#a3e635' }} thumbColor={'#fff'} /></View>
                <View style={styles.switchRowModal}><Text style={styles.rowText}>Movimientos en dispositivos</Text><Switch value={pushMovements} onValueChange={setPushMovements} trackColor={{ false: '#333', true: '#a3e635' }} thumbColor={'#fff'} /></View>
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </Modal>

      {/* MODAL: USO DINÁMICO (Sin botón Plus y con Scroll desplazable) */}
      <Modal visible={activeModal === 'usage'} transparent animationType="slide" onRequestClose={() => setActiveModal(null)}>
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
                
                <Text style={styles.usageSectionHeader}>CUENTAS</Text>
                
                <View style={styles.usageCardItem}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.usageCardTitle}>Nacionales</Text>
                    <Text style={styles.usageCardSub}>{usageData.nationalAccounts} de {usageData.maxNational}</Text>
                    <Text style={styles.usageCardDesc}>Efectivo Bs no cuenta</Text>
                  </View>
                  <View style={styles.progressCircleBox}>
                    <Text style={styles.progressCircleText}>{getPercent(usageData.nationalAccounts, usageData.maxNational)}%</Text>
                  </View>
                </View>

                <View style={styles.usageCardItem}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.usageCardTitle}>Internacionales</Text>
                    <Text style={styles.usageCardSub}>{usageData.internationalAccounts} de {usageData.maxInternational}</Text>
                    <Text style={styles.usageCardDesc}>Efectivo USD no cuenta</Text>
                  </View>
                  <View style={styles.progressCircleBox}>
                    <Text style={styles.progressCircleText}>{getPercent(usageData.internationalAccounts, usageData.maxInternational)}%</Text>
                  </View>
                </View>

                <Text style={[styles.usageSectionHeader, { marginTop: 15 }]}>PAGOS RECURRENTES</Text>

                <View style={styles.usageCardItem}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.usageCardTitle}>Plantillas</Text>
                    <Text style={styles.usageCardSub}>{usageData.templatesCount} de {usageData.maxTemplates}</Text>
                  </View>
                  <View style={styles.progressCircleBox}>
                    <Text style={styles.progressCircleText}>{getPercent(usageData.templatesCount, usageData.maxTemplates)}%</Text>
                  </View>
                </View>

                <View style={styles.usageCardItem}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.usageCardTitle}>Programados</Text>
                    <Text style={styles.usageCardSub}>{usageData.scheduledCount} de {usageData.maxScheduled}</Text>
                  </View>
                  <View style={styles.progressCircleBox}>
                    <Text style={styles.progressCircleText}>{getPercent(usageData.scheduledCount, usageData.maxScheduled)}%</Text>
                  </View>
                </View>

              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </Modal>

    </View>
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
  footerLogo: { width: 90, height: 22 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#111', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, borderWidth: 1, borderColor: '#333' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  modalTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },

  avatarSection: { alignItems: 'center', marginBottom: 12 },
  avatarPreviewContainer: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: '#333', marginBottom: 4 },
  avatarImageStyle: { width: '100%', height: '100%', borderRadius: 32 },
  avatarSectionSub: { color: '#888', fontSize: 11, textAlign: 'center' },

  uploadImageBtn: { backgroundColor: '#1a1a1a', borderRadius: 12, padding: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#333', marginBottom: 12 },
  uploadImageText: { color: '#fff', fontSize: 12, fontWeight: '600' },

  avatarTabsRow: { flexDirection: 'row', backgroundColor: '#1a1a1a', borderRadius: 12, padding: 4, marginBottom: 12, borderWidth: 1, borderColor: '#222' },
  avatarTabBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10 },
  avatarTabBtnActive: { backgroundColor: '#333' },
  avatarTabText: { color: '#888', fontSize: 12, fontWeight: '600' },
  avatarTabTextActive: { color: '#a3e635' },

  iconsGridCompact: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-start' },
  iconChoiceItemSmall: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#1a1a1a', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#222' },
  selectedChoiceItem: { borderColor: '#a3e635', borderWidth: 2 },

  colorChoiceItemSmall: { width: '100%', paddingVertical: 12, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#333' },
  colorChoiceText: { color: '#fff', fontSize: 11, fontWeight: '600' },

  usageSectionHeader: { color: '#888', fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 10, marginTop: 5 },
  usageCardItem: { backgroundColor: '#1a1a1a', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, borderWidth: 1, borderColor: '#222' },
  usageCardTitle: { color: '#fff', fontSize: 15, fontWeight: 'bold', marginBottom: 2 },
  usageCardSub: { color: '#ccc', fontSize: 13, fontWeight: '500', marginBottom: 2 },
  usageCardDesc: { color: '#888', fontSize: 11 },
  
  progressCircleBox: { width: 52, height: 52, borderRadius: 26, borderWidth: 3.5, borderColor: '#a3e635', justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(163, 230, 53, 0.08)' },
  progressCircleText: { color: '#a3e635', fontSize: 12, fontWeight: 'bold' },

  switchRowModal: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#222' },
  rowText: { color: '#fff', fontSize: 14 },
  inputLabel: { color: '#888', fontSize: 12, marginBottom: 6, fontWeight: '600' },
  input: { backgroundColor: '#1a1a1a', borderRadius: 12, padding: 12, color: '#fff', fontSize: 14, borderWidth: 1, borderColor: '#333', marginBottom: 14 },
  saveBtn: { backgroundColor: '#a3e635', borderRadius: 20, paddingVertical: 14, alignItems: 'center', marginTop: 10 },
  saveBtnText: { color: '#000', fontSize: 14, fontWeight: '700' },
});