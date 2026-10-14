const roundCurrency = value => Math.round((value + Number.EPSILON) * 100) / 100;

export const REJECTED_OR_REVERSED_COMMISSION_TYPE = 'rechazada_reversada';

export const VES_COMMISSION_OPTIONS = [
  { type: 'pago_movil', shortLabel: 'Pago Móvil / P2P', label: 'Pago Móvil / Persona a Persona (0,30%, mínimo Bs. 14)' },
  { type: 'p2c', shortLabel: 'P2C', label: 'Persona a Comercio (1,50%, mínimo Bs. 14)' },
  { type: 'c2p_175', shortLabel: 'C2P 1,75%', label: 'Comercio a Persona (1,75%, mínimo Bs. 14)' },
  { type: 'c2p_2', shortLabel: 'C2P 2,00%', label: 'Comercio a Persona (2,00%, mínimo Bs. 14)' },
  { type: REJECTED_OR_REVERSED_COMMISSION_TYPE, shortLabel: 'Operación rechazada/reversada', label: 'Operación rechazada o reversada (Bs. 14 fijo)' }
];

export function calculateCommissionAmount(commissionType, movementType, amount) {
  const value = Math.max(0, Number(amount) || 0);
  const percentageRates = {
    pago_movil: 0.003,
    transferencia: 0.003,
    p2c: 0.015,
    c2p_175: 0.0175,
    c2p_2: 0.02
  };

  if (commissionType === REJECTED_OR_REVERSED_COMMISSION_TYPE) return 14;
  if (value === 0) return 0;
  if (Object.prototype.hasOwnProperty.call(percentageRates, commissionType)) {
    return roundCurrency(Math.max(14, value * percentageRates[commissionType]));
  }
  if (commissionType !== 'paypal') return 0;

  if (movementType === 'Ingreso' || movementType === 'Ingresos') {
    return Math.min(value, roundCurrency(value * 0.054 + 0.30));
  }

  if (value <= 0.30) return value;
  return roundCurrency(value - ((value - 0.30) / 1.054));
}

export function getPaypalCommissionDetails(movement) {
  if (movement?.commission_type !== 'paypal') return null;

  const isIncome = movement.type === 'Ingreso'
    || movement.type === 'Ingresos'
    || Number(movement.amount) > 0;
  const baseAmount = Math.abs(Number(movement.commission_base_amount ?? movement.amount) || 0);

  return {
    isIncome,
    baseAmount,
    commissionAmount: calculateCommissionAmount('paypal', isIncome ? 'Ingreso' : 'Egreso', baseAmount)
  };
}
