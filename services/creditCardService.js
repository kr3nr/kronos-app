import { supabase } from './supabase';
import { logger } from './logger';

// Catálogo actualizado de bancos y condiciones según normativas BCV (Gaceta Oficial N.º 43.418)
export const BANKS_CATALOG = [
  { 
    id: 'mercantil', 
    name: 'Banco Mercantil', 
    defaultMinPayment: 10.00, 
    currency: 'VES',
    defaultInterestRate: 60.00, // 60% anual estándar BCV
    graceDays: 30
  },
  { 
    id: 'banesco', 
    name: 'Banesco', 
    defaultMinPayment: 10.00, 
    currency: 'VES',
    defaultInterestRate: 60.00,
    graceDays: 30
  },
  { 
    id: 'provincial', 
    name: 'BBVA Provincial', 
    defaultMinPayment: 15.00, 
    currency: 'VES',
    defaultInterestRate: 60.00,
    graceDays: 30
  },
  { 
    id: 'venezuela', 
    name: 'Banco de Venezuela', 
    defaultMinPayment: 10.00, 
    currency: 'VES',
    defaultInterestRate: 60.00,
    graceDays: 30
  },
  { 
    id: 'bnc', 
    name: 'BNC (Nacional de Crédito)', 
    defaultMinPayment: 10.00, 
    currency: 'VES',
    defaultInterestRate: 60.00,
    graceDays: 30
  },
  { 
    id: 'external_usd', 
    name: 'Tarjeta Internacional (USD)', 
    defaultMinPayment: 100.00, 
    currency: 'USD',
    defaultInterestRate: 18.00,
    graceDays: 25
  },
  { 
    id: 'binance', 
    name: 'Binance Card / Crypto', 
    defaultMinPayment: 100.00, 
    currency: 'USDT',
    defaultInterestRate: 0.00,
    graceDays: 0
  },
  { 
    id: 'other', 
    name: 'Otro Banco / Personalizado', 
    defaultMinPayment: 10.00, 
    currency: 'USD',
    defaultInterestRate: 60.00,
    graceDays: 30
  },
];

/**
 * Calcula los intereses de financiamiento y mora basados en la normativa BCV (60% anual + 3% mora anual).
 * @param {number} overdueAmount - Monto vencido o saldo financiado
 * @param {number} annualRate - Tasa de interés anual (por defecto 60%)
 * @param {boolean} isDelinquent - Si se encuentra en mora
 * @param {number} daysInPeriod - Días que dura el periodo de cálculo (ej. 30 días)
 */
export const calculateCardInterests = (overdueAmount, annualRate = 60.00, isDelinquent = false, daysInPeriod = 30) => {
  const dailyRate = (annualRate / 100) / 365;
  let regularInterest = overdueAmount * dailyRate * daysInPeriod;
  
  let moraInterest = 0;
  if (isDelinquent) {
    // 3% anual adicional por mora según marco regulatorio
    const dailyMoraRate = (3.00 / 100) / 365;
    moraInterest = overdueAmount * dailyMoraRate * daysInPeriod;
  }

  return {
    regularInterest: parseFloat(regularInterest.toFixed(2)),
    moraInterest: parseFloat(moraInterest.toFixed(2)),
    totalInterest: parseFloat((regularInterest + moraInterest).toFixed(2))
  };
};

/**
 * Obtiene todas las tarjetas de crédito del usuario autenticado
 */
export const fetchCreditCards = async (userId) => {
  try {
    const response = await supabase
      .from('credit_cards')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (!response) {
      return { data: [], error: 'No se recibió respuesta del servidor.' };
    }

    const { data, error } = response;
    if (error) throw error;
    return { data: data || [], error: null };
  } catch (error) {
    logger.error('Error fetching credit cards:', error);
    return { data: [], error: error.message || 'Error desconocido' };
  }
};

/**
 * Agrega una nueva tarjeta de crédito a Supabase
 */
export const addCreditCard = async (cardData) => {
  try {
    const { data, error } = await supabase
      .from('credit_cards')
      .insert([cardData])
      .select();

    if (error) {
      logger.error('Supabase error adding credit card:', error);
      return { data: null, error: error.message };
    }

    const insertedCard = data && data.length > 0 ? data[0] : null;
    return { data: insertedCard, error: null };
  } catch (error) {
    logger.error('Unexpected error adding credit card:', error);
    return { data: null, error: error.message || 'Error desconocido al guardar' };
  }
};

export async function updateCreditCard(cardId, updatedData) {
  const { data, error } = await supabase
    .from('credit_cards')
    .update(updatedData)
    .eq('id', cardId);
  return { data, error };
}

/**
 * Elimina una tarjeta de crédito y sus movimientos asociados de forma segura
 */
export const deleteCreditCard = async (cardId) => {
  try {
    const { error: movementsError } = await supabase
      .from('credit_card_movements')
      .delete()
      .eq('card_id', cardId);

    if (movementsError) {
      logger.error('Error deleting related movements:', movementsError);
      return { error: movementsError.message };
    }

    const { data, error: cardError } = await supabase
      .from('credit_cards')
      .delete()
      .eq('id', cardId)
      .select();

    if (cardError) {
      logger.error('Error deleting credit card:', cardError);
      return { error: cardError.message };
    }

    if (!data || data.length === 0) {
      return { error: 'No se encontró la tarjeta en la base de datos o no se pudo eliminar.' };
    }

    return { error: null };
  } catch (error) {
    logger.error('Unexpected error deleting credit card:', error);
    return { error: error.message || 'Error desconocido al eliminar' };
  }
};

/**
 * Obtiene los movimientos de una tarjeta específica
 */
export const fetchCardMovements = async (cardId) => {
  try {
    const response = await supabase
      .from('credit_card_movements')
      .select('*')
      .eq('card_id', cardId)
      .order('date', { ascending: false });

    if (!response) {
      return { data: [], error: 'No se recibió respuesta del servidor.' };
    }

    const { data, error } = response;
    if (error) throw error;
    return { data: data || [], error: null };
  } catch (error) {
    logger.error('Error fetching card movements:', error);
    return { data: [], error: error.message || 'Error desconocido' };
  }
};

/**
 * Registra un consumo o pago en la tarjeta y actualiza el saldo disponible
 */
export const addCardMovement = async (movementData, cardId, currentAvailableLimit, creditLimit, movementType, amount) => {
  try {
    const movementResponse = await supabase
      .from('credit_card_movements')
      .insert([movementData])
      .select()
      .single();

    if (!movementResponse) {
      return { data: null, newAvailable: currentAvailableLimit, error: 'No se obtuvo respuesta del servidor.' };
    }

    const { data: movementRes, error: movementError } = movementResponse;
    if (movementError) throw movementError;

    let newAvailable = Number(currentAvailableLimit);
    if (movementType === 'consumo') {
      newAvailable = newAvailable - Number(amount);
    } else if (movementType === 'pago') {
      newAvailable = newAvailable + Number(amount);
      if (newAvailable > Number(creditLimit)) {
        newAvailable = Number(creditLimit);
      }
    }

    const updateResponse = await supabase
      .from('credit_cards')
      .update({ available_limit: newAvailable })
      .eq('id', cardId);

    if (updateResponse && updateResponse.error) {
      throw updateResponse.error;
    }

    return { data: movementRes, newAvailable, error: null };
  } catch (error) {
    logger.error('Error adding card movement:', error);
    return { data: null, newAvailable: currentAvailableLimit, error: error.message || 'Error desconocido' };
  }
};