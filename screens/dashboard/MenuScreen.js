import React, { useState } from 'react';
import { 
  StyleSheet, Text, View, TouchableOpacity,
  TextInput, Alert, Modal, Dimensions 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CustomHeader from '../../components/CustomHeader';
import { exportUserDataToCSV } from '../../services/exportService';
import ScreenWrapper from '../../components/ScreenWrapper';

const { width } = Dimensions.get('window');

export default function MenuScreen({ navigation, userId, userEmail, userName }) {
  // Estados para modales de Ayuda, Términos y Privacidad
  const [helpModalVisible, setHelpModalVisible] = useState(false);
  const [helpMessage, setHelpMessage] = useState('');
  
  const [termsModalVisible, setTermsModalVisible] = useState(false);
  const [privacyModalVisible, setPrivacyModalVisible] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Función para manejar el envío del formulario de ayuda
  const handleSendHelp = () => {
    if (!helpMessage.trim()) {
      Alert.alert('Error', 'Por favor describe el problema o duda antes de enviar.');
      return;
    }
    Alert.alert('¡Enviado!', 'Gracias por reportarlo. Nuestro equipo de soporte revisará tu caso a la brevedad.');
    setHelpMessage('');
    setHelpModalVisible(false);
  };

  // Categorías de herramientas agrupadas por utilidad
const toolCategories = [
    {
      title: 'Finanzas y Cuentas',
      tools: [
        { title: 'Cuentas', icon: 'wallet-outline', screen: 'accounts' },
        { title: 'Tarjetas', icon: 'card-outline', screen: 'creditCards' }, // <--- ¡Añade esta línea aquí!
        { title: 'Movimientos', icon: 'swap-horizontal-outline', screen: 'movements' },
        { title: 'Categorías', icon: 'pricetags-outline', screen: 'categorias' }
      ]
    },
    {
      title: 'Control y Planificación',
      tools: [
        { title: 'Metas', icon: 'flag-outline', screen: 'goals' },
        { title: 'Pagar / Cobrar', icon: 'card-outline', screen: 'debts' },
        { title: 'Recurrentes', icon: 'repeat-outline', screen: 'recurring' },
        { title: 'Compras', icon: 'cart-outline', screen: 'shoppingLists' }
      ]
    },
    {
      title: 'Herramientas y Datos',
      tools: [
        { title: 'Calculadora', icon: 'calculator-outline', screen: 'converterCalculator' },
        { title: 'Exportar', icon: 'document-text-outline', screen: 'exportMovements', isExport: true }
      ]
    }
  ];

  return (
    <View style={styles.container}>
      {/* Cabecera obligatoria con botón de engranaje a la izquierda */}
      <CustomHeader 
        title="Menú de Herramientas"
        leftComponent={
          <TouchableOpacity 
            style={styles.headerIconButton} 
            onPress={() => navigation.navigate('home')}
            activeOpacity={0.7}
          >
            <Ionicons name="settings-outline" size={18} color="#a3e635" />
          </TouchableOpacity>
        }
        showHelp={false}
        onBackPress={() => navigation.goBack()}
      />

      <ScreenWrapper contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
        
        {/* Sección de Perfil */}
        <View style={styles.profileCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>
              {userName ? userName.slice(0, 2).toUpperCase() : 'US'}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName} numberOfLines={1}>{userName || 'Usuario Financiero'}</Text>
            <Text style={styles.profileEmail} numberOfLines={1}>{userEmail || 'correo@ejemplo.com'}</Text>
          </View>
        </View>

        {/* Mapeo de Categorías de Herramientas */}
        {toolCategories.map((category, catIndex) => (
          <View key={catIndex} style={styles.categorySection}>
            <Text style={styles.sectionTitle}>{category.title}</Text>
            <View style={styles.gridContainer}>
              {category.tools.map((tool, index) => (
                <TouchableOpacity 
                  key={index}
                  style={[styles.gridCard, tool.isExport && styles.exportCard]}
                  activeOpacity={0.7}
                  onPress={() => navigation.navigate(tool.screen)}
                >
                  <View style={[styles.gridIconBox, tool.isExport && { backgroundColor: 'rgba(163,230,53,0.15)' }]}>
                    <Ionicons name={tool.icon} size={24} color="#a3e635" />
                  </View>
                  <Text style={styles.gridCardText} numberOfLines={1}>{tool.title}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* Sección de Ayuda con Formulario */}
        <Text style={styles.sectionTitle}>Soporte y Ayuda</Text>
        <TouchableOpacity 
          style={styles.actionRowButton}
          onPress={() => setHelpModalVisible(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="help-buoy-outline" size={20} color="#a3e635" style={{ marginRight: 12 }} />
          <Text style={styles.actionRowText}>¿Tienes un problema? Contáctanos</Text>
          <Ionicons name="chevron-forward" size={16} color="#666" style={{ marginLeft: 'auto' }} />
        </TouchableOpacity>

        {/* Sección Acerca de */}
        <Text style={styles.sectionTitle}>Acerca de</Text>
        <TouchableOpacity 
          style={styles.actionRowButton}
          onPress={() => setTermsModalVisible(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="document-lock-outline" size={20} color="#ccc" style={{ marginRight: 12 }} />
          <Text style={styles.actionRowText}>Términos y Condiciones</Text>
          <Ionicons name="chevron-forward" size={16} color="#666" style={{ marginLeft: 'auto' }} />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionRowButton}
          onPress={() => setPrivacyModalVisible(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="shield-checkmark-outline" size={20} color="#ccc" style={{ marginRight: 12 }} />
          <Text style={styles.actionRowText}>Política de Privacidad</Text>
          <Ionicons name="chevron-forward" size={16} color="#666" style={{ marginLeft: 'auto' }} />
        </TouchableOpacity>

      </ScreenWrapper>

      {/* ================= MODALES FUNCIONALES ================= */}

      {/* 1. Modal Formulario de Ayuda */}
      <Modal visible={helpModalVisible} transparent animationType="slide" onRequestClose={() => setHelpModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reportar un problema</Text>
              <TouchableOpacity onPress={() => setHelpModalVisible(false)}>
                <Ionicons name="close" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>Describe detalladamente qué inconveniente experimentas en la app:</Text>
            <TextInput 
              style={styles.helpTextInput}
              placeholder="Escribe tu mensaje aquí..."
              placeholderTextColor="#666"
              multiline
              numberOfLines={4}
              value={helpMessage}
              onChangeText={setHelpMessage}
            />
            <TouchableOpacity style={styles.modalSubmitBtn} onPress={handleSendHelp} activeOpacity={0.8}>
              <Text style={styles.modalSubmitText}>Enviar reporte</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 2. Modal Términos y Condiciones */}
      <Modal visible={termsModalVisible} transparent animationType="slide" onRequestClose={() => setTermsModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Términos y Condiciones</Text>
              <TouchableOpacity onPress={() => setTermsModalVisible(false)}>
                <Ionicons name="close" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
            <ScreenWrapper style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
              <Text style={styles.legalText}>
                TÉRMINOS Y CONDICIONES DE USO{'\n'}
                Fecha de última actualización: 27 de septiembre de 2026{'\n\n'}
                Bienvenido a kronos. Al descargar, instalar o utilizar la aplicación móvil kronos (en adelante, la "Aplicación"), usted acepta cumplir y quedar obligado por los siguientes Términos y Condiciones. Si no está de acuerdo con estos términos, por favor absténgase de utilizar la Aplicación.{'\n\n'}
                1. Naturaleza de la Aplicación y Limitación de Responsabilidad{'\n'}
                kronos es una herramienta de gestión y registro financiero personal. La Aplicación no constituye ni opera como una institución bancaria, casa de cambio oficial, entidad financiera regulada ni plataforma de intermediación cambiaria.{'\n\n'}
                2. Tasas de Cambio y Referencias de Divisas{'\n'}
                Las tasas de cambio mostradas en la Aplicación son de carácter estrictamente informativo y referencial.{'\n\n'}
                3. Registro de Cuenta y Seguridad del Usuario{'\n'}
                El usuario es el único y exclusivo responsable de mantener la confidencialidad de sus credenciales de acceso.
              </Text>
            </ScreenWrapper>
          </View>
        </View>
      </Modal>

      {/* 3. Modal Política de Privacidad */}
      <Modal visible={privacyModalVisible} transparent animationType="slide" onRequestClose={() => setPrivacyModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Política de Privacidad</Text>
              <TouchableOpacity onPress={() => setPrivacyModalVisible(false)}>
                <Ionicons name="close" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
            <ScreenWrapper style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
              <Text style={styles.legalText}>
                POLÍTICA DE PRIVACIDAD{'\n'}
                Fecha de última actualización: 27 de septiembre de 2026{'\n\n'}
                En kronos valoramos profundamente su privacidad. Esta Política de Privacidad explica qué información recopilamos, cómo la utilizamos y cuáles son sus derechos.{'\n\n'}
                1. Información que Recopilamos{'\n'}
                Datos de Autenticación y datos financieros ingresados voluntariamente en su base de datos personal.{'\n\n'}
                2. Uso de la Información{'\n'}
                La información se utiliza exclusivamente para sincronizar sus registros financieros y permitir el inicio de sesión seguro.
              </Text>
            </ScreenWrapper>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  scrollBody: { padding: 15, paddingBottom: 40 },

  headerIconButton: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#1a1a1a',
    borderWidth: 1, borderColor: '#333',
    justifyContent: 'center', alignItems: 'center'
  },

  profileCard: {
    backgroundColor: '#161616',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#222'
  },
  avatarCircle: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: '#222',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: '#333',
    marginRight: 14
  },
  avatarText: { color: '#a3e635', fontSize: 18, fontWeight: 'bold' },
  profileInfo: { flex: 1 },
  profileName: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 2 },
  profileEmail: { color: '#888', fontSize: 13 },

  categorySection: { marginBottom: 5 },
  sectionTitle: {
    color: '#888',
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 10,
    marginTop: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },

  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 5
  },
  gridCard: {
    width: '31%',
    aspectRatio: 1,
    backgroundColor: '#161616',
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#222',
    padding: 10
  },
  exportCard: {
    backgroundColor: 'rgba(163,230,53,0.05)',
    borderColor: 'rgba(163,230,53,0.2)'
  },
  gridIconBox: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: '#222',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1, borderColor: '#333'
  },
  gridCardText: {
    color: '#ccc',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center'
  },

  actionRowButton: {
    backgroundColor: '#161616',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#222'
  },
  actionRowText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500'
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalContentCard: {
    backgroundColor: '#161616',
    width: '100%',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#333'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15
  },
  modalTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  modalSubtitle: { color: '#aaa', fontSize: 13, marginBottom: 12, lineHeight: 18 },
  helpTextInput: {
    backgroundColor: '#111',
    borderRadius: 14,
    padding: 14,
    color: '#fff',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#333',
    textAlignVertical: 'top',
    height: 100,
    marginBottom: 15
  },
  modalSubmitBtn: {
    backgroundColor: '#a3e635',
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: 'center'
  },
  modalSubmitText: { color: '#000', fontSize: 14, fontWeight: 'bold' },
  legalText: { color: '#bbb', fontSize: 13, lineHeight: 20 }
});