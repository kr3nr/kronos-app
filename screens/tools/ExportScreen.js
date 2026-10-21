import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, Text, View, TouchableOpacity,
  TextInput, ActivityIndicator
} from 'react-native';
import { Alert } from '../../services/appAlert';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../services/supabase';
import CustomHeader from '../../components/CustomHeader';
import ScreenWrapper from '../../components/ScreenWrapper';
import { exportFinancialReport } from '../../services/exportService';

export default function ExportScreen({ navigation, userId, rates }) {
  const [loading, setLoading] = useState(false);
  
  // Personalización del reporte
  const [reportTitle, setReportTitle] = useState('Resumen Financiero Personalizado');
  const [exportFormat, setExportFormat] = useState('csv'); // 'csv', 'xlsx', 'pdf'
  const [exportCurrency, setExportCurrency] = useState('USD'); // 'USD' o 'VES'

  // Filtros
  const [period, setPeriod] = useState('Todo'); 
  const [typeFilter, setTypeFilter] = useState('Ambos'); 
  const [selectedAccount, setSelectedAccount] = useState('Todas');
  
  // Módulos a incluir
  const [includeSummaryCard, setIncludeSummaryCard] = useState(true);
  const [includeMovements, setIncludeMovements] = useState(true);
  const [includeAccounts, setIncludeAccounts] = useState(true);
  const [includeShopping, setIncludeShopping] = useState(true);
  const [includeRecurring, setIncludeRecurring] = useState(true);
  const [includeGoals, setIncludeGoals] = useState(true);
  const [includeNotes, setIncludeNotes] = useState(true);

  const [accountsList, setAccountsList] = useState([]);

  useEffect(() => {
    const fetchAccounts = async () => {
      if (!userId) return;
      try {
        const { data } = await supabase.from('accounts').select('name').eq('user_id', userId);
        if (data) setAccountsList(data.map(a => a.name));
      } catch (err) {
        console.error('Error al cargar cuentas para filtros:', err);
      }
    };
    fetchAccounts();
  }, [userId]);

  const handleGenerateReport = async () => {
    if (!userId) {
      Alert.alert('Aviso', 'Inicia sesión para exportar tus datos financieros.');
      return;
    }

    setLoading(true);
    try {
      const result = await exportFinancialReport(userId, {
        format: exportFormat,
        reportTitle: reportTitle.trim() || 'Resumen Financiero',
        period,
        typeFilter,
        selectedAccount,
        exportCurrency,
        includeSummaryCard,
        includeMovements,
        includeAccounts,
        includeShopping,
        includeRecurring,
        includeGoals,
        includeNotes
      }, rates);

      Alert.alert('¡Éxito!', result.message || 'Reporte generado correctamente.');
    } catch (err) {
      console.error('Error al generar reporte:', err);
      Alert.alert('Error', 'No se pudo generar ni descargar el reporte financiero.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <CustomHeader 
        title="Exportar Reportes"
        onBackPress={() => {
          if (typeof navigation === 'function') {
            navigation('home');
          } else if (navigation?.navigate) {
            navigation.navigate('home');
          } else if (navigation?.goBack) {
            navigation.goBack();
          }
        }}
        showHelp={false}
      />

      <ScreenWrapper contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
        
        {/* TÍTULO */}
        <Text style={styles.sectionTitle}>Título del Reporte</Text>
        <TextInput
          style={styles.textInput}
          value={reportTitle}
          onChangeText={setReportTitle}
          placeholder="Ej. Resumen Mensual"
          placeholderTextColor="#666"
          numberOfLines={1}
        />

        {/* FORMATO */}
        <Text style={styles.sectionTitle}>Formato de Archivo</Text>
        <View style={styles.formatRow}>
          {[
            { key: 'csv', label: 'CSV', icon: 'document-text-outline' },
            { key: 'xlsx', label: 'Excel (.xls)', icon: 'grid-outline' },
            { key: 'pdf', label: 'PDF (Print)', icon: 'document-outline' }
          ].map(fmt => (
            <TouchableOpacity
              key={fmt.key}
              style={[styles.formatCard, exportFormat === fmt.key && styles.formatCardActive]}
              onPress={() => setExportFormat(fmt.key)}
              activeOpacity={0.8}
            >
              <Ionicons name={fmt.icon} size={18} color={exportFormat === fmt.key ? '#a3e635' : '#888'} />
              <Text style={[styles.formatTitle, exportFormat === fmt.key && styles.formatTitleActive]} numberOfLines={1}>
                {fmt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* MONEDA BASE */}
        <Text style={styles.sectionTitle}>Moneda Base</Text>
        <View style={styles.gridRow2}>
          {[
            { code: 'USD', label: 'Dólares ($)' },
            { code: 'VES', label: 'Bolívares (Bs.)' }
          ].map(curr => (
            <TouchableOpacity
              key={curr.code}
              style={[styles.chipFixed, exportCurrency === curr.code && styles.chipActive]}
              onPress={() => setExportCurrency(curr.code)}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipText, exportCurrency === curr.code && styles.chipTextActive]} numberOfLines={1}>
                {curr.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* PERÍODO */}
        <Text style={styles.sectionTitle}>Período de Tiempo</Text>
        <View style={styles.gridRow3}>
          {['Todo', 'Este mes', 'Mes anterior', 'Este año', 'Semanal'].map(item => (
            <TouchableOpacity 
              key={item}
              style={[styles.chipFixed3, period === item && styles.chipActive]}
              onPress={() => setPeriod(item)}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipText, period === item && styles.chipTextActive]} numberOfLines={1}>
                {item}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* TIPO DE TRANSACCIÓN */}
        <Text style={styles.sectionTitle}>Tipo de Transacción</Text>
        <View style={styles.gridRow3}>
          {['Ambos', 'Solo Ingresos', 'Solo Egresos'].map(item => (
            <TouchableOpacity 
              key={item}
              style={[styles.chipFixed3, typeFilter === item && styles.chipActive]}
              onPress={() => setTypeFilter(item)}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipText, typeFilter === item && styles.chipTextActive]} numberOfLines={1}>
                {item}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* FILTRAR POR CUENTA */}
        <Text style={styles.sectionTitle}>Filtrar por Cuenta</Text>
        <View style={styles.accountChipsWrap}>
          {['Todas', ...accountsList].map(acc => (
            <TouchableOpacity 
              key={acc}
              style={[styles.chipWrapItem, selectedAccount === acc && styles.chipActive]}
              onPress={() => setSelectedAccount(acc)}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipText, selectedAccount === acc && styles.chipTextActive]} numberOfLines={1}>
                {acc}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* SECCIONES A INCLUIR */}
        <Text style={styles.sectionTitle}>Secciones a Incluir</Text>
        
        {[
          { label: 'Tarjeta de resumen ejecutivo', val: includeSummaryCard, set: setIncludeSummaryCard },
          { label: 'Movimientos financieros', val: includeMovements, set: setIncludeMovements },
          { label: 'Cuentas y saldos bancarios', val: includeAccounts, set: setIncludeAccounts },
          { label: 'Listas de compras y provisiones', val: includeShopping, set: setIncludeShopping },
          { label: 'Pagos recurrentes y plantillas', val: includeRecurring, set: setIncludeRecurring },
          { label: 'Metas y ahorros', val: includeGoals, set: setIncludeGoals },
          { label: 'Notas y descripciones', val: includeNotes, set: setIncludeNotes },
        ].map((item, idx) => (
          <TouchableOpacity
            key={idx}
            style={styles.checkboxRow}
            onPress={() => item.set(!item.val)}
            activeOpacity={0.8}
          >
            <Ionicons name={item.val ? "checkbox" : "square-outline"} size={18} color={item.val ? "#a3e635" : "#888"} style={{ marginRight: 10 }} />
            <Text style={styles.checkboxText} numberOfLines={1}>{item.label}</Text>
          </TouchableOpacity>
        ))}

        <TouchableOpacity 
          style={styles.exportButton}
          onPress={handleGenerateReport}
          activeOpacity={0.8}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#000" />
          ) : (
            <>
              <Ionicons name="cloud-download-outline" size={18} color="#000" style={{ marginRight: 8 }} />
              <Text style={styles.exportButtonText} numberOfLines={1}>Generar y Descargar .{exportFormat}</Text>
            </>
          )}
        </TouchableOpacity>

      </ScreenWrapper>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  scrollBody: { padding: 15, paddingBottom: 40 },
  
  sectionTitle: {
    color: '#888',
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 6,
    marginTop: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.8
  },

  textInput: {
    backgroundColor: '#161922',
    color: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#262832',
    fontSize: 13,
  },

  formatRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 6 },
  formatCard: {
    flex: 1,
    height: 52,
    backgroundColor: '#161922',
    borderRadius: 12,
    paddingHorizontal: 6,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#262832',
  },
  formatCardActive: {
    backgroundColor: 'rgba(163, 230, 53, 0.08)',
    borderColor: '#a3e635',
  },
  formatTitle: { color: '#ccc', fontSize: 11, fontWeight: 'bold', marginTop: 2 },
  formatTitleActive: { color: '#a3e635' },

  gridRow2: { flexDirection: 'row', gap: 6 },
  gridRow3: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },

  chipFixed: {
    flex: 1,
    height: 40,
    backgroundColor: '#161922',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#262832',
    paddingHorizontal: 8,
  },
  chipFixed3: {
    width: '31.5%',
    height: 40,
    backgroundColor: '#161922',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#262832',
    paddingHorizontal: 4,
  },
  accountChipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chipWrapItem: {
    height: 38,
    backgroundColor: '#161922',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#262832',
    paddingHorizontal: 12,
  },
  chipActive: {
    backgroundColor: 'rgba(163, 230, 53, 0.12)',
    borderColor: '#a3e635'
  },
  chipText: { color: '#888', fontSize: 12, fontWeight: '600', textAlign: 'center' },
  chipTextActive: { color: '#a3e635', fontWeight: 'bold' },

  checkboxRow: {
    backgroundColor: '#161922',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#262832'
  },
  checkboxText: { color: '#fff', fontSize: 12, fontWeight: '500', flex: 1 },

  exportButton: {
    backgroundColor: '#a3e635',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 20
  },
  exportButtonText: { color: '#000', fontSize: 14, fontWeight: '800' }
});
