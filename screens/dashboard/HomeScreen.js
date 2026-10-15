import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import ScreenWrapper from '../../components/ScreenWrapper';
import { convertCurrencyAmount, getBolivarRate, SUPPORTED_CURRENCIES } from '../../services/currencyService';
import { useAppTheme } from '../../components/ThemeContext';
import { getMovementCategoryPresentation } from '../../services/movementPresentation';

const formatCurrencyValue = (num, currency = 'USD') => {
  const n = parseFloat(num || 0);
  if (isNaN(n))
    return currency === 'VES' || currency === 'EUR' ? '0,00' : '0.00';
  const parts = n.toFixed(2).split('.');
  if (currency !== 'USD' && currency !== 'USDT') {
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return parts.join(',');
  } else {
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
  }
};

const SHORTCUTS_MAP = {
  compras: {
    name: 'Lista de compras',
    icon: 'cart-outline',
    route: 'shoppingLists',
  },
  cuentas: { name: 'Cuentas', icon: 'card-outline', route: 'accounts' },
  pagos: { name: 'Pagar/Cobrar', icon: 'calendar-outline', route: 'debts' },
  calculadora: {
    name: 'Calculadora',
    icon: 'calculator-outline',
    route: 'converterCalculator',
  },
  movimientos: {
    name: 'Movimientos',
    icon: 'swap-horizontal-outline',
    route: 'movements',
  },
  categorias: {
    name: 'Categorías',
    icon: 'pricetag-outline',
    route: 'categorias',
  },
  recurrentes: {
    name: 'Recurrentes',
    icon: 'copy-outline',
    route: 'recurring',
  },
  metas: { name: 'Metas', icon: 'flag-outline', route: 'goals' },
};

const MONTHS_SHORT = [
  'E', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D',
];

function ShortcutIconBadge({ name, isLight }) {
  return (
    <View style={[styles.shortcutIconContainer, isLight && styles.shortcutIconContainerLight]}>
      <Ionicons name={name} size={20} color={isLight ? '#fff' : '#a3e635'} />
    </View>
  );
}

export default function HomeScreen({
  navigation,
  userName,
  userAvatar = 'person',
  userAvatarBg = '#a3e635',
  accounts = [],
  transactions = [],
  movements = [],
  goals = [],
  categories = [],
  rates,
  selectedCurrencyFilter,
  setSelectedCurrencyFilter,
  displayCurrencies = ['USD', 'EUR', 'USDT', 'VES'],
  activeShortcuts = ['compras', 'cuentas', 'pagos', 'recurrentes'],
  activeWidgets = [],
}) {
  const [trendFilter, setTrendFilter] = useState('Mes');
  const [trendDropdownOpen, setTrendDropdownOpen] = useState(false);
  const isLightTheme = useAppTheme() === 'light';

  const visibleCurrencies = displayCurrencies.length ? displayCurrencies : ['USD', 'EUR', 'USDT', 'VES'];

  const totalUSD = accounts.reduce((acc, item) => {
    const balance = parseFloat(item.balance) || 0;
    const convertedBalance = convertCurrencyAmount(balance, item.currency || 'VES', 'USD', rates);
    return acc + (convertedBalance ?? 0);
  }, 0);

  const validMovements = movements.filter((m) =>
    accounts.some((acc) => String(acc.id) === String(m.accountId || m.account_id))
  );

  const totalIncome = validMovements
    .filter((m) => {
      const isTransfer = (m.category || '').toLowerCase().includes('transferencia');
      const amountVal = parseFloat(m.amount || 0);
      return !isTransfer && amountVal > 0;
    })
    .reduce((acc, m) => {
      const matchedAccount = accounts.find(
        (acc) => String(acc.id) === String(m.accountId || m.account_id)
      );
      const movementCurrency = m.currency || (matchedAccount ? matchedAccount.currency : 'USD');
      let amountVal = parseFloat(m.amount) || 0;

      const convertedAmount = convertCurrencyAmount(amountVal, movementCurrency, 'USD', rates);
      return acc + (convertedAmount ?? 0);
    }, 0);

  const totalExpense = validMovements
    .filter((m) => {
      const isTransfer = (m.category || '').toLowerCase().includes('transferencia');
      const amountVal = parseFloat(m.amount || 0);
      return !isTransfer && amountVal < 0;
    })
    .reduce((acc, m) => {
      const matchedAccount = accounts.find(
        (acc) => String(acc.id) === String(m.accountId || m.account_id)
      );
      const movementCurrency = m.currency || (matchedAccount ? matchedAccount.currency : 'USD');
      let amountVal = Math.abs(parseFloat(m.amount) || 0);

      const convertedAmount = convertCurrencyAmount(amountVal, movementCurrency, 'USD', rates);
      return acc + (convertedAmount ?? 0);
    }, 0);

  const getDisplayedBalance = () => {
    const currency = SUPPORTED_CURRENCIES.find(item => item.code === selectedCurrencyFilter);
    const convertedBalance = convertCurrencyAmount(totalUSD, 'USD', selectedCurrencyFilter, rates);
    if (convertedBalance === null) return 'Tasa no disponible';
    return `${currency?.symbol || selectedCurrencyFilter} ${formatCurrencyValue(convertedBalance, selectedCurrencyFilter)}`;
  };

  const getRateText = () => {
    const rate = getBolivarRate(selectedCurrencyFilter, rates);
    if (!rate) return 'Tasa de cambio no disponible';
    return `1 ${selectedCurrencyFilter} = ${rate.toLocaleString('es-VE', { maximumFractionDigits: 4 })} Bs.`;
  };

  const getFormattedLastUpdate = () => {
    if (!rates?.lastUpdate) return 'Actualizado recientemente';
    try {
      const date = new Date(rates.lastUpdate);
      return `Actualizado: ${date.toLocaleDateString()} a las ${date.toLocaleTimeString(
        [],
        { hour: '2-digit', minute: '2-digit' }
      )}`;
    } catch (e) {
      return 'Actualizado recientemente';
    }
  };

  const renderWidgetContent = (widgetId) => {
    switch (widgetId) {
      case 'brecha': {
        const bcvVal = rates?.bcvRate || 0;
        const binanceVal = rates?.binanceRate || 0;

        let diffPercent = 0;
        let isHigher = true;
        if (bcvVal > 0 && binanceVal > 0) {
          diffPercent = ((binanceVal - bcvVal) / bcvVal) * 100;
          isHigher = binanceVal >= bcvVal;
        }

        return (
          <View style={styles.brechaContainer}>
            <View style={styles.brechaRatesRow}>
              <View style={styles.brechaRateItem}>
                <Text style={styles.brechaLabel}>BCV USD</Text>
                <Text style={styles.brechaValue}>
                  Bs. {formatCurrencyValue(bcvVal, 'VES')}
                </Text>
              </View>
              <View style={styles.brechaDividerVertical} />
              <View style={styles.brechaRateItem}>
                <Text style={styles.brechaLabel}>Binance P2P</Text>
                <Text style={styles.brechaValue}>
                  Bs. {formatCurrencyValue(binanceVal, 'VES')}
                </Text>
              </View>
            </View>

            <View style={styles.brechaFooterRow}>
              <View style={styles.brechaBadge}>
                <Ionicons
                  name={isHigher ? 'trending-up' : 'trending-down'}
                  size={14}
                  color={isHigher ? '#a3e635' : '#f87171'}
                  style={{ marginRight: 4 }}
                />
                <Text
                  style={[
                    styles.brechaBadgeText,
                    { color: isHigher ? '#a3e635' : '#f87171' },
                  ]}>
                  Brecha: {Math.abs(diffPercent).toFixed(2)}% (
                  {isHigher ? 'Superior' : 'Inferior'})
                </Text>
              </View>
            </View>
          </View>
        );
      }
      case 'estadisticas': {
        const totalFlow = totalIncome + totalExpense;
        const incomeRatio = totalFlow > 0 ? (totalIncome / totalFlow) * 100 : 50;
        const expenseRatio = totalFlow > 0 ? (totalExpense / totalFlow) * 100 : 50;
        const netBalance = totalIncome - totalExpense;
        const isNetPositive = netBalance >= 0;

        return (
          <View style={styles.modernStatsContainer}>
            <View style={styles.statsSummaryCard}>
              <View>
                <Text style={styles.statsSummaryLabel}>
                  Balance Neto del Mes
                </Text>
                <Text
                  style={[
                    styles.statsSummaryAmount,
                    { color: isNetPositive ? '#a3e635' : '#f87171' },
                  ]}>
                  {isNetPositive ? '+' : '-'}${' '}
                  {formatCurrencyValue(Math.abs(netBalance), 'USD')}
                </Text>
              </View>
              <View
                style={[
                  styles.statsIconBadge,
                  {
                    backgroundColor: isNetPositive
                      ? 'rgba(163, 230, 53, 0.15)'
                      : 'rgba(248, 113, 113, 0.15)',
                  },
                ]}>
                <Ionicons
                  name={
                    isNetPositive
                      ? 'arrow-up-circle-outline'
                      : 'arrow-down-circle-outline'
                  }
                  size={22}
                  color={isNetPositive ? '#a3e635' : '#f87171'}
                />
              </View>
            </View>

            <View style={styles.ratioBarSection}>
              <View style={styles.ratioBarLabelsRow}>
                <Text style={styles.ratioLabelText}>
                  Ingresos ({incomeRatio.toFixed(0)}%)
                </Text>
                <Text style={styles.ratioLabelText}>
                  Egresos ({expenseRatio.toFixed(0)}%)
                </Text>
              </View>
              <View style={styles.ratioBarTrack}>
                <View
                  style={[
                    styles.ratioBarFillIncome,
                    { width: `${incomeRatio}%` },
                  ]}
                />
                <View
                  style={[
                    styles.ratioBarFillExpense,
                    { width: `${expenseRatio}%` },
                  ]}
                />
              </View>
            </View>

            <View style={styles.statsCardsRow}>
              <View style={styles.statMiniBox}>
                <View style={styles.statMiniHeader}>
                  <View
                    style={[styles.statsDot, { backgroundColor: '#a3e635' }]}
                  />
                  <Text style={styles.statMiniTitle}>Ingresos (sin transferencias)</Text>
                </View>
                <Text style={styles.statMiniValue}>
                  ${formatCurrencyValue(totalIncome, 'USD')}
                </Text>
              </View>

              <View style={styles.statMiniBox}>
                <View style={styles.statMiniHeader}>
                  <View
                    style={[styles.statsDot, { backgroundColor: '#f87171' }]}
                  />
                  <Text style={styles.statMiniTitle}>Egresos (sin transferencias)</Text>
                </View>
                <Text style={styles.statMiniValue}>
                  ${formatCurrencyValue(totalExpense, 'USD')}
                </Text>
              </View>
            </View>
          </View>
        );
      }
      case 'tendencias': {
        const netDiff = totalIncome - totalExpense;
        const isNegative = netDiff < 0;

        let chartColumns = [];
        if (trendFilter === 'Mes') {
          chartColumns = MONTHS_SHORT.map((mLetter, mIdx) => {
            const mIncome = validMovements
              .filter(
                (item) =>
                  (item.month_index === mIdx || item.monthIndex === mIdx) &&
                  !(item.category || '').toLowerCase().includes('transferencia') &&
                  parseFloat(item.amount) > 0
              )
              .reduce(
                (sum, item) => sum + Math.abs(parseFloat(item.amount || 0)),
                0
              );

            const mExpense = validMovements
              .filter(
                (item) =>
                  (item.month_index === mIdx || item.monthIndex === mIdx) &&
                  !(item.category || '').toLowerCase().includes('transferencia') &&
                  parseFloat(item.amount) < 0
              )
              .reduce(
                (sum, item) => sum + Math.abs(parseFloat(item.amount || 0)),
                0
              );

            return { label: mLetter, inc: mIncome, exp: mExpense };
          });
        } else {
          const today = new Date();
          const currentDayOfWeek = today.getDay() === 0 ? 7 : today.getDay();
          const mondayDate = new Date(today);
          mondayDate.setDate(today.getDate() - currentDayOfWeek + 1);

          const daysOfWeek = ['L', 'M', 'Mi', 'J', 'V', 'S', 'D'];
          chartColumns = daysOfWeek.map((dLabel, dayIdx) => {
            const targetDate = new Date(mondayDate);
            targetDate.setDate(mondayDate.getDate() + dayIdx);
            const targetDayNum = targetDate.getDate();
            const targetMonthNum = targetDate.getMonth();

            const dIncome = validMovements
              .filter(
                (item) =>
                  item.day === targetDayNum &&
                  (item.month_index === undefined ||
                    item.month_index === targetMonthNum ||
                    item.monthIndex === targetMonthNum) &&
                  !(item.category || '').toLowerCase().includes('transferencia') &&
                  parseFloat(item.amount) > 0
              )
              .reduce(
                (sum, item) => sum + Math.abs(parseFloat(item.amount || 0)),
                0
              );

            const dExpense = validMovements
              .filter(
                (item) =>
                  item.day === targetDayNum &&
                  (item.month_index === undefined ||
                    item.month_index === targetMonthNum ||
                    item.monthIndex === targetMonthNum) &&
                  !(item.category || '').toLowerCase().includes('transferencia') &&
                  parseFloat(item.amount) < 0
              )
              .reduce(
                (sum, item) => sum + Math.abs(parseFloat(item.amount || 0)),
                0
              );

            return { label: dLabel, inc: dIncome, exp: dExpense };
          });
        }

        const maxVal = Math.max(
          ...chartColumns.map((c) => Math.max(c.inc, c.exp)),
          10
        );

        return (
          <View style={styles.trendWidgetBox}>
            <View style={styles.trendHeaderSubRow}>
              <Text style={styles.trendSubLabel}>
                Este {trendFilter.toLowerCase()}
              </Text>

              <TouchableOpacity
                style={styles.trendDropdownBtn}
                onPress={() => setTrendDropdownOpen(!trendDropdownOpen)}>
                <Text style={styles.trendDropdownText}>{trendFilter}</Text>
                <Ionicons
                  name="chevron-down"
                  size={12}
                  color="#aaa"
                  style={{ marginLeft: 4 }}
                />
              </TouchableOpacity>

              {trendDropdownOpen && (
                <View style={styles.trendDropdownMenu}>
                  <TouchableOpacity
                    onPress={() => {
                      setTrendFilter('Mes');
                      setTrendDropdownOpen(false);
                    }}
                    style={styles.trendDropItem}>
                    <Text
                      style={[
                        styles.trendDropText,
                        trendFilter === 'Mes' && { color: '#a3e635' },
                      ]}>
                      Mes
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      setTrendFilter('Semana');
                      setTrendDropdownOpen(false);
                    }}
                    style={styles.trendDropItem}>
                    <Text
                      style={[
                        styles.trendDropText,
                        trendFilter === 'Semana' && { color: '#a3e635' },
                      ]}>
                      Semana
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <View style={styles.trendDivider} />

            <View style={styles.trendChartRow}>
              {chartColumns.map((col, idx) => {
                const incHeight = Math.round((col.inc / maxVal) * 65);
                const expHeight = Math.round((col.exp / maxVal) * 65);

                return (
                  <View key={idx} style={styles.trendColGroup}>
                    <View style={styles.trendBarsArea}>
                      <View
                        style={[
                          styles.trendBarItem,
                          {
                            height: Math.max(expHeight, 4),
                            backgroundColor: '#f87171',
                          },
                        ]}
                      />
                      <View
                        style={[
                          styles.trendBarItem,
                          {
                            height: Math.max(incHeight, 4),
                            backgroundColor: '#a3e635',
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.trendColLabel}>{col.label}</Text>
                  </View>
                );
              })}
            </View>

            <View style={styles.trendDivider} />

            <View style={styles.trendFooterRow}>
              <View style={styles.trendFooterStat}>
                <View
                  style={[styles.statsDot, { backgroundColor: '#a3e635' }]}
                />
                <Text style={styles.trendFooterValue}>
                  ${formatCurrencyValue(totalIncome, 'USD')}
                </Text>
              </View>
              <View style={styles.trendFooterStat}>
                <View
                  style={[styles.statsDot, { backgroundColor: '#f87171' }]}
                />
                <Text style={styles.trendFooterValue}>
                  ${formatCurrencyValue(totalExpense, 'USD')}
                </Text>
              </View>
              <View style={styles.trendFooterStat}>
                <Ionicons
                  name={isNegative ? 'trending-down' : 'trending-up'}
                  size={12}
                  color={isNegative ? '#f87171' : '#a3e635'}
                  style={{ marginRight: 4 }}
                />
                <Text
                  style={[
                    styles.trendFooterValue,
                    { color: isNegative ? '#f87171' : '#a3e635' },
                  ]}>
                  {isNegative ? '-' : '+'}$
                  {formatCurrencyValue(Math.abs(netDiff), 'USD')}
                </Text>
              </View>
            </View>
          </View>
        );
      }
      case 'metas': {
        const defaultCards = [
          {
            id: 'default-emergencia',
            name: 'Fondo de Emergencia',
            current: 0,
            target: 0,
            color: '#f87171',
            icon: 'shield-checkmark',
          },
          {
            id: 'default-ahorros',
            name: 'Ahorros Generales',
            current: 0,
            target: 0,
            color: '#a3e635',
            icon: 'wallet-outline',
          },
        ];

        let userGoals = goals && goals.length > 0 ? goals : [];
        let displayGoals = [...defaultCards, ...userGoals];

        return (
          <View style={styles.goalsWidgetContainer}>
            <Text style={styles.sectionSubTitle}>Progreso de metas</Text>
            <View style={styles.divider} />

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.goalsInlineScrollRow}>
              {displayGoals.map((g, index) => {
                const current = parseFloat(g.current || g.currentAmount || 0);
                const target = parseFloat(g.target || g.targetAmount || 0);
                const percent =
                  target > 0
                    ? Math.min(Math.round((current / target) * 100), 100)
                    : 0;

                const goalIcon = g.icon || 'flag-outline';
                let goalColor = g.color || '#a3e635';
                if (g.id === 'default-emergencia') goalColor = '#f87171';
                if (g.id === 'default-ahorros') goalColor = '#a3e635';

                return (
                  <TouchableOpacity
                    key={g.id || index}
                    style={styles.goalMiniCard}
                    activeOpacity={0.8}
                    onPress={() => navigation('goals')}>
                    <View style={styles.goalCircleOuterRing}>
                      {percent > 0 && (
                        <View
                          style={[
                            styles.goalCircleProgressFill,
                            {
                              borderColor: goalColor,
                              borderBottomColor:
                                percent >= 25 ? goalColor : 'transparent',
                              borderLeftColor:
                                percent >= 50 ? goalColor : 'transparent',
                              borderTopColor:
                                percent >= 75 ? goalColor : 'transparent',
                              borderRightColor:
                                percent >= 100 ? goalColor : 'transparent',
                              ...(percent >= 100
                                ? { backgroundColor: `${goalColor}20` }
                                : {}),
                            },
                          ]}
                        />
                      )}
                      <View style={styles.goalIconCenterBox}>
                        <Ionicons name={goalIcon} size={24} color={goalColor} />
                      </View>
                    </View>

                    <Text
                      style={[styles.goalMiniPercent, { color: goalColor }]}>
                      {percent}%
                    </Text>
                    <Text style={styles.goalMiniTargetText} numberOfLines={1}>
                      ${formatCurrencyValue(target, 'USD')}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        );
      }
      case 'pagos': {
        const rawDebts = transactions || [];
        const rawRecurring = movements
          ? movements.filter(
              (m) =>
                m.isRecurring ||
                m.type === 'recurring' ||
                m.category === 'Recurrente' ||
                m.is_recurring
            )
          : [];

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const thirtyDaysFromNow = new Date(today);
        thirtyDaysFromNow.setDate(today.getDate() + 30);

        const allUpcomingPayments = [
          ...rawDebts.map((d) => {
            const rawDate = d.due_date || d.dueDate || d.date || d.fecha;
            const dueDateObj = rawDate ? new Date(rawDate) : null;
            if (dueDateObj && !isNaN(dueDateObj)) {
              dueDateObj.setHours(0, 0, 0, 0);
            }

            return {
              id: d.id || Math.random(),
              dueDateObj: dueDateObj && !isNaN(dueDateObj) ? dueDateObj : null,
              dueDate:
                dueDateObj && !isNaN(dueDateObj)
                  ? dueDateObj.toLocaleDateString('es-ES', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'short',
                    })
                  : 'Próximamente',
              name:
                d.contact_name ||
                d.name ||
                d.description ||
                d.title ||
                'Deuda por pagar',
              desc: d.description || d.category || 'Por pagar',
              category: d.category || d.description || 'Deudas',
              amount: parseFloat(d.amount || d.debtAmount || 0),
              isPay:
                d.type === 'pay' ||
                d.type === 'Pagar' ||
                parseFloat(d.amount || 0) < 0,
            };
          }),
          ...rawRecurring.map((r) => {
            const rawDate = r.due_date || r.dueDate || r.date || r.start_date;
            const dueDateObj = rawDate ? new Date(rawDate) : null;
            if (dueDateObj && !isNaN(dueDateObj)) {
              dueDateObj.setHours(0, 0, 0, 0);
            }

            return {
              id: r.id || Math.random(),
              dueDateObj: dueDateObj && !isNaN(dueDateObj) ? dueDateObj : null,
              dueDate:
                dueDateObj && !isNaN(dueDateObj)
                  ? dueDateObj.toLocaleDateString('es-ES', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'short',
                    })
                  : 'Recurrente',
              name: r.title || r.description || 'Gasto Recurrente',
              desc: r.category || 'Recurrente',
              category: r.category || 'Recurrente',
              amount: Math.abs(parseFloat(r.amount || 0)),
              isPay: true,
            };
          }),
        ]
          .filter((item) => {
            if (!item.dueDateObj) return false;
            return (
              item.dueDateObj >= today && item.dueDateObj <= thirtyDaysFromNow
            );
          })
          .sort((a, b) => a.dueDateObj - b.dueDateObj);

        return (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => navigation('debts')}>
            <Text style={styles.sectionSubTitle}>Próximos 30 días</Text>
            <View style={styles.divider} />
            {allUpcomingPayments.length === 0 ? (
              <Text style={styles.emptyText}>
                No hay pagos próximos en los próximos 30 días.
              </Text>
            ) : (
              allUpcomingPayments.slice(0, 3).map((item, idx) => {
                const categoryDetails = getMovementCategoryPresentation({
                  category: item.category || item.desc,
                  type: item.isPay ? 'Egresos' : 'Ingresos',
                  amount: item.isPay ? -item.amount : item.amount,
                }, categories);
                return (
                <View key={item.id || idx} style={{ marginBottom: 14 }}>
                  <Text
                    style={{
                      color: '#888',
                      fontSize: 12,
                      marginBottom: 6,
                      textTransform: 'capitalize',
                    }}>
                    {item.dueDate}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View
                      style={{
                        width: 42,
                        height: 42,
                        backgroundColor: '#141414',
                        borderRadius: 12,
                        justifyContent: 'center',
                        alignItems: 'center',
                        marginRight: 12,
                        borderWidth: 1,
                        borderColor: '#222',
                      }}>
                      <Ionicons name={categoryDetails.icon} size={20} color={categoryDetails.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          color: '#fff',
                          fontSize: 15,
                          fontWeight: 'bold',
                          marginBottom: 2,
                        }}>
                        {item.name}
                      </Text>
                      <Text style={{ color: '#888', fontSize: 12 }}>
                        {item.desc}
                      </Text>
                    </View>
                    <Text
                      style={{
                        fontSize: 15,
                        fontWeight: 'bold',
                        color: item.isPay ? '#f87171' : '#10b981',
                      }}>
                      {item.isPay ? '-' : '+'}$ {formatCurrencyValue(item.amount, 'USD')}
                    </Text>
                  </View>
                </View>
                );
              })
            )}
          </TouchableOpacity>
        );
      }
      case 'movimientos': {
        const uniqueMovementsMap = new Map();
        validMovements.forEach((m) => {
          const isTransfer = (m.category || '').toLowerCase().includes('transferencia');
          const uniqueKey = isTransfer
            ? `transfer-${Math.abs(m.amount)}-${m.time || ''}-${m.day || ''}`
            : `${m.day || ''}-${m.time || ''}-${m.amount || ''}-${m.title || ''}`;

          if (!uniqueMovementsMap.has(uniqueKey)) {
            uniqueMovementsMap.set(uniqueKey, m);
          }
        });

        const sortedRecentMovements = Array.from(uniqueMovementsMap.values())
          .sort((a, b) => {
            if ((b.day || 0) !== (a.day || 0)) {
              return (b.day || 0) - (a.day || 0);
            }
            return (b.time || '').localeCompare(a.time || '');
          })
          .slice(0, 10);

        return (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => navigation('movements', { filter: 'all' })}>
            <Text style={styles.sectionSubTitle}>
              Últimas transacciones registradas
            </Text>
            <View style={styles.divider} />
            {sortedRecentMovements.length === 0 ? (
              <Text style={styles.emptyText}>
                No hay movimientos registrados aún.
              </Text>
            ) : (
              sortedRecentMovements.map((m) => {
                const isTransfer = (m.category || '').toLowerCase().includes('transferencia');
                const isExpense = !isTransfer && parseFloat(m.amount) < 0;
                const matchedAccount = accounts.find(
                  (acc) => String(acc.id) === String(m.accountId || m.account_id)
                );
                const accountName = matchedAccount ? matchedAccount.name : 'Cuenta general';

                const catDetails = getMovementCategoryPresentation(m, categories);

                return (
                  <View
                    key={m.id || `${m.day || ''}-${m.time || ''}-${m.title || ''}-${m.amount || ''}`}
                    style={styles.movementItemCard}>
                    <View
                      style={[
                        styles.movementIconBox,
                        {
                          backgroundColor: isTransfer
                            ? 'rgba(59, 130, 246, 0.15)'
                            : `${catDetails.color}25`,
                        },
                      ]}>
                      <Ionicons
                        name={
                          isTransfer
                            ? 'swap-horizontal-outline'
                            : catDetails.icon
                        }
                        size={18}
                        color={isTransfer ? '#3b82f6' : catDetails.color}
                      />
                    </View>
                    <View style={styles.movementInfoCol}>
                      <Text style={styles.movementTitle}>{m.title}</Text>
                      <Text style={styles.movementCategory}>
                        {m.category || 'General'} •{' '}
                        <Text style={{ color: '#888' }}>{accountName}</Text>
                      </Text>
                    </View>
                    <View style={styles.movementAmountCol}>
                      <Text
                        style={[
                          styles.movementAmountVal,
                          {
                            color: isTransfer
                              ? '#3b82f6'
                              : isExpense
                              ? '#f87171'
                              : '#a3e635',
                          },
                        ]}>
                        {isTransfer ? '' : isExpense ? '-' : '+'}${' '}
                        {formatCurrencyValue(Math.abs(m.amount), 'USD')}
                      </Text>
                      <Text style={styles.movementTimeText}>
                        {m.time || '12:00 p. m.'}
                      </Text>
                    </View>
                  </View>
                );
              })
            )}
          </TouchableOpacity>
        );
      }
      default:
        return (
          <View style={styles.widgetPlaceholder}>
            <Text style={styles.widgetPlaceholderText}>
              Contenido del widget en desarrollo.
            </Text>
          </View>
        );
    }
  };

  const WIDGETS_METADATA = {
    brecha: {
      title: 'Brecha cambiaria',
      icon: 'swap-horizontal-outline',
      isNavigable: false,
    },
    estadisticas: {
      title: 'Estadísticas',
      icon: 'bar-chart-outline',
      isNavigable: false,
    },
    metas: {
      title: 'Metas',
      icon: 'flag-outline',
      route: 'goals',
      isNavigable: true,
    },
    pagos: {
      title: 'Próximos pagos',
      icon: 'calendar-outline',
      route: 'debts',
      isNavigable: true,
    },
    movimientos: {
      title: 'Movimientos recientes',
      icon: 'time-outline',
      route: 'movements',
      isNavigable: true,
    },
    tendencias: {
      title: 'Tendencia',
      icon: 'trending-up-outline',
      isNavigable: false,
    },
  };

  const renderAvatarContent = () => {
    const isImage = /^(https?:|file:|blob:|content:)/.test(userAvatar || '');
    const avatarContent = isImage
      ? <Image source={{ uri: userAvatar }} style={styles.profileAvatarImage} />
      : <Ionicons name={userAvatar || 'person'} size={18} color="#000" />;

    if (isImage) {
      return <View style={[styles.profileBadge, { backgroundColor: 'transparent' }]}>{avatarContent}</View>;
    }
    if (userAvatarBg?.startsWith('gradient:')) {
      return (
        <LinearGradient colors={userAvatarBg.slice('gradient:'.length).split('|')} style={styles.profileBadge}>
          {avatarContent}
        </LinearGradient>
      );
    }
    return <View style={[styles.profileBadge, { backgroundColor: userAvatarBg || '#a3e635' }]}>{avatarContent}</View>;
  };

  return (
    <ScreenWrapper contentContainerStyle={{ paddingBottom: 30 }}>
      {/* Barra superior con Perfil, Logo Centrado y Ajustes */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation('profile')} activeOpacity={0.8}>
          {renderAvatarContent()}
        </TouchableOpacity>

        <View style={[styles.logoContainer, isLightTheme && styles.logoContainerLight]}>
          <Image 
            source={require('../../assets/name-app.png')}
            style={styles.headerLogo} 
            resizeMode="contain"
          />
        </View>

        <TouchableOpacity
          onPress={() => navigation('preferences')}
          style={styles.settingsButton}
          accessibilityRole="button"
          accessibilityLabel="Preferencias"
        >
          <Ionicons name="settings-outline" size={18} color="#aaa" />
        </TouchableOpacity>
      </View>

      {/* Tarjeta de Balance General */}
      <View style={styles.headerCard}>
        <Text style={styles.welcome}>Hola, {userName}</Text>
        <Text style={styles.balanceTitle}>Balance General Total</Text>
        <Text style={styles.balanceAmount}>{getDisplayedBalance()}</Text>
        <Text style={styles.balanceDiff}>Balance en tiempo real</Text>
        <Text style={styles.rateInfo}>{getRateText()}</Text>

        <View style={styles.currencyBadgesRow}>
          {visibleCurrencies.map((curr) => (
            <TouchableOpacity
              key={curr}
              style={[
                styles.currencyBadge,
                selectedCurrencyFilter === curr && styles.currencyBadgeActive,
              ]}
              onPress={() => setSelectedCurrencyFilter(curr)}>
              <Text
                style={[
                  styles.badgeText,
                  selectedCurrencyFilter === curr && styles.badgeTextActive,
                ]}>
                {SUPPORTED_CURRENCIES.find(currency => currency.code === curr)?.flag} {curr}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.lastUpdateText}>{getFormattedLastUpdate()}</Text>
      </View>

      {/* Menú de Atajos Rápidos (Limitados exactamente a 3 personalizables + Ajustes fijo) */}
      <View style={styles.shortcutsContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.shortcutsScrollRow}>
          {activeShortcuts.slice(0, 3).map((id) => {
            const shortcut = SHORTCUTS_MAP[id];
            if (!shortcut) return null;
            return (
              <TouchableOpacity
                key={id}
                style={styles.shortcutItem}
                onPress={() => navigation(shortcut.route)}>
                <ShortcutIconBadge name={shortcut.icon} isLight={isLightTheme} />
                <Text style={styles.shortcutText} numberOfLines={1}>
                  {shortcut.name}
                </Text>
              </TouchableOpacity>
            );
          })}

          <TouchableOpacity
            style={styles.shortcutItem}
            onPress={() => navigation('ajustes')}>
            <ShortcutIconBadge name="options-outline" isLight={isLightTheme} />
            <Text style={styles.shortcutText} numberOfLines={1}>
              Ajustes
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Ingresos y Egresos */}
      <View style={styles.flowContainer}>
        <TouchableOpacity
          style={styles.flowCard}
          onPress={() => navigation('movements', { filter: 'income' })}>
          <View style={styles.flowHeader}>
            <Ionicons
              name="arrow-up"
              size={14}
              color="#a3e635"
              style={{ marginRight: 5 }}
            />
            <Text style={styles.flowLabel}>Ingresos (sin transferencias)</Text>
          </View>
          <Text style={styles.flowIncomeAmount}>
            $ {formatCurrencyValue(totalIncome, 'USD')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.flowCard}
          onPress={() => navigation('movements', { filter: 'expense' })}>
          <View style={styles.flowHeader}>
            <Ionicons
              name="arrow-down"
              size={14}
              color="#f87171"
              style={{ marginRight: 5 }}
            />
            <Text style={styles.flowLabel}>Egresos (sin transferencias)</Text>
          </View>
          <Text style={styles.flowExpenseAmount}>
            $ {formatCurrencyValue(totalExpense, 'USD')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Widgets Dinámicos */}
      {(activeWidgets || []).map((widgetId) => {
        const widgetMeta = WIDGETS_METADATA[widgetId];
        if (!widgetMeta) return null;

        const isCompoundWidget =
          widgetId === 'pagos' ||
          widgetId === 'movimientos' ||
          widgetId === 'metas';

        return (
          <View key={widgetId} style={styles.sectionCard}>
            {widgetMeta.isNavigable ? (
              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginBottom: isCompoundWidget ? 5 : 10,
                }}
                activeOpacity={0.7}
                onPress={() => navigation(widgetMeta.route)}>
                <Ionicons
                  name={widgetMeta.icon}
                  size={18}
                  color="#a3e635"
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.sectionMainTitle}>{widgetMeta.title}</Text>
                <Ionicons
                  name="chevron-forward"
                  size={14}
                  color="#666"
                  style={{ marginLeft: 'auto' }}
                />
              </TouchableOpacity>
            ) : (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginBottom: 0,
                }}>
                <Ionicons
                  name={widgetMeta.icon}
                  size={18}
                  color="#a3e635"
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.sectionMainTitle}>{widgetMeta.title}</Text>
              </View>
            )}

            {widgetId !== 'brecha' &&
              widgetId !== 'estadisticas' &&
              widgetId !== 'tendencias' &&
              !isCompoundWidget && <View style={styles.divider} />}

            {renderWidgetContent(widgetId)}
          </View>
        );
      })}
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  topBar: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 16,
    paddingHorizontal: 5,
  },
  logoContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainerLight: {
    flex: 0,
    backgroundColor: '#17231d',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  headerLogo: {
    width: 95, 
    height: 24, 
  },
  profileBadge: { 
    width: 36, 
    height: 36, 
    borderRadius: 18, 
    justifyContent: 'center', 
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#333'
  },
  profileAvatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 18,
  },
  settingsButton: { 
    backgroundColor: '#1a1a1a', 
    width: 36, 
    height: 36, 
    borderRadius: 18, 
    justifyContent: 'center', 
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333'
  },

  headerCard: {
    backgroundColor: '#1a1a1a',
    padding: 20,
    borderRadius: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  welcome: { color: '#aaa', fontSize: 14 },
  balanceTitle: { color: '#888', fontSize: 14, marginTop: 4 },
  balanceAmount: {
    color: '#fff',
    fontSize: 26,
    fontWeight: 'bold',
    marginVertical: 8,
  },
  balanceDiff: { color: '#888', fontSize: 12 },
  rateInfo: {
    color: '#888',
    fontSize: 12,
    marginTop: 4,
    marginBottom: 10,
    fontWeight: '500',
  },

  currencyBadgesRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 5, marginBottom: 10 },
  currencyBadge: {
    backgroundColor: '#2a2a2a',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 15,
    marginRight: 8,
  },
  currencyBadgeActive: { backgroundColor: '#a3e635' },
  badgeText: { color: '#aaa', fontSize: 11, fontWeight: 'bold' },
  badgeTextActive: { color: '#000' },

  lastUpdateText: {
    color: '#666',
    fontSize: 11,
    marginTop: 4,
    fontStyle: 'italic',
  },

  shortcutsContainer: { marginBottom: 16 },
  shortcutsScrollRow: {
    paddingVertical: 4,
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shortcutItem: {
    backgroundColor: '#1a1a1a',
    width: 78,
    height: 72,
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 13,
    alignItems: 'center',
    marginHorizontal: 3,
    borderWidth: 1,
    borderColor: '#222',
  },
  shortcutIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shortcutIconContainerLight: {
    backgroundColor: '#456d13',
  },
  shortcutText: {
    color: '#fff',
    fontSize: 10,
    textAlign: 'center',
    marginTop: 4,
  },

  flowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    width: '100%',
  },
  flowCard: {
    backgroundColor: '#1a1a1a',
    flex: 1,
    marginHorizontal: 4,
    padding: 18,
    borderRadius: 18,
  },
  flowHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  flowLabel: { color: '#aaa', fontSize: 14 },
  flowIncomeAmount: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  flowExpenseAmount: { color: '#fff', fontSize: 20, fontWeight: 'bold' },

  sectionCard: {
    backgroundColor: '#1a1a1a',
    padding: 20,
    borderRadius: 20,
    marginBottom: 16,
  },
  sectionMainTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  sectionSubTitle: {
    color: '#888',
    fontSize: 12,
    marginTop: 2,
    marginBottom: 10,
  },
  divider: { height: 1, backgroundColor: '#333', marginBottom: 15 },
  widgetPlaceholder: { paddingVertical: 10, alignItems: 'center' },
  widgetPlaceholderText: { color: '#aaa', fontSize: 13 },

  modernStatsContainer: { marginTop: 10 },
  statsSummaryCard: {
    backgroundColor: '#111',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#222',
  },
  statsSummaryLabel: { color: '#888', fontSize: 11, marginBottom: 2 },
  statsSummaryAmount: { fontSize: 18, fontWeight: 'bold' },
  statsIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },

  ratioBarSection: { marginBottom: 12 },
  ratioBarLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  ratioLabelText: { color: '#888', fontSize: 11, fontWeight: '600' },
  ratioBarTrack: {
    height: 10,
    backgroundColor: '#111',
    borderRadius: 5,
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#222',
  },
  ratioBarFillIncome: { backgroundColor: '#a3e635', height: '100%' },
  ratioBarFillExpense: { backgroundColor: '#f87171', height: '100%' },

  statsCardsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  statMiniBox: {
    backgroundColor: '#111',
    flex: 1,
    padding: 12,
    borderRadius: 12,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#222',
  },
  statMiniHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  statsDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  statMiniTitle: { color: '#888', fontSize: 11 },
  statMiniValue: { color: '#fff', fontSize: 14, fontWeight: 'bold' },

  brechaContainer: { marginTop: 10 },
  brechaRatesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#111',
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
  },
  brechaRateItem: { flex: 1, alignItems: 'center' },
  brechaDividerVertical: { width: 1, backgroundColor: '#333' },
  brechaLabel: { color: '#888', fontSize: 11, marginBottom: 4 },
  brechaValue: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  brechaFooterRow: { alignItems: 'center', marginTop: 4 },
  brechaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#222',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  brechaBadgeText: { fontSize: 12, fontWeight: '600' },

  trendWidgetBox: { marginTop: 10 },
  trendHeaderSubRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    zIndex: 10,
  },
  trendSubLabel: { color: '#888', fontSize: 12 },
  trendDropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 14,
  },
  trendDropdownText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  trendDropdownMenu: {
    position: 'absolute',
    right: 0,
    top: 28,
    backgroundColor: '#222',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#333',
    width: 90,
    zIndex: 20,
    paddingVertical: 4,
  },
  trendDropItem: { paddingVertical: 8, paddingHorizontal: 12 },
  trendDropText: { color: '#aaa', fontSize: 12, fontWeight: 'bold' },
  trendDivider: { height: 1, backgroundColor: '#333', marginVertical: 8 },
  trendChartRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 90,
    paddingHorizontal: 5,
    paddingBottom: 5,
  },
  trendColGroup: { alignItems: 'center', flex: 1 },
  trendBarsArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 70,
    justifyContent: 'center',
  },
  trendBarItem: { width: 3.5, borderRadius: 2, marginHorizontal: 1 },
  trendColLabel: { color: '#888', fontSize: 10, marginTop: 4 },
  trendFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  trendFooterStat: { flexDirection: 'row', alignItems: 'center' },
  trendFooterValue: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },

  goalsWidgetContainer: { marginTop: 2 },
  goalsInlineScrollRow: {
    paddingVertical: 6,
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: 0,
  },
  goalMiniCard: {
    backgroundColor: 'transparent',
    width: 100,
    paddingVertical: 4,
    paddingHorizontal: 2,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalCircleOuterRing: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4.5,
    borderColor: '#262626',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    position: 'relative',
  },
  goalCircleProgressFill: {
    position: 'absolute',
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4.5,
    borderColor: 'transparent',
    transform: [{ rotate: '45deg' }],
  },
  goalIconCenterBox: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#111',
    justifyContent: 'center',
    alignItems: 'center',
  },
  goalMiniPercent: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  goalMiniTargetText: {
    color: '#fff',
    fontSize: 12,
    textAlign: 'center',
  },

  emptyText: {
    color: '#666',
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: 5,
  },

  movementItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  movementIconBox: {
    width: 38,
    height: 38,
    backgroundColor: '#252525',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  movementInfoCol: { flex: 1 },
  movementTitle: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  movementCategory: { color: '#888', fontSize: 11 },
  movementAmountCol: { alignItems: 'flex-end' },
  movementAmountVal: { fontSize: 13, fontWeight: 'bold', marginBottom: 2 },
  movementTimeText: { color: '#666', fontSize: 10 },
});