import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, Text, View, TouchableOpacity,
  ActivityIndicator, Platform 
} from 'react-native';
import { Alert } from '../../services/appAlert';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../services/supabase';
import CustomHeader from '../../components/CustomHeader';
import ScreenWrapper from '../../components/ScreenWrapper';

export default function ExportScreen({ navigation, userId }) {
  const [loading, setLoading] = useState(false);
  
  // Filtros de exportación
  const [period, setPeriod] = useState('Todo'); 
  const [typeFilter, setTypeFilter] = useState('Ambos'); 
  const [selectedAccount, setSelectedAccount] = useState('Todas');
  
  // Módulos adicionales a incluir
  const [includeShopping, setIncludeShopping] = useState(true);
  const [includeRecurring, setIncludeRecurring] = useState(true);
  const [includeGoals, setIncludeGoals] = useState(true);

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
      // 1. Consultar movimientos base
      let query = supabase.from('movements').select('*').eq('user_id', userId);
      
      if (typeFilter === 'Ingresos') query = query.eq('type', 'Ingreso');
      if (typeFilter === 'Egresos') query = query.eq('type', 'Egreso');
      if (selectedAccount !== 'Todas') query = query.eq('account', selectedAccount);

      const { data: movements, error: movError } = await query;
      if (movError) throw movError;

      // 2. Consultar módulos adicionales si están seleccionados
      let shoppingData = [];
      let recurringData = [];
      let goalsData = [];

      if (includeShopping) {
        const { data } = await supabase.from('shopping_lists').select('*').eq('user_id', userId);
        shoppingData = data || [];
      }
      if (includeRecurring) {
        const { data } = await supabase.from('recurring_templates').select('*').eq('user_id', userId);
        recurringData = data || [];
      }
      if (includeGoals) {
        const { data } = await supabase.from('goals').select('*').eq('user_id', userId);
        goalsData = data || [];
      }

      // 3. Construir contenido estructurado en formato CSV unificado
      let csvParts = [];

      csvParts.push('=== MOVIMIENTOS FINANCIEROS ===');
      csvParts.push('ID,Tipo,Monto,Moneda,Cuenta,Categoria,Fecha');
      (movements || []).forEach(m => {
        csvParts.push(`${m.id},${m.type || ''},${m.amount || 0},${m.currency || 'VES'},"${m.account || ''}","${m.category || ''}",${m.created_at || ''}`);
      });
      csvParts.push(''); 

      if (includeShopping && shoppingData.length > 0) {
        csvParts.push('=== LISTAS DE COMPRAS ===');
        csvParts.push('ID,Titulo,Total USD,Completado,Fecha');
        shoppingData.forEach(s => {
          csvParts.push(`${s.id},"${s.title || ''}",${s.total_usd || 0},${s.completed ? 'Sí' : 'No'},${s.date || ''}`);
        });
        csvParts.push('');
      }

      if (includeRecurring && recurringData.length > 0) {
        csvParts.push('=== PAGOS RECURRENTES Y PLANTILLAS ===');
        csvParts.push('ID,Nombre,Tipo,Monto,Moneda,Frecuencia,Cuenta');
        recurringData.forEach(r => {
          csvParts.push(`${r.id},"${r.name || ''}",${r.type || ''},${r.amount || 0},${r.currency || 'VES'},"${r.frequency || ''}","${r.account || ''}"`);
        });
        csvParts.push('');
      }

      if (includeGoals && goalsData.length > 0) {
        csvParts.push('=== METAS Y AHORROS ===');
        csvParts.push('ID,Nombre,Actual,Objetivo,Protegido');
        goalsData.forEach(g => {
          csvParts.push(`${g.id},"${g.name || ''}",${g.current || 0},${g.target || 0},${g.is_protected ? 'Sí' : 'No'}`);
        });
      }

      const finalCsvString = csvParts.join('\n');

      // 4. Exportación universal compatible con Web y Móvil mediante Blob/URL
      const blob = new Blob([finalCsvString], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `reporte_financiero_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      Alert.alert('Éxito', 'Reporte financiero generado y descargado correctamente.');

    } catch (err) {
      console.error('Error al generar reporte:', err);
      Alert.alert('Error', 'No se pudo generar el reporte financiero.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <CustomHeader 
        title="Exportar Reportes"
        onBackPress={() => navigation.goBack()}
        showHelp={false}
      />

      <ScreenWrapper contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
        
        <Text style={styles.sectionTitle}>Período de Reporte</Text>
        <View style={styles.chipsRow}>
          {['Todo', 'Anual', 'Mensual', 'Semanal'].map(item => (
            <TouchableOpacity 
              key={item}
              style={[styles.chip, period === item && styles.chipActive]}
              onPress={() => setPeriod(item)}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipText, period === item && styles.chipTextActive]}>{item}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Tipo de Operación</Text>
        <View style={styles.chipsRow}>
          {['Ambos', 'Ingresos', 'Egresos'].map(item => (
            <TouchableOpacity 
              key={item}
              style={[styles.chip, typeFilter === item && styles.chipActive]}
              onPress={() => setTypeFilter(item)}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipText, typeFilter === item && styles.chipTextActive]}>{item}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Filtrar por Cuenta</Text>
        <ScreenWrapper horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 15 }}>
          {['Todas', ...accountsList].map(acc => (
            <TouchableOpacity 
              key={acc}
              style={[styles.chipHorizontal, selectedAccount === acc && styles.chipActive]}
              onPress={() => setSelectedAccount(acc)}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipText, selectedAccount === acc && styles.chipTextActive]}>{acc}</Text>
            </TouchableOpacity>
          ))}
        </ScreenWrapper>

        <Text style={styles.sectionTitle}>Incluir en el Reporte</Text>
        
        <TouchableOpacity 
          style={styles.checkboxRow} 
          onPress={() => setIncludeShopping(!includeShopping)}
          activeOpacity={0.8}
        >
          <Ionicons name={includeShopping ? "checkbox" : "square-outline"} size={20} color={includeShopping ? "#a3e635" : "#888"} style={{ marginRight: 10 }} />
          <Text style={styles.checkboxText}>Listas de compras pagadas</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.checkboxRow} 
          onPress={() => setIncludeRecurring(!includeRecurring)}
          activeOpacity={0.8}
        >
          <Ionicons name={includeRecurring ? "checkbox" : "square-outline"} size={20} color={includeRecurring ? "#a3e635" : "#888"} style={{ marginRight: 10 }} />
          <Text style={styles.checkboxText}>Pagos recurrentes y plantillas</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.checkboxRow} 
          onPress={() => setIncludeGoals(!includeGoals)}
          activeOpacity={0.8}
        >
          <Ionicons name={includeGoals ? "checkbox" : "square-outline"} size={20} color={includeGoals ? "#a3e635" : "#888"} style={{ marginRight: 10 }} />
          <Text style={styles.checkboxText}>Metas y ahorros</Text>
        </TouchableOpacity>

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
              <Ionicons name="cloud-download-outline" size={20} color="#000" style={{ marginRight: 8 }} />
              <Text style={styles.exportButtonText}>Generar y Descargar CSV</Text>
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
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
    marginTop: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },

  chipsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  chip: {
    flex: 1,
    backgroundColor: '#161616',
    paddingVertical: 10,
    borderRadius: 14,
    alignItems: 'center',
    marginHorizontal: 3,
    borderWidth: 1,
    borderColor: '#222'
  },
  chipHorizontal: {
    backgroundColor: '#161616',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#222'
  },
  chipActive: {
    backgroundColor: '#222',
    borderColor: '#a3e635'
  },
  chipText: { color: '#888', fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: '#a3e635' },

  checkboxRow: {
    backgroundColor: '#161616',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#222'
  },
  checkboxText: { color: '#fff', fontSize: 14, fontWeight: '500' },

  exportButton: {
    backgroundColor: '#a3e635',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 15,
    borderRadius: 18,
    marginTop: 25
  },
  exportButtonText: { color: '#000', fontSize: 15, fontWeight: 'bold' }
});