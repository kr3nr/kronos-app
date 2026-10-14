import React, { useState } from 'react';
import { StyleSheet, Text, View, } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { XP_CONFIG, MISSIONS_CONFIG, calculateUserLevel } from '../../services/gamificationService';
import CustomHeader from '../../components/CustomHeader';
import ScreenWrapper from '../../components/ScreenWrapper';

export default function ProfileScreen({ navigation, movements = [], accounts = [] }) {
  const [activeTooltip, setActiveTooltip] = useState(null);

  // ---------------------------------------------------------------------------
  // CÁLCULOS 100% REALES Y DINÁMICOS BASADOS EN MOVIMIENTOS Y CUENTAS
  // ---------------------------------------------------------------------------
  const totalMovementsCount = Array.isArray(movements) ? movements.length : 0;
  const totalAccountsCount = Array.isArray(accounts) ? accounts.length : 0;

  // Cálculo de XP y Niveles Reales utilizando el servicio centralizado
  const totalXP = (totalAccountsCount * XP_CONFIG.ACCOUNT) + (totalMovementsCount * XP_CONFIG.MOVEMENT);
  const { currentLevel, xpInCurrentLevel, xpPercentage, xpNeededForNextLevel, maxXPPerLevel } = calculateUserLevel(totalXP);

  // 1. Categoría principal (¿Dónde gastas más?)
  let topCategoryName = 'Sin registros';
  if (totalMovementsCount > 0) {
    const categoryCounts = {};
    movements.forEach(m => {
      const cat = m.category || m.categoryName || m.categoria || 'Sin categoría';
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });

    let maxCat = 'Sin categoría';
    let maxCount = 0;
    Object.keys(categoryCounts).forEach(cat => {
      if (categoryCounts[cat] > maxCount) {
        maxCount = categoryCounts[cat];
        maxCat = cat;
      }
    });
    topCategoryName = maxCat;
  }

  // 2. Cuenta principal (¿Cuál usas más?)
  let mainAccountName = 'Sin cuentas';
  if (totalAccountsCount > 0) {
    if (totalMovementsCount > 0) {
      const accountCounts = {};
      movements.forEach(m => {
        const accId = m.account_id || m.accountId || m.account;
        if (accId) {
          accountCounts[accId] = (accountCounts[accId] || 0) + 1;
        }
      });

      let bestAccId = accounts[0].id;
      let maxAccCount = -1;
      Object.keys(accountCounts).forEach(accId => {
        if (accountCounts[accId] > maxAccCount) {
          maxAccCount = accountCounts[accId];
          bestAccId = accId;
        }
      });

      const foundAcc = accounts.find(a => String(a.id) === String(bestAccId));
      mainAccountName = foundAcc ? (foundAcc.name || foundAcc.nombre) : (accounts[0].name || accounts[0].nombre || 'Principal');
    } else {
      mainAccountName = accounts[0].name || accounts[0].nombre || 'Principal';
    }
  }

  // 3. Ticket promedio real calculado con los montos de los movimientos
  const totalSumAmount = totalMovementsCount > 0 
    ? movements.reduce((acc, curr) => acc + Math.abs(Number(curr.amount || curr.monto || curr.value || 0)), 0) 
    : 0;
  const averageTicketValue = totalMovementsCount > 0 ? (totalSumAmount / totalMovementsCount).toFixed(2) : '0.00';

  return (
    <View style={styles.container}>
      {/* Cabecera estandarizada obligatoria */}
      <CustomHeader 
        title="Perfil financiero"
        onBackPress={() => navigation('home')}
        helpTitle="Tu perfil financiero"
        helpTips={[
          'El nivel y el progreso resumen tu actividad en Kronos.',
          'Las estadísticas se calculan con tus movimientos y cuentas.',
          'Toca las tarjetas para explorar los datos disponibles.',
        ]}
      />

      <ScreenWrapper contentContainerStyle={styles.scrollContent}>
        
        {/* NÚCLEO SUPERIOR: ANILLO CIRCULAR DE PROGRESO DE XP */}
        <View style={styles.levelRingContainer}>
          <View style={styles.levelCircleOuterRing}>
            {xpPercentage > 0 && (
              <View style={[
                styles.levelCircleProgressFill, 
                { 
                  borderColor: '#a3e635',
                  borderBottomColor: xpPercentage > 0 ? '#a3e635' : 'transparent', 
                  borderLeftColor: xpPercentage >= 25 ? '#a3e635' : 'transparent', 
                  borderTopColor: xpPercentage >= 50 ? '#a3e635' : 'transparent',
                  borderRightColor: xpPercentage >= 75 ? '#a3e635' : 'transparent',
                  ...(xpPercentage >= 100 ? { backgroundColor: '#a3e63520' } : {})
                }
              ]} />
            )}
            <View style={styles.levelIconCenterBox}>
              <Text style={styles.levelBigNumber}>{currentLevel}</Text>
            </View>
          </View>
        </View>

        <View style={styles.statusSection}>
          <Text style={styles.statusSubText}>
            Llevas {totalMovementsCount} movimientos
          </Text>

          {activeTooltip === 'header' && (
            <View style={styles.tooltipCard}>
              <Text style={styles.tooltipTitle}>Tu Progreso y Nivel</Text>
              <Text style={styles.tooltipText}>Aquí visualizas tu nivel actual y estadísticas financieras sincronizadas en tiempo real.</Text>
            </View>
          )}
        </View>

        {/* TARJETAS SUPERIORES DE XP (Dos Columnas Dinámicas) */}
        <View style={styles.twoColumnGrid}>
          {/* Tarjeta Izquierda: Ya conseguiste */}
          <View style={styles.statCard}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.smallHexagonIcon}>
                <Text style={styles.smallHexagonText}>{currentLevel}</Text>
              </View>
              <Text style={styles.cardBadgeText}>XP</Text>
            </View>
            <Text style={styles.statCardLabel}>Ya conseguiste</Text>
            <Text style={styles.statCardValueBold}>{totalXP} XP</Text>
          </View>

          {/* Tarjeta Derecha: Necesitas */}
          <View style={styles.statCard}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.smallLevelBadgeText}>{currentLevel + 1}</Text>
              <Ionicons name="lock-closed" size={14} color="#fbbf24" style={{ marginLeft: 4 }} />
            </View>
            <Text style={styles.statCardLabel}>Necesitas</Text>
            <Text style={styles.statCardValueBold}>{xpNeededForNextLevel} XP</Text>
            <Text style={styles.subLevelText}>NIVEL {currentLevel + 1}</Text>
          </View>
        </View>

        {/* TARJETA DE MISIÓN ESPECIAL CON BONUS */}
        <View style={styles.activityCard}>
          <View style={styles.activityCardHeaderRow}>
            <Text style={styles.activityHeaderLabel}>MISIÓN ESPECIAL CON BONUS</Text>
          </View>
          
          <View style={styles.activityRowContent}>
            <View style={styles.activityTextColumn}>
              <Text style={styles.activityMainTitle}>{MISSIONS_CONFIG.specialMissionsList[0].title}</Text>
              <Text style={styles.activityRewardText}>{MISSIONS_CONFIG.specialMissionsList[0].rewardText}</Text>
            </View>
            <View style={styles.documentIconBox}>
              <Ionicons name="document-text-outline" size={32} color="#888" />
            </View>
          </View>

          <View style={styles.activityFooterRow}>
            <Ionicons name="time-outline" size={14} color="#ccc" style={{ marginRight: 6 }} />
            <Text style={styles.activityFooterTextActive}>{MISSIONS_CONFIG.specialMissionsList[0].timeLeft}</Text>
          </View>
        </View>

        {/* TARJETA INFERIOR: RESUMEN CLARO Y DINÁMICO */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitleLarge}>Resumen</Text>
          
          {/* Fila 1: Categoría Principal */}
          <View style={styles.summaryItemRow}>
            <View style={[styles.summaryIconBox, { backgroundColor: 'rgba(163, 230, 53, 0.15)' }]}>
              <Ionicons name="pricetag-outline" size={18} color="#a3e635" />
            </View>
            <View style={styles.summaryItemInfo}>
              <Text style={styles.summaryItemTitle}>Categoría principal</Text>
              <Text style={styles.summaryItemDesc}>¿Dónde gastas más?</Text>
            </View>
            <Text style={styles.summaryItemValue} numberOfLines={1}>{topCategoryName}</Text>
          </View>

          {/* Fila 2: Cuenta Principal */}
          <View style={styles.summaryItemRow}>
            <View style={[styles.summaryIconBox, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
              <Ionicons name="wallet-outline" size={18} color="#3b82f6" />
            </View>
            <View style={styles.summaryItemInfo}>
              <Text style={styles.summaryItemTitle}>Cuenta principal</Text>
              <Text style={styles.summaryItemDesc}>¿Cuál usas más?</Text>
            </View>
            <Text style={styles.summaryItemValue} numberOfLines={1}>{mainAccountName}</Text>
          </View>

          {/* Fila 3: Total Movimientos */}
          <View style={styles.summaryItemRow}>
            <View style={[styles.summaryIconBox, { backgroundColor: 'rgba(251, 191, 36, 0.15)' }]}>
              <Ionicons name="repeat-outline" size={18} color="#fbbf24" />
            </View>
            <View style={styles.summaryItemInfo}>
              <Text style={styles.summaryItemTitle}>Total de movimientos</Text>
              <Text style={styles.summaryItemDesc}>Transacciones registradas</Text>
            </View>
            <Text style={styles.summaryItemValue}>{totalMovementsCount} tx</Text>
          </View>

          {/* Fila 4: Promedio por operación */}
          <View style={[styles.summaryItemRow, { borderBottomWidth: 0, marginBottom: 0, paddingBottom: 0 }]}>
            <View style={[styles.summaryIconBox, { backgroundColor: 'rgba(248, 113, 113, 0.15)' }]}>
              <Ionicons name="calculator-outline" size={18} color="#f87171" />
            </View>
            <View style={styles.summaryItemInfo}>
              <Text style={styles.summaryItemTitle}>Promedio por operación</Text>
              <Text style={styles.summaryItemDesc}>Monto medio gastado</Text>
            </View>
            <Text style={styles.summaryItemValue}>{averageTicketValue}</Text>
          </View>
        </View>

      </ScreenWrapper>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  scrollContent: { padding: 15, paddingBottom: 40 },
  
  levelRingContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 15, marginBottom: 5 },
  levelCircleOuterRing: { 
    width: 95, 
    height: 95, 
    borderRadius: 47.5, 
    borderWidth: 4, 
    borderColor: '#262626', 
    justifyContent: 'center', 
    alignItems: 'center', 
    position: 'relative' 
  },
  levelCircleProgressFill: { 
    position: 'absolute', 
    width: 95, 
    height: 95, 
    borderRadius: 47.5, 
    borderWidth: 4, 
    borderColor: 'transparent',
    transform: [{ rotate: '45deg' }] 
  },
  levelIconCenterBox: { 
    width: 75, 
    height: 75, 
    borderRadius: 37.5, 
    backgroundColor: '#1a1a1a', 
    justifyContent: 'center', 
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#333'
  },
  levelBigNumber: { color: '#a3e635', fontSize: 32, fontWeight: 'bold' },

  statusSection: { alignItems: 'center', marginBottom: 20 },
  statusSubText: { color: '#888', fontSize: 13, textAlign: 'center' },

  twoColumnGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  statCard: { backgroundColor: '#1a1a1a', flex: 1, padding: 16, borderRadius: 22, marginHorizontal: 4, borderWidth: 1, borderColor: '#262626', justifyContent: 'space-between', minHeight: 115 },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  
  smallHexagonIcon: { width: 20, height: 20, backgroundColor: '#a3e635', borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
  smallHexagonText: { color: '#000', fontSize: 10, fontWeight: 'bold' },
  cardBadgeText: { color: '#a3e635', fontSize: 13, fontWeight: 'bold' },
  smallLevelBadgeText: { color: '#888', fontSize: 12, fontWeight: 'bold' },
  
  statCardLabel: { color: '#888', fontSize: 13, marginBottom: 2 },
  statCardValueBold: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  subLevelText: { color: '#fbbf24', fontSize: 10, fontWeight: 'bold', marginTop: 2 },

  activityCard: { backgroundColor: '#1a1a1a', borderRadius: 22, padding: 18, marginBottom: 15, borderWidth: 1, borderColor: '#262626' },
  activityCardHeaderRow: { marginBottom: 8 },
  activityHeaderLabel: { color: '#666', fontSize: 10, fontWeight: 'bold', letterSpacing: 0.5 },
  activityRowContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  activityTextColumn: { flex: 1, marginRight: 10 },
  activityMainTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold', lineHeight: 22, marginBottom: 4 },
  activityRewardText: { color: '#a3e635', fontSize: 13, fontWeight: 'bold' },
  documentIconBox: { justifyContent: 'center', alignItems: 'center', paddingLeft: 10 },
  activityFooterRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#262626', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, marginTop: 4 },
  activityFooterTextActive: { color: '#ccc', fontSize: 12, fontWeight: '500' },

  sectionContainer: { backgroundColor: '#1a1a1a', borderRadius: 22, padding: 18, marginBottom: 15, borderWidth: 1, borderColor: '#262626' },
  sectionTitleLarge: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 15 },
  
  summaryItemRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, borderBottomWidth: 1, borderBottomColor: '#222', paddingBottom: 12 },
  summaryIconBox: { width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  summaryItemInfo: { flex: 1, marginRight: 10 },
  summaryItemTitle: { color: '#fff', fontSize: 13, fontWeight: 'bold', marginBottom: 2 },
  summaryItemDesc: { color: '#888', fontSize: 11 },
  summaryItemValue: { color: '#a3e635', fontSize: 13, fontWeight: 'bold', textAlign: 'right', maxWidth: '40%' },

  tooltipCard: { backgroundColor: '#222', borderRadius: 16, padding: 16, marginTop: 10, borderWidth: 1, borderColor: '#a3e635', width: '100%' },
  tooltipTitle: { color: '#a3e635', fontSize: 14, fontWeight: 'bold', marginBottom: 6 },
  tooltipText: { color: '#ccc', fontSize: 12, lineHeight: 18, marginBottom: 10 },
});