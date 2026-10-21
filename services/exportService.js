import { supabase } from './supabase';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { convertCurrencyAmount } from './currencyService';

export const exportFinancialReport = async (userId, options = {}, rates = {}) => {
  const {
    format = 'csv', // 'csv', 'xlsx', 'pdf'
    reportTitle = 'Resumen Financiero Personalizado',
    period = 'Todo',
    typeFilter = 'Ambos',
    selectedAccount = 'Todas',
    exportCurrency = 'USD', // 'USD' o 'VES'
    includeNotes = true,
    includeSummaryCard = true,
    includeMovements = true,
    includeAccounts = true,
    includeShopping = true,
    includeRecurring = true,
    includeGoals = true
  } = options;

  // 1. Consultar movimientos base
  let query = supabase.from('movements').select('*').eq('user_id', userId);

  if (typeFilter === 'Ingresos' || typeFilter === 'Solo Ingresos') query = query.eq('type', 'Ingreso');
  if (typeFilter === 'Egresos' || typeFilter === 'Solo Egresos') query = query.eq('type', 'Egreso');
  if (selectedAccount !== 'Todas') query = query.eq('account', selectedAccount);

  // Filtrado por período de fecha
  const now = new Date();
  if (period === 'Este mes') {
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    query = query.gte('created_at', firstDay);
  } else if (period === 'Mes anterior') {
    const firstDayPrev = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
    const lastDayPrev = new Date(now.getFullYear(), now.getMonth(), 0).toISOString();
    query = query.gte('created_at', firstDayPrev).lte('created_at', lastDayPrev);
  } else if (period === 'Este año' || period === 'Anual') {
    const firstDayYear = new Date(now.getFullYear(), 0, 1).toISOString();
    query = query.gte('created_at', firstDayYear);
  } else if (period === 'Semanal') {
    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    query = query.gte('created_at', lastWeek);
  }

  const { data: movements, error: movError } = await query;
  if (movError) throw movError;

  // 2. Consultar módulos adicionales según personalización
  let accountsData = [];
  let shoppingData = [];
  let recurringData = [];
  let goalsData = [];

  if (includeAccounts) {
    const { data } = await supabase.from('accounts').select('*').eq('user_id', userId);
    accountsData = data || [];
  }
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

  // 3. Procesar y convertir montos a la moneda seleccionada (USD o VES)
  const formatAmount = (amt, curr = 'USD') => {
    const val = parseFloat(amt) || 0;
    const converted = convertCurrencyAmount(val, curr, exportCurrency, rates) ?? val;
    return converted;
  };

  const processedMovements = (movements || []).map(m => ({
    ...m,
    convertedAmount: formatAmount(m.amount, m.currency || 'USD')
  }));

  const totalIncome = processedMovements
    .filter(m => (m.type || '').toLowerCase().includes('ingreso') || m.convertedAmount > 0)
    .reduce((sum, m) => sum + Math.abs(m.convertedAmount), 0);

  const totalExpense = processedMovements
    .filter(m => (m.type || '').toLowerCase().includes('egreso') || m.convertedAmount < 0)
    .reduce((sum, m) => sum + Math.abs(m.convertedAmount), 0);

  const netBalance = totalIncome - totalExpense;
  const dateStr = new Date().toISOString().split('T')[0];
  const currencySymbol = exportCurrency === 'VES' ? 'Bs.' : '$';

  // 4. Generación según formato seleccionado
  if (format === 'csv') {
    let csvParts = [];
    csvParts.push(`"${reportTitle.toUpperCase()}"`);
    csvParts.push(`Generado el:,${dateStr}`);
    csvParts.push(`Moneda:,${exportCurrency}`);
    csvParts.push(`Período:,${period}`);
    csvParts.push('');

    if (includeSummaryCard) {
      csvParts.push('=== RESUMEN EJECUTIVO ===');
      csvParts.push(`Total Ingresos (${exportCurrency}),${totalIncome.toFixed(2)}`);
      csvParts.push(`Total Egresos (${exportCurrency}),${totalExpense.toFixed(2)}`);
      csvParts.push(`Balance Neto (${exportCurrency}),${netBalance.toFixed(2)}`);
      csvParts.push('');
    }

    if (includeMovements && processedMovements.length > 0) {
      csvParts.push('=== MOVIMIENTOS FINANCIEROS ===');
      csvParts.push(includeNotes ? 'ID,Tipo,Monto,Moneda,Cuenta,Categoría,Fecha,Nota' : 'ID,Tipo,Monto,Moneda,Cuenta,Categoría,Fecha');
      processedMovements.forEach(m => {
        const noteStr = includeNotes ? `,"${(m.description || m.note || '').replace(/"/g, '""')}"` : '';
        csvParts.push(`${m.id},${m.type || ''},${m.convertedAmount.toFixed(2)},${exportCurrency},"${m.account || ''}","${m.category || ''}",${m.created_at || ''}${noteStr}`);
      });
      csvParts.push('');
    }

    if (includeAccounts && accountsData.length > 0) {
      csvParts.push('=== CUENTAS Y SALDOS ===');
      csvParts.push('ID,Nombre,Saldo,Moneda');
      accountsData.forEach(a => {
        const accConv = formatAmount(a.balance, a.currency || 'USD');
        csvParts.push(`${a.id},"${a.name || ''}",${accConv.toFixed(2)},${exportCurrency}`);
      });
      csvParts.push('');
    }

    if (includeShopping && shoppingData.length > 0) {
      csvParts.push('=== LISTAS DE COMPRAS ===');
      csvParts.push('ID,Título,Total,Completado,Fecha');
      shoppingData.forEach(s => {
        const shopConv = formatAmount(s.total_usd || s.totalUsd || 0, 'USD');
        csvParts.push(`${s.id},"${s.title || ''}",${shopConv.toFixed(2)},${s.completed ? 'Sí' : 'No'},${s.date || ''}`);
      });
      csvParts.push('');
    }

    if (includeRecurring && recurringData.length > 0) {
      csvParts.push('=== PAGOS RECURRENTES ===');
      csvParts.push('ID,Nombre,Tipo,Monto,Frecuencia,Cuenta');
      recurringData.forEach(r => {
        const recConv = formatAmount(r.amount, r.currency || 'USD');
        csvParts.push(`${r.id},"${r.name || ''}",${r.type || ''},${recConv.toFixed(2)},"${r.frequency || ''}","${r.account || ''}"`);
      });
      csvParts.push('');
    }

    if (includeGoals && goalsData.length > 0) {
      csvParts.push('=== METAS Y AHORROS ===');
      csvParts.push('ID,Nombre,Actual,Objetivo,Protegido');
      goalsData.forEach(g => {
        const curConv = formatAmount(g.current || 0, 'USD');
        const tarConv = formatAmount(g.target || 0, 'USD');
        csvParts.push(`${g.id},"${g.name || ''}",${curConv.toFixed(2)},${tarConv.toFixed(2)},${g.is_protected ? 'Sí' : 'No'}`);
      });
    }

    const content = csvParts.join('\n');
    return await saveAndShareFile(content, `reporte_financiero_${dateStr}.csv`, 'text/csv;charset=utf-8;');
  }

  if (format === 'xlsx') {
    let htmlTable = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="utf-8"/><style>
        body { font-family: Arial, sans-serif; color: #333; }
        h2 { color: #161922; border-bottom: 2px solid #a3e635; padding-bottom: 6px; }
        table { border-collapse: collapse; width: 100%; margin-bottom: 20px; font-size: 12px; }
        th { background-color: #161922; color: #ffffff; padding: 10px; border: 1px solid #ddd; text-align: left; }
        td { padding: 8px; border: 1px solid #ddd; }
        .summary { background-color: #f4f5f7; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
      </style></head>
      <body>
        <h2>${reportTitle}</h2>
        <div class="summary">
          <p><strong>Fecha de Generación:</strong> ${dateStr}</p>
          <p><strong>Moneda Base:</strong> ${exportCurrency}</p>
          <p><strong>Período:</strong> ${period}</p>
          ${includeSummaryCard ? `
            <p><strong>Total Ingresos:</strong> ${currencySymbol}${totalIncome.toFixed(2)}</p>
            <p><strong>Total Egresos:</strong> ${currencySymbol}${totalExpense.toFixed(2)}</p>
            <p><strong>Balance Neto:</strong> ${currencySymbol}${netBalance.toFixed(2)}</p>
          ` : ''}
        </div>

        ${includeMovements && processedMovements.length > 0 ? `
          <h3>Movimientos Financieros</h3>
          <table>
            <tr><th>Tipo</th><th>Monto (${exportCurrency})</th><th>Cuenta</th><th>Categoría</th><th>Fecha</th>${includeNotes ? '<th>Nota / Descripción</th>' : ''}</tr>
            ${processedMovements.map(m => `<tr><td>${m.type || ''}</td><td>${m.convertedAmount.toFixed(2)}</td><td>${m.account || ''}</td><td>${m.category || ''}</td><td>${m.created_at || ''}</td>${includeNotes ? `<td>${m.description || m.note || ''}</td>` : ''}</tr>`).join('')}
          </table>
        ` : ''}

        ${includeAccounts && accountsData.length > 0 ? `
          <h3>Cuentas y Saldos</h3>
          <table>
            <tr><th>Nombre</th><th>Saldo (${exportCurrency})</th></tr>
            ${accountsData.map(a => `<tr><td>${a.name || ''}</td><td>${formatAmount(a.balance, a.currency || 'USD').toFixed(2)}</td></tr>`).join('')}
          </table>
        ` : ''}

        ${includeShopping && shoppingData.length > 0 ? `
          <h3>Listas de Compras</h3>
          <table>
            <tr><th>Título</th><th>Total (${exportCurrency})</th><th>Completado</th><th>Fecha</th></tr>
            ${shoppingData.map(s => `<tr><td>${s.title || ''}</td><td>${formatAmount(s.total_usd || s.totalUsd || 0, 'USD').toFixed(2)}</td><td>${s.completed ? 'Sí' : 'No'}</td><td>${s.date || ''}</td></tr>`).join('')}
          </table>
        ` : ''}

        ${includeRecurring && recurringData.length > 0 ? `
          <h3>Pagos Recurrentes</h3>
          <table>
            <tr><th>Nombre</th><th>Tipo</th><th>Monto (${exportCurrency})</th><th>Frecuencia</th><th>Cuenta</th></tr>
            ${recurringData.map(r => `<tr><td>${r.name || ''}</td><td>${r.type || ''}</td><td>${formatAmount(r.amount, r.currency || 'USD').toFixed(2)}</td><td>${r.frequency || ''}</td><td>${r.account || ''}</td></tr>`).join('')}
          </table>
        ` : ''}

        ${includeGoals && goalsData.length > 0 ? `
          <h3>Metas y Ahorros</h3>
          <table>
            <tr><th>Nombre</th><th>Actual (${exportCurrency})</th><th>Objetivo (${exportCurrency})</th><th>Protegido</th></tr>
            ${goalsData.map(g => `<tr><td>${g.name || ''}</td><td>${formatAmount(g.current || 0, 'USD').toFixed(2)}</td><td>${formatAmount(g.target || 0, 'USD').toFixed(2)}</td><td>${g.is_protected ? 'Sí' : 'No'}</td></tr>`).join('')}
          </table>
        ` : ''}
      </body></html>
    `;
    return await saveAndShareFile(htmlTable, `reporte_financiero_${dateStr}.xls`, 'application/vnd.ms-excel;charset=utf-8;');
  }

  if (format === 'pdf') {
    let printHtml = `
      <!DOCTYPE html><html><head><meta charset="utf-8"/><title>${reportTitle}</title>
      <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; margin: 30px; background: #fff; }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #a3e635; padding-bottom: 15px; margin-bottom: 25px; }
        .logo { font-size: 24px; font-weight: 900; color: #161922; letter-spacing: 1px; }
        .subtitle { color: #65a30d; font-size: 14px; font-weight: bold; margin-top: 4px; }
        .date { color: #666; font-size: 13px; text-align: right; }
        .cards-row { display: flex; gap: 15px; margin-bottom: 25px; }
        .card { flex: 1; background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 10px; padding: 15px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
        .card h4 { margin: 0 0 5px 0; color: #6c757d; font-size: 12px; text-transform: uppercase; }
        .card p { margin: 0; font-size: 20px; font-weight: bold; color: #212529; }
        h3 { color: #161922; border-bottom: 2px solid #e9ecef; padding-bottom: 6px; margin-top: 30px; font-size: 16px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 20px; font-size: 13px; }
        th { background: #161922; color: #fff; text-align: left; padding: 10px; font-weight: 600; }
        td { padding: 9px 10px; border-bottom: 1px solid #dee2e6; color: #495057; }
        tr:nth-child(even) { background: #f8f9fa; }
        .footer { text-align: center; margin-top: 40px; font-size: 11px; color: #adb5bd; border-top: 1px solid #dee2e6; padding-top: 15px; }
      </style></head>
      <body>
        <div class="header">
          <div>
            <div class="logo">KRONOS</div>
            <div class="subtitle">${reportTitle}</div>
          </div>
          <div class="date">
            <div>Emisión: ${dateStr}</div>
            <div style="font-size: 11px; color: #888;">Moneda: ${exportCurrency} | Período: ${period}</div>
          </div>
        </div>

        ${includeSummaryCard ? `
          <div class="cards-row">
            <div class="card"><h4>Ingresos Totales</h4><p style="color: #16a34a;">${currencySymbol}${totalIncome.toFixed(2)}</p></div>
            <div class="card"><h4>Egresos Totales</h4><p style="color: #dc2626;">${currencySymbol}${totalExpense.toFixed(2)}</p></div>
            <div class="card"><h4>Balance Neto</h4><p style="color: ${netBalance >= 0 ? '#16a34a' : '#dc2626'};">${currencySymbol}${netBalance.toFixed(2)}</p></div>
          </div>
        ` : ''}

        ${includeMovements && processedMovements.length > 0 ? `
          <h3>Movimientos Financieros</h3>
          <table>
            <tr><th>Tipo</th><th>Monto (${exportCurrency})</th><th>Cuenta</th><th>Categoría</th><th>Fecha</th>${includeNotes ? '<th>Nota / Descripción</th>' : ''}</tr>
            ${processedMovements.map(m => `<tr><td>${m.type || ''}</td><td><strong>${m.convertedAmount.toFixed(2)}</strong></td><td>${m.account || ''}</td><td>${m.category || ''}</td><td>${m.created_at || ''}</td>${includeNotes ? `<td>${m.description || m.note || ''}</td>` : ''}</tr>`).join('')}
          </table>
        ` : ''}

        ${includeAccounts && accountsData.length > 0 ? `
          <h3>Cuentas y Saldos</h3>
          <table>
            <tr><th>Nombre</th><th>Saldo (${exportCurrency})</th></tr>
            ${accountsData.map(a => `<tr><td>${a.name || ''}</td><td><strong>${formatAmount(a.balance, a.currency || 'USD').toFixed(2)}</strong></td></tr>`).join('')}
          </table>
        ` : ''}

        ${includeShopping && shoppingData.length > 0 ? `
          <h3>Listas de Compras</h3>
          <table>
            <tr><th>Título</th><th>Total (${exportCurrency})</th><th>Completado</th><th>Fecha</th></tr>
            ${shoppingData.map(s => `<tr><td>${s.title || ''}</td><td><strong>${formatAmount(s.total_usd || s.totalUsd || 0, 'USD').toFixed(2)}</strong></td><td>${s.completed ? 'Sí' : 'No'}</td><td>${s.date || ''}</td></tr>`).join('')}
          </table>
        ` : ''}

        ${includeRecurring && recurringData.length > 0 ? `
          <h3>Pagos Recurrentes</h3>
          <table>
            <tr><th>Nombre</th><th>Tipo</th><th>Monto (${exportCurrency})</th><th>Frecuencia</th><th>Cuenta</th></tr>
            ${recurringData.map(r => `<tr><td>${r.name || ''}</td><td>${r.type || ''}</td><td><strong>${formatAmount(r.amount, r.currency || 'USD').toFixed(2)}</strong></td><td>${r.frequency || ''}</td><td>${r.account || ''}</td></tr>`).join('')}
          </table>
        ` : ''}

        ${includeGoals && goalsData.length > 0 ? `
          <h3>Metas y Ahorros</h3>
          <table>
            <tr><th>Nombre</th><th>Actual (${exportCurrency})</th><th>Objetivo (${exportCurrency})</th><th>Protegido</th></tr>
            ${goalsData.map(g => `<tr><td>${g.name || ''}</td><td>${formatAmount(g.current || 0, 'USD').toFixed(2)}</td><td>${formatAmount(g.target || 0, 'USD').toFixed(2)}</td><td>${g.is_protected ? 'Sí' : 'No'}</td></tr>`).join('')}
          </table>
        ` : ''}

        <div class="footer">Generado automáticamente por Kronos App &bull; Todos los derechos reservados</div>
        <script>window.print();</script>
      </body></html>
    `;
    return await saveAndShareFile(printHtml, `reporte_financiero_${dateStr}.pdf.html`, 'text/html;charset=utf-8;');
  }
};

const saveAndShareFile = async (content, filename, mimeType) => {
  if (Platform.OS === 'web') {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return { success: true, message: 'Reporte descargado correctamente en el navegador.' };
  } else {
    try {
      const fileUri = `${FileSystem.cacheDirectory}${filename}`;
      await FileSystem.writeAsStringAsync(fileUri, content, { encoding: FileSystem.EncodingType.UTF8 });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, { mimeType, dialogTitle: 'Compartir o guardar reporte financiero' });
        return { success: true, message: 'Reporte generado y listo para compartir o guardar en tu dispositivo.' };
      } else {
        throw new Error('La función de compartir archivos no está disponible en este dispositivo.');
      }
    } catch (error) {
      console.error('Error al guardar/compartir archivo en móvil:', error);
      throw error;
    }
  }
};
