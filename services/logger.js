import { Alert } from './appAlert';

export const logger = {
  log: (...args) => {
    console.log('[LOG]', ...args);
  },
  error: (...args) => {
    console.error('[ERROR]', ...args);
  }
};

export const logAppError = (moduleName, error, showUserAlert = false) => {
  const errorMessage = error?.message || JSON.stringify(error) || 'Error desconocido';
  
  console.error(`\n🚨 [ERROR EN MÓDULO: ${moduleName.toUpperCase()}] 🚨`);
  console.error(`Detalle: ${errorMessage}`);
  if (error?.code) console.error(`Código de Supabase/DB: ${error.code}`);
  console.error('--------------------------------------------------\n');

  if (showUserAlert) {
    Alert.alert(
      `Error en ${moduleName}`,
      `Ocurrió un inconveniente: ${errorMessage}`,
      [{ text: 'Entendido' }]
    );
  }
};