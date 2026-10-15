import { Alert } from 'react-native';
import { logger } from './logger';

/**
 * Manejador global de errores para la aplicación (Supabase, API, UI, Excepciones).
 * Muestra una alerta clara en pantalla con los detalles del error.
 */
export const handleAppError = (context, error) => {
  let message = 'Error desconocido';

  if (typeof error === 'string') {
    message = error;
  } else if (error instanceof Error) {
    message = error.message || error.toString();
  } else if (error && typeof error === 'object') {
    message = error.message || error.error_description || error.details || JSON.stringify(error, Object.getOwnPropertyNames(error));
  }

  logger.error(`[AppError] [${context}]:`, message, error);

  Alert.alert(
    `Error en ${context}`,
    String(message),
    [{ text: 'Entendido' }],
    { cancelable: true }
  );
};
