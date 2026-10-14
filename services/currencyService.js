export const SUPPORTED_CURRENCIES = [
  { code: 'USD', label: 'Dólar estadounidense', symbol: '$', flag: '🇺🇸' },
  { code: 'EUR', label: 'Euro', symbol: '€', flag: '🇪🇺' },
  { code: 'USDT', label: 'Tether', symbol: '₮', flag: '₮' },
  { code: 'VES', label: 'Bolívar', symbol: 'Bs.', flag: '🇻🇪' },
  { code: 'GBP', label: 'Libra esterlina', symbol: '£', flag: '🇬🇧' },
  { code: 'CAD', label: 'Dólar canadiense', symbol: 'C$', flag: '🇨🇦' },
  { code: 'MXN', label: 'Peso mexicano', symbol: 'MX$', flag: '🇲🇽' },
  { code: 'COP', label: 'Peso colombiano', symbol: 'COL$', flag: '🇨🇴' },
  { code: 'BRL', label: 'Real brasileño', symbol: 'R$', flag: '🇧🇷' },
  { code: 'ARS', label: 'Peso argentino', symbol: 'AR$', flag: '🇦🇷' },
  { code: 'CLP', label: 'Peso chileno', symbol: 'CL$', flag: '🇨🇱' },
  { code: 'PEN', label: 'Sol peruano', symbol: 'S/', flag: '🇵🇪' },
];

export const getCurrencyRate = (currency, rates) => {
  if (currency === 'USD') return 1;
  
  // Si estamos usando el modo Venezuela
  if (rates?.useVenezuelanRates) {
    if (currency === 'VES') {
      return Number(rates?.bcvRate) > 0 ? Number(rates.bcvRate) : null;
    }
    if (currency === 'EUR' && rates?.eurRate > 0 && rates?.bcvRate > 0) {
      return rates.bcvRate / rates.eurRate;
    }
    if (currency === 'USDT' && rates?.binanceRate > 0) {
      return Number(rates.binanceRate);
    }
  }

  // Si se consulta USDT directamente fuera del modo estricto
  if (currency === 'USDT' && rates?.binanceRate > 0) {
    return Number(rates.binanceRate);
  }

  // Manejo estándar / internacional para otras monedas
  const rate = Number(rates?.usdRates?.[currency]);
  if (Number.isFinite(rate) && rate > 0) return rate;
  return null;
};

export const convertCurrencyAmount = (amount, fromCurrency, toCurrency, rates) => {
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount)) return null;
  if (fromCurrency === toCurrency) return numericAmount;

  // Si estamos en entorno venezolano o involucra USDT, manejamos la conversión cruzada limpia
  if (rates?.useVenezuelanRates || fromCurrency === 'USDT' || toCurrency === 'USDT') {
    // Si pasamos de USDT a VES
    if (fromCurrency === 'USDT' && toCurrency === 'VES' && rates?.binanceRate > 0) {
      return numericAmount * Number(rates.binanceRate);
    }
    // Si pasamos de VES a USDT (aquí se usa el saldo en Bs y se divide entre la tasa Binance P2P)
    if (fromCurrency === 'VES' && toCurrency === 'USDT' && rates?.binanceRate > 0) {
      return numericAmount / Number(rates.binanceRate);
    }
    // Si pasamos de otra moneda (ej. USD) a USDT en entorno venezolano: Convertimos primero a VES (por BCV) y luego a USDT (por Binance)
    if (toCurrency === 'USDT' && rates?.bcvRate > 0 && rates?.binanceRate > 0) {
      const amountInVES = convertCurrencyAmount(numericAmount, fromCurrency, 'VES', rates);
      return amountInVES / Number(rates.binanceRate);
    }
    // Si pasamos de USDT a otra moneda (ej. USD) en entorno venezolano: Convertimos de USDT a VES (por Binance) y luego a la moneda destino (por BCV)
    if (fromCurrency === 'USDT' && rates?.bcvRate > 0 && rates?.binanceRate > 0) {
      const amountInVES = numericAmount * Number(rates.binanceRate);
      return convertCurrencyAmount(amountInVES, 'VES', toCurrency, rates);
    }
  }

  const fromRate = getCurrencyRate(fromCurrency, rates);
  const toRate = getCurrencyRate(toCurrency, rates);
  if (!fromRate || !toRate) return null;
  return (numericAmount / fromRate) * toRate;
};

export const getBolivarRate = (currency, rates) =>
  convertCurrencyAmount(1, currency, 'VES', rates);

export const fetchCurrencyRates = async () => {
  let bcvRate = 0;
  let eurRate = 0;
  let binanceRate = 0;
  let usdRates = {};

  try {
    const response = await fetch('https://rates.dolarvzla.com/bcv/current.json');
    const json = await response.json();
    if (json?.current) {
      bcvRate = parseFloat(json.current.usd) || 0;
      eurRate = parseFloat(json.current.eur) || 0;
    }
  } catch (err) {
    console.error('Error al consultar las tasas oficiales BCV:', err);
  }

  // Consulta exacta en tiempo real a usdt.com.ve para obtener la tasa de compra P2P de Binance
  try {
    const response = await fetch('https://www.usdt.com.ve/api/v1/rates/current');
    const json = await response.json();
    if (json?.success && json?.data?.binance?.buy_rate) {
      binanceRate = parseFloat(json.data.binance.buy_rate) || 0;
    }
  } catch (error) {
    console.error('Error al consultar la tasa P2P desde usdt.com.ve:', error);
  }

  try {
    const response = await fetch('https://open.er-api.com/v6/latest/USD');
    const json = await response.json();
    if (json?.result === 'success' && json.rates) {
      usdRates = json.rates;
    } else {
      throw new Error('La API de tasas no devolvió una respuesta válida.');
    }
  } catch (err) {
    console.error('Error al consultar las tasas basadas en USD:', err);
  }

  bcvRate = bcvRate > 0 ? bcvRate : 36.5;
  eurRate = eurRate > 0 ? eurRate : 40.0;
  
  // Aseguramos que el diccionario global mantenga las referencias estándar
  usdRates = { ...usdRates, USD: 1 };

  return {
    bcvRate,
    eurRate,
    binanceRate,
    usdRates,
    lastUpdate: new Date().toISOString(),
  };
};