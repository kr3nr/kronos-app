import { Alert } from 'react-native';

export const logAppError = (moduleName, error, showUserAlert = false) => {
  const errorMessage = error?.message || JSON.stringify(error) || 'Error desconocido';
  
  // Imprime de forma muy visible en la consola de la terminal
  console.error(`\n🚨 [ERROR EN MÓDULO: ${moduleName.toUpperCase()}] 🚨`);
  console.error(`Detalle: ${errorMessage}`);
  if (error?.code) console.error(`Código de Supabase/DB: ${error.code}`);
  console.error('--------------------------------------------------\n');

  // Si se requiere, muestra una alerta flotante al usuario
  if (showUserAlert) {
    Alert.alert(
      `Error en ${moduleName}`,
      `Ocurrió un inconveniente: ${errorMessage}`,
      [{ text: 'Entendido' }]
    );
  }
};