// src/services/currencyService.js

export const fetchCurrencyRates = async () => {
  let bcvRate = 0;
  let eurRate = 0;
  let binanceRate = 0;

  // 1. Obtener Dólar y Euro oficial BCV desde el CDN público y estable
  try {
    const response = await fetch('https://rates.dolarvzla.com/bcv/current.json');
    const json = await response.json();
    
    if (json?.current) {
      bcvRate = parseFloat(json.current.usd) || 0;
      eurRate = parseFloat(json.current.eur) || 0;
    }
  } catch (err) {
    console.log('Error al consultar las tasas oficiales BCV:', err);
  }

  // 2. Obtener la referencia de USDT / P2P de Binance de manera segura
try {
    const resBinance = await fetch('https://www.usdt.com.ve/api/v1/rates/current');
    const jsonBinance = await resBinance.json();
    
    // Extraemos la tasa de compra real del mercado P2P de Binance
    const liveBuyRate = parseFloat(jsonBinance?.data?.binance?.buy_rate);
    if (liveBuyRate > 0) {
      binanceRate = liveBuyRate;
    }
  } catch (err) {
    console.log('Error al consultar la tasa P2P de Binance:', err);
  }

  return {
    bcvRate: bcvRate > 0 ? bcvRate : 36.5,
    eurRate: eurRate > 0 ? eurRate : 40.0,
    binanceRate: binanceRate > 0 ? binanceRate : (bcvRate > 0 ? bcvRate : 37.0),
    lastUpdate: new Date().toISOString()
  };
};