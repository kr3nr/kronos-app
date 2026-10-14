import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator, SafeAreaView, ScrollView, Dimensions, Image } from 'react-native';
import { Alert } from '../../services/appAlert';
import { Ionicons } from '@expo/vector-icons';
import CustomHeader from '../../components/CustomHeader';
import ContextualHelp from '../../components/ContextualHelp';
import ThemeContent from '../../components/ThemeContent';
import CreditCardSurface from '../../components/CreditCardSurface';
import { SUPPORTED_CURRENCIES } from '../../services/currencyService';
import { fetchCreditCards, fetchCardMovements } from '../../services/creditCardService';
import { logger } from '../../services/logger';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 32;

export default function CreditCardsScreen({ navigation, userId }) {
  const [cards, setCards] = useState([]);
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [historyViewMode, setHistoryViewMode] = useState('list'); // 'list' o 'calendar'
  const [showHelpTooltip, setShowHelpTooltip] = useState(false);
  
  // Estados para el mes y día seleccionado en el calendario interactivo
  const [currentMonthDate, setCurrentMonthDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(new Date().getDate());

  const loadCards = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await fetchCreditCards(userId);
    if (error) {
      Alert.alert('Error', 'No se pudieron cargar las tarjetas de crédito.');
    } else {
      const fetchedCards = data || [];
      setCards(fetchedCards);
      if (fetchedCards.length > 0) {
        loadMovements(fetchedCards[0].id);
      }
    }
    setLoading(false);
  }, [userId]);

  const loadMovements = async (cardId) => {
    const { data } = await fetchCardMovements(cardId);
    setMovements(data || []);
  };

  useEffect(() => {
    loadCards();
  }, [loadCards]);

  const handleScroll = (event) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / CARD_WIDTH);
    if (index !== activeCardIndex && cards[index]) {
      setActiveCardIndex(index);
      loadMovements(cards[index].id);
    }
  };

  // Funciones para navegar entre meses en el calendario personalizado
  const handlePrevMonth = () => {
    setCurrentMonthDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonthDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  // Obtener nombre del mes actual en español
  const monthNames = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", 
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];
  const currentMonthName = monthNames[currentMonthDate.getMonth()];
  const currentYear = currentMonthDate.getFullYear();

  // Generar la matriz de días del mes para el calendario
  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const totalDays = getDaysInMonth(currentYear, currentMonthDate.getMonth());
  const startDay = getFirstDayOfMonth(currentYear, currentMonthDate.getMonth());

  // Mapear movimientos a las fechas del mes actual para mostrar los indicadores (puntos)
  const getMovementTypeForDay = (day) => {
    const dayMovements = movements.filter(mov => {
      if (!mov.date) return false;
      const movDate = new Date(mov.date);
      return (
        movDate.getDate() === day &&
        movDate.getMonth() === currentMonthDate.getMonth() &&
        movDate.getFullYear() === currentYear
      );
    });

    if (dayMovements.length === 0) return null;
    const hasPayment = dayMovements.some(m => m.type === 'pago');
    const hasExpense = dayMovements.some(m => m.type !== 'pago');

    if (hasPayment && hasExpense) return 'both';
    if (hasPayment) return 'pago';
    return 'egreso';
  };

  // Filtrar movimientos según el día seleccionado en el calendario
  const filteredMovements = movements.filter(mov => {
    if (historyViewMode === 'calendar' && mov.date) {
      const movDate = new Date(mov.date);
      return (
        movDate.getDate() === selectedDay &&
        movDate.getMonth() === currentMonthDate.getMonth() &&
        movDate.getFullYear() === currentYear
      );
    }
    return true;
  });

  return (
    <ThemeContent>
    <SafeAreaView style={styles.container}>
<CustomHeader 
        title="Tarjetas" 
        onBackPress={() => navigation('home')}
        rightComponent={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {/* Botón para agregar nueva tarjeta directamente */}
            <TouchableOpacity 
              onPress={() => navigation('addCreditCard')} 
              style={styles.headerIconButton}
            >
              <Ionicons name="add" size={20} color="#a3e635" />
            </TouchableOpacity>

            <ContextualHelp title="Tarjetas de crédito" tips={[
              'Desliza entre tarjetas y revisa el disponible y el límite.',
              'Usa + para registrar una compra o un pago.',
              'Toca una tarjeta para consultar su detalle e historial.',
            ]} />
          </View>
        }
      />

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#a3e635" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          {/* Tarjeta de Ayuda Contextual (Tooltip) */}
          {showHelpTooltip && (
            <View style={styles.tooltipContainer}>
              <View style={styles.tooltipHeader}>
                <Ionicons name="information-circle-outline" size={18} color="#a3e635" />
                <Text style={styles.tooltipTitle}>Guía de Tarjetas de Crédito</Text>
                <TouchableOpacity onPress={() => setShowHelpTooltip(false)}>
                  <Ionicons name="close" size={18} color="#888" />
                </TouchableOpacity>
              </View>
              <Text style={styles.tooltipText}>
                • Desliza horizontalmente para cambiar entre tus tarjetas registradas.{'\n'}
                • Visualiza el disponible y límite total en tiempo real.{'\n'}
                • Usa el botón verde "+" situado sobre la tarjeta para registrar nuevos consumos o pagos.{'\n'}
                • Toca cualquier tarjeta para ver sus detalles completos y editarla.{'\n'}
                • En el calendario, los pagos abonados se destacan con punto verde y los egresos con punto rojo.
              </Text>
              <TouchableOpacity 
                style={styles.tooltipCloseBtn} 
                onPress={() => setShowHelpTooltip(false)}
              >
                <Text style={styles.tooltipCloseBtnText}>Entendido</Text>
              </TouchableOpacity>
            </View>
          )}

          {cards.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="card-outline" size={64} color="#555" />
              <Text style={styles.emptyText}>No tienes tarjetas de crédito registradas</Text>
              <TouchableOpacity 
                style={styles.addButton}
                onPress={() => navigation('addCreditCard')}
              >
                <Text style={styles.addButtonText}>Agregar Tarjeta</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* Carrusel Deslizable de Tarjetas */}
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={handleScroll}
                contentContainerStyle={styles.carouselContainer}
                decelerationRate="fast"
                snapToInterval={CARD_WIDTH}
              >
                {cards.map((card, index) => {
                  const creditLimit = Number(card.credit_limit) || 0;
                  const availableLimit = Number(card.available_limit) || 0;
                  const usedAmount = creditLimit - availableLimit;
                  const usagePercent = creditLimit > 0 ? (usedAmount / creditLimit) * 100 : 0;
                  
                  const currency = SUPPORTED_CURRENCIES.find(item => item.code === card.currency);
                  const currencySymbol = currency?.symbol || '$';
                  const locale = ['VES', 'EUR', 'COP', 'ARS', 'CLP'].includes(card.currency) ? 'es-VE' : 'en-US';
                  const statusColor = usagePercent > 80 ? '#f87171' : usagePercent > 50 ? '#fbbf24' : '#a3e635';

                  return (
                    <View key={card.id} style={[styles.cardWrapper, { width: CARD_WIDTH }]}>
                      <TouchableOpacity activeOpacity={0.9} onPress={() => navigation('creditCardDetail', card)}>
                      <CreditCardSurface color={card.card_color} style={styles.creditCardVisual}>
                        <View style={styles.cardVisualHeader}>
                          <View style={styles.bankInfoContainer}>
                            <View style={styles.bankIconBadge}>
                              <Ionicons name={card.bank_logo || 'card-outline'} size={18} color="#fff" />
                            </View>
                            <Text style={styles.bankHeaderName} numberOfLines={1}>
                              {card.bank_name || 'Banco Emisor'}
                            </Text>
                          </View>
                          <View style={styles.currencyBadge}><Text style={styles.currencyBadgeText}>{currency?.code || card.currency || 'USD'}</Text></View>
                        </View>

                        <View style={styles.cardMiddleRow}>
                          <View style={styles.cardChipSim}>
                            <View style={styles.chipLines} />
                          </View>
                          <Ionicons name="wifi-outline" size={21} color="rgba(255,255,255,0.72)" style={{ transform: [{ rotate: '90deg' }] }} />
                        </View>

                        <Text style={styles.cardVisualDigits}>
                          ••••  ••••  ••••  {card.last_four_digits || '----'}
                        </Text>

                        <View style={styles.cardIdentityRow}>
                          <View style={{ flex: 1, marginRight: 8 }}>
                            <Text style={styles.limitLabel}>TITULAR / NOMBRE</Text>
                            <Text style={styles.cardVisualName} numberOfLines={1}>{card.card_name || 'Mi Tarjeta'}</Text>
                          </View>
                          <Image source={require('../../assets/name-app.png')} style={styles.cardBrandLogo} resizeMode="contain" />
                        </View>

                        <View style={styles.limitsRow}>
                          <View>
                            <Text style={styles.limitLabel}>DISPONIBLE</Text>
                            <Text style={styles.availableValue}>
                              {currencySymbol} {availableLimit.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </Text>
                          </View>
                          <View style={{ alignItems: 'flex-end' }}>
                            <Text style={styles.limitLabel}>LÍMITE TOTAL</Text>
                            <Text style={styles.totalValue}>
                              {currencySymbol} {creditLimit.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.progressBackground}>
                          <View style={[styles.progressFill, { width: `${Math.min(usagePercent, 100)}%`, backgroundColor: statusColor }]} />
                        </View>

                        {card.closing_date && <View style={styles.footerInfo}>
                          <View style={styles.infoBadge}>
                            <Ionicons name="calendar-outline" size={13} color="rgba(255,255,255,0.75)" />
                            <Text style={styles.footerText}>Corte: Día {card.closing_date || 'N/A'}</Text>
                          </View>
                          <View style={styles.infoBadge}>
                            <Ionicons name="time-outline" size={13} color="rgba(255,255,255,0.75)" />
                            <Text style={styles.footerText}>Pago: Día {card.due_date || 'N/A'}</Text>
                          </View>
                        </View>}
                      </CreditCardSurface>
                      </TouchableOpacity>

                      <TouchableOpacity 
                        style={styles.overlapAddButton}
                        onPress={() => navigation('addCardMovement', card)}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="add" size={26} color="#000" />
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </ScrollView>

              {cards.length > 1 && (
                <View style={styles.paginationDots}>
                  {cards.map((_, idx) => (
                    <View 
                      key={idx} 
                      style={[styles.dot, activeCardIndex === idx && styles.activeDot]} 
                    />
                  ))}
                </View>
              )}
            </>
          )}

          {/* Sección de Historial con Selector de Vista (Lista / Calendario) */}
          <View style={styles.historyHeaderSection}>
            <Text style={styles.historyTitle}>
              {historyViewMode === 'calendar' ? currentMonthName : 'Historial'}
            </Text>
            <View style={styles.historyToggleContainer}>
              <TouchableOpacity 
                style={[styles.toggleButton, historyViewMode === 'list' && styles.toggleButtonActive]}
                onPress={() => setHistoryViewMode('list')}
              >
                <Ionicons name="list" size={18} color={historyViewMode === 'list' ? '#000' : '#888'} />
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.toggleButton, historyViewMode === 'calendar' && styles.toggleButtonActive]}
                onPress={() => setHistoryViewMode('calendar')}
              >
                <Ionicons name="calendar-outline" size={18} color={historyViewMode === 'calendar' ? '#000' : '#888'} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Vista de Calendario Interactivo Personalizado */}
          {historyViewMode === 'calendar' && (
            <View style={styles.calendarCard}>
              {/* Navegación de Meses */}
              <View style={styles.calendarNavHeader}>
                <TouchableOpacity onPress={handlePrevMonth} style={styles.monthNavBtn}>
                  <Ionicons name="chevron-back" size={18} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.calendarMonthTitle}>{currentMonthName} {currentYear}</Text>
                <TouchableOpacity onPress={handleNextMonth} style={styles.monthNavBtn}>
                  <Ionicons name="chevron-forward" size={18} color="#fff" />
                </TouchableOpacity>
              </View>

              {/* Días de la semana */}
              <View style={styles.weekDaysRow}>
                {['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'].map((d, i) => (
                  <Text key={i} style={styles.weekDayText}>{d}</Text>
                ))}
              </View>

              {/* Cuadrícula de Días */}
              <View style={styles.daysGrid}>
                {Array.from({ length: startDay }).map((_, index) => (
                  <View key={`empty-${index}`} style={styles.dayCellEmpty} />
                ))}

                {Array.from({ length: totalDays }).map((_, index) => {
                  const dayNum = index + 1;
                  const isSelected = selectedDay === dayNum;
                  const movementType = getMovementTypeForDay(dayNum);

                  return (
                    <TouchableOpacity
                      key={`day-${dayNum}`}
                      style={[styles.dayCell, isSelected && styles.dayCellSelected]}
                      onPress={() => setSelectedDay(dayNum)}
                    >
                      <Text style={[styles.dayCellText, isSelected && styles.dayCellTextSelected]}>
                        {dayNum}
                      </Text>
                      <View style={styles.indicatorsRow}>
                        {movementType === 'pago' && <View style={[styles.dotIndicator, { backgroundColor: '#a3e635' }]} />}
                        {movementType === 'egreso' && <View style={[styles.dotIndicator, { backgroundColor: '#f87171' }]} />}
                        {movementType === 'both' && (
                          <>
                            <View style={[styles.dotIndicator, { backgroundColor: '#a3e635' }]} />
                            <View style={[styles.dotIndicator, { backgroundColor: '#f87171', marginLeft: 2 }]} />
                          </>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.calendarFooterTip}>
                💡 Toca cualquier día con indicador para ver sus movimientos.
              </Text>
            </View>
          )}

          {/* Lista de Movimientos Filtrados */}
          <View style={styles.movementsListContainer}>
            {filteredMovements.length === 0 ? (
              <Text style={styles.noMovementsText}>
                {historyViewMode === 'calendar' 
                  ? `No hay movimientos para el día ${selectedDay} de ${currentMonthName}.`
                  : 'No hay movimientos registrados para esta tarjeta.'}
              </Text>
            ) : (
              filteredMovements.map((mov) => {
                const isPayment = mov.type === 'pago';
                return (
                  <View 
                    key={mov.id} 
                    style={[
                      styles.movementItem, 
                      { borderLeftWidth: 4, borderLeftColor: isPayment ? '#a3e635' : '#f87171' }
                    ]}
                  >
                    <View style={styles.movementIconContainer}>
                      <Ionicons 
                        name={isPayment ? "arrow-down-outline" : "cart-outline"} 
                        size={20} 
                        color={isPayment ? '#a3e635' : '#f87171'} 
                      />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.movementTitle}>{mov.description || mov.title || 'Movimiento'}</Text>
                      <Text style={styles.movementDate}>{mov.date || 'Fecha reciente'}</Text>
                    </View>
                    <Text style={[styles.movementAmount, isPayment ? { color: '#a3e635' } : { color: '#f87171' }]}>
                      {isPayment ? '+' : '-'}{mov.amount}
                    </Text>
                  </View>
                );
              })
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
    </ThemeContent>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  scrollContent: {
    paddingBottom: 100,
  },
  tooltipContainer: {
    backgroundColor: '#222',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#a3e635',
    padding: 14,
  },
  tooltipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  tooltipTitle: {
    color: '#a3e635',
    fontSize: 14,
    fontWeight: 'bold',
    flex: 1,
    marginLeft: 8,
  },
  tooltipText: {
    color: '#ccc',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 10,
  },
  tooltipCloseBtn: {
    backgroundColor: '#a3e635',
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
  },
  tooltipCloseBtnText: {
    color: '#000',
    fontSize: 12,
    fontWeight: 'bold',
  },
  headerIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 80,
    paddingHorizontal: 16,
  },
  emptyText: {
    color: '#888',
    fontSize: 14,
    marginTop: 12,
    marginBottom: 20,
    textAlign: 'center',
  },
  addButton: {
    backgroundColor: '#a3e635',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
  },
  addButtonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 14,
  },
  carouselContainer: {
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  cardWrapper: {
    marginRight: 0,
    position: 'relative',
    paddingBottom: 22,
  },
  creditCardVisual: {
    padding: 20,
    minHeight: 250,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  cardVisualHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  bankInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  bankHeaderName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  bankIconBadge: { width: 34, height: 34, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' },
  currencyBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.16)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' },
  currencyBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 0.6 },
  cardMiddleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardChipSim: {
    width: 42,
    height: 30,
    backgroundColor: '#fbbf24',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.9,
  },
  chipLines: {
    width: '80%',
    height: '80%',
    borderWidth: 1,
    borderColor: '#d97706',
    borderRadius: 4,
  },
  cardVisualName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 3,
  },
  cardVisualDigits: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 2,
    marginBottom: 14,
  },
  cardIdentityRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 15 },
  cardBrandLogo: { width: 76, height: 19, opacity: 0.92 },
  limitsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  limitLabel: {
    color: 'rgba(255,255,255,0.68)',
    fontSize: 9,
    letterSpacing: 0.7,
  },
  availableValue: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 2,
  },
  totalValue: {
    color: 'rgba(255,255,255,0.84)',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
  progressBackground: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  footerInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
    paddingTop: 10,
  },
  infoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerText: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 11,
    marginLeft: 4,
  },
  overlapAddButton: {
    position: 'absolute',
    bottom: 2,
    alignSelf: 'center',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#a3e635',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#a3e635',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 6,
    zIndex: 10,
  },
  paginationDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 10,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#444',
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: '#a3e635',
    width: 16,
  },
  historyHeaderSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 15,
    marginBottom: 15,
  },
  historyTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  historyToggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#161616',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#333',
    padding: 3,
  },
  toggleButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  toggleButtonActive: {
    backgroundColor: '#a3e635',
  },
  calendarCard: {
    backgroundColor: '#161616',
    marginHorizontal: 16,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 15,
  },
  calendarNavHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  monthNavBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#222',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  calendarMonthTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  weekDaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  weekDayText: {
    color: '#888',
    fontSize: 11,
    fontWeight: 'bold',
    width: 36,
    textAlign: 'center',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  dayCellEmpty: {
    width: `${100 / 7}%`,
    height: 40,
    marginBottom: 6,
  },
  dayCell: {
    width: `${100 / 7}%`,
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    borderRadius: 10,
  },
  dayCellSelected: {
    backgroundColor: '#222',
    borderWidth: 1,
    borderColor: '#a3e635',
  },
  dayCellText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  dayCellTextSelected: {
    color: '#a3e635',
    fontWeight: 'bold',
  },
  indicatorsRow: {
    flexDirection: 'row',
    height: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  dotIndicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  calendarFooterTip: {
    color: '#888',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 12,
    fontStyle: 'italic',
  },
  movementsListContainer: {
    paddingHorizontal: 16,
  },
  noMovementsText: {
    color: '#666',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 20,
  },
  movementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161616',
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#222',
  },
  movementIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#222',
    justifyContent: 'center',
    alignItems: 'center',
  },
  movementTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  movementDate: {
    color: '#888',
    fontSize: 11,
    marginTop: 2,
  },
  movementAmount: {
    fontSize: 15,
    fontWeight: 'bold',
  },
});